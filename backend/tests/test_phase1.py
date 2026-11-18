import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["ENVIRONMENT"] = "testing"
os.environ["DEMO_MODE"] = "True"

from backend.app.core.config import settings
from backend.app.core.database import Base
from backend.app.models.models import User, Restaurant, NGO
from backend.app.schemas.auth import UserRegister, UserLogin, SwitchDemoRoleRequest
from backend.app.services.auth_service import AuthService
from backend.app.api.v1.health import health_check
from backend.app.core.security import generate_collection_otp, verify_collection_otp

# Isolated in-memory engine for unit and integration testing
test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
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

def test_1_health_check(db):
    result = health_check(db)
    assert result["status"] == "healthy"
    assert result["system"] == "FoodSync AI"
    assert result["database"] == "connected"
    assert result["demo_mode"] is True

def test_2_restaurant_manager_registration_with_fssai(db):
    dto = UserRegister(
        email="manager@bellaitalia.com",
        password="Password@123",
        full_name="Marco Rossi",
        role="RESTAURANT",
        phone="+91 98765 43210",
        restaurant_name="Bella Italia Trattoria",
        cuisine_type="Italian & Wood-Fired Pizza",
        fssai_license_number="11223344556677",
        restaurant_address="Indiranagar, Bangalore"
    )
    result = AuthService.register_user(db, dto)
    assert result.user.email == "manager@bellaitalia.com"
    assert result.user.role == "RESTAURANT"
    assert result.user.restaurant.name == "Bella Italia Trattoria"
    assert result.user.restaurant.fssai_license_number == "11223344556677"
    assert len(result.access_token) > 20

def test_3_duplicate_email_rejected(db):
    dto = UserRegister(
        email="manager@bellaitalia.com",
        password="Password@999",
        full_name="Duplicate User",
        role="RESTAURANT",
        restaurant_name="Another Bistro",
        fssai_license_number="99887766554433"
    )
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as excinfo:
        AuthService.register_user(db, dto)
    assert excinfo.value.status_code == 409
    assert "already exists" in excinfo.value.detail

def test_4_invalid_fssai_license_rejected(db):
    dto = UserRegister(
        email="chef@test.com",
        password="Password@123",
        full_name="Chef Tester",
        role="RESTAURANT",
        restaurant_name="Invalid License Eatery",
        fssai_license_number="12345" # Invalid: Must be 14 digits
    )
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as excinfo:
        AuthService.register_user(db, dto)
    assert excinfo.value.status_code == 400
    assert "14 digits" in excinfo.value.detail

def test_5_ngo_coordinator_registration(db):
    dto = UserRegister(
        email="coordinator@cityhope.org",
        password="Password@123",
        full_name="Anjali Rao",
        role="NGO",
        phone="+91 98765 12345",
        ngo_name="City Hope Food Rescue",
        registration_number="NGO-KA-2024-8849",
        ngo_address="MG Road, Bangalore"
    )
    result = AuthService.register_user(db, dto)
    assert result.user.email == "coordinator@cityhope.org"
    assert result.user.role == "NGO"
    assert result.user.ngo.name == "City Hope Food Rescue"
    assert result.user.ngo.registration_number == "NGO-KA-2024-8849"

def test_6_login_success_and_invalid_password(db):
    # Valid login
    login_dto = UserLogin(email="manager@bellaitalia.com", password="Password@123")
    result = AuthService.login_user(db, login_dto)
    assert result.user.full_name == "Marco Rossi"
    assert len(result.access_token) > 20

    # Invalid password
    from fastapi import HTTPException
    bad_login = UserLogin(email="manager@bellaitalia.com", password="WrongPassword999")
    with pytest.raises(HTTPException) as excinfo:
        AuthService.login_user(db, bad_login)
    assert excinfo.value.status_code == 401

