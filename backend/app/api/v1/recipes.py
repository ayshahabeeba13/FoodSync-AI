from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from backend.app.core.database import get_db
from backend.app.api.deps import require_role
from backend.app.models.models import User
from backend.app.services.recipe_service import RecipeService
from backend.app.schemas.recipes import (
    MenuItemCreate,
    MenuItemResponse,
    RecipeCreate,
    RecipeResponse
)

router = APIRouter(prefix="/recipes", tags=["Recipes & BOM Engine"])

@router.get("/menu", response_model=List[MenuItemResponse])
def get_menu_items(
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """Retrieves all menu items for the restaurant including their recipe BOM."""
    return RecipeService.get_menu_items(db, current_user.restaurant_id)

@router.post("/menu", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
def create_menu_item(
    data: MenuItemCreate,
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """Adds a new dish to the restaurant's menu."""
    return RecipeService.create_menu_item(db, current_user.restaurant_id, data)

@router.post("/bom", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
def create_or_update_recipe(
    data: RecipeCreate,
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """Maps a menu item to its constituent raw ingredient quantities (Bill of Materials)."""
    return RecipeService.create_or_update_recipe(db, current_user.restaurant_id, data)
