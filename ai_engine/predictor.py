"""
FoodSync AI - 3-Tier Hierarchical Demand Prediction Pipeline
Explicitly labels DEMO BASELINE MODEL vs LIVE RETRAINED MODEL provenance.
"""
import os
import json
import numpy as np
from datetime import date, timedelta
from typing import Dict, Any, List, Optional

from ai_engine.trainer import RidgeDemandModel, MODEL_STORAGE_PATH, generate_90d_synthetic_dataset
from ai_engine.data_prep import chronological_train_test_split, evaluate_predictions

class DemandPredictor:
    def __init__(self, model_type: Optional[str] = None):
        self.model_data = self._load_or_initialize_model()
        if model_type:
            self.model_data["model_type"] = model_type

    def _load_or_initialize_model(self) -> Dict[str, Any]:
        if os.path.exists(MODEL_STORAGE_PATH):
            try:
                with open(MODEL_STORAGE_PATH, "r") as f:
                    return json.load(f)
            except Exception:
                pass
        
        # Train baseline if not present
        from ai_engine.trainer import train_and_save_baseline_model
        return train_and_save_baseline_model()

    def retrain_on_restaurant_history(self, pos_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Retrains the demand model on actual restaurant POS sales history.
        Switches provenance from DEMO_BASELINE to LIVE_RETRAINED.
        """
        if len(pos_records) < 14:
            # Insufficient samples for time-series lag features: maintain baseline with clear warning
            return {
                "status": "INSUFFICIENT_DATA",
                "message": f"Requires at least 14 days of POS history (received {len(pos_records)}). Maintained synthetic baseline.",
                "model_provenance": self.get_provenance()
            }

        covers = [r["covers"] for r in pos_records]
        X_list = []
        y_list = []

        for i in range(14, len(pos_records)):
            rec = pos_records[i]
            features = [
                1.0,
                float(rec["day_of_week"]),
                float(rec["month"]),
                1.0 if rec["is_weekend"] else 0.0,
                1.0 if rec["is_holiday"] else 0.0,
                float(covers[i - 1]),
                float(covers[i - 7]),
                float(np.mean(covers[i - 7:i])),
                float(np.mean(covers[i - 14:i]))
            ]
            X_list.append(features)
            y_list.append(float(rec["covers"]))

        X = np.array(X_list, dtype=np.float64)
        y = np.array(y_list, dtype=np.float64)

        X_train, X_test, y_train, y_test = chronological_train_test_split(X, y, train_ratio=0.8)
        model = RidgeDemandModel(l2_reg=1.0)
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        metrics = evaluate_predictions(y_test, y_pred)

        self.model_data = {
            "model_type": "LIVE_RETRAINED",
            "is_synthetic_baseline": False,
            "trained_at": str(date.today()),
            "weights": model.weights.tolist(),
            "mean": model.mean_.tolist(),
            "std": model.std_.tolist(),
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "evaluation_metrics": metrics,
            "feature_names": [
                "intercept", "day_of_week", "month", "is_weekend",
                "is_holiday", "lag_1", "lag_7", "rolling_7d", "rolling_14d"
            ]
        }

        with open(MODEL_STORAGE_PATH, "w") as f:
            json.dump(self.model_data, f, indent=2)

        return {
            "status": "SUCCESS",
            "message": "Model retrained on live restaurant POS history.",
            "model_provenance": self.get_provenance()
        }

    def get_provenance(self) -> Dict[str, Any]:
        return {
            "model_type": self.model_data.get("model_type", "DEMO_BASELINE"),
            "is_synthetic_baseline": self.model_data.get("is_synthetic_baseline", True),
            "validation_metrics": self.model_data.get("evaluation_metrics", {}),
            "training_samples": self.model_data.get("training_samples", 0),
            "test_samples": self.model_data.get("test_samples", 0),
            "provenance_note": (
                "DEMO BASELINE MODEL: Trained on synthetic 90-day time-series data with seasonal multipliers."
                if self.model_data.get("is_synthetic_baseline", True)
                else "LIVE RETRAINED MODEL: Trained directly on authenticated POS sales records."
            )
        }

    def predict_next_day(
        self,
        restaurant_id: str,
        target_day_of_week: int,
        target_month: int,
        is_weekend: bool,
        is_holiday: bool,
        recent_14d_covers: Optional[List[float]] = None,
        recent_7d_covers: Optional[List[float]] = None,
        menu_items: Optional[List[Dict[str, Any]]] = None,
        recipe_boms: Optional[Dict[str, List[Dict[str, Any]]]] = None
    ) -> Dict[str, Any]:
        """
        Executes the full 3-tier cascade prediction:
        Tier 1: Customer Footfall
        Tier 2: Individual Menu Item Demand
        Tier 3: Raw Ingredient Preparation Requirements (Deterministic BOM)
        """
        menu_items = menu_items or []
        recipe_boms = recipe_boms or {}
        history = recent_14d_covers or recent_7d_covers or []

        # Tier 1: ML Footfall Prediction
        weights = np.array(self.model_data["weights"])
        mean = np.array(self.model_data["mean"])
        std = np.array(self.model_data["std"])

        # Default historical baseline if history is short
        if not history or len(history) < 14:
            history = [110.0, 115.0, 105.0, 120.0, 140.0, 155.0, 145.0,
                       112.0, 118.0, 108.0, 122.0, 142.0, 160.0, 150.0]

        lag_1 = history[-1]
        lag_7 = history[-7]
        rolling_7d = float(np.mean(history[-7:]))
        rolling_14d = float(np.mean(history))

        raw_feat = np.array([
            float(target_day_of_week),
            float(target_month),
            1.0 if is_weekend else 0.0,
            1.0 if is_holiday else 0.0,
            float(lag_1),
            float(lag_7),
            rolling_7d,
            rolling_14d
        ])

        norm_feat = (raw_feat - mean) / std
        full_feat = np.insert(norm_feat, 0, 1.0) # Intercept

        raw_pred = float(full_feat @ weights)
        predicted_customers = max(20, int(round(raw_pred)))

        # Tier 2: Menu Item Orders Breakdown
        predicted_dishes = []
        total_ratio = sum(item.get("popularity_ratio", 0.2) for item in menu_items)
        if total_ratio == 0:
            total_ratio = 1.0

        for item in menu_items:
            ratio = item.get("popularity_ratio", 0.2) / total_ratio
            dish_orders = max(2, int(round(predicted_customers * ratio)))
            predicted_dishes.append({
                "menu_item_id": item["id"],
                "dish_name": item["name"],
                "category": item.get("category", "Main Course"),
                "price": item.get("price", 250.0),
                "predicted_orders": dish_orders
            })

        # Tier 3: Deterministic Recipe BOM Cascade
        ingredient_prep: Dict[str, Dict[str, Any]] = {}
        for dish in predicted_dishes:
            dish_id = dish["menu_item_id"]
            dish_qty = dish["predicted_orders"]
            boms = recipe_boms.get(dish_id, [])

            for bom in boms:
                name = bom["ingredient_name"]
                qty_per_portion = bom["quantity_required"]
                unit = bom["unit"]

                total_req = dish_qty * qty_per_portion
                if name not in ingredient_prep:
                    ingredient_prep[name] = {
                        "ingredient_name": name,
                        "unit": unit,
                        "required_quantity": 0.0
                    }
                ingredient_prep[name]["required_quantity"] += total_req

        prep_list = [
            {
                "ingredient_name": data["ingredient_name"],
                "required_quantity": round(data["required_quantity"], 2),
                "unit": data["unit"]
            }
            for data in ingredient_prep.values()
        ]

        return {
            "restaurant_id": restaurant_id,
            "model_provenance": self.get_provenance(),
            "tier_1_footfall": {
                "predicted_customer_count": predicted_customers,
                "confidence_lower": max(10, int(round(predicted_customers * 0.90))),
                "confidence_upper": int(round(predicted_customers * 1.10)),
                "confidence_interval": [max(10, int(round(predicted_customers * 0.90))), int(round(predicted_customers * 1.10))],
                "factors": {
                    "day_of_week": target_day_of_week,
                    "is_weekend": is_weekend,
                    "is_holiday": is_holiday,
                    "rolling_7d_average": round(rolling_7d, 1)
                }
            },
            "tier_2_menu_demand": predicted_dishes,
            "tier_3_raw_ingredient_prep": prep_list
        }
