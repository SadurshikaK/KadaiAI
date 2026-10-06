# KadaiAI – AI Usage Report

## 1. Overview

KadaiAI uses AI-assisted and intelligent components to reduce typing and support inventory decisions for small Sri Lankan retailers.

Member 3 implemented multilingual voice interaction, command interpretation, demand forecasting, budget-aware restocking recommendations, and supplier invoice OCR.

## 2. AI / Intelligent Components

### Speech-to-Text

The Expo application uses platform speech recognition through `expo-speech-recognition` for English, Tamil, and Sinhala.

### Inventory Command Interpretation

The backend parser is not a generative LLM. It combines multilingual intent keywords, number extraction, product aliases, RapidFuzz product matching, confidence scoring, and confirmation rules.

Supported intents:

- `sale`
- `add_stock`
- `query_stock`

### Text-to-Speech

`expo-speech` provides spoken feedback where a suitable voice is supported by the device/platform.

### Demand Forecasting

KadaiAI uses a staged approach:

- no history: no invented forecast
- limited history: 7-day moving-average baseline
- sufficient history: Random Forest regression using time, weekday, lag-1, lag-7 and rolling-7 features

### Smart Restocking

Restocking recommendations combine predicted demand, current inventory, safety stock, unit cost, and the user's purchasing budget.

### OCR

Supplier invoice images are preprocessed with Pillow and processed using Tesseract OCR. OCR results require manual review.

## 3. Evaluation

### Voice / Command Understanding

Completed voice test cases: **20**

- Intent accuracy: **85.0%**
- Product identification accuracy: **100.0%**
- Quantity extraction accuracy: **95.0%**
- End-to-end parser accuracy: **85.0%**

### Forecasting

Products with sufficient history: **0**

Moving-average MAE:

**None**

Random Forest MAE:

**None**

If sufficient real historical data is unavailable, KadaiAI reports this limitation rather than presenting fabricated forecasting accuracy.

### Restocking Recommendation

Budget/consistency tests passed:

**3 / 3**

### Invoice OCR

Invoices evaluated:

**3**

Mean token-level F1:

**86.41%**

## 4. Human-in-the-Loop Control

Inventory-changing voice actions follow:

Speech → Speech-to-Text → command parsing → product/quantity detection → user confirmation → existing backend API → database update.

Stock queries do not change inventory and therefore do not require confirmation.

OCR results are also presented for manual review instead of automatically modifying inventory.

## 5. Limitations

- Speech recognition depends on microphone quality, environmental noise, accent, browser/device recognition services, and Tamil/Sinhala support.
- Keyword and fuzzy command parsing can fail on unseen wording or unusual speech-recognition output.
- Forecasting quality depends on sufficient representative sales history.
- New products have a cold-start problem.
- OCR quality depends on image resolution, lighting, blur, skew, invoice layout, fonts and installed language packs.
- Restocking recommendations are decision-support outputs and do not model every supplier, shelf-life, promotion or cash-flow constraint.

## 6. Evidence

Evaluation outputs are stored under:

`docs/evidence/`

Only measured results from completed tests should be reported.
