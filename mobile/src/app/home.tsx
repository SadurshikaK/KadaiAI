import { useCallback, useMemo, useState } from 'react';
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

export default function HomeScreen() {
  const [data, setData] = useState<HomeBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (manual = false) => {
    try {
      if (manual) setRefreshing(true);
      setError(null);

      const [dashboard, products, lowStock, history] = await Promise.all([
        getDashboard(1),
        getProducts(1),
        getLowStockProducts(1),
        getSalesHistory(6, 1),
      ]);

      setData({ dashboard, products, lowStock, history });
    } catch (err: any) {
      setError(err?.message || 'Unable to reach the KadaiAI backend.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load])
  );

  const health = useMemo(() => {
    if (!data?.products.length) return 100;
    const healthy = data.products.filter((item) => item.quantity > item.low_stock_threshold).length;
    return Math.round((healthy / data.products.length) * 100);
  }, [data]);

  const insight = data?.lowStock[0];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={KadaiColors.background} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={KadaiColors.greenDark}
            colors={[KadaiColors.greenDark]}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>KadaiAI</Text>
            <Text style={styles.tagline}>Your AI shop assistant</Text>
          </View>
          <Pressable style={styles.profileButton} onPress={() => router.push('/about')}>
            <Ionicons name="storefront-outline" size={21} color={KadaiColors.primary} />
          </Pressable>
        </View>

        <AIStatusStrip
          status={error ? 'Offline' : loading ? 'Connecting' : 'Connected'}
          busy={loading}
        />

        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.greetingSub}>
            {error
              ? 'The local server is unavailable. Start the backend and retry.'
              : health >= 80
                ? 'Your shop looks healthy today.'
                : 'A few stock items need your attention.'}
          </Text>
        </View>

        {error && (
          <Pressable style={styles.errorCard} onPress={() => void load(true)}>
            <Ionicons name="cloud-offline-outline" size={20} color={KadaiColors.redDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Connection issue</Text>
              <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
            </View>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        )}

        <Pressable style={styles.aiHero} onPress={() => router.push('/voice')}>
          <View style={styles.aiHeroTop}>
            <View>
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

        <Text style={styles.sectionLabel}>{"TODAY'S SHOP"}</Text>

        {loading && !data ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={KadaiColors.greenDark} />
            <Text style={styles.loadingText}>Loading live shop data…</Text>
          </View>
        ) : (
          <View style={styles.metricsGrid}>
            <MetricCard icon="cash-outline" value={money(data?.dashboard.today_sales || 0)} label="Sales" />
            <MetricCard icon="receipt-outline" value={String(data?.dashboard.sales_count || 0)} label="Transactions" />
            <MetricCard
              icon="alert-circle-outline"
              value={String(data?.dashboard.low_stock_count || 0)}
              label="Low stock"
              attention={(data?.dashboard.low_stock_count || 0) > 0}
            />
            <MetricCard icon="pulse-outline" value={`${health}%`} label="Inventory health" />
          </View>
        )}

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

        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.quickGrid}>
          <QuickAction icon="mic-outline" label="Voice sale" onPress={() => router.push('/voice')} />
          <QuickAction icon="scan-outline" label="Scan invoice" onPress={() => router.push('/invoice-ai')} />
          <QuickAction icon="cube-outline" label="Stock" onPress={() => router.push('/inventory')} />
          <QuickAction icon="sparkles-outline" label="Restock" onPress={() => router.push('/ai-shopping')} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <Pressable onPress={() => router.push('/inventory')}>
            <Text style={styles.link}>Inventory</Text>
          </Pressable>
        </View>

        <View style={styles.activityCard}>
          {data?.history?.length ? (
            data.history.slice(0, 3).map((sale, index) => (
              <View key={sale.sale_id} style={[styles.activityRow, index !== 0 && styles.activityBorder]}>
                <View style={styles.activityIcon}>
                  <Ionicons name="cart-outline" size={18} color={KadaiColors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle}>Sold {sale.quantity} {sale.product_name}</Text>
                  <Text style={styles.activityMeta}>{money(sale.total_amount)}</Text>
                </View>
                <Text style={styles.activityTime}>
                  {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Ionicons name="time-outline" size={22} color={KadaiColors.muted} />
              <Text style={styles.emptyActivityText}>No recent sales recorded yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <KadaiBottomNav />
    </SafeAreaView>
  );
}

function MetricCard({ icon, value, label, attention = false }: { icon: any; value: string; label: string; attention?: boolean }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, attention && styles.metricIconAttention]}>
        <Ionicons name={icon} size={18} color={attention ? '#9A6700' : KadaiColors.primary} />
      </View>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.8 }]} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={22} color={KadaiColors.primary} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KadaiColors.background },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 28, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  brand: { fontSize: 28, fontWeight: '900', color: KadaiColors.primary, letterSpacing: -0.7 },
  tagline: { color: KadaiColors.text2, fontSize: 13, marginTop: 1, fontWeight: '600' },
  profileButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KadaiColors.border, alignItems: 'center', justifyContent: 'center' },
  greetingBlock: { marginTop: 2 },
  greeting: { fontSize: 25, fontWeight: '900', color: KadaiColors.text, letterSpacing: -0.5 },
  greetingSub: { fontSize: 14, color: KadaiColors.text2, marginTop: 4, lineHeight: 20 },
  errorCard: { backgroundColor: KadaiColors.redSoft, borderColor: '#F8CACA', borderWidth: 1, borderRadius: KadaiRadius.large, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center' },
  errorTitle: { fontSize: 13, fontWeight: '900', color: KadaiColors.redDark },
  errorText: { fontSize: 12, color: '#934139', marginTop: 2 },
  retry: { fontSize: 12, fontWeight: '900', color: KadaiColors.redDark },
  aiHero: { backgroundColor: KadaiColors.primary, borderRadius: KadaiRadius.xl, padding: 20, overflow: 'hidden', ...KadaiShadow },
  aiHeroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  aiEyebrow: { color: '#A7F3D0', fontWeight: '900', fontSize: 11, letterSpacing: 1.2 },
  aiTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 21, marginTop: 5, maxWidth: 240, lineHeight: 27 },
  micCircle: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#22A05B', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#48C77D' },
  aiExample: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginTop: 20 },
  aiHint: { color: '#CDEDD8', fontSize: 12, marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  chip: { borderRadius: KadaiRadius.pill, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  chipText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' },
  sectionLabel: { color: KadaiColors.muted, fontWeight: '900', fontSize: 11, letterSpacing: 1.2, marginTop: 2 },
  loadingCard: { minHeight: 100, backgroundColor: '#FFFFFF', borderRadius: KadaiRadius.large, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: KadaiColors.border },
  loadingText: { color: KadaiColors.text2, fontSize: 13, fontWeight: '600' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '48.4%', backgroundColor: '#FFFFFF', borderRadius: KadaiRadius.large, borderWidth: 1, borderColor: KadaiColors.border, padding: 14, ...KadaiShadow },
  metricIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: KadaiColors.mintSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  metricIconAttention: { backgroundColor: KadaiColors.amberSoft },
  metricValue: { fontSize: 20, fontWeight: '900', color: KadaiColors.text, letterSpacing: -0.4 },
  metricLabel: { marginTop: 3, fontSize: 12, color: KadaiColors.text2, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: KadaiColors.text, letterSpacing: -0.2 },
  link: { color: KadaiColors.greenDark, fontSize: 12, fontWeight: '900' },
  insightCard: { backgroundColor: KadaiColors.amberSoft, borderRadius: KadaiRadius.large, borderWidth: 1, borderColor: '#F7D898', padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  insightHealthy: { backgroundColor: KadaiColors.mintSoft, borderColor: '#CFE7D5' },
  insightIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFE8B3', alignItems: 'center', justifyContent: 'center' },
  insightIconHealthy: { backgroundColor: KadaiColors.mint },
  insightTitle: { fontSize: 14, fontWeight: '900', color: KadaiColors.text },
  insightText: { fontSize: 12, color: KadaiColors.text2, marginTop: 3, lineHeight: 17 },
  quickGrid: { flexDirection: 'row', gap: 9 },
  quickAction: { flex: 1, minHeight: 84, backgroundColor: '#FFFFFF', borderRadius: KadaiRadius.large, borderWidth: 1, borderColor: KadaiColors.border, alignItems: 'center', justifyContent: 'center', gap: 7 },
  quickIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: KadaiColors.mintSoft, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 10.5, color: KadaiColors.text, fontWeight: '800', textAlign: 'center' },
  activityCard: { backgroundColor: '#FFFFFF', borderRadius: KadaiRadius.large, borderWidth: 1, borderColor: KadaiColors.border, paddingHorizontal: 14, ...KadaiShadow },
  activityRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11 },
  activityBorder: { borderTopWidth: 1, borderTopColor: '#EDF2EE' },
  activityIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: KadaiColors.mintSoft, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontSize: 13, fontWeight: '800', color: KadaiColors.text },
  activityMeta: { fontSize: 11.5, color: KadaiColors.text2, marginTop: 3 },
  activityTime: { fontSize: 10.5, color: KadaiColors.muted, fontWeight: '700' },
  emptyActivity: { minHeight: 84, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyActivityText: { color: KadaiColors.muted, fontSize: 12.5, fontWeight: '600' },
});
