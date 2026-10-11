import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { getRecommendations } from '../services/ai';
import type { RecommendationItem, RecommendationResponse } from '../services/ai';

/** Explain the actual stock target and budget allocation returned by the backend. */
function explainRecommendation(
  item: RecommendationItem,
  horizonDays: number
): string {
  const targetStock = item.current_stock + item.required_quantity;
  const coldStart = item.reason.toLowerCase().includes('cold-start');

  const stockExplanation = coldStart
    ? `There is not enough sales history to forecast this product. ` +
      `KadaiAI uses its low-stock threshold to set a target of ${targetStock} units. `
    : `Forecast demand for the next ${horizonDays} days is ` +
      `${item.forecast_demand.toFixed(1)} units. ` +
      `With ${item.safety_stock} safety-stock units, ` +
      `the target is ${targetStock} units. `;

  const shortageExplanation =
    `Current stock is ${item.current_stock}, so ` +
    `${item.required_quantity} more units are needed. `;

  const budgetExplanation =
    item.recommended_quantity < item.required_quantity
      ? `The available purchasing budget covers ${item.recommended_quantity} ` +
        `of those ${item.required_quantity} units.`
      : `The suggested purchase covers this calculated shortage.`;

  return stockExplanation + shortageExplanation + budgetExplanation;
}

export default function AIShoppingScreen() {
  const [budget, setBudget] = useState('10000');
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRecommendations = async () => {
    const budgetValue = Number(budget);

    if (budget.trim() === '' || !Number.isFinite(budgetValue) || budgetValue < 0) {
      setError('Please enter a valid, non-negative purchasing budget.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);
      const response = await getRecommendations(budgetValue, 1);
      setResult(response);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to generate recommendations. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.title}>Smart Shopping List</Text>
        <Text style={styles.subtitle}>
          KadaiAI uses current stock, recent demand and your budget to suggest
          what should be restocked.
        </Text>

        <Text style={styles.label}>Purchasing Budget (LKR)</Text>
        <TextInput
          style={styles.input}
          value={budget}
          onChangeText={(value) => {
            setBudget(value);
            setError(null);
          }}
          keyboardType="numeric"
          placeholder="Example: 10000"
          placeholderTextColor="#789083"
        />

        <Pressable
          style={[styles.generateButton, loading && styles.disabledButton]}
          onPress={generateRecommendations}
          disabled={loading}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.generateText}>Generate Recommendations</Text>
          )}
        </Pressable>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {result && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Recommendation Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Budget</Text>
              <Text style={styles.summaryValue}>Rs. {result.budget.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated Spend</Text>
              <Text style={styles.summaryValue}>
                Rs. {result.estimated_spend.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Remaining Budget</Text>
              <Text style={styles.summaryValue}>
                Rs. {result.remaining_budget.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {result?.items.map((item) => {
          const highPriority = item.current_stock <= item.safety_stock;

          return (
            <View key={item.product_id} style={styles.productCard}>
              <Text style={styles.productName}>{item.product_name}</Text>

              <View
                style={[
                  styles.priorityBadge,
                  highPriority ? styles.priorityHigh : styles.priorityRestock,
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    highPriority
                      ? styles.priorityHighText
                      : styles.priorityRestockText,
                  ]}
                >
                  {highPriority ? 'HIGH PRIORITY' : 'RESTOCK'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Current Stock</Text>
                <Text style={styles.detailValue}>{item.current_stock}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Forecast Demand</Text>
                <Text style={styles.detailValue}>
                  {item.forecast_demand.toFixed(1)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Safety Stock</Text>
                <Text style={styles.detailValue}>{item.safety_stock}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Required Quantity</Text>
                <Text style={styles.detailValue}>{item.required_quantity}</Text>
              </View>

              <View style={styles.recommendBox}>
                <Text style={styles.recommendLabel}>Suggested Purchase</Text>
                <Text style={styles.recommendQuantity}>
                  {item.recommended_quantity} units
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Estimated Cost</Text>
                <Text style={styles.detailValue}>
                  Rs. {item.estimated_cost.toFixed(2)}
                </Text>
              </View>

              <Text style={styles.reason}>{item.reason}</Text>
              <View style={styles.explanationBox}>
                <Text style={styles.explanationTitle}>Why recommended?</Text>
                <Text style={styles.explanationText}>
                  {explainRecommendation(item, result.horizon_days)}
                </Text>
              </View>
            </View>
          );
        })}

        {result && result.items.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No purchases recommended</Text>
            <Text style={styles.emptyText}>
              Either current stock is sufficient, or the budget is too low to
              purchase the items that need restocking.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F9F6',
  },
  content: {
    padding: 24,
    paddingBottom: 50,
  },
  back: {
    color: '#1C8A4D',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#183D29',
  },
  subtitle: {
    marginTop: 8,
    color: '#66796D',
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    marginTop: 28,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#304A3B',
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE9E1',
    fontSize: 16,
  },
  generateButton: {
    backgroundColor: '#1C8A4D',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  disabledButton: {
    opacity: 0.65,
  },
  generateText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#FDEDEC',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    color: '#A52F25',
    fontSize: 14,
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: '#DFF3E7',
    padding: 18,
    borderRadius: 16,
    marginTop: 24,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1D4F32',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  summaryLabel: {
    color: '#557364',
    flex: 1,
    marginRight: 12,
  },
  summaryValue: {
    color: '#1E5636',
    fontWeight: '800',
    textAlign: 'right',
    flexShrink: 1,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#DFEAE3',
  },
  productName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1C3E2B',
    marginBottom: 8,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  priorityHigh: {
    backgroundColor: '#FDE8E7',
  },
  priorityRestock: {
    backgroundColor: '#FFF1D6',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '800',
  },
  priorityHighText: {
    color: '#B42318',
  },
  priorityRestockText: {
    color: '#925C0E',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 7,
  },
  detailLabel: {
    color: '#6B7E73',
    flex: 1,
    marginRight: 12,
  },
  detailValue: {
    color: '#2D4838',
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
  },
  recommendBox: {
    backgroundColor: '#EDF8F1',
    padding: 14,
    borderRadius: 12,
    marginTop: 14,
    marginBottom: 8,
  },
  recommendLabel: {
    color: '#528064',
    fontSize: 13,
  },
  recommendQuantity: {
    color: '#157540',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 3,
  },
  reason: {
    color: '#21834C',
    fontWeight: '600',
    marginTop: 12,
    lineHeight: 20,
  },
  explanationBox: {
    marginTop: 14,
    backgroundColor: '#F2F8F4',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCECE1',
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#185A35',
    marginBottom: 6,
  },
  explanationText: {
    fontSize: 13,
    color: '#385745',
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 20,
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#244633',
    marginTop: 10,
    textAlign: 'center',
  },
  emptyText: {
    color: '#6B7F72',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 5,
  },
});
