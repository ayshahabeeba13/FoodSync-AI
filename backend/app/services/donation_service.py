import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from backend.app.models.models import (
    SurplusListing,
    Donation,
    Restaurant,
    NGO,
    PreparedFoodPortion,
    StockAuditLog,
    User
)
from backend.app.schemas.sharing import (
    SurplusListingCreate,
    SurplusListingResponse,
    DonationResponse,
    FoodSafetyRecordResponse
)
from backend.app.services.b2b_service import haversine_distance_km
from backend.app.core.security import generate_collection_otp, verify_collection_otp

class DonationService:
    @staticmethod
    def create_prepared_listing(
        db: Session,
        restaurant_id: str,
        data: SurplusListingCreate
    ) -> SurplusListingResponse:
        """
        Creates a donation listing for prepared meals.
        CRITICAL SAFEGUARD: Defaults to status='DRAFT' and safety_verified=False.
        Must undergo staff food safety inspection before appearing in NGO feeds.
        """
        portion = db.query(PreparedFoodPortion).filter(
            PreparedFoodPortion.id == data.item_ref_id,
            PreparedFoodPortion.restaurant_id == restaurant_id
        ).first()

        if not portion or portion.portion_count < int(data.quantity):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Prepared portion record not found or quantity requested exceeds stock."
            )

        listing_id = str(uuid.uuid4())
        listing = SurplusListing(
            id=listing_id,
            restaurant_id=restaurant_id,
            listing_type="PREPARED_PORTION",
            item_ref_id=portion.id,
            item_name=data.item_name.strip(),
            quantity=data.quantity,
            unit="portions",
            target_audience="NGO",
            status="DRAFT", # Locked until FoodSafetyRecord is created
            available_until=data.available_until,
            safety_verified=False
        )
        db.add(listing)
        db.commit()
        db.refresh(listing)

        rest = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
        resp = SurplusListingResponse.model_validate(listing)
        if rest:
            resp.restaurant_name = rest.name
            resp.restaurant_address = rest.address
            resp.latitude = rest.latitude
            resp.longitude = rest.longitude
        return resp

    @staticmethod
    def get_available_donations(
        db: Session,
        ngo_id: str,
        radius_km: float = 15.0
    ) -> List[SurplusListingResponse]:
        """
        Returns only HUMAN-VERIFIED safe listings within service radius.
        Listings with safety_verified=False or status='DRAFT' are strictly excluded.
        """
        ngo = db.query(NGO).filter(NGO.id == ngo_id).first()
        if not ngo:
            raise HTTPException(status_code=404, detail="NGO profile not found.")

        listings = db.query(SurplusListing).filter(
            SurplusListing.listing_type == "PREPARED_PORTION",
            SurplusListing.status == "VERIFIED_AVAILABLE",
            SurplusListing.safety_verified == True
        ).all()

        results = []
        for l in listings:
            rest = db.query(Restaurant).filter(Restaurant.id == l.restaurant_id).first()
            if not rest:
                continue

            dist = haversine_distance_km(ngo.latitude, ngo.longitude, rest.latitude, rest.longitude)
            if dist <= radius_km:
                resp = SurplusListingResponse.model_validate(l)
                resp.restaurant_name = rest.name
                resp.restaurant_address = rest.address
                resp.latitude = rest.latitude
                resp.longitude = rest.longitude
                resp.distance_km = dist
                if l.safety_record:
                    resp.safety_record = FoodSafetyRecordResponse.model_validate(l.safety_record)
                results.append(resp)

        results.sort(key=lambda x: x.distance_km if x.distance_km is not None else 999.0)
        return results

    @staticmethod
    def claim_donation(db: Session, ngo_user: User, listing_id: str) -> DonationResponse:
        """
        NGO volunteer claims a verified safe surplus meal donation.
        Generates secure 6-digit collection OTP with 30-minute validity.
        """
        try:
            listing = db.query(SurplusListing).filter(
                SurplusListing.id == listing_id
            ).with_for_update().first()
        except Exception:
            listing = db.query(SurplusListing).filter(SurplusListing.id == listing_id).first()

        if not listing or listing.status != "VERIFIED_AVAILABLE" or not listing.safety_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Donation listing is not available or has not completed mandatory food-safety certification."
            )

        # Generate secure collection OTP (Safeguard 2: 30 minutes validity, salted hash)
        plain_otp, hashed_otp, salt, expires_at = generate_collection_otp(expiry_minutes=30)

        donation_id = str(uuid.uuid4())
        donation = Donation(
            id=donation_id,
            listing_id=listing.id,
            restaurant_id=listing.restaurant_id,
            ngo_id=ngo_user.ngo_id,
            quantity=listing.quantity,
            unit=listing.unit,
            status="REQUESTED",
            hashed_otp=hashed_otp,
            salt=salt,
            otp_expires_at=expires_at,
            otp_attempt_count=0
        )
        db.add(donation)

        listing.status = "RESERVED"
        db.commit()
        db.refresh(donation)

        rest = db.query(Restaurant).filter(Restaurant.id == listing.restaurant_id).first()
        ngo = db.query(NGO).filter(NGO.id == ngo_user.ngo_id).first()

        resp = DonationResponse.model_validate(donation)
        resp.dish_name = listing.item_name
        resp.restaurant_name = rest.name if rest else "Restaurant"
        resp.restaurant_address = rest.address if rest else "Address"
        resp.ngo_name = ngo.name if ngo else "NGO"
        resp.plain_otp = plain_otp # Returned ONCE to claiming NGO
        return resp

    @staticmethod
    def verify_collection_otp(
        db: Session,
        restaurant_id: str,
        donation_id: str,
        submitted_otp: str
    ) -> DonationResponse:
        """
        Restaurant staff verifies the 6-digit OTP presented by NGO volunteer.
        Enforces 3-attempt lockout and 30-minute expiration.
        On success, decrements prepared food stock, updates audit log, marks completed.
        """
        donation = db.query(Donation).filter(
            Donation.id == donation_id,
            Donation.restaurant_id == restaurant_id
        ).first()

        if not donation or donation.status != "REQUESTED":
            raise HTTPException(status_code=400, detail="Donation is not in a valid state for collection.")

        is_valid, err_code, remaining = verify_collection_otp(
            submitted_otp=submitted_otp,
            stored_hash=donation.hashed_otp,
            salt=donation.salt,
            expires_at=donation.otp_expires_at,
            attempt_count=donation.otp_attempt_count,
            max_attempts=3
        )

        donation.otp_attempt_count += 1

        if not is_valid:
            db.commit()
            if err_code == "OTP_EXPIRED":
                raise HTTPException(status_code=400, detail="Collection OTP has expired (30-minute window exceeded).")
            elif err_code == "MAX_ATTEMPTS_EXCEEDED":
                donation.status = "CANCELLED"
                db.commit()
                raise HTTPException(status_code=403, detail="Maximum verification attempts (3) exceeded. Collection locked.")
            else:
                raise HTTPException(status_code=400, detail=f"Invalid OTP code. {remaining} attempt(s) remaining.")

        # Success: Handover confirmed!
        donation.status = "COMPLETED"
        donation.collected_at = datetime.now(timezone.utc)

        listing = db.query(SurplusListing).filter(SurplusListing.id == donation.listing_id).first()
        if listing:
            listing.status = "COMPLETED"
            portion = db.query(PreparedFoodPortion).filter(PreparedFoodPortion.id == listing.item_ref_id).first()
            if portion:
                portion.portion_count = max(0, portion.portion_count - int(donation.quantity))

            audit = StockAuditLog(
                id=str(uuid.uuid4()),
                restaurant_id=restaurant_id,
                item_type="PREPARED_PORTION",
                item_id=listing.item_ref_id,
                item_name=listing.item_name,
                action="DONATED",
                quantity_delta=-donation.quantity,
                remaining_quantity=float(portion.portion_count) if portion else 0.0,
                unit="portions",
                reason=f"Verified NGO Donation Handover to NGO ID: {donation.ngo_id}"
            )
            db.add(audit)

        db.commit()
        db.refresh(donation)

        resp = DonationResponse.model_validate(donation)
        resp.dish_name = listing.item_name if listing else "Meal Portions"
        return resp

    @staticmethod
    def get_donation_stats(db: Session, ngo_id: Optional[str] = None) -> Dict[str, Any]:
        """Calculates community ESG and food rescue statistics."""
        query = db.query(Donation).filter(Donation.status == "COMPLETED")
        if ngo_id:
            query = query.filter(Donation.ngo_id == ngo_id)

        completed_donations = query.all()
        total_portions = sum(d.quantity for d in completed_donations)
        # Average meal portion weight = 0.45 kg
        total_kg_saved = round(total_portions * 0.45, 1)
        # 1 kg food waste avoided prevents approx 2.5 kg CO2 equivalent emissions
        co2_avoided_kg = round(total_kg_saved * 2.5, 1)

        active_claims = db.query(Donation).filter(Donation.status == "REQUESTED")
        if ngo_id:
            active_claims = active_claims.filter(Donation.ngo_id == ngo_id)

        return {
            "total_meals_rescued": int(total_portions),
            "total_food_weight_kg": total_kg_saved,
            "co2_emissions_avoided_kg": co2_avoided_kg,
            "active_pending_pickups": active_claims.count(),
            "completed_distributions": len(completed_donations)
        }
