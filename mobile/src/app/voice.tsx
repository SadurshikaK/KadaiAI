import { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { router } from 'expo-router';

import * as Speech
  from 'expo-speech';

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent
} from 'expo-speech-recognition';

import {
  useLanguage
} from '../context/LanguageContext';

import {
  createSale,
  addStock
} from '../services/api';

import {
  ParsedCommand,
  parseVoiceCommand
} from '../services/ai';


const localeMap = {

  English: 'en-LK',

  Tamil: 'ta-LK',

  Sinhala: 'si-LK'

} as const;


export default function VoiceScreen() {

  const {
    language
  } = useLanguage();

  const [
    transcript,
    setTranscript
  ] = useState('');

  const [
    recognizing,
    setRecognizing
  ] = useState(false);

  const [
    loading,
    setLoading
  ] = useState(false);

  const [
    command,
    setCommand
  ] =
    useState<ParsedCommand | null>(
      null
    );

  const [
    message,
    setMessage
  ] = useState('');


  useSpeechRecognitionEvent(
    'start',
    () => {

      setRecognizing(true);

      setMessage(
        'Listening...'
      );

    }
  );


  useSpeechRecognitionEvent(
    'end',
    () => {

      setRecognizing(false);

    }
  );


  useSpeechRecognitionEvent(
    'result',
    event => {

      const text =
        event.results[0]
        ?.transcript || '';

      setTranscript(
        text
      );

      setCommand(
        null
      );

    }
  );


  useSpeechRecognitionEvent(
    'error',
    event => {

      setRecognizing(
        false
      );

      setMessage(
        `${event.error}: `
        + `${event.message || ''}`
      );

    }
  );


  const speak = (
    text: string
  ) => {

    Speech.stop();

    Speech.speak(
      text,
      {
        language:
          localeMap[language],

        rate: 0.9
      }
    );

  };


  const startListening =
    async () => {

      const permission =
        await ExpoSpeechRecognitionModule
          .requestPermissionsAsync();

      if (!permission.granted) {

        Alert.alert(
          'Permission required',
          'Please allow microphone access.'
        );

        return;

      }

      ExpoSpeechRecognitionModule
        .start({

          lang:
            localeMap[language],

          interimResults:
            true,

          continuous:
            false,

          maxAlternatives:
            1,

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

            'හාල්'

          ]

        });

    };


  const understand =
    async () => {

      if (
        !transcript.trim()
      ) {

        Alert.alert(
          'No command',
          'Speak or type a command.'
        );

        return;

      }

      try {

        setLoading(
          true
        );

        const result =
          await parseVoiceCommand(
            transcript,
            1
          );

        setCommand(
          result
        );

        setMessage(
          result.message
        );


        if (
          result.intent
          === 'query_stock'
        ) {

          speak(
            result.message
          );

        }

      } catch (error: any) {

        Alert.alert(
          'AI error',
          error.message
        );

      } finally {

        setLoading(
          false
        );

      }

    };


  const confirm =
    async () => {

      if (
        !command?.product_id
        || !command.quantity
      ) {

        return;

      }

      try {

        setLoading(
          true
        );


        if (
          command.intent
          === 'sale'
        ) {

          const result =
            await createSale({

              product_id:
                command.product_id,

              quantity:
                command.quantity,

              shop_id: 1

            });


          const response =
            `${result.product_name} `
            + `stock is now `
            + `${result.remaining_stock}.`;


          setMessage(
            response
          );

          speak(
            response
          );

        }


        if (
          command.intent
          === 'add_stock'
        ) {

          const result =
            await addStock({

              product_id:
                command.product_id,

              quantity:
                command.quantity,

              shop_id:
                1,

              note:
                'Voice assisted stock addition'

            });


          const response =
            `${result.product_name} `
            + `stock is now `
            + `${result.new_stock}.`;


          setMessage(
            response
          );

          speak(
            response
          );

        }


        setCommand(
          null
        );

        setTranscript(
          ''
        );

      } catch (error: any) {

        Alert.alert(
          'Update failed',
          error.message
        );

      } finally {

        setLoading(
          false
        );

      }

    };


  return (

    <SafeAreaView
      style={styles.container}
    >

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >

        <Pressable
          onPress={() =>
            router.back()
          }
        >

          <Text
            style={styles.back}
          >
            ‹ Back
          </Text>

        </Pressable>


        <Text
          style={styles.title}
        >
          AI Voice Assistant
        </Text>


        <Text
          style={styles.subtitle}
        >

          Speak in {language}.
          KadaiAI will understand
          the inventory command.

        </Text>


        <Pressable

          style={[
            styles.mic,

            recognizing
            && styles.micActive
          ]}

          onPress={
            recognizing

            ? () =>
              ExpoSpeechRecognitionModule
                .stop()

            : startListening
          }

        >

          <Text
            style={styles.micIcon}
          >
            🎤
          </Text>

          <Text
            style={styles.micText}
          >

            {
              recognizing

              ? 'Stop'

              : 'Tap to Speak'
            }

          </Text>

        </Pressable>


        <TextInput

          style={styles.input}

          multiline

          value={transcript}

          onChangeText={
            text => {

              setTranscript(
                text
              );

              setCommand(
                null
              );

            }
          }

          placeholder={
            'Speech appears here'
          }

        />


        <Pressable

          style={styles.button}

          onPress={understand}

        >

          {
            loading

            ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            )

            : (
              <Text
                style={styles.buttonText}
              >

                Understand Command

              </Text>
            )
          }

        </Pressable>


        {
          message
          ? (
            <Text
              style={styles.message}
            >
              {message}
            </Text>
          )
          : null
        }


        {
          command
          && (
            <View
              style={styles.card}
            >

              <Text
                style={styles.cardTitle}
              >
                Detected Command
              </Text>


              <Text>
                Action:
                {' '}
                {command.intent}
              </Text>


              <Text>
                Product:
                {' '}
                {
                  command.product_name
                  || 'Unknown'
                }
              </Text>


              <Text>
                Quantity:
                {' '}
                {
                  command.quantity
                  ?? '-'
                }
              </Text>


              <Text>
                Current stock:
                {' '}
                {
                  command.current_stock
                  ?? '-'
                }
              </Text>


              <Text>
                Confidence:
                {' '}
                {
                  Math.round(
                    command.confidence
                    * 100
                  )
                }%
              </Text>


              {
                command
                  .needs_confirmation

                && command
                  .product_id

                && command
                  .quantity

                && (
                  <Pressable

                    style={
                      styles.confirm
                    }

                    onPress={
                      confirm
                    }

                  >

                    <Text
                      style={
                        styles
                          .confirmText
                      }
                    >
                      CONFIRM
                    </Text>

                  </Pressable>
                )
              }

            </View>
          )
        }


        <Pressable

          style={
            styles.secondary
          }

          onPress={() =>
            router.push(
              '/ai-shopping'
            )
          }

        >

          <Text
            style={
              styles.secondaryText
            }
          >
            Smart Shopping List
          </Text>

        </Pressable>


        <Pressable

          style={
            styles.secondary
          }

          onPress={() =>
            router.push(
              '/invoice-ai'
            )
          }

        >

          <Text
            style={
              styles.secondaryText
            }
          >
            Invoice Scanner
          </Text>

        </Pressable>

      </ScrollView>

    </SafeAreaView>
  );

}


