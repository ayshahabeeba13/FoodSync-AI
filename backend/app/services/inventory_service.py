import uuid
from datetime import date, datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from backend.app.models.models import IngredientBatch, PreparedFoodPortion, StockAuditLog
from backend.app.schemas.inventory import (
    IngredientBatchCreate,
    IngredientBatchResponse,
    PreparedPortionCreate,
    PreparedPortionResponse,
    StockAuditLogResponse,
    InventoryAlertsResponse
)

class InventoryService:
    @staticmethod
    def get_batches(db: Session, restaurant_id: str, category: Optional[str] = None) -> List[IngredientBatchResponse]:
        query = db.query(IngredientBatch).filter(
            IngredientBatch.restaurant_id == restaurant_id,
            IngredientBatch.current_quantity > 0
        )
        if category:
            query = query.filter(IngredientBatch.category.ilike(category))

        batches = query.order_by(IngredientBatch.expiry_date.asc()).all()
        today = date.today()
        
        result = []
        for b in batches:
            days_left = (b.expiry_date - today).days
            urgency = "CRITICAL" if days_left <= 2 else ("WARNING" if days_left <= 7 else "GOOD")
            resp = IngredientBatchResponse.model_validate(b)
            resp.days_until_expiry = days_left
            resp.expiry_urgency = urgency
            result.append(resp)
        return result

    @staticmethod
    def create_batch(db: Session, restaurant_id: str, data: IngredientBatchCreate) -> IngredientBatchResponse:
        batch_id = str(uuid.uuid4())
        new_batch = IngredientBatch(
            id=batch_id,
            restaurant_id=restaurant_id,
            ingredient_name=data.ingredient_name.strip(),
            category=data.category.upper().strip(),
            current_quantity=data.current_quantity,
            unit=data.unit.strip(),
            lot_number=data.lot_number.strip(),
            unit_cost=data.unit_cost,
            received_date=data.received_date,
            expiry_date=data.expiry_date,
            storage_condition=data.storage_condition.upper().strip(),
            reorder_level=data.reorder_level or 5.0
        )
        db.add(new_batch)

        # Traceability Audit Log
        audit = StockAuditLog(
            id=str(uuid.uuid4()),
            restaurant_id=restaurant_id,
            item_type="RAW_INGREDIENT",
            item_id=batch_id,
            item_name=data.ingredient_name.strip(),
            action="STOCK_IN",
            quantity_delta=data.current_quantity,
            remaining_quantity=data.current_quantity,
            unit=data.unit.strip(),
            reason=f"Batch Received: Lot {data.lot_number.strip()}"
        )
        db.add(audit)
        db.commit()
        db.refresh(new_batch)

        days_left = (new_batch.expiry_date - date.today()).days
        resp = IngredientBatchResponse.model_validate(new_batch)
        resp.days_until_expiry = days_left
        resp.expiry_urgency = "CRITICAL" if days_left <= 2 else ("WARNING" if days_left <= 7 else "GOOD")
        return resp

    @staticmethod
    def get_portions(db: Session, restaurant_id: str) -> List[PreparedPortionResponse]:
        portions = db.query(PreparedFoodPortion).filter(
            PreparedFoodPortion.restaurant_id == restaurant_id,
            PreparedFoodPortion.portion_count > 0
        ).order_by(PreparedFoodPortion.safe_use_deadline.asc()).all()

        now = datetime.now(timezone.utc)
        result = []
        for p in portions:
            deadline = p.safe_use_deadline
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            hours_left = max(0.0, (deadline - now).total_seconds() / 3600.0)
            resp = PreparedPortionResponse.model_validate(p)
            resp.hours_remaining = round(hours_left, 1)
            result.append(resp)
        return result

    @staticmethod
    def create_portion(db: Session, restaurant_id: str, staff_id: str, data: PreparedPortionCreate) -> PreparedPortionResponse:
        portion_id = str(uuid.uuid4())
        new_portion = PreparedFoodPortion(
            id=portion_id,
            restaurant_id=restaurant_id,
            dish_name=data.dish_name.strip(),
            portion_count=data.portion_count,
            prepared_at=data.prepared_at,
            safe_use_deadline=data.safe_use_deadline,
            holding_temperature_celsius=data.holding_temperature_celsius,
            allergen_flags=data.allergen_flags,
            prepared_by_staff_id=staff_id
        )
        db.add(new_portion)

        audit = StockAuditLog(
            id=str(uuid.uuid4()),
            restaurant_id=restaurant_id,
            item_type="PREPARED_PORTION",
            item_id=portion_id,
            item_name=data.dish_name.strip(),
            action="COOK_PREPARE",
            quantity_delta=float(data.portion_count),
            remaining_quantity=float(data.portion_count),
            unit="portions",
            reason=f"Kitchen Preparation: Safe until {data.safe_use_deadline.strftime('%Y-%m-%d %H:%M')}"
        )
        db.add(audit)
        db.commit()
        db.refresh(new_portion)

        now = datetime.now(timezone.utc)
        deadline = new_portion.safe_use_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        hours_left = max(0.0, (deadline - now).total_seconds() / 3600.0)
        resp = PreparedPortionResponse.model_validate(new_portion)
        resp.hours_remaining = round(hours_left, 1)
        return resp

    @staticmethod
    def get_alerts(db: Session, restaurant_id: str) -> InventoryAlertsResponse:
        today = date.today()
        # 1. Near Expiry Batches (within 3 days)
        all_batches = db.query(IngredientBatch).filter(
            IngredientBatch.restaurant_id == restaurant_id,
            IngredientBatch.current_quantity > 0
        ).order_by(IngredientBatch.expiry_date.asc()).all()

        near_expiry = []
        stock_by_name = {}

        for b in all_batches:
            days_left = (b.expiry_date - today).days
            if days_left <= 3:
                near_expiry.append({
                    "batch_id": b.id,
                    "ingredient_name": b.ingredient_name,
                    "lot_number": b.lot_number,
                    "quantity": b.current_quantity,
                    "unit": b.unit,
                    "expiry_date": str(b.expiry_date),
                    "days_remaining": days_left,
                    "urgency": "CRITICAL" if days_left <= 1 else "WARNING"
                })

            if b.ingredient_name not in stock_by_name:
                stock_by_name[b.ingredient_name] = {
                    "total_quantity": 0.0,
                    "unit": b.unit,
                    "reorder_level": b.reorder_level or 5.0,
                    "category": b.category
                }
            stock_by_name[b.ingredient_name]["total_quantity"] += b.current_quantity

        # 2. Low Stock Alerts
        low_stock = []
        for name, info in stock_by_name.items():
            if info["total_quantity"] <= info["reorder_level"]:
                low_stock.append({
                    "ingredient_name": name,
                    "category": info["category"],
                    "current_stock": round(info["total_quantity"], 2),
                    "reorder_level": info["reorder_level"],
                    "unit": info["unit"],
                    "deficit": round(info["reorder_level"] - info["total_quantity"], 2)
                })

        # Count active prepared portions
        total_portions = db.query(func.coalesce(func.sum(PreparedFoodPortion.portion_count), 0)).filter(
            PreparedFoodPortion.restaurant_id == restaurant_id,
            PreparedFoodPortion.portion_count > 0
        ).scalar()

        return InventoryAlertsResponse(
            low_stock_items=low_stock,
            near_expiry_batches=near_expiry,
            total_active_batches=len(all_batches),
            total_prepared_portions=int(total_portions)
        )

    @staticmethod
    def get_audit_logs(db: Session, restaurant_id: str, limit: int = 50) -> List[StockAuditLogResponse]:
        logs = db.query(StockAuditLog).filter(
            StockAuditLog.restaurant_id == restaurant_id
        ).order_by(StockAuditLog.timestamp.desc()).limit(limit).all()
        return [StockAuditLogResponse.model_validate(log) for log in logs]
