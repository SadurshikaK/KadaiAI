from sqlalchemy.orm import Session
from app.database import SessionLocal, init_db
from app.models.shop import Shop
from app.models.product import Product
from app.models.stock_transaction import StockTransaction

SAMPLE_PRODUCTS = [
    {
        "name": "Milk Powder",
        "category": "Dairy",
        "selling_price": 450.0,
        "cost_price": 380.0,
        "quantity": 20,
        "low_stock_threshold": 5,
        "barcode": "479123456001"
    },
    {
        "name": "Biscuits",
        "category": "Snacks",
        "selling_price": 100.0,
        "cost_price": 80.0,
        "quantity": 40,
        "low_stock_threshold": 10,
        "barcode": "479123456002"
    },
    {
        "name": "Soap",
        "category": "Personal Care",
        "selling_price": 180.0,
        "cost_price": 140.0,
        "quantity": 8,
        "low_stock_threshold": 5,
        "barcode": "479123456003"
    },
    {
        "name": "Rice",
        "category": "Grocery",
        "selling_price": 250.0,
        "cost_price": 210.0,
        "quantity": 25,
        "low_stock_threshold": 8,
        "barcode": "479123456004"
    }
]


def seed_database(db: Session, shop_id: int = 1) -> dict:
    """Populates the database with default sample products if they don't already exist."""
    # Ensure shop exists
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if not shop:
        shop = Shop(id=shop_id, name="Kadai Main Shop")
        db.add(shop)
        db.commit()

    created_count = 0
    skipped_count = 0

    for item in SAMPLE_PRODUCTS:
        existing = db.query(Product).filter(
            Product.shop_id == shop_id,
            Product.name == item["name"]
        ).first()

        if not existing:
            product = Product(
                shop_id=shop_id,
                name=item["name"],
                category=item["category"],
                barcode=item.get("barcode"),
                selling_price=item["selling_price"],
                cost_price=item.get("cost_price"),
                quantity=item["quantity"],
                low_stock_threshold=item["low_stock_threshold"]
            )
            db.add(product)
            db.flush()

            tx = StockTransaction(
                shop_id=shop_id,
                product_id=product.id,
                transaction_type="STOCK_IN",
                quantity=item["quantity"],
                note="Initial sample data seed"
            )
            db.add(tx)
            created_count += 1
        else:
            skipped_count += 1

    db.commit()
    return {
        "status": "success",
        "created_products": created_count,
        "skipped_existing": skipped_count,
        "total_seed_items": len(SAMPLE_PRODUCTS)
    }


if __name__ == "__main__":
    init_db()
    session = SessionLocal()
    try:
        result = seed_database(session)
        print("Database seed result:", result)
    finally:
        session.close()
