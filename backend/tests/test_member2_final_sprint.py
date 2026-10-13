"""Member 2 final sprint tests: OCR safety, duplicates, audit trail, demo."""
from io import BytesIO

from PIL import Image

from app.models.invoice_scan import InvoiceScan
from app.models.product import Product
from app.routers.ai import best_ocr_product_match, classify_ocr_product_match


def add_product(db, name, qty=8, threshold=5):
    p = Product(
        shop_id=1,
        name=name,
        category="Grocery",
        quantity=qty,
        low_stock_threshold=threshold,
        selling_price=150.0,
        cost_price=120.0,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def png_bytes():
    buffer = BytesIO()
    Image.new("RGB", (130, 80), "white").save(buffer, "PNG")
    return buffer.getvalue()


def mock_scan(client, monkeypatch, text):
    monkeypatch.setattr("pytesseract.image_to_string", lambda *_a, **_k: text)
    return client.post(
        "/api/ai/invoice-ocr?shop_id=1&language=eng",
        files={"file": ("invoice.png", png_bytes(), "image/png")},
    )


def test_match_thresholds():
    assert classify_ocr_product_match(0.80) == "MATCHED"
    assert classify_ocr_product_match(0.7999) == "NEEDS_REVIEW"
    assert classify_ocr_product_match(0.60) == "NEEDS_REVIEW"
    assert classify_ocr_product_match(0.5999) == "UNMATCHED"


def test_ocr_fuzzy_can_reach_review_state(db_session):
    product = add_product(db_session, "Soap")
    p, score = best_ocr_product_match("S0ap 2", [product])
    assert p.id == product.id
    assert 0.60 <= score < 0.80


def test_ocr_returns_states_without_changing_stock(client, db_session, monkeypatch):
    soap = add_product(db_session, "Soap", qty=8)
    rice = add_product(db_session, "Rice", qty=25)
    response = mock_scan(client, monkeypatch, "Soap 2\nR1ce 3\nUnknown item 5")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["possible_duplicate"] is False
    assert data["previous_scanned_at"] is None
    assert [x["product_name"] for x in data["detected_items"]] == ["Soap"]
    assert all(x["match_status"] == "MATCHED" for x in data["detected_items"])
    assert len(data["review_items"]) == 1
    assert data["review_items"][0]["product_name"] == "Rice"
    assert data["review_items"][0]["requires_explicit_acceptance"] is True
    assert len(data["unmatched_items"]) >= 1
    db_session.expire_all()
    assert db_session.get(Product, soap.id).quantity == 8
    assert db_session.get(Product, rice.id).quantity == 25


def test_identical_invoice_warns_but_does_not_block(client, db_session, monkeypatch):
    add_product(db_session, "Soap")
    first = mock_scan(client, monkeypatch, "Soap 2")
    second = mock_scan(client, monkeypatch, "Soap 2")
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["possible_duplicate"] is False
    assert second.json()["possible_duplicate"] is True
    assert second.json()["previous_scanned_at"]
    assert second.json()["duplicate_warning"]
    assert db_session.query(InvoiceScan).count() == 2


def test_invalid_invoice_not_recorded(client, db_session):
    response = client.post(
        "/api/ai/invoice-ocr?shop_id=1",
        files={"file": ("invalid.png", b"not an image", "image/png")},
    )
    assert response.status_code == 400
    assert db_session.query(InvoiceScan).count() == 0


def test_activity_uses_real_transactions(client, db_session):
    soap = add_product(db_session, "Soap", qty=10)
    sale = client.post(
        "/api/sales",
        json={"product_id": soap.id, "quantity": 2, "shop_id": 1},
    )
    assert sale.status_code == 201, sale.text
    restock = client.post(
        "/api/stock/add",
        json={"product_id": soap.id, "quantity": 5, "shop_id": 1},
    )
    assert restock.status_code == 200, restock.text
    response = client.get("/api/activity?shop_id=1&limit=10")
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["count"] == 2
    assert {item["type"] for item in result["items"]} == {"SALE", "STOCK_IN"}
    assert all(item["product_name"] == "Soap" for item in result["items"])
    assert all(item["timestamp"] for item in result["items"])
    assert all(item["id"].startswith("transaction_") for item in result["items"])


def test_activity_rejects_invalid_limit(client):
    assert client.get("/api/activity?shop_id=1&limit=0").status_code == 422
    assert client.get("/api/activity?shop_id=1&limit=101").status_code == 422


def test_demo_endpoint_restricted_and_confirmed(client):
    assert client.post("/api/seed/restock-demo?shop_id=1").status_code == 400
    assert client.post("/api/seed/restock-demo?shop_id=2&confirm=true").status_code == 403


def test_demo_is_repeatable_and_still_has_restock_advice(client, db_session):
    url = "/api/seed/restock-demo?shop_id=1&confirm=true"
    first = client.post(url)
    assert first.status_code == 200, first.text
    assert first.json()["synthetic_data"] is True
    quantities = first.json()["remaining_stock"]
    assert quantities == {"Milk Powder": 4, "Biscuits": 6, "Soap": 2, "Rice": 5}
    low = client.get("/api/inventory/low-stock?shop_id=1")
    assert low.status_code == 200
    assert len(low.json()) == 4
    recommendation = client.get("/api/ai/recommendations?budget=10000&shop_id=1")
    assert recommendation.status_code == 200, recommendation.text
    assert recommendation.json()["items"]
    assert recommendation.json()["estimated_spend"] <= 10000
    assert any(item["forecast_demand"] > 0 for item in recommendation.json()["items"])
    second = client.post(url)
    assert second.status_code == 200
    assert second.json()["remaining_stock"] == quantities
    assert db_session.query(InvoiceScan).count() == 0


def test_demo_disabled_in_production(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "APP_ENV", "production")
    assert client.post("/api/seed/restock-demo?confirm=true").status_code == 403
