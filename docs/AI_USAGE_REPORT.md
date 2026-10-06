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

- No history: no invented forecast
- Limited history: 7-day moving-average baseline
- Sufficient history: Random Forest regression using time, weekday, lag-1, lag-7, and rolling-7 features

### Smart Restocking

Restocking recommendations combine predicted demand, current inventory, safety stock, unit cost, and the user's purchasing budget.

### OCR

Supplier invoice images are preprocessed with Pillow and processed using Tesseract OCR.

OCR results require manual review before they can be used for inventory updates.

## 3. Evaluation

### Voice / Command Understanding

A total of **30 multilingual voice test cases** were evaluated:

- 10 English commands
- 10 Tamil commands
- 10 Sinhala commands

The evaluation used the actual Speech-to-Text transcripts produced by the application. Recognition errors were not manually corrected before command parsing.

#### Final Results

- Intent accuracy: **93.33%**
- Product identification accuracy: **100.0%**
- Quantity extraction accuracy: **96.67%**
- End-to-end parser accuracy: **93.33%**
- End-to-end commands passed: **28 / 30**

#### Parser Improvement

The initial 30-case evaluation produced:

- Baseline end-to-end parser accuracy: **66.67%**

Failure analysis identified unsupported conversational Tamil/Sinhala wording, intent-priority issues, and quantity interpretation problems.

After targeted parser improvements and regression testing using the same 30 cases:

- Post-improvement end-to-end parser accuracy: **93.33%**

This represents an improvement of **26.66 percentage points**.

Two English cases remained unsuccessful because the Speech-to-Text system substantially changed the spoken commands:

- `Sell 2 soap` → `cell to shop`
- `Add 10 soap` → `at 10 Shop`

These cases were intentionally retained as failures rather than adding unsafe keyword mappings that could cause incorrect inventory actions.

### Forecasting

Products with sufficient historical sales data: **0**

Moving-average MAE: **Not available – insufficient historical sales data**

Random Forest MAE: **Not available – insufficient historical sales data**

The current prototype does not contain enough real historical sales observations for a reliable forecasting backtest.

Rather than reporting fabricated accuracy values, KadaiAI reports this limitation directly.

The forecasting pipeline is implemented and can apply the moving-average or Random Forest approach when sufficient historical sales data becomes available.

### Restocking Recommendation

Budget/consistency tests passed:

**3 / 3**

The tests verified that:

- recommended quantities are positive,
- estimated spending does not exceed the specified budget, and
- remaining-budget calculations are consistent with recommended spending.

### Invoice OCR

Synthetic test invoices evaluated:

**3**

Mean token-level F1:

**86.41%**

The OCR evaluation used controlled synthetic invoice test fixtures with manually prepared ground-truth text.

The test invoices included clear, slightly rotated, and lower-contrast examples.

Therefore, the **86.41% token-level F1 score** represents OCR performance under controlled testing conditions and should not be interpreted as real-world supplier invoice accuracy.

## 4. Software Validation

### Backend Testing

The backend automated test suite was executed using `pytest`.

Result:

**21 tests passed**

Two third-party dependency deprecation warnings were reported, but no backend test failed.

Test evidence is stored at:

`docs/evidence/final_pytest.txt`

### Frontend Linting

The Expo frontend was checked using:

`npx expo lint`

Result:

**Passed with exit code 0**

Lint evidence is stored at:

`docs/evidence/frontend_lint.txt`

## 5. Human-in-the-Loop Control

Inventory-changing voice actions follow:

**Speech → Speech-to-Text → command parsing → product/quantity detection → user confirmation → existing backend API → database update**

Inventory-changing operations such as sales and stock additions require confirmation before the database is modified.

Stock queries do not modify inventory and therefore do not require confirmation.

OCR results are also presented for manual review instead of automatically modifying inventory.

This human-in-the-loop design reduces the risk of incorrect speech recognition, command interpretation, or OCR output causing unintended inventory changes.

## 6. Limitations

- Speech recognition depends on microphone quality, environmental noise, accent, browser/device recognition services, and language support.
- Keyword and fuzzy command parsing can fail on unseen wording or unusual Speech-to-Text output.
- Product aliases and conversational language variations may need to be expanded through further real-user testing.
- Forecasting quality depends on sufficient representative historical sales data.
- New products have a cold-start problem.
- The current dataset does not contain enough historical sales observations to report forecasting MAE.
- OCR quality depends on image resolution, lighting, blur, skew, invoice layout, fonts, and installed language packs.
- The current OCR evaluation used synthetic controlled test invoices rather than real supplier invoices.
- Restocking recommendations are decision-support outputs and do not model every supplier, shelf-life, promotion, delivery lead time, or cash-flow constraint.

## 7. Evidence

Evaluation outputs are stored under:

`docs/evidence/`

The evidence includes:

- 30 multilingual voice test cases
- baseline voice evaluation results
- post-improvement voice evaluation results
- final voice evaluation summary
- forecasting evaluation results and summary
- restocking recommendation evaluation
- OCR evaluation results
- synthetic OCR invoice test fixtures
- backend pytest results
- frontend lint results
- supporting screenshots

Only measured results from completed tests are reported.