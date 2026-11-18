"""
FoodSync AI - Master Database Seeder
Populates 5 Restaurants, 2 NGOs, 1 Admin, Menu Recipes, FEFO Batches,
and Scenarios A, B, and C for Hackathon Judging Demonstrations.
"""
import sys
import os

if "--test-db" in sys.argv:
    os.environ["ENVIRONMENT"] = "testing"

import uuid
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.orm import Session

from backend.app.core.database import SessionLocal, init_db, engine
from backend.app.core.security import get_password_hash
from backend.app.models.models import (
    User,
    Restaurant,
    NGO,
    Menu,
    Recipe,
    RecipeIngredient,
    IngredientBatch,
    PreparedFoodPortion,
    SurplusListing,
    FoodSafetyRecord,
    StockAuditLog
)

def seed_database():
    init_db()
    db: Session = SessionLocal()

    print("[Seed] Initializing FoodSync AI Demo Dataset...")

    # Clear existing demo data
    try:
        db.query(StockAuditLog).delete()
        db.query(FoodSafetyRecord).delete()
        db.query(SurplusListing).delete()
        db.query(RecipeIngredient).delete()
        db.query(Recipe).delete()
        db.query(Menu).delete()
        db.query(IngredientBatch).delete()
        db.query(PreparedFoodPortion).delete()
        db.query(User).delete()
        db.query(Restaurant).delete()
        db.query(NGO).delete()
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Seed Notice] Fresh schema ready: {e}")

    hashed_pw = get_password_hash("Password@123")
    today = date.today()
    now = datetime.now(timezone.utc)

    # =========================================================================
    # 1. Five Verified Restaurants
    # =========================================================================
    restaurants_data = [
        {
            "id": "rest_bella",
            "name": "Bella Italia Trattoria",
            "cuisine": "Italian & Wood-Fired Pizza",
            "address": "100 Feet Road, Indiranagar, Bangalore",
            "lat": 12.9716, "lon": 77.5946,
            "fssai": "11223344556677",
            "phone": "+91 98765 43210",
            "manager_email": "manager@bellaitalia.com",
            "manager_name": "Marco Rossi"
        },
        {
            "id": "rest_kyoto",
            "name": "Kyoto Ramen & Wok",
            "cuisine": "Japanese & Pan-Asian",
            "address": "5th Block, Koramangala, Bangalore",
            "lat": 12.9352, "lon": 77.6245,
            "fssai": "22334455667788",
            "phone": "+91 98765 22110",
            "manager_email": "manager@kyotoramen.com",
            "manager_name": "Kenji Sato"
        },
        {
            "id": "rest_daily",
            "name": "The Daily Grind Bistro",
            "cuisine": "Cafe & Artisan Bakery",
            "address": "Church Street, MG Road, Bangalore",
            "lat": 12.9750, "lon": 77.6080, # 2.4 km from Bella Italia
            "fssai": "33445566778899",
            "phone": "+91 98765 33221",
            "manager_email": "manager@dailygrind.com",
            "manager_name": "Aarav Sharma"
        },
        {
            "id": "rest_green",
            "name": "Green Garden Cafe",
            "cuisine": "Organic Salads & Vegan Bowls",
            "address": "Lavelle Road, Shanthala Nagar, Bangalore",
            "lat": 12.9720, "lon": 77.5980,
            "fssai": "44556677889900",
            "phone": "+91 98765 44332",
            "manager_email": "manager@greengarden.com",
            "manager_name": "Chef Ramesh"
        },
        {
            "id": "rest_royal",
            "name": "Royal Biryani House",
            "cuisine": "Mughlai & Dum Biryani",
            "address": "Mosque Road, Frazer Town, Bangalore",
            "lat": 12.9975, "lon": 77.6140,
            "fssai": "55667788990011",
            "phone": "+91 98765 55443",
            "manager_email": "manager@royalbiryani.com",
            "manager_name": "Farhan Qureshi"
        }
    ]

    for r_data in restaurants_data:
        user_id = str(uuid.uuid4())
        u = User(
            id=user_id,
            email=r_data["manager_email"],
            password_hash=hashed_pw,
            role="RESTAURANT",
            full_name=r_data["manager_name"],
            phone=r_data["phone"],
            restaurant_id=r_data["id"]
        )
        r = Restaurant(
            id=r_data["id"],
            owner_id=user_id,
            name=r_data["name"],
            cuisine_type=r_data["cuisine"],
            address=r_data["address"],
            latitude=r_data["lat"],
            longitude=r_data["lon"],
            fssai_license_number=r_data["fssai"],
            contact_phone=r_data["phone"],
            is_verified=True
        )
        db.add(u)
        db.add(r)

    # =========================================================================
    # 2. Two Verified NGOs
    # =========================================================================
    ngos_data = [
        {
            "id": "ngo_cityhope",
            "name": "City Hope Food Rescue",
            "reg": "NGO-KA-2024-8849",
            "address": "Brigade Road, Bangalore",
            "lat": 12.9760, "lon": 77.6033,
            "radius": 15.0,
            "email": "coordinator@cityhope.org",
            "name_rep": "Anjali Rao"
        },
        {
            "id": "ngo_metro",
            "name": "Metropolitan Community Kitchen",
            "reg": "NGO-KA-2024-9912",
            "address": "80 Feet Road, Koramangala, Bangalore",
            "lat": 12.9340, "lon": 77.6200,
            "radius": 20.0,
            "email": "coordinator@metrokitchen.org",
            "name_rep": "Vikram Malhotra"
        }
    ]

    for n_data in ngos_data:
        u_id = str(uuid.uuid4())
        u = User(
            id=u_id,
            email=n_data["email"],
            password_hash=hashed_pw,
            role="NGO",
            full_name=n_data["name_rep"],
            ngo_id=n_data["id"]
        )
        n = NGO(
            id=n_data["id"],
            coordinator_id=u_id,
            name=n_data["name"],
            registration_number=n_data["reg"],
            address=n_data["address"],
            latitude=n_data["lat"],
            longitude=n_data["lon"],
            service_radius_km=n_data["radius"],
            verification_status="VERIFIED"
        )
        db.add(u)
        db.add(n)

    # Platform Admin User
    admin = User(
        id="user_admin_01",
        email="admin@foodsync.ai",
        password_hash=hashed_pw,
        role="ADMIN",
        full_name="System Administrator"
    )
    db.add(admin)
    db.commit()

    # =========================================================================
    # 3. Recipes & Menu Dishes (BOM)
    # =========================================================================
    # Bella Italia Menu & Recipes
    pizza_id = "menu_margherita"
    pasta_id = "menu_carbonara"
    db.add(Menu(id=pizza_id, restaurant_id="rest_bella", name="Margherita Wood-Fired Pizza", category="Main Course", price=360.0))
    db.add(Menu(id=pasta_id, restaurant_id="rest_bella", name="Truffle Mushroom Pasta", category="Main Course", price=420.0))
    
    rec_pizza = Recipe(id="rec_p1", menu_item_id=pizza_id, preparation_time_minutes=20, instructions="Hand-stretch dough, spread San Marzano sauce, fresh mozzarella, wood-fire 90s.")
    rec_pasta = Recipe(id="rec_p2", menu_item_id=pasta_id, preparation_time_minutes=15, instructions="Boil rigatoni al dente, emulsion with parmesan and black truffle paste.")
    db.add_all([rec_pizza, rec_pasta])

    db.add_all([
        RecipeIngredient(id="ri_1", recipe_id="rec_p1", ingredient_name="Pizza Flour", quantity_required=0.20, unit="kg"),
        RecipeIngredient(id="ri_2", recipe_id="rec_p1", ingredient_name="Mozzarella Cheese", quantity_required=0.15, unit="kg"),
        RecipeIngredient(id="ri_3", recipe_id="rec_p1", ingredient_name="Tomato Sauce", quantity_required=0.10, unit="kg"),
        RecipeIngredient(id="ri_4", recipe_id="rec_p2", ingredient_name="Rigatoni Pasta", quantity_required=0.18, unit="kg"),
        RecipeIngredient(id="ri_5", recipe_id="rec_p2", ingredient_name="Parmesan Cheese", quantity_required=0.08, unit="kg")
    ])

    # The Daily Grind Bistro Menu & Recipes
    toast_id = "menu_toast"
    db.add(Menu(id=toast_id, restaurant_id="rest_daily", name="Gourmet Grilled Cheese Toast", category="Snacks", price=220.0))
    rec_toast = Recipe(id="rec_t1", menu_item_id=toast_id, preparation_time_minutes=10, instructions="Sourdough slices with butter and melted mozzarella.")
    db.add(rec_toast)
    db.add_all([
        RecipeIngredient(id="ri_6", recipe_id="rec_t1", ingredient_name="Sourdough Bread", quantity_required=0.12, unit="kg"),
        RecipeIngredient(id="ri_7", recipe_id="rec_t1", ingredient_name="Mozzarella Cheese", quantity_required=0.15, unit="kg")
    ])

    # Royal Biryani House Menu & Recipes
    biryani_id = "menu_chicken_biryani"
    db.add(Menu(id=biryani_id, restaurant_id="rest_royal", name="Hyderabadi Dum Chicken Biryani", category="Main Course", price=340.0))
    rec_biryani = Recipe(id="rec_b1", menu_item_id=biryani_id, preparation_time_minutes=45, instructions="Slow cooked marinated chicken sealed under dum with aged basmati rice.")
    db.add(rec_biryani)
    db.add_all([
        RecipeIngredient(id="ri_8", recipe_id="rec_b1", ingredient_name="Aged Basmati Rice", quantity_required=0.25, unit="kg"),
        RecipeIngredient(id="ri_9", recipe_id="rec_b1", ingredient_name="Fresh Farm Chicken", quantity_required=0.30, unit="kg"),
        RecipeIngredient(id="ri_10", recipe_id="rec_b1", ingredient_name="Pure Ghee & Spices", quantity_required=0.05, unit="kg")
    ])

    # =========================================================================
    # 4. Inventory Batches & SCENARIO A: B2B Cheese Surplus & Shortage
    # =========================================================================
    # Bella Italia has 12 kg Mozzarella expiring in 48 hours (Lot: LOT-BI-MOZ-EXP48)
    surplus_batch_id = "batch_bi_moz_surplus"
    db.add(IngredientBatch(
        id=surplus_batch_id,
        restaurant_id="rest_bella",
        ingredient_name="Mozzarella Cheese",
        category="DAIRY",
        current_quantity=12.0, # 12 kg Surplus
        unit="kg",
        lot_number="LOT-BI-MOZ-EXP48",
        unit_cost=420.0,
        received_date=today - timedelta(days=5),
        expiry_date=today + timedelta(days=2), # Expiring in 48 hours!
        storage_condition="REFRIGERATED",
        reorder_level=5.0
    ))

    # Bella Italia secondary batches
    db.add_all([
        IngredientBatch(
            id="batch_bi_moz_fresh",
            restaurant_id="rest_bella",
            ingredient_name="Mozzarella Cheese",
            category="DAIRY",
            current_quantity=15.0,
            unit="kg",
            lot_number="LOT-BI-MOZ-FRESH",
            unit_cost=420.0,
            received_date=today - timedelta(days=1),
            expiry_date=today + timedelta(days=14),
            storage_condition="REFRIGERATED",
            reorder_level=5.0
        ),
        IngredientBatch(
            id="batch_bi_flour",
            restaurant_id="rest_bella",
            ingredient_name="Pizza Flour",
            category="GRAIN",
            current_quantity=30.0,
            unit="kg",
            lot_number="LOT-BI-FLOUR-01",
            unit_cost=65.0,
            received_date=today - timedelta(days=2),
            expiry_date=today + timedelta(days=45),
            storage_condition="DRY",
            reorder_level=10.0
        ),
        IngredientBatch(
            id="batch_bi_sauce",
            restaurant_id="rest_bella",
            ingredient_name="Tomato Sauce",
            category="CONDIMENT",
            current_quantity=20.0,
            unit="kg",
            lot_number="LOT-BI-SAUCE-01",
            unit_cost=110.0,
            received_date=today - timedelta(days=3),
            expiry_date=today + timedelta(days=25),
            storage_condition="REFRIGERATED",
            reorder_level=8.0
        )
    ])

    # Publish Scenario A B2B Surplus Listing for Bella Italia's 12 kg Mozzarella
    b2b_listing_id = "listing_b2b_cheese_a"
    db.add(SurplusListing(
        id=b2b_listing_id,
        restaurant_id="rest_bella",
        listing_type="RAW_INGREDIENT",
        item_ref_id=surplus_batch_id,
        item_name="Mozzarella Cheese (Chilled Block)",
        quantity=12.0,
        unit="kg",
        target_audience="RESTAURANT",
        status="VERIFIED_AVAILABLE",
        available_until=now + timedelta(days=2),
        safety_verified=True
    ))

    # The Daily Grind Bistro: Has ONLY 1.5 kg cheese (Shortage of 8.5 kg vs 10 kg reorder level!)
    db.add_all([
        IngredientBatch(
            id="batch_dg_cheese_low",
            restaurant_id="rest_daily",
            ingredient_name="Mozzarella Cheese",
            category="DAIRY",
            current_quantity=1.5, # CRITICAL SHORTAGE
            unit="kg",
            lot_number="LOT-DG-CH-OLD",
            unit_cost=420.0,
            received_date=today - timedelta(days=4),
            expiry_date=today + timedelta(days=3),
            storage_condition="REFRIGERATED",
            reorder_level=10.0 # Reorder level is 10 kg, deficit is 8.5 kg!
        ),
        IngredientBatch(
            id="batch_dg_bread",
            restaurant_id="rest_daily",
            ingredient_name="Sourdough Bread",
            category="GRAIN",
            current_quantity=18.0,
            unit="kg",
            lot_number="LOT-DG-BREAD-01",
            unit_cost=90.0,
            received_date=today,
            expiry_date=today + timedelta(days=4),
            storage_condition="DRY",
            reorder_level=5.0
        )
    ])

    # =========================================================================
    # 5. SCENARIO B: Green Garden Cafe 25 Prepared Salad Bowls & NGO Rescue
    # =========================================================================
    portion_salad_id = "portion_gg_salad_25"
    db.add(PreparedFoodPortion(
        id=portion_salad_id,
        restaurant_id="rest_green",
        dish_name="Quinoa & Avocado Salad Bowls",
        portion_count=25, # 25 Portions
        prepared_at=now - timedelta(hours=2),
        safe_use_deadline=now + timedelta(hours=6),
        holding_temperature_celsius=4.2, # Compliant chilled temp (FSSAI <= 5°C)
        allergen_flags="Contains Walnuts",
        prepared_by_staff_id=db.query(User).filter(User.email == "manager@greengarden.com").first().id
    ))

    # Surplus listing verified by staff member
    ngo_listing_id = "listing_ngo_salad_b"
    listing_b = SurplusListing(
        id=ngo_listing_id,
        restaurant_id="rest_green",
        listing_type="PREPARED_PORTION",
        item_ref_id=portion_salad_id,
        item_name="Quinoa & Avocado Salad Bowls",
        quantity=25.0,
        unit="portions",
        target_audience="NGO",
        status="VERIFIED_AVAILABLE",
        available_until=now + timedelta(hours=6),
        safety_verified=True
    )
    db.add(listing_b)

    # Statutory Food Safety Record attested by Chef Ramesh
    db.add(FoodSafetyRecord(
        id="fsr_gg_salad_01",
        listing_id=ngo_listing_id,
        verified_by_staff_id=db.query(User).filter(User.email == "manager@greengarden.com").first().id,
        inspector_name="Chef Ramesh (Certified Food Safety Supervisor)",
        recorded_temperature_celsius=4.2,
        packaging_intact=True,
        sensory_passed=True,
        allergens_declared=True,
        fssai_compliant=True,
        is_certified_safe=True
    ))

    # =========================================================================
    # 6. SCENARIO C: Royal Biryani House FEFO Batches for POS Checkout
    # =========================================================================
    # Basmati Rice: Batch 1 (15 kg, exp 7 days) and Batch 2 (30 kg, exp 45 days)
    # Chicken: Batch 1 (12 kg, exp 2 days) and Batch 2 (20 kg, exp 6 days)
    db.add_all([
        IngredientBatch(
            id="batch_rb_rice_1",
            restaurant_id="rest_royal",
            ingredient_name="Aged Basmati Rice",
            category="GRAIN",
            current_quantity=15.0,
            unit="kg",
            lot_number="LOT-RB-RICE-EARLY",
            unit_cost=95.0,
            received_date=today - timedelta(days=10),
            expiry_date=today + timedelta(days=7),
            storage_condition="DRY",
            reorder_level=10.0
        ),
        IngredientBatch(
            id="batch_rb_rice_2",
            restaurant_id="rest_royal",
            ingredient_name="Aged Basmati Rice",
            category="GRAIN",
            current_quantity=30.0,
            unit="kg",
            lot_number="LOT-RB-RICE-LATER",
            unit_cost=95.0,
            received_date=today - timedelta(days=2),
            expiry_date=today + timedelta(days=45),
            storage_condition="DRY",
            reorder_level=10.0
        ),
        IngredientBatch(
            id="batch_rb_chk_1",
            restaurant_id="rest_royal",
            ingredient_name="Fresh Farm Chicken",
            category="MEAT",
            current_quantity=12.0,
            unit="kg",
            lot_number="LOT-RB-CHK-EARLY",
            unit_cost=240.0,
            received_date=today - timedelta(days=1),
            expiry_date=today + timedelta(days=2), # Expiring in 2 days (FEFO Priority!)
            storage_condition="REFRIGERATED",
            reorder_level=8.0
        ),
        IngredientBatch(
            id="batch_rb_chk_2",
            restaurant_id="rest_royal",
            ingredient_name="Fresh Farm Chicken",
            category="MEAT",
            current_quantity=20.0,
            unit="kg",
            lot_number="LOT-RB-CHK-LATER",
            unit_cost=240.0,
            received_date=today,
            expiry_date=today + timedelta(days=6),
            storage_condition="REFRIGERATED",
            reorder_level=8.0
        ),
        IngredientBatch(
            id="batch_rb_ghee",
            restaurant_id="rest_royal",
            ingredient_name="Pure Ghee & Spices",
            category="CONDIMENT",
            current_quantity=10.0,
            unit="kg",
            lot_number="LOT-RB-GHEE-01",
            unit_cost=550.0,
            received_date=today - timedelta(days=5),
            expiry_date=today + timedelta(days=60),
            storage_condition="DRY",
            reorder_level=3.0
        )
    ])

    # Initial Audit Logs for Seed Traceability
    for r_data in restaurants_data:
        db.add(StockAuditLog(
            id=str(uuid.uuid4()),
            restaurant_id=r_data["id"],
            item_type="INITIAL_AUDIT",
            item_id=r_data["id"],
            item_name="Master Inventory Onboarding",
            action="INITIAL_SEED",
            quantity_delta=100.0,
            remaining_quantity=100.0,
            unit="units",
            reason=f"System initialization for {r_data['name']} (FSSAI: {r_data['fssai']})"
        ))

    db.commit()
    db.close()
    print("[Seed] Successfully seeded 5 Restaurants, 2 NGOs, 1 Admin, Menus, Recipes, Batches, and Scenarios A, B, C!")

if __name__ == "__main__":
    import sys
    if "--test-db" in sys.argv:
        import os
        os.environ["ENVIRONMENT"] = "testing"
    seed_database()
