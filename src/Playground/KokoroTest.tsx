import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Button,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import {
  createStreamingTTS,
  type StreamingTtsEngine,
} from 'react-native-sherpa-onnx/tts';

const KokoroTest = () => {
  const [tts, setTts] = useState<StreamingTtsEngine | null>(null);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [status, setStatus] = useState('Not initialized');
  const [error, setError] = useState<string | null>(null);

  const [sampleRate, setSampleRate] = useState<number | null>(null);
  const [numSpeakers, setNumSpeakers] = useState<number | null>(null);
  const [audioSamples, setAudioSamples] = useState<number>(0);

  /**
   * Initialize Kokoro
   */
  const initializeKokoro = async () => {
    try {
      setLoading(true);
      setError(null);
      setStatus('Initializing Kokoro...');

      console.log('KOKORO: Starting streaming initialization');

      const engine = await createStreamingTTS({
        modelPath: {
          type: 'asset',
          path: 'kokoro-en-v0_19',
        },

        modelType: 'kokoro',

        provider: 'cpu',

        numThreads: 4,

        debug: true,

        modelOptions: {
          kokoro: {
            lengthScale: 1.0,
          },
        },
      });

      console.log('KOKORO: Streaming engine created');

      const rate = await engine.getSampleRate();
      const speakers = await engine.getNumSpeakers();

      console.log('KOKORO: Sample rate:', rate);
      console.log('KOKORO: Number of speakers:', speakers);

      setTts(engine);
      setSampleRate(rate);
      setNumSpeakers(speakers);

      setStatus('Kokoro streaming initialized successfully');
    } catch (err) {
      console.error('KOKORO INITIALIZATION ERROR:', err);

      const message =
        err instanceof Error ? err.message : String(err);

      setError(message);
      setStatus('Initialization failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate and stream speech
   */
  const generateSpeech = async () => {
    if (!tts) {
      setError('Kokoro is not initialized');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setAudioSamples(0);
      setStatus('Starting speech stream...');

      console.log('KOKORO: Getting sample rate');

      const rate = await tts.getSampleRate();

      console.log('KOKORO: Sample rate:', rate);

      setSampleRate(rate);

      /**
       * Start the native PCM player.
       *
       * Kokoro output is mono.
       */
      console.log('KOKORO: BEFORE START PCM');

      await tts.startPcmPlayer(rate, 1);

      console.log('KOKORO: AFTER START PCM');

      setStatus('PCM player started');

      /**
       * Start streaming generation.
       */
      console.log('KOKORO: Starting speech stream');

      await tts.generateSpeechStream(
        'Hello Vinay. Hello Shashikala ,Hello Basavaraju , Welcome back to VINXO. Today we are testing local speech generation using Kokoro running entirely on the Android device. The speech is generated locally, converted into PCM audio chunks, and streamed directly to the speaker. There is no cloud voice service involved in this process. This is only the beginning of the VINXO voice system.',
        {
          sid: 1,
          speed: 1.0,
        },
        {
          /**
           * Called whenever Kokoro generates
           * a PCM audio chunk.
           */
          onChunk: async chunk => {
            try {
              console.log(
                'KOKORO: CHUNK RECEIVED',
              );

              console.log(
                'KOKORO: samples:',
                chunk.samples.length,
              );

              console.log(
                'KOKORO: sampleRate:',
                chunk.sampleRate,
              );

              setAudioSamples(
                previous =>
                  previous + chunk.samples.length,
              );

              console.log(
                'KOKORO: BEFORE WRITE',
              );

              await tts.writePcmChunk(
                chunk.samples,
              );

              console.log(
                'KOKORO: AFTER WRITE',
              );
            } catch (chunkError) {
              console.error(
                'KOKORO: CHUNK WRITE ERROR:',
                chunkError,
              );

              setError(
                chunkError instanceof Error
                  ? chunkError.message
                  : String(chunkError),
              );

              setStatus(
                'PCM chunk playback failed',
              );
            }
          },

          /**
           * Called when the complete
           * streaming generation finishes.
           */
          onEnd: () => {
            console.log(
              'KOKORO: STREAM END',
            );

            setStatus(
              'Speech stream completed 🔊',
            );
          },

          /**
           * Called when streaming generation
           * encounters an error.
           */
          onError: streamError => {
            console.error(
              'KOKORO: STREAM ERROR:',
              streamError,
            );

            setError(String(streamError));

            setStatus(
              'Speech stream failed',
            );
          },
        },
      );

      console.log(
        'KOKORO: AFTER GENERATE STREAM',
      );

      /**
       * IMPORTANT:
       *
       * We are intentionally NOT stopping the
       * PCM player immediately here.
       *
       * The purpose of this test is to see the
       * complete order of:
       *
       * start → chunk → write → end
       *
       * before we decide where stopPcmPlayer()
       * belongs.
       */
      setStatus(
        'Speech stream completed — PCM player still active',
      );
    } catch (err) {
      console.error(
        'KOKORO GENERATION/PLAY ERROR:',
        err,
      );

      const message =
        err instanceof Error ? err.message : String(err);

      setError(message);
      setStatus(
        'Speech generation failed',
      );

      /**
       * Attempt to stop the player if
       * something fails.
       */
      try {
        console.log(
          'KOKORO: Cleaning up PCM player after error',
        );

        await tts.stopPcmPlayer();

        console.log(
          'KOKORO: PCM player stopped after error',
        );
      } catch (stopError) {
        console.error(
          'KOKORO: Failed to stop PCM player:',
          stopError,
        );
      }
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Cleanup
   */
  useEffect(() => {
    return () => {
      console.log(
        'KOKORO: Destroying streaming engine',
      );

      if (tts) {
        tts
          .destroy()
          .catch(err => {
            console.error(
              'KOKORO: Destroy error:',
              err,
            );
          });
      }
    };
  }, [tts]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}>
        
        <Text style={styles.title}>
          Kokoro TTS Test
        </Text>

        <Text style={styles.subtitle}>
          VINXO local streaming TTS experiment
        </Text>

        {/* STATUS */}
        <View style={styles.card}>
          <Text style={styles.label}>
            Status
          </Text>

          <Text style={styles.status}>
            {status}
          </Text>

          {loading && (
            <ActivityIndicator
              size="small"
              style={styles.loader}
            />
          )}

          {generating && (
            <ActivityIndicator
              size="small"
              style={styles.loader}
            />
          )}
        </View>

        {/* MODEL */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Model
          </Text>

          <Text style={styles.info}>
            Model: Kokoro
          </Text>

          <Text style={styles.info}>
            Path: assets/kokoro-en-v0_19
          </Text>

          <Text style={styles.info}>
            Provider: CPU
          </Text>

          <Text style={styles.info}>
            Threads: 4
          </Text>

          <Text style={styles.info}>
            Mode: Streaming
          </Text>
        </View>

        {/* ENGINE INFORMATION */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Engine Information
          </Text>

          <Text style={styles.info}>
            Initialized:{' '}
            {tts ? 'Yes' : 'No'}
          </Text>

          <Text style={styles.info}>
            Sample Rate:{' '}
            {sampleRate ?? '-'}
          </Text>

          <Text style={styles.info}>
            Speakers:{' '}
            {numSpeakers ?? '-'}
          </Text>

          <Text style={styles.info}>
            Streamed Samples:{' '}
            {audioSamples || '-'}
          </Text>
        </View>

        {/* INITIALIZE */}
        <View style={styles.buttonContainer}>
          <Button
            title={
              tts
                ? 'Kokoro Initialized'
                : 'Initialize Kokoro'
            }
            onPress={initializeKokoro}
            disabled={
              loading || !!tts
            }
          />
        </View>

        {/* GENERATE */}
        <View style={styles.buttonContainer}>
          <Button
            title={
              generating
                ? 'Speaking...'
                : 'Generate Test Speech'
            }
            onPress={generateSpeech}
            disabled={
              !tts || generating
            }
          />
        </View>

        {/* ERROR */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Error
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        {/* TEST TEXT */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Test Text
          </Text>

          <Text style={styles.testText}>
            "Hello Vinay. This is Kokoro running
            locally inside VINXO."
          </Text>
        </View>

        {/* CURRENT TEST */}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>
            Current Test
          </Text>

          <Text style={styles.noteText}>
            Kokoro runs locally on the Android
            device using CPU inference.
          </Text>

          <Text style={styles.noteText}>
            Speech is generated as PCM chunks
            and sent directly to the native
            PCM player.
          </Text>

          <Text style={styles.noteText}>
            The PCM player remains active during
            this diagnostic test so we can verify
            the streaming lifecycle.
          </Text>

          <Text style={styles.noteText}>
            This is the foundation for VINXO
            real-time voice output.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },

  label: {
    fontSize: 14,
    color: '#777',
    marginBottom: 5,
  },

  status: {
    fontSize: 17,
    fontWeight: '600',
  },

  info: {
    fontSize: 15,
    marginBottom: 8,
    color: '#333',
  },

  loader: {
    marginTop: 12,
  },

  buttonContainer: {
    marginBottom: 12,
  },

  errorCard: {
    backgroundColor: '#ffe5e5',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
    marginBottom: 16,
  },

  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },

  errorText: {
    fontSize: 14,
    color: '#b00020',
  },

  testText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },

  noteCard: {
    backgroundColor: '#e9e9e9',
    borderRadius: 12,
    padding: 16,
  },

  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },

  noteText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#555',
    marginBottom: 6,
  },
});

export default KokoroTest;