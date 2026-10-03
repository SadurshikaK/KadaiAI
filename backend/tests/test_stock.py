def test_add_stock_increases_inventory(client):
    """
    Scenario 5: Add stock.
    Scenario 6: Check stock increases (18 -> 28).
    """
    prod_res = client.post("/api/products", json={
        "name": "Milk Powder",
        "category": "Dairy",
        "selling_price": 450.0,
        "quantity": 18,
        "low_stock_threshold": 5
    })
    product_id = prod_res.json()["id"]

    # Add 10 units
    add_payload = {
        "product_id": product_id,
        "quantity": 10,
        "note": "Supplier delivery"
    }
    stock_res = client.post("/api/stock/add", json=add_payload)
    assert stock_res.status_code == 200
    data = stock_res.json()
    assert data["previous_stock"] == 18
    assert data["added_quantity"] == 10
    assert data["new_stock"] == 28

    # Verify directly via GET product
    get_res = client.get(f"/api/products/{product_id}")
    assert get_res.json()["quantity"] == 28


def test_add_stock_rejects_zero_or_negative_quantity(client):
    prod_res = client.post("/api/products", json={
        "name": "Tea", "category": "Beverage", "selling_price": 200.0, "quantity": 10
    })
    product_id = prod_res.json()["id"]

    zero_res = client.post("/api/stock/add", json={"product_id": product_id, "quantity": 0})
    assert zero_res.status_code == 422

    neg_res = client.post("/api/stock/add", json={"product_id": product_id, "quantity": -5})
    assert neg_res.status_code == 422
