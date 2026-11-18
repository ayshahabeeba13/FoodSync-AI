-- =========================================================================
-- FoodSync AI - Production PostgreSQL Database Schema (v1.0)
-- Target: PostgreSQL 15+ with PostGIS support
-- Compliant with FSSAI Surplus Food Regulations (2019)
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enumerated Types
CREATE TYPE user_role AS ENUM (
    'RESTAURANT_MANAGER',
    'RESTAURANT_STAFF',
    'NGO_COORDINATOR',
    'PLATFORM_ADMIN'
);

CREATE TYPE ngo_verification_status AS ENUM (
    'PENDING',
    'VERIFIED',
    'REJECTED'
);

CREATE TYPE listing_type AS ENUM (
    'RAW_INGREDIENT',
    'PREPARED_PORTION'
);

CREATE TYPE listing_status AS ENUM (
    'DRAFT',
    'VERIFIED_AVAILABLE',
    'RESERVED',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE transfer_status AS ENUM (
    'REQUESTED',
    'APPROVED',
    'IN_TRANSIT',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE donation_status AS ENUM (
    'CLAIMED',
    'READY_FOR_PICKUP',
    'COMPLETED',
    'CANCELLED'
);

-- 1. Restaurants (Food Business Operators)
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cuisine VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    fssai_license_number VARCHAR(14) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. NGOs (Surplus Food Distribution Agencies)
CREATE TABLE ngos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    reg_number VARCHAR(100) NOT NULL UNIQUE,
    contact_person VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    verification_status ngo_verification_status DEFAULT 'PENDING',
    fssai_surplus_permit VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
    ngo_id UUID REFERENCES ngos(id) ON DELETE SET NULL,
    fssai_supervisor_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Raw Ingredient Batches (FEFO Tracked)
CREATE TABLE ingredient_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    current_quantity NUMERIC(12, 3) NOT NULL CHECK (current_quantity >= 0),
    unit VARCHAR(20) NOT NULL,
    lot_number VARCHAR(100) NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    storage_condition VARCHAR(100) NOT NULL,
    unit_cost NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_batches_fefo ON ingredient_batches(restaurant_id, ingredient_name, expiry_date ASC);

-- 5. Prepared Food Portions
CREATE TABLE prepared_food_portions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    dish_name VARCHAR(255) NOT NULL,
    portion_count INTEGER NOT NULL CHECK (portion_count >= 0),
    prepared_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consume_by TIMESTAMP WITH TIME ZONE NOT NULL,
    holding_method VARCHAR(100) NOT NULL,
    holding_temp_celsius NUMERIC(5, 2) NOT NULL,
    allergen_flags JSONB DEFAULT '[]'::jsonb,
    prepared_by_staff_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Surplus Listings
CREATE TABLE surplus_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    listing_type listing_type NOT NULL,
    item_ref_id UUID NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    target_audience VARCHAR(50) NOT NULL,
    status listing_status DEFAULT 'DRAFT',
    available_until TIMESTAMP WITH TIME ZONE NOT NULL,
    safety_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Mandatory Human Food Safety Inspections
CREATE TABLE food_safety_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL UNIQUE REFERENCES surplus_listings(id) ON DELETE CASCADE,
    inspector_staff_id UUID NOT NULL REFERENCES users(id),
    inspector_name VARCHAR(255) NOT NULL,
    storage_temp_celsius NUMERIC(5, 2) NOT NULL,
    packaging_intact BOOLEAN NOT NULL,
    sensory_passed BOOLEAN NOT NULL,
    allergens_declared BOOLEAN NOT NULL,
    is_certified_safe BOOLEAN NOT NULL CHECK (is_certified_safe = TRUE),
    fssai_checklist_version VARCHAR(50) NOT NULL,
    notes TEXT,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. B2B Transfers (Restaurant to Restaurant)
CREATE TABLE b2b_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    to_restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    listing_id UUID NOT NULL REFERENCES surplus_listings(id),
    batch_id UUID NOT NULL REFERENCES ingredient_batches(id),
    quantity NUMERIC(12, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    status transfer_status DEFAULT 'REQUESTED',
    handover_code VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 9. NGO Donations (Restaurant to Verified Charity)
CREATE TABLE ngo_donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    ngo_id UUID NOT NULL REFERENCES ngos(id),
    listing_id UUID NOT NULL REFERENCES surplus_listings(id),
    quantity NUMERIC(12, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    status donation_status DEFAULT 'CLAIMED',
    hashed_otp VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    otp_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    otp_attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 10. Recipes and Recipe Ingredients (Bill of Materials)
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);

CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(255) NOT NULL,
    quantity_required NUMERIC(12, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL
);

-- 11. Immutable Stock Audit Logs
CREATE TABLE stock_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    item_id UUID NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    quantity_delta NUMERIC(12, 3) NOT NULL,
    remaining_quantity NUMERIC(12, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    reference_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
