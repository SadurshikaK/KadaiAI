from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.seed import seed_database

router = APIRouter(prefix="/api/seed", tags=["Seed Demo Data"])


@router.post("", summary="Seed sample products into database")
def seed_demo_data(
    shop_id: int = Query(1, description="Shop ID"),
    db: Session = Depends(get_db)
):
    """
    Populate database with sample Sri Lankan grocery products:
    - Milk Powder (20 units @ Rs. 450)
    - Biscuits (40 units @ Rs. 100)
    - Soap (8 units @ Rs. 180)
    - Rice (25 units @ Rs. 250)
    Safe to call multiple times (skips existing items).
    """
    return seed_database(db, shop_id=shop_id)
