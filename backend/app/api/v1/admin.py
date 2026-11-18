from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any

from backend.app.core.database import get_db
from backend.app.api.deps import require_role
from backend.app.models.models import User, Restaurant, NGO, Bill, Donation, FoodTransfer, StockAuditLog
from backend.app.core.config import settings

router = APIRouter(prefix="/admin", tags=["Admin Control Center"])

@router.get("/overview")
def get_admin_overview(
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Super-admin command center:
    Platform-wide entity stats, regulatory verification status, GMV, and audit records.
    """
    total_restaurants = db.query(Restaurant).count()
    total_ngos = db.query(NGO).count()
    total_users = db.query(User).count()
    
    total_bills = db.query(Bill).count()
    gmv = db.query(func.coalesce(func.sum(Bill.total_amount), 0.0)).scalar()
    
    total_transfers = db.query(FoodTransfer).filter(FoodTransfer.status == "COMPLETED").count()
    total_donations = db.query(Donation).filter(Donation.status == "COMPLETED").count()

    recent_audits = db.query(StockAuditLog).order_by(StockAuditLog.timestamp.desc()).limit(15).all()

    audit_records = [
        {
            "id": a.id,
            "restaurant_id": a.restaurant_id,
            "item_name": a.item_name,
            "action": a.action,
            "quantity_delta": a.quantity_delta,
            "unit": a.unit,
            "reason": a.reason,
            "timestamp": str(a.timestamp)
        }
        for a in recent_audits
    ]

    return {
        "platform_metrics": {
            "total_restaurants": total_restaurants,
            "total_ngos": total_ngos,
            "total_registered_users": total_users,
            "total_bills_processed": total_bills,
            "gross_merchandise_value": round(float(gmv), 2),
            "b2b_transfers_completed": total_transfers,
            "ngo_donations_completed": total_donations
        },
        "system_status": {
            "app_name": settings.APP_NAME,
            "environment": settings.ENVIRONMENT,
            "demo_mode": settings.DEMO_MODE,
            "fssai_standard": settings.REGULATORY_STANDARD
        },
        "recent_system_audits": audit_records
    }
