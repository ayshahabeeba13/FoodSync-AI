from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import Optional, List, Dict, Any

from backend.app.core.database import get_db
from backend.app.api.deps import require_role
from backend.app.models.models import User, Menu, Recipe, RecipeIngredient, IngredientBatch, Bill
from ai_engine.predictor import DemandPredictor

router = APIRouter(prefix="/predictions", tags=["AI Demand Forecasting"])

predictor = DemandPredictor()

@router.get("/forecast")
def get_forecast(
    target_date_str: Optional[str] = Query(None, description="YYYY-MM-DD (defaults to tomorrow)"),
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """
    Returns the full 3-Tier AI Demand Prediction:
    Tier 1: Customer Footfall Prediction
    Tier 2: Individual Menu Item Demand
    Tier 3: Raw Ingredient Preparation Requirements (BOM Cascade)
    """
    restaurant_id = current_user.restaurant_id
    if target_date_str:
        try:
            target_date = date.fromisoformat(target_date_str)
        except ValueError:
            target_date = date.today() + timedelta(days=1)
    else:
        target_date = date.today() + timedelta(days=1)

    dow = target_date.weekday()
    month = target_date.month
    is_weekend = dow in (4, 5, 6) # Fri, Sat, Sun
    is_holiday = False # Standard non-holiday default

    # 1. Fetch menu items for this restaurant
    menu_items_db = db.query(Menu).filter(Menu.restaurant_id == restaurant_id).all()
    menu_items = []
    recipe_boms = {}

    for dish in menu_items_db:
        menu_items.append({
            "id": dish.id,
            "name": dish.name,
            "category": dish.category,
            "price": dish.price,
            "popularity_ratio": 0.25
        })
        if dish.recipe and dish.recipe.ingredients:
            recipe_boms[dish.id] = [
                {
                    "ingredient_name": i.ingredient_name,
                    "quantity_required": i.quantity_required,
                    "unit": i.unit
                }
                for i in dish.recipe.ingredients
            ]

    # If no menu items exist yet, provide fallback demo dishes
    if not menu_items:
        menu_items = [
            {"id": "demo_1", "name": "Signature Dish", "category": "Main Course", "price": 250.0, "popularity_ratio": 0.5},
            {"id": "demo_2", "name": "Chef Special", "category": "Main Course", "price": 320.0, "popularity_ratio": 0.5}
        ]
        recipe_boms = {
            "demo_1": [{"ingredient_name": "Core Grain", "quantity_required": 0.2, "unit": "kg"}],
            "demo_2": [{"ingredient_name": "Fresh Dairy", "quantity_required": 0.15, "unit": "kg"}]
        }

    # 2. Compute prediction cascade
    result = predictor.predict_next_day(
        restaurant_id=restaurant_id,
        target_day_of_week=dow,
        target_month=month,
        is_weekend=is_weekend,
        is_holiday=is_holiday,
        recent_14d_covers=[],
        menu_items=menu_items,
        recipe_boms=recipe_boms
    )

    result["target_date"] = str(target_date)
    return result

@router.get("/stock-gap")
def get_stock_gap_analysis(
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """
    Compares tomorrow's predicted raw ingredient demand against actual batch stock.
    Identifies:
    1. Shortage Items (needed > in-stock): candidates for B2B requests.
    2. Surplus Items (in-stock > needed and near expiry): candidates for B2B sharing or NGO donation.
    """
    restaurant_id = current_user.restaurant_id
    forecast = get_forecast(target_date_str=None, current_user=current_user, db=db)
    predicted_prep = {
        item["ingredient_name"]: item["required_quantity"]
        for item in forecast.get("tier_3_raw_ingredient_prep", [])
    }

    # Fetch active batches
    batches = db.query(IngredientBatch).filter(
        IngredientBatch.restaurant_id == restaurant_id,
        IngredientBatch.current_quantity > 0
    ).all()

    stock_map = {}
    today = date.today()
    for b in batches:
        name = b.ingredient_name
        days_to_expiry = (b.expiry_date - today).days
        if name not in stock_map:
            stock_map[name] = {
                "current_stock": 0.0,
                "unit": b.unit,
                "earliest_expiry_days": days_to_expiry,
                "category": b.category
            }
        stock_map[name]["current_stock"] += b.current_quantity
        stock_map[name]["earliest_expiry_days"] = min(stock_map[name]["earliest_expiry_days"], days_to_expiry)

    shortages = []
    surpluses = []
    all_ingredients = set(list(predicted_prep.keys()) + list(stock_map.keys()))

    for ing in all_ingredients:
        needed = predicted_prep.get(ing, 0.0)
        stock_info = stock_map.get(ing, {"current_stock": 0.0, "unit": "kg", "earliest_expiry_days": 99, "category": "GENERAL"})
        available = stock_info["current_stock"]
        unit = stock_info["unit"]
        earliest_expiry = stock_info["earliest_expiry_days"]

        delta = round(available - needed, 2)
        if delta < 0:
            shortages.append({
                "ingredient_name": ing,
                "category": stock_info["category"],
                "required": needed,
                "current_stock": available,
                "deficit": abs(delta),
                "unit": unit,
                "severity": "CRITICAL" if abs(delta) > 10 else "MODERATE"
            })
        elif delta > 5.0 and earliest_expiry <= 3:
            # Significant excess that will expire soon
            surpluses.append({
                "ingredient_name": ing,
                "category": stock_info["category"],
                "required": needed,
                "current_stock": available,
                "surplus_amount": delta,
                "unit": unit,
                "days_until_expiry": earliest_expiry,
                "recommended_action": "SHARE_B2B_OR_DONATE"
            })

    return {
        "restaurant_id": restaurant_id,
        "target_date": forecast.get("target_date"),
        "model_provenance": forecast.get("model_provenance"),
        "shortages": shortages,
        "surpluses": surpluses,
        "total_shortages_count": len(shortages),
        "total_surpluses_count": len(surpluses)
    }

@router.post("/retrain")
def retrain_model(
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """
    Retrains the demand prediction model on actual restaurant POS records.
    Transitions provenance from DEMO_BASELINE to LIVE_RETRAINED if data is sufficient.
    """
    restaurant_id = current_user.restaurant_id
    bills = db.query(Bill).filter(Bill.restaurant_id == restaurant_id).all()

    # Aggregate daily covers from bills
    daily_covers = {}
    for b in bills:
        day_str = b.created_at.strftime("%Y-%m-%d") if b.created_at else str(date.today())
        daily_covers[day_str] = daily_covers.get(day_str, 0) + 1

    pos_records = []
    for day_str, count in sorted(daily_covers.items()):
        d = date.fromisoformat(day_str)
        pos_records.append({
            "date": day_str,
            "covers": count * 3, # Average 3 guests per bill
            "day_of_week": d.weekday(),
            "month": d.month,
            "is_weekend": d.weekday() in (4, 5, 6),
            "is_holiday": False
        })

    result = predictor.retrain_on_restaurant_history(pos_records)
    return result
