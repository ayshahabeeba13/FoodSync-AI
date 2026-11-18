"""
FoodSync AI - Demand Forecasting Training Engine
Supports both 90-Day Synthetic Demo Baseline and Live POS Retraining
"""
import os
import json
import numpy as np
from datetime import date, timedelta
from typing import Dict, Any, Tuple, List

from ai_engine.data_prep import chronological_train_test_split, evaluate_predictions

MODEL_STORAGE_PATH = os.path.join(os.path.dirname(__file__), "trained_models", "baseline_weights.json")

def generate_90d_synthetic_dataset(base_covers: float = 120.0) -> Tuple[np.ndarray, np.ndarray, List[Dict[str, Any]]]:
    """
    Generates 90 days of chronological time-series data with realistic weekend,
    holiday, and weekly cyclical seasonality.
    """
    np.random.seed(42)
    start_date = date.today() - timedelta(days=90)
    
    records = []
    raw_covers = []
    
    for i in range(90):
        current_date = start_date + timedelta(days=i)
        dow = current_date.weekday() # 0 = Monday, 6 = Sunday
        month = current_date.month
        is_weekend = 1.0 if dow in (4, 5, 6) else 0.0 # Fri, Sat, Sun
        is_holiday = 1.0 if (i % 18 == 0) else 0.0 # Occasional holiday
        
        # Seasonality factors
        weekend_mult = 1.35 if is_weekend else 1.0
        holiday_mult = 1.25 if is_holiday else 1.0
        noise = np.random.normal(0, 6.0)
        
        daily_footfall = int(max(40, round(base_covers * weekend_mult * holiday_mult + noise)))
        raw_covers.append(daily_footfall)
        records.append({
            "date": str(current_date),
            "day_of_week": dow,
            "month": month,
            "is_weekend": is_weekend,
            "is_holiday": is_holiday,
            "actual_footfall": daily_footfall
        })

    # Build feature matrix with lag features and rolling averages
    X_list = []
    y_list = []
    
    for i in range(14, 90):
        dow = records[i]["day_of_week"]
        month = records[i]["month"]
        is_weekend = records[i]["is_weekend"]
        is_holiday = records[i]["is_holiday"]
        lag_1 = float(raw_covers[i - 1])
        lag_7 = float(raw_covers[i - 7])
        rolling_7d = float(np.mean(raw_covers[i - 7:i]))
        rolling_14d = float(np.mean(raw_covers[i - 14:i]))
        
        features = [
            1.0, # Intercept bias
            float(dow),
            float(month),
            is_weekend,
            is_holiday,
            lag_1,
            lag_7,
            rolling_7d,
            rolling_14d
        ]
        X_list.append(features)
        y_list.append(float(records[i]["actual_footfall"]))

    return np.array(X_list, dtype=np.float64), np.array(y_list, dtype=np.float64), records

class RidgeDemandModel:
    """
    Multivariate Ridge Regressor implemented in NumPy.
    Resilient to Windows WDAC policies while providing exact mathematical optimization.
    """
    def __init__(self, l2_reg: float = 1.0):
        self.l2_reg = l2_reg
        self.weights = None
        self.mean_ = None
        self.std_ = None

    def fit(self, X: np.ndarray, y: np.ndarray):
        # Normalize features (excluding intercept at index 0)
        X_norm = X.copy()
        self.mean_ = np.mean(X[:, 1:], axis=0)
        self.std_ = np.std(X[:, 1:], axis=0)
        self.std_[self.std_ == 0] = 1.0
        X_norm[:, 1:] = (X[:, 1:] - self.mean_) / self.std_

        # Closed-form solution: w = (X^T X + lambda * I)^(-1) X^T y
        n_features = X.shape[1]
        I = np.eye(n_features)
        I[0, 0] = 0.0 # Do not regularize intercept
        self.weights = np.linalg.solve(X_norm.T @ X_norm + self.l2_reg * I, X_norm.T @ y)
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        X_norm = X.copy()
        if len(X_norm.shape) == 1:
            X_norm = X_norm.reshape(1, -1)
        X_norm[:, 1:] = (X_norm[:, 1:] - self.mean_) / self.std_
        return X_norm @ self.weights

def train_and_save_baseline_model() -> Dict[str, Any]:
    X, y, records = generate_90d_synthetic_dataset()
    X_train, X_test, y_train, y_test = chronological_train_test_split(X, y, train_ratio=0.8)

    model = RidgeDemandModel(l2_reg=1.5)
    model.fit(X_train, y_train)

    y_pred_test = model.predict(X_test)
    eval_metrics = evaluate_predictions(y_test, y_pred_test)

    os.makedirs(os.path.dirname(MODEL_STORAGE_PATH), exist_ok=True)
    model_data = {
        "model_type": "DEMO_BASELINE",
        "is_synthetic_baseline": True,
        "trained_at": str(date.today()),
        "weights": model.weights.tolist(),
        "mean": model.mean_.tolist(),
        "std": model.std_.tolist(),
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "evaluation_metrics": eval_metrics,
        "feature_names": [
            "intercept", "day_of_week", "month", "is_weekend",
            "is_holiday", "lag_1", "lag_7", "rolling_7d", "rolling_14d"
        ]
    }

    with open(MODEL_STORAGE_PATH, "w") as f:
        json.dump(model_data, f, indent=2)

    return model_data

if __name__ == "__main__":
    meta = train_and_save_baseline_model()
    print("Baseline Model Trained Successfully!")
    print(f"Holdout Test MAE: {meta['evaluation_metrics']['mae']} covers")
    print(f"R2 Score: {meta['evaluation_metrics']['r2_score']}")
