import { API_BASE_URL } from './api';


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


export interface InvoiceResult {

  language: string;

  raw_text: string;

  lines: string[];

  candidate_lines: string[];

  note: string;
}


async function getError(
  response: Response
) {

  try {

    const data =
      await response.json();

    return (
      data.message
      || data.detail
      || `HTTP ${response.status}`
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
        'Content-Type':
          'application/json'
      },

      body: JSON.stringify({
        text,
        shop_id: shopId
      })
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
  language: string
): Promise<InvoiceResult> {

  const formData =
    new FormData();

  formData.append(
    'file',
    {
      uri,
      name: 'invoice.jpg',
      type: 'image/jpeg'
    } as any
  );

  const response = await fetch(

    `${API_BASE_URL}/api/ai/invoice-ocr`
    + `?language=${language}`,

    {
      method: 'POST',
      body: formData
    }
  );

  if (!response.ok) {

    throw new Error(
      await getError(response)
    );

  }

  return response.json();

}