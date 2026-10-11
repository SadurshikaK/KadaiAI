import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { router } from 'expo-router';

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.back}>‹ Back</Text>
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
          <Text style={styles.cardTitle}>
            Supported Languages
          </Text>

          <Text style={styles.languageText}>
            English • தமிழ் • සිංහල
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            AI Capabilities
          </Text>

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
          <Text style={styles.metric}>
            93.33%
          </Text>

          <Text style={styles.metricLabel}>
            Post-improvement end-to-end result across 30
            multilingual development/regression cases
          </Text>

          <Text style={styles.metricNote}>
            Improved from a 66.67% baseline after targeted multilingual parser
            fixes.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Responsible AI
          </Text>

          <Text style={styles.text}>
            Inventory-changing voice and OCR actions require user confirmation.
            KadaiAI does not silently modify stock based on uncertain AI output.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Built for Practical Retail Work
          </Text>

          <Text style={styles.text}>
            KadaiAI combines multilingual interaction, inventory operations and
            AI-assisted decision support in one mobile workflow.
          </Text>
        </View>

        <Text style={styles.footer}>
          KadaiAI • Buildathon 2026
        </Text>
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
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 50,
  },

  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingRight: 12,
    marginBottom: 14,
  },

  back: {
    color: '#1C8A4D',
    fontWeight: '800',
    fontSize: 16,
  },

  hero: {
    alignItems: 'center',
    marginBottom: 12,
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
  },

  logoEmoji: {
    fontSize: 38,
  },

  title: {
    fontSize: 34,
    color: '#153D27',
    fontWeight: '900',
  },

  tagline: {
    color: '#60766A',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 6,
    textAlign: 'center',
  },

  card: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCE9E1',
    marginTop: 12,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1D4F32',
    marginBottom: 8,
  },

  text: {
    color: '#50675A',
    fontSize: 14,
    lineHeight: 21,
  },

  languageText: {
    color: '#176B3A',
    fontSize: 16,
    fontWeight: '800',
  },

  metricCard: {
    backgroundColor: '#1C8A4D',
    padding: 22,
    borderRadius: 18,
    marginTop: 12,
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
    fontWeight: '600',
  },
});