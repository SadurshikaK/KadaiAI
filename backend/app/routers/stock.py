from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.stock import StockAddRequest, StockAddResponse
from app.services.stock_service import StockService

router = APIRouter(prefix="/api/stock", tags=["Stock Management"])


@router.post("/add", response_model=StockAddResponse, status_code=status.HTTP_200_OK, summary="Add stock")
def add_stock(
    data: StockAddRequest,
    db: Session = Depends(get_db)
):
    """
    Increase product stock quantity:
    - Rejects zero or negative amounts (HTTP 422).
    - Increases product.quantity.
    - Records a STOCK_IN transaction entry.
    """
    return StockService.add_stock(db, data=data)
