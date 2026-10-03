from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from typing import List, Dict, Any
from datetime import datetime, time
import pytz

from app.models.sale import Sale
from app.models.product import Product
from app.models.stock_transaction import StockTransaction
from app.schemas.sale import SaleCreate, SaleResponse, SaleHistoryItem, TodaySalesResponse
from app.config import settings


class SaleService:
    @staticmethod
    def record_sale(db: Session, data: SaleCreate) -> Dict[str, Any]:
        """
        Record a sale transaction:
        1. Validate product exists.
        2. Validate stock availability (prevent negative stock).
        3. Deduct stock.
        4. Create sale record.
        5. Create stock transaction (SALE).
        6. Commit transaction safely.
        """
        if data.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Sale quantity must be greater than zero."
            )

        shop_id = data.shop_id or 1
        
        # Use with_for_update if running against PostgreSQL for concurrency safety
        query = db.query(Product).filter(Product.id == data.product_id, Product.shop_id == shop_id)
        if not settings.DATABASE_URL.startswith("sqlite"):
            query = query.with_for_update()

        product = query.first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {data.product_id} not found."
            )

        # Check stock availability
        if product.quantity < data.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for '{product.name}'. Available: {product.quantity}, requested: {data.quantity}."
            )

        # Deduct stock safely
        product.quantity -= data.quantity
        if product.quantity < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stock deduction failed: negative inventory is not allowed."
            )

        unit_price = float(product.selling_price)
        total_amount = round(unit_price * data.quantity, 2)

        # Create sale record
        sale = Sale(
            shop_id=shop_id,
            product_id=product.id,
            quantity=data.quantity,
            unit_price=unit_price,
            total_amount=total_amount
        )
        db.add(sale)
        db.flush()  # Populates sale.id

        # Create stock transaction
        tx = StockTransaction(
            shop_id=shop_id,
            product_id=product.id,
            transaction_type="SALE",
            quantity=-data.quantity,
            note=f"Sold {data.quantity} unit(s) via Sale #{sale.id}"
        )
        db.add(tx)

        db.commit()
        db.refresh(sale)
        db.refresh(product)

        return {
            "id": sale.id,
            "shop_id": sale.shop_id,
            "product_id": product.id,
            "product_name": product.name,
            "quantity": sale.quantity,
            "unit_price": sale.unit_price,
            "total_amount": sale.total_amount,
            "remaining_stock": product.quantity,
            "created_at": sale.created_at or datetime.now()
        }

    @staticmethod
    def get_today_sales(db: Session, shop_id: int = 1) -> TodaySalesResponse:
        """
        Calculate today's sales summary using Sri Lanka time (Asia/Colombo / UTC+5:30).
        Returns total_revenue, sales_count, items_sold.
        """
        try:
            tz = pytz.timezone(settings.TIMEZONE)
        except Exception:
            tz = pytz.timezone("Asia/Colombo")

        now_in_tz = datetime.now(tz)
        today_start_local = datetime.combine(now_in_tz.date(), time.min)
        today_end_local = datetime.combine(now_in_tz.date(), time.max)
        
        # Localize start and end
        today_start = tz.localize(today_start_local)
        today_end = tz.localize(today_end_local)

        # Fetch sales for shop
        sales = db.query(Sale).filter(Sale.shop_id == shop_id).all()
        
        total_revenue = 0.0
        sales_count = 0
        items_sold = 0

        for sale in sales:
            if not sale.created_at:
                continue
            
            # Normalize created_at to compare in timezone
            sale_dt = sale.created_at
            if sale_dt.tzinfo is None:
                # If naive (e.g. SQLite storage in UTC or local), assume UTC then convert to target tz
                sale_dt = pytz.utc.localize(sale_dt).astimezone(tz)
            else:
                sale_dt = sale_dt.astimezone(tz)

            if today_start <= sale_dt <= today_end:
                total_revenue += float(sale.total_amount)
                sales_count += 1
                items_sold += sale.quantity

        return TodaySalesResponse(
            total_revenue=round(total_revenue, 2),
            sales_count=sales_count,
            items_sold=items_sold
        )

    @staticmethod
    def get_history(db: Session, limit: int = 50, shop_id: int = 1) -> List[SaleHistoryItem]:
        """Fetch recent sales with associated product details."""
        sales = (
            db.query(Sale, Product.name.label("product_name"))
            .join(Product, Sale.product_id == Product.id)
            .filter(Sale.shop_id == shop_id)
            .order_by(Sale.created_at.desc())
            .limit(limit)
            .all()
        )

        history = []
        for sale, product_name in sales:
            history.append(
                SaleHistoryItem(
                    sale_id=sale.id,
                    product_id=sale.product_id,
                    product_name=product_name,
                    quantity=sale.quantity,
                    unit_price=sale.unit_price,
                    total_amount=sale.total_amount,
                    created_at=sale.created_at or datetime.now()
                )
            )
        return history
