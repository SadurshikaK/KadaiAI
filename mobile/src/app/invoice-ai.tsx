import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import AIStatusStrip from '../components/ai-status-strip';
import KadaiBottomNav from '../components/kadai-bottom-nav';
import { useLanguage } from '../context/LanguageContext';
import { addStock } from '../services/api';
import { InvoiceDetectedItem, InvoiceResult, scanInvoice } from '../services/ai';
import { logActivity } from '../services/activity';
import { KadaiColors, KadaiRadius, KadaiShadow } from '../constants/kadai-theme';

const ocrLanguageMap = {
  English: 'eng',
  Tamil: 'eng+tam',
  Sinhala: 'eng+sin',
} as const;

export type OCRItemStatus = 'MATCHED' | 'NEEDS REVIEW' | 'UNMATCHED';

type ReviewItem = InvoiceDetectedItem & {
  quantityText: string;
  status: OCRItemStatus;
};

type UnmatchedLineItem = {
  id: string;
  source_line: string;
  status: 'UNMATCHED';
};

function getStatusMeta(status: OCRItemStatus) {
  switch (status) {
    case 'MATCHED':
      return {
        label: 'MATCHED',
        color: KadaiColors.greenDark,
        bg: KadaiColors.mintSoft,
        borderColor: '#B8E6C5',
        dotColor: KadaiColors.green,
      };
    case 'NEEDS REVIEW':
      return {
        label: 'NEEDS REVIEW',
        color: '#9A6700',
        bg: KadaiColors.amberSoft,
        borderColor: '#F3D9A2',
        dotColor: KadaiColors.amber,
      };
    case 'UNMATCHED':
    default:
      return {
        label: 'UNMATCHED',
        color: KadaiColors.redDark,
        bg: KadaiColors.redSoft,
        borderColor: '#F8CACA',
        dotColor: KadaiColors.red,
      };
  }
}

function computeItemStatus(confidence: number): OCRItemStatus {
  if (confidence >= 0.8) return 'MATCHED';
  if (confidence >= 0.5) return 'NEEDS REVIEW';
  return 'UNMATCHED';
}

