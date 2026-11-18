import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.models.models import Menu, Recipe, RecipeIngredient, IngredientBatch
from backend.app.schemas.recipes import (
    MenuItemCreate,
    MenuItemResponse,
    RecipeCreate,
    RecipeResponse,
    RecipeIngredientResponse
)

class RecipeService:
    @staticmethod
    def get_menu_items(db: Session, restaurant_id: str) -> List[MenuItemResponse]:
        items = db.query(Menu).filter(Menu.restaurant_id == restaurant_id).all()
        result = []
        for item in items:
            resp = MenuItemResponse.model_validate(item)
            if item.recipe:
                resp.recipe = RecipeResponse.model_validate(item.recipe)
                resp.recipe.ingredients = [RecipeIngredientResponse.model_validate(i) for i in item.recipe.ingredients]
                
                # Estimate portion cost from ingredient batches
                estimated_cost = 0.0
                for ing in item.recipe.ingredients:
                    batch = db.query(IngredientBatch).filter(
                        IngredientBatch.restaurant_id == restaurant_id,
                        IngredientBatch.ingredient_name == ing.ingredient_name
                    ).first()
                    unit_cost = batch.unit_cost if batch else 100.0 # fallback benchmark
                    estimated_cost += ing.quantity_required * unit_cost
                resp.estimated_cost = round(estimated_cost, 2)
            result.append(resp)
        return result

    @staticmethod
    def create_menu_item(db: Session, restaurant_id: str, data: MenuItemCreate) -> MenuItemResponse:
        menu_id = str(uuid.uuid4())
        item = Menu(
            id=menu_id,
            restaurant_id=restaurant_id,
            name=data.name.strip(),
            category=data.category.strip(),
            price=data.price,
            is_available=data.is_available if data.is_available is not None else True
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return MenuItemResponse.model_validate(item)

    @staticmethod
    def create_or_update_recipe(db: Session, restaurant_id: str, data: RecipeCreate) -> RecipeResponse:
        menu_item = db.query(Menu).filter(
            Menu.id == data.menu_item_id,
            Menu.restaurant_id == restaurant_id
        ).first()
        if not menu_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Menu item not found in your restaurant catalog."
            )

        # Remove existing recipe if updating
        existing_recipe = db.query(Recipe).filter(Recipe.menu_item_id == data.menu_item_id).first()
        if existing_recipe:
            db.delete(existing_recipe)
            db.commit()

        recipe_id = str(uuid.uuid4())
        new_recipe = Recipe(
            id=recipe_id,
            menu_item_id=data.menu_item_id,
            preparation_time_minutes=data.preparation_time_minutes or 30,
            instructions=data.instructions
        )
        db.add(new_recipe)

        for item in data.ingredients:
            ing_id = str(uuid.uuid4())
            new_ing = RecipeIngredient(
                id=ing_id,
                recipe_id=recipe_id,
                ingredient_name=item.ingredient_name.strip(),
                quantity_required=item.quantity_required,
                unit=item.unit.strip()
            )
            db.add(new_ing)

        db.commit()
        db.refresh(new_recipe)
        resp = RecipeResponse.model_validate(new_recipe)
        resp.ingredients = [RecipeIngredientResponse.model_validate(i) for i in new_recipe.ingredients]
        return resp
