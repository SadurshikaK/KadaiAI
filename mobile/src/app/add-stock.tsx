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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F9F6" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('stock.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Banner */}
        {stockResult && (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>📦</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>{t('stock.success')}</Text>
              <Text style={styles.successSubtitle}>
                {stockResult.product_name} increased from {stockResult.previous_stock} to {stockResult.new_stock} (+{stockResult.added_quantity} units).
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
            <Text style={styles.sectionHeading}>{t('stock.selectProduct')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productPillsRow}
            >
              {products.map((item) => {
                const isSelected = selectedProduct?.id === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.productPill,
                      isSelected && styles.productPillSelected,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => handleSelectProduct(item)}
                  >
                    <Text
                      style={[
                        styles.productPillName,
                        isSelected && styles.productPillNameSelected,
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
                      Stock: {item.quantity}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* 2. Selected Product & Stepper */}
            {selectedProduct && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View>
                    <Text style={styles.summaryProductName}>{selectedProduct.name}</Text>
                    <Text style={styles.summaryCategory}>{selectedProduct.category}</Text>
                  </View>
                  <View style={styles.stockPill}>
                    <Text style={styles.stockPillText}>
                      Current: {selectedProduct.quantity}
                    </Text>
                  </View>
                </View>

                {/* Quantity Input */}
                <View style={styles.stepperContainer}>
                  <Text style={styles.stepperLabel}>{t('stock.enterQuantity')}:</Text>
                  <View style={styles.stepperControls}>
                    <Pressable
                      style={({ pressed }) => [styles.stepperBtn, pressed && styles.buttonPressed]}
                      onPress={handleDecrement}
                    >
                      <Text style={styles.stepperBtnText}>−5</Text>
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
                      <Text style={styles.stepperBtnText}>+5</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Note Field */}
                <View style={styles.noteContainer}>
                  <Text style={styles.noteLabel}>{t('stock.note')}</Text>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="e.g. Supplier delivery / Restock"
                    placeholderTextColor="#8CA196"
                    value={note}
                    onChangeText={setNote}
                  />
                </View>

                {/* Expected New Quantity */}
                <View style={styles.expectedStockRow}>
                  <Text style={styles.expectedStockLabel}>New Expected Stock:</Text>
                  <Text style={styles.expectedStockValue}>
                    {selectedProduct.quantity + quantity} units (+{quantity})
                  </Text>
                </View>

                {/* Submit Button */}
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
                    📦 {t('stock.confirmTitle')} (+{quantity} units)
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
                <Text style={styles.modalDetailText}>
                  Adding: <Text style={{ fontWeight: '700' }}>+{quantity} units</Text>
                </Text>
                <Text style={styles.modalDetailText}>
                  Note: {note || 'None'}
                </Text>
                <Text style={styles.modalStockHighlight}>
                  Stock will increase: {selectedProduct.quantity} → {selectedProduct.quantity + quantity}
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
  productPillName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2E24',
    marginBottom: 2,
  },
  productPillNameSelected: {
    color: '#0F3D26',
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
  stockPill: {
    backgroundColor: '#F0F9F4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  stockPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F3D26',
  },

  // Stepper
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    padding: 14,
    borderRadius: 14,
    marginTop: 16,
    marginBottom: 16,
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
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFE8E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F3D26',
  },
  stepperInput: {
    width: 60,
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

  // Note Field
  noteContainer: {
    marginBottom: 16,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2A3F34',
    marginBottom: 6,
  },
  noteInput: {
    backgroundColor: '#F8FAF9',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#DFE8E2',
    fontSize: 14,
    color: '#1A2E24',
  },

  // Expected
  expectedStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F2',
    marginBottom: 20,
  },
  expectedStockLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B8276',
  },
  expectedStockValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B7A42',
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
  modalStockHighlight: {
    fontSize: 14,
    color: '#1B7A42',
    fontWeight: '700',
    marginTop: 6,
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
