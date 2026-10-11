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
  TextInput,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';
import { getProducts, searchProducts, seedDemoData, resetDemoData, type Product } from '../services/api';

export default function InventoryScreen() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const loadProducts = useCallback(async (query: string = '', isManualRefresh: boolean = false): Promise<boolean> => {
    try {
      if (isManualRefresh) setRefreshing(true);
      setError(null);
      let data: Product[];
      if (query.trim().length > 0) {
        data = await searchProducts(query.trim(), 1);
      } else {
        data = await getProducts(1);
      }
      setProducts(data);
      return true;
    } catch (err: any) {
      setError(err.message || 'Could not load products');
      return false;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProducts(searchQuery, false);
    }, [loadProducts, searchQuery])
  );

  const onRefresh = () => {
    void loadProducts(searchQuery, true);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text); // Focus effect performs the search (avoid two calls).
    setResetMessage(null);
  };

  const handleSeed = async () => {
    try {
      setSeeding(true);
      await seedDemoData(1);
      await loadProducts('', true);
    } catch (err: any) {
      setError(err.message || 'Failed to seed sample data');
    } finally {
      setSeeding(false);
    }
  };

  const handleReset = async () => {
    if (resetting) return;

    try {
      setResetting(true);
      setError(null);
      setResetMessage(null);

      const response = await resetDemoData(1); // Called only after confirming below.
      setShowResetConfirm(false);
      setSearchQuery('');
      const reloaded = await loadProducts('', true);
      if (reloaded) {
        setResetMessage(response.message);
      } else {
        setResetMessage('Demo reset completed, but inventory could not refresh. Try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset demo');
    } finally {
      setResetting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F9F6" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('inventory.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={t('common.search')}
          placeholderTextColor="#8CA196"
          value={searchQuery}
          onChangeText={handleSearch}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => handleSearch('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Competition demo reset: requires human confirmation */}
      <View style={styles.resetSection}>
        <Pressable
          style={({ pressed }) => [styles.resetButton, pressed && styles.buttonPressed]}
          onPress={() => {
            setResetMessage(null);
            setShowResetConfirm(true);
          }}
          disabled={resetting || seeding || loading}
          accessibilityRole="button"
          accessibilityLabel="Reset Competition Demo"
        >
          <Text style={styles.resetButtonText}>Reset Competition Demo</Text>
        </Pressable>

        {showResetConfirm && (
          <View style={styles.resetConfirmBox}>
            <Text style={styles.resetWarning}>
              This will delete demo sales and stock history for Shop 1 and
              restore the sample inventory. Continue?
            </Text>
            <View style={styles.resetActions}>
              <Pressable
                style={styles.resetCancelButton}
                onPress={() => setShowResetConfirm(false)}
                disabled={resetting}
                accessibilityRole="button"
              >
                <Text style={styles.resetCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.resetApplyButton}
                onPress={handleReset}
                disabled={resetting}
                accessibilityRole="button"
              >
                <Text style={styles.resetApplyText}>
                  {resetting ? 'Resetting...' : 'Confirm Reset'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {resetMessage && <Text style={styles.resetSuccess}>{resetMessage}</Text>}
      </View>

      {/* Main Content */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#22A05B" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContainer}
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
          {products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>{t('inventory.empty')}</Text>
              <Text style={styles.emptySubtitle}>
                Add your first product or load sample products into the demo inventory.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.seedButton, pressed && styles.buttonPressed]}
                onPress={handleSeed}
                disabled={seeding}
              >
                {seeding ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.seedButtonText}>🌱 Load Sample Products</Text>
                )}
              </Pressable>
            </View>
          ) : (
            products.map((item) => {
              // Critical = out of stock; Low = at/below threshold; otherwise Healthy.
              const stockState = item.quantity <= 0
                ? 'CRITICAL'
                : item.quantity <= item.low_stock_threshold
                  ? 'LOW'
                  : 'HEALTHY';
              const isLowStock = stockState !== 'HEALTHY';
              return (
                <View
                  key={item.id}
                  style={[
                    styles.productCard,
                    isLowStock && styles.productCardLowStock,
                  ]}
                >
                  <View style={styles.productTopRow}>
                    <View style={styles.nameCategoryBox}>
                      <Text style={styles.productName}>{item.name}</Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{item.category}</Text>
                      </View>
                    </View>

                    {/* Stock Status Badge */}
                    <View
                      style={[
                        styles.stockBadge,
                        stockState === 'CRITICAL'
                          ? styles.stockBadgeCritical
                          : stockState === 'LOW'
                            ? styles.stockBadgeLow
                            : styles.stockBadgeHealthy,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stockBadgeText,
                          stockState === 'CRITICAL'
                            ? styles.stockBadgeTextCritical
                            : stockState === 'LOW'
                              ? styles.stockBadgeTextLow
                              : styles.stockBadgeTextHealthy,
                        ]}
                      >
                        {stockState === 'CRITICAL'
                          ? `⛔ CRITICAL: ${item.quantity}`
                          : stockState === 'LOW'
                            ? `⚠️ ${t('inventory.lowStockBadge')}: ${item.quantity}`
                            : `✓ ${t('inventory.healthyBadge')}: ${item.quantity}`}
                      </Text>
                    </View>
                  </View>

                  {/* Details Row */}
                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>{t('common.unitPrice')}</Text>
                      <Text style={styles.priceValue}>Rs. {Number(item.selling_price).toLocaleString()}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Alert Threshold</Text>
                      <Text style={styles.detailValue}>≤ {item.low_stock_threshold} units</Text>
                    </View>
                  </View>

                  {/* Quick Action Buttons */}
                  <View style={styles.cardActionsRow}>
                    <Pressable
                      style={({ pressed }) => [styles.quickSellBtn, pressed && styles.buttonPressed]}
                      onPress={() => router.push(`/sell?product_id=${item.id}`)}
                    >
                      <Text style={styles.quickSellText}>🛒 {t('home.sellProduct')}</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [styles.quickAddBtn, pressed && styles.buttonPressed]}
                      onPress={() => router.push(`/add-stock?product_id=${item.id}`)}
                    >
                      <Text style={styles.quickAddText}>📦 {t('home.addStock')}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
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
    letterSpacing: -0.3,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#DFE8E2',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A2E24',
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    color: '#8CA196',
    fontSize: 16,
    fontWeight: 'bold',
  },

  errorBox: {
    backgroundColor: '#FDEDEC',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 10,
  },
  errorText: {
    color: '#C0392B',
    fontSize: 13,
    fontWeight: '500',
  },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B8276',
  },

  listContainer: {
    padding: 20,
    paddingBottom: 40,
    gap: 14,
  },

  // Product Card
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8F0EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  productCardLowStock: {
    borderColor: '#FBD89C',
    backgroundColor: '#FFFDF9',
  },
  productTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameCategoryBox: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2E24',
    marginBottom: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F9F4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#22A05B',
    fontWeight: '600',
  },

  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    maxWidth: '55%',
  },
  stockBadgeHealthy: {
    backgroundColor: '#EAF7EE',
  },
  stockBadgeCritical: {
    backgroundColor: '#FDEDEC',
  },
  stockBadgeLow: {
    backgroundColor: '#FDECC8',
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  stockBadgeTextHealthy: {
    color: '#1B7A42',
  },
  stockBadgeTextLow: {
    color: '#8A5D0F',
  },
  stockBadgeTextCritical: {
    color: '#B42318',
  },

  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAF9',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  detailItem: {},
  detailLabel: {
    fontSize: 12,
    color: '#6B8276',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F3D26',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B5245',
  },

  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickSellBtn: {
    flex: 1,
    backgroundColor: '#22A05B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSellText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  quickAddBtn: {
    flex: 1,
    backgroundColor: '#EBF5F0',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddText: {
    color: '#0F3D26',
    fontWeight: '700',
    fontSize: 13,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // Competition demo reset
  resetSection: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  resetButton: {
    backgroundColor: '#FFF1F0',
    borderColor: '#D9534F',
    borderWidth: 1,
    padding: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: '#B83D37',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
  },
  resetConfirmBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F0C7C5',
  },
  resetWarning: {
    color: '#813C35',
    fontSize: 14,
    lineHeight: 21,
  },
  resetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  resetCancelButton: {
    flex: 1,
    minHeight: 44,
    padding: 12,
    backgroundColor: '#E9EDEB',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetCancelText: {
    color: '#1A2E24',
    fontWeight: '700',
    textAlign: 'center',
  },
  resetApplyButton: {
    flex: 1,
    minHeight: 44,
    padding: 12,
    backgroundColor: '#C63D36',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetApplyText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  resetSuccess: {
    color: '#167A45',
    marginTop: 10,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B8276',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  seedButton: {
    backgroundColor: '#22A05B',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  seedButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
