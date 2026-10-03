from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from datetime import datetime

from app.models.product import Product
from app.models.stock_transaction import StockTransaction
from app.schemas.stock import StockAddRequest, StockAddResponse


class StockService:
    @staticmethod
    def add_stock(db: Session, data: StockAddRequest) -> StockAddResponse:
        """
        Add stock to an existing product:
        1. Validate positive quantity.
        2. Verify product exists.
        3. Increment quantity.
        4. Create STOCK_IN transaction log.
        5. Commit safely.
        """
        if data.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Added quantity must be greater than zero."
            )

        shop_id = data.shop_id or 1
        product = db.query(Product).filter(Product.id == data.product_id, Product.shop_id == shop_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {data.product_id} not found."
            )

        previous_stock = product.quantity
        product.quantity += data.quantity

        tx = StockTransaction(
            shop_id=shop_id,
            product_id=product.id,
            transaction_type="STOCK_IN",
            quantity=data.quantity,
            note=data.note or "Supplier delivery"
        )
        db.add(tx)
        db.commit()
        db.refresh(product)

        return StockAddResponse(
            product_id=product.id,
            product_name=product.name,
            previous_stock=previous_stock,
            added_quantity=data.quantity,
            new_stock=product.quantity,
            note=data.note,
            updated_at=product.updated_at or datetime.now()
        )

    @staticmethod
    def get_low_stock(db: Session, shop_id: int = 1) -> List[Product]:
        """Return products where quantity <= low_stock_threshold."""
        return (
            db.query(Product)
            .filter(Product.shop_id == shop_id, Product.quantity <= Product.low_stock_threshold)
            .order_by(Product.quantity.asc())
            .all()
        )

    @staticmethod
    def get_low_stock_count(db: Session, shop_id: int = 1) -> int:
        """Return total count of products that have reached or dropped below their low-stock threshold."""
        return (
            db.query(Product)
            .filter(Product.shop_id == shop_id, Product.quantity <= Product.low_stock_threshold)
            .count()
        )
