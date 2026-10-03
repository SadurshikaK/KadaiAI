def test_create_product(client):
    """Scenario 1: Create product."""
    payload = {
        "name": "Milk Powder",
        "category": "Dairy",
        "selling_price": 450.0,
        "cost_price": 380.0,
        "quantity": 20,
        "low_stock_threshold": 5,
        "barcode": "4790001"
    }
    response = client.post("/api/products", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["name"] == "Milk Powder"
    assert data["selling_price"] == 450.0
    assert data["quantity"] == 20


def test_get_product(client):
    """Scenario 2: Get product."""
    # Create product first
    payload = {
        "name": "Biscuits",
        "category": "Snacks",
        "selling_price": 100.0,
        "quantity": 40,
        "low_stock_threshold": 10
    }
    create_res = client.post("/api/products", json=payload)
    product_id = create_res.json()["id"]

    # Get single product
    get_res = client.get(f"/api/products/{product_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Biscuits"
    assert get_res.json()["quantity"] == 40

    # Get non-existent product
    not_found = client.get("/api/products/99999")
    assert not_found.status_code == 404


def test_get_all_products(client):
    client.post("/api/products", json={
        "name": "Item A", "category": "General", "selling_price": 50.0, "quantity": 10, "low_stock_threshold": 2
    })
    client.post("/api/products", json={
        "name": "Item B", "category": "General", "selling_price": 75.0, "quantity": 15, "low_stock_threshold": 3
    })

    res = client.get("/api/products")
    assert res.status_code == 200
    assert len(res.json()) >= 2


def test_update_product(client):
    create_res = client.post("/api/products", json={
        "name": "Soap", "category": "Personal Care", "selling_price": 180.0, "quantity": 8, "low_stock_threshold": 5
    })
    product_id = create_res.json()["id"]

    update_res = client.put(f"/api/products/{product_id}", json={
        "selling_price": 195.0,
        "quantity": 12
    })
    assert update_res.status_code == 200
    assert update_res.json()["selling_price"] == 195.0
    assert update_res.json()["quantity"] == 12


def test_search_products(client):
    """Task 11: Member 3 Voice AI product search."""
    client.post("/api/products", json={
        "name": "Anchor Milk Powder", "category": "Dairy", "selling_price": 480.0, "quantity": 10, "low_stock_threshold": 3
    })
    client.post("/api/products", json={
        "name": "Sunlight Soap", "category": "Cleaning", "selling_price": 120.0, "quantity": 15, "low_stock_threshold": 5
    })

    search_res = client.get("/api/products/search?q=milk")
    assert search_res.status_code == 200
    results = search_res.json()
    assert len(results) == 1
    assert "Milk" in results[0]["name"]
