import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Float,
    Integer,
    Numeric,
    DateTime,
    Date,
    Text,
    ForeignKey,
    CheckConstraint,
    Index
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

# =========================================================================
# 1. Users, Restaurants & NGOs
# =========================================================================

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False) # 'RESTAURANT', 'NGO', 'ADMIN'
    full_name = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=True)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="SET NULL", use_alter=True), nullable=True)
    ngo_id = Column(String(36), ForeignKey("ngos.id", ondelete="SET NULL", use_alter=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    restaurant = relationship("Restaurant", back_populates="staff_members", foreign_keys=[restaurant_id])
    ngo = relationship("NGO", back_populates="volunteers", foreign_keys=[ngo_id])

class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False, index=True)
    cuisine_type = Column(String(100), nullable=False)
    address = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    fssai_license_number = Column(String(14), unique=True, nullable=False) # 14-digit statutory FSSAI
    contact_phone = Column(String(30), nullable=False)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    staff_members = relationship("User", back_populates="restaurant", foreign_keys="User.restaurant_id")
    menus = relationship("Menu", back_populates="restaurant", cascade="all, delete-orphan")
    ingredient_batches = relationship("IngredientBatch", back_populates="restaurant", cascade="all, delete-orphan")
    bills = relationship("Bill", back_populates="restaurant", cascade="all, delete-orphan")

class NGO(Base):
    __tablename__ = "ngos"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    coordinator_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False, index=True)
    registration_number = Column(String(100), unique=True, nullable=False)
    address = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    service_radius_km = Column(Float, default=15.0)
    verification_status = Column(String(20), default="VERIFIED") # 'PENDING', 'VERIFIED', 'REJECTED'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    volunteers = relationship("User", back_populates="ngo", foreign_keys="User.ngo_id")

# =========================================================================
# 2. Menus, Recipes & Bill of Materials
# =========================================================================

class Menu(Base):
    __tablename__ = "menus"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    price = Column(Float, nullable=False)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    restaurant = relationship("Restaurant", back_populates="menus")
    recipe = relationship("Recipe", back_populates="menu_item", uselist=False, cascade="all, delete-orphan")

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    menu_item_id = Column(String(36), ForeignKey("menus.id", ondelete="CASCADE"), nullable=False, unique=True)
    preparation_time_minutes = Column(Integer, default=30)
    instructions = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    menu_item = relationship("Menu", back_populates="recipe")
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")

class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recipe_id = Column(String(36), ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    ingredient_name = Column(String(255), nullable=False)
    quantity_required = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False) # 'g', 'kg', 'ml', 'litres', 'units'

    recipe = relationship("Recipe", back_populates="ingredients")

# =========================================================================
# 3. Inventory: Raw Ingredient Batches (FEFO) & Prepared Portions
# =========================================================================

