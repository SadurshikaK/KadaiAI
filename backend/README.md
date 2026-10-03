# KadaiAI Backend API & Database

Backend service and database system for **KadaiAI** — a multilingual inventory assistant for small Sri Lankan retailers.

Built by **Member 2** (Backend + Database + Inventory System).

---

## Architecture Overview

```
Expo / React Native Frontend (Mobile)
             │
             │ HTTP REST API
             ▼
      FastAPI Backend (Python)
             │
             ▼
   Supabase / PostgreSQL
             │
   ┌─────────┴─────────┐
   ▼                   ▼
Products             Sales
   │                   │
Inventory           History
   │
Low Stock
```

---

## Tech Stack

- **Framework**: FastAPI (Python 3.11+)
- **Database**: Supabase / PostgreSQL (with automatic SQLite fallback for zero-setup local offline development and automated testing)
- **ORM & Validation**: SQLAlchemy 2.0 + Pydantic v2
- **Testing**: pytest + FastAPI TestClient (HTTPX)
- **Timezone**: `Asia/Colombo` (Sri Lanka Time UTC+5:30)

---

## 1. Prerequisites

- Python 3.11 or Python 3.12 (Check with `python --version` or `py -0`)
- Git

---

## 2. Environment Setup

From the repository root:

```bash
cd backend
```

Create and activate a virtual environment:

### Windows (PowerShell or Command Prompt):
```powershell
python -m venv .venv
.\.venv\Scripts\activate
```

### macOS / Linux:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install required dependencies:
```bash
pip install -r requirements.txt
```

Create your `.env` file from the example:
```bash
cp .env.example .env
```
*(On Windows PowerShell, use `copy .env.example .env`)*

---

## 3. Database & Supabase Setup

You can run the backend in two ways:

### Option A: Local SQLite (Zero Setup, Instant)
No configuration needed! By default, `DATABASE_URL` in `.env.example` points to `sqlite:///./kadai.db`. The application automatically creates all tables and the default demo shop on startup.

