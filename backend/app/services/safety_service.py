import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.models.models import SurplusListing, FoodSafetyRecord, User
from backend.app.schemas.sharing import FoodSafetyChecklistCreate, FoodSafetyRecordResponse
from backend.app.core.config import settings

class FoodSafetyService:
    @staticmethod
    def verify_and_certify_listing(
        db: Session,
        staff_user: User,
        data: FoodSafetyChecklistCreate
    ) -> FoodSafetyRecordResponse:
        """
        SAFEGUARD 5: Mandatory Human Food-Safety Verification Gate.
        No surplus listing or NGO donation can become claimable without a human staff inspection record.
        AI is strictly prohibited from certifying food safety.
        """
        listing = db.query(SurplusListing).filter(
            SurplusListing.id == data.listing_id,
            SurplusListing.restaurant_id == staff_user.restaurant_id
        ).first()

        if not listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Surplus listing not found or unauthorized."
            )

        # Statutory checklist validation
        if not data.packaging_intact:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Food Safety Rejection: Packaging must be completely intact and sealed."
            )

        if not data.sensory_passed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Food Safety Rejection: Sensory inspection (odor, color, appearance) failed."
            )

        if not data.allergens_declared:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Food Safety Rejection: Major allergen flags must be explicitly declared."
            )

        if not data.fssai_compliant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Food Safety Rejection: Must meet statutory FSSAI 2019 Surplus Food Regulations."
            )

        # Temperature check based on FSSAI guidelines
        temp = data.recorded_temperature_celsius
        if listing.listing_type == "PREPARED_PORTION":
            # Chilled foods must be <= 5°C, Hot held food must be >= 65°C
            # Acceptable range check
            if 5.0 < temp < 60.0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Temperature Danger Zone Violation ({temp}°C). "
                        "FSSAI guidelines require chilled food <= 5°C or hot holding >= 60°C."
                    )
                )

        record_id = str(uuid.uuid4())
        record = FoodSafetyRecord(
            id=record_id,
            listing_id=listing.id,
            verified_by_staff_id=staff_user.id,
            inspector_name=data.inspector_name.strip(),
            recorded_temperature_celsius=temp,
            packaging_intact=data.packaging_intact,
            sensory_passed=data.sensory_passed,
            allergens_declared=data.allergens_declared,
            fssai_compliant=data.fssai_compliant,
            is_certified_safe=True
        )
        db.add(record)

        # Unlock listing from DRAFT to VERIFIED_AVAILABLE
        listing.safety_verified = True
        listing.status = "VERIFIED_AVAILABLE"
        db.commit()
        db.refresh(record)

        return FoodSafetyRecordResponse.model_validate(record)
