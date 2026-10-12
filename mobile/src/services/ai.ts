import { API_BASE_URL } from './api';
import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';

export type AIIntent =
  | 'sale'
  | 'add_stock'
  | 'query_stock'
  | 'unknown';

export interface ParsedCommand {
  intent: AIIntent;
  product_id?: number | null;
  product_name?: string | null;
  quantity?: number | null;
  current_stock?: number | null;
  confidence: number;
  needs_confirmation: boolean;
  raw_text: string;
  message: string;
}

export interface RecommendationItem {
  product_id: number;
  product_name: string;
  current_stock: number;
  forecast_demand: number;
  safety_stock: number;
  required_quantity: number;
  recommended_quantity: number;
  unit_cost: number;
  estimated_cost: number;
  reason: string;
}

export interface RecommendationResponse {
  budget: number;
  horizon_days: number;
  estimated_spend: number;
  remaining_budget: number;
  items: RecommendationItem[];
}

export interface InvoiceDetectedItem {
  product_id: number;
  product_name: string;
  quantity: number;
  source_line: string;
  confidence: number;
}

export interface InvoiceResult {
  language: string;
  shop_id: number;
  raw_text: string;
  lines: string[];
  candidate_lines: string[];
  detected_items: InvoiceDetectedItem[];
  note: string;
}

async function getError(
  response: Response
) {
  try {
    const data = await response.json();

    return (
      data.message ||
      data.detail ||
      `HTTP ${response.status}`
    );
  } catch {
    return `HTTP ${response.status}`;
  }
}

export async function parseVoiceCommand(
  text: string,
  shopId: number = 1
): Promise<ParsedCommand> {
  const response = await fetch(
    `${API_BASE_URL}/api/ai/parse-command`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        shop_id: shopId,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await getError(response)
    );
  }

  return response.json();
}

export async function getRecommendations(
  budget: number,
  shopId: number = 1
): Promise<RecommendationResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/ai/recommendations`
      + `?budget=${budget}`
      + `&shop_id=${shopId}`
      + `&horizon_days=7`
  );

  if (!response.ok) {
    throw new Error(
      await getError(response)
    );
  }

  return response.json();
}

export async function scanInvoice(
  uri: string,
  language: string,
  shopId: number = 1
): Promise<InvoiceResult> {
  const url =
    `${API_BASE_URL}/api/ai/invoice-ocr`
    + `?language=${encodeURIComponent(language)}`
    + `&shop_id=${shopId}`;

  // WEB
  if (Platform.OS === 'web') {
    const imageResponse = await fetch(uri);

    if (!imageResponse.ok) {
      throw new Error(
        'Unable to read the selected invoice image.'
      );
    }

    const blob = await imageResponse.blob();

    const extension =
      blob.type === 'image/png'
        ? 'png'
        : blob.type === 'image/webp'
          ? 'webp'
          : 'jpg';

    const formData = new FormData();

    formData.append(
      'file',
      blob,
      `invoice.${extension}`
    );

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(
        await getError(response)
      );
    }

    return response.json();
  }

  // ANDROID / IOS
  const file = new File(uri);

  const formData = new FormData();

  formData.append(
    'file',
    file as any
  );

  const response = await expoFetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(
      await getError(response)
    );
  }

  return response.json();
}