def test_7_safeguard_6_demo_role_switcher(db):
    ngo_user = db.query(User).filter(User.email == "coordinator@cityhope.org").first()
    assert ngo_user is not None

    # When DEMO_MODE is True
    settings.DEMO_MODE = True
    settings.ENVIRONMENT = "development"
    res = AuthService.switch_demo_role(db, ngo_user.id)
    assert res.user.email == "coordinator@cityhope.org"
    assert res.user.role == "NGO"

    # When DEMO_MODE is False (Production protection)
    settings.DEMO_MODE = False
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as excinfo:
        AuthService.switch_demo_role(db, ngo_user.id)
    assert excinfo.value.status_code == 403
    settings.DEMO_MODE = True # restore

def test_8_safeguard_2_secure_collection_otp():
    plain_otp, hashed_otp, salt, expires_at = generate_collection_otp(expiry_minutes=15)
    
    assert len(plain_otp) == 6
    assert plain_otp.isdigit()
    assert hashed_otp != plain_otp

    # Valid check
    is_valid, err, remaining = verify_collection_otp(plain_otp, hashed_otp, salt, expires_at, attempt_count=0)
    assert is_valid is True
    assert err == "SUCCESS"

    # Attempt tracking
    is_valid, err, rem1 = verify_collection_otp("000000", hashed_otp, salt, expires_at, attempt_count=0)
    assert is_valid is False
    assert rem1 == 2

    is_valid, err, rem2 = verify_collection_otp("111111", hashed_otp, salt, expires_at, attempt_count=1)
    assert is_valid is False
    assert rem2 == 1

    is_valid, err, rem3 = verify_collection_otp("222222", hashed_otp, salt, expires_at, attempt_count=2)
    assert is_valid is False
    assert err == "MAX_ATTEMPTS_EXCEEDED"
    assert rem3 == 0

# =========================================================================
# Phase 1.1 Correction Tests: Safeguards, Edge Cases & Verification
# =========================================================================

def test_9_fssai_strict_format_validation(db):
    from fastapi import HTTPException

    # 1. Negative tests: Various non-compliant FSSAI formats
    invalid_cases = [
        ("12345", "Too short"),
        ("123456789012345", "15 digits (too long)"),
        ("1122334455667A", "Contains alphabetic character"),
        ("1122 3344 5566", "Contains whitespace"),
        ("112233-4455667", "Contains special character"),
        ("ABCDEFGHIJKLMN", "All alphabetic")
    ]
    for bad_fssai, reason in invalid_cases:
        dto = UserRegister(
            email=f"chef_{hash(bad_fssai)}@eatery.com",
            password="Password@123",
            full_name="Chef Validator",
            role="RESTAURANT",
            restaurant_name=f"Eatery {bad_fssai}",
            fssai_license_number=bad_fssai
        )
        with pytest.raises(HTTPException) as excinfo:
            AuthService.register_user(db, dto)
        assert excinfo.value.status_code == 400, f"Expected 400 for {reason}: {bad_fssai}"
        assert "14 numeric digits" in excinfo.value.detail

    # 2. Positive test: Exactly 14 numeric digits is valid
    valid_dto = UserRegister(
        email="chef_valid_fssai@kyotoramen.com",
        password="Password@123",
        full_name="Kenji Sato",
        role="RESTAURANT",
        restaurant_name="Kyoto Ramen & Wok",
        fssai_license_number="22334455667788",
        cuisine_type="Japanese & Pan-Asian",
        restaurant_address="Koramangala, Bangalore"
    )
    result = AuthService.register_user(db, valid_dto)
    assert result.user.restaurant.fssai_license_number == "22334455667788"

