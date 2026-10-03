from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class SaleCreate(BaseModel):
    product_id: int = Field(..., gt=0, description="ID of product being sold")
    quantity: int = Field(..., gt=0, description="Quantity sold (must be at least 1)")
    shop_id: Optional[int] = Field(1, gt=0, description="Shop ID (defaults to 1)")


class SaleResponse(BaseModel):
    id: int
    shop_id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    total_amount: float
    remaining_stock: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SaleHistoryItem(BaseModel):
    sale_id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    total_amount: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TodaySalesResponse(BaseModel):
    total_revenue: float
    sales_count: int
    items_sold: int
