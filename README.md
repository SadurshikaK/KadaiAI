# KadaiAI

**Multilingual AI Inventory Assistant for Sri Lankan Retailers**

KadaiAI is a mobile-first inventory, sales, and smart restocking assistant designed for small and medium-scale retail shops in Sri Lanka.

The platform combines traditional inventory management with multilingual AI-assisted workflows to help shop owners:

- manage products and stock,
- record sales,
- identify low-stock items,
- use English, Tamil, and Sinhala voice commands,
- receive budget-aware restocking recommendations,
- process supplier invoices using OCR,
- and review AI suggestions before any important inventory change is made.

KadaiAI follows a **human-in-the-loop** design principle:

> **AI assists the shop owner, but important inventory changes remain visible and require human confirmation.**

---

## System Architecture

```text
┌─────────────────────────────────────────────┐
│        Expo / React Native Mobile App       │
│                                             │
│  English • Tamil • Sinhala                  │
│  Inventory • Sales • Voice • OCR • AI       │
└──────────────────────┬──────────────────────┘
                       │
                       │ REST API
                       │ JSON / Multipart
                       ▼
┌─────────────────────────────────────────────┐
│              FastAPI Backend                │
│                                             │
│  Product & Stock Management                 │
│  Sales Processing                           │
│  Multilingual Command Parsing               │
│  Invoice OCR & Product Matching             │
│  Demand Forecasting                         │
│  Smart Restocking Recommendations           │
└──────────────────────┬──────────────────────┘
                       │
                       │ SQLAlchemy
                       ▼
┌─────────────────────────────────────────────┐
│                Data Layer                   │
│                                             │
│  Supabase PostgreSQL                        │
│  SQLite fallback for local development      │
└─────────────────────────────────────────────┘
```

The mobile application does not directly modify the database. Business operations are validated and processed through the FastAPI backend.

---

# Core Features

## 1. Inventory Management

KadaiAI provides the core functionality required to manage a small retail inventory.

Features include:

- Add products
- View all products
- Edit product information
- Delete products
- Search by name, category, or barcode
- Track selling price and cost price
- Monitor current stock quantity
- Configure low-stock thresholds
- Identify products requiring restocking
- Maintain an inventory transaction history

Products can be categorized using stock conditions such as:

```text
CRITICAL
LOW
HEALTHY
```

---

## 2. Sales Management

KadaiAI supports product sales through manual and AI-assisted workflows.

A typical sale follows:

```text
Select Product
      ↓
Enter Quantity
      ↓
Validate Available Stock
      ↓
Confirm Sale
      ↓
Record Sale
      ↓
Reduce Product Quantity
      ↓
Record SALE Stock Transaction
      ↓
Refresh Dashboard
```

The backend prevents sales that would create negative inventory.

---

## 3. Stock Replenishment

Stock can be added to existing products through the mobile application.

The workflow is:

```text
Select Product
      ↓
Enter Restock Quantity
      ↓
Optional Note
      ↓
Confirm
      ↓
POST /api/stock/add
      ↓
Increase Product Quantity
      ↓
Record STOCK_IN Transaction
```

Zero or negative stock additions are rejected by backend validation.

---

## 4. Live Dashboard

The dashboard provides a quick overview of current shop activity.

It includes:

- Today's sales
- Low-stock count
- Inventory alerts
- Quick access to sales
- Quick access to stock addition
- Shopping recommendations
- Voice assistant access

Dashboard information is retrieved from the backend rather than being hard-coded in the mobile UI.

---

# Multilingual Support

KadaiAI is designed for Sri Lankan retail environments and supports:

- **English**
- **Tamil — தமிழ்**
- **Sinhala — සිංහල**

The application includes multilingual interface text and AI-assisted command handling.

---

# Multilingual Voice Assistant

KadaiAI supports natural-language inventory commands.

Example English commands:

```text
Sold 3 biscuits
Add 5 soap
How much rice is left?
```

Equivalent Tamil and Sinhala commands can also be interpreted.

The command-processing pipeline extracts information such as:

```text
Intent
Product
Quantity
Current Stock
Confidence
Confirmation Requirement
```

Supported primary intents include:

```text
sale
add_stock
query_stock
```

### Human Confirmation

Voice-generated inventory actions are not silently executed.

The application can show:

```text
Transcript
Action
Product
Quantity
Confidence
```

before the user confirms the operation.

The transcript can also be reviewed or corrected before submission.

---

# Invoice AI

KadaiAI includes an AI-assisted supplier invoice workflow.

Users can provide an invoice image from the device and allow the system to extract stock information.

The workflow is:

