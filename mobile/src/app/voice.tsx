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
import { addStock, createSale } from '../services/api';
import { ParsedCommand, parseVoiceCommand } from '../services/ai';
import { KadaiColors, KadaiRadius, KadaiShadow } from '../constants/kadai-theme';

const localeMap = {
  English: 'en-LK',
  Tamil: 'ta-LK',
  Sinhala: 'si-LK',
} as const;

const LOW_CONFIDENCE = 0.65;

function productIcon(name: string): any {
  const value = name.toLowerCase();
  if (value.includes('milk') || value.includes('பால்') || value.includes('කිරි')) return 'cafe-outline';
  if (value.includes('biscuit') || value.includes('cookie') || value.includes('பிஸ்கட்') || value.includes('බිස්කට්')) return 'fast-food-outline';
  if (value.includes('soap') || value.includes('சோப்பு') || value.includes('සබන්')) return 'water-outline';
  if (value.includes('rice') || value.includes('அரிசி') || value.includes('හාල්')) return 'basket-outline';
  return 'cube-outline';
}

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
  });

  useSpeechRecognitionEvent('end', () => setRecognizing(false));

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';
    setTranscript(text);
    setCommand(null);
  });

  useSpeechRecognitionEvent('error', () => {
    setRecognizing(false);
    setErrorMsg('Speech recognition could not understand the audio. Please try again.');
  });

  const speak = (text: string) => {
    Speech.stop();
    Speech.speak(text, { language: localeMap[language], rate: 0.9 });
  };

  const startListening = async () => {
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();

    if (!permission.granted) {
      setErrorMsg('Microphone/speech permission is required.');
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
        'හාල්',
      ],
    });
  };

  const understand = async () => {
    if (!transcript.trim()) return;

    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg(null);

      const parsed = await parseVoiceCommand(transcript, 1);
      setCommand(parsed);

      if (parsed.intent === 'query_stock') {
        const product = parsed.product_name || 'Product';
        const stock = parsed.current_stock ?? 0;

        if (language === 'Tamil') speak(`${product} இருப்பில் ${stock} உள்ளது.`);
        else if (language === 'Sinhala') speak(`${product} තොගයේ ${stock}ක් ඇත.`);
        else speak(`${product} has ${stock} units in stock.`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('KadaiAI could not process this command. Check the backend connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (
      !command ||
      (command.intent !== 'sale' && command.intent !== 'add_stock') ||
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

        speak(`${response.product_name} stock is now ${response.remaining_stock}.`);
        setSuccessMsg({
          title: 'Sale confirmed',
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

        speak(`${response.product_name} stock is now ${response.new_stock}.`);
        setSuccessMsg({
          title: 'Stock added',
          product: response.product_name,
          stock: String(response.new_stock),
        });
      }

      setCommand(null);
      setTranscript('');
    } catch (err) {
      console.error(err);
      setErrorMsg('The inventory update failed. Check stock and backend connection before retrying.');
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setTranscript('');
    setCommand(null);
    setErrorMsg('');
    setSuccessMsg(null);
  };

  const current = command?.current_stock ?? null;
  const after =
    command && current != null && command.quantity != null
      ? command.intent === 'sale'
        ? current - command.quantity
        : command.intent === 'add_stock'
          ? current + command.quantity
          : current
      : null;

  const confidence = Math.round((command?.confidence || 0) * 100);
  const lowConfidence = !!command && command.confidence < LOW_CONFIDENCE;

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
          <Text style={styles.title}>
            {t('voice.ask_title')}
          </Text>
          <Text style={styles.subtitle}>
            {t('voice.subtitle')}
          </Text>
        </View>

        <AIStatusStrip
          status={recognizing ? 'Listening' : loading ? 'Understanding command' : 'Ready'}
          busy={recognizing || loading}
        />

        <View style={styles.languageSelector}>
          {(['English', 'Tamil', 'Sinhala'] as const).map((item) => {
            const active = language === item;
            return (
              <Pressable
                key={item}
                style={[styles.languageButton, active && styles.languageActive]}
                onPress={() => {
                  setLanguage(item);
                  clear();
                }}
              >
                <Text style={[styles.languageText, active && styles.languageTextActive]}>
                  {item === 'English' ? 'EN' : item === 'Tamil' ? 'தமிழ்' : 'සිංහල'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.assistantCard}>
          <Text style={styles.askEyebrow}>KADAI AI VOICE</Text>
          <Text style={styles.askTitle}>
            {recognizing
              ? t('voice.listening')
              : t('voice.ask_prompt')}
          </Text>

          <View style={styles.waveRow}>
            {[12, 22, 34, 24, 40, 28, 18].map((height, index) => (
              <View
                key={index}
                style={[
                  styles.wave,
                  { height: recognizing ? height : 8, opacity: recognizing ? 1 : 0.35 },
                ]}
              />
            ))}
          </View>

          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              style={[styles.micButton, recognizing && styles.micButtonListening]}
              onPress={recognizing ? () => ExpoSpeechRecognitionModule.stop() : startListening}
            >
              <Ionicons name={recognizing ? 'stop' : 'mic'} size={31} color="#FFFFFF" />
            </Pressable>
          </Animated.View>

          <Text style={styles.tapText}>
            {recognizing
              ? t('voice.listening')
              : t('voice.tap_speak')}
          </Text>
          <Text style={styles.tapHint}>{t('voice.short_hint')}</Text>

          {!transcript && !command && !successMsg && (
            <View style={styles.examples}>
              <Example text="Sold 3 biscuits" />
              <Example text="Add 5 soap" />
              <Example text="How many rice are left?" />
            </View>
          )}
        </View>

        {!!errorMsg && (
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={20} color={KadaiColors.redDark} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {successMsg && (
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={25} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>{successMsg.title}</Text>
            <Text style={styles.successProduct}>{successMsg.product}</Text>
            <Text style={styles.successStock}>{successMsg.stock} units now in stock</Text>
            <Pressable style={styles.againButton} onPress={startListening}>
              <Ionicons name="mic-outline" size={17} color={KadaiColors.primary} />
              <Text style={styles.againText}>New voice command</Text>
            </Pressable>
          </View>
        )}

        {!!transcript && !successMsg && (
          <View style={styles.transcriptCard}>
            <Text style={styles.cardEyebrow}>I HEARD</Text>
            <TextInput
              multiline
              value={transcript}
              onChangeText={(text) => {
                setTranscript(text);
                setCommand(null);
              }}
              style={styles.transcriptInput}
              placeholder="Recognized speech"
            />

            {!command && (
              <Pressable
                style={[styles.understandButton, (!transcript.trim() || loading) && styles.disabled]}
                onPress={understand}
                disabled={!transcript.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={17} color="#FFFFFF" />
                    <Text style={styles.understandText}>Let KadaiAI understand</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        )}

        {command && (
          <View style={styles.understandingCard}>
            <View style={styles.understandingHeader}>
              <View style={styles.sparkBox}>
                <Ionicons name="sparkles" size={18} color={KadaiColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.understandingTitle}>KadaiAI understood</Text>
                <Text style={styles.understandingSub}>Review before any inventory change.</Text>
              </View>
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>{command.intent.replace('_', ' ').toUpperCase()}</Text>
              </View>
            </View>

            {command.product_name ? (
              <View style={styles.productHero}>
                <View style={styles.productIcon}>
                  <Ionicons name={productIcon(command.product_name)} size={28} color={KadaiColors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{command.product_name}</Text>
                  {command.quantity != null && <Text style={styles.productQty}>{command.quantity} unit(s)</Text>}
                </View>
              </View>
            ) : null}

            <View style={styles.confidenceHeader}>
              <Text style={styles.confidenceLabel}>Confidence</Text>
              <Text style={[styles.confidenceValue, lowConfidence && { color: KadaiColors.redDark }]}>
                {confidence}%
              </Text>
            </View>

            <View style={styles.confidenceTrack}>
              <View
                style={[
                  styles.confidenceFill,
                  {
                    width: `${confidence}%`,
                    backgroundColor: lowConfidence ? KadaiColors.red : KadaiColors.green,
                  },
                ]}
              />
            </View>

            {lowConfidence && (
              <View style={styles.lowConfidenceCard}>
                <Ionicons name="alert-circle-outline" size={18} color="#9A6700" />
                <Text style={styles.lowConfidenceText}>
                  I am not confident enough to change inventory. Edit the transcript or speak again.
                </Text>
              </View>
            )}

            {command.intent === 'query_stock' ? (
              <View style={styles.stockAnswer}>
                <Text style={styles.stockNumber}>{command.current_stock ?? '-'}</Text>
                <Text style={styles.stockLabel}>units currently in stock</Text>
              </View>
            ) : command.intent === 'sale' || command.intent === 'add_stock' ? (
              <>
                <View style={styles.stockChange}>
                  <View style={styles.stockColumn}>
                    <Text style={styles.stockColumnLabel}>Before</Text>
                    <Text style={styles.stockColumnValue}>{current ?? '-'}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color={KadaiColors.muted} />
                  <View style={styles.stockColumn}>
                    <Text style={styles.stockColumnLabel}>After</Text>
                    <Text style={[styles.stockColumnValue, { color: KadaiColors.primary }]}>{after ?? '-'}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <Pressable style={styles.editButton} onPress={clear}>
                    <Text style={styles.editText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.confirmButton, (lowConfidence || loading) && styles.disabled]}
                    onPress={confirm}
                    disabled={lowConfidence || loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.confirmText}>
                          {command.intent === 'sale' ? 'Confirm sale' : 'Confirm stock'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.unknownCard}>
                <Text style={styles.unknownTitle}>Command not understood</Text>
                <Text style={styles.unknownText}>Edit the transcript and try again, or speak another command.</Text>
              </View>
            )}
          </View>
        )}

        {(transcript || command || errorMsg) && !recognizing && !successMsg && (
          <Pressable style={styles.speakAgain} onPress={startListening} disabled={loading}>
            <Ionicons name="mic-outline" size={17} color={KadaiColors.primary} />
            <Text style={styles.speakAgainText}>Speak again</Text>
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>More AI tools</Text>
        <View style={styles.toolRow}>
          <Pressable style={styles.toolCard} onPress={() => router.push('/ai-shopping')}>
            <Ionicons name="sparkles-outline" size={22} color={KadaiColors.primary} />
            <Text style={styles.toolTitle}>Smart restock</Text>
            <Text style={styles.toolText}>Build a budget-aware plan</Text>
          </Pressable>
          <Pressable style={styles.toolCard} onPress={() => router.push('/invoice-ai')}>
            <Ionicons name="scan-outline" size={22} color={KadaiColors.primary} />
            <Text style={styles.toolTitle}>Invoice AI</Text>
            <Text style={styles.toolText}>Scan supplier invoices</Text>
          </Pressable>
        </View>
      </ScrollView>

      <KadaiBottomNav />
    </SafeAreaView>
  );
}

function Example({ text }: { text: string }) {
  return (
    <View style={styles.exampleChip}>
      <Text style={styles.exampleText}>“{text}”</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KadaiColors.background },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 30, gap: 15 },
  title: { fontSize: 27, fontWeight: '900', color: KadaiColors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13.5, color: KadaiColors.text2, lineHeight: 19, marginTop: 4 },
  languageSelector: { flexDirection: 'row', backgroundColor: '#EAF1EC', padding: 4, borderRadius: 14 },
  languageButton: { flex: 1, minHeight: 39, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  languageActive: { backgroundColor: '#FFFFFF', ...KadaiShadow },
  languageText: { color: KadaiColors.muted, fontSize: 12, fontWeight: '800' },
  languageTextActive: { color: KadaiColors.primary, fontWeight: '900' },
  assistantCard: { backgroundColor: KadaiColors.primary, borderRadius: KadaiRadius.xl, padding: 20, alignItems: 'center', ...KadaiShadow },
  askEyebrow: { color: '#A7F3D0', fontSize: 10.5, fontWeight: '900', letterSpacing: 1.2 },
  askTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 5, textAlign: 'center' },
  waveRow: { height: 46, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  wave: { width: 4, borderRadius: 3, backgroundColor: '#86EFAC' },
  micButton: { width: 78, height: 78, borderRadius: 26, backgroundColor: '#22A05B', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#52D58A' },
  micButtonListening: { backgroundColor: '#C2413B', borderColor: '#E88B86' },
  tapText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, marginTop: 13 },
  tapHint: { color: '#C7E4D1', fontSize: 11.5, marginTop: 3 },
  examples: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, marginTop: 16 },
  exampleChip: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: KadaiRadius.pill, backgroundColor: 'rgba(255,255,255,0.11)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  exampleText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' },
  errorCard: { backgroundColor: KadaiColors.redSoft, borderWidth: 1, borderColor: '#F4C9C9', borderRadius: KadaiRadius.medium, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorText: { flex: 1, color: KadaiColors.redDark, fontSize: 12.5, lineHeight: 17 },
  successCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KadaiColors.border, borderRadius: KadaiRadius.xl, padding: 20, alignItems: 'center', ...KadaiShadow },
  successIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: KadaiColors.greenDark, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 18, fontWeight: '900', color: KadaiColors.text, marginTop: 10 },
  successProduct: { fontSize: 14, color: KadaiColors.text2, marginTop: 3 },
  successStock: { fontSize: 13, color: KadaiColors.greenDark, fontWeight: '900', marginTop: 4 },
  againButton: { marginTop: 14, minHeight: 42, borderRadius: 12, paddingHorizontal: 16, backgroundColor: KadaiColors.mintSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  againText: { color: KadaiColors.primary, fontSize: 12.5, fontWeight: '900' },
  transcriptCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KadaiColors.border, borderRadius: KadaiRadius.large, padding: 15, ...KadaiShadow },
  cardEyebrow: { fontSize: 9.5, fontWeight: '900', color: KadaiColors.muted, letterSpacing: 1 },
  transcriptInput: { minHeight: 60, color: KadaiColors.text, fontSize: 20, fontWeight: '800', lineHeight: 27, textAlignVertical: 'top', marginTop: 6 },
  understandButton: { minHeight: 46, borderRadius: 12, backgroundColor: KadaiColors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  understandText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.5 },
  understandingCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KadaiColors.border, borderRadius: KadaiRadius.xl, padding: 16, ...KadaiShadow },
  understandingHeader: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  sparkBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: KadaiColors.mintSoft, alignItems: 'center', justifyContent: 'center' },
  understandingTitle: { fontSize: 14, fontWeight: '900', color: KadaiColors.text },
  understandingSub: { fontSize: 10.5, color: KadaiColors.muted, marginTop: 2 },
  actionBadge: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: KadaiRadius.pill, backgroundColor: KadaiColors.mint },
  actionBadgeText: { color: KadaiColors.primary, fontSize: 8.5, fontWeight: '900' },
  productHero: { marginTop: 15, borderRadius: 14, backgroundColor: KadaiColors.surfaceAlt, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  productIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: KadaiColors.mint, alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 18, fontWeight: '900', color: KadaiColors.text },
  productQty: { fontSize: 12, color: KadaiColors.text2, marginTop: 2, fontWeight: '700' },
  confidenceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  confidenceLabel: { fontSize: 11.5, color: KadaiColors.text2, fontWeight: '700' },
  confidenceValue: { fontSize: 12, color: KadaiColors.greenDark, fontWeight: '900' },
  confidenceTrack: { height: 7, backgroundColor: '#E8EEE9', borderRadius: 5, overflow: 'hidden', marginTop: 7 },
  confidenceFill: { height: '100%', borderRadius: 5 },
  lowConfidenceCard: { marginTop: 12, padding: 11, borderRadius: 11, backgroundColor: KadaiColors.amberSoft, flexDirection: 'row', gap: 7, alignItems: 'flex-start' },
  lowConfidenceText: { flex: 1, color: '#765713', fontSize: 11, lineHeight: 16 },
  stockAnswer: { marginTop: 16, alignItems: 'center', paddingVertical: 10 },
  stockNumber: { fontSize: 38, fontWeight: '900', color: KadaiColors.primary },
  stockLabel: { color: KadaiColors.text2, fontSize: 12, marginTop: 2 },
  stockChange: { marginTop: 15, borderRadius: 14, backgroundColor: '#F7F9F7', padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  stockColumn: { alignItems: 'center', flex: 1 },
  stockColumnLabel: { fontSize: 10.5, color: KadaiColors.muted, fontWeight: '700' },
  stockColumnValue: { fontSize: 25, fontWeight: '900', color: KadaiColors.text, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 9, marginTop: 14 },
  editButton: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: '#EEF2EF', alignItems: 'center', justifyContent: 'center' },
  editText: { color: KadaiColors.text, fontSize: 12.5, fontWeight: '900' },
  confirmButton: { flex: 2, minHeight: 46, borderRadius: 12, backgroundColor: KadaiColors.primary, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '900' },
  unknownCard: { marginTop: 13, padding: 12, borderRadius: 12, backgroundColor: KadaiColors.amberSoft },
  unknownTitle: { color: '#7A5710', fontSize: 13, fontWeight: '900' },
  unknownText: { color: '#765713', fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  speakAgain: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#CFE1D4', flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  speakAgainText: { color: KadaiColors.primary, fontSize: 12.5, fontWeight: '900' },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: KadaiColors.text, marginTop: 2 },
  toolRow: { flexDirection: 'row', gap: 10 },
  toolCard: { flex: 1, minHeight: 115, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KadaiColors.border, borderRadius: KadaiRadius.large, padding: 14, ...KadaiShadow },
  toolTitle: { color: KadaiColors.text, fontSize: 13, fontWeight: '900', marginTop: 9 },
  toolText: { color: KadaiColors.text2, fontSize: 10.5, lineHeight: 15, marginTop: 3 },
});
