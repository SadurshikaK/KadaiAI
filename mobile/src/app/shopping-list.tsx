import { useCallback, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Platform,
  StatusBar,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';
import { getLowStockProducts, LowStockProduct } from '../services/api';

export default function ShoppingListScreen() {
  const { t } = useLanguage();
  const [items, setItems] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = async (isManualRefresh: boolean = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      setError(null);
      const data = await getLowStockProducts(1);
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Could not load shopping list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadList(false);
    }, [])
  );

  const onRefresh = () => {
    loadList(true);
  };

  // Compute suggested buy quantities and total estimated restock budget
  const shoppingItems = items.map((item) => {
    // Suggested restock quantity to reach double the threshold safely
    const suggestedQty = Math.max(5, item.low_stock_threshold * 2 - item.quantity);
    const estimatedUnitCost = item.selling_price * 0.8; // Approximate cost benchmark
    const estimatedTotal = suggestedQty * estimatedUnitCost;
    return {
      ...item,
      suggestedQty,
      estimatedTotal,
    };
  });

  const totalEstimatedBudget = shoppingItems.reduce((acc, curr) => acc + curr.estimatedTotal, 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F9F6" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('shopping.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Error Alert */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#22A05B" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#22A05B']}
              tintColor="#22A05B"
            />
          }
        >
          {/* Budget Overview Card */}
          {shoppingItems.length > 0 && (
            <View style={styles.budgetCard}>
              <View style={styles.budgetRow}>
                <View>
                  <Text style={styles.budgetLabel}>Estimated Restock Budget</Text>
                  <Text style={styles.budgetAmount}>
                    Rs. {Math.round(totalEstimatedBudget).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.itemCountBadge}>
                  <Text style={styles.itemCountText}>{shoppingItems.length} Items</Text>
                </View>
              </View>
              <Text style={styles.budgetSubtitle}>
                Calculated automatically from your low inventory thresholds.
              </Text>
            </View>
          )}

          {shoppingItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyTitle}>No Purchases Needed</Text>
              <Text style={styles.emptySubtitle}>{t('shopping.empty')}</Text>
              <Pressable
                style={styles.inventoryBtn}
                onPress={() => router.push('/inventory')}
              >
                <Text style={styles.inventoryBtnText}>Check All Products</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.sectionHeading}>Suggested Restock Items</Text>
              <View style={styles.itemsList}>
                {shoppingItems.map((item) => (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemCategory}>{item.category}</Text>
                      </View>
                      <View style={styles.orderBadge}>
                        <Text style={styles.orderBadgeLabel}>Buy</Text>
                        <Text style={styles.orderBadgeValue}>+{item.suggestedQty}</Text>
                      </View>
                    </View>

                    <View style={styles.itemMetaRow}>
                      <Text style={styles.metaText}>
                        Current Stock: <Text style={{ fontWeight: '700' }}>{item.quantity}</Text> (Min {item.low_stock_threshold})
                      </Text>
                      <Text style={styles.metaText}>
                        Est. Cost: <Text style={{ fontWeight: '700' }}>Rs. {Math.round(item.estimatedTotal)}</Text>
                      </Text>
                    </View>

                    <Pressable
                      style={({ pressed }) => [styles.quickAddBtn, pressed && styles.btnPressed]}
                      onPress={() => router.push(`/add-stock?product_id=${item.id}`)}
                    >
                      <Text style={styles.quickAddText}>📦 Restock {item.name}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>

              {/* Member 3 AI Future Feature Callout */}
              <View style={styles.aiForecastBox}>
                <Text style={styles.aiIcon}>🤖</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiTitle}>Member 3 AI Restock Forecast</Text>
                  <Text style={styles.aiSubtitle}>
                    Smart demand prediction and automated wholesale pricing will be integrated here.
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F9F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 30,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F0EA',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F3D26',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F3D26',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  errorBox: {
    backgroundColor: '#FDEDEC',
    padding: 14,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
  },
  errorText: {
    color: '#C0392B',
    fontSize: 14,
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B8276',
  },

  // Budget Card
  budgetCard: {
    backgroundColor: '#0F3D26',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#0F3D26',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  budgetLabel: {
    color: '#A2D4B6',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  budgetAmount: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  itemCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  itemCountText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  budgetSubtitle: {
    color: '#D1E8DB',
    fontSize: 12,
    lineHeight: 16,
  },

  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A3F34',
    marginBottom: 12,
  },
  itemsList: {
    gap: 12,
    marginBottom: 24,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8F0EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A2E24',
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 12,
    color: '#6B8276',
  },
  orderBadge: {
    backgroundColor: '#FDECC8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  orderBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A5D0F',
    textTransform: 'uppercase',
  },
  orderBadgeValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8A5D0F',
  },
  itemMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAF9',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 13,
    color: '#444444',
  },
  quickAddBtn: {
    backgroundColor: '#22A05B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  quickAddText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  aiForecastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9F4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D4EFE0',
  },
  aiIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F3D26',
    marginBottom: 2,
  },
  aiSubtitle: {
    fontSize: 12,
    color: '#4E735D',
    lineHeight: 16,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2E24',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B8276',
    textAlign: 'center',
    marginBottom: 20,
  },
  inventoryBtn: {
    backgroundColor: '#EAF7EE',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  inventoryBtnText: {
    color: '#1B7A42',
    fontWeight: '700',
    fontSize: 14,
  },
});
