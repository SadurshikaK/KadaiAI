import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import {
  useLanguage,
} from '../context/LanguageContext';

import {
  InvoiceResult,
  scanInvoice,
} from '../services/ai';


const ocrLanguageMap = {
  English: 'eng',
  Tamil: 'eng+tam',
  Sinhala: 'eng+sin',
} as const;


export default function InvoiceAIScreen() {
  const { language } =
    useLanguage();

  const [imageUri, setImageUri] =
    useState<string | null>(null);

  const [result, setResult] =
    useState<InvoiceResult | null>(null);

  const [loading, setLoading] =
    useState(false);


  const chooseInvoice = async () => {
    try {
      const permission =
        await ImagePicker
          .requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          'Please allow photo access to select an invoice.'
        );

        return;
      }


      const selected =
        await ImagePicker
          .launchImageLibraryAsync({
            allowsEditing: false,
            quality: 0.9,
          });


      if (
        !selected.canceled &&
        selected.assets.length > 0
      ) {
        setImageUri(
          selected.assets[0].uri
        );

        setResult(null);
      }
    } catch (error: any) {
      Alert.alert(
        'Image selection error',
        error.message
      );
    }
  };


  const extractInvoice = async () => {
    if (!imageUri) {
      Alert.alert(
        'No invoice selected',
        'Choose an invoice image first.'
      );

      return;
    }


    try {
      setLoading(true);

      const ocrLanguage =
        ocrLanguageMap[language];

      const response =
        await scanInvoice(
          imageUri,
          ocrLanguage
        );

      setResult(response);
    } catch (error: any) {
      Alert.alert(
        'Invoice OCR failed',
        error.message
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <Pressable
          onPress={() => router.back()}
        >
          <Text style={styles.back}>
            ‹ Back
          </Text>
        </Pressable>


        {/* Heading */}
        <Text style={styles.title}>
          Invoice Scanner
        </Text>

        <Text style={styles.subtitle}>
          Select a supplier invoice.
          KadaiAI will extract text from
          the image for review.
        </Text>


        {/* Choose Image */}
        <Pressable
          style={styles.button}
          onPress={chooseInvoice}
        >
          <Text style={styles.buttonIcon}>
            📷
          </Text>

          <Text style={styles.buttonText}>
            Choose Invoice Image
          </Text>
        </Pressable>


        {/* Image Preview */}
        {imageUri && (
          <View style={styles.previewCard}>
            <Image
              source={{
                uri: imageUri,
              }}
              style={styles.image}
            />
          </View>
        )}


        {/* OCR Button */}
        {imageUri && (
          <Pressable
            style={styles.extractButton}
            onPress={extractInvoice}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={styles.extractText}
              >
                Extract Invoice Text
              </Text>
            )}
          </Pressable>
        )}


        {/* Warning */}
        {result && (
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>
              ⚠️
            </Text>

            <Text style={styles.warningText}>
              {result.note}
            </Text>
          </View>
        )}


        {/* Candidate Lines */}
        {result && (
          <>
            <Text style={styles.heading}>
              Detected Product / Price Lines
            </Text>

            {result.candidate_lines.length > 0 ? (
              result.candidate_lines.map(
                (line, index) => (
                  <View
                    key={`${index}-${line}`}
                    style={styles.lineCard}
                  >
                    <Text style={styles.lineNumber}>
                      {index + 1}
                    </Text>

                    <Text style={styles.lineText}>
                      {line}
                    </Text>
                  </View>
                )
              )
            ) : (
              <View style={styles.noLines}>
                <Text style={styles.noLinesText}>
                  No probable product lines
                  were detected.
                </Text>
              </View>
            )}
          </>
        )}


        {/* Full OCR */}
        {result && (
          <>
            <Text style={styles.heading}>
              Full Extracted Text
            </Text>

            <View style={styles.rawCard}>
              <Text style={styles.rawText}>
                {result.raw_text ||
                  'No readable text detected.'}
              </Text>
            </View>
          </>
        )}


        {/* Important */}
        {result && (
          <View style={styles.confirmInfo}>
            <Text style={styles.confirmTitle}>
              Manual confirmation required
            </Text>

            <Text style={styles.confirmDescription}>
              OCR results should not
              automatically change stock.
              The shop owner must first
              verify the extracted products
              and quantities.
            </Text>
          </View>
        )}
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
    padding: 24,
    paddingBottom: 50,
  },

  back: {
    color: '#1C8A4D',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#183D29',
  },

  subtitle: {
    color: '#66796D',
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
  },

  button: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8E8DE',
    marginTop: 24,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonIcon: {
    fontSize: 22,
    marginRight: 10,
  },

  buttonText: {
    color: '#1C6C40',
    fontWeight: '800',
    fontSize: 15,
  },

  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 18,
    padding: 10,
  },

  image: {
    width: '100%',
    height: 280,
    resizeMode: 'contain',
    borderRadius: 12,
  },

  extractButton: {
    backgroundColor: '#1C8A4D',
    padding: 16,
    borderRadius: 14,
    marginTop: 16,
    alignItems: 'center',
  },

  extractText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  warningBox: {
    backgroundColor: '#FFF4D8',
    padding: 15,
    borderRadius: 14,
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  warningIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  warningText: {
    flex: 1,
    color: '#725B1A',
    lineHeight: 20,
    fontWeight: '600',
  },

  heading: {
    marginTop: 26,
    fontSize: 18,
    fontWeight: '800',
    color: '#234631',
  },

  lineCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 9,
    borderRadius: 12,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0EBE4',
  },

  lineNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5F3EA',
    textAlign: 'center',
    lineHeight: 28,
    color: '#1C7645',
    fontWeight: '800',
    marginRight: 10,
  },

  lineText: {
    flex: 1,
    color: '#435B4E',
  },

  noLines: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 14,
    marginTop: 10,
  },

  noLinesText: {
    color: '#708177',
    textAlign: 'center',
  },

  rawCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E0EBE4',
  },

  rawText: {
    color: '#536A5D',
    lineHeight: 21,
  },

  confirmInfo: {
    backgroundColor: '#E5F3EA',
    borderRadius: 14,
    padding: 16,
    marginTop: 22,
  },

  confirmTitle: {
    color: '#205B39',
    fontWeight: '800',
    marginBottom: 5,
  },

  confirmDescription: {
    color: '#557064',
    lineHeight: 20,
  },
});