def test_10_duplicate_fssai_and_duplicate_ngo_registration(db):
    from fastapi import HTTPException

    # 1. Duplicate FSSAI registration conflict
    dup_fssai_dto = UserRegister(
        email="second_manager@newbistro.com",
        password="Password@123",
        full_name="Second Manager",
        role="RESTAURANT",
        restaurant_name="Duplicate FSSAI Bistro",
        fssai_license_number="11223344556677" # Already used by Bella Italia in test_2
    )
    with pytest.raises(HTTPException) as excinfo:
        AuthService.register_user(db, dup_fssai_dto)
    assert excinfo.value.status_code == 409
    assert "FSSAI License Number is already registered" in excinfo.value.detail

    # 2. Duplicate NGO registration number conflict
    dup_ngo_dto = UserRegister(
        email="second_coordinator@kitchen.org",
        password="Password@123",
        full_name="Second Coordinator",
        role="NGO",
        ngo_name="Metropolitan Community Kitchen",
        registration_number="NGO-KA-2024-8849" # Already used by City Hope in test_5
    )
    with pytest.raises(HTTPException) as excinfo:
        AuthService.register_user(db, dup_ngo_dto)
    assert excinfo.value.status_code == 409
    assert "registration number is already registered" in excinfo.value.detail

def test_11_jwt_expiration_and_tampering(db):
    from datetime import timedelta
    from fastapi import HTTPException
    from backend.app.core.security import create_access_token, decode_access_token

    # 1. Expired JWT token
    expired_token = create_access_token(
        {"sub": "test-user-id", "email": "test@foodsync.ai", "role": "RESTAURANT"},
        expires_delta=timedelta(seconds=-10)
    )
    assert decode_access_token(expired_token) is None
    with pytest.raises(HTTPException) as excinfo:
        AuthService.get_user_from_token(db, expired_token)
    assert excinfo.value.status_code == 401

    # 2. Tampered JWT signature
    valid_token = create_access_token(
        {"sub": "test-user-id", "email": "test@foodsync.ai", "role": "RESTAURANT"},
        expires_delta=timedelta(minutes=30)
    )
    # Tamper the last 6 characters of the signature
    tampered_token = valid_token[:-6] + "xxxxxx"
    assert decode_access_token(tampered_token) is None
    with pytest.raises(HTTPException) as excinfo:
        AuthService.get_user_from_token(db, tampered_token)
    assert excinfo.value.status_code == 401

def test_12_role_authorization():
    from fastapi import HTTPException
    from backend.app.api.deps import require_role

    restaurant_user = User(id="u1", email="rest@test.com", role="RESTAURANT", full_name="Rest Manager")
    ngo_user = User(id="u2", email="ngo@test.com", role="NGO", full_name="NGO Volunteer")
    admin_user = User(id="u3", email="admin@foodsync.ai", role="ADMIN", full_name="System Admin")

    restaurant_checker = require_role("RESTAURANT")
    ngo_checker = require_role("NGO")

    # Positive authorized cases
    assert restaurant_checker(current_user=restaurant_user).id == "u1"
    assert ngo_checker(current_user=ngo_user).id == "u2"

    # Admin override permitted for all roles
    assert restaurant_checker(current_user=admin_user).id == "u3"
    assert ngo_checker(current_user=admin_user).id == "u3"

    # Unauthorized role rejected with HTTP 403 Forbidden
    with pytest.raises(HTTPException) as excinfo:
        restaurant_checker(current_user=ngo_user)
    assert excinfo.value.status_code == 403
    assert "Requires 'RESTAURANT' authorization" in excinfo.value.detail

    with pytest.raises(HTTPException) as excinfo:
        ngo_checker(current_user=restaurant_user)
    assert excinfo.value.status_code == 403
    assert "Requires 'NGO' authorization" in excinfo.value.detail

def test_13_otp_expiration():
    # Generate OTP with negative expiry (expired 5 minutes ago)
    plain_otp, hashed_otp, salt, expires_at = generate_collection_otp(expiry_minutes=-5)
    
    is_valid, err, remaining = verify_collection_otp(
        plain_otp, hashed_otp, salt, expires_at, attempt_count=0
    )
    assert is_valid is False
    assert err == "OTP_EXPIRED"
    assert remaining == 0

