from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class CartItem(BaseModel):
    menu_item_id: str
    quantity: int = Field(..., gt=0)

class CheckoutRequest(BaseModel):
    items: List[CartItem] = Field(..., min_length=1)
    payment_method: str = Field(default="UPI", description="UPI, CARD, CASH")
    customer_name: Optional[str] = "Walk-in Guest"

class BillItemDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    menu_item_id: str
    dish_name: Optional[str] = None
    quantity: int
    unit_price: float
    total_price: float

class BillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    restaurant_id: str
    bill_number: str
    subtotal: float
    tax_amount: float
    total_amount: float
    payment_method: str
    status: str
    created_at: Optional[datetime]
    items: List[BillItemDetail]
    deductions_summary: Optional[List[dict]] = None
