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
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import KadaiBottomNav from '../components/kadai-bottom-nav';
import { Product, getProducts, resetDemoData, seedDemoData } from '../services/api';
import { KadaiColors, KadaiRadius, KadaiShadow } from '../constants/kadai-theme';

type StockState = 'OUT' | 'CRITICAL' | 'LOW' | 'HEALTHY';

function stockState(product: Product): StockState {
  if (product.quantity <= 0) return 'OUT';
  if (product.quantity <= Math.max(1, Math.ceil(product.low_stock_threshold * 0.5))) return 'CRITICAL';
  if (product.quantity <= product.low_stock_threshold) return 'LOW';
  return 'HEALTHY';
}

const stateMeta: Record<StockState, { label: string; color: string; bg: string }> = {
  OUT: { label: 'OUT OF STOCK', color: '#7F1D1D', bg: '#FEE2E2' },
  CRITICAL: { label: 'CRITICAL', color: '#B42318', bg: KadaiColors.redSoft },
  LOW: { label: 'LOW', color: '#9A6700', bg: KadaiColors.amberSoft },
  HEALTHY: { label: 'HEALTHY', color: KadaiColors.greenDark, bg: KadaiColors.mintSoft },
};

export default function InventoryScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (manual = false) => {
    try {
      if (manual) setRefreshing(true);
      setError(null);
      setProducts(await getProducts(1));
    } catch (err: any) {
      setError(err?.message || 'Could not load inventory.');
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.category, p.barcode || ''].some((value) => value.toLowerCase().includes(q))
    );
  }, [products, query]);

  const stats = useMemo(() => {
    const counts = { healthy: 0, low: 0, critical: 0, out: 0 };
    products.forEach((item) => {
      const state = stockState(item);
      if (state === 'HEALTHY') counts.healthy += 1;
      if (state === 'LOW') counts.low += 1;
      if (state === 'CRITICAL') counts.critical += 1;
      if (state === 'OUT') counts.out += 1;
    });
    const health = products.length ? Math.round((counts.healthy / products.length) * 100) : 100;
    return { ...counts, health };
  }, [products]);

  const seed = async () => {
    try {
      setSeeding(true);
      setMessage(null);
      await seedDemoData(1);
      await load(true);
    } catch (err: any) {
      setError(err?.message || 'Unable to load sample products.');
    } finally {
      setSeeding(false);
    }
  };

  const reset = async () => {
    try {
      setResetting(true);
      setError(null);
      const response = await resetDemoData(1);
      setShowReset(false);
      setQuery('');
      await load(true);
      setMessage(response.message);
    } catch (err: any) {
      setError(err?.message || 'Unable to reset demo store.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={KadaiColors.background} />

      <View style={styles.top}>
        <View>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.subtitle}>Live stock health and quick actions</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => router.push('/add-stock')}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

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
        <View style={styles.healthCard}>
          <View>
            <Text style={styles.healthLabel}>Inventory health</Text>
            <View style={styles.healthValueRow}>
              <Text style={styles.healthValue}>{stats.health}</Text>
              <Text style={styles.healthOutOf}>/ 100</Text>
            </View>
            <Text style={styles.healthWord}>
              {stats.health >= 80 ? 'GOOD' : stats.health >= 60 ? 'NEEDS ATTENTION' : 'AT RISK'}
            </Text>
          </View>
          <View style={styles.healthStats}>
            <MiniStat value={stats.healthy} label="Healthy" color={KadaiColors.green} />
            <MiniStat value={stats.low} label="Low" color="#FBBF24" />
            <MiniStat value={stats.critical + stats.out} label="Critical" color="#FCA5A5" />
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={19} color={KadaiColors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search product, category or barcode"
            placeholderTextColor="#8B9A91"
            value={query}
            onChangeText={setQuery}
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={19} color={KadaiColors.muted} />
            </Pressable>
          )}
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={18} color={KadaiColors.redDark} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {message && (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle-outline" size={18} color={KadaiColors.greenDark} />
            <Text style={styles.successText}>{message}</Text>
          </View>
        )}

        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator color={KadaiColors.greenDark} size="large" />
            <Text style={styles.centerText}>Loading inventory…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={36} color={KadaiColors.muted} />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>
              {products.length ? 'Try another search.' : 'Load the sample store to start the demo.'}
            </Text>
            {!products.length && (
              <Pressable style={styles.primaryButton} onPress={seed} disabled={seeding}>
                {seeding ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Load sample products</Text>}
              </Pressable>
            )}
          </View>
        ) : (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Products</Text>
              <Text style={styles.countText}>{filtered.length} items</Text>
            </View>
            {filtered.map((item) => <ProductCard key={item.id} item={item} />)}
          </>
        )}

        <Pressable
          style={styles.resetLink}
          onPress={() => {
            setMessage(null);
            setShowReset((v) => !v);
          }}
        >
          <Ionicons name="refresh-outline" size={17} color={KadaiColors.redDark} />
          <Text style={styles.resetLinkText}>Reset demo store</Text>
        </Pressable>

        {showReset && (
          <View style={styles.resetCard}>
            <Text style={styles.resetTitle}>Restore competition demo data?</Text>
            <Text style={styles.resetText}>
              This removes demo sales and stock history for Shop 1 and restores the original sample inventory.
            </Text>
            <View style={styles.resetRow}>
              <Pressable style={styles.cancelButton} onPress={() => setShowReset(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.dangerButton} onPress={reset} disabled={resetting}>
                {resetting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.dangerText}>Confirm reset</Text>}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      <KadaiBottomNav />
    </SafeAreaView>
  );
}

function MiniStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniValue, { color }]}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function ProductCard({ item }: { item: Product }) {
  const state = stockState(item);
  const meta = stateMeta[state];
  const visualMax = Math.max(item.low_stock_threshold * 2, item.quantity, 1);
  const progress = Math.max(0, Math.min(1, item.quantity / visualMax));
  const topUp = Math.max(0, item.low_stock_threshold * 2 - item.quantity);

  return (
    <View style={styles.productCard}>
      <View style={styles.productTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.category}>{item.category}</Text>
        </View>
        <View style={[styles.stateBadge, { backgroundColor: meta.bg }]}>
          <View style={[styles.stateDot, { backgroundColor: meta.color }]} />
          <Text style={[styles.stateText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.quantityRow}>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <Text style={styles.units}>units in stock</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: meta.color }]} />
      </View>

      <View style={styles.productMetaRow}>
        <Text style={styles.productMeta}>Reorder level: {item.low_stock_threshold}</Text>
        {topUp > 0 && <Text style={styles.topUp}>Target top-up: +{topUp}</Text>}
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.sellAction} onPress={() => router.push(`/sell?product_id=${item.id}`)}>
          <Ionicons name="cart-outline" size={17} color="#FFFFFF" />
          <Text style={styles.sellActionText}>Sell</Text>
        </Pressable>
        <Pressable style={styles.stockAction} onPress={() => router.push(`/add-stock?product_id=${item.id}`)}>
          <Ionicons name="add-circle-outline" size={17} color={KadaiColors.primary} />
          <Text style={styles.stockActionText}>Add stock</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KadaiColors.background },
  top: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 26, fontWeight: '900', color: KadaiColors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 12.5, color: KadaiColors.text2, marginTop: 2 },
  addButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: KadaiColors.primary, alignItems: 'center', justifyContent: 'center', ...KadaiShadow },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 28, gap: 13 },
  healthCard: { backgroundColor: KadaiColors.primary, borderRadius: KadaiRadius.xl, padding: 18, flexDirection: 'row', justifyContent: 'space-between', gap: 16, ...KadaiShadow },
  healthLabel: { color: '#CFE8D8', fontSize: 12, fontWeight: '700' },
  healthValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  healthValue: { color: '#FFFFFF', fontSize: 36, fontWeight: '900' },
  healthOutOf: { color: '#A9CEB6', fontSize: 13, fontWeight: '700', marginLeft: 3 },
  healthWord: { color: '#A7F3D0', fontSize: 10.5, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  healthStats: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  miniStat: { alignItems: 'center' },
  miniValue: { fontSize: 20, fontWeight: '900' },
  miniLabel: { color: '#D5EADF', fontSize: 9.5, marginTop: 2, fontWeight: '600' },
  searchBox: { minHeight: 50, backgroundColor: '#FFFFFF', borderRadius: KadaiRadius.medium, borderWidth: 1, borderColor: KadaiColors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9 },
  searchInput: { flex: 1, color: KadaiColors.text, fontSize: 14 },
  errorCard: { backgroundColor: KadaiColors.redSoft, borderWidth: 1, borderColor: '#F4CCCC', borderRadius: KadaiRadius.medium, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  errorText: { flex: 1, color: KadaiColors.redDark, fontSize: 12.5 },
  successCard: { backgroundColor: KadaiColors.mintSoft, borderWidth: 1, borderColor: '#CDE7D4', borderRadius: KadaiRadius.medium, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  successText: { flex: 1, color: KadaiColors.greenDark, fontSize: 12.5, fontWeight: '700' },
  center: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10 },
  centerText: { color: KadaiColors.text2, fontSize: 13 },
  emptyCard: { minHeight: 260, backgroundColor: '#FFFFFF', borderRadius: KadaiRadius.large, alignItems: 'center', justifyContent: 'center', padding: 24, borderWidth: 1, borderColor: KadaiColors.border },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: KadaiColors.text, marginTop: 10 },
  emptyText: { fontSize: 13, color: KadaiColors.text2, textAlign: 'center', marginTop: 5, lineHeight: 18 },
  primaryButton: { marginTop: 18, backgroundColor: KadaiColors.primary, borderRadius: KadaiRadius.medium, minHeight: 46, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: KadaiColors.text },
  countText: { fontSize: 11.5, color: KadaiColors.muted, fontWeight: '700' },
  productCard: { backgroundColor: '#FFFFFF', borderRadius: KadaiRadius.large, borderWidth: 1, borderColor: KadaiColors.border, padding: 16, ...KadaiShadow },
  productTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  productName: { fontSize: 17, fontWeight: '900', color: KadaiColors.text },
  category: { marginTop: 3, color: KadaiColors.text2, fontSize: 11.5, fontWeight: '600' },
  stateBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: KadaiRadius.pill },
  stateDot: { width: 7, height: 7, borderRadius: 4 },
  stateText: { fontSize: 9.5, fontWeight: '900' },
  quantityRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 15 },
  quantity: { fontSize: 30, fontWeight: '900', color: KadaiColors.text },
  units: { fontSize: 12, color: KadaiColors.text2, fontWeight: '600' },
  progressTrack: { height: 7, borderRadius: 5, backgroundColor: '#EDF2EE', overflow: 'hidden', marginTop: 9 },
  progressFill: { height: '100%', borderRadius: 5 },
  productMetaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 9 },
  productMeta: { fontSize: 11.5, color: KadaiColors.muted },
  topUp: { fontSize: 11.5, color: KadaiColors.greenDark, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 9, marginTop: 15 },
  sellAction: { flex: 1, minHeight: 43, borderRadius: 12, backgroundColor: KadaiColors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  sellActionText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12.5 },
  stockAction: { flex: 1, minHeight: 43, borderRadius: 12, backgroundColor: KadaiColors.mintSoft, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  stockActionText: { color: KadaiColors.primary, fontWeight: '900', fontSize: 12.5 },
  resetLink: { alignSelf: 'center', marginTop: 8, flexDirection: 'row', gap: 6, alignItems: 'center', padding: 8 },
  resetLinkText: { color: KadaiColors.redDark, fontSize: 12, fontWeight: '800' },
  resetCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F3C4C4', borderRadius: KadaiRadius.large, padding: 15 },
  resetTitle: { fontSize: 14, fontWeight: '900', color: KadaiColors.text },
  resetText: { fontSize: 12, color: KadaiColors.text2, lineHeight: 17, marginTop: 5 },
  resetRow: { flexDirection: 'row', gap: 9, marginTop: 14 },
  cancelButton: { flex: 1, minHeight: 42, borderRadius: 11, backgroundColor: '#EEF2EF', alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: KadaiColors.text, fontWeight: '800', fontSize: 12.5 },
  dangerButton: { flex: 1, minHeight: 42, borderRadius: 11, backgroundColor: KadaiColors.redDark, alignItems: 'center', justifyContent: 'center' },
  dangerText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12.5 },
});
