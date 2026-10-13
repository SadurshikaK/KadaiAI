# Member 2 final-sprint backend handoff

This patch builds on the already-merged `query_low_stock`, `restock_advice`, and `shop_summary` voice intents. Do not replace or roll back that work.

## API contracts

### `POST /api/ai/invoice-ocr?shop_id=1&language=eng`

Upload an image under multipart form field `file`. OCR remains read-only for **inventory quantities**.

The response keeps existing fields (`language`, `shop_id`, `raw_text`, `lines`, `candidate_lines`, `detected_items`, `note`) and adds:

- `detected_items`: *only* high-confidence `MATCHED` items (product similarity >= 0.80); keeps the existing Android app compatible.
- `review_items`: candidates with product similarity >= 0.60 and < 0.80, marked `NEEDS_REVIEW` and `requires_explicit_acceptance: true`. They **must not** be passed to stock-add by default. The frontend must provide explicit per-item acceptance and allow quantity correction before any update.
- `unmatched_items`: unknown or uncertain lines (`UNMATCHED`), never submitted to stock-add.
- `possible_duplicate`: true when the SHA-256 of the identical uploaded image was previously scanned by the same shop.
- `previous_scanned_at`: timestamp of previous scan or null.
- `duplicate_warning`: message advising users to check before accepting a duplicate.

These `confidence` fields are product **similarity scores**, not calibrated image/OCR probabilities.

SHA-256 detects identical *file bytes*, not visually similar re-photographs. Duplicate scans are deliberately warned about, **not silently blocked**. The mobile application must show `duplicate_warning` before confirmation, otherwise the warning will not be visible to the user.

A new `invoice_scans` table stores hashes and timestamps only, not invoice photos or text. Local database `create_all()` creates it automatically. If cloud database migrations are restricted, apply `backend/migrations/create_invoice_scans.sql` in the correct managed PostgreSQL database. Protect this data under normal database privacy controls.

**Frontend action for Member 1:** the existing frontend computes review status with a >=0.50 threshold and confirms all displayed items together. That does not match the specified >=0.60 threshold or separate acceptance of `NEEDS_REVIEW`. Use the server's `match_status` and render `review_items` separately with an explicit individual Accept control. Do not silently add them to `reviewItems`. Show `possible_duplicate`/`previous_scanned_at` before stock update. Do not claim full OCR-safety UI integration until Android testing confirms these changes.

### `GET /api/activity?shop_id=1&limit=30`

Returns `{shop_id, count, items: [...]}` using real `stock_transactions` data, most recent first. Each event includes `id`, `type` (`SALE`, `STOCK_IN`, possibly `ADJUSTMENT`), `title`, `subtitle`, `amount`, `timestamp`, `product_id`, `product_name`, `quantity_change`, and `note`. Do not label generic audit records as a voice/invoice event unless that origin was actually stored.

**Frontend action for Member 1:** the current `mobile/src/services/activity.ts` is in-memory/session-only. It must fetch the new real endpoint for persistent history, and should handle `ADJUSTMENT` if present. Integrate only on Member 1's frontend branch to avoid conflicts.

### `POST /api/seed/restock-demo?shop_id=1&confirm=true`

**DESTRUCTIVE DEMO OPERATION.** Restricted to `APP_ENV=development|testing|test` and shop `1`, requires `confirm=true`. Replaces the demo shop's *entire sales/stock transaction history* with 10 days of clearly synthetic, repeatable records, leaving quantities:

- Milk Powder 4 (threshold 5)
- Biscuits 6 (threshold 10)
- Soap 2 (threshold 5)
- Rice 5 (threshold 8)

This creates enough recent demo history for the existing moving-average forecast and meaningful budget-limited Smart Restock suggestions. It does **not** establish real-world forecasting accuracy. Do not call against a real shop or a shared production database with `APP_ENV` incorrectly set to `development`. The separate existing reset endpoint returns to baseline shop quantities when called intentionally.

## Regression tests

From `backend/` in the activated virtual environment:

```powershell
python -m py_compile app\routers\ai.py
python -m pytest tests/test_member2_final_sprint.py -v
python -m pytest -q
```

In an isolated sandbox based on the matching GitHub backend (and preserving the already-merged reset method), **39 tests passed**: 29 existing and 10 new. Rerun locally and report the local results; do not assume they pass on your machine until verified.

## Safe handoff

Request review of `backend/app/routers/ai.py`, `backend/app/main.py`, models, activity route, and demo route. Do not edit `mobile/src/app/voice.tsx`, `mobile/src/app/invoice-ai.tsx`, or other Member 1/3-owned frontend files in the Member 2 PR. Have Members 1 and 3 verify Android behavior after merging.
