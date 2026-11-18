import os
import pytest
from datetime import datetime, timezone, date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["ENVIRONMENT"] = "testing"
os.environ["DEMO_MODE"] = "True"

from backend.app.core.database import Base
from backend.app.models.models import (
    User,
    Restaurant,
    NGO,
    IngredientBatch,
    PreparedFoodPortion,
    SurplusListing,
    FoodSafetyRecord,
    FoodTransfer,
    Donation,
    StockAuditLog
)
from backend.app.services.b2b_service import B2BService, haversine_distance_km
from backend.app.services.safety_service import FoodSafetyService
from backend.app.services.donation_service import DonationService
from backend.app.schemas.sharing import (
    SurplusListingCreate,
    TransferRequestCreate,
    FoodSafetyChecklistCreate,
    DonationClaimRequest
)

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

def test_p4_1_haversine_distance():
    # Bella Italia (12.9716, 77.5946) to The Daily Grind Bistro (12.9780, 77.6150)
    dist = haversine_distance_km(12.9716, 77.5946, 12.9780, 77.6150)
    assert 2.0 <= dist <= 3.0 # Approx 2.4 km apart

def test_p4_2_b2b_surplus_transfer_with_lot_traceability(db):
    # Setup two restaurants
    r1 = Restaurant(
        id="rest_bella_p4",
        name="Bella Italia Trattoria",
        cuisine_type="Italian",
        address="Indiranagar, Bangalore",
        latitude=12.9716,
        longitude=77.5946,
        fssai_license_number="11223344556677",
        contact_phone="+91 98765 43210"
    )
    r2 = Restaurant(
        id="rest_daily_p4",
        name="The Daily Grind Bistro",
        cuisine_type="Cafe & Bistro",
        address="MG Road, Bangalore",
        latitude=12.9780,
        longitude=77.6150,
        fssai_license_number="33445566778899",
        contact_phone="+91 98765 11223"
    )
    db.add_all([r1, r2])
    db.commit()

    # Bella Italia has 12 kg Mozzarella surplus (Lot: LOT-MOZ-TRACE-01, Expiry: in 2 days)
    expiry = date.today() + timedelta(days=2)
    batch = IngredientBatch(
        id="batch_moz_surplus",
        restaurant_id="rest_bella_p4",
        ingredient_name="Mozzarella Cheese",
        category="DAIRY",
        current_quantity=12.0,
        unit="kg",
        lot_number="LOT-MOZ-TRACE-01",
        unit_cost=420.0,
        received_date=date.today() - timedelta(days=3),
        expiry_date=expiry,
        storage_condition="REFRIGERATED"
    )
    db.add(batch)
    db.commit()

    # Create B2B surplus listing
    listing_dto = SurplusListingCreate(
        listing_type="RAW_INGREDIENT",
        item_ref_id=batch.id,
        item_name="Mozzarella Cheese (Surplus Batch)",
        quantity=12.0,
        unit="kg",
        target_audience="RESTAURANT",
        available_until=datetime.now(timezone.utc) + timedelta(days=2)
    )
    listing = B2BService.create_listing(db, "rest_bella_p4", listing_dto)
    assert listing.status == "VERIFIED_AVAILABLE"

    # Daily Grind Bistro discovers listing within 15 km
    nearby = B2BService.get_available_b2b_listings(db, "rest_daily_p4", radius_km=15.0)
    assert len(nearby) >= 1
    found = [n for n in nearby if n.item_name == "Mozzarella Cheese (Surplus Batch)"][0]
    assert found.distance_km is not None
    assert found.distance_km < 5.0

    # Daily Grind requests transfer
    req_dto = TransferRequestCreate(listing_id=listing.id, quantity=12.0)
    transfer = B2BService.request_transfer(db, "rest_daily_p4", req_dto)
    assert transfer.status == "REQUESTED"
    assert transfer.handover_code is not None

    # Bella Italia accepts transfer
    accepted = B2BService.accept_transfer(db, "rest_bella_p4", transfer.id)
    assert accepted.status == "ACCEPTED"

    # Complete transfer via handover code
    completed = B2BService.complete_transfer(db, transfer.id, transfer.handover_code)
    assert completed.status == "COMPLETED"

    # Traceability Verification:
    # 1. Source batch deducted to 0
    db.refresh(batch)
    assert batch.current_quantity == 0.0

    # 2. Destination restaurant has received new batch with identical LOT and Expiry
    dest_batch = db.query(IngredientBatch).filter(
        IngredientBatch.restaurant_id == "rest_daily_p4",
        IngredientBatch.ingredient_name == "Mozzarella Cheese"
    ).first()
    assert dest_batch is not None
    assert dest_batch.current_quantity == 12.0
    assert dest_batch.lot_number == "LOT-MOZ-TRACE-01"
    assert dest_batch.expiry_date == expiry

