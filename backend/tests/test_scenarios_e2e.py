def test_complete_retailer_scenario_lifecycle(client):
    """
    Comprehensive end-to-end test executing all 12 requested scenarios:
    1. Create product
    2. Get product
    3. Sell product
    4. Check stock decreases (20 -> 18)
    5. Add stock (18 -> 28)
    6. Check stock increases
    7. Try selling more stock than available
    8. Verify negative stock is prevented
    9. Check low-stock endpoint
    10. Check today's sales calculation
    11. Check sales history
    12. Check dashboard endpoint
    """
    # 1. Create product
    create_res = client.post("/api/products", json={
        "name": "Milk Powder",
        "category": "Dairy",
        "selling_price": 450.0,
        "cost_price": 380.0,
        "quantity": 20,
        "low_stock_threshold": 5
    })
    assert create_res.status_code == 201
    product = create_res.json()
    product_id = product["id"]
    assert product["quantity"] == 20

    # 2. Get product
    get_res = client.get(f"/api/products/{product_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Milk Powder"

    # 3. Sell product
    # 4. Check stock decreases (20 -> 18)
    sale_res = client.post("/api/sales", json={
        "product_id": product_id,
        "quantity": 2
    })
    assert sale_res.status_code == 201
    sale_data = sale_res.json()
    assert sale_data["remaining_stock"] == 18
    assert sale_data["total_amount"] == 900.0

    # Verify directly via GET product
    assert client.get(f"/api/products/{product_id}").json()["quantity"] == 18

    # 5. Add stock
    # 6. Check stock increases (18 -> 28)
    stock_res = client.post("/api/stock/add", json={
        "product_id": product_id,
        "quantity": 10,
        "note": "Supplier delivery"
    })
    assert stock_res.status_code == 200
    assert stock_res.json()["previous_stock"] == 18
    assert stock_res.json()["added_quantity"] == 10
    assert stock_res.json()["new_stock"] == 28

    # Verify directly via GET product
    assert client.get(f"/api/products/{product_id}").json()["quantity"] == 28

    # 7. Try selling more stock than available (try 30 when only 28 available)
    over_res = client.post("/api/sales", json={
        "product_id": product_id,
        "quantity": 30
    })
    assert over_res.status_code == 400
    assert "Insufficient stock" in over_res.json()["message"]

    # 8. Verify negative stock is prevented
    assert client.get(f"/api/products/{product_id}").json()["quantity"] == 28

    # 9. Check low-stock endpoint
    # Create another product with quantity 2 and threshold 5
    client.post("/api/products", json={
        "name": "Matchbox",
        "category": "Household",
        "selling_price": 20.0,
        "quantity": 2,
        "low_stock_threshold": 5
    })
    low_res = client.get("/api/inventory/low-stock")
    assert low_res.status_code == 200
    low_items = low_res.json()
    assert len(low_items) == 1
    assert low_items[0]["name"] == "Matchbox"

    # 10. Check today's sales calculation
    today_res = client.get("/api/sales/today")
    assert today_res.status_code == 200
    assert today_res.json()["total_revenue"] == 900.0
    assert today_res.json()["sales_count"] == 1
    assert today_res.json()["items_sold"] == 2

    # 11. Check sales history
    history_res = client.get("/api/sales/history")
    assert history_res.status_code == 200
    assert len(history_res.json()) == 1
    assert history_res.json()[0]["product_name"] == "Milk Powder"

    # 12. Check dashboard endpoint
    dash_res = client.get("/api/dashboard")
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["today_sales"] == 900.0
    assert dash_data["sales_count"] == 1
    assert dash_data["low_stock_count"] == 1
    assert dash_data["total_products"] == 2


def test_seed_and_ai_search(client):
    """Test seed endpoint and voice AI lookup for Member 3."""
    seed_res = client.post("/api/seed")
    assert seed_res.status_code == 200
    assert seed_res.json()["status"] == "success"

    # Search for voice AI lookup
    search_res = client.get("/api/products/search?q=biscuit")
    assert search_res.status_code == 200
    results = search_res.json()
    assert len(results) >= 1
    assert "Biscuits" in results[0]["name"]
