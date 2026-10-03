def test_low_stock_endpoint_and_count(client):
    """
    Scenario 9: Check low-stock endpoint.
    Verifies that items where quantity <= low_stock_threshold are returned,
    and low-stock count matches.
    """
    # 1. Product with quantity <= threshold (3 <= 5) -> Low Stock
    client.post("/api/products", json={
        "name": "Milk Powder",
        "category": "Dairy",
        "selling_price": 450.0,
        "quantity": 3,
        "low_stock_threshold": 5
    })

    # 2. Product with quantity <= threshold (5 <= 5) -> Low Stock
    client.post("/api/products", json={
        "name": "Sugar",
        "category": "Grocery",
        "selling_price": 240.0,
        "quantity": 5,
        "low_stock_threshold": 5
    })

    # 3. Product with abundant stock (20 > 5) -> Not Low Stock
    client.post("/api/products", json={
        "name": "Rice",
        "category": "Grocery",
        "selling_price": 250.0,
        "quantity": 20,
        "low_stock_threshold": 5
    })

    # Test default list response
    res = client.get("/api/inventory/low-stock")
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 2
    assert res.headers.get("X-Total-Count") == "2"

    names = [item["name"] for item in items]
    assert "Milk Powder" in names
    assert "Sugar" in names
    assert "Rice" not in names

    # Test summary response
    summary_res = client.get("/api/inventory/low-stock?summary=true")
    assert summary_res.status_code == 200
    summary_data = summary_res.json()
    assert summary_data["count"] == 2
    assert len(summary_data["products"]) == 2

    # Test standalone count endpoint
    count_res = client.get("/api/inventory/low-stock/count")
    assert count_res.status_code == 200
    assert count_res.json()["count"] == 2