def test_p5_1_mandatory_human_food_safety_gate(db):
    from fastapi import HTTPException

    # Staff user at Green Garden Cafe
    staff = User(
        id="staff_green_p5",
        email="chef@greengarden.com",
        password_hash="hash",
        role="RESTAURANT",
        full_name="Chef Ramesh",
        restaurant_id="rest_green_p5"
    )
    rest = Restaurant(
        id="rest_green_p5",
        name="Green Garden Cafe",
        cuisine_type="Health & Salad",
        address="Lavelle Road, Bangalore",
        latitude=12.9730,
        longitude=77.5990,
        fssai_license_number="44556677889900",
        contact_phone="+91 98765 22334"
    )
    portion = PreparedFoodPortion(
        id="portion_quinoa_p5",
        restaurant_id="rest_green_p5",
        dish_name="Quinoa & Avocado Salad Bowls",
        portion_count=25,
        prepared_at=datetime.now(timezone.utc) - timedelta(hours=2),
        safe_use_deadline=datetime.now(timezone.utc) + timedelta(hours=6),
        holding_temperature_celsius=4.0, # Chilled safe
        allergen_flags="Tree Nuts",
        prepared_by_staff_id=staff.id
    )
    db.add_all([staff, rest, portion])
    db.commit()

    # Create prepared portion listing -> Defaults to DRAFT / safety_verified=False
    listing_dto = SurplusListingCreate(
        listing_type="PREPARED_PORTION",
        item_ref_id=portion.id,
        item_name="Quinoa & Avocado Salad Bowls",
        quantity=25.0,
        unit="portions",
        target_audience="NGO",
        available_until=datetime.now(timezone.utc) + timedelta(hours=6)
    )
    draft_listing = DonationService.create_prepared_listing(db, "rest_green_p5", listing_dto)
    assert draft_listing.status == "DRAFT"
    assert draft_listing.safety_verified is False

    # Attempt inspection with Danger Zone temperature (25°C - room temp for chilled food)
    danger_temp_checklist = FoodSafetyChecklistCreate(
        listing_id=draft_listing.id,
        inspector_name="Chef Ramesh",
        recorded_temperature_celsius=25.0, # Violation: chilled food > 5°C
        packaging_intact=True,
        sensory_passed=True,
        allergens_declared=True,
        fssai_compliant=True
    )
    with pytest.raises(HTTPException) as excinfo:
        FoodSafetyService.verify_and_certify_listing(db, staff, danger_temp_checklist)
    assert excinfo.value.status_code == 400
    assert "Temperature Danger Zone Violation" in excinfo.value.detail

    # Attempt inspection with unsealed packaging
    damaged_pkg_checklist = FoodSafetyChecklistCreate(
        listing_id=draft_listing.id,
        inspector_name="Chef Ramesh",
        recorded_temperature_celsius=4.0,
        packaging_intact=False, # Violation
        sensory_passed=True,
        allergens_declared=True,
        fssai_compliant=True
    )
    with pytest.raises(HTTPException) as excinfo:
        FoodSafetyService.verify_and_certify_listing(db, staff, damaged_pkg_checklist)
    assert excinfo.value.status_code == 400
    assert "Packaging must be completely intact" in excinfo.value.detail

    # Valid human staff inspection meeting FSSAI guidelines
    valid_checklist = FoodSafetyChecklistCreate(
        listing_id=draft_listing.id,
        inspector_name="Chef Ramesh (Certified Food Handler)",
        recorded_temperature_celsius=4.0, # <= 5°C compliant
        packaging_intact=True,
        sensory_passed=True,
        allergens_declared=True,
        fssai_compliant=True
    )
    cert = FoodSafetyService.verify_and_certify_listing(db, staff, valid_checklist)
    assert cert.is_certified_safe is True
    assert cert.inspector_name == "Chef Ramesh (Certified Food Handler)"

    # Verify listing is now unlocked to VERIFIED_AVAILABLE
    updated_listing = db.query(SurplusListing).filter(SurplusListing.id == draft_listing.id).first()
    assert updated_listing.status == "VERIFIED_AVAILABLE"
    assert updated_listing.safety_verified is True

def test_p5_2_ngo_claim_and_secure_otp_handover(db):
    from fastapi import HTTPException

    ngo_user = User(
        id="ngo_vol_p5",
        email="volunteer@cityhope.org",
        password_hash="hash",
        role="NGO",
        full_name="Volunteer Vikram",
        ngo_id="ngo_cityhope_p5"
    )
    ngo = NGO(
        id="ngo_cityhope_p5",
        name="City Hope Food Rescue",
        registration_number="NGO-KA-2024-CITY",
        address="MG Road, Bangalore",
        latitude=12.9750,
        longitude=77.6010,
        service_radius_km=15.0
    )
    db.add_all([ngo_user, ngo])
    db.commit()

    # Find verified listing
    listing = db.query(SurplusListing).filter(
        SurplusListing.item_name == "Quinoa & Avocado Salad Bowls",
        SurplusListing.status == "VERIFIED_AVAILABLE"
    ).first()
    assert listing is not None

    # NGO claims donation
    claim_resp = DonationService.claim_donation(db, ngo_user, listing.id)
    assert claim_resp.status == "REQUESTED"
    plain_otp = claim_resp.plain_otp
    assert plain_otp is not None
    assert len(plain_otp) == 6
    assert plain_otp.isdigit()

    # Listing is now RESERVED
    db.refresh(listing)
    assert listing.status == "RESERVED"

    # Test invalid OTP at restaurant collection
    with pytest.raises(HTTPException) as excinfo:
        DonationService.verify_collection_otp(db, "rest_green_p5", claim_resp.id, "000000")
    assert excinfo.value.status_code == 400
    assert "Invalid OTP code" in excinfo.value.detail

    # Test valid OTP collection
    success_resp = DonationService.verify_collection_otp(db, "rest_green_p5", claim_resp.id, plain_otp)
    assert success_resp.status == "COMPLETED"
    assert success_resp.collected_at is not None

    # Verify portion count was deducted from Green Garden Cafe
    portion = db.query(PreparedFoodPortion).filter(PreparedFoodPortion.dish_name == "Quinoa & Avocado Salad Bowls").first()
    assert portion.portion_count == 0 # 25 - 25 = 0

    # ESG Stats Verification
    stats = DonationService.get_donation_stats(db)
    assert stats["total_meals_rescued"] >= 25
    assert stats["total_food_weight_kg"] >= 11.0 # 25 * 0.45
    assert stats["co2_emissions_avoided_kg"] >= 27.0
