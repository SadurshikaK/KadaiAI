/**
 * KadaiAI Central API Service
 * Connects the Expo / React Native frontend to the FastAPI backend.
 * Uses EXPO_PUBLIC_API_URL for configurable LAN/cloud IP.
 */

// Fallback to local development if EXPO_PUBLIC_API_URL is not set
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// ==========================================
// TypeScript Interfaces Matching Backend Schemas
// ==========================================

export interface Product {
  id: number;
  shop_id: number;
  name: string;
  category: string;
  barcode?: string | null;
  selling_price: number;
  cost_price?: number | null;
  quantity: number;
  low_stock_threshold: number;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductCreatePayload {
  name: string;
  category: string;
  barcode?: string | null;
  selling_price: number;
  cost_price?: number | null;
  quantity?: number;
  low_stock_threshold?: number;
  image_url?: string | null;
  shop_id?: number;
}

export interface ProductUpdatePayload {
  name?: string;
  category?: string;
  barcode?: string | null;
  selling_price?: number;
  cost_price?: number | null;
  quantity?: number;
  low_stock_threshold?: number;
  image_url?: string | null;
}

export interface LowStockProduct {
  id: number;
  name: string;
  category: string;
  quantity: number;
  low_stock_threshold: number;
  selling_price: number;
}

export interface SaleCreatePayload {
  product_id: number;
  quantity: number;
  shop_id?: number;
}

export interface SaleResponse {
  id: number;
  shop_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  remaining_stock: number;
  created_at: string;
}

export interface SaleHistoryItem {
  sale_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  created_at: string;
}

export interface TodaySales {
  total_revenue: number;
  sales_count: number;
  items_sold: number;
}

export interface StockAddPayload {
  product_id: number;
  quantity: number;
  note?: string;
  shop_id?: number;
}

export interface StockAddResponse {
  product_id: number;
  product_name: string;
  previous_stock: number;
  added_quantity: number;
  new_stock: number;
  note?: string | null;
  updated_at: string;
}

export interface DashboardData {
  today_sales: number;
  sales_count: number;
  low_stock_count: number;
  total_products: number;
}

export interface LowStockCountResponse {
  count: number;
}

// ==========================================
// Central Fetch Helper with Proper Error Handling
// ==========================================

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      let errorMessage = `Request failed with status ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.detail) {
          errorMessage = typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail);
        }
      } catch {
        // Fallback to HTTP status text if response is not JSON
        errorMessage = res.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return (await res.json()) as T;
  } catch (error: any) {
    // Distinguish between network failures and application errors
    if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
      throw new Error(
        `Unable to connect to server at ${API_BASE_URL}. Ensure backend is running and reachable.`
      );
    }
    throw error;
  }
}

// ==========================================
// API Methods
// ==========================================

/** Fetch all products for a shop (default shop_id = 1) */
export async function getProducts(shopId: number = 1): Promise<Product[]> {
  return apiFetch<Product[]>(`/api/products?shop_id=${shopId}`);
}

/** Fetch a single product by ID */
export async function getProduct(id: number, shopId: number = 1): Promise<Product> {
  return apiFetch<Product>(`/api/products/${id}?shop_id=${shopId}`);
}

/** Search products by name, category, or barcode */
export async function searchProducts(query: string, shopId: number = 1): Promise<Product[]> {
  return apiFetch<Product[]>(`/api/products/search?q=${encodeURIComponent(query)}&shop_id=${shopId}`);
}

/** Create a new product */
export async function createProduct(payload: ProductCreatePayload): Promise<Product> {
  return apiFetch<Product>('/api/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Update an existing product */
export async function updateProduct(
  id: number,
  payload: ProductUpdatePayload,
  shopId: number = 1
): Promise<Product> {
  return apiFetch<Product>(`/api/products/${id}?shop_id=${shopId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/** Delete a product safely */
export async function deleteProduct(id: number, shopId: number = 1): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/products/${id}?shop_id=${shopId}`, {
    method: 'DELETE',
  });
}

/** Consolidated metrics for Home screen */
export async function getDashboard(shopId: number = 1): Promise<DashboardData> {
  return apiFetch<DashboardData>(`/api/dashboard?shop_id=${shopId}`);
}

/** Get list of low-stock products (quantity <= threshold) */
export async function getLowStockProducts(shopId: number = 1): Promise<LowStockProduct[]> {
  return apiFetch<LowStockProduct[]>(`/api/inventory/low-stock?shop_id=${shopId}`);
}

/** Get low stock count */
export async function getLowStockCount(shopId: number = 1): Promise<number> {
  const data = await apiFetch<LowStockCountResponse>(`/api/inventory/low-stock/count?shop_id=${shopId}`);
  return data.count;
}

/** Record a customer sale (stock deducted atomically on backend) */
export async function createSale(payload: SaleCreatePayload): Promise<SaleResponse> {
  return apiFetch<SaleResponse>('/api/sales', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: payload.shop_id || 1,
      product_id: payload.product_id,
      quantity: payload.quantity,
    }),
  });
}

/** Add inventory stock (supplier delivery) */
export async function addStock(payload: StockAddPayload): Promise<StockAddResponse> {
  return apiFetch<StockAddResponse>('/api/stock/add', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: payload.shop_id || 1,
      product_id: payload.product_id,
      quantity: payload.quantity,
      note: payload.note || 'Supplier delivery',
    }),
  });
}

/** Get today's sales summary */
export async function getTodaySales(shopId: number = 1): Promise<TodaySales> {
  return apiFetch<TodaySales>(`/api/sales/today?shop_id=${shopId}`);
}

/** Get sales transaction history */
export async function getSalesHistory(limit: number = 50, shopId: number = 1): Promise<SaleHistoryItem[]> {
  return apiFetch<SaleHistoryItem[]>(`/api/sales/history?limit=${limit}&shop_id=${shopId}`);
}

/** Seed demo products into database */
export async function seedDemoData(shopId: number = 1): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/api/seed?shop_id=${shopId}`, {
    method: 'POST',
  });
}
