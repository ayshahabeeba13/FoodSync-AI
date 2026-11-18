import os
import pytest
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["ENVIRONMENT"] = "testing"
os.environ["DEMO_MODE"] = "True"

from backend.app.core.database import Base
from backend.app.models.models import User, Restaurant, Menu, Recipe, RecipeIngredient, IngredientBatch, Bill, StockAuditLog
from backend.app.services.inventory_service import InventoryService
from backend.app.services.recipe_service import RecipeService
from backend.app.services.billing_service import BillingService
from backend.app.schemas.inventory import IngredientBatchCreate
from backend.app.schemas.recipes import MenuItemCreate, RecipeCreate, RecipeIngredientItem
from backend.app.schemas.billing import CheckoutRequest, CartItem

test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_p2_1_create_restaurant_and_batches(db):
    rest = Restaurant(
        id="rest_bella",
        name="Bella Italia Trattoria",
        cuisine_type="Italian",
        address="Indiranagar, Bangalore",
        latitude=12.9716,
        longitude=77.5946,
        fssai_license_number="11223344556677",
        contact_phone="+91 98765 43210"
    )
    db.add(rest)
    db.commit()

    # Batch 1: Expiring in 2 days (10 kg Mozzarella)
    b1_data = IngredientBatchCreate(
        ingredient_name="Mozzarella Cheese",
        category="DAIRY",
        current_quantity=10.0,
        unit="kg",
        lot_number="LOT-MOZ-EARLY",
        unit_cost=400.0,
        received_date=date.today() - timedelta(days=5),
        expiry_date=date.today() + timedelta(days=2),
        storage_condition="REFRIGERATED",
        reorder_level=5.0
    )
    b1 = InventoryService.create_batch(db, "rest_bella", b1_data)
    assert b1.lot_number == "LOT-MOZ-EARLY"
    assert b1.expiry_urgency == "CRITICAL"

    # Batch 2: Expiring in 10 days (15 kg Mozzarella)
    b2_data = IngredientBatchCreate(
        ingredient_name="Mozzarella Cheese",
        category="DAIRY",
        current_quantity=15.0,
        unit="kg",
        lot_number="LOT-MOZ-LATER",
        unit_cost=400.0,
        received_date=date.today() - timedelta(days=2),
        expiry_date=date.today() + timedelta(days=10),
        storage_condition="REFRIGERATED",
        reorder_level=5.0
    )
    b2 = InventoryService.create_batch(db, "rest_bella", b2_data)

    # Batch 3: Flour (20 kg)
    b3_data = IngredientBatchCreate(
        ingredient_name="Pizza Flour",
        category="GRAIN",
        current_quantity=20.0,
        unit="kg",
        lot_number="LOT-FLOUR-01",
        unit_cost=60.0,
        received_date=date.today() - timedelta(days=1),
        expiry_date=date.today() + timedelta(days=30),
        storage_condition="DRY",
        reorder_level=5.0
    )
    InventoryService.create_batch(db, "rest_bella", b3_data)

    batches = InventoryService.get_batches(db, "rest_bella")
    assert len(batches) == 3
    # Verify FEFO ordering (earliest expiry first)
    moz_batches = [b for b in batches if b.ingredient_name == "Mozzarella Cheese"]
    assert moz_batches[0].lot_number == "LOT-MOZ-EARLY"
    assert moz_batches[1].lot_number == "LOT-MOZ-LATER"

