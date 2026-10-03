def test_dashboard_endpoint(client):
    """
    Scenario 12: Check dashboard endpoint.
    Aggregates today's sales, sales count, low stock count, and total products.
    """
    # Create products: 1 normal, 1 low stock
    p1 = client.post("/api/products", json={
        "name": "Milk Powder", "category": "Dairy", "selling_price": 450.0, "quantity": 3, "low_stock_threshold": 5
    }).json()["id"]
    p2 = client.post("/api/products", json={
        "name": "Rice", "category": "Grocery", "selling_price": 250.0, "quantity": 30, "low_stock_threshold": 5
    }).json()["id"]

    # Record a sale on Rice: 2 units * 250 = 500
    client.post("/api/sales", json={"product_id": p2, "quantity": 2})

    res = client.get("/api/dashboard")
    assert res.status_code == 200
    data = res.json()
    assert data["today_sales"] == 500.0
    assert data["sales_count"] == 1
    assert data["low_stock_count"] == 1  # Milk Powder is low stock (3 <= 5)
    assert data["total_products"] == 2