def test_14_ai_chronological_split_and_metric_calculations():
    import numpy as np
    from ai_engine.data_prep import chronological_train_test_split, evaluate_predictions

    # 1. Verify chronological split integrity (no future lookahead leakage)
    X = np.arange(100).reshape(-1, 1)
    y = np.arange(100)

    X_train, X_test, y_train, y_test = chronological_train_test_split(X, y, train_ratio=0.8)
    assert len(X_train) == 80
    assert len(X_test) == 20
    # Strictly chronological: train ends at 79, test starts at 80
    assert X_train[-1][0] == 79
    assert X_test[0][0] == 80
    assert y_train[-1] == 79
    assert y_test[0] == 80

    # 2. Verify metric calculations (MAE, RMSE, R2)
    y_true = np.array([10.0, 20.0, 30.0, 40.0])
    y_pred = np.array([12.0, 18.0, 32.0, 38.0]) # errors are +2, -2, +2, -2 (all abs diff = 2)

    metrics = evaluate_predictions(y_true, y_pred)
    assert metrics["mae"] == 2.0
    assert metrics["rmse"] == 2.0
    assert metrics["r2_score"] > 0.9

def test_15_ai_demo_baseline_prediction_output():
    from ai_engine.predictor import DemandPredictor

    predictor = DemandPredictor(model_type="DEMO_BASELINE")
    
    menu = [
        {"id": "m1", "name": "Margherita Pizza", "popularity_ratio": 0.35},
        {"id": "m2", "name": "Pasta Carbonara", "popularity_ratio": 0.20}
    ]
    boms = {
        "m1": [
            {"ingredient_name": "Flour", "quantity_required": 0.2, "unit": "kg"},
            {"ingredient_name": "Mozzarella", "quantity_required": 0.15, "unit": "kg"}
        ],
        "m2": [
            {"ingredient_name": "Pasta", "quantity_required": 0.15, "unit": "kg"}
        ]
    }

    result = predictor.predict_next_day(
        restaurant_id="rest_123",
        target_day_of_week=5,
        target_month=11,
        is_weekend=True,
        is_holiday=False,
        recent_7d_covers=[100, 110, 95, 105, 120, 130, 115],
        menu_items=menu,
        recipe_boms=boms
    )

    # Verify provenance labeling
    assert result["model_provenance"]["model_type"] == "DEMO_BASELINE"
    assert result["model_provenance"]["is_synthetic_baseline"] is True
    assert "mae" in result["model_provenance"]["validation_metrics"]

    # Verify 3-tier cascade output structure
    assert "tier_1_footfall" in result
    assert result["tier_1_footfall"]["predicted_customer_count"] > 0
    assert len(result["tier_1_footfall"]["confidence_interval"]) == 2

    assert "tier_2_menu_demand" in result
    assert len(result["tier_2_menu_demand"]) == 2

    assert "tier_3_raw_ingredient_prep" in result
    assert len(result["tier_3_raw_ingredient_prep"]) >= 2
    ing_names = [i["ingredient_name"] for i in result["tier_3_raw_ingredient_prep"]]
    assert "Flour" in ing_names
    assert "Mozzarella" in ing_names

def test_16_database_config_production_guardrail():
    from backend.app.core.database import get_engine, verify_database_connection
    import os

    # 1. When in production, SQLite must be strictly forbidden
    os.environ["ENVIRONMENT"] = "production"
    os.environ["DATABASE_URL"] = "sqlite:///./data/should_fail.db"
    with pytest.raises(RuntimeError) as excinfo:
        get_engine()
    assert "strictly forbidden in 'production' environment" in str(excinfo.value)

    # 2. When PostgreSQL host is unreachable in production, must fail safely without silent fallback
    os.environ["DATABASE_URL"] = "postgresql+psycopg2://postgres:postgres@127.0.0.1:5433/unreachable_db"
    fake_engine = create_engine("postgresql+psycopg2://postgres:postgres@127.0.0.1:5433/unreachable_db", pool_pre_ping=False)
    with pytest.raises(RuntimeError) as excinfo:
        verify_database_connection(fake_engine)
    assert "PostgreSQL 15+ is unreachable" in str(excinfo.value)
    assert "Application fails safely" in str(excinfo.value)

    # Restore testing environment for subsequent test runs
    os.environ["ENVIRONMENT"] = "testing"
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
