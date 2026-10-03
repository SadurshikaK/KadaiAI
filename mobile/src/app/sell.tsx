import { useEffect, useState } from 'react';
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
        } else if (data.length > 0) {
          setSelectedProduct(data[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Could not load products');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.product_id]);

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F9F6" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('sell.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Banner */}
        {saleResult && (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>{t('sell.success')}</Text>
              <Text style={styles.successSubtitle}>
                Sold {saleResult.quantity}x {saleResult.product_name} for Rs. {saleResult.total_amount}. Remaining stock: {saleResult.remaining_stock}
              </Text>
            </View>
            <Pressable
              style={styles.doneBtn}
              onPress={() => router.replace('/home')}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        )}

        {/* Error Alert */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#22A05B" />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : (
          <>
            {/* 1. Product Selection */}
            <Text style={styles.sectionHeading}>{t('sell.selectProduct')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productPillsRow}
            >
              {products.map((item) => {
                const isSelected = selectedProduct?.id === item.id;
                const isOutOfStock = item.quantity <= 0;
                return (
                  <Pressable
                    key={item.id}
                    disabled={isOutOfStock}
                    style={({ pressed }) => [
                      styles.productPill,
                      isSelected && styles.productPillSelected,
                      isOutOfStock && styles.productPillDisabled,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => handleSelectProduct(item)}
                  >
                    <Text
                      style={[
                        styles.productPillName,
                        isSelected && styles.productPillNameSelected,
                        isOutOfStock && styles.productPillNameDisabled,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.productPillSub,
                        isSelected && styles.productPillSubSelected,
                      ]}
                    >
                      {isOutOfStock ? 'Out of stock' : `Stock: ${item.quantity}`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* 2. Selected Product Overview Card */}
            {selectedProduct && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View>
                    <Text style={styles.summaryProductName}>{selectedProduct.name}</Text>
                    <Text style={styles.summaryCategory}>{selectedProduct.category}</Text>
                  </View>
                  <View style={styles.pricePill}>
                    <Text style={styles.pricePillText}>
                      Rs. {Number(selectedProduct.selling_price).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Available Stock Indicator */}
                <View style={styles.stockStatusRow}>
                  <Text style={styles.stockStatusLabel}>{t('common.inStock')}:</Text>
                  <Text
                    style={[
                      styles.stockStatusValue,
                      selectedProduct.quantity <= selectedProduct.low_stock_threshold && styles.stockStatusLow,
                    ]}
                  >
                    {selectedProduct.quantity} units
                  </Text>
                </View>

                {/* 3. Quantity Stepper */}
                <View style={styles.stepperContainer}>
                  <Text style={styles.stepperLabel}>{t('sell.enterQuantity')}:</Text>
                  <View style={styles.stepperControls}>
                    <Pressable
                      style={({ pressed }) => [styles.stepperBtn, pressed && styles.buttonPressed]}
                      onPress={handleDecrement}
                    >
                      <Text style={styles.stepperBtnText}>−</Text>
                    </Pressable>

                    <TextInput
                      style={styles.stepperInput}
                      keyboardType="numeric"
                      value={quantity.toString()}
                      onChangeText={handleQuantityTextChange}
                    />

                    <Pressable
                      style={({ pressed }) => [styles.stepperBtn, pressed && styles.buttonPressed]}
                      onPress={handleIncrement}
                    >
                      <Text style={styles.stepperBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Total Calculation */}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{t('common.totalAmount')}:</Text>
                  <Text style={styles.totalAmount}>Rs. {totalAmount.toLocaleString()}</Text>
                </View>

                {/* Sell Action Button */}
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
                    🛒 {t('home.sellProduct')} (Rs. {totalAmount.toLocaleString()})
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
                <Text style={styles.modalItemName}>{selectedProduct.name}</Text>
                <Text style={styles.modalDetailText}>
                  Quantity: <Text style={{ fontWeight: '700' }}>{quantity}</Text> × Rs. {unitPrice}
                </Text>
                <Text style={styles.modalTotalText}>
                  Total: Rs. {totalAmount.toLocaleString()}
                </Text>
                <Text style={styles.modalStockWarning}>
                  Stock will decrease from {selectedProduct.quantity} to {selectedProduct.quantity - quantity}
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

  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF7EE',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C3E6CB',
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#155724',
    marginBottom: 2,
  },
  successSubtitle: {
    fontSize: 13,
    color: '#28623A',
    lineHeight: 18,
  },
  doneBtn: {
    backgroundColor: '#22A05B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  errorBox: {
    backgroundColor: '#FDEDEC',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FADBD8',
  },
  errorText: {
    color: '#C0392B',
    fontSize: 14,
    fontWeight: '500',
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

  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A3F34',
    marginBottom: 12,
  },
  productPillsRow: {
    gap: 10,
    paddingBottom: 20,
  },
  productPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#DFE8E2',
    minWidth: 120,
  },
  productPillSelected: {
    borderColor: '#22A05B',
    backgroundColor: '#F0F9F4',
  },
  productPillDisabled: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
  productPillName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2E24',
    marginBottom: 2,
  },
  productPillNameSelected: {
    color: '#0F3D26',
  },
  productPillNameDisabled: {
    color: '#999999',
  },
  productPillSub: {
    fontSize: 12,
    color: '#6B8276',
  },
  productPillSubSelected: {
    color: '#22A05B',
    fontWeight: '600',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8F0EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F2',
  },
  summaryProductName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2E24',
    marginBottom: 2,
  },
  summaryCategory: {
    fontSize: 13,
    color: '#6B8276',
  },
  pricePill: {
    backgroundColor: '#EAF7EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pricePillText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B7A42',
  },

  stockStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  stockStatusLabel: {
    fontSize: 14,
    color: '#6B8276',
    marginRight: 6,
  },
  stockStatusValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B7A42',
  },
  stockStatusLow: {
    color: '#B7791F',
  },

  // Stepper
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  stepperLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2A3F34',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFE8E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F3D26',
    lineHeight: 24,
  },
  stepperInput: {
    width: 50,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE8E2',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2E24',
  },

  // Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B8276',
  },
  totalAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F3D26',
  },

  primaryButton: {
    backgroundColor: '#22A05B',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#8CA196',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F3D26',
    marginBottom: 6,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B8276',
    marginBottom: 16,
  },
  modalSummaryBox: {
    backgroundColor: '#F8FAF9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  modalItemName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2E24',
    marginBottom: 6,
  },
  modalDetailText: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 4,
  },
  modalTotalText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F3D26',
    marginBottom: 8,
  },
  modalStockWarning: {
    fontSize: 12,
    color: '#8A5D0F',
    fontWeight: '600',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0F4F2',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 15,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#22A05B',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
