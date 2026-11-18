import uuid
from datetime import date, datetime, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.models.models import Menu, Recipe, RecipeIngredient, IngredientBatch, Bill, BillItem, StockAuditLog
from backend.app.schemas.billing import CheckoutRequest, BillResponse, BillItemDetail

class BillingService:
    @staticmethod
    def checkout(db: Session, restaurant_id: str, data: CheckoutRequest) -> BillResponse:
        """
        Executes an atomic POS checkout:
        1. Explodes recipe BOMs for every dish in the cart.
        2. Aggregates total raw ingredient demand.
        3. Locks ingredient batches (FEFO order) and verifies stock sufficiency.
        4. SAFEGUARD 4: Rolls back completely if ANY ingredient has insufficient stock.
        5. Depletes stock sequentially across earliest expiring batches.
        6. Logs immutable audit entries and creates customer bill.
        """
        if not data.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cart cannot be empty."
            )

        # 1. Validate menu items and calculate total ingredient requirements
        item_quantities: Dict[str, int] = {}
        for item in data.items:
            item_quantities[item.menu_item_id] = item_quantities.get(item.menu_item_id, 0) + item.quantity

        menu_items_map: Dict[str, Menu] = {}
        for menu_id in item_quantities.keys():
            menu_item = db.query(Menu).filter(
                Menu.id == menu_id,
                Menu.restaurant_id == restaurant_id
            ).first()
            if not menu_item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Dish ID '{menu_id}' not found in restaurant menu."
                )
            menu_items_map[menu_id] = menu_item

        # 2. Explode BOMs
        required_ingredients: Dict[str, Dict[str, Any]] = {}
        for menu_id, qty in item_quantities.items():
            menu_item = menu_items_map[menu_id]
            if menu_item.recipe and menu_item.recipe.ingredients:
                for ing in menu_item.recipe.ingredients:
                    name = ing.ingredient_name
                    total_needed = ing.quantity_required * qty
                    if name not in required_ingredients:
                        required_ingredients[name] = {
                            "needed": 0.0,
                            "unit": ing.unit
                        }
                    required_ingredients[name]["needed"] += total_needed

        # 3. Verify stock availability across FEFO batches (earliest expiry first)
        # and lock rows where supported
        batches_to_deplete = {}
        today = date.today()

        for ing_name, req in required_ingredients.items():
            needed_qty = req["needed"]
            unit = req["unit"]

            # Query available batches ordered by expiry_date ASC (FEFO)
            query = db.query(IngredientBatch).filter(
                IngredientBatch.restaurant_id == restaurant_id,
                IngredientBatch.ingredient_name == ing_name,
                IngredientBatch.current_quantity > 0,
                IngredientBatch.expiry_date >= today
            ).order_by(IngredientBatch.expiry_date.asc(), IngredientBatch.created_at.asc())

            # Apply row-level locking if supported by dialect
            try:
                batches = query.with_for_update().all()
            except Exception:
                batches = query.all()

            total_available = sum(b.current_quantity for b in batches)

            # SAFEGUARD 4: STRICT ATOMIC ROLLBACK ON SHORTAGE
            if total_available < needed_qty:
                db.rollback() # Abort entire transaction
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Insufficient stock for ingredient '{ing_name}'. "
                        f"Required: {round(needed_qty, 3)} {unit}, Available: {round(total_available, 3)} {unit}. "
                        "Checkout transaction has been rolled back completely."
                    )
                )
            batches_to_deplete[ing_name] = (needed_qty, batches)

        # 4. Sequential FEFO stock deduction
        bill_id = str(uuid.uuid4())
        bill_number = f"BILL-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
        deductions_summary = []

        for ing_name, (needed_qty, batches) in batches_to_deplete.items():
            remaining_to_deduct = needed_qty
            for batch in batches:
                if remaining_to_deduct <= 0:
                    break
                deduct_amount = min(batch.current_quantity, remaining_to_deduct)
                batch.current_quantity = round(batch.current_quantity - deduct_amount, 4)
                remaining_to_deduct = round(remaining_to_deduct - deduct_amount, 4)

                # Immutable audit log entry
                audit = StockAuditLog(
                    id=str(uuid.uuid4()),
                    restaurant_id=restaurant_id,
                    item_type="RAW_INGREDIENT",
                    item_id=batch.id,
                    item_name=batch.ingredient_name,
                    action="POS_DEDUCT",
                    quantity_delta=-deduct_amount,
                    remaining_quantity=batch.current_quantity,
                    unit=batch.unit,
                    reason=f"POS Sale: Bill {bill_number} (Batch Lot: {batch.lot_number})"
                )
                db.add(audit)

                deductions_summary.append({
                    "ingredient_name": batch.ingredient_name,
                    "deducted": deduct_amount,
                    "unit": batch.unit,
                    "lot_number": batch.lot_number,
                    "remaining_in_batch": batch.current_quantity
                })

        # 5. Financial calculations (5% standard restaurant GST)
        subtotal = 0.0
        bill_items = []
        for menu_id, qty in item_quantities.items():
            dish = menu_items_map[menu_id]
            line_total = dish.price * qty
            subtotal += line_total
            bill_item = BillItem(
                id=str(uuid.uuid4()),
                bill_id=bill_id,
                menu_item_id=menu_id,
                quantity=qty,
                unit_price=dish.price,
                total_price=line_total
            )
            db.add(bill_item)
            bill_items.append(bill_item)

        tax_amount = round(subtotal * 0.05, 2)
        total_amount = round(subtotal + tax_amount, 2)

        new_bill = Bill(
            id=bill_id,
            restaurant_id=restaurant_id,
            bill_number=bill_number,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total_amount,
            payment_method=data.payment_method.upper().strip(),
            status="COMPLETED"
        )
        db.add(new_bill)
        db.commit()
        db.refresh(new_bill)

        # Build response
        items_detail = []
        for bi in bill_items:
            dish = menu_items_map.get(bi.menu_item_id)
            items_detail.append(BillItemDetail(
                id=bi.id,
                menu_item_id=bi.menu_item_id,
                dish_name=dish.name if dish else "Dish",
                quantity=bi.quantity,
                unit_price=bi.unit_price,
                total_price=bi.total_price
            ))

        resp = BillResponse.model_validate(new_bill)
        resp.items = items_detail
        resp.deductions_summary = deductions_summary
        return resp

    @staticmethod
    def get_bills(db: Session, restaurant_id: str, limit: int = 50) -> List[BillResponse]:
        bills = db.query(Bill).filter(
            Bill.restaurant_id == restaurant_id
        ).order_by(Bill.created_at.desc()).limit(limit).all()

        result = []
        for b in bills:
            resp = BillResponse.model_validate(b)
            items_detail = []
            for item in b.items:
                dish_name = item.menu_item.name if item.menu_item else "Dish"
                items_detail.append(BillItemDetail(
                    id=item.id,
                    menu_item_id=item.menu_item_id,
                    dish_name=dish_name,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    total_price=item.total_price
                ))
            resp.items = items_detail
            result.append(resp)
        return result
