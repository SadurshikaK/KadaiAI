import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { KadaiColors, KadaiRadius, KadaiShadow } from '../constants/kadai-theme';

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F9F6" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color={KadaiColors.primary} />
          <Text style={styles.back}>Back</Text>
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🏪</Text>
          </View>

          <Text style={styles.title}>KadaiAI</Text>

          <Text style={styles.tagline}>
            Multilingual AI inventory assistant for small Sri Lankan retailers.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Supported Languages</Text>
          <Text style={styles.languageText}>English • தமிழ் • සිංහල</Text>
          <Text style={styles.languageHint}>
            Full voice recognition, inventory operations and OCR invoice scanning in all three languages.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI Capabilities</Text>
          <Text style={styles.text}>
            • Multilingual voice commands{'\n'}
            • Product and quantity understanding{'\n'}
            • Human-confirmed inventory updates{'\n'}
            • Supplier invoice OCR{'\n'}
            • Budget-aware restocking{'\n'}
            • Demand forecasting pipeline
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metric}>93.33%</Text>
          <Text style={styles.metricLabel}>
            Post-improvement end-to-end result across 30 multilingual development/regression cases
          </Text>
          <Text style={styles.metricNote}>
            Improved from a 66.67% baseline after targeted multilingual parser fixes.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Responsible AI</Text>
          <Text style={styles.text}>
            Inventory-changing voice and OCR actions require user confirmation.
            KadaiAI does not silently modify stock based on uncertain AI output.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Built for Practical Retail Work</Text>
          <Text style={styles.text}>
            KadaiAI combines multilingual interaction, inventory operations and
            AI-assisted decision support in one responsive mobile workflow.
          </Text>
        </View>

        <Text style={styles.footer}>KadaiAI • Buildathon 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F9F6',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 80,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    minWidth: 44,
    paddingVertical: 6,
    paddingRight: 14,
    marginBottom: 8,
  },
  back: {
    color: KadaiColors.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoCircle: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2EEE6',
    marginBottom: 12,
    ...KadaiShadow,
  },
  logoEmoji: {
    fontSize: 38,
  },
  title: {
    fontSize: 32,
    color: KadaiColors.primary,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  tagline: {
    color: KadaiColors.text2,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 300,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: KadaiRadius.large,
    borderWidth: 1,
    borderColor: KadaiColors.border,
    marginTop: 12,
    ...KadaiShadow,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: KadaiColors.primary,
    marginBottom: 8,
  },
  text: {
    color: KadaiColors.text2,
    fontSize: 13.5,
    lineHeight: 22,
  },
  languageText: {
    color: KadaiColors.greenDark,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 26,
  },
  languageHint: {
    color: KadaiColors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  metricCard: {
    backgroundColor: KadaiColors.primary,
    padding: 22,
    borderRadius: KadaiRadius.xl,
    marginTop: 12,
    ...KadaiShadow,
  },
  metric: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#E6F7ED',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    fontWeight: '700',
  },
  metricNote: {
    color: '#D3F1DF',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  footer: {
    textAlign: 'center',
    color: '#789085',
    marginTop: 24,
    fontWeight: '700',
    fontSize: 12,
  },
});