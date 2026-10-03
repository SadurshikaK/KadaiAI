from pydantic import BaseModel


class DashboardResponse(BaseModel):
    today_sales: float
    sales_count: int
    low_stock_count: int
    total_products: int
