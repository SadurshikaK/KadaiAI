import { useEffect, useState, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Platform,
  StatusBar,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';
import { getProducts, createSale, Product, SaleResponse } from '../services/api';

const getEmoji = (name: string, category: string) => {
  const str = (name + " " + category).toLowerCase();
  if (str.includes('milk') || str.includes('powder')) return '🥛';
  if (str.includes('soap')) return '🧼';
  if (str.includes('biscuit') || str.includes('cookie')) return '🍪';
  if (str.includes('book') || str.includes('stationery')) return '📘';
  if (str.includes('rice')) return '🍚';
  if (str.includes('oil')) return '🫗';
  if (str.includes('drink') || str.includes('juice')) return '🧃';
  return '📦';
};

export default function SellProductScreen() {
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ product_id?: string }>();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [saleResult, setSaleResult] = useState<SaleResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getProducts(1);
        setProducts(data);

        // Pre-select if product_id passed in params
        if (params.product_id) {
          const found = data.find((p) => p.id === Number(params.product_id));
          if (found) {
            setSelectedProduct(found);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Could not load products');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.product_id]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const lower = searchQuery.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(lower) || p.category.toLowerCase().includes(lower));
  }, [products, searchQuery]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setError(null);
    setQuantity(1);
  };

  const handleIncrement = () => {
    if (!selectedProduct) return;
    if (quantity < selectedProduct.quantity) {
      setQuantity((prev) => prev + 1);
      setError(null);
    } else {
      setError(`Cannot exceed available stock of ${selectedProduct.quantity} units.`);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
      setError(null);
    }
  };

  const handleQuantityTextChange = (text: string) => {
    const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num) || num <= 0) {
      setQuantity(1);
    } else if (selectedProduct && num > selectedProduct.quantity) {
      setQuantity(selectedProduct.quantity);
      setError(`Quantity set to maximum available stock (${selectedProduct.quantity}).`);
    } else {
      setQuantity(num);
      setError(null);
    }
  };

  const unitPrice = selectedProduct ? selectedProduct.selling_price : 0;
  const totalAmount = unitPrice * quantity;

  const handleInitiateSale = () => {
    if (!selectedProduct) {
      setError('Please select a product.');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity must be at least 1.');
      return;
    }
    if (quantity > selectedProduct.quantity) {
      setError(
        `Insufficient stock! Available: ${selectedProduct.quantity}, requested: ${quantity}.`
      );
      return;
    }
    setError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmSale = async () => {
    if (!selectedProduct) return;
    try {
      setSubmitting(true);
      setError(null);
      const res = await createSale({
        shop_id: 1,
        product_id: selectedProduct.id,
        quantity: quantity,
      });

      setSaleResult(res);
      setShowConfirmModal(false);

      // Update local product quantity
      setSelectedProduct((prev) => (prev ? { ...prev, quantity: res.remaining_stock } : null));
      setProducts((prev) =>
        prev.map((p) => (p.id === res.product_id ? { ...p, quantity: res.remaining_stock } : p))
      );
    } catch (err: any) {
      setShowConfirmModal(false);
      setError(err.message || 'Failed to record sale');
    } finally {
      setSubmitting(false);
    }
  };

  if (saleResult) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F9F6" />
        <View style={styles.successScreen}>
          <Text style={styles.successIconLarge}>✓</Text>
          <Text style={styles.successTitleLarge}>{t('sell.success')}</Text>
          <View style={styles.successDetailsBox}>
            <Text style={styles.successDetailText}>
              {saleResult.quantity} × {saleResult.product_name}
            </Text>
            <Text style={styles.successTotalText}>
              Rs. {saleResult.total_amount.toLocaleString()}
            </Text>
            <Text style={styles.successStockText}>
              {t('common.inStock')}: {saleResult.remaining_stock}
            </Text>
          </View>
          <Pressable style={styles.doneBtnLarge} onPress={() => router.replace('/home')}>
            <Text style={styles.doneBtnTextLarge}>{t('sell.done')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F9F6" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>{t('sell.title')}</Text>
          <Text style={styles.subtitle}>{t('sell.subtitle')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Error Alert */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('sell.searchPlaceholder')}
            placeholderTextColor="#89A393"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#22A05B" />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : (
          <>
            {/* Product Grid */}
            <View style={styles.productGrid}>
              {filteredProducts.map((item) => {
                const isSelected = selectedProduct?.id === item.id;
                const isOutOfStock = item.quantity <= 0;
                const isLowStock = item.quantity > 0 && item.quantity <= item.low_stock_threshold;

                return (
                  <Pressable
                    key={item.id}
                    disabled={isOutOfStock}
                    style={({ pressed }) => [
                      styles.productCard,
                      isSelected && styles.productCardSelected,
                      isOutOfStock && styles.productCardDisabled,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => handleSelectProduct(item)}
                  >
                    <View style={[styles.productIconBox, isSelected && styles.productIconBoxSelected]}>
                      <Text style={styles.productIcon}>{getEmoji(item.name, item.category)}</Text>
                    </View>
                    <Text
                      style={[
                        styles.productCardName,
                        isSelected && styles.productCardNameSelected,
                        isOutOfStock && styles.productCardNameDisabled,
                      ]}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    <Text style={[styles.productCardPrice, isOutOfStock && styles.productCardPriceDisabled]}>
                      Rs. {Number(item.selling_price).toLocaleString()}
                    </Text>

                    {isOutOfStock ? (
                      <Text style={styles.outOfStockText}>{t('sell.outOfStock')}</Text>
                    ) : (
                      <View style={styles.stockBadgeContainer}>
                        {isLowStock && <View style={styles.lowStockDot} />}
                        <Text style={[styles.productCardStock, isLowStock && styles.productCardStockLow]}>
                          {item.quantity} {t('common.inStock')}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Selected Product Section */}
            {selectedProduct && (
              <View style={styles.selectedSection}>
                <View style={styles.selectedHeader}>
                  <Text style={styles.selectedIcon}>{getEmoji(selectedProduct.name, selectedProduct.category)}</Text>
                  <View style={styles.selectedInfo}>
                    <Text style={styles.selectedName}>{selectedProduct.name}</Text>
                    <Text style={styles.selectedCategory}>{selectedProduct.category}</Text>
                  </View>
                  <View style={styles.selectedPriceBox}>
                    <Text style={styles.selectedPriceText}>Rs. {Number(selectedProduct.selling_price).toLocaleString()}</Text>
                    <Text style={styles.selectedStockText}>{selectedProduct.quantity} {t('common.inStock')}</Text>
                  </View>
                </View>

                <View style={styles.quantitySection}>
                  <Text style={styles.quantityLabel}>{t('common.quantity')}</Text>
                  <View style={styles.quantityControls}>
                    <Pressable
                      style={({ pressed }) => [styles.quantityBtn, pressed && styles.buttonPressed]}
                      onPress={handleDecrement}
                    >
                      <Text style={styles.quantityBtnText}>−</Text>
                    </Pressable>

                    <TextInput
                      style={styles.quantityInput}
                      keyboardType="numeric"
                      value={quantity.toString()}
                      onChangeText={handleQuantityTextChange}
                    />

                    <Pressable
                      style={({ pressed }) => [styles.quantityBtn, pressed && styles.buttonPressed]}
                      onPress={handleIncrement}
                    >
                      <Text style={styles.quantityBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.totalSection}>
                  <Text style={styles.totalLabel}>{t('common.totalAmount')}</Text>
                  <Text style={styles.totalAmountText}>Rs. {totalAmount.toLocaleString()}</Text>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (selectedProduct.quantity <= 0 || submitting) && styles.primaryButtonDisabled,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleInitiateSale}
                  disabled={selectedProduct.quantity <= 0 || submitting}
                >
                  <Text style={styles.primaryButtonText}>
                    {t('sell.confirmTitle')} • Rs. {totalAmount.toLocaleString()}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('sell.confirmTitle')}</Text>
            <Text style={styles.modalDescription}>{t('sell.confirmMsg')}</Text>

            {selectedProduct && (
              <View style={styles.modalSummaryBox}>
                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalSummaryLabel}>{t('common.products')}:</Text>
                  <Text style={styles.modalSummaryValue}>{selectedProduct.name}</Text>
                </View>
                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalSummaryLabel}>{t('common.unitPrice')}:</Text>
                  <Text style={styles.modalSummaryValue}>Rs. {unitPrice}</Text>
                </View>
                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalSummaryLabel}>{t('common.quantity')}:</Text>
                  <Text style={styles.modalSummaryValue}>{quantity}</Text>
                </View>
                <View style={[styles.modalSummaryRow, styles.modalTotalRow]}>
                  <Text style={styles.modalTotalLabel}>{t('common.totalAmount')}:</Text>
                  <Text style={styles.modalTotalValue}>Rs. {totalAmount.toLocaleString()}</Text>
                </View>

                <Text style={styles.modalStockWarning}>
                  {t('common.inStock')}: {selectedProduct.quantity} → {selectedProduct.quantity - quantity}
                </Text>
              </View>
            )}

            <View style={styles.modalActionsRow}>
              <Pressable
                style={[styles.modalCancelBtn]}
                onPress={() => setShowConfirmModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </Pressable>

              <Pressable
                style={[styles.modalConfirmBtn]}
                onPress={handleConfirmSale}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>{t('common.confirm')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 30,
    paddingBottom: 20,
    backgroundColor: '#F4F9F6',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backIcon: {
    fontSize: 24,
    color: '#2A3F34',
    fontWeight: 'bold',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A2E24',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B8276',
    fontWeight: '500',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E8F0EA',
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1A2E24',
    height: '100%',
  },
  errorBox: {
    backgroundColor: '#FDEDEC',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FADBD8',
  },
  errorText: {
    color: '#C0392B',
    fontSize: 15,
    fontWeight: '600',
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B8276',
    fontWeight: '500',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E8F0EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  productCardSelected: {
    borderColor: '#22A05B',
    backgroundColor: '#F0F9F4',
  },
  productCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#F9F9F9',
  },
  productIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F4F9F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  productIconBoxSelected: {
    backgroundColor: '#E2F4EA',
  },
  productIcon: {
    fontSize: 32,
  },
  productCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A3F34',
    textAlign: 'center',
    marginBottom: 6,
    height: 40,
  },
  productCardNameSelected: {
    color: '#0F3D26',
  },
  productCardNameDisabled: {
    color: '#8CA196',
  },
  productCardPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C8A4D',
    marginBottom: 6,
  },
  productCardPriceDisabled: {
    color: '#8CA196',
  },
  stockBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F9F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lowStockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E67E22',
    marginRight: 6,
  },
  productCardStock: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B8276',
  },
  productCardStockLow: {
    color: '#D35400',
  },
  outOfStockText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E74C3C',
    marginTop: 4,
  },
  selectedSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E8F0EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F2',
  },
  selectedIcon: {
    fontSize: 40,
    marginRight: 16,
    backgroundColor: '#F4F9F6',
    width: 64,
    height: 64,
    textAlign: 'center',
    lineHeight: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2E24',
    marginBottom: 4,
  },
  selectedCategory: {
    fontSize: 14,
    color: '#6B8276',
    fontWeight: '500',
  },
  selectedPriceBox: {
    alignItems: 'flex-end',
  },
  selectedPriceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C8A4D',
    marginBottom: 4,
  },
  selectedStockText: {
    fontSize: 13,
    color: '#6B8276',
    fontWeight: '600',
    backgroundColor: '#F4F9F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quantitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A3F34',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFE8E2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  quantityBtnText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F3D26',
    lineHeight: 28,
  },
  quantityInput: {
    width: 60,
    height: 48,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2E24',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B8276',
  },
  totalAmountText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F3D26',
  },
  primaryButton: {
    backgroundColor: '#22A05B',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22A05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#8CA196',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 61, 38, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F3D26',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    color: '#6B8276',
    marginBottom: 20,
  },
  modalSummaryBox: {
    backgroundColor: '#F8FAF9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E8F0EA',
  },
  modalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalSummaryLabel: {
    fontSize: 15,
    color: '#6B8276',
    fontWeight: '500',
  },
  modalSummaryValue: {
    fontSize: 15,
    color: '#1A2E24',
    fontWeight: '700',
  },
  modalTotalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#DFE8E2',
    marginBottom: 16,
  },
  modalTotalLabel: {
    fontSize: 16,
    color: '#2A3F34',
    fontWeight: '800',
  },
  modalTotalValue: {
    fontSize: 18,
    color: '#1C8A4D',
    fontWeight: '800',
  },
  modalStockWarning: {
    fontSize: 13,
    color: '#B7791F',
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: '#FEFCBF',
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#F0F4F2',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 16,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#22A05B',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },

  // Success Screen
  successScreen: {
    flex: 1,
    backgroundColor: '#EAF7EE',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successIconLarge: {
    fontSize: 72,
    color: '#22A05B',
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    width: 120,
    height: 120,
    textAlign: 'center',
    lineHeight: 120,
    borderRadius: 60,
    overflow: 'hidden',
    shadowColor: '#22A05B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  successTitleLarge: {
    fontSize: 28,
    fontWeight: '800',
    color: '#155724',
    textAlign: 'center',
    marginBottom: 32,
  },
  successDetailsBox: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  successDetailText: {
    fontSize: 18,
    color: '#2A3F34',
    fontWeight: '700',
    marginBottom: 12,
  },
  successTotalText: {
    fontSize: 32,
    color: '#1C8A4D',
    fontWeight: '800',
    marginBottom: 16,
  },
  successStockText: {
    fontSize: 15,
    color: '#6B8276',
    fontWeight: '600',
    backgroundColor: '#F4F9F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  doneBtnLarge: {
    backgroundColor: '#22A05B',
    width: '100%',
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#22A05B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  doneBtnTextLarge: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  }
});
