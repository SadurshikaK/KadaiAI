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

const getProductIcon = (name: string, category: string) => {
  const searchStr = `${name} ${category}`.toLowerCase();
  if (searchStr.includes('milk') || searchStr.includes('powder')) return '🥛';
  if (searchStr.includes('soap')) return '🧼';
  if (searchStr.includes('biscuit') || searchStr.includes('cookie')) return '🍪';
  if (searchStr.includes('book') || searchStr.includes('stationery')) return '📘';
  if (searchStr.includes('rice')) return '🍚';
  if (searchStr.includes('oil')) return '🫗';
  if (searchStr.includes('drink') || searchStr.includes('juice')) return '🧃';
  return '📦';
};

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
      console.error('Failed to load shopping list:', err);
      setError('error');
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
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>{t('shopping.title')}</Text>
          <Text style={styles.subtitle}>{t('shopping.items_to_restock')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

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
          {error ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: '#FDEDEC' }]}>
                <Text style={[styles.emptyIcon, { color: '#C0392B' }]}>⚠</Text>
              </View>
              <Text style={styles.emptyTitle}>{t('shopping.error_title')}</Text>
              <Text style={styles.emptySubtitle}>{t('shopping.error_subtitle')}</Text>
              <Pressable
                style={styles.inventoryBtn}
                onPress={() => loadList(true)}
              >
                <Text style={styles.inventoryBtnText}>{t('shopping.try_again')}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Budget Overview Card */}
              {shoppingItems.length > 0 && (
                <View style={styles.budgetCard}>
                  <View style={styles.budgetRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.budgetLabel}>{t('shopping.budget_title')}</Text>
                      <Text style={styles.budgetAmount}>
                        Rs. {Math.round(totalEstimatedBudget).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.itemCountBadge}>
                      <Text style={styles.itemCountText}>
                        {shoppingItems.length} {shoppingItems.length === 1 ? t('shopping.product_attention') : t('shopping.products_attention')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.budgetSubtitle}>
                    {t('shopping.budget_note')}
                  </Text>
                </View>
              )}

              {shoppingItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconContainer}>
                    <Text style={styles.emptyIcon}>✓</Text>
                  </View>
              <Text style={styles.emptyTitle}>{t('shopping.empty_title')}</Text>
              <Text style={styles.emptySubtitle}>{t('shopping.empty_subtitle')}</Text>
              <Pressable
                style={styles.inventoryBtn}
                onPress={() => router.push('/inventory')}
              >
                <Text style={styles.inventoryBtnText}>{t('shopping.view_inventory')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {shoppingItems.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.iconContainer}>
                      <Text style={styles.productIcon}>{getProductIcon(item.name, item.category)}</Text>
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemCategory}>{item.category}</Text>
                    </View>
                    <View style={styles.lowStockBadge}>
                      <Text style={styles.lowStockBadgeText}>⚠ {t('shopping.low_stock')}</Text>
                    </View>
                  </View>

                  <View style={styles.stockGrid}>
                    <View style={styles.stockColumn}>
                      <Text style={styles.stockLabel}>{t('shopping.current') || 'Current'}</Text>
                      <Text style={styles.stockValue}>{item.quantity}</Text>
                    </View>
                    <View style={styles.stockColumn}>
                      <Text style={styles.stockLabel}>{t('shopping.minimum') || 'Minimum'}</Text>
                      <Text style={styles.stockValue}>{item.low_stock_threshold}</Text>
                    </View>
                    <View style={[styles.stockColumn, styles.suggestedColumn]}>
                      <Text style={styles.suggestedLabel}>{t('shopping.suggested_buy') || 'Suggested Buy'}</Text>
                      <Text style={styles.suggestedValue}>+{item.suggestedQty}</Text>
                    </View>
                  </View>

                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>{t('shopping.estimated_cost')}</Text>
                    <Text style={styles.costValue}>Rs. {Math.round(item.estimatedTotal).toLocaleString()}</Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [styles.quickAddBtn, pressed && styles.btnPressed]}
                    onPress={() => router.push(`/add-stock?product_id=${item.id}`)}
                  >
                    <Text style={styles.quickAddText}>📦 {t('shopping.add_stock')}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
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
    fontSize: 24,
    color: '#0F3D26',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F3D26',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B8276',
    marginTop: 2,
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
    alignItems: 'center',
    marginBottom: 12,
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
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 10,
  },
  itemCountText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  budgetSubtitle: {
    color: '#D1E8DB',
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },

  itemsList: {
    gap: 16,
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
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#F4F9F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productIcon: {
    fontSize: 24,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A2E24',
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 13,
    color: '#6B8276',
  },
  lowStockBadge: {
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  lowStockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B76E00',
  },

  stockGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAF9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  stockColumn: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E8F0EA',
  },
  suggestedColumn: {
    borderRightWidth: 0,
    backgroundColor: '#EAF7EE',
    borderRadius: 8,
    marginVertical: -6,
    paddingVertical: 6,
  },
  stockLabel: {
    fontSize: 11,
    color: '#6B8276',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  stockValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2E24',
  },
  suggestedLabel: {
    fontSize: 11,
    color: '#1B7A42',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  suggestedValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B7A42',
  },

  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  costLabel: {
    fontSize: 14,
    color: '#444444',
    fontWeight: '500',
  },
  costValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F3D26',
  },

  quickAddBtn: {
    backgroundColor: '#22A05B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickAddText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#EAF7EE',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 40,
    color: '#22A05B',
    fontWeight: 'bold',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A2E24',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B8276',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  inventoryBtn: {
    backgroundColor: '#22A05B',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  inventoryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