```text
Invoice Image
      ↓
Image Preprocessing
      ↓
Tesseract OCR
      ↓
Extract Raw Text
      ↓
Identify Invoice Lines
      ↓
Match Known Products
      ↓
Extract Quantities
      ↓
Calculate Match Confidence
      ↓
Human Review
      ↓
Edit Quantities if Required
      ↓
Confirm & Add to Inventory
      ↓
Stock Update
```

## Supported Quantity Patterns

The invoice parser can handle patterns such as:

```text
Milk Powder x 5
Milk Powder × 5
5x Milk Powder
Milk Powder Qty 5
Milk Powder Qty: 5
5 Milk Powder
Milk Powder 5
```

It also supports table-style invoice lines such as:

```text
Milk Powder    2    450.00    900.00
Biscuits       5    100.00    500.00
Soap           3    180.00    540.00
```

---

## Fuzzy Product Matching

OCR text is not always perfect.

For example:

```text
Milk Powdr
```

can still be compared against:

```text
Milk Powder
```

using fuzzy product matching.

KadaiAI uses **RapidFuzz** to compare OCR text against known products in the shop database.

Results include a confidence value so uncertain matches can be reviewed.

Typical confidence presentation:

```text
High Confidence
Medium Confidence
Low Confidence
```

Low-confidence detections are not treated as certain inventory updates.

---

## Human-Reviewed Invoice Updates

Detected invoice quantities remain editable.

For example:

```text
Milk Powder

Detected Quantity: 5

[-] [ 5 ] [+]

Confidence: 94%
```

The user can modify the value before confirmation.

Inventory changes only occur after:

```text
Confirm & Add to Inventory
```

Unmatched invoice lines are preserved for review rather than automatically added to inventory.

Raw OCR text can also be inspected by the user.

---

# AI Shopping Recommendations

KadaiAI provides intelligent restocking recommendations.

Recommendations can consider:

- Current stock
- Low-stock threshold
- Forecast demand
- Safety stock
- Product cost
- Available budget
- Restocking urgency

Example:

```text
Product: Biscuits

Current Stock: 6
Forecast Demand: 14
Safety Stock: 4

Recommended Quantity: 12

Reason:
Current inventory may be insufficient for expected demand.
```

Recommendations are intended as **decision support**.

The shop owner remains responsible for the final purchasing decision.

---

# Demand Forecasting

The backend includes demand forecasting logic based on sales history.

The forecasting workflow can use:

- Recent sales history
- Moving averages
- Weekday patterns
- Lag features
- Random Forest regression when sufficient data is available

When historical sales data is insufficient, KadaiAI uses conservative fallback logic rather than presenting unsupported model predictions.

This is particularly important during cold-start operation for new shops or newly added products.

---

# Human-in-the-Loop AI

KadaiAI intentionally separates:

```text
AI Interpretation
      ↓
Human Review
      ↓
Human Confirmation
      ↓
Business Action
```

This principle applies to:

- Voice-recorded sales
- Voice-based stock additions
- Invoice OCR stock additions
- AI shopping recommendations

AI output is treated as assistance rather than an unquestionable source of truth.

---

# Technology Stack

## Mobile Application

| Technology | Purpose |
|---|---|
| React Native | Cross-platform mobile UI |
| Expo | Application development and device testing |
| TypeScript | Strongly typed frontend development |
| Expo Router | File-based application routing |
| Expo Image Picker | Invoice image selection / capture |
| Expo Speech Recognition | Speech-to-text input |
| Expo Speech | Text-to-speech support |
| React Context | Multilingual application state |

---

## Backend

| Technology | Purpose |
|---|---|
| Python | Backend and AI implementation |
| FastAPI | REST API framework |
| Uvicorn | ASGI application server |
| SQLAlchemy | Database ORM |
| Pydantic | Request / response validation |
| Psycopg | PostgreSQL database connectivity |
| Pytest | Automated backend testing |

---

## Database

| Technology | Purpose |
|---|---|
| Supabase PostgreSQL | Persistent cloud database |
| SQLite | Local development / fallback database |

The active database is determined using the backend `DATABASE_URL`.

---

## AI and Data Processing

| Technology | Purpose |
|---|---|
| RapidFuzz | Fuzzy product-name matching |
| Tesseract OCR | Invoice text extraction |
| Pytesseract | Python interface to Tesseract |
| Pillow | Invoice image preprocessing |
| Scikit-learn | Demand forecasting |
| Rule-based NLP | Multilingual command interpretation |
| Moving-average logic | Forecast fallback |
| Budget-aware optimization | Smart restocking |

---

# Project Structure

