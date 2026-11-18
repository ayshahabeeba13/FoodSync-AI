from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.core.database import get_db
from backend.app.api.deps import require_role
from backend.app.models.models import User
from backend.app.services.b2b_service import B2BService
from backend.app.schemas.sharing import (
    SurplusListingCreate,
    SurplusListingResponse,
    TransferRequestCreate,
    TransferActionRequest,
    TransferResponse
)

router = APIRouter(prefix="/b2b", tags=["B2B Restaurant Sharing"])

@router.post("/listings", response_model=SurplusListingResponse, status_code=status.HTTP_201_CREATED)
def create_surplus_listing(
    data: SurplusListingCreate,
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """Publishes a raw ingredient surplus listing for restaurant-to-restaurant exchange."""
    return B2BService.create_listing(db, current_user.restaurant_id, data)

@router.get("/listings", response_model=List[SurplusListingResponse])
def get_nearby_listings(
    radius_km: float = Query(15.0, le=50.0),
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """Discovers available surplus raw ingredients from other restaurants within service radius."""
    return B2BService.get_available_b2b_listings(db, current_user.restaurant_id, radius_km)

@router.post("/transfers/request", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
def request_transfer(
    data: TransferRequestCreate,
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """Initiates an inventory transfer request to acquire surplus stock from another restaurant."""
    return B2BService.request_transfer(db, current_user.restaurant_id, data)

@router.post("/transfers/{transfer_id}/accept", response_model=TransferResponse)
def accept_transfer(
    transfer_id: str,
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """Accepts an incoming B2B transfer request from a neighboring restaurant."""
    return B2BService.accept_transfer(db, current_user.restaurant_id, transfer_id)

@router.post("/transfers/{transfer_id}/complete", response_model=TransferResponse)
def complete_transfer(
    transfer_id: str,
    data: TransferActionRequest,
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """
    Validates handover code and atomically executes stock transfer:
    Deducts stock from source restaurant, credits destination restaurant,
    and preserves original batch lot numbers and expiry dates for traceability.
    """
    if not data.handover_code:
        raise HTTPException(status_code=400, detail="Handover code is required.")
    return B2BService.complete_transfer(db, transfer_id, data.handover_code)

@router.get("/transfers", response_model=List[TransferResponse])
def get_transfers(
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """Retrieves all active and historical B2B transfers for the current restaurant."""
    return B2BService.get_restaurant_transfers(db, current_user.restaurant_id)
