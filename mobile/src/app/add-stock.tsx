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
import { getProducts, addStock, Product, StockAddResponse } from '../services/api';

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

export default function AddStockScreen() {
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ product_id?: string }>();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(10);
  const [note, setNote] = useState<string>('Supplier delivery');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [stockResult, setStockResult] = useState<StockAddResponse | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getProducts(1);
        setProducts(data);

        if (params.product_id) {
          const found = data.find((p) => p.id === Number(params.product_id));
          if (found) setSelectedProduct(found);
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
  };

  const handleIncrement = () => {
    setQuantity((prev) => prev + 5);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => Math.max(1, prev - 5));
    }
  };

  const handleQuantityTextChange = (text: string) => {
    const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num) || num <= 0) {
      setQuantity(1);
    } else {
      setQuantity(num);
    }
  };

  const handleInitiateAdd = () => {
    if (!selectedProduct) {
      setError('Please select a product.');
      return;
    }
    if (quantity <= 0) {
      setError('Added quantity must be greater than zero.');
      return;
    }
    setError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmAdd = async () => {
    if (!selectedProduct) return;
    try {
      setSubmitting(true);
      setError(null);
      const res = await addStock({
        shop_id: 1,
        product_id: selectedProduct.id,
        quantity: quantity,
        note: note.trim() || 'Supplier delivery',
      });

      setStockResult(res);
      setShowConfirmModal(false);

      // Update local product quantity
      setSelectedProduct((prev) => (prev ? { ...prev, quantity: res.new_stock } : null));
      setProducts((prev) =>
        prev.map((p) => (p.id === res.product_id ? { ...p, quantity: res.new_stock } : p))
      );
    } catch (err: any) {
      setShowConfirmModal(false);
      setError(err.message || 'Failed to update stock');
    } finally {
      setSubmitting(false);
    }
  };

  if (stockResult) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F9F6" />
        <View style={styles.successScreen}>
          <Text style={styles.successIconLarge}>✓</Text>
          <Text style={styles.successTitleLarge}>{t('stock.success')}</Text>

          <View style={styles.successDetailsBox}>
            <Text style={styles.successProductName}>{stockResult.product_name}</Text>

            <View style={styles.successRow}>
              <Text style={styles.successLabel}>{t('stock.currentStock')}:</Text>
              <Text style={styles.successValue}>{stockResult.previous_stock}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>{t('stock.adding')}:</Text>
              <Text style={styles.successValueHighlight}>+{stockResult.added_quantity}</Text>
            </View>
            <View style={[styles.successRow, styles.successTotalRow]}>
              <Text style={styles.successTotalLabel}>{t('stock.newStock')}:</Text>
              <Text style={styles.successTotalValue}>{stockResult.new_stock}</Text>
            </View>
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
          <Text style={styles.title}>{t('stock.title')}</Text>
          <Text style={styles.subtitle}>{t('stock.subtitle')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Error Alert */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {error}</Text>
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productScrollRow}
            >
              {products.map((item) => {
                const isSelected = selectedProduct?.id === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.productCard,
                      isSelected && styles.productCardSelected,
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
                      ]}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.productCardStock,
                        isSelected && styles.productCardStockSelected,
                      ]}
                    >
                      {t('common.inStock')}: {item.quantity}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* 2. Selected Product Summary */}
            {selectedProduct && (
              <View style={styles.selectedSection}>
                <View style={styles.selectedHeader}>
                  <Text style={styles.selectedIconLarge}>{getEmoji(selectedProduct.name, selectedProduct.category)}</Text>
                  <View style={styles.selectedInfo}>
                    <Text style={styles.selectedName}>{selectedProduct.name}</Text>
                    <Text style={styles.selectedCategory}>{selectedProduct.category}</Text>
                  </View>
                  <View style={styles.stockPill}>
                    <Text style={styles.stockPillLabel}>{t('stock.currentStock')}</Text>
                    <Text style={styles.stockPillValue}>{selectedProduct.quantity}</Text>
                  </View>
                </View>

                {/* 3. Quantity Controls */}
                <View style={styles.quantitySection}>
                  <Text style={styles.quantityLabel}>{t('stock.enterQuantity')}</Text>
                  <View style={styles.quantityControls}>
                    <Pressable
                      style={({ pressed }) => [styles.quantityBtn, pressed && styles.buttonPressed]}
                      onPress={handleDecrement}
                    >
                      <Text style={styles.quantityBtnText}>−5</Text>
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
                      <Text style={styles.quantityBtnText}>+5</Text>
                    </Pressable>
                  </View>
                </View>

                {/* 4. Expected New Stock */}
                <View style={styles.expectedStockContainer}>
                  <View style={styles.expectedStockBox}>
                    <Text style={styles.expectedStockLabel}>{t('stock.currentStock')}</Text>
                    <Text style={styles.expectedStockNumber}>{selectedProduct.quantity}</Text>
                  </View>
                  <Text style={styles.expectedStockMath}>+</Text>
                  <View style={styles.expectedStockBox}>
                    <Text style={styles.expectedStockLabel}>{t('stock.adding')}</Text>
                    <Text style={styles.expectedStockNumberHighlight}>{quantity}</Text>
                  </View>
                  <Text style={styles.expectedStockMath}>=</Text>
                  <View style={[styles.expectedStockBox, styles.expectedStockBoxResult]}>
                    <Text style={styles.expectedStockResultLabel}>{t('stock.newStock')}</Text>
                    <Text style={styles.expectedStockResultNumber}>{selectedProduct.quantity + quantity}</Text>
                  </View>
                </View>

                {/* 5. Note Field */}
                <View style={styles.noteContainer}>
                  <Text style={styles.noteLabel}>{t('stock.note')}</Text>
                  <TextInput
                    style={styles.noteInput}
                    placeholder={t('stock.notePlaceholder')}
                    placeholderTextColor="#8CA196"
                    value={note}
                    onChangeText={setNote}
                  />
                </View>

                {/* 6. Main Action Button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    submitting && styles.primaryButtonDisabled,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleInitiateAdd}
                  disabled={submitting}
                >
                  <Text style={styles.primaryButtonText}>
                    {t('stock.confirmTitle')} (+{quantity} {t('stock.units')})
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
            <Text style={styles.modalTitle}>{t('stock.confirmTitle')}</Text>
            <Text style={styles.modalDescription}>{t('stock.confirmMsg')}</Text>

            {selectedProduct && (
              <View style={styles.modalSummaryBox}>
                <Text style={styles.modalItemName}>{selectedProduct.name}</Text>

                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalSummaryLabel}>{t('stock.currentStock')}:</Text>
                  <Text style={styles.modalSummaryValue}>{selectedProduct.quantity}</Text>
                </View>

                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalSummaryLabel}>{t('stock.adding')}:</Text>
                  <Text style={styles.modalSummaryValueHighlight}>+{quantity}</Text>
                </View>

                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalSummaryLabel}>{t('stock.note')}:</Text>
                  <Text style={styles.modalSummaryNote} numberOfLines={1}>{note || 'None'}</Text>
                </View>

                <View style={styles.modalTotalRow}>
                  <Text style={styles.modalTotalLabel}>{t('stock.newStock')}:</Text>
                  <Text style={styles.modalTotalValue}>{selectedProduct.quantity + quantity}</Text>
                </View>
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
                onPress={handleConfirmAdd}
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
    fontSize: 14,
    color: '#6B8276',
    fontWeight: '500',
  },
  content: {
    paddingBottom: 40,
  },
  errorBox: {
    backgroundColor: '#FDEDEC',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 20,
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
  productScrollRow: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  productCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E8F0EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  productCardSelected: {
    borderColor: '#22A05B',
    backgroundColor: '#F0F9F4',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#2A3F34',
    textAlign: 'center',
    marginBottom: 8,
    height: 40,
  },
  productCardNameSelected: {
    color: '#0F3D26',
  },
  productCardStock: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B8276',
    backgroundColor: '#F4F9F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  productCardStockSelected: {
    color: '#1C8A4D',
    backgroundColor: '#E2F4EA',
  },
  selectedSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
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
  selectedIconLarge: {
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
  stockPill: {
    alignItems: 'center',
    backgroundColor: '#F0F9F4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  stockPillLabel: {
    fontSize: 12,
    color: '#1C8A4D',
    fontWeight: '700',
    marginBottom: 2,
  },
  stockPillValue: {
    fontSize: 20,
    color: '#0F3D26',
    fontWeight: '800',
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
    width: 54,
    height: 48,
    borderRadius: 16,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#0F3D26',
  },
  quantityInput: {
    width: 60,
    height: 48,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#1A2E24',
  },
  expectedStockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8F0EA',
  },
  expectedStockBox: {
    alignItems: 'center',
    flex: 1,
  },
  expectedStockBoxResult: {
    backgroundColor: '#F0F9F4',
    paddingVertical: 8,
    borderRadius: 12,
  },
  expectedStockLabel: {
    fontSize: 12,
    color: '#6B8276',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  expectedStockNumber: {
    fontSize: 20,
    color: '#1A2E24',
    fontWeight: '800',
  },
  expectedStockNumberHighlight: {
    fontSize: 20,
    color: '#1C8A4D',
    fontWeight: '800',
  },
  expectedStockResultLabel: {
    fontSize: 12,
    color: '#1C8A4D',
    fontWeight: '800',
    marginBottom: 4,
  },
  expectedStockResultNumber: {
    fontSize: 24,
    color: '#0F3D26',
    fontWeight: '800',
  },
  expectedStockMath: {
    fontSize: 20,
    color: '#89A393',
    fontWeight: '800',
    marginHorizontal: 8,
  },
  noteContainer: {
    marginBottom: 24,
  },
  noteLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A3F34',
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: '#F8FAF9',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1,
    borderColor: '#DFE8E2',
    fontSize: 15,
    color: '#1A2E24',
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
  modalItemName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2E24',
    marginBottom: 16,
  },
  modalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalSummaryLabel: {
    fontSize: 15,
    color: '#6B8276',
    fontWeight: '600',
  },
  modalSummaryValue: {
    fontSize: 15,
    color: '#1A2E24',
    fontWeight: '800',
  },
  modalSummaryValueHighlight: {
    fontSize: 15,
    color: '#1C8A4D',
    fontWeight: '800',
  },
  modalSummaryNote: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  modalTotalRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#DFE8E2',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTotalLabel: {
    fontSize: 16,
    color: '#2A3F34',
    fontWeight: '800',
  },
  modalTotalValue: {
    fontSize: 20,
    color: '#1C8A4D',
    fontWeight: '800',
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
    fontSize: 26,
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
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  successProductName: {
    fontSize: 20,
    color: '#1A2E24',
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  successLabel: {
    fontSize: 16,
    color: '#6B8276',
    fontWeight: '600',
  },
  successValue: {
    fontSize: 16,
    color: '#2A3F34',
    fontWeight: '800',
  },
  successValueHighlight: {
    fontSize: 16,
    color: '#1C8A4D',
    fontWeight: '800',
  },
  successTotalRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8F0EA',
  },
  successTotalLabel: {
    fontSize: 18,
    color: '#2A3F34',
    fontWeight: '800',
  },
  successTotalValue: {
    fontSize: 24,
    color: '#1C8A4D',
    fontWeight: '800',
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
