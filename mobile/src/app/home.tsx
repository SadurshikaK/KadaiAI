import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Platform,
  StatusBar,
  Pressable,
  ScrollView,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';

export default function HomeScreen() {
  const { t } = useLanguage();
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F9F6" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Top Area */}
        <View style={styles.topArea}>
          <View style={styles.headerRow}>
            <View style={styles.logoRow}>
              <Text style={styles.logoEmoji}>🏪</Text>
              <Text style={styles.appName}>KadaiAI</Text>
            </View>
            <Pressable style={styles.notificationButton}>
              <Text style={styles.notificationIcon}>🔔</Text>
            </Pressable>
          </View>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{t('home.greeting')} 👋</Text>
            <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
          </View>
        </View>

        {/* Low Stock Alert */}
        <View style={styles.alertCard}>
          <View style={styles.alertIconBox}>
            <Text style={styles.alertIcon}>⚠️</Text>
          </View>
          <View style={styles.alertTextContainer}>
            <Text style={styles.alertTitle}>{t('home.attention')}</Text>
            <Text style={styles.alertSubtitle}>{t('home.lowStock')}</Text>
          </View>
        </View>

        {/* Sales Summary Card */}
        <View style={styles.salesCard}>
          <Text style={styles.salesHeading}>{t('home.todaySales')}</Text>
          <Text style={styles.salesAmount}>Rs. 4,250</Text>
          <View style={styles.demoBadge}>
            <Text style={styles.demoText}>{t('home.demoData')}</Text>
          </View>
        </View>

        {/* Main Actions */}
        <View style={styles.actionsContainer}>
          <Pressable style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}>
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>🛒</Text>
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>{t('home.sellProduct')}</Text>
              <Text style={styles.actionSubtitle}>{t('home.sellDescription')}</Text>
            </View>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}>
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>📦</Text>
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>{t('home.addStock')}</Text>
              <Text style={styles.actionSubtitle}>{t('home.addStockDescription')}</Text>
            </View>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}>
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>📝</Text>
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>{t('home.shoppingList')}</Text>
              <Text style={styles.actionSubtitle}>{t('home.shoppingDescription')}</Text>
            </View>
          </Pressable>
        </View>

        {/* Voice Section */}
        <View style={styles.voiceSection}>
          <Pressable style={({ pressed }) => [styles.voiceButton, pressed && styles.voiceButtonPressed]}>
            <Text style={styles.voiceIcon}>🎤</Text>
          </Pressable>
          <Text style={styles.voiceTitle}>{t('home.tapSpeak')}</Text>
          <Text style={styles.voiceSubtitle}>{t('home.voiceDescription')}</Text>
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
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 40,
  },

  // Top Area
  topArea: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationIcon: {
    fontSize: 20,
  },
  greetingContainer: {
    marginTop: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A2E24',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B8276',
    fontWeight: '500',
  },

  // Alert Card
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8EB', // soft warning background
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FBE8C9',
  },
  alertIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FDECC8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertIcon: {
    fontSize: 20,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C5E19',
    marginBottom: 2,
  },
  alertSubtitle: {
    fontSize: 13,
    color: '#9C7A27',
    fontWeight: '500',
  },

  // Sales Card
  salesCard: {
    backgroundColor: '#22A05B',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#22A05B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  salesHeading: {
    color: '#D1F0E0',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  salesAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  demoBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  demoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Main Actions
  actionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8F0EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  actionCardPressed: {
    backgroundColor: '#F8FAF9',
    borderColor: '#DFE8E2',
    transform: [{ scale: 0.98 }],
  },
  actionIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F0F9F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionIcon: {
    fontSize: 26,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2A3F34',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6B8276',
    fontWeight: '500',
  },

  // Voice Section
  voiceSection: {
    alignItems: 'center',
    marginTop: 10,
  },
  voiceButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1C8A4D', // slight variation of the green for contrast
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#1C8A4D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  voiceButtonPressed: {
    backgroundColor: '#157540',
    transform: [{ scale: 0.95 }],
  },
  voiceIcon: {
    fontSize: 32,
  },
  voiceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2E24',
    marginBottom: 6,
  },
  voiceSubtitle: {
    fontSize: 14,
    color: '#6B8276',
    textAlign: 'center',
    fontWeight: '400',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
});
