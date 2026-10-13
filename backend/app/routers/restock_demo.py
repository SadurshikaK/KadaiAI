"""Optional competition demo seeding. Never enable for production shops."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.demo_restock import seed_restock_demo

router = APIRouter(prefix="/api/seed", tags=["Seed Demo Data"])


@router.post("/restock-demo", summary="Install synthetic Smart Restock demo history")
def make_restock_demo(
    confirm: bool = Query(False),
    shop_id: int = Query(1, gt=0),
    db: Session = Depends(get_db),
):
    if not confirm:
        raise HTTPException(status_code=400, detail="Explicit confirmation is required.")
    if shop_id != 1:
        raise HTTPException(status_code=403, detail="Demo data is restricted to shop 1.")
    if settings.APP_ENV.lower() not in {"development", "test", "testing"}:
        raise HTTPException(status_code=403, detail="Demo seeding is disabled in production.")
    return seed_restock_demo(db, shop_id=shop_id)
