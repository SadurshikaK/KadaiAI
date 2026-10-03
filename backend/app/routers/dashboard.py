from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse, summary="Get home dashboard metrics")
def get_dashboard(
    shop_id: int = Query(1, description="Shop ID"),
    db: Session = Depends(get_db)
):
    """
    Consolidated endpoint for Member 1's Home screen:
    - today_sales: Rs. total sales today
    - sales_count: number of sales today
    - low_stock_count: count of products requiring attention
    - total_products: total products in inventory
    """
    return DashboardService.get_dashboard(db, shop_id=shop_id)
