"""Backend API regression tests for the three general voice intents.
Copy into backend/tests/test_member2_voice_intents.py.
"""

import pytest

from app.models.product import Product


@pytest.mark.parametrize(
    "command,expected_intent",
    [
        ("What items are low in stock?", "query_low_stock"),
        ("What items are in low stock?", "query_low_stock"),
        ("What should I restock today?", "restock_advice"),
        ("How is my shop today?", "shop_summary"),
    ],
)
def test_general_voice_intents(client, command, expected_intent):
    response = client.post(
        "/api/ai/parse-command",
        json={"text": command, "shop_id": 1},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == expected_intent
    assert body["confidence"] >= 0.65
    assert body["needs_confirmation"] is False
    assert body["product_id"] is None
    assert body["quantity"] is None
    assert isinstance(body["data"], dict)


def test_low_stock_returns_actual_inventory(client, db_session):
    soap = Product(
        shop_id=1,
        name="Soap",
        category="Personal Care",
        quantity=4,
        low_stock_threshold=5,
        selling_price=180,
        cost_price=140,
    )
    db_session.add(soap)
    db_session.commit()
    before = soap.quantity
    response = client.post(
        "/api/ai/parse-command",
        json={"text": "What items are low in stock?", "shop_id": 1},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "query_low_stock"
    assert body["data"]["count"] == 1
    assert body["data"]["products"][0]["name"] == "Soap"
    assert body["data"]["products"][0]["quantity"] == 4
    db_session.refresh(soap)
    assert soap.quantity == before  # a query must not modify stock


def test_restock_request_prompts_for_budget(client):
    response = client.post(
        "/api/ai/parse-command",
        json={"text": "What should I restock today?", "shop_id": 1},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "restock_advice"
    assert body["data"]["requires_budget"] is True
    assert body["data"]["planning_endpoint"] == "/api/ai/recommendations"


def test_shop_summary_real_empty_shop(client):
    response = client.post(
        "/api/ai/parse-command",
        json={"text": "How is my shop today?", "shop_id": 1},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "shop_summary"
    assert body["data"]["today_sales"] == 0
    assert body["data"]["sales_count"] == 0
    assert body["data"]["low_stock_count"] == 0


def test_old_add_stock_still_detected(client, db_session):
    db_session.add(
        Product(
            shop_id=1,
            name="Soap",
            category="Personal Care",
            quantity=8,
            low_stock_threshold=5,
            selling_price=180,
            cost_price=140,
        )
    )
    db_session.commit()
    response = client.post(
        "/api/ai/parse-command",
        json={"text": "Add 5 soap", "shop_id": 1},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "add_stock"
    assert body["quantity"] == 5
    assert body["needs_confirmation"] is True
