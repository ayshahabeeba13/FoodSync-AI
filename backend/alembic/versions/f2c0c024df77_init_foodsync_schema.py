"""init_foodsync_schema

Revision ID: f2c0c024df77
Revises: 
Create Date: 2026-11-18 20:21:51.170557

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2c0c024df77'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Create all 15 core FoodSync AI tables, constraints and indexes."""
    # 1. users table (initial creation without circular foreign keys)
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=30), nullable=True),
        sa.Column('restaurant_id', sa.String(length=36), nullable=True),
        sa.Column('ngo_id', sa.String(length=36), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. restaurants table
    op.create_table(
        'restaurants',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('owner_id', sa.String(length=36), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('cuisine_type', sa.String(length=100), nullable=False),
        sa.Column('address', sa.Text(), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('fssai_license_number', sa.String(length=14), nullable=False),
        sa.Column('contact_phone', sa.String(length=30), nullable=False),
        sa.Column('is_verified', sa.Boolean(), server_default=sa.text('true'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('fssai_license_number')
    )
    op.create_index(op.f('ix_restaurants_name'), 'restaurants', ['name'], unique=False)

    # 3. ngos table
    op.create_table(
        'ngos',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('coordinator_id', sa.String(length=36), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('registration_number', sa.String(length=100), nullable=False),
        sa.Column('address', sa.Text(), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('service_radius_km', sa.Float(), server_default=sa.text('15.0'), nullable=True),
        sa.Column('verification_status', sa.String(length=20), server_default=sa.text("'VERIFIED'"), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['coordinator_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('registration_number')
    )
    op.create_index(op.f('ix_ngos_name'), 'ngos', ['name'], unique=False)

    # Add deferred Foreign Keys from users to restaurants and ngos
    with op.batch_alter_table('users') as batch_op:
        batch_op.create_foreign_key('fk_users_restaurant_id', 'restaurants', ['restaurant_id'], ['id'], ondelete='SET NULL')
        batch_op.create_foreign_key('fk_users_ngo_id', 'ngos', ['ngo_id'], ['id'], ondelete='SET NULL')

    # 4. menus table
    op.create_table(
        'menus',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('restaurant_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('is_available', sa.Boolean(), server_default=sa.text('true'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 5. recipes table
    op.create_table(
        'recipes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('menu_item_id', sa.String(length=36), nullable=False),
        sa.Column('preparation_time_minutes', sa.Integer(), server_default=sa.text('30'), nullable=True),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['menu_item_id'], ['menus.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('menu_item_id')
    )

    # 6. recipe_ingredients table
    op.create_table(
        'recipe_ingredients',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('recipe_id', sa.String(length=36), nullable=False),
        sa.Column('ingredient_name', sa.String(length=255), nullable=False),
        sa.Column('quantity_required', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(length=20), nullable=False),
        sa.ForeignKeyConstraint(['recipe_id'], ['recipes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 7. ingredient_batches table (FEFO tracking)
    op.create_table(
        'ingredient_batches',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('restaurant_id', sa.String(length=36), nullable=False),
        sa.Column('ingredient_name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('current_quantity', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(length=20), nullable=False),
        sa.Column('lot_number', sa.String(length=100), nullable=False),
        sa.Column('unit_cost', sa.Float(), nullable=False),
        sa.Column('received_date', sa.Date(), nullable=False),
        sa.Column('expiry_date', sa.Date(), nullable=False),
        sa.Column('storage_condition', sa.String(length=100), nullable=False),
        sa.Column('reorder_level', sa.Float(), server_default=sa.text('5.0'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_batches_fefo', 'ingredient_batches', ['restaurant_id', 'ingredient_name', 'expiry_date'], unique=False)
    op.create_index(op.f('ix_ingredient_batches_ingredient_name'), 'ingredient_batches', ['ingredient_name'], unique=False)
    op.create_index(op.f('ix_ingredient_batches_expiry_date'), 'ingredient_batches', ['expiry_date'], unique=False)

    # 8. prepared_food_portions table
    op.create_table(
        'prepared_food_portions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('restaurant_id', sa.String(length=36), nullable=False),
        sa.Column('dish_name', sa.String(length=255), nullable=False),
        sa.Column('portion_count', sa.Integer(), nullable=False),
        sa.Column('prepared_at', sa.DateTime(), nullable=False),
        sa.Column('safe_use_deadline', sa.DateTime(), nullable=False),
        sa.Column('holding_temperature_celsius', sa.Float(), nullable=False),
        sa.Column('allergen_flags', sa.Text(), nullable=True),
        sa.Column('prepared_by_staff_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['prepared_by_staff_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 9. bills table (Smart POS)
    op.create_table(
        'bills',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('restaurant_id', sa.String(length=36), nullable=False),
        sa.Column('bill_number', sa.String(length=50), nullable=False),
        sa.Column('subtotal', sa.Float(), nullable=False),
        sa.Column('tax_amount', sa.Float(), nullable=False),
        sa.Column('total_amount', sa.Float(), nullable=False),
        sa.Column('payment_method', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), server_default=sa.text("'COMPLETED'"), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('bill_number')
    )
    op.create_index(op.f('ix_bills_bill_number'), 'bills', ['bill_number'], unique=True)

    # 10. bill_items table
    op.create_table(
        'bill_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('bill_id', sa.String(length=36), nullable=False),
        sa.Column('menu_item_id', sa.String(length=36), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price', sa.Float(), nullable=False),
        sa.Column('total_price', sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(['bill_id'], ['bills.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['menu_item_id'], ['menus.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 11. surplus_listings table
    op.create_table(
        'surplus_listings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('restaurant_id', sa.String(length=36), nullable=False),
        sa.Column('listing_type', sa.String(length=30), nullable=False),
        sa.Column('item_ref_id', sa.String(length=36), nullable=False),
        sa.Column('item_name', sa.String(length=255), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(length=20), nullable=False),
        sa.Column('target_audience', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=30), server_default=sa.text("'DRAFT'"), nullable=False),
        sa.Column('available_until', sa.DateTime(), nullable=False),
        sa.Column('safety_verified', sa.Boolean(), server_default=sa.text('false'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 12. food_safety_records table (Mandatory Human Staff Verification Gate)
    op.create_table(
        'food_safety_records',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('listing_id', sa.String(length=36), nullable=False),
        sa.Column('verified_by_staff_id', sa.String(length=36), nullable=False),
        sa.Column('inspector_name', sa.String(length=255), nullable=False),
        sa.Column('recorded_temperature_celsius', sa.Float(), nullable=False),
        sa.Column('packaging_intact', sa.Boolean(), nullable=False),
        sa.Column('sensory_passed', sa.Boolean(), nullable=False),
        sa.Column('allergens_declared', sa.Boolean(), nullable=False),
        sa.Column('fssai_compliant', sa.Boolean(), nullable=False),
        sa.Column('is_certified_safe', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('certified_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['listing_id'], ['surplus_listings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['verified_by_staff_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('listing_id')
    )

    # 13. food_transfers table (B2B Restaurant-to-Restaurant Sharing)
    op.create_table(
        'food_transfers',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('listing_id', sa.String(length=36), nullable=False),
        sa.Column('from_restaurant_id', sa.String(length=36), nullable=False),
        sa.Column('to_restaurant_id', sa.String(length=36), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(length=20), nullable=False),
        sa.Column('transfer_price', sa.Float(), server_default=sa.text('0.0'), nullable=True),
        sa.Column('status', sa.String(length=30), server_default=sa.text("'AVAILABLE'"), nullable=False),
        sa.Column('handover_code', sa.String(length=50), nullable=True),
        sa.Column('requested_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['from_restaurant_id'], ['restaurants.id'], ),
        sa.ForeignKeyConstraint(['listing_id'], ['surplus_listings.id'], ),
        sa.ForeignKeyConstraint(['to_restaurant_id'], ['restaurants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 14. donations table (Verified NGO Food Rescue)
    op.create_table(
        'donations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('listing_id', sa.String(length=36), nullable=False),
        sa.Column('restaurant_id', sa.String(length=36), nullable=False),
        sa.Column('ngo_id', sa.String(length=36), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=30), server_default=sa.text("'AVAILABLE'"), nullable=False),
        sa.Column('hashed_otp', sa.String(length=255), nullable=False),
        sa.Column('salt', sa.String(length=255), nullable=False),
        sa.Column('otp_expires_at', sa.DateTime(), nullable=False),
        sa.Column('otp_attempt_count', sa.Integer(), server_default=sa.text('0'), nullable=True),
        sa.Column('claimed_at', sa.DateTime(), nullable=True),
        sa.Column('collected_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['listing_id'], ['surplus_listings.id'], ),
        sa.ForeignKeyConstraint(['ngo_id'], ['ngos.id'], ),
        sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 15. stock_audit_logs table (Immutable Transaction Traceability)
    op.create_table(
        'stock_audit_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('restaurant_id', sa.String(length=36), nullable=False),
        sa.Column('item_type', sa.String(length=50), nullable=False),
        sa.Column('item_id', sa.String(length=36), nullable=False),
        sa.Column('item_name', sa.String(length=255), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('quantity_delta', sa.Float(), nullable=False),
        sa.Column('remaining_quantity', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(length=20), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('reference_id', sa.String(length=36), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema - Drop all 15 tables in reverse topological order."""
    op.drop_table('stock_audit_logs')
    op.drop_table('donations')
    op.drop_table('food_transfers')
    op.drop_table('food_safety_records')
    op.drop_table('surplus_listings')
    op.drop_table('bill_items')
    op.drop_index(op.f('ix_bills_bill_number'), table_name='bills')
    op.drop_table('bills')
    op.drop_table('prepared_food_portions')
    op.drop_index(op.f('ix_ingredient_batches_expiry_date'), table_name='ingredient_batches')
    op.drop_index(op.f('ix_ingredient_batches_ingredient_name'), table_name='ingredient_batches')
    op.drop_index('idx_batches_fefo', table_name='ingredient_batches')
    op.drop_table('ingredient_batches')
    op.drop_table('recipe_ingredients')
    op.drop_table('recipes')
    op.drop_table('menus')
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_constraint('fk_users_ngo_id', type_='foreignkey')
        batch_op.drop_constraint('fk_users_restaurant_id', type_='foreignkey')
    op.drop_index(op.f('ix_ngos_name'), table_name='ngos')
    op.drop_table('ngos')
    op.drop_index(op.f('ix_restaurants_name'), table_name='restaurants')
    op.drop_table('restaurants')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
