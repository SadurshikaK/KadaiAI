import { useState } from 'react';
import { router } from 'expo-router';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Platform,
  StatusBar,
} from 'react-native';

type Language = 'Tamil' | 'Sinhala' | 'English';

export default function LanguageScreen() {
  const [selectedLanguage, setSelectedLanguage] =
    useState<Language | null>(null);

  const languages: { name: Language; label: string; subtitle: string; iconText: string }[] = [
    {
      name: 'Tamil',
      label: 'தமிழ்',
      subtitle: 'Tamil',
      iconText: 'அ',
    },
    {
      name: 'Sinhala',
      label: 'සිංහල',
      subtitle: 'Sinhala',
      iconText: 'අ',
    },
    {
      name: 'English',
      label: 'English',
      subtitle: 'English',
      iconText: 'A',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F9F6" />
      <View style={styles.content}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🏪</Text>
            </View>
          </View>
          <Text style={styles.appName}>KadaiAI</Text>
          <Text style={styles.subtitle}>Your Smart Shop Assistant</Text>
        </View>

        {/* Selection Section */}
        <View style={styles.selectionSection}>
          <View style={styles.headingContainer}>
            <Text style={styles.heading}>Choose your language</Text>
            <Text style={styles.description}>
              You can change this later in settings
            </Text>
          </View>

          <View style={styles.languageContainer}>
            {languages.map((language) => {
              const isSelected = selectedLanguage === language.name;

              return (
                <Pressable
                  key={language.name}
                  style={({ pressed }) => [
                    styles.languageCard,
                    isSelected && styles.selectedLanguageCard,
                    pressed && !isSelected && styles.languageCardPressed,
                  ]}
                  onPress={() => setSelectedLanguage(language.name)}
                >
                  <View style={styles.languageInfo}>
                    <View
                      style={[
                        styles.languageIconBox,
                        isSelected && styles.selectedLanguageIconBox,
                      ]}
                    >
                      <Text
                        style={[
                          styles.languageIconText,
                          isSelected && styles.selectedLanguageIconText,
                        ]}
                      >
                        {language.iconText}
                      </Text>
                    </View>
                    <View style={styles.languageTextContainer}>
                      <Text
                        style={[
                          styles.languageLabel,
                          isSelected && styles.selectedLanguageText,
                        ]}
                      >
                        {language.label}
                      </Text>
                      <Text
                        style={[
                          styles.languageSubtitle,
                          isSelected && styles.selectedLanguageSubtitleText,
                        ]}
                      >
                        {language.subtitle}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.radioOuter,
                      isSelected && styles.radioOuterSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Footer Section */}
        <View style={styles.footer}>
          <Pressable
            disabled={!selectedLanguage}
            onPress={() => router.push('/onboarding')}
            style={({ pressed }) => [
              styles.continueButton,
              !selectedLanguage && styles.disabledButton,
              pressed && selectedLanguage && styles.continueButtonPressed,
            ]}
          >
            <Text 
              style={[
                styles.continueButtonText,
                !selectedLanguage && styles.disabledButtonText
              ]}
            >
              Continue
            </Text>
          </Pressable>

          <View style={styles.voiceNoteContainer}>
            <Text style={styles.voiceNoteIcon}>🎤</Text>
            <Text style={styles.voiceNoteText}>
              Voice assistance will also be available
            </Text>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F9F6', // Soft light green/gray background
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 10 : 30,
  },
  
  // Header Styles
  header: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 40 : 60,
  },
  logoContainer: {
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8F3EB',
  },
  logoEmoji: {
    fontSize: 48,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0F3D26',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#5C806B',
    marginTop: 6,
    fontWeight: '500',
  },

  // Selection Section Styles
  selectionSection: {
    flex: 1,
    marginTop: 40,
  },
  headingContainer: {
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A2E24',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#6B8276',
    fontWeight: '400',
  },
  
  languageContainer: {
    gap: 16,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E8F0EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  languageCardPressed: {
    backgroundColor: '#F8FAF9',
    borderColor: '#DFE8E2',
  },
  selectedLanguageCard: {
    borderColor: '#22A05B',
    backgroundColor: '#F0F9F4',
    shadowColor: '#22A05B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F0F4F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  selectedLanguageIconBox: {
    backgroundColor: '#D1ECD8',
  },
  languageIconText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8A9E92',
  },
  selectedLanguageIconText: {
    color: '#157540',
  },
  languageTextContainer: {
    justifyContent: 'center',
  },
  languageLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2A3F34',
    marginBottom: 4,
  },
  selectedLanguageText: {
    color: '#157540',
  },
  languageSubtitle: {
    fontSize: 14,
    color: '#8A9E92',
    fontWeight: '500',
  },
  selectedLanguageSubtitleText: {
    color: '#22A05B',
  },
  
  radioOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D0DCD5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioOuterSelected: {
    borderColor: '#22A05B',
    borderWidth: 2,
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22A05B',
  },

  // Footer Styles
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  continueButton: {
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
  continueButtonPressed: {
    backgroundColor: '#1C8A4D',
    transform: [{ scale: 0.98 }],
  },
  disabledButton: {
    backgroundColor: '#D3E6DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disabledButtonText: {
    color: '#95B8A4',
  },
  voiceNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  voiceNoteIcon: {
    fontSize: 16,
  },
  voiceNoteText: {
    fontSize: 14,
    color: '#6B8276',
    fontWeight: '500',
  },
});