from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import date, datetime

class IngredientBatchCreate(BaseModel):
    ingredient_name: str = Field(..., min_length=2)
    category: str = Field(..., description="DAIRY, PRODUCE, GRAIN, MEAT, SEAFOOD, CONDIMENT, BEVERAGE")
    current_quantity: float = Field(..., gt=0)
    unit: str = Field(..., description="kg, g, litres, ml, units")
    lot_number: str = Field(..., min_length=2)
    unit_cost: float = Field(..., ge=0)
    received_date: date
    expiry_date: date
    storage_condition: str = Field(..., description="DRY, REFRIGERATED, FROZEN")
    reorder_level: Optional[float] = 5.0

class IngredientBatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    restaurant_id: str
    ingredient_name: str
    category: str
    current_quantity: float
    unit: str
    lot_number: str
    unit_cost: float
    received_date: date
    expiry_date: date
    storage_condition: str
    reorder_level: float
    created_at: Optional[datetime]
    days_until_expiry: Optional[int] = None
    expiry_urgency: Optional[str] = None # 'CRITICAL', 'WARNING', 'GOOD'

class PreparedPortionCreate(BaseModel):
    dish_name: str = Field(..., min_length=2)
    portion_count: int = Field(..., gt=0)
    prepared_at: datetime
    safe_use_deadline: datetime
    holding_temperature_celsius: float
    allergen_flags: Optional[str] = None

class PreparedPortionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    restaurant_id: str
    dish_name: str
    portion_count: int
    prepared_at: datetime
    safe_use_deadline: datetime
    holding_temperature_celsius: float
    allergen_flags: Optional[str]
    prepared_by_staff_id: Optional[str]
    created_at: Optional[datetime]
    hours_remaining: Optional[float] = None

class StockAuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    restaurant_id: str
    item_type: str
    item_id: str
    item_name: str
    action: str
    quantity_delta: float
    remaining_quantity: float
    unit: str
    reason: str
    reference_id: Optional[str]
    timestamp: Optional[datetime]

class InventoryAlertsResponse(BaseModel):
    low_stock_items: List[dict]
    near_expiry_batches: List[dict]
    total_active_batches: int
    total_prepared_portions: int
