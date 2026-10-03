from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
from typing import List, Optional

from app.models.product import Product
from app.models.stock_transaction import StockTransaction
from app.schemas.product import ProductCreate, ProductUpdate


class ProductService:
    @staticmethod
    def get_all(db: Session, shop_id: int = 1) -> List[Product]:
        """Fetch all products for a given shop."""
        return db.query(Product).filter(Product.shop_id == shop_id).order_by(Product.id.asc()).all()

    @staticmethod
    def get_by_id(db: Session, product_id: int, shop_id: int = 1) -> Product:
        """Fetch a single product by ID, raises 404 if not found."""
        product = db.query(Product).filter(Product.id == product_id, Product.shop_id == shop_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {product_id} not found."
            )
        return product

    @staticmethod
    def create(db: Session, data: ProductCreate) -> Product:
        """Create a new product and log initial stock transaction if quantity > 0."""
        product = Product(
            shop_id=data.shop_id or 1,
            name=data.name.strip(),
            category=data.category.strip(),
            barcode=data.barcode.strip() if data.barcode else None,
            selling_price=data.selling_price,
            cost_price=data.cost_price,
            quantity=data.quantity,
            low_stock_threshold=data.low_stock_threshold,
            image_url=data.image_url
        )
        db.add(product)
        db.flush()  # Populates product.id

        # If initial stock > 0, log as STOCK_IN
        if product.quantity > 0:
            tx = StockTransaction(
                shop_id=product.shop_id,
                product_id=product.id,
                transaction_type="STOCK_IN",
                quantity=product.quantity,
                note="Initial inventory upon creation"
            )
            db.add(tx)

        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def update(db: Session, product_id: int, data: ProductUpdate, shop_id: int = 1) -> Product:
        """Update product details safely."""
        product = ProductService.get_by_id(db, product_id, shop_id)
        
        update_data = data.model_dump(exclude_unset=True)
        if "name" in update_data and update_data["name"] is not None:
            product.name = update_data["name"].strip()
        if "category" in update_data and update_data["category"] is not None:
            product.category = update_data["category"].strip()
        if "barcode" in update_data:
            product.barcode = update_data["barcode"].strip() if update_data["barcode"] else None
        if "selling_price" in update_data and update_data["selling_price"] is not None:
            product.selling_price = update_data["selling_price"]
        if "cost_price" in update_data:
            product.cost_price = update_data["cost_price"]
        if "low_stock_threshold" in update_data and update_data["low_stock_threshold"] is not None:
            product.low_stock_threshold = update_data["low_stock_threshold"]
        if "image_url" in update_data:
            product.image_url = update_data["image_url"]

        # If quantity was directly modified, record an ADJUSTMENT transaction
        if "quantity" in update_data and update_data["quantity"] is not None:
            diff = update_data["quantity"] - product.quantity
            if diff != 0:
                tx = StockTransaction(
                    shop_id=product.shop_id,
                    product_id=product.id,
                    transaction_type="ADJUSTMENT",
                    quantity=diff,
                    note=f"Manual inventory adjustment from {product.quantity} to {update_data['quantity']}"
                )
                db.add(tx)
                product.quantity = update_data["quantity"]

        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def delete(db: Session, product_id: int, shop_id: int = 1) -> dict:
        """Safely delete a product."""
        product = ProductService.get_by_id(db, product_id, shop_id)
        
        # Check if product has sales recorded to prevent foreign key errors
        if product.sales:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete product '{product.name}' because it has existing sales records. Consider setting its stock to 0 instead."
            )

        db.delete(product)
        db.commit()
        return {"message": f"Product '{product.name}' (ID: {product_id}) successfully deleted."}

    @staticmethod
    def search(db: Session, query: str, shop_id: int = 1) -> List[Product]:
        """Search products by name, category, or barcode (case-insensitive). Useful for Member 3 Voice AI."""
        if not query or not query.strip():
            return ProductService.get_all(db, shop_id)

        search_term = f"%{query.strip()}%"
        return db.query(Product).filter(
            Product.shop_id == shop_id,
            or_(
                Product.name.ilike(search_term),
                Product.category.ilike(search_term),
                Product.barcode.ilike(search_term)
            )
        ).all()
