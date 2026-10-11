import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  StatusBar,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';

export default function OnboardingScreen() {
  const { t } = useLanguage();
  const features = [
    {
      id: 'sales',
      icon: '🛒',
      title: t('onboarding.sales'),
      description: t('onboarding.salesDescription'),
    },
    {
      id: 'stock',
      icon: '📦',
      title: t('onboarding.stock'),
      description: t('onboarding.stockDescription'),
    },
    {
      id: 'voice',
      icon: '🎤',
      title: t('onboarding.voice'),
      description: t('onboarding.voiceDescription'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F9F6" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Text style={styles.logoEmoji}>🏪</Text>
            <Text style={styles.appName}>KadaiAI</Text>
          </View>
          <Text style={styles.heading}>{t('onboarding.heading')}</Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresContainer}>
          {features.map((feature) => (
            <View key={feature.id} style={styles.featureCard}>
              <View style={styles.iconContainer}>
                <Text style={styles.iconText}>{feature.icon}</Text>
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer Section */}
        <View style={styles.footer}>
          <Pressable
            onPress={() => router.push('/home')}
            style={({ pressed }) => [
              styles.startButton,
              pressed && styles.startButtonPressed,
            ]}
          >
            <Text style={styles.startButtonText}>{t('onboarding.getStarted')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F9F6',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 48,
  },
  
  // Header Styles
  header: {
    marginTop: Platform.OS === 'ios' ? 16 : 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F3D26',
    letterSpacing: -0.3,
  },
  heading: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A2E24',
    lineHeight: 38,
  },

  // Features Section Styles
  featuresContainer: {
    marginTop: 28,
    gap: 14,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8F0EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F0F9F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 26,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#2A3F34',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B8276',
    fontWeight: '400',
    lineHeight: 20,
  },

  // Footer Styles
  footer: {
    marginTop: 28,
  },
  startButton: {
    backgroundColor: '#22A05B',
    borderRadius: 20,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22A05B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  startButtonPressed: {
    backgroundColor: '#1C8A4D',
    transform: [{ scale: 0.98 }],
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
