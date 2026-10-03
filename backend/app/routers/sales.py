from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.sale import SaleCreate, SaleResponse, SaleHistoryItem, TodaySalesResponse
from app.services.sale_service import SaleService

router = APIRouter(prefix="/api/sales", tags=["Sales"])


@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED, summary="Record a sale")
def record_sale(
    data: SaleCreate,
    db: Session = Depends(get_db)
):
    """
    Record a customer sale:
    1. Checks product availability and prevents negative stock.
    2. Calculates total amount based on unit price.
    3. Decrements product quantity atomically.
    4. Logs transaction in stock_transactions.
    5. Returns sale record with remaining stock.
    """
    return SaleService.record_sale(db, data=data)


@router.get("/today", response_model=TodaySalesResponse, summary="Get today's sales summary")
def get_today_sales(
    shop_id: int = Query(1, description="Shop ID"),
    db: Session = Depends(get_db)
):
    """
    Get aggregated sales statistics for today (Sri Lanka time UTC+5:30):
    - total_revenue: sum of total sales today
    - sales_count: number of completed transactions
    - items_sold: total units sold
    """
    return SaleService.get_today_sales(db, shop_id=shop_id)


@router.get("/history", response_model=List[SaleHistoryItem], summary="Get sales history")
def get_sales_history(
    limit: int = Query(50, ge=1, le=500, description="Max number of records to return"),
    shop_id: int = Query(1, description="Shop ID"),
    db: Session = Depends(get_db)
):
    """
    Retrieve recent sales history with item details and timestamps.
    """
    return SaleService.get_history(db, limit=limit, shop_id=shop_id)
