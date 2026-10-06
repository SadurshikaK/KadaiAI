# KadaiAI – AI Usage Report

## 1. Overview

KadaiAI uses AI-assisted and intelligent components to reduce typing, simplify inventory updates, and support inventory-related decisions for small Sri Lankan retailers.

Member 3 implemented multilingual voice interaction, inventory command interpretation, demand forecasting, budget-aware restocking recommendations, and supplier invoice OCR.

The AI-related features are designed as decision-support tools with human confirmation for actions that can modify inventory.

---

## 2. AI / Intelligent Components

### Speech-to-Text

The Expo application uses platform speech recognition through `expo-speech-recognition`.

The voice interface is designed to support:

- English
- Tamil
- Sinhala

Recognized speech is converted into text before being passed to the backend command parser.

---

### Inventory Command Interpretation

The backend command parser is not a generative LLM.

It combines:

- multilingual intent keywords
- number extraction
- product aliases
- RapidFuzz product matching
- confidence scoring
- confirmation rules

The parser currently supports three main inventory intents:

- `sale`
- `add_stock`
- `query_stock`

Example commands include:

- `Sold 3 biscuits`
- `Add 10 soap`
- `How many milk powder packets are left?`

For inventory-changing actions such as sales and stock additions, the system requests user confirmation before updating the database.

---

### Text-to-Speech

`expo-speech` is used to provide spoken feedback where a suitable voice is supported by the device or platform.

This can help users who are more comfortable interacting through speech rather than reading or typing.

---

### Demand Forecasting

KadaiAI uses a staged forecasting approach depending on the amount of historical sales data available.

The current approach is:

- **No history:** no artificial forecast is generated
- **Limited history:** 7-day moving-average baseline
- **Sufficient history:** Random Forest regression

The Random Forest model uses features including:

- time index
- weekday
- lag-1 sales
- lag-7 sales
- rolling 7-day average

This design allows the system to handle the cold-start problem without presenting unsupported predictions.

---

### Smart Restocking Recommendations

The restocking recommendation component combines:

- predicted demand
- current inventory level
- safety stock
- product unit cost
- available purchasing budget

The system recommends quantities to purchase while attempting to remain within the user's available budget.

These recommendations are intended to support the shop owner rather than automatically place orders.

---

### Invoice OCR

Supplier invoice images are preprocessed using Pillow and processed using Tesseract OCR.

The OCR component extracts:

- raw text
- recognized lines
- candidate invoice-related lines

OCR results require manual review before they are used for inventory updates.

This reduces the risk of incorrect OCR output directly changing stock information.

---

## 3. Evaluation

### Voice / Command Understanding

A total of **20 voice test cases** have currently been completed.

The current evaluation consists of:

- **10 English voice commands**
- **10 Tamil voice commands**

Sinhala voice testing is still pending and will be completed separately with a Sinhala-speaking tester.

Current results:

- **Intent accuracy:** 85.0%
- **Product identification accuracy:** 100.0%
- **Quantity extraction accuracy:** 95.0%
- **End-to-end parser accuracy:** 85.0%

The evaluation uses the actual Speech-to-Text transcript produced by the application rather than manually corrected text.

This means speech-recognition errors are preserved in the test data and contribute to the final end-to-end result.

Observed failures included cases where Speech-to-Text produced alternative wording or incorrectly recognized parts of the spoken command.

---

### Forecasting

Products available in the current test database:

**4**

Products with sufficient historical sales data for reliable forecasting evaluation:

**0**

Moving-average MAE:

**Not available – insufficient historical sales data**

Random Forest MAE:

**Not available – insufficient historical sales data**

The current prototype does not yet contain enough real historical sales observations to perform a reliable forecasting backtest.

Rather than generating artificial accuracy values, KadaiAI reports this limitation directly.

The forecasting pipeline is implemented and can use the moving-average or Random Forest approach once sufficient sales history becomes available.

---

### Restocking Recommendation

Budget and consistency testing was performed using three purchasing-budget scenarios.

Results:

**3 / 3 tests passed**

The tests verified that:

- recommended quantities are positive
- estimated spending remains within the provided budget
- reported remaining budget is consistent with recommended spending

Therefore, all implemented budget-safety checks passed during the current evaluation.

---

### Invoice OCR

Synthetic test invoices evaluated:

**3**

Mean token-level F1:

**86.41%**

The OCR evaluation used controlled synthetic invoice test fixtures with manually prepared ground-truth text.

The three test invoices included different conditions such as:

- a clear invoice
- a slightly rotated invoice
- a lower-contrast invoice

Therefore, the reported **86.41% token-level F1 score** measures OCR performance under controlled software testing conditions and is **not presented as real-world supplier invoice accuracy**.

A typical OCR error observed during testing was a small character-level recognition error such as confusing characters in the word `KadaiAI`.

---

## 4. Software Validation

### Backend Automated Tests

The backend automated test suite was executed using `pytest`.

Result:

**21 tests passed**

Two deprecation warnings were reported by third-party FastAPI/Starlette dependencies, but no backend test failed.

The saved test evidence is available at:

`docs/evidence/final_pytest.txt`

---

### Frontend Lint Check

The Expo frontend was checked using:

`npx expo lint`

The final lint run completed successfully with:

**Exit code: 0**

The saved lint evidence is available at:

`docs/evidence/frontend_lint.txt`

---

## 5. Human-in-the-Loop Control

Inventory-changing voice operations follow the workflow:

**Speech → Speech-to-Text → command parsing → product/quantity detection → user confirmation → backend API → database update**

Actions such as:

- recording a sale
- adding stock

require confirmation before the inventory is changed.

Stock queries do not modify inventory and therefore do not require confirmation.

Invoice OCR also follows a human-in-the-loop approach.

The extracted invoice text is shown for manual review rather than automatically updating stock quantities.

This reduces the risk of incorrect speech recognition, command parsing, or OCR results causing unintended inventory changes.

---

## 6. Limitations

The current prototype has several limitations.

- Speech recognition accuracy depends on microphone quality, environmental noise, accent, browser/device recognition services, and language support.
- English and Tamil voice commands have been evaluated, while Sinhala voice evaluation is still pending.
- Keyword and fuzzy command parsing may fail on previously unseen wording or unusual Speech-to-Text output.
- Product aliases and language variations may need to be expanded as more real users test the system.
- Forecasting quality depends on having sufficient representative historical sales data.
- New products experience a cold-start problem because historical demand information is unavailable.
- The current dataset does not contain enough historical sales observations to report forecasting MAE.
- OCR accuracy depends on image resolution, lighting, blur, skew, invoice layout, fonts, and installed Tesseract language packs.
- The current OCR accuracy was measured using synthetic controlled test invoices and should not be interpreted as real-world invoice accuracy.
- Restocking recommendations do not currently model every possible factor such as supplier availability, shelf life, promotions, delivery lead time, or detailed cash-flow constraints.
- AI-generated or automatically extracted outputs are treated as decision-support information rather than fully autonomous actions.

---

## 7. Evidence

Evaluation outputs and supporting files are stored under:

`docs/evidence/`

Current evidence includes:

- voice test cases
- voice evaluation results
- voice evaluation summary
- forecasting evaluation results
- forecasting evaluation summary
- restocking recommendation test results
- OCR test manifest
- OCR results
- OCR evaluation summary
- synthetic OCR invoice test fixtures
- backend pytest results
- frontend lint results
- screenshots of selected AI features and tests

Only results obtained from completed tests are reported.

The Sinhala voice evaluation will be added after the remaining Sinhala test cases are completed.