### Option B: Supabase (PostgreSQL Cloud)
1. Go to [https://supabase.com](https://supabase.com) and create a free project (e.g. `kadaiai-db`).
2. Go to **Project Settings** -> **Database** -> **Connection string** -> Select **URI** (or Transaction Pooler).
3. Copy the URI (replace `[YOUR-PASSWORD]` with your database password).
4. Update your `backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres.xxxx:your_password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
5. In Supabase Dashboard, open **SQL Editor**, open the file [supabase_schema.sql](supabase_schema.sql), paste its content, and click **Run**.
   This will create the 4 tables (`shops`, `products`, `sales`, `stock_transactions`), the demo shop, performance indexes, and sample data.

---

## 4. Database Schema

The database contains 4 relational tables:

1. **`shops`**:
   - `id` (INTEGER, Primary Key)
   - `name` (VARCHAR, e.g. "Kadai Main Shop")
   - `created_at` (TIMESTAMP WITH TIME ZONE)

2. **`products`**:
   - `id` (INTEGER, Primary Key)
   - `shop_id` (INTEGER, FK -> shops.id)
   - `name` (VARCHAR, Product title)
   - `category` (VARCHAR, e.g. "Dairy", "Grocery", "Snacks")
   - `barcode` (VARCHAR, optional barcode/SKU)
   - `selling_price` (NUMERIC, selling price in LKR)
   - `cost_price` (NUMERIC, optional wholesale purchase cost)
   - `quantity` (INTEGER, current on-hand inventory)
   - `low_stock_threshold` (INTEGER, default 5)
   - `image_url` (TEXT, optional image URI)
   - `created_at`, `updated_at` (TIMESTAMP)

3. **`sales`**:
   - `id` (INTEGER, Primary Key)
   - `shop_id` (INTEGER, FK -> shops.id)
   - `product_id` (INTEGER, FK -> products.id)
   - `quantity` (INTEGER, units sold)
   - `unit_price` (NUMERIC, price per unit at sale time)
   - `total_amount` (NUMERIC, quantity * unit_price)
   - `created_at` (TIMESTAMP WITH TIME ZONE)

4. **`stock_transactions`**:
   - `id` (INTEGER, Primary Key)
   - `shop_id` (INTEGER, FK -> shops.id)
   - `product_id` (INTEGER, FK -> products.id)
   - `transaction_type` (VARCHAR: `SALE`, `STOCK_IN`, `ADJUSTMENT`)
   - `quantity` (INTEGER, positive or negative inventory movement)
   - `note` (TEXT, audit reason)
   - `created_at` (TIMESTAMP WITH TIME ZONE)

---

## 5. Running the Backend

Ensure your virtual environment is active:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Once running:
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative Redoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## 6. API Endpoints

### 🛒 Products
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products` | Retrieve all products in inventory |
| `GET` | `/api/products/{id}` | Retrieve details for a single product |
| `POST` | `/api/products` | Create a new product |
| `PUT` | `/api/products/{id}` | Update product details |
| `DELETE` | `/api/products/{id}` | Delete product (prevented if sales exist) |
| `GET` | `/api/products/search?q={query}` | Search by name, category, or barcode (For Voice AI) |

### 💰 Sales
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sales` | Record a sale, deduct stock, prevent negative stock |
| `GET` | `/api/sales/today` | Total revenue, transactions count, items sold today (Sri Lanka time) |
| `GET` | `/api/sales/history?limit=50` | Recent sales transaction log |

### 📦 Stock Management
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/stock/add` | Add stock (supplier delivery), increases inventory |

### ⚠️ Inventory & Alerts
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/inventory/low-stock` | Products where `quantity <= low_stock_threshold` |
| `GET` | `/api/inventory/low-stock/count` | Total count of low-stock products |

### 📊 Dashboard
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard` | Consolidated metrics for Home screen: `today_sales`, `sales_count`, `low_stock_count`, `total_products` |

### 🌱 Demo Seed Data
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/seed` | Seed default Sri Lankan products (Milk Powder, Biscuits, Soap, Rice) |

---

## 7. Example Requests & Responses

### 1. Record a Sale (Sell Product)
**Request**:
```http
POST /api/sales HTTP/1.1
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 2
}
```

**Response (201 Created)**:
```json
{
  "id": 1,
  "shop_id": 1,
  "product_id": 1,
  "product_name": "Milk Powder",
  "quantity": 2,
  "unit_price": 450.0,
  "total_amount": 900.0,
  "remaining_stock": 18,
  "created_at": "2026-10-03T10:00:00"
}
```

### 2. Add Stock (Add Purchased Items)
**Request**:
```http
POST /api/stock/add HTTP/1.1
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 10,
  "note": "Supplier delivery"
}
```

**Response (200 OK)**:
```json
{
  "product_id": 1,
  "product_name": "Milk Powder",
  "previous_stock": 18,
  "added_quantity": 10,
  "new_stock": 28,
  "note": "Supplier delivery",
  "updated_at": "2026-10-03T10:05:00"
}
```

### 3. Get Dashboard Metrics (For Home Screen)
**Request**:
```http
GET /api/dashboard HTTP/1.1
```

**Response (200 OK)**:
```json
{
  "today_sales": 900.0,
  "sales_count": 1,
  "low_stock_count": 2,
  "total_products": 4
}
```

---

## 8. Frontend Connection Guide (For Member 1)

When running the mobile app on a physical device with Expo Go, `localhost` points to the mobile phone itself!
Instead, use your computer's local Wi-Fi IP address:

1. Find your IP on Windows: Run `ipconfig` (e.g. `192.168.1.100`).
2. Point your API client in `mobile/` to:
   ```ts
   const API_BASE_URL = 'http://192.168.1.100:8000';
   ```
3. Example fetching dashboard in `home.tsx`:
   ```ts
   const res = await fetch(`${API_BASE_URL}/api/dashboard`);
   const data = await res.json();
   // data.today_sales => "Rs. " + data.today_sales
   // data.low_stock_count => `${data.low_stock_count} products need attention`
   ```

---

## 9. Voice & AI Integration Guide (For Member 3)

Member 3's AI/Voice pipeline should integrate as follows:

1. **Voice Query / Search**:
   ```http
   GET /api/products/search?q=milk
   ```
   Returns matching products with their `id`, `name`, `selling_price`, and current `quantity`.

2. **Confirmation Safeguard**:
   - The AI must **never** mutate the database directly.
   - The AI parses the speech into a structured draft (e.g., action: `sale`, product_id: `1`, quantity: `2`).
   - The mobile UI displays a confirmation popup to the shop owner: *"Sell 2x Milk Powder for Rs. 900?"*.
   - Only when the user taps "Confirm" does the app send `POST /api/sales`.

---

## 10. Automated Testing

To run the automated test suite covering all 12 core scenarios and edge cases:

```bash
cd backend
pytest -v
```

All tests execute against an isolated in-memory test database and pass with zero configuration.