class IngredientBatch(Base):
    __tablename__ = "ingredient_batches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    ingredient_name = Column(String(255), nullable=False, index=True)
    category = Column(String(50), nullable=False)
    current_quantity = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    lot_number = Column(String(100), nullable=False)
    unit_cost = Column(Float, nullable=False)
    received_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False, index=True)
    storage_condition = Column(String(100), nullable=False)
    reorder_level = Column(Float, default=5.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    restaurant = relationship("Restaurant", back_populates="ingredient_batches")

class PreparedFoodPortion(Base):
    __tablename__ = "prepared_food_portions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    dish_name = Column(String(255), nullable=False)
    portion_count = Column(Integer, nullable=False)
    prepared_at = Column(DateTime, nullable=False)
    safe_use_deadline = Column(DateTime, nullable=False)
    holding_temperature_celsius = Column(Float, nullable=False)
    allergen_flags = Column(Text, nullable=True)
    prepared_by_staff_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

# =========================================================================
# 4. Smart POS Billing & Sales
# =========================================================================

class Bill(Base):
    __tablename__ = "bills"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    bill_number = Column(String(50), unique=True, nullable=False, index=True)
    subtotal = Column(Float, nullable=False)
    tax_amount = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    payment_method = Column(String(50), nullable=False)
    status = Column(String(20), default="COMPLETED") # 'COMPLETED', 'CANCELLED'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    restaurant = relationship("Restaurant", back_populates="bills")
    items = relationship("BillItem", back_populates="bill", cascade="all, delete-orphan")

class BillItem(Base):
    __tablename__ = "bill_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    bill_id = Column(String(36), ForeignKey("bills.id", ondelete="CASCADE"), nullable=False)
    menu_item_id = Column(String(36), ForeignKey("menus.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)

    bill = relationship("Bill", back_populates="items")
    menu_item = relationship("Menu")

# =========================================================================
# 5. Food Sharing, Safety Records & NGO Donations
# =========================================================================

class SurplusListing(Base):
    __tablename__ = "surplus_listings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    listing_type = Column(String(30), nullable=False) # 'RAW_INGREDIENT', 'PREPARED_PORTION'
    item_ref_id = Column(String(36), nullable=False)
    item_name = Column(String(255), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    target_audience = Column(String(50), nullable=False) # 'RESTAURANT', 'NGO', 'ANY'
    status = Column(String(30), default="DRAFT") # 'DRAFT', 'VERIFIED_AVAILABLE', 'RESERVED', 'COMPLETED', 'CANCELLED'
    available_until = Column(DateTime, nullable=False)
    safety_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    safety_record = relationship("FoodSafetyRecord", back_populates="listing", uselist=False, cascade="all, delete-orphan")

class FoodSafetyRecord(Base):
    __tablename__ = "food_safety_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    listing_id = Column(String(36), ForeignKey("surplus_listings.id", ondelete="CASCADE"), nullable=False, unique=True)
    verified_by_staff_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    inspector_name = Column(String(255), nullable=False)
    recorded_temperature_celsius = Column(Float, nullable=False)
    packaging_intact = Column(Boolean, nullable=False)
    sensory_passed = Column(Boolean, nullable=False)
    allergens_declared = Column(Boolean, nullable=False)
    fssai_compliant = Column(Boolean, nullable=False)
    is_certified_safe = Column(Boolean, nullable=False, default=True) # Must be human-attested True
    certified_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    listing = relationship("SurplusListing", back_populates="safety_record")

class FoodTransfer(Base):
    __tablename__ = "food_transfers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    listing_id = Column(String(36), ForeignKey("surplus_listings.id"), nullable=False)
    from_restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    to_restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    transfer_price = Column(Float, default=0.0)
    status = Column(String(30), default="AVAILABLE") # 'AVAILABLE', 'REQUESTED', 'ACCEPTED', 'REJECTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'
    handover_code = Column(String(50), nullable=True)
    requested_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

class Donation(Base):
    __tablename__ = "donations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    listing_id = Column(String(36), ForeignKey("surplus_listings.id"), nullable=False)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id"), nullable=False)
    ngo_id = Column(String(36), ForeignKey("ngos.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    status = Column(String(30), default="AVAILABLE")
    hashed_otp = Column(String(255), nullable=False)
    salt = Column(String(255), nullable=False)
    otp_expires_at = Column(DateTime, nullable=False)
    otp_attempt_count = Column(Integer, default=0)
    claimed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    collected_at = Column(DateTime, nullable=True)

class StockAuditLog(Base):
    __tablename__ = "stock_audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    item_type = Column(String(50), nullable=False)
    item_id = Column(String(36), nullable=False)
    item_name = Column(String(255), nullable=False)
    action = Column(String(50), nullable=False) # 'STOCK_IN', 'POS_DEDUCT', 'B2B_OUT', 'B2B_IN', 'DONATED', 'WASTE'
    quantity_delta = Column(Float, nullable=False)
    remaining_quantity = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    reason = Column(Text, nullable=False)
    reference_id = Column(String(36), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
