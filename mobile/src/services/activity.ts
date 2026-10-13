/**
 * Activity Tracker for KadaiAI
 * Supports clean tracking for SALE, STOCK_IN, INVOICE_UPDATE, and VOICE_ACTION events.
 */

export type ActivityType = 'SALE' | 'STOCK_IN' | 'INVOICE_UPDATE' | 'VOICE_ACTION';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  subtitle?: string;
  amount?: string;
  timestamp: string; // ISO date string
}

// Session store for client-side events
let activityStore: ActivityItem[] = [];
const listeners: (() => void)[] = [];

export function logActivity(item: {
  id?: string;
  type: ActivityType;
  title: string;
  subtitle?: string;
  amount?: string;
  timestamp?: string;
}): ActivityItem {
  const newActivity: ActivityItem = {
    id: item.id || `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: item.type,
    title: item.title,
    subtitle: item.subtitle,
    amount: item.amount,
    timestamp: item.timestamp || new Date().toISOString(),
  };

  // Prepend and keep latest 30
  activityStore = [newActivity, ...activityStore.filter((a) => a.id !== newActivity.id)].slice(0, 30);
  listeners.forEach((fn) => fn());
  return newActivity;
}

export function getRecentActivities(): ActivityItem[] {
  return [...activityStore];
}

export function subscribeActivities(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}
