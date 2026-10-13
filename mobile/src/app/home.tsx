import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import AIStatusStrip from '../components/ai-status-strip';
import KadaiBottomNav from '../components/kadai-bottom-nav';
import {
  DashboardData,
  LowStockProduct,
  Product,
  SaleHistoryItem,
  getDashboard,
  getLowStockProducts,
  getProducts,
  getSalesHistory,
} from '../services/api';
import {
  ActivityItem,
  ActivityType,
  getRecentActivities,
  subscribeActivities,
} from '../services/activity';
import { KadaiColors, KadaiRadius, KadaiShadow } from '../constants/kadai-theme';

type HomeBundle = {
  dashboard: DashboardData;
  products: Product[];
  lowStock: LowStockProduct[];
  history: SaleHistoryItem[];
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatShortMoney(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

function formatActivityTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Recently';

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? timeStr : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  } catch {
    return 'Recently';
  }
}

const activityBadgeMeta: Record<
  ActivityType,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  SALE: {
    label: 'SALE',
    icon: 'cart-outline',
    color: KadaiColors.greenDark,
    bg: KadaiColors.mintSoft,
  },
  STOCK_IN: {
    label: 'STOCK IN',
    icon: 'cube-outline',
    color: KadaiColors.blue,
    bg: KadaiColors.blueSoft,
  },
  INVOICE_UPDATE: {
    label: 'INVOICE',
    icon: 'receipt-outline',
    color: KadaiColors.teal,
    bg: KadaiColors.tealSoft,
  },
  VOICE_ACTION: {
    label: 'VOICE AI',
    icon: 'mic-outline',
    color: KadaiColors.amber,
    bg: KadaiColors.amberSoft,
  },
};

