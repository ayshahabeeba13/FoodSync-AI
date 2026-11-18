-- =========================================================================
-- FoodSync AI - Production PostgreSQL Database Schema (PostgreSQL 15+)
-- Compliant with Food Safety and Standards (Recovery and Distribution of
-- Surplus Food) Regulations, 2019 (FSSAI)
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enumerated Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('RESTAURANT', 'NGO', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ngo_verification_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE listing_type AS ENUM ('RAW_INGREDIENT', 'PREPARED_PORTION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE listing_status AS ENUM ('DRAFT', 'VERIFIED_AVAILABLE', 'RESERVED', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transfer_status AS ENUM ('AVAILABLE', 'REQUESTED', 'ACCEPTED', 'REJECTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE donation_status AS ENUM ('AVAILABLE', 'REQUESTED', 'ACCEPTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('RESTAURANT', 'NGO', 'ADMIN')),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    restaurant_id VARCHAR(36),
    ngo_id VARCHAR(36),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Restaurants Table
CREATE TABLE IF NOT EXISTS restaurants (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    cuisine_type VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    fssai_license_number VARCHAR(14) NOT NULL UNIQUE,
    contact_phone VARCHAR(30) NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. NGOs Table
CREATE TABLE IF NOT EXISTS ngos (
    id VARCHAR(36) PRIMARY KEY,
    coordinator_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    service_radius_km DOUBLE PRECISION DEFAULT 15.0,
    verification_status VARCHAR(20) DEFAULT 'VERIFIED' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add Foreign Keys to Users
ALTER TABLE users 
    ADD CONSTRAINT fk_user_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_user_ngo FOREIGN KEY (ngo_id) REFERENCES ngos(id) ON DELETE SET NULL;

-- 4. Menus & Dishes
CREATE TABLE IF NOT EXISTS menus (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Recipes & Recipe Ingredients (BOM)
CREATE TABLE IF NOT EXISTS recipes (
    id VARCHAR(36) PRIMARY KEY,
    menu_item_id VARCHAR(36) NOT NULL UNIQUE REFERENCES menus(id) ON DELETE CASCADE,
    preparation_time_minutes INTEGER DEFAULT 30,
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id VARCHAR(36) PRIMARY KEY,
    recipe_id VARCHAR(36) NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(255) NOT NULL,
    quantity_required NUMERIC(10, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL
);

-- 6. Raw Ingredient Batches (FEFO Tracked)
CREATE TABLE IF NOT EXISTS ingredient_batches (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    current_quantity NUMERIC(12, 3) NOT NULL CHECK (current_quantity >= 0),
    unit VARCHAR(20) NOT NULL,
    lot_number VARCHAR(100) NOT NULL,
    unit_cost NUMERIC(10, 2) NOT NULL,
    received_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    storage_condition VARCHAR(100) NOT NULL,
    reorder_level NUMERIC(12, 3) DEFAULT 5.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_batches_fefo ON ingredient_batches(restaurant_id, ingredient_name, expiry_date ASC);

-- 7. Prepared Food Portions
CREATE TABLE IF NOT EXISTS prepared_food_portions (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    dish_name VARCHAR(255) NOT NULL,
    portion_count INTEGER NOT NULL CHECK (portion_count >= 0),
    prepared_at TIMESTAMP WITH TIME ZONE NOT NULL,
    safe_use_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    holding_temperature_celsius NUMERIC(5, 2) NOT NULL,
    allergen_flags TEXT,
    prepared_by_staff_id VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Bills & Bill Items (Smart POS)
CREATE TABLE IF NOT EXISTS bills (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    bill_number VARCHAR(50) NOT NULL UNIQUE,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax_amount NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bill_items (
    id VARCHAR(36) PRIMARY KEY,
    bill_id VARCHAR(36) NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    menu_item_id VARCHAR(36) NOT NULL REFERENCES menus(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL
);

-- 9. Surplus Listings
CREATE TABLE IF NOT EXISTS surplus_listings (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    listing_type VARCHAR(30) NOT NULL CHECK (listing_type IN ('RAW_INGREDIENT', 'PREPARED_PORTION')),
    item_ref_id VARCHAR(36) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    target_audience VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'VERIFIED_AVAILABLE', 'RESERVED', 'COMPLETED', 'CANCELLED')),
    available_until TIMESTAMP WITH TIME ZONE NOT NULL,
    safety_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Mandatory Human Food Safety Records (FSSAI)
CREATE TABLE IF NOT EXISTS food_safety_records (
    id VARCHAR(36) PRIMARY KEY,
    listing_id VARCHAR(36) NOT NULL UNIQUE REFERENCES surplus_listings(id) ON DELETE CASCADE,
    verified_by_staff_id VARCHAR(36) NOT NULL REFERENCES users(id),
    inspector_name VARCHAR(255) NOT NULL,
    recorded_temperature_celsius NUMERIC(5, 2) NOT NULL,
    packaging_intact BOOLEAN NOT NULL,
    sensory_passed BOOLEAN NOT NULL,
    allergens_declared BOOLEAN NOT NULL,
    fssai_compliant BOOLEAN NOT NULL,
    is_certified_safe BOOLEAN NOT NULL CHECK (is_certified_safe = TRUE),
    certified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Food Transfers (B2B Restaurant Sharing)
CREATE TABLE IF NOT EXISTS food_transfers (
    id VARCHAR(36) PRIMARY KEY,
    listing_id VARCHAR(36) NOT NULL REFERENCES surplus_listings(id),
    from_restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id),
    to_restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id),
    quantity NUMERIC(12, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    transfer_price NUMERIC(10, 2) DEFAULT 0.0,
    status VARCHAR(30) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'REQUESTED', 'ACCEPTED', 'REJECTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED')),
    handover_code VARCHAR(50),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 12. Donations (NGO Community Rescue)
CREATE TABLE IF NOT EXISTS donations (
    id VARCHAR(36) PRIMARY KEY,
    listing_id VARCHAR(36) NOT NULL REFERENCES surplus_listings(id),
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id),
    ngo_id VARCHAR(36) NOT NULL REFERENCES ngos(id),
    quantity NUMERIC(12, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    status VARCHAR(30) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'REQUESTED', 'ACCEPTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED')),
    hashed_otp VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    otp_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    otp_attempt_count INTEGER DEFAULT 0,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    collected_at TIMESTAMP WITH TIME ZONE
);

-- 13. Stock Audit Logs (Immutable Transaction Traceability)
CREATE TABLE IF NOT EXISTS stock_audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    restaurant_id VARCHAR(36) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    item_id VARCHAR(36) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    quantity_delta NUMERIC(12, 3) NOT NULL,
    remaining_quantity NUMERIC(12, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    reference_id VARCHAR(36),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
