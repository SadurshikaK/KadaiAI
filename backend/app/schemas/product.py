from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Product name")
    category: str = Field(..., min_length=1, max_length=100, description="Product category (e.g. Grocery, Dairy)")
    barcode: Optional[str] = Field(None, max_length=100, description="Optional barcode / SKU")
    selling_price: float = Field(..., ge=0, description="Selling price (must be >= 0)")
    cost_price: Optional[float] = Field(None, ge=0, description="Cost price (must be >= 0)")
    quantity: int = Field(0, ge=0, description="Current stock quantity (must be >= 0)")
    low_stock_threshold: int = Field(5, ge=0, description="Threshold below which stock is considered low")
    image_url: Optional[str] = Field(None, description="Optional image URL")


class ProductCreate(ProductBase):
    shop_id: Optional[int] = Field(1, description="Associated shop ID (defaults to 1)")


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    barcode: Optional[str] = None
    selling_price: Optional[float] = Field(None, ge=0)
    cost_price: Optional[float] = Field(None, ge=0)
    quantity: Optional[int] = Field(None, ge=0)
    low_stock_threshold: Optional[int] = Field(None, ge=0)
    image_url: Optional[str] = None


class ProductResponse(ProductBase):
    id: int
    shop_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductLowStockResponse(BaseModel):
    id: int
    name: str
    category: str
    quantity: int
    low_stock_threshold: int
    selling_price: float

    model_config = ConfigDict(from_attributes=True)