def test_p2_2_recipe_creation_and_bom(db):
    # Create Menu Item: Margherita Pizza
    item_dto = MenuItemCreate(name="Margherita Pizza", category="Main Course", price=350.0)
    dish = RecipeService.create_menu_item(db, "rest_bella", item_dto)
    assert dish.name == "Margherita Pizza"

    # Map Recipe BOM: 0.2 kg Flour, 0.15 kg Mozzarella
    recipe_dto = RecipeCreate(
        menu_item_id=dish.id,
        preparation_time_minutes=20,
        instructions="Roll dough, add sauce and mozzarella, wood-fire at 400C for 90 seconds.",
        ingredients=[
            RecipeIngredientItem(ingredient_name="Pizza Flour", quantity_required=0.2, unit="kg"),
            RecipeIngredientItem(ingredient_name="Mozzarella Cheese", quantity_required=0.15, unit="kg")
        ]
    )
    recipe = RecipeService.create_or_update_recipe(db, "rest_bella", recipe_dto)
    assert len(recipe.ingredients) == 2

def test_p2_3_atomic_pos_checkout_fefo_deduction(db):
    dish = db.query(Menu).filter(Menu.restaurant_id == "rest_bella", Menu.name == "Margherita Pizza").first()
    assert dish is not None

    # Checkout 20 pizzas:
    # Requires 20 * 0.15 = 3.0 kg Mozzarella
    # Requires 20 * 0.20 = 4.0 kg Pizza Flour
    checkout_dto = CheckoutRequest(
        items=[CartItem(menu_item_id=dish.id, quantity=20)],
        payment_method="UPI"
    )
    bill = BillingService.checkout(db, "rest_bella", checkout_dto)
    
    assert bill.status == "COMPLETED"
    assert bill.subtotal == 7000.0 # 20 * 350
    assert bill.tax_amount == 350.0 # 5% tax
    assert bill.total_amount == 7350.0

    # Verify FEFO deduction:
    # Early batch had 10kg, should now have 7.0kg
    b_early = db.query(IngredientBatch).filter(IngredientBatch.lot_number == "LOT-MOZ-EARLY").first()
    assert b_early.current_quantity == 7.0

    # Flour had 20kg, should now have 16.0kg
    b_flour = db.query(IngredientBatch).filter(IngredientBatch.lot_number == "LOT-FLOUR-01").first()
    assert b_flour.current_quantity == 16.0

def test_p2_4_safeguard_4_insufficient_stock_atomic_rollback(db):
    from fastapi import HTTPException
    dish = db.query(Menu).filter(Menu.restaurant_id == "rest_bella", Menu.name == "Margherita Pizza").first()

    # Record stock before attempted excessive checkout
    flour_before = db.query(IngredientBatch).filter(IngredientBatch.lot_number == "LOT-FLOUR-01").first().current_quantity
    moz_before = db.query(IngredientBatch).filter(IngredientBatch.lot_number == "LOT-MOZ-EARLY").first().current_quantity

    # Attempt to order 200 pizzas (requires 30 kg Mozzarella, but only 7 + 15 = 22 kg is available)
    excessive_checkout = CheckoutRequest(
        items=[CartItem(menu_item_id=dish.id, quantity=200)],
        payment_method="CARD"
    )

    with pytest.raises(HTTPException) as excinfo:
        BillingService.checkout(db, "rest_bella", excessive_checkout)

    assert excinfo.value.status_code == 400
    assert "Insufficient stock" in excinfo.value.detail
    assert "rolled back completely" in excinfo.value.detail

    # SAFEGUARD 4 VERIFICATION: Stock was NOT touched / rolled back completely
    flour_after = db.query(IngredientBatch).filter(IngredientBatch.lot_number == "LOT-FLOUR-01").first().current_quantity
    moz_after = db.query(IngredientBatch).filter(IngredientBatch.lot_number == "LOT-MOZ-EARLY").first().current_quantity

    assert flour_after == flour_before
    assert moz_after == moz_before

def test_p2_5_audit_logs_and_alerts(db):
    logs = InventoryService.get_audit_logs(db, "rest_bella")
    assert len(logs) > 0
    pos_logs = [l for l in logs if l.action == "POS_DEDUCT"]
    assert len(pos_logs) > 0
    assert pos_logs[0].quantity_delta < 0

    alerts = InventoryService.get_alerts(db, "rest_bella")
    assert alerts.total_active_batches >= 3