export default function HomeScreen() {
  const [data, setData] = useState<HomeBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionActivities, setSessionActivities] = useState<ActivityItem[]>(() =>
    getRecentActivities()
  );

  useEffect(() => {
    return subscribeActivities(() => {
      setSessionActivities(getRecentActivities());
    });
  }, []);

  const load = useCallback(async (manual = false) => {
    try {
      if (manual) setRefreshing(true);
      setError(null);

      const [dashboard, products, lowStock, history] = await Promise.all([
        getDashboard(1),
        getProducts(1),
        getLowStockProducts(1),
        getSalesHistory(50, 1),
      ]);

      setData({ dashboard, products, lowStock, history });
    } catch (err: any) {
      setError(err?.message || 'Unable to reach the KadaiAI backend.');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(false);
      setSessionActivities(getRecentActivities());
    }, [load])
  );

  // Health: only compute when data exists, otherwise null
  const health = useMemo(() => {
    if (!data?.products || data.products.length === 0) return null;
    const healthy = data.products.filter((item) => item.quantity > item.low_stock_threshold).length;
    return Math.round((healthy / data.products.length) * 100);
  }, [data]);

  const insight = data?.lowStock?.[0];

  // 7-day sales calculation
  const sevenDaySales = useMemo(() => {
    if (!data?.history || data.history.length === 0) return null;

    const days: { key: string; label: string; total: number; isToday: boolean }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({
        key,
        label: i === 0 ? 'Today' : weekday,
        total: 0,
        isToday: i === 0,
      });
    }

    let hasAnySales = false;
    for (const sale of data.history) {
      if (!sale.created_at) continue;
      const saleDate = new Date(sale.created_at);
      const saleKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(saleDate.getDate()).padStart(2, '0')}`;
      const match = days.find((d) => d.key === saleKey);
      if (match) {
        match.total += Number(sale.total_amount) || 0;
        if (match.total > 0) hasAnySales = true;
      }
    }

    if (!hasAnySales) return null;

    const maxDay = Math.max(...days.map((d) => d.total), 1);
    const totalWeek = days.reduce((sum, d) => sum + d.total, 0);

    return { days, maxDay, totalWeek };
  }, [data]);

  // Top Selling Products calculation
  const topSellingProducts = useMemo(() => {
    if (!data?.history || data.history.length === 0) return [];

    const map = new Map<number, { id: number; name: string; quantity: number; revenue: number }>();
    for (const sale of data.history) {
      const existing = map.get(sale.product_id);
      if (existing) {
        existing.quantity += Number(sale.quantity) || 0;
        existing.revenue += Number(sale.total_amount) || 0;
      } else {
        map.set(sale.product_id, {
          id: sale.product_id,
          name: sale.product_name,
          quantity: Number(sale.quantity) || 0,
          revenue: Number(sale.total_amount) || 0,
        });
      }
    }

    const items = Array.from(map.values())
      .filter((p) => p.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 3);

    return items;
  }, [data]);

  // Merged Recent Activities (SALE, STOCK_IN, INVOICE_UPDATE, VOICE_ACTION)
  const activities = useMemo(() => {
    const list: ActivityItem[] = [...sessionActivities];

    if (data?.history) {
      for (const sale of data.history) {
        const id = `sale_${sale.sale_id}`;
        if (!list.some((a) => a.id === id)) {
          list.push({
            id,
            type: 'SALE',
            title: `Sold ${sale.quantity} ${sale.product_name}`,
            subtitle: `Unit price: ${money(sale.unit_price)}`,
            amount: money(sale.total_amount),
            timestamp: sale.created_at,
          });
        }
      }
    }

    return list
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [data, sessionActivities]);

  const isOffline = !!error || (!data && !loading);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={KadaiColors.background} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={KadaiColors.greenDark}
            colors={[KadaiColors.greenDark]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.brand}>KadaiAI</Text>
            <Text style={styles.tagline}>Your AI shop assistant</Text>
          </View>
          <Pressable
            style={styles.profileButton}
            onPress={() => router.push('/about')}
            accessibilityRole="button"
            accessibilityLabel="About KadaiAI"
          >
            <Ionicons name="storefront-outline" size={21} color={KadaiColors.primary} />
          </Pressable>
        </View>

        <AIStatusStrip
          status={isOffline ? 'Offline' : loading ? 'Connecting' : 'Connected'}
          busy={loading}
        />

        {/* Greeting block */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.greetingSub}>
            {isOffline
              ? 'Live shop data unavailable'
              : health !== null && health >= 80
                ? 'Your shop looks healthy today.'
                : 'A few stock items need your attention.'}
          </Text>
        </View>

        {/* Offline state banner */}
        {isOffline && (
          <View style={styles.offlineCard}>
            <View style={styles.offlineIcon}>
              <Ionicons name="cloud-offline-outline" size={20} color={KadaiColors.redDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.offlineTitle}>Live shop data unavailable</Text>
              <Text style={styles.offlineText} numberOfLines={2}>
                {error || 'Unable to connect to KadaiAI backend. Please retry.'}
              </Text>
            </View>
            <Pressable
              style={styles.retryButton}
              onPress={() => void load(true)}
              accessibilityRole="button"
              accessibilityLabel="Retry connection"
            >
              <Ionicons name="reload" size={13} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* AI Voice Hero */}
        <Pressable
          style={({ pressed }) => [styles.aiHero, pressed && { opacity: 0.95 }]}
          onPress={() => router.push('/voice')}
          accessibilityRole="button"
          accessibilityLabel="Ask Kadai AI"
        >
          <View style={styles.aiHeroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiEyebrow}>ASK KADAI AI</Text>
              <Text style={styles.aiTitle}>What happened in your shop?</Text>
            </View>
            <View style={styles.micCircle}>
              <Ionicons name="mic" size={25} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.aiExample}>“Sold 3 biscuits”</Text>
          <Text style={styles.aiHint}>Tap to speak in English, தமிழ் or සිංහල</Text>

          <View style={styles.chipRow}>
            <Pressable style={styles.chip} onPress={() => router.push('/low-stock')}>
              <Text style={styles.chipText}>Low stock?</Text>
            </Pressable>
            <Pressable style={styles.chip} onPress={() => router.push('/ai-shopping')}>
              <Text style={styles.chipText}>Restock plan</Text>
            </Pressable>
            <Pressable style={styles.chip} onPress={() => router.push('/voice')}>
              <Text style={styles.chipText}>Check a product</Text>
            </Pressable>
          </View>
        </Pressable>

        {/* Section Label */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{"TODAY'S SHOP"}</Text>
          {isOffline && (
            <Pressable
              onPress={() => void load(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.link}>Retry</Text>
            </Pressable>
          )}
        </View>

        {/* Metric Cards Grid - Shows '--' when offline */}
        {loading && !data && !error ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={KadaiColors.greenDark} />
            <Text style={styles.loadingText}>Loading live shop data…</Text>
          </View>
        ) : (
          <View style={styles.metricsGrid}>
            <MetricCard
              icon="cash-outline"
              value={data ? money(data.dashboard.today_sales) : '--'}
              label="Sales"
            />
            <MetricCard
              icon="receipt-outline"
              value={data ? String(data.dashboard.sales_count) : '--'}
              label="Transactions"
            />
            <MetricCard
              icon="alert-circle-outline"
              value={data ? String(data.dashboard.low_stock_count) : '--'}
              label="Low stock"
              attention={Boolean(data && data.dashboard.low_stock_count > 0)}
            />
            <MetricCard
              icon="pulse-outline"
              value={data && health !== null ? `${health}%` : '--'}
              label="Inventory health"
            />
          </View>
        )}

        {/* 7-Day Sales Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>7-day sales</Text>
          {sevenDaySales && (
            <Text style={styles.sectionSubBadge}>{money(sevenDaySales.totalWeek)}</Text>
          )}
        </View>

        {sevenDaySales ? (
          <View style={styles.chartCard}>
            <View style={styles.barsRow}>
              {sevenDaySales.days.map((day) => {
                const fillRatio =
                  sevenDaySales.maxDay > 0 ? Math.min(1, day.total / sevenDaySales.maxDay) : 0;
                const barHeight =
                  day.total > 0 ? Math.max(10, Math.round(fillRatio * 76)) : 4;

                return (
                  <View key={day.key} style={styles.barCol}>
                    <Text style={styles.barValueText} numberOfLines={1}>
                      {day.total > 0 ? formatShortMoney(day.total) : ''}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: barHeight,
                            backgroundColor: day.isToday
                              ? KadaiColors.primary
                              : day.total > 0
                                ? KadaiColors.greenDark
                                : '#DDE7DF',
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.barLabel,
                        day.isToday && styles.barLabelToday,
                      ]}
                      numberOfLines={1}
                    >
                      {day.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.emptyCardSimple}>
            <Ionicons name="bar-chart-outline" size={22} color={KadaiColors.muted} />
            <Text style={styles.emptyCardText}>Not enough sales data yet</Text>
          </View>
        )}

        {/* Top Selling Products */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top selling products</Text>
          {topSellingProducts.length > 0 && (
            <Text style={styles.sectionSubBadge}>Top 3</Text>
          )}
        </View>

        {topSellingProducts.length > 0 ? (
          <View style={styles.topProductsCard}>
            {topSellingProducts.map((prod, index) => {
              const maxQty = topSellingProducts[0]?.quantity || 1;
              const ratio = Math.min(1, prod.quantity / maxQty);
              const rankColor =
                index === 0 ? '#D97706' : index === 1 ? '#64748B' : '#B45309';
              const rankBg =
                index === 0 ? '#FEF3C7' : index === 1 ? '#F1F5F9' : '#FFEDD5';

              return (
                <View
                  key={prod.id}
                  style={[
                    styles.topProductRow,
                    index !== 0 && styles.rowDivider,
                  ]}
                >
                  <View style={[styles.rankBadge, { backgroundColor: rankBg }]}>
                    <Text style={[styles.rankText, { color: rankColor }]}>#{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={styles.topProductName} numberOfLines={1}>
                      {prod.name}
                    </Text>
                    <View style={styles.topProductProgressTrack}>
                      <View
                        style={[
                          styles.topProductProgressFill,
                          {
                            width: `${Math.max(15, Math.round(ratio * 100))}%`,
                            backgroundColor:
                              index === 0 ? KadaiColors.greenDark : KadaiColors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.topProductQty}>{prod.quantity} sold</Text>
                    <Text style={styles.topProductRevenue}>{money(prod.revenue)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCardSimple}>
            <Ionicons name="trending-up-outline" size={22} color={KadaiColors.muted} />
            <Text style={styles.emptyCardText}>No sales data yet</Text>
          </View>
        )}

        {/* Smart insight card */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Smart insight</Text>
          <Pressable onPress={() => router.push('/ai-shopping')}>
            <Text style={styles.link}>View plan</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.insightCard, !insight && styles.insightHealthy]}
          onPress={() => router.push(insight ? '/low-stock' : '/inventory')}
        >
          <View style={[styles.insightIcon, !insight && styles.insightIconHealthy]}>
            <Ionicons
              name={insight ? 'warning-outline' : 'checkmark-circle-outline'}
              size={22}
              color={insight ? '#9A6700' : KadaiColors.greenDark}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitle}>{insight ? insight.name : 'Inventory is healthy'}</Text>
            <Text style={styles.insightText}>
              {insight
                ? `${insight.quantity} units left. Reorder threshold is ${insight.low_stock_threshold}.`
                : 'No products are currently at or below their reorder threshold.'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={KadaiColors.muted} />
        </Pressable>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.quickGrid}>
          <QuickAction icon="mic-outline" label="Voice sale" onPress={() => router.push('/voice')} />
          <QuickAction icon="scan-outline" label="Scan invoice" onPress={() => router.push('/invoice-ai')} />
          <QuickAction icon="cube-outline" label="Stock" onPress={() => router.push('/inventory')} />
          <QuickAction icon="sparkles-outline" label="Restock" onPress={() => router.push('/ai-shopping')} />
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <Pressable onPress={() => router.push('/inventory')}>
            <Text style={styles.link}>Inventory</Text>
          </Pressable>
        </View>

        <View style={styles.activityCard}>
          {activities.length > 0 ? (
            activities.map((act, index) => {
              const meta = activityBadgeMeta[act.type] || activityBadgeMeta.SALE;
              return (
                <View
                  key={act.id}
                  style={[styles.activityRow, index !== 0 && styles.activityBorder]}
                >
                  <View style={[styles.activityIconWrap, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <View style={styles.activityTitleRow}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {act.title}
                      </Text>
                    </View>
                    <View style={styles.activityMetaRow}>
                      <View style={[styles.activityTypePill, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.activityTypePillText, { color: meta.color }]}>
                          {meta.label}
                        </Text>
                      </View>
                      {act.subtitle && (
                        <Text style={styles.activitySubtitle} numberOfLines={1}>
                          {act.subtitle}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    {act.amount && <Text style={styles.activityAmount}>{act.amount}</Text>}
                    <Text style={styles.activityTime}>{formatActivityTime(act.timestamp)}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyActivity}>
              <Ionicons name="time-outline" size={22} color={KadaiColors.muted} />
              <Text style={styles.emptyActivityText}>No recent activity</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <KadaiBottomNav />
    </SafeAreaView>
  );
}

function MetricCard({
  icon,
  value,
  label,
  attention = false,
}: {
  icon: any;
  value: string;
  label: string;
  attention?: boolean;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, attention && styles.metricIconAttention]}>
        <Ionicons name={icon} size={18} color={attention ? '#9A6700' : KadaiColors.primary} />
      </View>
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.metricLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.85 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={22} color={KadaiColors.primary} />
      </View>
      <Text style={styles.quickLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: KadaiColors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100, // Safe padding preventing bottom navigation overlap on Android
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  brand: {
    fontSize: 28,
    fontWeight: '900',
    color: KadaiColors.primary,
    letterSpacing: -0.7,
  },
  tagline: {
    color: KadaiColors.text2,
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
    lineHeight: 18,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: KadaiColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...KadaiShadow,
  },
  greetingBlock: {
    marginTop: 2,
  },
  greeting: {
    fontSize: 25,
    fontWeight: '900',
    color: KadaiColors.text,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  greetingSub: {
    fontSize: 14,
    color: KadaiColors.text2,
    marginTop: 4,
    lineHeight: 20,
  },
  offlineCard: {
    backgroundColor: KadaiColors.redSoft,
    borderColor: '#F8CACA',
    borderWidth: 1,
    borderRadius: KadaiRadius.large,
    padding: 13,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  offlineIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: KadaiColors.redDark,
  },
  offlineText: {
    fontSize: 11.5,
    color: '#934139',
    marginTop: 2,
    lineHeight: 16,
  },
  retryButton: {
    backgroundColor: KadaiColors.redDark,
    borderRadius: KadaiRadius.medium,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  aiHero: {
    backgroundColor: KadaiColors.primary,
    borderRadius: KadaiRadius.xl,
    padding: 20,
    overflow: 'hidden',
    ...KadaiShadow,
  },
  aiHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  aiEyebrow: {
    color: '#A7F3D0',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  aiTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 21,
    marginTop: 5,
    lineHeight: 27,
  },
  micCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#22A05B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#48C77D',
  },
  aiExample: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 18,
    lineHeight: 23,
  },
  aiHint: {
    color: '#CDEDD8',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  chip: {
    borderRadius: KadaiRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    minHeight: 34,
    justifyContent: 'center',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  sectionLabel: {
    color: KadaiColors.muted,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  loadingCard: {
    minHeight: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: KadaiRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: KadaiColors.border,
  },
  loadingText: {
    color: KadaiColors.text2,
    fontSize: 13,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: KadaiRadius.large,
    borderWidth: 1,
    borderColor: KadaiColors.border,
    padding: 14,
    ...KadaiShadow,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: KadaiColors.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricIconAttention: {
    backgroundColor: KadaiColors.amberSoft,
  },
  metricValue: {
    fontSize: 21,
    fontWeight: '900',
    color: KadaiColors.text,
    letterSpacing: -0.4,
  },
  metricLabel: {
    marginTop: 3,
    fontSize: 12,
    color: KadaiColors.text2,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: KadaiColors.text,
    letterSpacing: -0.2,
  },
  sectionSubBadge: {
    fontSize: 11.5,
    fontWeight: '800',
    color: KadaiColors.greenDark,
    backgroundColor: KadaiColors.mintSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: KadaiRadius.pill,
  },
  link: {
    color: KadaiColors.greenDark,
    fontSize: 12,
    fontWeight: '900',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: KadaiRadius.large,
    borderWidth: 1,
    borderColor: KadaiColors.border,
    padding: 16,
    paddingTop: 18,
    ...KadaiShadow,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingHorizontal: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barValueText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: KadaiColors.text2,
    marginBottom: 5,
    height: 14,
  },
  barTrack: {
    width: 14,
    height: 76,
    backgroundColor: '#F1F5F2',
    borderRadius: 7,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: KadaiColors.muted,
    marginTop: 7,
  },
  barLabelToday: {
    color: KadaiColors.primary,
    fontWeight: '900',
  },
  emptyCardSimple: {
    minHeight: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: KadaiRadius.large,
    borderWidth: 1,
    borderColor: KadaiColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    padding: 16,
  },
  emptyCardText: {
    color: KadaiColors.muted,
    fontSize: 12.5,
    fontWeight: '600',
  },
  topProductsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: KadaiRadius.large,
    borderWidth: 1,
    borderColor: KadaiColors.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
    ...KadaiShadow,
  },
  topProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: '#EEF3EF',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '900',
  },
  topProductName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: KadaiColors.text,
  },
  topProductProgressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#EEF3EF',
    marginTop: 6,
    overflow: 'hidden',
  },
  topProductProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  topProductQty: {
    fontSize: 12,
    fontWeight: '800',
    color: KadaiColors.text,
  },
  topProductRevenue: {
    fontSize: 10.5,
    color: KadaiColors.text2,
    marginTop: 2,
    fontWeight: '600',
  },
  insightCard: {
    backgroundColor: KadaiColors.amberSoft,
    borderRadius: KadaiRadius.large,
    borderWidth: 1,
    borderColor: '#F7D898',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  insightHealthy: {
    backgroundColor: KadaiColors.mintSoft,
    borderColor: '#CFE7D5',
  },
  insightIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFE8B3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightIconHealthy: {
    backgroundColor: KadaiColors.mint,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: KadaiColors.text,
  },
  insightText: {
    fontSize: 12,
    color: KadaiColors.text2,
    marginTop: 3,
    lineHeight: 17,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 9,
  },
  quickAction: {
    flex: 1,
    minHeight: 86,
    backgroundColor: '#FFFFFF',
    borderRadius: KadaiRadius.large,
    borderWidth: 1,
    borderColor: KadaiColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    ...KadaiShadow,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: KadaiColors.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 10.5,
    color: KadaiColors.text,
    fontWeight: '800',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: KadaiRadius.large,
    borderWidth: 1,
    borderColor: KadaiColors.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
    ...KadaiShadow,
  },
  activityRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  activityBorder: {
    borderTopWidth: 1,
    borderTopColor: '#EDF2EE',
  },
  activityIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: KadaiColors.text,
    lineHeight: 18,
  },
  activityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  activityTypePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activityTypePillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  activitySubtitle: {
    fontSize: 11,
    color: KadaiColors.text2,
    flexShrink: 1,
  },
  activityAmount: {
    fontSize: 12.5,
    fontWeight: '900',
    color: KadaiColors.text,
  },
  activityTime: {
    fontSize: 10,
    color: KadaiColors.muted,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyActivity: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyActivityText: {
    color: KadaiColors.muted,
    fontSize: 12.5,
    fontWeight: '600',
  },
});
