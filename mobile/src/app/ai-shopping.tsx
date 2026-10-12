import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AIStatusStrip from '../components/ai-status-strip';
import KadaiBottomNav from '../components/kadai-bottom-nav';
import {
  RecommendationItem,
  RecommendationResponse,
  getRecommendations,
} from '../services/ai';
import { KadaiColors, KadaiRadius, KadaiShadow } from '../constants/kadai-theme';

function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function explainRecommendation(item: RecommendationItem, horizonDays: number) {
  const target = item.current_stock + item.required_quantity;
  const coldStart = item.reason.toLowerCase().includes('cold-start');

  const first = coldStart
    ? `There is not enough sales history yet, so KadaiAI falls back to the product's stock threshold and targets ${target} units.`
    : `Expected demand for the next ${horizonDays} days is ${item.forecast_demand.toFixed(1)} units. With ${item.safety_stock} safety-stock units, the target is ${target}.`;

  const second = ` Current stock is ${item.current_stock}, creating a calculated shortage of ${item.required_quantity}.`;
  const third = item.recommended_quantity < item.required_quantity
    ? ` Your budget can fund ${item.recommended_quantity} of the ${item.required_quantity} required units.`
    : ' The recommendation covers the calculated shortage.';

  return first + second + third;
}

function priorityScore(item: RecommendationItem) {
  const target = Math.max(1, item.current_stock + item.required_quantity);
  const shortageRatio = item.required_quantity / target;
  const safetyRisk = item.current_stock <= item.safety_stock ? 20 : 0;
  return Math.min(100, Math.round(45 + shortageRatio * 40 + safetyRisk));
}

