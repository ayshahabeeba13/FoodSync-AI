from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class RecipeIngredientItem(BaseModel):
    ingredient_name: str = Field(..., min_length=2)
    quantity_required: float = Field(..., gt=0)
    unit: str = Field(..., description="kg, g, litres, ml, units")

class RecipeCreate(BaseModel):
    menu_item_id: str
    preparation_time_minutes: Optional[int] = 30
    instructions: Optional[str] = None
    ingredients: List[RecipeIngredientItem]

class MenuItemCreate(BaseModel):
    name: str = Field(..., min_length=2)
    category: str = Field(..., description="Starters, Main Course, Desserts, Beverages")
    price: float = Field(..., gt=0)
    is_available: Optional[bool] = True

class RecipeIngredientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    ingredient_name: str
    quantity_required: float
    unit: str

class RecipeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    menu_item_id: str
    preparation_time_minutes: int
    instructions: Optional[str]
    created_at: Optional[datetime]
    ingredients: List[RecipeIngredientResponse]

class MenuItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    restaurant_id: str
    name: str
    category: str
    price: float
    is_available: bool
    created_at: Optional[datetime]
    recipe: Optional[RecipeResponse] = None
    estimated_cost: Optional[float] = None
