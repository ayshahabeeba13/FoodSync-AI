from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any

from backend.app.core.database import get_db
from backend.app.api.deps import require_role
from backend.app.models.models import User, IngredientBatch, Bill, Donation, FoodTransfer, SurplusListing

router = APIRouter(prefix="/analytics", tags=["Analytics & ESG Reporting"])

@router.get("/dashboard")
def get_dashboard_analytics(
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Computes comprehensive SaaS analytics for restaurant manager:
    Financial KPIs, inventory valuation, category breakdown, ESG metrics.
    """
    restaurant_id = current_user.restaurant_id

    # 1. Total Inventory Valuation
    batches = db.query(IngredientBatch).filter(
        IngredientBatch.restaurant_id == restaurant_id,
        IngredientBatch.current_quantity > 0
    ).all()

    total_inventory_value = sum(b.current_quantity * b.unit_cost for b in batches)
    total_batch_count = len(batches)

    # Category Breakdown
    cat_breakdown = {}
    for b in batches:
        c = b.category
        val = b.current_quantity * b.unit_cost
        cat_breakdown[c] = cat_breakdown.get(c, 0.0) + val

    category_data = [
        {"category": cat, "valuation": round(val, 2)}
        for cat, val in cat_breakdown.items()
    ]

    # 2. Sales & Revenue
    bills = db.query(Bill).filter(
        Bill.restaurant_id == restaurant_id,
        Bill.status == "COMPLETED"
    ).all()

    total_revenue = sum(b.total_amount for b in bills)
    total_bills = len(bills)

    # 3. Sharing & ESG Metrics
    completed_transfers = db.query(FoodTransfer).filter(
        FoodTransfer.from_restaurant_id == restaurant_id,
        FoodTransfer.status == "COMPLETED"
    ).all()
    transferred_kg = sum(t.quantity for t in completed_transfers)

    completed_donations = db.query(Donation).filter(
        Donation.restaurant_id == restaurant_id,
        Donation.status == "COMPLETED"
    ).all()
    donated_portions = sum(d.quantity for d in completed_donations)
    donated_kg = round(donated_portions * 0.45, 1)

    total_food_saved_kg = round(transferred_kg + donated_kg, 1)
    co2_avoided_kg = round(total_food_saved_kg * 2.5, 1)
    landfill_cost_saved = round(total_food_saved_kg * 18.0, 2) # Est. ₹18/kg disposal cost

    return {
        "financials": {
            "total_revenue": round(total_revenue, 2),
            "total_bills_count": total_bills,
            "total_inventory_valuation": round(total_inventory_value, 2),
            "active_batch_count": total_batch_count
        },
        "inventory_categories": category_data,
        "esg_impact": {
            "food_saved_kg": total_food_saved_kg,
            "meals_donated_count": int(donated_portions),
            "co2_emissions_avoided_kg": co2_avoided_kg,
            "landfill_diversion_cost_saved": landfill_cost_saved
        }
    }
