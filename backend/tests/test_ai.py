from app.models.product import Product


def add_product(
    db_session,
    name,
    category,
    quantity,
    low_stock_threshold,
    selling_price,
    cost_price,
):
    product = Product(
        shop_id=1,
        name=name,
        category=category,
        quantity=quantity,
        low_stock_threshold=low_stock_threshold,
        selling_price=selling_price,
        cost_price=cost_price,
    )

    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    return product


def test_english_sale_command(client, db_session):

    add_product(
        db_session,
        "Biscuits",
        "Snacks",
        40,
        10,
        100,
        80,
    )

    response = client.post(
        "/api/ai/parse-command",
        json={
            "text": "Sold 3 biscuits",
            "shop_id": 1,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["intent"] == "sale"
    assert data["product_name"] == "Biscuits"
    assert data["quantity"] == 3
    assert data["needs_confirmation"] is True


def test_tamil_sale_command(client, db_session):

    add_product(
        db_session,
        "Biscuits",
        "Snacks",
        40,
        10,
        100,
        80,
    )

    response = client.post(
        "/api/ai/parse-command",
        json={
            "text": "மூன்று பிஸ்கட் விற்றேன்",
            "shop_id": 1,
        },
    )

    data = response.json()

    assert data["intent"] == "sale"
    assert data["product_name"] == "Biscuits"
    assert data["quantity"] == 3


def test_sinhala_sale_command(client, db_session):

    add_product(
        db_session,
        "Biscuits",
        "Snacks",
        40,
        10,
        100,
        80,
    )

    response = client.post(
        "/api/ai/parse-command",
        json={
            "text": "බිස්කට් තුනක් විකුණුවා",
            "shop_id": 1,
        },
    )

    data = response.json()

    assert data["intent"] == "sale"
    assert data["product_name"] == "Biscuits"
    assert data["quantity"] == 3


def test_stock_query(client, db_session):

    add_product(
        db_session,
        "Milk Powder",
        "Dairy",
        20,
        5,
        450,
        380,
    )

    response = client.post(
        "/api/ai/parse-command",
        json={
            "text": "How many milk powder packets are left?",
            "shop_id": 1,
        },
    )

    data = response.json()

    assert data["intent"] == "query_stock"
    assert data["product_name"] == "Milk Powder"
    assert data["current_stock"] == 20

    assert data["quantity"] is None
    assert data["needs_confirmation"] is False


def test_forecast_cold_start(client, db_session):

    product = add_product(
        db_session,
        "Soap",
        "Personal Care",
        8,
        5,
        180,
        140,
    )

    response = client.get(
        f"/api/ai/forecast/{product.id}"
        "?shop_id=1&horizon_days=7"
    )

    data = response.json()

    assert data["method"] == "no_history"
    assert data["predicted_total"] == 0


def test_recommendation_budget_limit(
    client,
    db_session,
):

    add_product(
        db_session,
        "Soap",
        "Personal Care",
        1,
        5,
        180,
        140,
    )

    response = client.get(
        "/api/ai/recommendations"
        "?budget=500"
        "&shop_id=1"
        "&horizon_days=7"
    )

    data = response.json()

    assert data["estimated_spend"] <= 500
    assert data["remaining_budget"] >= 0

    for item in data["items"]:

        assert item["recommended_quantity"] > 0
        assert item["estimated_cost"] >= 0