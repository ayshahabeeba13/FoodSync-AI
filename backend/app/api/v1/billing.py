from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import List

from backend.app.core.database import get_db
from backend.app.api.deps import require_role
from backend.app.models.models import User
from backend.app.services.billing_service import BillingService
from backend.app.schemas.billing import CheckoutRequest, BillResponse

router = APIRouter(prefix="/billing", tags=["Smart POS & Billing"])

@router.post("/checkout", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
def checkout(
    data: CheckoutRequest,
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """
    Executes an atomic POS checkout:
    Deducts raw ingredient stock sequentially via FEFO.
    Safeguard 4: Rolls back completely if any ingredient stock is deficient.
    """
    return BillingService.checkout(db, current_user.restaurant_id, data)

@router.get("/bills", response_model=List[BillResponse])
def get_bills(
    limit: int = Query(50, le=200),
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """Retrieves billing transaction history for the restaurant."""
    return BillingService.get_bills(db, current_user.restaurant_id, limit)
