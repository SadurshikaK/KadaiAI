import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import {
  getRecommendations,
  RecommendationResponse,
} from '../services/ai';


export default function AIShoppingScreen() {
  const [budget, setBudget] = useState('10000');

  const [result, setResult] =
    useState<RecommendationResponse | null>(null);

  const [loading, setLoading] = useState(false);


  const generateRecommendations = async () => {
    const budgetValue = Number(budget);

    if (
      !Number.isFinite(budgetValue) ||
      budgetValue < 0
    ) {
      Alert.alert(
        'Invalid budget',
        'Please enter a valid budget.'
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await getRecommendations(
          budgetValue,
          1
        );

      setResult(response);
    } catch (error: any) {
      Alert.alert(
        'Unable to generate recommendations',
        error.message
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
      >
        {/* Back Button */}
        <Pressable
          onPress={() => router.back()}
        >
          <Text style={styles.back}>
            ‹ Back
          </Text>
        </Pressable>


        {/* Heading */}
        <Text style={styles.title}>
          Smart Shopping List
        </Text>

        <Text style={styles.subtitle}>
          KadaiAI uses current stock,
          recent demand and your budget
          to suggest what should be restocked.
        </Text>


        {/* Budget */}
        <Text style={styles.label}>
          Purchasing Budget (LKR)
        </Text>

        <TextInput
          style={styles.input}
          value={budget}
          onChangeText={setBudget}
          keyboardType="numeric"
          placeholder="Example: 10000"
        />


        {/* Generate */}
        <Pressable
          style={styles.generateButton}
          onPress={generateRecommendations}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text
              style={styles.generateText}
            >
              Generate Recommendations
            </Text>
          )}
        </Pressable>


        {/* Summary */}
        {result && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              Recommendation Summary
            </Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Budget
              </Text>

              <Text style={styles.summaryValue}>
                Rs. {result.budget.toFixed(2)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Estimated Spend
              </Text>

              <Text style={styles.summaryValue}>
                Rs. {result.estimated_spend.toFixed(2)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Remaining Budget
              </Text>

              <Text style={styles.summaryValue}>
                Rs. {result.remaining_budget.toFixed(2)}
              </Text>
            </View>
          </View>
        )}


        {/* Recommended Products */}
        {result?.items.map((item) => (
          <View
            key={item.product_id}
            style={styles.productCard}
          >
            <Text style={styles.productName}>
              {item.product_name}
            </Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                Current Stock
              </Text>

              <Text style={styles.detailValue}>
                {item.current_stock}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                Forecast Demand
              </Text>

              <Text style={styles.detailValue}>
                {item.forecast_demand.toFixed(1)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                Safety Stock
              </Text>

              <Text style={styles.detailValue}>
                {item.safety_stock}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                Required Quantity
              </Text>

              <Text style={styles.detailValue}>
                {item.required_quantity}
              </Text>
            </View>

            <View style={styles.recommendBox}>
              <Text style={styles.recommendLabel}>
                Suggested Purchase
              </Text>

              <Text style={styles.recommendQuantity}>
                {item.recommended_quantity} units
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                Estimated Cost
              </Text>

              <Text style={styles.detailValue}>
                Rs. {item.estimated_cost.toFixed(2)}
              </Text>
            </View>

            <Text style={styles.reason}>
              {item.reason}
            </Text>
          </View>
        ))}


        {/* No Recommendations */}
        {result &&
          result.items.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>
                ✅
              </Text>

              <Text style={styles.emptyTitle}>
                No restocking required
              </Text>

              <Text style={styles.emptyText}>
                Current inventory levels do not
                require purchases within the
                selected budget.
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

  generateText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
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
    marginTop: 6,
  },

  summaryLabel: {
    color: '#557364',
  },

  summaryValue: {
    color: '#1E5636',
    fontWeight: '800',
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
    marginBottom: 12,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },

  detailLabel: {
    color: '#6B7E73',
  },

  detailValue: {
    color: '#2D4838',
    fontWeight: '700',
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
  },

  emptyText: {
    color: '#6B7F72',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 5,
  },
});