from app.routers.products import router as products_router
from app.routers.sales import router as sales_router
from app.routers.stock import router as stock_router
from app.routers.inventory import router as inventory_router
from app.routers.dashboard import router as dashboard_router
from app.routers.seed import router as seed_router

__all__ = [
    "products_router",
    "sales_router",
    "stock_router",
    "inventory_router",
    "dashboard_router",
    "seed_router",
]