const styles =
  StyleSheet.create({

    container: {

      flex: 1,

      backgroundColor:
        '#F4F9F6'

    },


    content: {

      padding: 24,

      paddingBottom: 50

    },


    back: {

      color: '#18874A',

      fontWeight: '700',

      marginBottom: 20

    },


    title: {

      fontSize: 28,

      fontWeight: '800',

      color: '#173E29'

    },


    subtitle: {

      marginTop: 8,

      color: '#64776C'

    },


    mic: {

      backgroundColor:
        '#1C8A4D',

      marginTop: 25,

      padding: 20,

      borderRadius: 20,

      alignItems:
        'center'

    },


    micActive: {

      backgroundColor:
        '#BB3E3E'

    },


    micIcon: {

      fontSize: 34

    },


    micText: {

      color: '#FFFFFF',

      fontWeight: '800',

      marginTop: 5

    },


    input: {

      backgroundColor:
        '#FFFFFF',

      marginTop: 20,

      minHeight: 100,

      borderRadius: 15,

      padding: 15,

      textAlignVertical:
        'top'

    },


    button: {

      backgroundColor:
        '#1C8A4D',

      padding: 15,

      borderRadius: 12,

      marginTop: 15,

      alignItems:
        'center'

    },


    buttonText: {

      color: '#FFFFFF',

      fontWeight: '800'

    },


    message: {

      marginTop: 16,

      color: '#475F51'

    },


    card: {

      backgroundColor:
        '#FFFFFF',

      marginTop: 20,

      padding: 18,

      borderRadius: 16,

      gap: 8

    },


    cardTitle: {

      fontSize: 18,

      fontWeight: '800',

      color: '#173E29'

    },


    confirm: {

      backgroundColor:
        '#1C8A4D',

      padding: 14,

      borderRadius: 12,

      marginTop: 12,

      alignItems:
        'center'

    },


    confirmText: {

      color: '#FFFFFF',

      fontWeight: '800'

    },


    secondary: {

      backgroundColor:
        '#E4F3EA',

      padding: 14,

      borderRadius: 12,

      marginTop: 14,

      alignItems:
        'center'

    },


    secondaryText: {

      color: '#176D3E',

      fontWeight: '800'

    }

  });