from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user, require_role
from backend.app.models.models import User
from backend.app.services.inventory_service import InventoryService
from backend.app.schemas.inventory import (
    IngredientBatchCreate,
    IngredientBatchResponse,
    PreparedPortionCreate,
    PreparedPortionResponse,
    StockAuditLogResponse,
    InventoryAlertsResponse
)

router = APIRouter(prefix="/inventory", tags=["Smart Inventory"])

@router.get("/batches", response_model=List[IngredientBatchResponse])
def get_batches(
    category: Optional[str] = Query(None),
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """Retrieves all active raw ingredient batches ordered by FEFO expiry priority."""
    return InventoryService.get_batches(db, current_user.restaurant_id, category)

@router.post("/batches", response_model=IngredientBatchResponse, status_code=status.HTTP_201_CREATED)
def create_batch(
    data: IngredientBatchCreate,
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """Registers a new raw ingredient batch with lot tracking and FEFO expiry indexing."""
    return InventoryService.create_batch(db, current_user.restaurant_id, data)

@router.get("/portions", response_model=List[PreparedPortionResponse])
def get_portions(
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """Retrieves prepared food portions with holding temperature and shelf-life tracking."""
    return InventoryService.get_portions(db, current_user.restaurant_id)

@router.post("/portions", response_model=PreparedPortionResponse, status_code=status.HTTP_201_CREATED)
def create_portion(
    data: PreparedPortionCreate,
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """Registers cooked/prepared food portions with temperature and safe use deadline."""
    return InventoryService.create_portion(db, current_user.restaurant_id, current_user.id, data)

@router.get("/alerts", response_model=InventoryAlertsResponse)
def get_alerts(
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """Returns real-time low-stock alerts and near-expiry batch warnings."""
    return InventoryService.get_alerts(db, current_user.restaurant_id)

@router.get("/audit-logs", response_model=List[StockAuditLogResponse])
def get_audit_logs(
    limit: int = Query(50, le=200),
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """Retrieves immutable stock transaction audit history."""
    return InventoryService.get_audit_logs(db, current_user.restaurant_id, limit)
