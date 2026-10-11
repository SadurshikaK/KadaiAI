import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import {
  useLanguage,
} from '../context/LanguageContext';

import {
  addStock,
} from '../services/api';

import {
  InvoiceDetectedItem,
  InvoiceResult,
  scanInvoice,
} from '../services/ai';

const ocrLanguageMap = {
  English: 'eng',
  Tamil: 'eng+tam',
  Sinhala: 'eng+sin',
} as const;

type ReviewItem =
  InvoiceDetectedItem & {
    quantityText: string;
  };

export default function InvoiceAIScreen() {
  const { language } =
    useLanguage();

  const [imageUri, setImageUri] =
    useState<string | null>(null);

  const [result, setResult] =
    useState<InvoiceResult | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [editableText, setEditableText] =
    useState('');

  const [reviewItems, setReviewItems] =
    useState<ReviewItem[]>([]);

  const [addingStock, setAddingStock] =
    useState(false);

  const [stockUpdated, setStockUpdated] =
    useState(false);

  const chooseInvoice = async () => {
    try {
      const permission =
        await ImagePicker
          .requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          'Please allow photo access to select an invoice.'
        );

        return;
      }

      const selected =
        await ImagePicker
          .launchImageLibraryAsync({
            allowsEditing: false,
            quality: 0.9,
          });

      if (
        !selected.canceled &&
        selected.assets.length > 0
      ) {
        setImageUri(
          selected.assets[0].uri
        );

        setResult(null);
        setEditableText('');
        setReviewItems([]);
        setStockUpdated(false);
      }
    } catch (error: any) {
      Alert.alert(
        'Image selection error',
        error.message
      );
    }
  };

  const extractInvoice = async () => {
    if (!imageUri) {
      Alert.alert(
        'No invoice selected',
        'Choose an invoice image first.'
      );

      return;
    }

    try {
      setLoading(true);
      setStockUpdated(false);

      const ocrLanguage =
        ocrLanguageMap[language];

      const response =
        await scanInvoice(
          imageUri,
          ocrLanguage,
          1
        );

      setResult(response);

      setEditableText(
        response.raw_text
      );

      setReviewItems(
        (
          response.detected_items || []
        ).map(item => ({
          ...item,
          quantityText:
            String(item.quantity),
        }))
      );
    } catch (error: any) {
      Alert.alert(
        'Invoice OCR failed',
        error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (
    index: number,
    text: string
  ) => {
    setReviewItems(
      previous =>
        previous.map(
          (
            item,
            itemIndex
          ) =>
            itemIndex === index
              ? {
                  ...item,
                  quantityText: text,
                }
              : item
        )
    );
  };

  const performStockUpdate = async () => {
  let completed = 0;

  try {
    setAddingStock(true);

    for (const item of reviewItems) {
      await addStock({
        product_id: item.product_id,
        quantity: Number(item.quantityText),
        shop_id: 1,
        note: 'Confirmed supplier invoice OCR',
      });

      completed += 1;
    }

    setStockUpdated(true);

    Alert.alert(
      'Inventory Updated',
      `${completed} product(s) were added after manual confirmation.`
    );
  } catch (error: any) {
    if (completed > 0) {
      Alert.alert(
        'Partially Updated',
        `${completed} item(s) were updated before an error occurred. Please check inventory before retrying.`
      );
    } else {
      Alert.alert(
        'Stock update failed',
        error.message || 'Unable to update inventory.'
      );
    }
  } finally {
    setAddingStock(false);
  }
};

const addDetectedItemsToStock = async () => {
  if (reviewItems.length === 0) {
    Alert.alert(
      'Nothing to add',
      'No inventory items were detected.'
    );

    return;
  }

  const invalid = reviewItems.some(item => {
    const quantity = Number(item.quantityText);

    return (
      !Number.isInteger(quantity) ||
      quantity <= 0
    );
  });

  if (invalid) {
    Alert.alert(
      'Check quantities',
      'Every item must have a positive whole-number quantity.'
    );

    return;
  }

  const message =
    `Add ${reviewItems.length} reviewed product(s) to inventory?`;

  if (Platform.OS === 'web') {
    const confirmed = window.confirm(
      `Confirm Inventory Update\n\n${message}`
    );

    if (confirmed) {
      await performStockUpdate();
    }

    return;
  }

  Alert.alert(
    'Confirm Inventory Update',
    message,
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Confirm',
        onPress: performStockUpdate,
      },
    ]
  );
};

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.back}>
            ‹ Back
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Invoice AI
        </Text>

        <Text style={styles.subtitle}>
          Scan a supplier invoice.
          KadaiAI extracts the text,
          detects known products and
          quantities, and asks you to
          verify everything before
          inventory changes.
        </Text>

        <View
          style={
            styles.safetyBanner
          }
        >
          <Text
            style={
              styles.safetyIcon
            }
          >
            🛡️
          </Text>

          <View style={{ flex: 1 }}>
            <Text
              style={
                styles.safetyTitle
              }
            >
              Human-controlled inventory
            </Text>

            <Text
              style={
                styles.safetyText
              }
            >
              OCR suggestions never modify
              stock automatically.
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.button}
          onPress={chooseInvoice}
        >
          <Text
            style={
              styles.buttonIcon
            }
          >
            📷
          </Text>

          <Text
            style={
              styles.buttonText
            }
          >
            Choose Invoice Image
          </Text>
        </Pressable>

        {imageUri && (
          <View
            style={
              styles.previewCard
            }
          >
            <Image
              source={{
                uri: imageUri,
              }}
              style={styles.image}
            />
          </View>
        )}

        {imageUri && (
          <Pressable
            style={
              styles.extractButton
            }
            onPress={
              extractInvoice
            }
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  styles.extractText
                }
              >
                Scan & Detect Items
              </Text>
            )}
          </Pressable>
        )}

        {result && (
          <View
            style={
              styles.warningBox
            }
          >
            <Text
              style={
                styles.warningIcon
              }
            >
              ⚠️
            </Text>

            <Text
              style={
                styles.warningText
              }
            >
              {result.note}
            </Text>
          </View>
        )}

        {result && (
          <>
            <Text
              style={
                styles.heading
              }
            >
              Detected Inventory Items
            </Text>

            <Text
              style={
                styles.reviewHint
              }
            >
              Verify every product and
              quantity before confirming.
              Match confidence refers to
              product matching, not OCR
              certainty.
            </Text>

            {reviewItems.length >
            0 ? (
              reviewItems.map(
                (
                  item,
                  index
                ) => (
                  <View
                    key={
                      `${item.product_id}-${index}`
                    }
                    style={
                      styles.detectedItemCard
                    }
                  >
                    <View
                      style={
                        styles.detectedItemInfo
                      }
                    >
                      <Text
                        style={
                          styles.detectedItemName
                        }
                      >
                        {
                          item.product_name
                        }
                      </Text>

                      <Text
                        style={
                          styles.detectedSource
                        }
                        numberOfLines={2}
                      >
                        {
                          item.source_line
                        }
                      </Text>

                      <Text
                        style={
                          styles.detectedConfidence
                        }
                      >
                        Product match:{' '}
                        {Math.round(
                          item.confidence *
                            100
                        )}
                        %
                      </Text>
                    </View>

                    <View
                      style={
                        styles.quantityArea
                      }
                    >
                      <Text
                        style={
                          styles.quantityLabel
                        }
                      >
                        Qty
                      </Text>

                      <TextInput
                        style={
                          styles.quantityInput
                        }
                        keyboardType="number-pad"
                        value={
                          item.quantityText
                        }
                        onChangeText={text =>
                          updateQuantity(
                            index,
                            text
                          )
                        }
                        editable={
                          !stockUpdated
                        }
                      />
                    </View>
                  </View>
                )
              )
            ) : (
              <View
                style={
                  styles.noLines
                }
              >
                <Text
                  style={
                    styles.noLinesText
                  }
                >
                  No known products with
                  quantities were detected.
                  Review the OCR text below.
                </Text>
              </View>
            )}

            {reviewItems.length >
              0 && (
              <Pressable
                style={[
                  styles.addDetectedButton,
                  stockUpdated &&
                    styles.addDetectedButtonDisabled,
                ]}
                onPress={
                  addDetectedItemsToStock
                }
                disabled={
                  addingStock ||
                  stockUpdated
                }
              >
                {addingStock ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                  />
                ) : (
                  <Text
                    style={
                      styles.addDetectedText
                    }
                  >
                    {stockUpdated
                      ? '✓ Inventory Updated'
                      : '✓ Confirm & Add to Inventory'}
                  </Text>
                )}
              </Pressable>
            )}
          </>
        )}

        {result && (
          <>
            <Text
              style={
                styles.heading
              }
            >
              Detected OCR Lines
            </Text>

            {result
              .candidate_lines
              .length > 0 ? (
              result.candidate_lines.map(
                (
                  line,
                  index
                ) => (
                  <View
                    key={
                      `${index}-${line}`
                    }
                    style={
                      styles.lineCard
                    }
                  >
                    <Text
                      style={
                        styles.lineNumber
                      }
                    >
                      {index + 1}
                    </Text>

                    <Text
                      style={
                        styles.lineText
                      }
                    >
                      {line}
                    </Text>
                  </View>
                )
              )
            ) : (
              <View
                style={
                  styles.noLines
                }
              >
                <Text
                  style={
                    styles.noLinesText
                  }
                >
                  No probable product
                  lines were detected.
                </Text>
              </View>
            )}
          </>
        )}

        {result && (
          <>
            <Text
              style={
                styles.heading
              }
            >
              Full OCR Text
            </Text>

            <Text
              style={
                styles.rawHint
              }
            >
              Review the complete OCR
              output below. Editing this
              text does not directly
              update inventory.
            </Text>

            <TextInput
              style={
                styles.rawTextInput
              }
              multiline
              value={editableText}
              onChangeText={
                setEditableText
              }
              placeholder="No readable text detected."
            />
          </>
        )}

        {result && (
          <View
            style={
              styles.confirmInfo
            }
          >
            <Text
              style={
                styles.confirmTitle
              }
            >
              Manual confirmation required
            </Text>

            <Text
              style={
                styles.confirmDescription
              }
            >
              KadaiAI only suggests products
              and quantities from OCR.
              Inventory changes happen only
              after you review the values and
              press Confirm & Add to Inventory.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
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
      color: '#66796D',
      marginTop: 8,
      fontSize: 15,
      lineHeight: 22,
    },

    safetyBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#EAF7EE',
      borderWidth: 1,
      borderColor: '#CDE8D6',
      borderRadius: 14,
      padding: 14,
      marginTop: 18,
    },

    safetyIcon: {
      fontSize: 22,
      marginRight: 10,
    },

    safetyTitle: {
      color: '#1E643C',
      fontWeight: '800',
      fontSize: 14,
    },

    safetyText: {
      color: '#557064',
      fontSize: 12,
      marginTop: 3,
    },

    button: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#D8E8DE',
      marginTop: 18,
      borderRadius: 16,
      padding: 18,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },

    buttonIcon: {
      fontSize: 22,
      marginRight: 10,
    },

    buttonText: {
      color: '#1C6C40',
      fontWeight: '800',
      fontSize: 15,
    },

    previewCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      marginTop: 18,
      padding: 10,
    },

    image: {
      width: '100%',
      height: 280,
      resizeMode: 'contain',
      borderRadius: 12,
    },

    extractButton: {
      backgroundColor: '#1C8A4D',
      padding: 16,
      borderRadius: 14,
      marginTop: 16,
      alignItems: 'center',
    },

    extractText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 15,
    },

    warningBox: {
      backgroundColor: '#FFF4D8',
      padding: 15,
      borderRadius: 14,
      marginTop: 22,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    warningIcon: {
      fontSize: 18,
      marginRight: 8,
    },

    warningText: {
      flex: 1,
      color: '#725B1A',
      lineHeight: 20,
      fontWeight: '600',
    },

    heading: {
      marginTop: 26,
      fontSize: 18,
      fontWeight: '800',
      color: '#234631',
    },

    reviewHint: {
      color: '#7B6B3D',
      fontSize: 13,
      marginTop: 5,
      marginBottom: 4,
      lineHeight: 19,
    },

    detectedItemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#DCE9E1',
      borderRadius: 14,
      padding: 14,
      marginTop: 10,
    },

    detectedItemInfo: {
      flex: 1,
      marginRight: 12,
    },

    detectedItemName: {
      fontWeight: '800',
      color: '#1D4F32',
      fontSize: 16,
    },

    detectedSource: {
      color: '#6B7E73',
      fontSize: 12,
      marginTop: 3,
    },

    detectedConfidence: {
      color: '#21834C',
      fontSize: 11,
      marginTop: 5,
      fontWeight: '700',
    },

    quantityArea: {
      alignItems: 'center',
    },

    quantityLabel: {
      color: '#6B7E73',
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 4,
    },

    quantityInput: {
      width: 68,
      backgroundColor: '#F2F8F4',
      borderWidth: 1,
      borderColor: '#BFDAC8',
      borderRadius: 10,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '800',
      paddingVertical: 9,
      color: '#1D4F32',
    },

    addDetectedButton: {
      backgroundColor: '#1C8A4D',
      padding: 15,
      borderRadius: 14,
      marginTop: 14,
      alignItems: 'center',
    },

    addDetectedButtonDisabled: {
      backgroundColor: '#75B991',
    },

    addDetectedText: {
      color: '#FFFFFF',
      fontWeight: '900',
    },

    lineCard: {
      backgroundColor: '#FFFFFF',
      marginTop: 9,
      borderRadius: 12,
      padding: 13,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#E0EBE4',
    },

    lineNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#E5F3EA',
      textAlign: 'center',
      lineHeight: 28,
      color: '#1C7645',
      fontWeight: '800',
      marginRight: 10,
    },

    lineText: {
      flex: 1,
      color: '#435B4E',
    },

    noLines: {
      backgroundColor: '#FFFFFF',
      padding: 18,
      borderRadius: 14,
      marginTop: 10,
      borderWidth: 1,
      borderColor: '#E0EBE4',
    },

    noLinesText: {
      color: '#708177',
      textAlign: 'center',
      lineHeight: 20,
    },

    rawHint: {
      color: '#708177',
      fontSize: 12,
      lineHeight: 18,
      marginTop: 5,
    },

    rawTextInput: {
      minHeight: 160,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 14,
      color: '#33473C',
      borderWidth: 1,
      borderColor: '#DCE9E1',
      textAlignVertical: 'top',
      fontSize: 13,
      lineHeight: 19,
      marginTop: 10,
    },

    confirmInfo: {
      backgroundColor: '#E5F3EA',
      borderRadius: 14,
      padding: 16,
      marginTop: 22,
    },

    confirmTitle: {
      color: '#205B39',
      fontWeight: '800',
      marginBottom: 5,
    },

    confirmDescription: {
      color: '#557064',
      lineHeight: 20,
    },
  });