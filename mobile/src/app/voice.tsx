import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
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
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import AIStatusStrip from '../components/ai-status-strip';
import KadaiBottomNav from '../components/kadai-bottom-nav';
import { useLanguage } from '../context/LanguageContext';
import {
  DashboardData,
  LowStockProduct,
  addStock,
  createSale,
  getDashboard,
  getLowStockProducts,
} from '../services/api';
import { ParsedCommand, parseVoiceCommand } from '../services/ai';
import { KadaiColors, KadaiRadius, KadaiShadow } from '../constants/kadai-theme';

const localeMap = {
  English: 'en-LK',
  Tamil: 'ta-LK',
  Sinhala: 'si-LK',
} as const;

const LOW_CONFIDENCE = 0.65;

type AssistantInfo =
  | {
      type: 'low_stock';
      items: LowStockProduct[];
    }
  | {
      type: 'shop_summary';
      dashboard: DashboardData;
    }
  | {
      type: 'restock';
    }
  | null;

function productIcon(name: string): any {
  const value = name.toLowerCase();
  if (
    value.includes('milk') ||
    value.includes('à®ªà®¾à®²à¯') ||
    value.includes('à¶šà·’à¶»à·’')
  ) {
    return 'cafe-outline';
  }
  if (
    value.includes('biscuit') ||
    value.includes('cookie') ||
    value.includes('à®ªà®¿à®¸à¯à®•à®Ÿà¯') ||
    value.includes('à¶¶à·’à·ƒà·Šà¶šà¶§à·Š')
  ) {
    return 'fast-food-outline';
  }
  if (
    value.includes('soap') ||
    value.includes('à®šà¯‹à®ªà¯à®ªà¯') ||
    value.includes('à·ƒà¶¶à¶±à·Š')
  ) {
    return 'water-outline';
  }
  if (
    value.includes('rice') ||
    value.includes('à®…à®°à®¿à®šà®¿') ||
    value.includes('à·„à·à¶½à·Š')
  ) {
    return 'basket-outline';
  }
  return 'cube-outline';
}

function confidenceMeta(value: number) {
  if (value >= 0.85) {
    return {
      label: 'HIGH',
      color: KadaiColors.greenDark,
      bg: KadaiColors.mintSoft,
    };
  }
  if (value >= 0.65) {
    return {
      label: 'REVIEW',
      color: '#9A6700',
      bg: KadaiColors.amberSoft,
    };
  }
  return {
    label: 'LOW',
    color: KadaiColors.redDark,
    bg: KadaiColors.redSoft,
  };
}

