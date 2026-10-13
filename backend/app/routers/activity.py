"""Real activity feed backed by stock transaction audit records."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
from app.models.stock_transaction import StockTransaction

router = APIRouter(prefix="/api/activity", tags=["Activity"])


@router.get("")
def get_activity(
    shop_id: int = Query(1, gt=0),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Return actual SALE/STOCK_IN/ADJUSTMENT events for a single shop."""
    rows = (
        db.query(StockTransaction, Product.name)
        .outerjoin(
            Product,
            (StockTransaction.product_id == Product.id)
            & (StockTransaction.shop_id == Product.shop_id),
        )
        .filter(StockTransaction.shop_id == shop_id)
        .order_by(
            StockTransaction.created_at.desc(),
            StockTransaction.id.desc(),
        )
        .limit(limit)
        .all()
    )

    items = []
    for tx, product_name in rows:
        name = product_name or "Unknown product"
        qty = abs(tx.quantity)
        if tx.transaction_type == "SALE":
            title, subtitle = f"Sold {name}", f"{qty} unit(s) sold"
        elif tx.transaction_type == "STOCK_IN":
            title, subtitle = f"Restocked {name}", f"{qty} unit(s) added"
        else:
            title, subtitle = f"Stock adjustment: {name}", f"Change: {tx.quantity:+d}"

        items.append({
            "id": f"transaction_{tx.id}",
            "type": tx.transaction_type,
            "title": title,
            "subtitle": subtitle,
            "amount": f"{tx.quantity:+d}",
            "timestamp": tx.created_at.isoformat() if tx.created_at else None,
            "product_id": tx.product_id,
            "product_name": name,
            "quantity_change": tx.quantity,
            "note": tx.note,
        })

    return {"shop_id": shop_id, "count": len(items), "items": items}