```text
KadaiAI/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── seed.py
│   │   │
│   │   ├── models/
│   │   │   ├── shop.py
│   │   │   ├── product.py
│   │   │   ├── sale.py
│   │   │   └── stock_transaction.py
│   │   │
│   │   ├── schemas/
│   │   │
│   │   ├── services/
│   │   │
│   │   └── routers/
│   │       ├── products.py
│   │       ├── sales.py
│   │       ├── stock.py
│   │       ├── inventory.py
│   │       ├── dashboard.py
│   │       ├── seed.py
│   │       └── ai.py
│   │
│   ├── tests/
│   ├── scripts/
│   ├── requirements.txt
│   └── supabase_schema.sql
│
├── mobile/
│   ├── src/
│   │   ├── app/
│   │   │   ├── index.tsx
│   │   │   ├── onboarding.tsx
│   │   │   ├── home.tsx
│   │   │   ├── inventory.tsx
│   │   │   ├── sell.tsx
│   │   │   ├── add-stock.tsx
│   │   │   ├── low-stock.tsx
│   │   │   ├── voice.tsx
│   │   │   ├── invoice-ai.tsx
│   │   │   ├── ai-shopping.tsx
│   │   │   └── shopping-list.tsx
│   │   │
│   │   ├── context/
│   │   ├── constants/
│   │   └── services/
│   │       ├── api.ts
│   │       └── ai.ts
│   │
│   ├── app.json
│   └── package.json
│
└── README.md
```

---

# Database Design

KadaiAI currently uses four primary database entities.

## `shops`

Represents a retail shop.

Example information:

```text
id
name
address
created_at
```

---

## `products`

Stores product catalog and inventory information.

Key fields include:

```text
id
shop_id
name
category
barcode
selling_price
cost_price
quantity
low_stock_threshold
image_url
```

---

## `sales`

Stores completed sales transactions.

Typical fields include:

```text
id
shop_id
product_id
quantity
unit_price
total_amount
timestamp
```

---

## `stock_transactions`

Provides an audit trail for inventory changes.

Transaction types include:

```text
SALE
STOCK_IN
ADJUSTMENT
```

---

# REST API

FastAPI provides interactive Swagger documentation at:

```text
http://127.0.0.1:8000/docs
```

## Products

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/products` | List products |
| `GET` | `/api/products/{id}` | Retrieve product |
| `POST` | `/api/products` | Create product |
| `PUT` | `/api/products/{id}` | Update product |
| `DELETE` | `/api/products/{id}` | Delete product |
| `GET` | `/api/products/search?q=` | Search products |

---

## Sales

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/sales` | Record a sale |
| `GET` | `/api/sales/today` | Today's sales |
| `GET` | `/api/sales/history` | Recent sales history |

---

## Stock & Inventory

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/stock/add` | Add stock |
| `GET` | `/api/inventory/low-stock` | List low-stock products |
| `GET` | `/api/inventory/low-stock/count` | Count low-stock products |

---

## Dashboard

```http
GET /api/dashboard
```

Returns consolidated dashboard information such as sales and inventory alerts.

---

## AI

Important AI endpoints include:

```http
POST /api/ai/parse-command
POST /api/ai/invoice-ocr
GET  /api/ai/forecast/{product_id}
GET  /api/ai/recommendations
```

---

## Demo Data

Demo products can be initialized through the seed API.

Depending on the current build, the project supports operations such as:

```http
POST /api/seed
```

and a competition-demo reset endpoint where enabled.

---

# Setup and Installation

## Prerequisites

Install:

- Git
- Python 3.11+
- Node.js
- npm
- Expo Go or an Android development build
- Tesseract OCR for full invoice OCR support

For multilingual OCR, Tesseract language data may also be installed for:

```text
eng
tam
sin
```

---

# 1. Clone the Repository

```bash
git clone https://github.com/SadurshikaK/KadaiAI.git
cd KadaiAI
```

---

# 2. Backend Setup

Navigate to the backend:

```powershell
cd backend
```

Create a virtual environment:

```powershell
python -m venv .venv
```

Activate it on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

For macOS / Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

---

## Backend Environment Variables

Create:

```text
backend/.env
```

Example:

```env
APP_ENV=development

HOST=0.0.0.0
PORT=8000

DATABASE_URL=YOUR_DATABASE_CONNECTION_STRING

SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co

CORS_ORIGINS=*

TIMEZONE=Asia/Colombo
```

### Supabase PostgreSQL

For Supabase, use the PostgreSQL connection string provided in the Supabase project dashboard.

For local development on networks where the direct database hostname is unavailable, the Supabase **Session Pooler** connection string can be used.

Do not commit the actual database password.

### SQLite Local Development

A local SQLite connection can also be used where supported:

```env
DATABASE_URL=sqlite:///./kadai.db
```

---

## Run the Backend

```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend is available at:

```text
http://127.0.0.1:8000
```

Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

Health endpoint:

```text
http://127.0.0.1:8000/health
```

---

# 3. Tesseract OCR Setup

Invoice OCR uses Tesseract when processing arbitrary invoice images.

A common Windows installation directory is:

```text
C:\Program Files\Tesseract-OCR
```

If required, temporarily add it to the PowerShell path:

```powershell
$env:Path += ";C:\Program Files\Tesseract-OCR"
```

Verify:

```powershell
tesseract --version
```

List installed languages:

```powershell
tesseract --list-langs
```

Recommended language data:

```text
eng
tam
sin
```

---

# 4. Mobile Application Setup

Open another terminal:

```powershell
cd mobile
```

Install dependencies:

```powershell
npm install
```

Create:

```text
mobile/.env
```

---

## Web / Local Development

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

## Physical Phone

The phone and development computer must be on the same network.

Find the computer IPv4 address:

```powershell
ipconfig
```

Then configure:

```env
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:8000
```

Example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:8000
```

Start Expo:

```powershell
npx expo start -c
```

Then:

- press `w` for the web application, or
- scan the QR code using Expo Go / a compatible development build.

Keep the backend running in a separate terminal.

---

# Functional vs Limited / Mocked

The following table describes the prototype honestly.

| Feature | Status | Notes |
|---|---|---|
| Product inventory | **Functional** | Products are persisted through the backend database layer |
| Product CRUD | **Functional** | Create, read, update, delete and search |
| Sales recording | **Functional** | Backend validates stock and records sales |
| Automatic sale stock deduction | **Functional** | Product quantity changes after confirmed sale |
| Stock replenishment | **Functional** | Uses `/api/stock/add` |
| Stock transaction history | **Functional** | SALE / STOCK_IN / ADJUSTMENT records |
| Low-stock detection | **Functional** | Uses configurable product threshold |
| Dashboard | **Functional** | Uses backend sales and inventory data |
| Multilingual UI | **Functional** | English, Tamil and Sinhala |
| Voice command interpretation | **Functional** | Parses supported multilingual inventory commands |
| Voice confirmation workflow | **Functional** | Inventory-changing actions require review/confirmation |
| Native speech-to-text | **Functional with device/runtime dependency** | Requires compatible speech-recognition support |
| AI shopping recommendations | **Functional** | Uses inventory, budget and demand logic |
| Budget-aware restocking | **Functional** | Recommendation engine respects budget constraints |
| Demand forecasting | **Functional with fallback** | ML when enough data exists; conservative fallback when history is insufficient |
| Invoice image selection | **Functional** | Device gallery/camera workflow |
| Invoice OCR | **Functional with OCR dependency** | Arbitrary-image OCR requires Tesseract |
| Fuzzy invoice product matching | **Functional** | RapidFuzz-based known-product matching |
| Invoice quantity extraction | **Functional** | Supports multiple invoice quantity patterns |
| Editable OCR review | **Functional** | User can inspect/correct extracted quantities |
| OCR confidence display | **Functional** | Supports confidence-based human review |
| Human confirmation before OCR stock update | **Functional** | OCR does not silently update inventory |
| Confirmed invoice inventory addition | **Functional** | Uses existing stock-add workflow |
| Barcode field storage/search | **Functional** | Barcode values can be stored and searched |
| Camera barcode scanner | **Not implemented as a core scanner** | Current workflow uses stored/manual barcode input |
| Supabase PostgreSQL | **Functional when configured** | Used through backend `DATABASE_URL` |
| SQLite fallback | **Functional** | Useful for local development/testing |
| Public cloud deployment | **Optional / not required for prototype** | Local backend can be used for final demonstration |
| Production-scale multi-store deployment | **Future work** | Prototype currently focuses on competition/demo workflows |

### Mocking Policy

No core KadaiAI demonstration workflow is intentionally presented as fake functionality.

Where the real runtime capability depends on:

- native microphone support,
- available historical sales data,
- Tesseract installation,
- or network/database configuration,

the system uses clearly identified fallback or limited behavior rather than claiming unsupported performance.

---

# Testing

## Backend

Run:

```powershell
cd backend
python -m pytest -q
```

The automated suite covers areas including:

- products,
- stock,
- sales,
- low-stock behavior,
- dashboard,
- AI command parsing,
- recommendations,
- and forecasting-related logic.

---

## Frontend Type Checking

```powershell
cd mobile
npx tsc --noEmit
```

---

## Frontend Linting

```powershell
npx expo lint
```

---

# Evaluation Evidence

## Multilingual Voice Commands

A development/regression evaluation was performed using:

```text
10 English commands
10 Tamil commands
10 Sinhala commands
```

Observed development/regression results:

```text
Intent accuracy:       93.33%
Product accuracy:     100.00%
Quantity accuracy:     96.67%
End-to-end accuracy:   93.33%
```

These results are from the project's controlled development/regression dataset and are **not claimed as independent real-world generalization accuracy**.

---

## Recommendation Engine

Controlled recommendation tests include budget-safety validation.

```text
Tests: 3
Passed: 3
Budget safety checks: Passed
```

---

## Invoice OCR

Controlled synthetic invoice samples were used during OCR evaluation.

Observed mean token F1:

```text
86.41%
```

This number is based on controlled synthetic invoice data and should not be interpreted as real-world invoice OCR accuracy across arbitrary retailers and invoice formats.

---

## Forecasting Evaluation

The current prototype dataset may not always contain enough historical observations for a meaningful forecasting benchmark.

KadaiAI therefore avoids inventing forecast accuracy.

When history is insufficient, conservative fallback logic is used.

---

# Demo Data

A demo shop can contain products such as:

```text
Milk Powder
Biscuits
Soap
Rice
```

The seed/reset functionality allows a repeatable competition demonstration without manually rebuilding the database before every demo.

---

# Example End-to-End Demo

```text
Launch KadaiAI
      ↓
