import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  StatusBar
} from 'react-native';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent
} from 'expo-speech-recognition';
import { useLanguage } from '../context/LanguageContext';
import { createSale, addStock } from '../services/api';
import { ParsedCommand, parseVoiceCommand } from '../services/ai';

const localeMap = {
  English: 'en-LK',
  Tamil: 'ta-LK',
  Sinhala: 'si-LK'
} as const;

const getProductIcon = (name: string) => {
  const searchStr = name.toLowerCase();

  if (
    searchStr.includes('milk') ||
    searchStr.includes('powder') ||
    searchStr.includes('பால்') ||
    searchStr.includes('කිරි')
  ) {
    return '🥛';
  }

  if (
    searchStr.includes('biscuit') ||
    searchStr.includes('cookie') ||
    searchStr.includes('பிஸ்கட்') ||
    searchStr.includes('බිස්කට්')
  ) {
    return '🍪';
  }

  if (
    searchStr.includes('soap') ||
    searchStr.includes('சோப்பு') ||
    searchStr.includes('සබන්')
  ) {
    return '🧼';
  }

  if (
    searchStr.includes('rice') ||
    searchStr.includes('அரிசி') ||
    searchStr.includes('හාල්')
  ) {
    return '🍚';
  }

  if (
    searchStr.includes('sugar') ||
    searchStr.includes('சர்க்கரை') ||
    searchStr.includes('සීනි')
  ) {
    return '🍬';
  }

  if (
    searchStr.includes('tea') ||
    searchStr.includes('டீ') ||
    searchStr.includes('தேநீர்') ||
    searchStr.includes('තේ')
  ) {
    return '🍵';
  }

  if (
    searchStr.includes('dhal') ||
    searchStr.includes('dal') ||
    searchStr.includes('பருப்பு') ||
    searchStr.includes('පරිප්පු')
  ) {
    return '🫘';
  }

  return '📦';
};

