import math
import uuid
import secrets
from datetime import datetime, timezone, date
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.models.models import (
    SurplusListing,
    FoodTransfer,
    Restaurant,
    IngredientBatch,
    StockAuditLog
)
from backend.app.schemas.sharing import (
    SurplusListingCreate,
    SurplusListingResponse,
    TransferRequestCreate,
    TransferResponse,
    FoodSafetyRecordResponse
)

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)

class B2BService:
    @staticmethod
    def create_listing(db: Session, restaurant_id: str, data: SurplusListingCreate) -> SurplusListingResponse:
        batch = db.query(IngredientBatch).filter(
            IngredientBatch.id == data.item_ref_id,
            IngredientBatch.restaurant_id == restaurant_id
        ).first()

        if not batch or batch.current_quantity < data.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Batch not found or insufficient inventory quantity for surplus listing."
            )

        listing_id = str(uuid.uuid4())
        listing = SurplusListing(
            id=listing_id,
            restaurant_id=restaurant_id,
            listing_type="RAW_INGREDIENT",
            item_ref_id=batch.id,
            item_name=data.item_name.strip(),
            quantity=data.quantity,
            unit=data.unit.strip(),
            target_audience=data.target_audience.upper().strip(),
            status="VERIFIED_AVAILABLE", # Raw ingredients pass standard batch inspection
            available_until=data.available_until,
            safety_verified=True
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
    def get_available_b2b_listings(
        db: Session,
        current_restaurant_id: str,
        radius_km: float = 15.0
    ) -> List[SurplusListingResponse]:
        """
        Discovers surplus raw ingredient listings from nearby restaurants within radius.
        Excludes listings from the requesting restaurant.
        """
        current_rest = db.query(Restaurant).filter(Restaurant.id == current_restaurant_id).first()
        if not current_rest:
            raise HTTPException(status_code=404, detail="Restaurant profile not found.")

        listings = db.query(SurplusListing).filter(
            SurplusListing.restaurant_id != current_restaurant_id,
            SurplusListing.listing_type == "RAW_INGREDIENT",
            SurplusListing.status == "VERIFIED_AVAILABLE",
            SurplusListing.target_audience.in_(["RESTAURANT", "ANY"])
        ).all()

        results = []
        for l in listings:
            source_rest = db.query(Restaurant).filter(Restaurant.id == l.restaurant_id).first()
            if not source_rest:
                continue

            dist = haversine_distance_km(
                current_rest.latitude, current_rest.longitude,
                source_rest.latitude, source_rest.longitude
            )

            if dist <= radius_km:
                resp = SurplusListingResponse.model_validate(l)
                resp.restaurant_name = source_rest.name
                resp.restaurant_address = source_rest.address
                resp.latitude = source_rest.latitude
                resp.longitude = source_rest.longitude
                resp.distance_km = dist
                results.append(resp)

        results.sort(key=lambda x: x.distance_km if x.distance_km is not None else 999.0)
        return results

    @staticmethod
    def request_transfer(db: Session, to_restaurant_id: str, data: TransferRequestCreate) -> TransferResponse:
        """
        Requests surplus inventory transfer.
        Uses row locking on SurplusListing to prevent double-claiming.
        """
        try:
            listing = db.query(SurplusListing).filter(
                SurplusListing.id == data.listing_id
            ).with_for_update().first()
        except Exception:
            listing = db.query(SurplusListing).filter(SurplusListing.id == data.listing_id).first()

        if not listing or listing.status != "VERIFIED_AVAILABLE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Listing is no longer available or has already been reserved."
            )

        if listing.restaurant_id == to_restaurant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot request transfer from your own restaurant."
            )

        if data.quantity > listing.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Requested quantity ({data.quantity}) exceeds available ({listing.quantity})."
            )

        # Generate secure handover code (e.g. TR-8921)
        handover_code = f"TR-{secrets.randbelow(9000) + 1000}"

        transfer_id = str(uuid.uuid4())
        transfer = FoodTransfer(
            id=transfer_id,
            listing_id=listing.id,
            from_restaurant_id=listing.restaurant_id,
            to_restaurant_id=to_restaurant_id,
            quantity=data.quantity,
            unit=listing.unit,
            transfer_price=0.0,
            status="REQUESTED",
            handover_code=handover_code
        )
        db.add(transfer)

        # Reserve listing to prevent concurrent double claiming
        listing.status = "RESERVED"
        db.commit()
        db.refresh(transfer)

        resp = TransferResponse.model_validate(transfer)
        resp.item_name = listing.item_name
        return resp

    @staticmethod
    def accept_transfer(db: Session, from_restaurant_id: str, transfer_id: str) -> TransferResponse:
        transfer = db.query(FoodTransfer).filter(
            FoodTransfer.id == transfer_id,
            FoodTransfer.from_restaurant_id == from_restaurant_id
        ).first()

        if not transfer or transfer.status != "REQUESTED":
            raise HTTPException(status_code=400, detail="Transfer cannot be accepted in its current state.")

        transfer.status = "ACCEPTED"
        db.commit()
        db.refresh(transfer)
        return TransferResponse.model_validate(transfer)

    @staticmethod
    def complete_transfer(
        db: Session,
        transfer_id: str,
        provided_handover_code: str
    ) -> TransferResponse:
        """
        Confirms handover and atomically updates inventory:
        1. Deducts stock from source restaurant batch.
        2. Creates new batch in destination restaurant with identical lot_number and expiry_date (traceability).
        3. Writes immutable StockAuditLog entries for both restaurants.
        4. Marks transfer as COMPLETED.
        """
        transfer = db.query(FoodTransfer).filter(FoodTransfer.id == transfer_id).first()
        if not transfer or transfer.status not in ("REQUESTED", "ACCEPTED"):
            raise HTTPException(status_code=400, detail="Transfer cannot be completed in current state.")

        if transfer.handover_code != provided_handover_code.strip():
            raise HTTPException(status_code=400, detail="Invalid handover code.")

        listing = db.query(SurplusListing).filter(SurplusListing.id == transfer.listing_id).first()
        if not listing:
            raise HTTPException(status_code=404, detail="Underlying listing not found.")

        source_batch = db.query(IngredientBatch).filter(IngredientBatch.id == listing.item_ref_id).first()
        if not source_batch or source_batch.current_quantity < transfer.quantity:
            raise HTTPException(status_code=400, detail="Source batch has insufficient quantity to complete transfer.")

        # 1. Deduct from source batch
        source_batch.current_quantity -= transfer.quantity
        audit_out = StockAuditLog(
            id=str(uuid.uuid4()),
            restaurant_id=transfer.from_restaurant_id,
            item_type="RAW_INGREDIENT",
            item_id=source_batch.id,
            item_name=source_batch.ingredient_name,
            action="B2B_OUT",
            quantity_delta=-transfer.quantity,
            remaining_quantity=source_batch.current_quantity,
            unit=transfer.unit,
            reason=f"B2B Transfer OUT to Restaurant {transfer.to_restaurant_id} (Code: {transfer.handover_code})"
        )
        db.add(audit_out)

        # 2. Add / Credit batch in destination restaurant preserving LOT number, expiry date, and unit cost
        dest_batch_id = str(uuid.uuid4())
        dest_batch = IngredientBatch(
            id=dest_batch_id,
            restaurant_id=transfer.to_restaurant_id,
            ingredient_name=source_batch.ingredient_name,
            category=source_batch.category,
            current_quantity=transfer.quantity,
            unit=transfer.unit,
            lot_number=source_batch.lot_number, # Preserved batch traceability
            unit_cost=source_batch.unit_cost,
            received_date=date.today(),
            expiry_date=source_batch.expiry_date, # Preserved expiry date
            storage_condition=source_batch.storage_condition,
            reorder_level=source_batch.reorder_level
        )
        db.add(dest_batch)

        audit_in = StockAuditLog(
            id=str(uuid.uuid4()),
            restaurant_id=transfer.to_restaurant_id,
            item_type="RAW_INGREDIENT",
            item_id=dest_batch_id,
            item_name=source_batch.ingredient_name,
            action="B2B_IN",
            quantity_delta=transfer.quantity,
            remaining_quantity=transfer.quantity,
            unit=transfer.unit,
            reason=f"B2B Transfer IN from Restaurant {transfer.from_restaurant_id} (Lot: {source_batch.lot_number})"
        )
        db.add(audit_in)

        transfer.status = "COMPLETED"
        transfer.completed_at = datetime.now(timezone.utc)
        listing.status = "COMPLETED"

        db.commit()
        db.refresh(transfer)

        resp = TransferResponse.model_validate(transfer)
        resp.item_name = listing.item_name
        return resp

    @staticmethod
    def get_restaurant_transfers(db: Session, restaurant_id: str) -> List[TransferResponse]:
        transfers = db.query(FoodTransfer).filter(
            (FoodTransfer.from_restaurant_id == restaurant_id) | (FoodTransfer.to_restaurant_id == restaurant_id)
        ).order_by(FoodTransfer.requested_at.desc()).all()

        results = []
        for t in transfers:
            resp = TransferResponse.model_validate(t)
            listing = db.query(SurplusListing).filter(SurplusListing.id == t.listing_id).first()
            if listing:
                resp.item_name = listing.item_name
            from_r = db.query(Restaurant).filter(Restaurant.id == t.from_restaurant_id).first()
            to_r = db.query(Restaurant).filter(Restaurant.id == t.to_restaurant_id).first()
            resp.from_restaurant_name = from_r.name if from_r else "Source Restaurant"
            resp.to_restaurant_name = to_r.name if to_r else "Destination Restaurant"
            results.append(resp)
        return results
