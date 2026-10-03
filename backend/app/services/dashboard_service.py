from sqlalchemy.orm import Session
from app.models.product import Product
from app.services.sale_service import SaleService
from app.services.stock_service import StockService
from app.schemas.dashboard import DashboardResponse


class DashboardService:
    @staticmethod
    def get_dashboard(db: Session, shop_id: int = 1) -> DashboardResponse:
        """
        Aggregate key dashboard metrics for the mobile frontend:
        - today_sales (Rs. total revenue)
        - sales_count (number of sales transactions)
        - low_stock_count (products needing attention)
        - total_products (total distinct catalog items)
        """
        today_sales_data = SaleService.get_today_sales(db, shop_id)
        low_stock_count = StockService.get_low_stock_count(db, shop_id)
        total_products = db.query(Product).filter(Product.shop_id == shop_id).count()

        return DashboardResponse(
            today_sales=today_sales_data.total_revenue,
            sales_count=today_sales_data.sales_count,
            low_stock_count=low_stock_count,
            total_products=total_products
        )