export default function VoiceScreen() {
  const { language, setLanguage, t } = useLanguage();
  const [transcript, setTranscript] = useState('');
  const [recognizing, setRecognizing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [command, setCommand] = useState<ParsedCommand | null>(null);
  const [assistantInfo, setAssistantInfo] = useState<AssistantInfo>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState<{
    title: string;
    product: string;
    stock: string;
  } | null>(null);
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!recognizing) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [recognizing, pulse]);

  useSpeechRecognitionEvent('start', () => {
    setRecognizing(true);
    setErrorMsg('');
    setSuccessMsg(null);
    setCommand(null);
    setAssistantInfo(null);
    setShowWhy(false);
  });

  useSpeechRecognitionEvent('end', () => {
    setRecognizing(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';
    setTranscript(text);
    setCommand(null);
    setAssistantInfo(null);
    setShowWhy(false);
  });

  useSpeechRecognitionEvent('error', () => {
    setRecognizing(false);
    setErrorMsg(t('voice.error_speech'));
  });

  const speak = (text: string) => {
    Speech.stop();
    Speech.speak(text, {
      language: localeMap[language],
      rate: 0.9,
    });
  };

  const speakStockNow = (product: string, stock: number) => {
    if (language === 'Tamil') {
      speak(`${product} à®‡à®°à¯à®ªà¯à®ªà¯ à®‡à®ªà¯à®ªà¯‹à®¤à¯ ${stock} à®…à®²à®•à¯à®•à®³à¯.`);
    } else if (language === 'Sinhala') {
      speak(`${product} à¶­à·œà¶œà¶º à¶¯à·à¶±à·Š à¶’à¶šà¶š ${stock}à¶šà·’.`);
    } else {
      speak(`${product} stock is now ${stock} units.`);
    }
  };

  const startListening = async () => {
    const permission =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();

    if (!permission.granted) {
      setErrorMsg(t('voice.microphone_required'));
      return;
    }

    setTranscript('');
    setCommand(null);
    setAssistantInfo(null);
    setShowWhy(false);
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
        'sold',
        'sell',
        'add',
        'stock',
        'low stock',
        'restock',
        'shop today',
        'à®ªà®¾à®²à¯ à®®à®¾',
        'à®ªà®¿à®¸à¯à®•à®Ÿà¯',
        'à®šà¯‹à®ªà¯à®ªà¯',
        'à®…à®°à®¿à®šà®¿',
        'à®µà®¿à®±à¯à®±à¯‡à®©à¯',
        'à®µà®¿à®±à¯à®•',
        'à®šà¯‡à®°à¯à®•à¯à®•',
        'à®‡à®°à¯à®ªà¯à®ªà¯',
        'à®•à¯à®±à¯ˆà®¨à¯à®¤ à®‡à®°à¯à®ªà¯à®ªà¯',
        'à¶šà·’à¶»à·’ à¶´à·’à¶§à·’',
        'à¶¶à·’à·ƒà·Šà¶šà¶§à·Š',
        'à·ƒà¶¶à¶±à·Š',
        'à·„à·à¶½à·Š',
        'à·€à·’à¶šà·”à¶«à·”à·€à·',
        'à·€à·’à¶šà·”à¶«à¶±à·Šà¶±',
        'à¶‘à¶šà¶­à·” à¶šà¶»à¶±à·Šà¶±',
        'à¶­à·œà¶œ',
        'à¶…à¶©à·” à¶­à·œà¶œ',
      ],
    });
  };

  const understand = async () => {
    if (!transcript.trim()) return;

    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg(null);
      setAssistantInfo(null);
      setShowWhy(false);

      const parsed = await parseVoiceCommand(transcript, 1);
      setCommand(parsed);

      if (parsed.intent === 'query_stock') {
        const product = parsed.product_name || 'Product';
        const stock = parsed.current_stock ?? 0;

        if (language === 'Tamil') {
          speak(`${product} à®‡à®°à¯à®ªà¯à®ªà®¿à®²à¯ ${stock} à®…à®²à®•à¯à®•à®³à¯ à®‰à®³à¯à®³à®©.`);
        } else if (language === 'Sinhala') {
          speak(`${product} à¶­à·œà¶œà¶ºà·š à¶’à¶šà¶š ${stock}à¶šà·Š à¶‡à¶­.`);
        } else {
          speak(`${product} has ${stock} units in stock.`);
        }
        return;
      }

      if (parsed.intent === 'query_low_stock') {
        const items = await getLowStockProducts(1);

        setAssistantInfo({
          type: 'low_stock',
          items,
        });

        if (!items.length) {
          if (language === 'Tamil') {
            speak('à®¤à®±à¯à®ªà¯‹à®¤à¯ à®•à¯à®±à¯ˆà®¨à¯à®¤ à®‡à®°à¯à®ªà¯à®ªà¯à®³à¯à®³ à®ªà¯Šà®°à¯à®Ÿà¯à®•à®³à¯ à®‡à®²à¯à®²à¯ˆ.');
          } else if (language === 'Sinhala') {
            speak('à¶¯à·à¶±à¶§ à¶…à¶©à·” à¶­à·œà¶œ à·ƒà·„à·’à¶­ à¶·à·à¶«à·Šà¶© à¶±à·œà¶¸à·à¶­.');
          } else {
            speak('There are currently no low stock products.');
          }
          return;
        }

        const names = items
          .slice(0, 3)
          .map((item) => item.name)
          .join(', ');

        if (language === 'Tamil') {
          speak(`${items.length} à®ªà¯Šà®°à¯à®Ÿà¯à®•à®³à¯à®•à¯à®•à¯ à®•à®µà®©à®®à¯ à®¤à¯‡à®µà¯ˆ. ${names}.`);
        } else if (language === 'Sinhala') {
          speak(`à¶·à·à¶«à·Šà¶© ${items.length}à¶šà¶§ à¶…à·€à¶°à·à¶±à¶º à¶…à·€à·à·Šâ€à¶ºà¶ºà·’. ${names}.`);
        } else {
          speak(`${items.length} products need attention. ${names}.`);
        }
        return;
      }

      if (parsed.intent === 'restock_advice') {
        setAssistantInfo({
          type: 'restock',
        });

        if (language === 'Tamil') {
          speak(
            'à®‰à®™à¯à®•à®³à¯ à®‡à®°à¯à®ªà¯à®ªà¯à®®à¯ à®ªà®Ÿà¯à®œà¯†à®Ÿà¯à®Ÿà¯à®®à¯ à®…à®Ÿà®¿à®ªà¯à®ªà®Ÿà¯ˆà®¯à®¿à®²à¯ à®¸à¯à®®à®¾à®°à¯à®Ÿà¯ à®•à¯Šà®³à¯à®®à¯à®¤à®²à¯ à®¤à®¿à®Ÿà¯à®Ÿà®¤à¯à®¤à¯ˆ à®‰à®°à¯à®µà®¾à®•à¯à®•à®²à®¾à®®à¯.'
          );
        } else if (language === 'Sinhala') {
          speak(
            'à¶”à¶¶à¶œà·š à¶­à·œà¶œà¶º à·ƒà·„ à¶…à¶ºà·€à·à¶º à¶…à¶±à·”à·€ à·ƒà·Šà¶¸à·à¶»à·Šà¶§à·Š à¶±à·à·€à¶­ à¶­à·œà¶œ à·ƒà·à¶½à·à·ƒà·Šà¶¸à¶šà·Š à·ƒà·‘à¶¯à·’à¶º à·„à·à¶š.'
          );
        } else {
          speak(
            'I can build a smart restocking plan using your current stock and budget.'
          );
        }
        return;
      }

      if (parsed.intent === 'shop_summary') {
        const dashboard = await getDashboard(1);

        setAssistantInfo({
          type: 'shop_summary',
          dashboard,
        });

        if (language === 'Tamil') {
          speak(
            `à®‡à®©à¯à®±à¯ˆà®¯ à®µà®¿à®±à¯à®ªà®©à¯ˆ ${dashboard.today_sales} à®°à¯‚à®ªà®¾à®¯à¯. ${dashboard.sales_count} à®ªà®°à®¿à®µà®°à¯à®¤à¯à®¤à®©à¯ˆà®•à®³à¯ à®‰à®³à¯à®³à®©. ${dashboard.low_stock_count} à®ªà¯Šà®°à¯à®Ÿà¯à®•à®³à¯à®•à¯à®•à¯ à®•à®µà®©à®®à¯ à®¤à¯‡à®µà¯ˆ.`
          );
        } else if (language === 'Sinhala') {
          speak(
            `à¶…à¶¯ à·€à·’à¶šà·”à¶«à·”à¶¸à·Š à¶»à·”à¶´à·’à¶ºà¶½à·Š ${dashboard.today_sales}. à¶œà¶±à·”à¶¯à·™à¶±à·” ${dashboard.sales_count}à¶šà·Š à¶‡à¶­. à¶·à·à¶«à·Šà¶© ${dashboard.low_stock_count}à¶šà¶§ à¶…à·€à¶°à·à¶±à¶º à¶…à·€à·à·Šâ€à¶ºà¶ºà·’.`
          );
        } else {
          speak(
            `Today's sales are ${dashboard.today_sales} rupees. There are ${dashboard.sales_count} transactions and ${dashboard.low_stock_count} low stock products.`
          );
        }
        return;
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(t('voice.error_conn'));
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (
      !command ||
      (command.intent !== 'sale' &&
        command.intent !== 'add_stock') ||
      !command.product_id ||
      !command.quantity ||
      command.confidence < LOW_CONFIDENCE
    ) {
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      if (command.intent === 'sale') {
        const response = await createSale({
          product_id: command.product_id,
          quantity: command.quantity,
          shop_id: 1,
        });

        speakStockNow(
          response.product_name,
          response.remaining_stock
        );

        setSuccessMsg({
          title: t('voice.success_sale'),
          product: response.product_name,
          stock: String(response.remaining_stock),
        });
      } else {
        const response = await addStock({
          product_id: command.product_id,
          quantity: command.quantity,
          shop_id: 1,
          note: 'Voice assisted stock addition',
        });

        speakStockNow(
          response.product_name,
          response.new_stock
        );

        setSuccessMsg({
          title: t('voice.success_add'),
          product: response.product_name,
          stock: String(response.new_stock),
        });
      }

      setCommand(null);
      setAssistantInfo(null);
      setShowWhy(false);
      setTranscript('');
    } catch (err) {
      console.error(err);
      setErrorMsg(t('voice.error_conn'));
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setTranscript('');
    setCommand(null);
    setAssistantInfo(null);
    setShowWhy(false);
    setErrorMsg('');
    setSuccessMsg(null);
  };

  const current =
    command?.current_stock ?? null;

  const after =
    command &&
    current != null &&
    command.quantity != null
      ? command.intent === 'sale'
        ? current - command.quantity
        : command.intent === 'add_stock'
          ? current + command.quantity
          : current
      : null;

  const confidence =
    Math.round(
      (command?.confidence || 0) * 100
    );

  const confidenceInfo =
    confidenceMeta(
      command?.confidence || 0
    );

  const lowConfidence =
    !!command &&
    command.confidence < LOW_CONFIDENCE;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={KadaiColors.background}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={styles.title}>
            {t('voice.ask_title')}
          </Text>
          <Text style={styles.subtitle}>
            {t('voice.subtitle')}
          </Text>
        </View>

        <AIStatusStrip
          status={
            recognizing
              ? t('voice.listening')
              : loading
                ? t('voice.checkCommand')
                : 'Ready'
          }
          busy={recognizing || loading}
        />

        <View style={styles.languageSelector}>
          {(
            [
              'English',
              'Tamil',
              'Sinhala',
            ] as const
          ).map((item) => {
            const active =
              language === item;

            return (
              <Pressable
                key={item}
                style={[
                  styles.languageButton,
                  active &&
                    styles.languageActive,
                ]}
                onPress={() => {
                  setLanguage(item);
                  clear();
                }}
              >
                <Text
                  style={[
                    styles.languageText,
                    active &&
                      styles.languageTextActive,
                  ]}
                >
                  {item === 'English'
                    ? 'EN'
                    : item === 'Tamil'
                      ? 'à®¤à®®à®¿à®´à¯'
                      : 'à·ƒà·’à¶‚à·„à¶½'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.assistantCard}>
          <Text style={styles.askEyebrow}>
            KADAI AI VOICE
          </Text>

          <Text style={styles.askTitle}>
            {recognizing
              ? t('voice.listening')
              : t('voice.ask_prompt')}
          </Text>

          <View style={styles.waveRow}>
            {[
              12,
              22,
              34,
              24,
              40,
              28,
              18,
            ].map((height, index) => (
              <View
                key={index}
                style={[
                  styles.wave,
                  {
                    height:
                      recognizing
                        ? height
                        : 8,
                    opacity:
                      recognizing
                        ? 1
                        : 0.35,
                  },
                ]}
              />
            ))}
          </View>

          <Animated.View
            style={{
              transform: [
                {
                  scale: pulse,
                },
              ],
            }}
          >
            <Pressable
              style={[
                styles.micButton,
                recognizing &&
                  styles.micButtonListening,
              ]}
              onPress={
                recognizing
                  ? () =>
                      ExpoSpeechRecognitionModule.stop()
                  : startListening
              }
            >
              <Ionicons
                name={
                  recognizing
                    ? 'stop'
                    : 'mic'
                }
                size={31}
                color="#FFFFFF"
              />
            </Pressable>
          </Animated.View>

          <Text style={styles.tapText}>
            {recognizing
              ? t('voice.listening')
              : t('voice.tap_speak')}
          </Text>

          <Text style={styles.tapHint}>
            {t('voice.short_hint')}
          </Text>

          {!transcript &&
            !command &&
            !successMsg && (
              <View style={styles.examples}>
                <Example
                  text={t('voice.ex1')}
                />
                <Example
                  text={t('voice.ex2')}
                />
                <Example
                  text={t('voice.ex3')}
                />
              </View>
            )}
        </View>

        {!!errorMsg && (
          <View style={styles.errorCard}>
            <Ionicons
              name="warning-outline"
              size={20}
              color={KadaiColors.redDark}
            />
            <Text style={styles.errorText}>
              {errorMsg}
            </Text>
          </View>
        )}

        {successMsg && (
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons
                name="checkmark"
                size={25}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.successTitle}>
              {successMsg.title}
            </Text>

            <Text style={styles.successProduct}>
              {successMsg.product}
            </Text>

            <Text style={styles.successStock}>
              {t('voice.current_stock')}:{' '}
              {successMsg.stock}{' '}
              {t('voice.units')}
            </Text>

            <Pressable
              style={styles.againButton}
              onPress={startListening}
            >
              <Ionicons
                name="mic-outline"
                size={17}
                color={KadaiColors.primary}
              />
              <Text style={styles.againText}>
                {t('voice.new_command')}
              </Text>
            </Pressable>
          </View>
        )}

        {!!transcript &&
          !successMsg && (
            <View
              style={styles.transcriptCard}
            >
              <Text style={styles.cardEyebrow}>
                {t('voice.iHeard')}
              </Text>

              <TextInput
                multiline
                value={transcript}
                onChangeText={(text) => {
                  setTranscript(text);
                  setCommand(null);
                  setAssistantInfo(null);
                  setShowWhy(false);
                }}
                style={styles.transcriptInput}
                placeholder={t(
                  'voice.placeholder'
                )}
              />

              {!command && (
                <Pressable
                  style={[
                    styles.understandButton,
                    (!transcript.trim() ||
                      loading) &&
                      styles.disabled,
                  ]}
                  onPress={understand}
                  disabled={
                    !transcript.trim() ||
                    loading
                  }
                >
                  {loading ? (
                    <ActivityIndicator
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="sparkles"
                        size={17}
                        color="#FFFFFF"
                      />
                      <Text
                        style={
                          styles.understandText
                        }
                      >
                        {t(
                          'voice.checkCommand'
                        )}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          )}

        {command && (
          <View style={styles.understandingCard}>
            <View
              style={
                styles.understandingHeader
              }
            >
              <View style={styles.sparkBox}>
                <Ionicons
                  name="sparkles"
                  size={18}
                  color={
                    KadaiColors.primary
                  }
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={
                    styles.understandingTitle
                  }
                >
                  {t('voice.understood')}
                </Text>

                <Text
                  style={
                    styles.understandingSub
                  }
                >
                  {t(
                    'voice.review_before_change'
                  )}
                </Text>
              </View>

              <View style={styles.actionBadge}>
                <Text
                  style={
                    styles.actionBadgeText
                  }
                >
                  {command.intent
                    .replace(/_/g, ' ')
                    .toUpperCase()}
                </Text>
              </View>
            </View>

            {command.product_name ? (
              <View style={styles.productHero}>
                <View
                  style={styles.productIcon}
                >
                  <Ionicons
                    name={productIcon(
                      command.product_name
                    )}
                    size={28}
                    color={
                      KadaiColors.primary
                    }
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={styles.productName}
                  >
                    {command.product_name}
                  </Text>

                  {command.quantity !=
                    null && (
                    <Text
                      style={
                        styles.productQty
                      }
                    >
                      {command.quantity}{' '}
                      {t('voice.units')}
                    </Text>
                  )}
                </View>
              </View>
            ) : null}

            <View
              style={styles.confidenceHeader}
            >
              <View>
                <Text
                  style={
                    styles.confidenceLabel
                  }
                >
                  {t(
                    'voice.interpretation_confidence'
                  )}
                </Text>

                <View
                  style={[
                    styles.confidenceBadge,
                    {
                      backgroundColor:
                        confidenceInfo.bg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.confidenceBadgeText,
                      {
                        color:
                          confidenceInfo.color,
                      },
                    ]}
                  >
                    {confidenceInfo.label}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.confidenceValue,
                  {
                    color:
                      confidenceInfo.color,
                  },
                ]}
              >
                {confidence}%
              </Text>
            </View>

            <View
              style={styles.confidenceTrack}
            >
              <View
                style={[
                  styles.confidenceFill,
                  {
                    width: `${confidence}%`,
                    backgroundColor:
                      lowConfidence
                        ? KadaiColors.red
                        : KadaiColors.green,
                  },
                ]}
              />
            </View>

            <Pressable
              style={styles.whyButton}
              onPress={() =>
                setShowWhy(
                  (value) => !value
                )
              }
            >
              <Text style={styles.whyText}>
                {t('voice.why')}
              </Text>

              <Ionicons
                name={
                  showWhy
                    ? 'chevron-up'
                    : 'chevron-down'
                }
                size={17}
                color={KadaiColors.primary}
              />
            </Pressable>

            {showWhy && (
              <View style={styles.whyCard}>
                <View style={styles.whyRow}>
                  <Text
                    style={styles.whyLabel}
                  >
                    {t(
                      'voice.action_detected'
                    )}
                  </Text>

                  <Text
                    style={styles.whyValue}
                  >
                    {command.intent
                      .replace(/_/g, ' ')
                      .toUpperCase()}
                  </Text>
                </View>

                {command.product_name ? (
                  <View
                    style={styles.whyRow}
                  >
                    <Text
                      style={
                        styles.whyLabel
                      }
                    >
                      {t(
                        'voice.product_matched'
                      )}
                    </Text>

                    <Text
                      style={
                        styles.whyValue
                      }
                    >
                      {
                        command.product_name
                      }
                    </Text>
                  </View>
                ) : null}

                {command.quantity !=
                null ? (
                  <View
                    style={styles.whyRow}
                  >
                    <Text
                      style={
                        styles.whyLabel
                      }
                    >
                      {t(
                        'voice.quantity_detected'
                      )}
                    </Text>

                    <Text
                      style={
                        styles.whyValue
                      }
                    >
                      {command.quantity}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {lowConfidence && (
              <View
                style={
                  styles.lowConfidenceCard
                }
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#9A6700"
                />
                <Text
                  style={
                    styles.lowConfidenceText
                  }
                >
                  {language === 'Tamil'
                    ? 'à®‡à®¨à¯à®¤ à®•à®Ÿà¯à®Ÿà®³à¯ˆà®¯à®¿à®²à¯ à®ªà¯‹à®¤à¯à®®à®¾à®© à®¨à®®à¯à®ªà®¿à®•à¯à®•à¯ˆ à®‡à®²à¯à®²à¯ˆ. à®‡à®°à¯à®ªà¯à®ªà¯ à®®à®¾à®±à¯à®±à®®à¯ à®®à¯à®Ÿà®•à¯à®•à®ªà¯à®ªà®Ÿà¯à®Ÿà¯à®³à¯à®³à®¤à¯.'
                    : language ===
                        'Sinhala'
                      ? 'à¶¸à·™à¶¸ à·€à·’à¶°à·à¶±à¶º à¶´à·’à·…à·’à¶¶à¶³ à·€à·’à·à·Šà·€à·à·ƒà¶º à¶´à·Šâ€à¶»à¶¸à·à¶«à·€à¶­à·Š à¶±à·œà·€à·š. à¶­à·œà¶œ à¶ºà·à·€à¶­à·Šà¶šà·à¶½à·“à¶± à¶šà·’à¶»à·“à¶¸ à¶…à¶šà·Šâ€à¶»à·’à¶º à¶šà¶» à¶‡à¶­.'
                      : 'I am not confident enough to change inventory. Inventory update is disabled.'}
                </Text>
              </View>
            )}

            {command.intent ===
              'query_low_stock' &&
            assistantInfo?.type ===
              'low_stock' ? (
              <View style={styles.answerCard}>
                <Text
                  style={styles.answerTitle}
                >
                  {assistantInfo.items.length
                    ? `${assistantInfo.items.length} ${t(
                        'voice.low_stock_attention'
                      )}`
                    : t(
                        'voice.no_low_stock'
                      )}
                </Text>

                {assistantInfo.items.map(
                  (item) => (
                    <View
                      key={item.id}
                      style={
                        styles.lowStockRow
                      }
                    >
                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <Text
                          style={
                            styles.lowStockName
                          }
                        >
                          {item.name}
                        </Text>

                        <Text
                          style={
                            styles.lowStockMeta
                          }
                        >
                          {item.quantity}{' '}
                          {t('voice.units')}
                          {' â€¢ '}
                          {t(
                            'voice.reorder_at'
                          )}{' '}
                          {
                            item.low_stock_threshold
                          }
                        </Text>
                      </View>

                      <Ionicons
                        name="warning-outline"
                        size={19}
                        color="#9A6700"
                      />
                    </View>
                  )
                )}
              </View>
            ) : command.intent ===
                'shop_summary' &&
              assistantInfo?.type ===
                'shop_summary' ? (
              <View style={styles.answerCard}>
                <Text
                  style={styles.answerTitle}
                >
                  {t('voice.shop_summary')}
                </Text>

                <View
                  style={styles.summaryGrid}
                >
                  <View
                    style={
                      styles.summaryMiniCard
                    }
                  >
                    <Text
                      style={
                        styles.summaryNumber
                      }
                    >
                      Rs.{' '}
                      {assistantInfo.dashboard.today_sales.toLocaleString()}
                    </Text>
                    <Text
                      style={
                        styles.summaryLabel
                      }
                    >
                      {t(
                        'voice.today_sales'
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.summaryMiniCard
                    }
                  >
                    <Text
                      style={
                        styles.summaryNumber
                      }
                    >
                      {
                        assistantInfo
                          .dashboard
                          .sales_count
                      }
                    </Text>
                    <Text
                      style={
                        styles.summaryLabel
                      }
                    >
                      {t(
                        'voice.transactions'
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.summaryMiniCard
                    }
                  >
                    <Text
                      style={
                        styles.summaryNumber
                      }
                    >
                      {
                        assistantInfo
                          .dashboard
                          .low_stock_count
                      }
                    </Text>
                    <Text
                      style={
                        styles.summaryLabel
                      }
                    >
                      {t(
                        'voice.low_stock'
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.summaryMiniCard
                    }
                  >
                    <Text
                      style={
                        styles.summaryNumber
                      }
                    >
                      {
                        assistantInfo
                          .dashboard
                          .total_products
                      }
                    </Text>
                    <Text
                      style={
                        styles.summaryLabel
                      }
                    >
                      {t(
                        'voice.products'
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            ) : command.intent ===
                'restock_advice' &&
              assistantInfo?.type ===
                'restock' ? (
              <View style={styles.answerCard}>
                <Ionicons
                  name="sparkles-outline"
                  size={26}
                  color={
                    KadaiColors.primary
                  }
                />

                <Text
                  style={styles.answerTitle}
                >
                  {t('voice.restock_ready')}
                </Text>

                <Text
                  style={styles.answerText}
                >
                  {t(
                    'voice.restock_ready_text'
                  )}
                </Text>

                <Pressable
                  style={
                    styles.openRestockButton
                  }
                  onPress={() =>
                    router.push(
                      '/ai-shopping'
                    )
                  }
                >
                  <Ionicons
                    name="cart-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text
                    style={
                      styles.openRestockText
                    }
                  >
                    {t(
                      'voice.open_restock'
                    )}
                  </Text>
                </Pressable>
              </View>
            ) : command.intent ===
              'query_stock' ? (
              <View
                style={styles.stockAnswer}
              >
                <Text
                  style={styles.stockNumber}
                >
                  {command.current_stock ??
                    '-'}
                </Text>
                <Text
                  style={styles.stockLabel}
                >
                  {t(
                    'voice.current_stock'
                  )}
                </Text>
              </View>
            ) : command.intent ===
                'sale' ||
              command.intent ===
                'add_stock' ? (
              <>
                <View
                  style={styles.stockChange}
                >
                  <View
                    style={
                      styles.stockColumn
                    }
                  >
                    <Text
                      style={
                        styles.stockColumnLabel
                      }
                    >
                      {t('voice.before')}
                    </Text>
                    <Text
                      style={
                        styles.stockColumnValue
                      }
                    >
                      {current ?? '-'}
                    </Text>
                  </View>

                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={
                      KadaiColors.muted
                    }
                  />

                  <View
                    style={
                      styles.stockColumn
                    }
                  >
                    <Text
                      style={
                        styles.stockColumnLabel
                      }
                    >
                      {t('voice.after')}
                    </Text>
                    <Text
                      style={[
                        styles.stockColumnValue,
                        {
                          color:
                            KadaiColors.primary,
                        },
                      ]}
                    >
                      {after ?? '-'}
                    </Text>
                  </View>
                </View>

                <View
                  style={styles.actionRow}
                >
                  <Pressable
                    style={
                      styles.editButton
                    }
                    onPress={clear}
                  >
                    <Text
                      style={
                        styles.editText
                      }
                    >
                      {t('common.cancel')}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.confirmButton,
                      (lowConfidence ||
                        loading) &&
                        styles.disabled,
                    ]}
                    onPress={confirm}
                    disabled={
                      lowConfidence ||
                      loading
                    }
                  >
                    {loading ? (
                      <ActivityIndicator
                        color="#FFFFFF"
                      />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={18}
                          color="#FFFFFF"
                        />
                        <Text
                          style={
                            styles.confirmText
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
                      </>
                    )}
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.unknownCard}>
                <Text
                  style={styles.unknownTitle}
                >
                  {t(
                    'voice.command_not_understood'
                  )}
                </Text>

                <Text
                  style={styles.unknownText}
                >
                  {t(
                    'voice.command_unknown_help'
                  )}
                </Text>
              </View>
            )}
          </View>
        )}

        {(transcript ||
          command ||
          errorMsg) &&
          !recognizing &&
          !successMsg && (
            <Pressable
              style={styles.speakAgain}
              onPress={startListening}
              disabled={loading}
            >
              <Ionicons
                name="mic-outline"
                size={17}
                color={KadaiColors.primary}
              />
              <Text
                style={
                  styles.speakAgainText
                }
              >
                {t('voice.speak_again')}
              </Text>
            </Pressable>
          )}

        <Text style={styles.sectionTitle}>
          {t('voice.more_tools')}
        </Text>

        <View style={styles.toolRow}>
          <Pressable
            style={styles.toolCard}
            onPress={() =>
              router.push('/ai-shopping')
            }
          >
            <Ionicons
              name="sparkles-outline"
              size={22}
              color={KadaiColors.primary}
            />
            <Text style={styles.toolTitle}>
              {t('voice.smart_restock')}
            </Text>
            <Text style={styles.toolText}>
              {t(
                'voice.smart_restock_subtitle'
              )}
            </Text>
          </Pressable>

          <Pressable
            style={styles.toolCard}
            onPress={() =>
              router.push('/invoice-ai')
            }
          >
            <Ionicons
              name="scan-outline"
              size={22}
              color={KadaiColors.primary}
            />
            <Text style={styles.toolTitle}>
              {t('voice.invoice_tool')}
            </Text>
            <Text style={styles.toolText}>
              {t(
                'voice.invoice_tool_subtitle'
              )}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <KadaiBottomNav />
    </SafeAreaView>
  );
}

function Example({
  text,
}: {
  text: string;
}) {
  return (
    <View style={styles.exampleChip}>
      <Text style={styles.exampleText}>
        â€œ{text}â€
      </Text>
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
    paddingBottom: 30,
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
  languageSelector: {
    flexDirection: 'row',
    backgroundColor: '#EAF1EC',
    padding: 4,
    borderRadius: 14,
  },
  languageButton: {
    flex: 1,
    minHeight: 39,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageActive: {
    backgroundColor: '#FFFFFF',
    ...KadaiShadow,
  },
  languageText: {
    color: KadaiColors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  languageTextActive: {
    color: KadaiColors.primary,
    fontWeight: '900',
  },
  assistantCard: {
    backgroundColor: KadaiColors.primary,
    borderRadius: KadaiRadius.xl,
    padding: 20,
    alignItems: 'center',
    ...KadaiShadow,
  },
  askEyebrow: {
    color: '#A7F3D0',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  askTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 5,
    textAlign: 'center',
  },
  waveRow: {
    height: 46,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  wave: {
    width: 4,
    borderRadius: 3,
    backgroundColor: '#86EFAC',
  },
  micButton: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: '#22A05B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#52D58A',
  },
  micButtonListening: {
    backgroundColor: '#C2413B',
    borderColor: '#E88B86',
  },
  tapText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    marginTop: 13,
  },
  tapHint: {
    color: '#C7E4D1',
    fontSize: 11.5,
    marginTop: 3,
    textAlign: 'center',
  },
  examples: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 7,
    marginTop: 16,
  },
  exampleChip: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: KadaiRadius.pill,
    backgroundColor:
      'rgba(255,255,255,0.11)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.16)',
  },
  exampleText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  errorCard: {
    backgroundColor:
      KadaiColors.redSoft,
    borderWidth: 1,
    borderColor: '#F4C9C9',
    borderRadius: KadaiRadius.medium,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: KadaiColors.redDark,
    fontSize: 12.5,
    lineHeight: 17,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: KadaiColors.border,
    borderRadius: KadaiRadius.xl,
    padding: 20,
    alignItems: 'center',
    ...KadaiShadow,
  },
  successIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor:
      KadaiColors.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: KadaiColors.text,
    marginTop: 10,
  },
  successProduct: {
    fontSize: 14,
    color: KadaiColors.text2,
    marginTop: 3,
  },
  successStock: {
    fontSize: 13,
    color: KadaiColors.greenDark,
    fontWeight: '900',
    marginTop: 4,
  },
  againButton: {
    marginTop: 14,
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor:
      KadaiColors.mintSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  againText: {
    color: KadaiColors.primary,
    fontSize: 12.5,
    fontWeight: '900',
  },
  transcriptCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: KadaiColors.border,
    borderRadius: KadaiRadius.large,
    padding: 15,
    ...KadaiShadow,
  },
  cardEyebrow: {
    fontSize: 9.5,
    fontWeight: '900',
    color: KadaiColors.muted,
    letterSpacing: 1,
  },
  transcriptInput: {
    minHeight: 60,
    color: KadaiColors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 27,
    textAlignVertical: 'top',
    marginTop: 6,
  },
  understandButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor:
      KadaiColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  understandText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.5,
  },
  understandingCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: KadaiColors.border,
    borderRadius: KadaiRadius.xl,
    padding: 16,
    ...KadaiShadow,
  },
  understandingHeader: {
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
  },
  sparkBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor:
      KadaiColors.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  understandingTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: KadaiColors.text,
  },
  understandingSub: {
    fontSize: 10.5,
    color: KadaiColors.muted,
    marginTop: 2,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: KadaiRadius.pill,
    backgroundColor: KadaiColors.mint,
  },
  actionBadgeText: {
    color: KadaiColors.primary,
    fontSize: 8.5,
    fontWeight: '900',
  },
  productHero: {
    marginTop: 15,
    borderRadius: 14,
    backgroundColor:
      KadaiColors.surfaceAlt,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  productIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: KadaiColors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontSize: 18,
    fontWeight: '900',
    color: KadaiColors.text,
  },
  productQty: {
    fontSize: 12,
    color: KadaiColors.text2,
    marginTop: 2,
    fontWeight: '700',
  },
  confidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 15,
  },
  confidenceLabel: {
    fontSize: 11.5,
    color: KadaiColors.text2,
    fontWeight: '700',
  },
  confidenceValue: {
    fontSize: 12,
    color: KadaiColors.greenDark,
    fontWeight: '900',
  },
  confidenceBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  confidenceBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
  },
  confidenceTrack: {
    height: 7,
    backgroundColor: '#E8EEE9',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 7,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 5,
  },
  whyButton: {
    marginTop: 12,
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: '#F7FBF8',
    borderWidth: 1,
    borderColor: '#CFE1D4',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  whyText: {
    fontSize: 12,
    fontWeight: '900',
    color: KadaiColors.primary,
  },
  whyCard: {
    marginTop: 8,
    borderRadius: 11,
    backgroundColor: '#F8FAF8',
    padding: 12,
    gap: 8,
  },
  whyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  whyLabel: {
    flex: 1,
    fontSize: 11,
    color: KadaiColors.muted,
  },
  whyValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '900',
    color: KadaiColors.text,
  },
  lowConfidenceCard: {
    marginTop: 12,
    padding: 11,
    borderRadius: 11,
    backgroundColor:
      KadaiColors.amberSoft,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'flex-start',
  },
  lowConfidenceText: {
    flex: 1,
    color: '#765713',
    fontSize: 11,
    lineHeight: 16,
  },
  answerCard: {
    marginTop: 14,
    backgroundColor:
      KadaiColors.surfaceAlt,
    borderRadius: 14,
    padding: 14,
  },
  answerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: KadaiColors.text,
  },
  answerText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
    color: KadaiColors.text2,
  },
  lowStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor:
      KadaiColors.border,
  },
  lowStockName: {
    fontSize: 13,
    fontWeight: '900',
    color: KadaiColors.text,
  },
  lowStockMeta: {
    marginTop: 3,
    fontSize: 11,
    color: KadaiColors.text2,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  summaryMiniCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: KadaiColors.border,
  },
  summaryNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: KadaiColors.primary,
  },
  summaryLabel: {
    marginTop: 3,
    fontSize: 10.5,
    color: KadaiColors.muted,
  },
  openRestockButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor:
      KadaiColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 12,
  },
  openRestockText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '900',
  },
  stockAnswer: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 10,
  },
  stockNumber: {
    fontSize: 38,
    fontWeight: '900',
    color: KadaiColors.primary,
  },
  stockLabel: {
    color: KadaiColors.text2,
    fontSize: 12,
    marginTop: 2,
  },
  stockChange: {
    marginTop: 15,
    borderRadius: 14,
    backgroundColor: '#F7F9F7',
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  stockColumn: {
    alignItems: 'center',
    flex: 1,
  },
  stockColumnLabel: {
    fontSize: 10.5,
    color: KadaiColors.muted,
    fontWeight: '700',
  },
  stockColumnValue: {
    fontSize: 25,
    fontWeight: '900',
    color: KadaiColors.text,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
  },
  editButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#EEF2EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: {
    color: KadaiColors.text,
    fontSize: 12.5,
    fontWeight: '900',
  },
  confirmButton: {
    flex: 2,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor:
      KadaiColors.primary,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '900',
  },
  unknownCard: {
    marginTop: 13,
    padding: 12,
    borderRadius: 12,
    backgroundColor:
      KadaiColors.amberSoft,
  },
  unknownTitle: {
    color: '#7A5710',
    fontSize: 13,
    fontWeight: '900',
  },
  unknownText: {
    color: '#765713',
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 3,
  },
  speakAgain: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CFE1D4',
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakAgainText: {
    color: KadaiColors.primary,
    fontSize: 12.5,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: KadaiColors.text,
    marginTop: 2,
  },
  toolRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toolCard: {
    flex: 1,
    minHeight: 115,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: KadaiColors.border,
    borderRadius: KadaiRadius.large,
    padding: 14,
    ...KadaiShadow,
  },
  toolTitle: {
    color: KadaiColors.text,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 9,
  },
  toolText: {
    color: KadaiColors.text2,
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 3,
  },
});