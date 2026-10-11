from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.seed import seed_database, reset_demo_database
from app.config import settings

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


@router.post("/reset", summary="Reset competition demo data")
def reset_competition_demo(
    shop_id: int = Query(1, ge=1),
    confirm: bool = Query(False),
    db: Session = Depends(get_db)
):
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Explicit confirmation is required."
        )

    if shop_id != 1:
        raise HTTPException(
            status_code=403,
            detail="Reset is restricted to demo shop 1."
        )

    if settings.APP_ENV.lower() not in {
        "development", "testing", "test"
    }:
        raise HTTPException(
            status_code=403,
            detail="Demo reset is disabled in this environment."
        )

    return reset_demo_database(db, shop_id=shop_id)
