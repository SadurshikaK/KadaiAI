import { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Language = 'Tamil' | 'Sinhala' | 'English';

export default function LanguageScreen() {
  const [selectedLanguage, setSelectedLanguage] =
    useState<Language | null>(null);

  const languages: { name: Language; label: string; subtitle: string }[] = [
    {
      name: 'Tamil',
      label: 'தமிழ்',
      subtitle: 'Tamil',
    },
    {
      name: 'Sinhala',
      label: 'සිංහල',
      subtitle: 'Sinhala',
    },
    {
      name: 'English',
      label: 'English',
      subtitle: 'English',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🏪</Text>
        </View>

        {/* App name */}
        <Text style={styles.title}>KadaiAI</Text>
        <Text style={styles.tagline}>Your Smart Shop Assistant</Text>

        {/* Welcome message */}
        <View style={styles.headingContainer}>
          <Text style={styles.heading}>Choose your language</Text>
          <Text style={styles.description}>
            You can change this later in settings
          </Text>
        </View>

        {/* Language buttons */}
        <View style={styles.languageContainer}>
          {languages.map((language) => {
            const isSelected = selectedLanguage === language.name;

            return (
              <Pressable
                key={language.name}
                style={[
                  styles.languageCard,
                  isSelected && styles.selectedLanguageCard,
                ]}
                onPress={() => setSelectedLanguage(language.name)}
              >
                <View>
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
                      isSelected && styles.selectedLanguageText,
                    ]}
                  >
                    {language.subtitle}
                  </Text>
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

        {/* Continue button */}
        <Pressable
          disabled={!selectedLanguage}
          style={[
            styles.continueButton,
            !selectedLanguage && styles.disabledButton,
          ]}
        >
          <Text style={styles.continueButtonText}>
            Continue
          </Text>
        </Pressable>

        <Text style={styles.voiceHint}>
          🎤 Voice assistance will also be available
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6FAF7',
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },

  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#E1F4E8',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 25,
  },

  logoEmoji: {
    fontSize: 46,
  },

  title: {
    fontSize: 38,
    fontWeight: '800',
    textAlign: 'center',
    color: '#12372A',
    marginTop: 18,
  },

  tagline: {
    fontSize: 16,
    textAlign: 'center',
    color: '#688078',
    marginTop: 5,
  },

  headingContainer: {
    marginTop: 52,
  },

  heading: {
    fontSize: 25,
    fontWeight: '700',
    color: '#18251F',
  },

  description: {
    marginTop: 7,
    fontSize: 14,
    color: '#7B8983',
  },

  languageContainer: {
    marginTop: 25,
    gap: 14,
  },

  languageCard: {
    minHeight: 82,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2EAE5',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selectedLanguageCard: {
    borderColor: '#159957',
    backgroundColor: '#ECF9F1',
  },

  languageLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#20332A',
  },

  languageSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#829089',
  },

  selectedLanguageText: {
    color: '#117A46',
  },

  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#BCC8C1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioOuterSelected: {
    borderColor: '#159957',
  },

  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#159957',
  },

  continueButton: {
    marginTop: 30,
    height: 58,
    backgroundColor: '#159957',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledButton: {
    backgroundColor: '#BCD8C7',
  },

  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  voiceHint: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 13,
    color: '#708078',
  },
});