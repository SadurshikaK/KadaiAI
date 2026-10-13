"""Clearly synthetic, repeatable demo data for the competition (shop 1 only)."""
from datetime import datetime, time, timedelta

from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.sale import Sale
from app.models.stock_transaction import StockTransaction
from app.seed import SAMPLE_PRODUCTS, reset_demo_database

# Exactly 10 sales dates, from 9 days ago through today. The totals leave
# Milk Powder=4, Biscuits=6, Soap=2 and Rice=5, all below their thresholds.
DAILY_SALES = {
    "Milk Powder": [1, 2, 1, 2, 1, 2, 1, 2, 2, 2],
    "Biscuits": [3, 4, 3, 4, 3, 4, 3, 4, 3, 3],
    "Soap": [1, 0, 1, 1, 0, 1, 1, 0, 1, 0],
    "Rice": [2] * 10,
}


def seed_restock_demo(db: Session, shop_id: int = 1) -> dict:
    """Replace the demo shop's data with deterministic synthetic sale records.

    This is destructive for the *demo shop*. Only call from a guarded route.
    """
    reset_demo_database(db, shop_id=shop_id)
    today = datetime.now().date()
    quantities = {}

    try:
        for item in SAMPLE_PRODUCTS:
            product = db.query(Product).filter(
                Product.shop_id == shop_id,
                Product.name == item["name"],
            ).one()
            daily = DAILY_SALES[item["name"]]
            assert len(daily) == 10
            assert sum(daily) <= item["quantity"]

            for idx, sold in enumerate(daily):
                if sold <= 0:
                    continue
                # Store explicit clock times so the timeline is predictable.
                day = today - timedelta(days=9 - idx)
                timestamp = datetime.combine(day, time(hour=10, minute=30))
                sale = Sale(
                    shop_id=shop_id,
                    product_id=product.id,
                    quantity=sold,
                    unit_price=float(product.selling_price),
                    total_amount=round(sold * float(product.selling_price), 2),
                    created_at=timestamp,
                )
                db.add(sale)
                db.add(StockTransaction(
                    shop_id=shop_id,
                    product_id=product.id,
                    transaction_type="SALE",
                    quantity=-sold,
                    note="SYNTHETIC RESTOCK DEMO - NOT REAL SALES",
                    created_at=timestamp,
                ))

            product.quantity = item["quantity"] - sum(daily)
            quantities[product.name] = product.quantity

        db.commit()
        return {
            "status": "success",
            "shop_id": shop_id,
            "synthetic_data": True,
            "days": 10,
            "remaining_stock": quantities,
            "message": "Synthetic competition demo data created; real customer history was not used.",
        }
    except Exception:
        db.rollback()
        raise