export default function AIShoppingScreen() {
  const [budget, setBudget] = useState('10000');
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const budgetValue = Number(budget);
  const spendProgress = useMemo(() => {
    if (!result || result.budget <= 0) return 0;
    return Math.min(1, result.estimated_spend / result.budget);
  }, [result]);

  const generate = async () => {
    if (!budget.trim() || !Number.isFinite(budgetValue) || budgetValue < 0) {
      setError('Enter a valid non-negative purchasing budget.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setExpanded(null);
      setResult(await getRecommendations(budgetValue, 1));
    } catch (err: any) {
      setError(err?.message || 'Unable to generate a restock plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={KadaiColors.background} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.title}>Smart Restock</Text>
          <Text style={styles.subtitle}>
            Turn current stock, expected demand and your budget into an explainable purchase plan.
          </Text>
        </View>

        <AIStatusStrip
          label="KadaiAI Insights"
          status={loading ? 'Analyzing inventory' : 'Ready'}
          busy={loading}
        />

        <View style={styles.budgetCard}>
          <View style={styles.budgetHeader}>
            <View>
              <Text style={styles.eyebrow}>PURCHASING BUDGET</Text>
              <Text style={styles.budgetHint}>How much can you spend today?</Text>
            </View>
            <View style={styles.walletIcon}>
              <Ionicons name="wallet-outline" size={20} color={KadaiColors.primary} />
            </View>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.currency}>Rs.</Text>
            <TextInput
              style={styles.input}
              value={budget}
              onChangeText={(text) => {
                setBudget(text);
                setError(null);
              }}
              keyboardType="numeric"
              placeholder="10000"
              placeholderTextColor="#91A096"
            />
          </View>

          <Pressable style={styles.generateButton} onPress={generate} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="sparkles" size={17} color="#FFFFFF" />
                <Text style={styles.generateText}>Build smart restock plan</Text>
              </>
            )}
          </Pressable>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={18} color={KadaiColors.redDark} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {result && (
          <>
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.sectionTitle}>Recommended plan</Text>
                <Text style={styles.sectionSub}>{result.items.length} products prioritized</Text>
              </View>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>{result.horizon_days} DAYS</Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <SummaryValue label="Budget" value={money(result.budget)} />
                <SummaryValue label="Recommended spend" value={money(result.estimated_spend)} />
              </View>
              <View style={styles.budgetTrack}>
                <View style={[styles.budgetFill, { width: `${spendProgress * 100}%` }]} />
              </View>
              <View style={styles.remainingRow}>
                <Text style={styles.remainingLabel}>Budget remaining</Text>
                <Text style={styles.remainingValue}>{money(result.remaining_budget)}</Text>
              </View>
            </View>

            {result.items.map((item) => {
              const score = priorityScore(item);
              const high = score >= 80;
              const open = expanded === item.product_id;

              return (
                <View key={item.product_id} style={styles.productCard}>
                  <View style={styles.productHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName}>{item.product_name}</Text>
                      <Text style={styles.productSub}>Priority score {score}/100</Text>
                    </View>
                    <View style={[styles.priority, high ? styles.highPriority : styles.mediumPriority]}>
                      <View style={[styles.priorityDot, { backgroundColor: high ? KadaiColors.red : KadaiColors.amber }]} />
                      <Text style={[styles.priorityText, { color: high ? KadaiColors.redDark : '#9A6700' }]}>
                        {high ? 'HIGH' : 'MEDIUM'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statsRow}>
                    <PlanStat label="Current" value={item.current_stock.toString()} />
                    <PlanStat label="Demand" value={item.forecast_demand.toFixed(1)} />
                    <PlanStat label="Safety" value={item.safety_stock.toString()} />
                  </View>

                  <View style={styles.buyBox}>
                    <View>
                      <Text style={styles.buyLabel}>BUY</Text>
                      <Text style={styles.buyQuantity}>{item.recommended_quantity} units</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.costLabel}>Estimated cost</Text>
                      <Text style={styles.costValue}>{money(item.estimated_cost)}</Text>
                    </View>
                  </View>

                  <View style={styles.reasonRow}>
                    <Ionicons name="bulb-outline" size={18} color={KadaiColors.greenDark} />
                    <Text style={styles.reason}>{item.reason}</Text>
                  </View>

                  <Pressable style={styles.whyButton} onPress={() => setExpanded(open ? null : item.product_id)}>
                    <Text style={styles.whyText}>Why recommended?</Text>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color={KadaiColors.primary} />
                  </Pressable>

                  {open && (
                    <View style={styles.explanation}>
                      <Text style={styles.explanationText}>{explainRecommendation(item, result.horizon_days)}</Text>
                      <Text style={styles.scoreNote}>
                        Priority score is a transparent decision-support score derived from stock shortage and safety-stock risk.
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            {result.items.length === 0 && (
              <View style={styles.emptyCard}>
                <Ionicons name="checkmark-circle-outline" size={34} color={KadaiColors.greenDark} />
                <Text style={styles.emptyTitle}>No purchases recommended</Text>
                <Text style={styles.emptyText}>
                  Current stock is sufficient, or the available budget cannot fund products that need restocking.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <KadaiBottomNav />
    </SafeAreaView>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function PlanStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.planStat}>
      <Text style={styles.planStatValue}>{value}</Text>
      <Text style={styles.planStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KadaiColors.background },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 30, gap: 16 },
  title: { fontSize: 27, fontWeight: '900', color: KadaiColors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13.5, color: KadaiColors.text2, lineHeight: 19, marginTop: 4 },
  budgetCard: { backgroundColor: '#FFFFFF', borderRadius: KadaiRadius.xl, borderWidth: 1, borderColor: KadaiColors.border, padding: 17, ...KadaiShadow },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontSize: 10.5, fontWeight: '900', color: KadaiColors.greenDark, letterSpacing: 1.1 },
  budgetHint: { fontSize: 12, color: KadaiColors.text2, marginTop: 3 },
  walletIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: KadaiColors.mintSoft, alignItems: 'center', justifyContent: 'center' },
  inputRow: { marginTop: 15, minHeight: 54, borderRadius: 14, backgroundColor: KadaiColors.surfaceAlt, borderWidth: 1, borderColor: '#D7E4D9', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  currency: { fontSize: 16, fontWeight: '900', color: KadaiColors.primary, marginRight: 8 },
  input: { flex: 1, fontSize: 22, fontWeight: '900', color: KadaiColors.text },
  generateButton: { minHeight: 48, borderRadius: 13, marginTop: 12, backgroundColor: KadaiColors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  generateText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '900' },
  errorCard: { backgroundColor: KadaiColors.redSoft, borderWidth: 1, borderColor: '#F5CACA', borderRadius: KadaiRadius.medium, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  errorText: { flex: 1, color: KadaiColors.redDark, fontSize: 12.5 },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: KadaiColors.text },
  sectionSub: { fontSize: 11.5, color: KadaiColors.text2, marginTop: 2 },
  planBadge: { backgroundColor: KadaiColors.mint, paddingHorizontal: 10, paddingVertical: 6, borderRadius: KadaiRadius.pill },
  planBadgeText: { color: KadaiColors.primary, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.7 },
  summaryCard: { backgroundColor: KadaiColors.primary, borderRadius: KadaiRadius.xl, padding: 18, ...KadaiShadow },
  summaryTop: { flexDirection: 'row', gap: 14 },
  summaryLabel: { color: '#BFDCC9', fontSize: 10.5, fontWeight: '700' },
  summaryValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', marginTop: 3 },
  budgetTrack: { height: 7, borderRadius: 5, backgroundColor: '#2A6A44', overflow: 'hidden', marginTop: 17 },
  budgetFill: { height: '100%', backgroundColor: '#86EFAC', borderRadius: 5 },
  remainingRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  remainingLabel: { color: '#BFDCC9', fontSize: 11.5 },
  remainingValue: { color: '#A7F3D0', fontSize: 12, fontWeight: '900' },
  productCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KadaiColors.border, borderRadius: KadaiRadius.xl, padding: 17, ...KadaiShadow },
  productHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  productName: { fontSize: 18, fontWeight: '900', color: KadaiColors.text },
  productSub: { fontSize: 11.5, color: KadaiColors.muted, marginTop: 3 },
  priority: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: KadaiRadius.pill, paddingHorizontal: 9, paddingVertical: 6 },
  highPriority: { backgroundColor: KadaiColors.redSoft },
  mediumPriority: { backgroundColor: KadaiColors.amberSoft },
  priorityDot: { width: 7, height: 7, borderRadius: 4 },
  priorityText: { fontSize: 9.5, fontWeight: '900' },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  planStat: { flex: 1, backgroundColor: KadaiColors.surfaceAlt, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  planStatValue: { fontSize: 16, fontWeight: '900', color: KadaiColors.text },
  planStatLabel: { fontSize: 10, color: KadaiColors.muted, marginTop: 2, fontWeight: '600' },
  buyBox: { marginTop: 13, borderRadius: 14, backgroundColor: KadaiColors.mintSoft, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buyLabel: { color: KadaiColors.greenDark, fontSize: 9.5, fontWeight: '900', letterSpacing: 1 },
  buyQuantity: { color: KadaiColors.primary, fontSize: 22, fontWeight: '900', marginTop: 2 },
  costLabel: { color: KadaiColors.text2, fontSize: 10.5 },
  costValue: { color: KadaiColors.text, fontSize: 15, fontWeight: '900', marginTop: 2 },
  reasonRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 14 },
  reason: { flex: 1, color: KadaiColors.text2, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  whyButton: { marginTop: 13, minHeight: 40, borderRadius: 11, borderWidth: 1, borderColor: '#CFE1D4', backgroundColor: '#F7FBF8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  whyText: { color: KadaiColors.primary, fontSize: 12, fontWeight: '900' },
  explanation: { marginTop: 10, backgroundColor: '#F8FAF8', borderRadius: 11, padding: 12 },
  explanationText: { color: KadaiColors.text2, fontSize: 12, lineHeight: 18 },
  scoreNote: { color: KadaiColors.muted, fontSize: 10.5, lineHeight: 15, marginTop: 8, fontStyle: 'italic' },
  emptyCard: { minHeight: 180, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KadaiColors.border, borderRadius: KadaiRadius.large, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: KadaiColors.text, marginTop: 9 },
  emptyText: { fontSize: 12.5, color: KadaiColors.text2, textAlign: 'center', lineHeight: 18, marginTop: 4 },
});