export default function VoiceScreen() {
  const { language, setLanguage, t } = useLanguage();

  const [transcript, setTranscript] = useState('');
  const [recognizing, setRecognizing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [command, setCommand] = useState<ParsedCommand | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState<{
    title: string;
    product: string;
    stock: string;
  } | null>(null);

  useSpeechRecognitionEvent('start', () => {
    setRecognizing(true);
    setErrorMsg('');
    setSuccessMsg(null);
    setCommand(null);
  });

  useSpeechRecognitionEvent('end', () => {
    setRecognizing(false);
  });

  useSpeechRecognitionEvent('result', event => {
    const text = event.results[0]?.transcript || '';

    setTranscript(text);
    setCommand(null);
  });

  useSpeechRecognitionEvent('error', () => {
    setRecognizing(false);
    setErrorMsg(t('voice.error_speech'));
  });

  const speak = (text: string) => {
    Speech.stop();

    Speech.speak(text, {
      language: localeMap[language],
      rate: 0.9
    });
  };

  const startListening = async () => {
    const permission =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();

    if (!permission.granted) {
      setErrorMsg(t('voice.error_speech'));
      return;
    }

    setTranscript('');
    setCommand(null);
    setSuccessMsg(null);
    setErrorMsg('');

    ExpoSpeechRecognitionModule.start({
      lang: localeMap[language],
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
      contextualStrings: [
        'milk powder',
        'biscuits',
        'soap',
        'rice',
        'பால் மா',
        'பிஸ்கட்',
        'சோப்பு',
        'அரிசி',
        'කිරි පිටි',
        'බිස්කට්',
        'සබන්',
        'හාල්'
      ]
    });
  };

  const speakStockQuery = (
    productName: string,
    stock: number
  ) => {
    if (language === 'Tamil') {
      return `${productName} இருப்பில் ${stock} உள்ளது.`;
    }

    if (language === 'Sinhala') {
      return `${productName} තොගයේ ${stock}ක් ඇත.`;
    }

    return `${productName} has ${stock} units in stock.`;
  };

  const speakSaleSuccess = (
    productName: string,
    newStock: number
  ) => {
    if (language === 'Tamil') {
      return `${productName} இருப்பு இப்போது ${newStock}.`;
    }

    if (language === 'Sinhala') {
      return `${productName} තොගය දැන් ${newStock}.`;
    }

    return `${productName} stock is now ${newStock}.`;
  };

  const understand = async () => {
    if (!transcript.trim()) {
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg(null);

      const result =
        await parseVoiceCommand(
          transcript,
          1
        );

      setCommand(result);

      if (result.intent === 'query_stock') {
        const queryResponse =
          speakStockQuery(
            result.product_name || '',
            result.current_stock ?? 0
          );

        speak(queryResponse);
      }
    } catch (error: any) {
      console.error(error);

      setErrorMsg(
        t('voice.error_conn')
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmSaleOrAdd = async () => {
    if (
      !command ||
      (
        command.intent !== 'sale' &&
        command.intent !== 'add_stock'
      ) ||
      !command.product_id ||
      !command.quantity
    ) {
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      if (command.intent === 'sale') {
        const result =
          await createSale({
            product_id: command.product_id,
            quantity: command.quantity,
            shop_id: 1
          });

        const response =
          speakSaleSuccess(
            result.product_name,
            result.remaining_stock
          );

        speak(response);

        setSuccessMsg({
          title: t('voice.success_sale'),
          product: result.product_name,
          stock: String(
            result.remaining_stock
          )
        });
      }

      if (
        command.intent === 'add_stock'
      ) {
        const result =
          await addStock({
            product_id: command.product_id,
            quantity: command.quantity,
            shop_id: 1,
            note:
              'Voice assisted stock addition'
          });

        const response =
          speakSaleSuccess(
            result.product_name,
            result.new_stock
          );

        speak(response);

        setSuccessMsg({
          title: t('voice.success_add'),
          product: result.product_name,
          stock: String(
            result.new_stock
          )
        });
      }

      setCommand(null);
      setTranscript('');
    } catch (error: any) {
      console.error(error);

      setErrorMsg(
        t('voice.error_conn')
      );
    } finally {
      setLoading(false);
    }
  };

  const cancelCommand = () => {
    setCommand(null);
    setTranscript('');
    setErrorMsg('');
    setSuccessMsg(null);
  };

  return (
    <SafeAreaView
      style={styles.container}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F4F9F6"
      />

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            ←
          </Text>
        </Pressable>

        <View
          style={
            styles.headerTitleContainer
          }
        >
          <Text style={styles.title}>
            {t('voice.title')}
          </Text>
        </View>

        <View
          style={{ width: 40 }}
        />
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          {t('voice.subtitle')}
        </Text>

        <View
          style={
            styles.languageSelector
          }
        >
          {(
            [
              'English',
              'Tamil',
              'Sinhala'
            ] as const
          ).map(item => (
            <Pressable
              key={item}
              style={[
                styles.languageButton,
                language === item &&
                  styles.languageButtonActive
              ]}
              onPress={() => {
                setLanguage(item);
                setTranscript('');
                setCommand(null);
                setSuccessMsg(null);
                setErrorMsg('');
              }}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  language === item &&
                    styles.languageButtonTextActive
                ]}
              >
                {item === 'English'
                  ? 'EN'
                  : item === 'Tamil'
                    ? 'தமிழ்'
                    : 'සිංහල'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View
          style={
            styles.micContainer
          }
        >
          <Pressable
            style={[
              styles.micButton,
              recognizing &&
                styles.micButtonActive
            ]}
            onPress={
              recognizing
                ? () =>
                    ExpoSpeechRecognitionModule.stop()
                : startListening
            }
          >
            <Text
              style={styles.micIcon}
            >
              🎤
            </Text>
          </Pressable>

          <Text
            style={
              styles.micStatus
            }
          >
            {recognizing
              ? t('voice.listening')
              : t('home.tapSpeak') ||
                'Tap to Speak'}
          </Text>

          <Text
            style={
              styles.micInstruction
            }
          >
            {t('voice.instruction')}
          </Text>
        </View>

        {!transcript &&
          !command &&
          !successMsg && (
            <View
              style={
                styles.examplesContainer
              }
            >
              <View
                style={
                  styles.exampleChip
                }
              >
                <Text
                  style={
                    styles.exampleText
                  }
                >
                  {'"'}
                  {t('voice.ex1')}
                  {'"'}
                </Text>
              </View>

              <View
                style={
                  styles.exampleChip
                }
              >
                <Text
                  style={
                    styles.exampleText
                  }
                >
                  {'"'}
                  {t('voice.ex2')}
                  {'"'}
                </Text>
              </View>

              <View
                style={
                  styles.exampleChip
                }
              >
                <Text
                  style={
                    styles.exampleText
                  }
                >
                  {'"'}
                  {t('voice.ex3')}
                  {'"'}
                </Text>
              </View>
            </View>
          )}

        {(transcript.length > 0 ||
          successMsg ||
          errorMsg) && (
          <View
            style={
              styles.transcriptCard
            }
          >
            {successMsg ? (
              <View
                style={
                  styles.successContent
                }
              >
                <View
                  style={
                    styles.successIconCircle
                  }
                >
                  <Text
                    style={
                      styles.successIcon
                    }
                  >
                    ✓
                  </Text>
                </View>

                <Text
                  style={
                    styles.successTitle
                  }
                >
                  {successMsg.title}
                </Text>

                <Text
                  style={
                    styles.successProduct
                  }
                >
                  {successMsg.product}
                </Text>

                <Text
                  style={
                    styles.successStock
                  }
                >
                  {t(
                    'common.inStock'
                  )}
                  :{' '}
                  {
                    successMsg.stock
                  }
                </Text>
              </View>
            ) : errorMsg ? (
              <View
                style={
                  styles.errorContent
                }
              >
                <Text
                  style={
                    styles.errorIcon
                  }
                >
                  ⚠
                </Text>

                <Text
                  style={
                    styles.errorText
                  }
                >
                  {errorMsg}
                </Text>
              </View>
            ) : (
              <>
                <Text
                  style={
                    styles.transcriptLabel
                  }
                >
                  {t(
                    'voice.iHeard'
                  )}
                </Text>

                <TextInput
                  style={
                    styles.transcriptInput
                  }
                  multiline
                  value={transcript}
                  onChangeText={text => {
                    setTranscript(text);
                    setCommand(null);
                  }}
                  placeholder={t(
                    'voice.placeholder'
                  )}
                />

                {!command && (
                  <Pressable
                    style={[
                      styles.checkButton,
                      transcript.trim() ===
                        '' &&
                        styles.checkButtonDisabled
                    ]}
                    onPress={
                      understand
                    }
                    disabled={
                      transcript.trim() ===
                        '' ||
                      loading
                    }
                  >
                    {loading ? (
                      <ActivityIndicator
                        color="#FFF"
                      />
                    ) : (
                      <Text
                        style={
                          styles.checkButtonText
                        }
                      >
                        {t(
                          'voice.checkCommand'
                        )}
                      </Text>
                    )}
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}

        {command && (
          <View
            style={
              styles.commandCard
            }
          >
            <View
              style={
                styles.aiUnderstanding
              }
            >
              <Text
                style={
                  styles.aiUnderstandingTitle
                }
              >
                AI Understanding
              </Text>

              <View
                style={styles.aiRow}
              >
                <Text
                  style={
                    styles.aiLabel
                  }
                >
                  Transcript
                </Text>

                <Text
                  style={
                    styles.aiValue
                  }
                >
                  {transcript}
                </Text>
              </View>

              <View
                style={styles.aiRow}
              >
                <Text
                  style={
                    styles.aiLabel
                  }
                >
                  Action
                </Text>

                <Text
                  style={
                    styles.aiValue
                  }
                >
                  {command.intent
                    .replace(
                      '_',
                      ' '
                    )
                    .toUpperCase()}
                </Text>
              </View>

              <View
                style={styles.aiRow}
              >
                <Text
                  style={
                    styles.aiLabel
                  }
                >
                  Product
                </Text>

                <Text
                  style={
                    styles.aiValue
                  }
                >
                  {command.product_name ||
                    'Not detected'}
                </Text>
              </View>

              <View
                style={styles.aiRow}
              >
                <Text
                  style={
                    styles.aiLabel
                  }
                >
                  Quantity
                </Text>

                <Text
                  style={
                    styles.aiValue
                  }
                >
                  {command.quantity ??
                    'N/A'}
                </Text>
              </View>

              <View
                style={styles.aiRow}
              >
                <Text
                  style={
                    styles.aiLabel
                  }
                >
                  Confidence
                </Text>

                <Text
                  style={
                    styles.confidenceValue
                  }
                >
                  {Math.round(
                    command.confidence *
                      100
                  )}
                  %
                </Text>
              </View>

              <Text
                style={
                  styles.editHint
                }
              >
                You can edit the recognized text above before confirming.
              </Text>
            </View>

            {command.intent ===
            'query_stock' ? (
              <View
                style={
                  styles.queryResult
                }
              >
                <Text
                  style={
                    styles.productLargeIcon
                  }
                >
                  {getProductIcon(
                    command.product_name ||
                      ''
                  )}
                </Text>

                <Text
                  style={
                    styles.productLargeName
                  }
                >
                  {
                    command.product_name
                  }
                </Text>

                <View
                  style={
                    styles.stockBadge
                  }
                >
                  <Text
                    style={
                      styles.stockBadgeValue
                    }
                  >
                    {command.current_stock ??
                      '-'}
                  </Text>

                  <Text
                    style={
                      styles.stockBadgeLabel
                    }
                  >
                    {t(
                      'common.inStock'
                    )}
                  </Text>
                </View>
              </View>
            ) : command.intent ===
                'sale' ||
              command.intent ===
                'add_stock' ? (
              <View
                style={
                  styles.confirmContent
                }
              >
                <View
                  style={
                    styles.confirmHeader
                  }
                >
                  <Text
                    style={
                      styles.productIcon
                    }
                  >
                    {getProductIcon(
                      command.product_name ||
                        ''
                    )}
                  </Text>

                  <Text
                    style={
                      styles.productName
                    }
                  >
                    {
                      command.product_name
                    }
                  </Text>
                </View>

                <View
                  style={
                    styles.confirmGrid
                  }
                >
                  <View
                    style={
                      styles.confirmColumn
                    }
                  >
                    <Text
                      style={
                        styles.confirmLabel
                      }
                    >
                      {command.intent ===
                      'sale'
                        ? t(
                            'voice.sell'
                          )
                        : t(
                            'voice.add'
                          )}
                    </Text>

                    <Text
                      style={[
                        styles.confirmValue,
                        {
                          color:
                            command.intent ===
                            'sale'
                              ? '#C0392B'
                              : '#1B7A42'
                        }
                      ]}
                    >
                      {command.intent ===
                      'sale'
                        ? '-'
                        : '+'}
                      {command.quantity}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.confirmColumn
                    }
                  >
                    <Text
                      style={
                        styles.confirmLabel
                      }
                    >
                      {t(
                        'voice.current_stock'
                      )}
                    </Text>

                    <Text
                      style={
                        styles.confirmValue
                      }
                    >
                      {command.current_stock ??
                        '-'}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.confirmColumn
                    }
                  >
                    <Text
                      style={
                        styles.confirmLabel
                      }
                    >
                      {command.intent ===
                      'sale'
                        ? t(
                            'voice.after_sale'
                          )
                        : t(
                            'voice.new_stock'
                          )}
                    </Text>

                    <Text
                      style={
                        styles.confirmValueBold
                      }
                    >
                      {command.current_stock !=
                        null &&
                      command.quantity !=
                        null
                        ? command.intent ===
                          'sale'
                          ? command.current_stock -
                            command.quantity
                          : command.current_stock +
                            command.quantity
                        : '-'}
                    </Text>
                  </View>
                </View>

                <Text
                  style={
                    styles.confirmQuestion
                  }
                >
                  {t(
                    'voice.confirm_question'
                  )}
                </Text>

                <View
                  style={
                    styles.actionRow
                  }
                >
                  <Pressable
                    style={
                      styles.cancelButton
                    }
                    onPress={
                      cancelCommand
                    }
                  >
                    <Text
                      style={
                        styles.cancelButtonText
                      }
                    >
                      {t(
                        'common.cancel'
                      )}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={
                      styles.confirmButton
                    }
                    onPress={
                      confirmSaleOrAdd
                    }
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator
                        color="#FFF"
                      />
                    ) : (
                      <Text
                        style={
                          styles.confirmButtonText
                        }
                      >
                        {command.intent ===
                        'sale'
                          ? t(
                              'voice.btn_confirm_sale'
                            )
                          : t(
                              'voice.btn_confirm_add'
                            )}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <View
                style={
                  styles.unknownCommand
                }
              >
                <Text
                  style={
                    styles.unknownIcon
                  }
                >
                  ⚠️
                </Text>

                <Text
                  style={
                    styles.unknownTitle
                  }
                >
                  Command not understood
                </Text>

                <Text
                  style={
                    styles.unknownText
                  }
                >
                  Edit the recognized text above and check it again, or tap Speak Again.
                </Text>
              </View>
            )}
          </View>
        )}

        {!recognizing &&
          (transcript ||
            command ||
            errorMsg) && (
            <Pressable
              style={
                styles.speakAgainButton
              }
              onPress={
                startListening
              }
              disabled={loading}
            >
              <Text
                style={
                  styles.speakAgainText
                }
              >
                🎤 Speak Again
              </Text>
            </Pressable>
          )}

        <View
          style={
            styles.toolsSection
          }
        >
          <Text
            style={
              styles.toolsHeading
            }
          >
            {t('voice.more_tools')}
          </Text>

          <View
            style={styles.toolsRow}
          >
            <Pressable
              style={
                styles.toolButton
              }
              onPress={() =>
                router.push(
                  '/ai-shopping'
                )
              }
            >
              <Text
                style={
                  styles.toolIcon
                }
              >
                📋
              </Text>

              <Text
                style={
                  styles.toolText
                }
              >
                Smart List
              </Text>
            </Pressable>

            <Pressable
              style={
                styles.toolButton
              }
              onPress={() =>
                router.push(
                  '/invoice-ai'
                )
              }
            >
              <Text
                style={
                  styles.toolIcon
                }
              >
                🧾
              </Text>

              <Text
                style={
                  styles.toolText
                }
              >
                Invoice AI
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#F4F9F6'
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      paddingHorizontal: 20,
      paddingTop:
        Platform.OS === 'ios'
          ? 10
          : 30,
      paddingBottom: 16,
      backgroundColor:
        '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor:
        '#E8F0EA'
    },

    backButton: {
      paddingVertical: 6,
      paddingHorizontal: 8
    },

    backButtonText: {
      fontSize: 24,
      color: '#0F3D26'
    },

    headerTitleContainer: {
      alignItems: 'center'
    },

    title: {
      fontSize: 20,
      fontWeight: '800',
      color: '#0F3D26'
    },

    content: {
      padding: 20,
      paddingBottom: 60
    },

    subtitle: {
      fontSize: 15,
      color: '#4E735D',
      textAlign: 'center',
      marginBottom: 30,
      lineHeight: 22
    },

    languageSelector: {
      flexDirection: 'row',
      backgroundColor:
        '#EAF2ED',
      padding: 4,
      borderRadius: 14,
      marginTop: 4,
      marginBottom: 24
    },

    languageButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 11
    },

    languageButtonActive: {
      backgroundColor:
        '#22A05B'
    },

    languageButtonText: {
      color: '#60766A',
      fontWeight: '700',
      fontSize: 13
    },

    languageButtonTextActive: {
      color: '#FFFFFF'
    },

    aiUnderstanding: {
      backgroundColor:
        '#F2F8F4',
      borderRadius: 14,
      padding: 14,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: '#D8EADD'
    },

    aiUnderstandingTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#176B3A',
      marginBottom: 10
    },

    aiRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems:
        'flex-start',
      marginTop: 6,
      gap: 12
    },

    aiLabel: {
      color: '#687D71',
      fontSize: 13,
      flexShrink: 0
    },

    aiValue: {
      color: '#263E30',
      fontWeight: '700',
      fontSize: 13,
      maxWidth: '65%',
      textAlign: 'right',
      flexShrink: 1
    },

    confidenceValue: {
      color: '#158347',
      fontWeight: '900',
      fontSize: 13
    },

    editHint: {
      marginTop: 12,
      color: '#66796D',
      fontSize: 12,
      lineHeight: 17
    },

    speakAgainButton: {
      borderWidth: 1,
      borderColor: '#22A05B',
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 4
    },

    speakAgainText: {
      color: '#157540',
      fontWeight: '800',
      fontSize: 15
    },

    micContainer: {
      alignItems: 'center',
      marginBottom: 30
    },

    micButton: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor:
        '#22A05B',
      alignItems: 'center',
      justifyContent:
        'center',
      shadowColor:
        '#22A05B',
      shadowOffset: {
        width: 0,
        height: 8
      },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      marginBottom: 16
    },

    micButtonActive: {
      backgroundColor:
        '#1B7A42',
      transform: [
        {
          scale: 1.05
        }
      ]
    },

    micIcon: {
      fontSize: 42
    },

    micStatus: {
      fontSize: 18,
      fontWeight: '700',
      color: '#1A2E24',
      marginBottom: 6
    },

    micInstruction: {
      fontSize: 13,
      color: '#6B8276'
    },

    examplesContainer: {
      alignItems: 'center',
      gap: 10
    },

    exampleChip: {
      backgroundColor:
        '#EAF7EE',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20
    },

    exampleText: {
      color: '#1B7A42',
      fontSize: 14,
      fontWeight: '500'
    },

    transcriptCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4
      },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
      marginBottom: 20
    },

    transcriptLabel: {
      fontSize: 13,
      color: '#6B8276',
      fontWeight: '700',
      textTransform:
        'uppercase',
      marginBottom: 10
    },

    transcriptInput: {
      fontSize: 22,
      fontWeight: '600',
      color: '#1A2E24',
      minHeight: 60,
      textAlignVertical:
        'top'
    },

    checkButton: {
      backgroundColor:
        '#22A05B',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 16
    },

    checkButtonDisabled: {
      backgroundColor:
        '#A2D4B6'
    },

    checkButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700'
    },

    successContent: {
      alignItems: 'center',
      paddingVertical: 10
    },

    successIconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor:
        '#EAF7EE',
      alignItems: 'center',
      justifyContent:
        'center',
      marginBottom: 12
    },

    successIcon: {
      fontSize: 32,
      color: '#22A05B',
      fontWeight: 'bold'
    },

    successTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#1A2E24',
      marginBottom: 4
    },

    successProduct: {
      fontSize: 16,
      color: '#4E735D',
      marginBottom: 4
    },

    successStock: {
      fontSize: 15,
      fontWeight: '700',
      color: '#1B7A42'
    },

    errorContent: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        '#FDEDEC',
      padding: 16,
      borderRadius: 12
    },

    errorIcon: {
      fontSize: 24,
      marginRight: 12
    },

    errorText: {
      flex: 1,
      fontSize: 14,
      color: '#C0392B',
      lineHeight: 20
    },

    commandCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4
      },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
      marginBottom: 20
    },

    queryResult: {
      alignItems: 'center',
      paddingVertical: 10
    },

    productLargeIcon: {
      fontSize: 48,
      marginBottom: 12
    },

    productLargeName: {
      fontSize: 22,
      fontWeight: '800',
      color: '#1A2E24',
      marginBottom: 12
    },

    stockBadge: {
      backgroundColor:
        '#EAF7EE',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center'
    },

    stockBadgeValue: {
      fontSize: 28,
      fontWeight: '800',
      color: '#1B7A42',
      marginBottom: 2
    },

    stockBadgeLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#1B7A42',
      textTransform:
        'uppercase'
    },

    confirmContent: {},

    confirmHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20
    },

    productIcon: {
      fontSize: 28,
      marginRight: 12
    },

    productName: {
      fontSize: 20,
      fontWeight: '800',
      color: '#1A2E24'
    },

    confirmGrid: {
      flexDirection: 'row',
      backgroundColor:
        '#F8FAF9',
      borderRadius: 12,
      padding: 12,
      marginBottom: 20
    },

    confirmColumn: {
      flex: 1,
      alignItems: 'center',
      borderRightWidth: 1,
      borderRightColor:
        '#E8F0EA'
    },

    confirmLabel: {
      fontSize: 11,
      color: '#6B8276',
      fontWeight: '600',
      textTransform:
        'uppercase',
      marginBottom: 6
    },

    confirmValue: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1A2E24'
    },

    confirmValueBold: {
      fontSize: 22,
      fontWeight: '800',
      color: '#1B7A42'
    },

    confirmQuestion: {
      fontSize: 16,
      fontWeight: '700',
      color: '#1A2E24',
      textAlign: 'center',
      marginBottom: 16
    },

    actionRow: {
      flexDirection: 'row',
      gap: 12
    },

    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor:
        '#F4F9F6',
      alignItems: 'center'
    },

    cancelButtonText: {
      color: '#6B8276',
      fontSize: 15,
      fontWeight: '700'
    },

    confirmButton: {
      flex: 1.5,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor:
        '#22A05B',
      alignItems: 'center'
    },

    confirmButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700'
    },

    unknownCommand: {
      alignItems: 'center',
      backgroundColor:
        '#FFF8EB',
      borderWidth: 1,
      borderColor:
        '#F4D9A0',
      borderRadius: 14,
      padding: 20
    },

    unknownIcon: {
      fontSize: 30,
      marginBottom: 8
    },

    unknownTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: '#7C5E19',
      marginBottom: 6
    },

    unknownText: {
      fontSize: 13,
      color: '#806E45',
      textAlign: 'center',
      lineHeight: 19
    },

    toolsSection: {
      marginTop: 20
    },

    toolsHeading: {
      fontSize: 14,
      fontWeight: '700',
      color: '#6B8276',
      textTransform:
        'uppercase',
      marginBottom: 12,
      marginLeft: 4
    },

    toolsRow: {
      flexDirection: 'row',
      gap: 12
    },

    toolButton: {
      flex: 1,
      backgroundColor:
        '#FFFFFF',
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2
      },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: 1,
      borderColor:
        '#E8F0EA'
    },

    toolIcon: {
      fontSize: 24,
      marginBottom: 6
    },

    toolText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#4E735D'
    }
  });