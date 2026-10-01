import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Platform,
  StatusBar,
  Pressable,
} from 'react-native';

export default function OnboardingScreen() {
  const features = [
    {
      id: 'sales',
      icon: '🛒',
      title: 'Sales',
      description: 'Record sales quickly',
    },
    {
      id: 'stock',
      icon: '📦',
      title: 'Stock',
      description: 'Know what is running low',
    },
    {
      id: 'voice',
      icon: '🎤',
      title: 'Voice',
      description: 'Use Tamil, Sinhala or English voice input',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F9F6" />
      <View style={styles.content}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Text style={styles.logoEmoji}>🏪</Text>
            <Text style={styles.appName}>KadaiAI</Text>
          </View>
          <Text style={styles.heading}>Manage your shop more easily</Text>
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
            style={({ pressed }) => [
              styles.startButton,
              pressed && styles.startButtonPressed,
            ]}
          >
            <Text style={styles.startButtonText}>Get Started</Text>
          </Pressable>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F9F6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 10 : 30,
  },
  
  // Header Styles
  header: {
    marginTop: Platform.OS === 'ios' ? 20 : 40,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
    fontSize: 32,
    fontWeight: '800',
    color: '#1A2E24',
    lineHeight: 40,
  },

  // Features Section Styles
  featuresContainer: {
    flex: 1,
    marginTop: 40,
    gap: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8F0EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#F0F9F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 28,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2A3F34',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 15,
    color: '#6B8276',
    fontWeight: '400',
    lineHeight: 22,
  },

  // Footer Styles
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  startButton: {
    backgroundColor: '#22A05B',
    borderRadius: 20,
    height: 64,
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
