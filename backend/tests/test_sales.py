def test_sell_product_and_stock_decrease(client):
    """
    Scenario 3: Sell product.
    Scenario 4: Check stock decreases (20 -> 18).
    """
    # 1. Create product with 20 quantity
    prod_res = client.post("/api/products", json={
        "name": "Milk Powder",
        "category": "Dairy",
        "selling_price": 450.0,
        "quantity": 20,
        "low_stock_threshold": 5
    })
    product_id = prod_res.json()["id"]

    # 2. Sell 2 units
    sale_payload = {
        "product_id": product_id,
        "quantity": 2
    }
    sale_res = client.post("/api/sales", json=sale_payload)
    assert sale_res.status_code == 201
    sale_data = sale_res.json()
    assert sale_data["quantity"] == 2
    assert sale_data["unit_price"] == 450.0
    assert sale_data["total_amount"] == 900.0
    assert sale_data["remaining_stock"] == 18

    # 3. Verify product stock in DB is 18
    get_res = client.get(f"/api/products/{product_id}")
    assert get_res.json()["quantity"] == 18


def test_sell_more_than_available_prevents_negative_stock(client):
    """
    Scenario 7: Try selling more stock than available.
    Scenario 8: Verify negative stock is prevented.
    """
    prod_res = client.post("/api/products", json={
        "name": "Soap",
        "category": "Personal Care",
        "selling_price": 180.0,
        "quantity": 5,
        "low_stock_threshold": 2
    })
    product_id = prod_res.json()["id"]

    # Try selling 10 when only 5 exist
    over_sale = client.post("/api/sales", json={
        "product_id": product_id,
        "quantity": 10
    })
    assert over_sale.status_code == 400
    assert "Insufficient stock" in over_sale.json()["message"]

    # Verify stock remained untouched at 5 (never negative)
    get_res = client.get(f"/api/products/{product_id}")
    assert get_res.json()["quantity"] == 5


def test_today_sales_calculation(client):
    """
    Scenario 10: Check today's sales calculation.
    """
    # Create products
    p1 = client.post("/api/products", json={
        "name": "Product 1", "category": "General", "selling_price": 100.0, "quantity": 10
    }).json()["id"]
    p2 = client.post("/api/products", json={
        "name": "Product 2", "category": "General", "selling_price": 250.0, "quantity": 10
    }).json()["id"]

    # Record sales
    client.post("/api/sales", json={"product_id": p1, "quantity": 3})  # 300
    client.post("/api/sales", json={"product_id": p2, "quantity": 2})  # 500

    today_res = client.get("/api/sales/today")
    assert today_res.status_code == 200
    data = today_res.json()
    assert data["total_revenue"] == 800.0
    assert data["sales_count"] == 2
    assert data["items_sold"] == 5


def test_sales_history(client):
    """
    Scenario 11: Check sales history.
    """
    p = client.post("/api/products", json={
        "name": "Rice", "category": "Grocery", "selling_price": 250.0, "quantity": 50
    }).json()["id"]

    client.post("/api/sales", json={"product_id": p, "quantity": 4})

    history_res = client.get("/api/sales/history?limit=10")
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) >= 1
    assert history[0]["product_name"] == "Rice"
    assert history[0]["quantity"] == 4
    assert history[0]["total_amount"] == 1000.0
