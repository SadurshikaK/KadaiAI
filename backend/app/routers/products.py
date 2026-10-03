from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.services.product_service import ProductService

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("", response_model=List[ProductResponse], summary="Get all products")
def get_products(
    shop_id: int = Query(1, description="Shop ID"),
    db: Session = Depends(get_db)
):
    """Retrieve all products in the inventory."""
    return ProductService.get_all(db, shop_id=shop_id)


@router.get("/search", response_model=List[ProductResponse], summary="Search products")
def search_products(
    q: str = Query(..., min_length=1, description="Search term for name, category, or barcode"),
    shop_id: int = Query(1, description="Shop ID"),
    db: Session = Depends(get_db)
):
    """
    Search products by name, category, or barcode.
    Ideal for Member 3's AI/Voice product lookup.
    """
    return ProductService.search(db, query=q, shop_id=shop_id)


@router.get("/{product_id}", response_model=ProductResponse, summary="Get single product")
def get_product(
    product_id: int,
    shop_id: int = Query(1, description="Shop ID"),
    db: Session = Depends(get_db)
):
    """Retrieve a single product by its ID."""
    return ProductService.get_by_id(db, product_id=product_id, shop_id=shop_id)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED, summary="Create product")
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db)
):
    """Create a new product in inventory."""
    return ProductService.create(db, data=data)


@router.put("/{product_id}", response_model=ProductResponse, summary="Update product")
def update_product(
    product_id: int,
    data: ProductUpdate,
    shop_id: int = Query(1, description="Shop ID"),
    db: Session = Depends(get_db)
):
    """Update details of an existing product."""
    return ProductService.update(db, product_id=product_id, data=data, shop_id=shop_id)


@router.delete("/{product_id}", summary="Delete product safely")
def delete_product(
    product_id: int,
    shop_id: int = Query(1, description="Shop ID"),
    db: Session = Depends(get_db)
):
    """
    Safely delete a product.
    Prevents deletion if there are historical sales records linked to it.
    """
    return ProductService.delete(db, product_id=product_id, shop_id=shop_id)