Choose English / Tamil / Sinhala
      ↓
View Live Dashboard
      ↓
Record Manual or Voice Sale
      ↓
AI Interprets Command
      ↓
User Reviews and Confirms
      ↓
Inventory Updates
      ↓
Open Invoice AI
      ↓
Select Supplier Invoice
      ↓
OCR Extracts Products + Quantities
      ↓
User Reviews OCR Result
      ↓
Confirm & Add to Inventory
      ↓
View Updated Stock
      ↓
Open AI Shopping
      ↓
Receive Budget-Aware Restocking Suggestions
```

---

# Security

KadaiAI follows several important architecture rules:

### Database Credentials

Database credentials remain in backend environment variables.

They are not stored in mobile application source code.

### Backend-Controlled Inventory

The mobile frontend does not directly manipulate PostgreSQL or Supabase tables.

All important business operations pass through FastAPI.

### Server-Side Validation

Stock quantities and sales are validated on the server before transactions are committed.

### Human Confirmation

AI interpretation does not automatically authorize important inventory operations.

Voice and invoice workflows expose the AI result to the user before the final action.

---

# Prototype Limitations

KadaiAI is currently a competition prototype rather than a production Point-of-Sale platform.

Current limitations include:

- OCR accuracy depends on image quality and invoice layout.
- OCR product matching is strongest for products already registered in the shop database.
- Native speech recognition depends on the device and runtime environment.
- Sinhala and Tamil speech recognition may be affected by pronunciation, noise, and speech-provider quality.
- Demand forecasting quality depends on available historical sales data.
- Controlled evaluation datasets are relatively small.
- A locally hosted backend requires the mobile phone and development computer to communicate over the same network.
- Full authentication and role-based access control are not yet the focus of the prototype.
- Production-scale multi-shop operation requires additional deployment and infrastructure work.

---

# Future Improvements

Potential next steps include:

- Cloud-hosted backend
- Production Android release
- Authentication and shop accounts
- Multiple-shop support
- Offline-first synchronization
- Larger multilingual speech datasets
- Real retailer invoice datasets
- Improved OCR table extraction
- Automatic product onboarding
- Camera barcode scanning
- Larger historical sales datasets
- Stronger demand forecasting
- Expanded analytics
- Improved Sinhala and Tamil speech robustness

---

# Responsible AI

KadaiAI is designed as a decision-support tool.

AI-generated:

- command interpretations,
- OCR results,
- product matches,
- forecasts,
- and purchasing recommendations

may contain errors.

Important actions remain visible to the user and require human review where appropriate.

KadaiAI does not intentionally fabricate:

- sales history,
- retailer adoption,
- model accuracy,
- forecast performance,
- or inventory transactions.

---

# Purpose

KadaiAI aims to make digital inventory management more accessible to everyday Sri Lankan retailers by combining:

```text
Simple Retail Workflows
        +
Multilingual Interaction
        +
AI Assistance
        +
Human Control
```

---

## KadaiAI

**Smart, multilingual inventory assistance for everyday Sri Lankan retail.**
