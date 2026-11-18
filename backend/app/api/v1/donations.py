from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from backend.app.core.database import get_db
from backend.app.api.deps import require_role, get_current_user
from backend.app.models.models import User
from backend.app.services.donation_service import DonationService
from backend.app.schemas.sharing import (
    SurplusListingCreate,
    SurplusListingResponse,
    DonationClaimRequest,
    DonationVerifyOTPRequest,
    DonationResponse
)

router = APIRouter(prefix="/donations", tags=["NGO Food Rescue"])

@router.post("/listings", response_model=SurplusListingResponse, status_code=status.HTTP_201_CREATED)
def create_donation_listing(
    data: SurplusListingCreate,
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """
    Registers a prepared food portion donation listing.
    Initial status is 'DRAFT' until staff completes food safety inspection.
    """
    return DonationService.create_prepared_listing(db, current_user.restaurant_id, data)

@router.get("/available", response_model=List[SurplusListingResponse])
def get_available_donations(
    radius_km: float = Query(15.0, le=50.0),
    current_user: User = Depends(require_role("NGO")),
    db: Session = Depends(get_db)
):
    """
    Returns verified safe meal portions available for NGO pickup within service radius.
    Listings lacking human safety verification are strictly excluded.
    """
    return DonationService.get_available_donations(db, current_user.ngo_id, radius_km)

@router.post("/claim", response_model=DonationResponse, status_code=status.HTTP_201_CREATED)
def claim_donation(
    data: DonationClaimRequest,
    current_user: User = Depends(require_role("NGO")),
    db: Session = Depends(get_db)
):
    """
    NGO volunteer claims a donation listing.
    Issues a cryptographically secure 6-digit OTP (30-minute validity) for collection.
    """
    return DonationService.claim_donation(db, current_user, data.listing_id)

@router.post("/{donation_id}/collect", response_model=DonationResponse)
def confirm_collection(
    donation_id: str,
    data: DonationVerifyOTPRequest,
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """
    Restaurant staff enters and verifies the 6-digit OTP provided by the NGO collector.
    Enforces maximum 3 attempts and 30-minute expiration.
    Atomically updates inventory, logs audit entry, and marks handover complete.
    """
    return DonationService.verify_collection_otp(
        db, current_user.restaurant_id, donation_id, data.submitted_otp
    )

@router.get("/stats")
def get_donation_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves ESG impact metrics: meals rescued, kg diverted, CO2 avoided."""
    ngo_id = current_user.ngo_id if current_user.role == "NGO" else None
    return DonationService.get_donation_stats(db, ngo_id)
