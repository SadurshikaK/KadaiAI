from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.schemas.product import ProductLowStockResponse


class StockAddRequest(BaseModel):
    product_id: int = Field(..., gt=0, description="Product ID to add stock for")
    quantity: int = Field(..., gt=0, description="Positive quantity to add")
    note: Optional[str] = Field("Supplier delivery", description="Optional note for stock addition")
    shop_id: Optional[int] = Field(1, gt=0, description="Shop ID (defaults to 1)")


class StockAddResponse(BaseModel):
    product_id: int
    product_name: str
    previous_stock: int
    added_quantity: int
    new_stock: int
    note: Optional[str] = None
    updated_at: datetime


class LowStockSummaryResponse(BaseModel):
    count: int
    products: List[ProductLowStockResponse]
