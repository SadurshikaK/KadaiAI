from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from typing import List, Union

from app.database import get_db
from app.schemas.product import ProductLowStockResponse
from app.schemas.stock import LowStockSummaryResponse
from app.services.stock_service import StockService

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])


@router.get(
    "/low-stock",
    response_model=Union[List[ProductLowStockResponse], LowStockSummaryResponse],
    summary="Get low-stock products"
)
def get_low_stock_products(
    response: Response,
    summary: bool = Query(False, description="If true, returns an object containing count and products list"),
    shop_id: int = Query(1, description="Shop ID"),
    db: Session = Depends(get_db)
):
    """
    Retrieve products where current quantity <= low_stock_threshold.
    - Sets 'X-Total-Count' response header with total count of low-stock products.
    - If ?summary=true is passed, returns { "count": X, "products": [...] }.
    - By default returns a clean JSON list of low-stock items.
    """
    low_stock_items = StockService.get_low_stock(db, shop_id=shop_id)
    total_count = len(low_stock_items)
    
    # Expose total count in response headers
    response.headers["X-Total-Count"] = str(total_count)

    parsed_items = [
        ProductLowStockResponse(
            id=item.id,
            name=item.name,
            category=item.category,
            quantity=item.quantity,
            low_stock_threshold=item.low_stock_threshold,
            selling_price=item.selling_price
        )
        for item in low_stock_items
    ]

    if summary:
        return LowStockSummaryResponse(count=total_count, products=parsed_items)

    return parsed_items


@router.get("/low-stock/count", summary="Get low-stock count only")
def get_low_stock_count(
    shop_id: int = Query(1, description="Shop ID"),
    db: Session = Depends(get_db)
):
    """Returns the total number of low stock products needing attention."""
    count = StockService.get_low_stock_count(db, shop_id=shop_id)
    return {"count": count}
