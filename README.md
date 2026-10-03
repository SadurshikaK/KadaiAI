# KadaiAI

KadaiAI is a multilingual, AI-assisted inventory and sales management platform designed for small and medium-scale retail businesses in Sri Lanka.

The system provides a simple mobile interface for managing products, recording sales, monitoring stock levels, identifying low-stock items, and supporting restocking decisions. KadaiAI is designed to support English, Sinhala, and Tamil, with AI-based features such as voice interaction, OCR, forecasting, and smart restocking assistance.

---

## System Architecture

```text
Expo / React Native Frontend
          ↓
      FastAPI REST API
          ↓
   Supabase PostgreSQL
```

The frontend communicates with the FastAPI backend through REST APIs. Database operations are handled by the backend, while Supabase PostgreSQL is used for persistent storage.

---

## Core Features

### Inventory Management

- Add and manage products
- View available stock
- Search products by name, category, or barcode
- Track selling price and stock quantity
- Configure low-stock thresholds
- Identify products that require restocking

### Sales Management

- Select products for sale
- Enter sales quantities
- Calculate transaction totals
- Validate available stock
- Update inventory after sales
- Record sales transactions
- Maintain stock transaction history

### Stock Management

- Add stock to existing products
- Record restocking quantities
- Maintain stock-in transaction records
- Monitor inventory changes

### Dashboard

- View daily sales information
- Monitor low-stock products
- Access key inventory actions
- View live business information from the backend

### Shopping Assistance

- Identify products requiring restocking
- Generate suggested restocking items
- Support future budget-aware purchasing recommendations

### Multilingual Support

KadaiAI supports:

- English
- Sinhala
- Tamil

---

## AI-Assisted Features

KadaiAI is designed to support intelligent retail operations through features such as:

- Multilingual voice-based transactions
- Voice-assisted product search
- Invoice OCR
- Image-assisted product recognition
- Demand forecasting
- Smart restocking recommendations
- Budget-aware shopping assistance

User confirmation can be used before AI-generated actions modify inventory records.

---

## Technology Stack

### Frontend

- React Native
- Expo
- TypeScript
- Expo Router

### Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- Psycopg

### Database

- Supabase
- PostgreSQL

### AI / Intelligent Services

- Speech processing
- OCR
- Machine learning
- Forecasting
- AI-assisted inventory operations

---

## Project Structure

```text
KadaiAI/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   └── services/
│   │
│   ├── tests/
│   ├── requirements.txt
│   ├── supabase_schema.sql
│   └── .env.example
│
├── mobile/
│   ├── src/
│   │   ├── app/
│   │   ├── context/
│   │   └── services/
│   │
│   ├── package.json
│   └── .env.example
│
└── README.md
```

---

## Database Design

The system uses the following main database entities.

### Shops

Stores information related to individual retail shops.

### Products

Stores product information such as:

- Product name
- Category
- Barcode
- Selling price
- Cost price
- Current stock quantity
- Low-stock threshold
- Product image

### Sales

Stores information related to completed sales transactions.

### Stock Transactions

Maintains records of inventory changes such as:

```text
SALE
STOCK_IN
ADJUSTMENT
```

---

## REST API

The backend exposes REST endpoints for product, sales, inventory, and dashboard operations.

### Products

```http
GET    /api/products
GET    /api/products/{id}
POST   /api/products
PUT    /api/products/{id}
DELETE /api/products/{id}
GET    /api/products/search
```

### Sales

```http
POST /api/sales
GET  /api/sales/today
GET  /api/sales/history
```

### Stock

```http
POST /api/stock/add
```

### Inventory

```http
GET /api/inventory/low-stock
GET /api/inventory/low-stock/count
```

### Dashboard

```http
GET /api/dashboard
```

### System

```http
GET /
GET /health
```

FastAPI provides interactive API documentation through Swagger.

```text
http://127.0.0.1:8000/docs
```

---

## Backend Setup

Navigate to the backend directory:

```powershell
cd backend
```

Create a virtual environment:

```powershell
python -m venv .venv
```

Activate it:

```powershell
.\.venv\Scripts\activate
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Create a `.env` file based on `.env.example`.

Example configuration:

```env
APP_ENV=development
HOST=0.0.0.0
PORT=8000

DATABASE_URL=YOUR_POSTGRES_CONNECTION_STRING

SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co

CORS_ORIGINS=*

TIMEZONE=Asia/Colombo
```

Start the backend:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Frontend Setup

Navigate to the mobile directory:

```powershell
cd mobile
```

Install dependencies:

```powershell
npm install
```

Create a `.env` file.

For local web development:

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
```

For Expo Go on a physical device:

```env
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:8000
```

Start the Expo application:

```powershell
npx expo start
```

---

## Example Sales Flow

```text
User selects product
        ↓
User enters quantity
        ↓
Frontend sends request
        ↓
FastAPI validates stock
        ↓
Sale is recorded
        ↓
Product quantity is updated
        ↓
Stock transaction is recorded
        ↓
Updated information is returned to the frontend
```

---

## Example Stock-In Flow

```text
User selects product
        ↓
User enters restocking quantity
        ↓
Frontend sends stock request
        ↓
FastAPI updates inventory
        ↓
Stock transaction is recorded
        ↓
Updated stock information is displayed
```

---

## Security

- Database credentials are stored in backend environment variables
- Secret keys are not exposed in frontend code
- Database operations are performed through the backend API
- Environment files should not be committed to version control
- Inventory updates are validated by backend business logic

---

## Purpose

KadaiAI aims to provide an accessible digital inventory assistant for small Sri Lankan retailers by combining simple inventory management with multilingual and AI-assisted capabilities.

---

## KadaiAI

**Smart, multilingual inventory management for everyday retail.**
