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

export default function LowStockScreen() {
  const { t } = useLanguage();
  const [items, setItems] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadLowStock = async (isManualRefresh: boolean = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      setError(null);
      const data = await getLowStockProducts(1);
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Could not load low-stock products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLowStock(false);
    }, [])
  );

  const onRefresh = () => {
    loadLowStock(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F9F6" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('lowStock.title')}</Text>
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
          {/* Warning Summary Banner */}
          {items.length > 0 && (
            <View style={styles.summaryBanner}>
              <Text style={styles.summaryIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryTitle}>
                  {items.length} {items.length === 1 ? 'Product Needs' : 'Products Need'} Restocking
                </Text>
                <Text style={styles.summarySubtitle}>
                  Current inventory is at or below the safety reorder threshold.
                </Text>
              </View>
            </View>
          )}

          {items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyTitle}>Healthy Inventory</Text>
              <Text style={styles.emptySubtitle}>{t('lowStock.empty')}</Text>
              <Pressable
                style={styles.viewInventoryBtn}
                onPress={() => router.push('/inventory')}
              >
                <Text style={styles.viewInventoryBtnText}>View All Products</Text>
              </Pressable>
            </View>
          ) : (
            items.map((product) => {
              const isCritical = product.quantity === 0;
              return (
                <View key={product.id} style={styles.card}>
                  <View style={styles.cardTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productCategory}>{product.category}</Text>
                    </View>

                    <View
                      style={[
                        styles.badge,
                        isCritical ? styles.badgeCritical : styles.badgeWarning,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          isCritical ? styles.badgeTextCritical : styles.badgeTextWarning,
                        ]}
                      >
                        {isCritical ? 'OUT OF STOCK' : 'LOW STOCK'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Current Stock</Text>
                      <Text
                        style={[
                          styles.metricValue,
                          isCritical ? styles.metricValueCritical : styles.metricValueWarning,
                        ]}
                      >
                        {product.quantity} units
                      </Text>
                    </View>

                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Min Threshold</Text>
                      <Text style={styles.metricValue}>{product.low_stock_threshold} units</Text>
                    </View>

                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Unit Price</Text>
                      <Text style={styles.metricValue}>Rs. {product.selling_price}</Text>
                    </View>
                  </View>

                  {/* Restock Button */}
                  <Pressable
                    style={({ pressed }) => [styles.restockBtn, pressed && styles.btnPressed]}
                    onPress={() => router.push(`/add-stock?product_id=${product.id}`)}
                  >
                    <Text style={styles.restockBtnText}>📦 Restock This Product</Text>
                  </Pressable>
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
  },

  listContainer: {
    padding: 20,
    paddingBottom: 40,
    gap: 14,
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

  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8EB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FBE8C9',
    marginBottom: 6,
  },
  summaryIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7C5E19',
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: 13,
    color: '#9C7A27',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FBD89C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  productName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2E24',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 13,
    color: '#6B8276',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeWarning: {
    backgroundColor: '#FDECC8',
  },
  badgeCritical: {
    backgroundColor: '#FADBD8',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  badgeTextWarning: {
    color: '#8A5D0F',
  },
  badgeTextCritical: {
    color: '#C0392B',
  },

  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FDF9F0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  metricItem: {},
  metricLabel: {
    fontSize: 11,
    color: '#8C7A58',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A3F34',
  },
  metricValueWarning: {
    color: '#A06D14',
  },
  metricValueCritical: {
    color: '#C0392B',
  },

  restockBtn: {
    backgroundColor: '#22A05B',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  restockBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
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
  viewInventoryBtn: {
    backgroundColor: '#EAF7EE',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  viewInventoryBtnText: {
    color: '#1B7A42',
    fontWeight: '700',
    fontSize: 14,
  },
});