export default function InvoiceAIScreen() {
  const { language } = useLanguage();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [editableText, setEditableText] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingStock, setAddingStock] = useState(false);
  const [stockUpdated, setStockUpdated] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const step = stockUpdated ? 4 : result ? 3 : imageUri ? 2 : 1;

  const matchedCount = useMemo(
    () => reviewItems.filter((item) => item.status === 'MATCHED').length,
    [reviewItems]
  );

  const reviewCount = useMemo(
    () => reviewItems.filter((item) => item.status === 'NEEDS REVIEW').length,
    [reviewItems]
  );

  const unmatchedDetectedCount = useMemo(
    () => reviewItems.filter((item) => item.status === 'UNMATCHED').length,
    [reviewItems]
  );

  const unmatchedLines = useMemo<UnmatchedLineItem[]>(() => {
    if (!result) return [];
    const matchedSet = new Set(
      reviewItems.map((item) => item.source_line.trim().toLowerCase())
    );
    return result.candidate_lines
      .filter((line) => !matchedSet.has(line.trim().toLowerCase()))
      .map((line, index) => ({
        id: `unmatched_line_${index}`,
        source_line: line,
        status: 'UNMATCHED',
      }));
  }, [result, reviewItems]);

  const chooseInvoice = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Allow photo gallery access to select a supplier invoice.');
        return;
      }

      const selected = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.9,
      });

      if (!selected.canceled && selected.assets.length > 0) {
        setImageUri(selected.assets[0].uri);
        setResult(null);
        setReviewItems([]);
        setEditableText('');
        setStockUpdated(false);
        setShowDetails(false);
      }
    } catch (err: any) {
      Alert.alert('Image selection error', err?.message || 'Unable to select image.');
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Allow camera access to take a photo of your supplier invoice.');
        return;
      }

      const selected = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.9,
      });

      if (!selected.canceled && selected.assets.length > 0) {
        setImageUri(selected.assets[0].uri);
        setResult(null);
        setReviewItems([]);
        setEditableText('');
        setStockUpdated(false);
        setShowDetails(false);
      }
    } catch (err: any) {
      Alert.alert('Camera error', err?.message || 'Unable to open camera.');
    }
  };

  const extract = async () => {
    if (!imageUri) return;

    try {
      setLoading(true);
      setStockUpdated(false);
      const response = await scanInvoice(imageUri, ocrLanguageMap[language], 1);
      setResult(response);
      setEditableText(response.raw_text);
      setReviewItems(
        (response.detected_items || []).map((item) => ({
          ...item,
          quantityText: String(item.quantity),
          status: computeItemStatus(item.confidence),
        }))
      );
    } catch (err: any) {
      Alert.alert('Invoice OCR failed', err?.message || 'Unable to scan invoice.');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (index: number, text: string) => {
    setReviewItems((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index ? { ...item, quantityText: text } : item
      )
    );
  };

  const performStockUpdate = async () => {
    let completed = 0;
    try {
      setAddingStock(true);
      for (const item of reviewItems) {
        const qty = Number(item.quantityText);
        if (qty > 0) {
          await addStock({
            product_id: item.product_id,
            quantity: qty,
            shop_id: 1,
            note: 'Confirmed supplier invoice OCR',
          });
          completed += 1;
        }
      }

      // Record activity
      logActivity({
        type: 'INVOICE_UPDATE',
        title: `Invoice OCR: Updated ${completed} product(s)`,
        subtitle: `Language: ${language} • OCR verified`,
        amount: `+${completed} items`,
      });

      setStockUpdated(true);
      Alert.alert('Inventory Updated', `${completed} reviewed product(s) were added to inventory.`);
    } catch (err: any) {
      Alert.alert(
        completed > 0 ? 'Partially Updated' : 'Stock update failed',
        completed > 0
          ? `${completed} item(s) were updated before an error occurred. Check inventory before retrying.`
          : err?.message || 'Unable to update inventory.'
      );
    } finally {
      setAddingStock(false);
    }
  };

  const confirmUpdate = async () => {
    if (!reviewItems.length) {
      Alert.alert('Nothing to add', 'No known inventory products were detected.');
      return;
    }

    const invalid = reviewItems.some((item) => {
      const quantity = Number(item.quantityText);
      return !Number.isInteger(quantity) || quantity <= 0;
    });

    if (invalid) {
      Alert.alert('Check quantities', 'Every item must have a positive whole-number quantity.');
      return;
    }

    const message = `Add ${reviewItems.length} reviewed product(s) to inventory?`;

    if (Platform.OS === 'web') {
      if (window.confirm(`Confirm Inventory Update\n\n${message}`)) {
        await performStockUpdate();
      }
      return;
    }

    Alert.alert('Confirm Inventory Update', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => void performStockUpdate() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={KadaiColors.background} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={styles.title}>Invoice AI</Text>
          <Text style={styles.subtitle}>
            Scan → detect → review → update. KadaiAI never changes stock before you confirm.
          </Text>
        </View>

        <AIStatusStrip
          label="KadaiAI Vision"
          status={loading ? 'Reading invoice' : stockUpdated ? 'Inventory updated' : 'Ready'}
          busy={loading}
        />

        <Stepper current={step} />

        <View style={styles.safetyCard}>
          <View style={styles.shield}>
            <Ionicons name="shield-checkmark-outline" size={21} color={KadaiColors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.safetyTitle}>Human-controlled inventory</Text>
            <Text style={styles.safetyText}>
              OCR results are suggestions. Review products and quantities before any stock change.
            </Text>
          </View>
        </View>

        {/* Clear Image Action Buttons: Take Photo & Choose Image */}
        <View style={styles.actionButtonsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionButtonPrimary,
              pressed && { opacity: 0.88 },
            ]}
            onPress={takePhoto}
            accessibilityRole="button"
            accessibilityLabel="Take Photo of invoice"
          >
            <Ionicons name="camera-outline" size={21} color="#FFFFFF" />
            <Text style={styles.actionButtonPrimaryText}>Take Photo</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionButtonSecondary,
              pressed && { opacity: 0.88 },
            ]}
            onPress={chooseInvoice}
            accessibilityRole="button"
            accessibilityLabel="Choose Image from gallery"
          >
            <Ionicons name="image-outline" size={21} color={KadaiColors.primary} />
            <Text style={styles.actionButtonSecondaryText}>Choose Image</Text>
          </Pressable>
        </View>

        {imageUri && (
          <View style={styles.previewCard}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            <Pressable
              style={styles.scanButton}
              onPress={extract}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Scan and detect items"
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.scanText}>Reading invoice…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.scanText}>{result ? 'Scan again' : 'Scan & detect items'}</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {result && (
          <>
            <View style={styles.resultHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Review detected items</Text>
                <Text style={styles.sectionSub}>
                  {matchedCount} matched
                  {reviewCount > 0 ? ` • ${reviewCount} needs review` : ''}
                  {unmatchedDetectedCount > 0 ? ` • ${unmatchedDetectedCount} unmatched` : ''}
                </Text>
              </View>
              <View style={styles.detectedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={KadaiColors.greenDark} />
                <Text style={styles.detectedBadgeText}>SCANNED</Text>
              </View>
            </View>

            {result.note ? (
              <View style={styles.noteCard}>
                <Ionicons name="information-circle-outline" size={18} color="#9A6700" />
                <Text style={styles.noteText}>{result.note}</Text>
              </View>
            ) : null}

            {/* List of Detected Items with Status, Product, Qty, Confidence, Source Line */}
            {reviewItems.length ? (
              reviewItems.map((item, index) => {
                const meta = getStatusMeta(item.status);
                return (
                  <View key={`${item.product_id}-${index}`} style={styles.itemCard}>
                    {/* Status Badge Row */}
                    <View style={styles.itemHeaderRow}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: meta.bg, borderColor: meta.borderColor },
                        ]}
                      >
                        <View style={[styles.statusDot, { backgroundColor: meta.dotColor }]} />
                        <Text style={[styles.statusText, { color: meta.color }]}>
                          {meta.label}
                        </Text>
                      </View>
                      <View style={styles.confidenceTag}>
                        <Text style={styles.confidenceLabel}>Confidence: </Text>
                        <Text style={[styles.confidenceValue, { color: meta.color }]}>
                          {Math.round(item.confidence * 100)}%
                        </Text>
                      </View>
                    </View>

                    {/* Product & Quantity */}
                    <View style={styles.itemTop}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.itemFieldLabel}>PRODUCT</Text>
                        <Text style={styles.itemName}>{item.product_name}</Text>
                      </View>

                      <View style={styles.qtyBox}>
                        <Text style={styles.qtyLabel}>QUANTITY</Text>
                        <TextInput
                          value={item.quantityText}
                          onChangeText={(text) => updateQuantity(index, text)}
                          editable={!stockUpdated}
                          keyboardType="number-pad"
                          style={styles.qtyInput}
                          accessibilityLabel={`Quantity for ${item.product_name}`}
                        />
                      </View>
                    </View>

                    {/* Source Line */}
                    <View style={styles.sourceBox}>
                      <Text style={styles.sourceLabel}>SOURCE LINE</Text>
                      <Text style={styles.sourceText}>{item.source_line}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="search-outline" size={28} color={KadaiColors.muted} />
                <Text style={styles.emptyTitle}>No known products detected</Text>
                <Text style={styles.emptyText}>
                  Review the OCR text below and try a clearer invoice if needed.
                </Text>
              </View>
            )}

            {/* Unmatched OCR Lines with Clear Status */}
            {unmatchedLines.length > 0 && (
              <View style={styles.unmatchedSection}>
                <View style={styles.unmatchedHeaderRow}>
                  <Text style={styles.unmatchedSectionTitle}>Unmatched items & lines</Text>
                  <View style={[styles.statusBadge, styles.unmatchedGlobalBadge]}>
                    <View style={[styles.statusDot, { backgroundColor: KadaiColors.red }]} />
                    <Text style={[styles.statusText, { color: KadaiColors.redDark }]}>
                      UNMATCHED
                    </Text>
                  </View>
                </View>
                <Text style={styles.otherHint}>
                  These lines were extracted from the receipt but could not be matched to an inventory product.
                </Text>

                {unmatchedLines.slice(0, 5).map((unm) => (
                  <View key={unm.id} style={styles.unmatchedItemCard}>
                    <View style={styles.unmatchedTopRow}>
                      <Text style={styles.unmatchedFieldLabel}>PRODUCT</Text>
                      <Text style={styles.unmatchedStatusText}>UNMATCHED</Text>
                    </View>
                    <Text style={styles.unmatchedProductName}>Not linked to inventory</Text>
                    <View style={styles.sourceBoxUnmatched}>
                      <Text style={styles.sourceLabel}>SOURCE LINE</Text>
                      <Text style={styles.sourceText}>{unm.source_line}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {!!reviewItems.length && (
              <Pressable
                style={[styles.confirmButton, stockUpdated && styles.confirmDone]}
                onPress={confirmUpdate}
                disabled={addingStock || stockUpdated}
                accessibilityRole="button"
                accessibilityLabel="Confirm and update stock"
              >
                {addingStock ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={stockUpdated ? 'checkmark-circle' : 'shield-checkmark-outline'}
                      size={19}
                      color="#FFFFFF"
                    />
                    <Text style={styles.confirmText}>
                      {stockUpdated ? 'Inventory updated' : `Confirm ${reviewItems.length} item(s) & update stock`}
                    </Text>
                  </>
                )}
              </Pressable>
            )}

            <Pressable
              style={styles.detailsToggle}
              onPress={() => setShowDetails((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="Toggle full OCR text details"
            >
              <Text style={styles.detailsToggleText}>OCR details</Text>
              <Ionicons
                name={showDetails ? 'chevron-up' : 'chevron-down'}
                size={17}
                color={KadaiColors.primary}
              />
            </Pressable>

            {showDetails && (
              <View style={styles.detailsCard}>
                <Text style={styles.detailsTitle}>Full OCR text</Text>
                <Text style={styles.detailsHint}>
                  Editing this review text does not directly change inventory.
                </Text>
                <TextInput
                  style={styles.rawInput}
                  multiline
                  value={editableText}
                  onChangeText={setEditableText}
                  placeholder="No readable text detected."
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      <KadaiBottomNav />
    </SafeAreaView>
  );
}

function Stepper({ current }: { current: number }) {
  const names = ['Upload', 'Detect', 'Review', 'Update'];
  return (
    <View style={styles.stepper}>
      {names.map((name, index) => {
        const number = index + 1;
        const active = number <= current;
        return (
          <View key={name} style={styles.stepItem}>
            <View style={[styles.stepCircle, active && styles.stepCircleActive]}>
              {number < current ? (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              ) : (
                <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{number}</Text>
              )}
            </View>
            <Text style={[styles.stepName, active && styles.stepNameActive]}>{name}</Text>
            {index < names.length - 1 && (
              <View style={[styles.stepLine, number < current && styles.stepLineActive]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: KadaiColors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100, // Android bottom nav overlap protection
    gap: 15,
  },
  title: {
    fontSize: 27,
    fontWeight: '900',
    color: KadaiColors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13.5,
    color: KadaiColors.text2,
    lineHeight: 19,
    marginTop: 4,
  },
  stepper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: KadaiColors.border,
    borderRadius: KadaiRadius.large,
    paddingHorizontal: 10,
    paddingVertical: 13,
    flexDirection: 'row',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EDF2EE',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepCircleActive: {
    backgroundColor: KadaiColors.primary,
  },
  stepNumber: {
    color: KadaiColors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepName: {
    marginTop: 5,
    fontSize: 9.5,
    color: KadaiColors.muted,
    fontWeight: '700',
  },
  stepNameActive: {
    color: KadaiColors.primary,
    fontWeight: '900',
  },
  stepLine: {
    position: 'absolute',
    top: 13,
    left: '62%',
    right: '-38%',
    height: 2,
    backgroundColor: '#E2E9E4',
  },
  stepLineActive: {
    backgroundColor: KadaiColors.green,
  },
  safetyCard: {
    backgroundColor: KadaiColors.mintSoft,
    borderWidth: 1,
    borderColor: '#CEE5D4',
    borderRadius: KadaiRadius.large,
    padding: 14,
    flexDirection: 'row',
    gap: 11,
    alignItems: 'center',
  },
  shield: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: KadaiColors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: KadaiColors.primary,
  },
  safetyText: {
    fontSize: 11.5,
    color: KadaiColors.text2,
    lineHeight: 16,
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: KadaiRadius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  actionButtonPrimary: {
    backgroundColor: KadaiColors.primary,
    ...KadaiShadow,
  },
  actionButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '900',
  },
  actionButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: KadaiColors.border,
    ...KadaiShadow,
  },
  actionButtonSecondaryText: {
    color: KadaiColors.primary,
    fontSize: 13.5,
    fontWeight: '900',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: KadaiColors.border,
    borderRadius: KadaiRadius.large,
    padding: 10,
    ...KadaiShadow,
  },
  preview: {
    width: '100%',
    height: 230,
    resizeMode: 'contain',
    borderRadius: 12,
    backgroundColor: '#F6F8F6',
  },
  scanButton: {
    minHeight: 48,
    borderRadius: 13,
    marginTop: 10,
    backgroundColor: KadaiColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '900',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: KadaiColors.text,
  },
  sectionSub: {
    marginTop: 3,
    fontSize: 11,
    color: KadaiColors.text2,
  },
  detectedBadge: {
    borderRadius: KadaiRadius.pill,
    backgroundColor: KadaiColors.mintSoft,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detectedBadgeText: {
    color: KadaiColors.greenDark,
    fontSize: 9.5,
    fontWeight: '900',
  },
  noteCard: {
    backgroundColor: KadaiColors.amberSoft,
    borderWidth: 1,
    borderColor: '#F3D9A2',
    borderRadius: KadaiRadius.medium,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  noteText: {
    flex: 1,
    color: '#795B16',
    fontSize: 11.5,
    lineHeight: 17,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: KadaiColors.border,
    borderRadius: KadaiRadius.large,
    padding: 15,
    gap: 10,
    ...KadaiShadow,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: KadaiRadius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  confidenceTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 11,
    color: KadaiColors.muted,
    fontWeight: '600',
  },
  confidenceValue: {
    fontSize: 11.5,
    fontWeight: '900',
  },
  itemTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  itemFieldLabel: {
    fontSize: 8.5,
    fontWeight: '900',
    color: KadaiColors.muted,
    letterSpacing: 0.8,
  },
  itemName: {
    fontSize: 16.5,
    fontWeight: '900',
    color: KadaiColors.text,
    lineHeight: 22,
    marginTop: 2,
  },
  qtyBox: {
    alignItems: 'center',
  },
  qtyLabel: {
    fontSize: 8.5,
    fontWeight: '900',
    color: KadaiColors.muted,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  qtyInput: {
    width: 68,
    minHeight: 44,
    textAlign: 'center',
    borderRadius: 12,
    backgroundColor: KadaiColors.surfaceAlt,
    borderWidth: 1,
    borderColor: '#CFE0D3',
    color: KadaiColors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  sourceBox: {
    borderRadius: 11,
    backgroundColor: '#F7F9F7',
    padding: 10,
    borderWidth: 1,
    borderColor: '#E6EEE8',
  },
  sourceLabel: {
    fontSize: 8.5,
    color: KadaiColors.muted,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sourceText: {
    fontSize: 12,
    color: KadaiColors.text2,
    marginTop: 3,
    lineHeight: 18,
  },
  emptyCard: {
    minHeight: 150,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: KadaiColors.border,
    borderRadius: KadaiRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: KadaiColors.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 11.5,
    color: KadaiColors.text2,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
  unmatchedSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: KadaiColors.border,
    borderRadius: KadaiRadius.large,
    padding: 14,
    gap: 10,
    ...KadaiShadow,
  },
  unmatchedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unmatchedSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: KadaiColors.text,
  },
  unmatchedGlobalBadge: {
    backgroundColor: KadaiColors.redSoft,
    borderColor: '#F8CACA',
  },
  otherHint: {
    fontSize: 11,
    color: KadaiColors.muted,
    lineHeight: 16,
  },
  unmatchedItemCard: {
    backgroundColor: '#FDF7F7',
    borderWidth: 1,
    borderColor: '#F8D7D7',
    borderRadius: KadaiRadius.medium,
    padding: 11,
    gap: 6,
  },
  unmatchedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unmatchedFieldLabel: {
    fontSize: 8.5,
    fontWeight: '900',
    color: KadaiColors.muted,
    letterSpacing: 0.8,
  },
  unmatchedStatusText: {
    fontSize: 9,
    fontWeight: '900',
    color: KadaiColors.redDark,
  },
  unmatchedProductName: {
    fontSize: 13,
    fontWeight: '700',
    color: KadaiColors.text2,
  },
  sourceBoxUnmatched: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F0D0D0',
  },
  confirmButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: KadaiColors.primary,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...KadaiShadow,
  },
  confirmDone: {
    backgroundColor: KadaiColors.greenDark,
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13.5,
  },
  detailsToggle: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E5DB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailsToggleText: {
    color: KadaiColors.primary,
    fontSize: 12.5,
    fontWeight: '900',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: KadaiRadius.large,
    borderWidth: 1,
    borderColor: KadaiColors.border,
    padding: 14,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: KadaiColors.text,
  },
  detailsHint: {
    fontSize: 10.5,
    color: KadaiColors.muted,
    marginTop: 3,
    lineHeight: 15,
  },
  rawInput: {
    minHeight: 150,
    marginTop: 10,
    borderRadius: 11,
    backgroundColor: '#F7F9F7',
    borderWidth: 1,
    borderColor: '#E1E8E3',
    padding: 11,
    textAlignVertical: 'top',
    color: KadaiColors.text2,
    fontSize: 11.5,
    lineHeight: 17,
  },
});
