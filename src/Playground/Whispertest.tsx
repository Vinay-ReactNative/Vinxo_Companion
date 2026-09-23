import React, {useEffect, useRef, useState} from 'react';
import {
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {createPcmLiveStream} from 'react-native-sherpa-onnx/audio';
import {createSTT} from 'react-native-sherpa-onnx/stt';

// ============================================================
// WHISPER MODEL CONFIG
// ============================================================

// true  = Whisper Base INT8
// false = Whisper Tiny INT8
const USE_BASE = true;

const MODEL_NAME = USE_BASE
  ? 'Whisper Base INT8'
  : 'Whisper Tiny INT8';

const MODEL_SHORT_NAME = USE_BASE
  ? 'BASE'
  : 'TINY';

const WHISPER_MODEL_PATH = USE_BASE
  ? 'sherpa-onnx-whisper-base'
  : 'sherpa-onnx-whisper-tiny';

const EXPECTED_ENCODER = USE_BASE
  ? 'base-encoder.int8.onnx'
  : 'tiny-encoder.int8.onnx';

const EXPECTED_DECODER = USE_BASE
  ? 'base-decoder.int8.onnx'
  : 'tiny-decoder.int8.onnx';

const EXPECTED_TOKENS = USE_BASE
  ? 'base-tokens.txt'
  : 'tiny-tokens.txt';

const SAMPLE_RATE = 16000;

// ============================================================
// WHISPER TEST
// ============================================================

const Whispertest = () => {
  // ==========================================================
  // MIC
  // ==========================================================

  const micRef =
    useRef<ReturnType<typeof createPcmLiveStream> | null>(null);

  // ==========================================================
  // WHISPER STT
  // ==========================================================

  const whisperRef = useRef<any>(null);

  // ==========================================================
  // MIC LISTENERS
  // ==========================================================

  const removeDataListenerRef =
    useRef<(() => void) | null>(null);

  const removeErrorListenerRef =
    useRef<(() => void) | null>(null);

  // ==========================================================
  // AUDIO BUFFER
  // ==========================================================

  const audioBufferRef =
    useRef<Float32Array[]>([]);

  const totalSamplesRef =
    useRef(0);

  // ==========================================================
  // STATE
  // ==========================================================

  const [recording, setRecording] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const [transcription, setTranscription] =
    useState('');

  const [error, setError] =
    useState('');

  const [sampleCount, setSampleCount] =
    useState(0);

  const [sampleRate, setSampleRate] =
    useState(SAMPLE_RATE);

  const [duration, setDuration] =
    useState(0);

  // ==========================================================
  // TIMER
  // ==========================================================

  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimeRef =
    useRef(0);

  // ==========================================================
  // PERMISSION
  // ==========================================================

  const requestPermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const result =
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );

    return (
      result ===
      PermissionsAndroid.RESULTS.GRANTED
    );
  };

  // ==========================================================
  // INITIALIZE WHISPER
  // ==========================================================

  const initializeWhisper = async () => {
    console.log('');
    console.log('================================================');
    console.log(`🧠 WHISPER ${MODEL_SHORT_NAME} INITIALIZATION`);
    console.log('================================================');

    console.log('MODEL:', MODEL_NAME);
    console.log('MODEL PATH:', WHISPER_MODEL_PATH);

    console.log('');
    console.log('📦 EXPECTED MODEL FILES');
    console.log('Encoder:', EXPECTED_ENCODER);
    console.log('Decoder:', EXPECTED_DECODER);
    console.log('Tokens :', EXPECTED_TOKENS);

    console.log('');
    console.log('⚙️ CONFIG');
    console.log('Model Type:', 'whisper');
    console.log('INT8 Preference:', true);
    console.log('Threads:', 4);
    console.log('Provider:', 'cpu');
    console.log('Language:', 'en');
    console.log('Task:', 'transcribe');

    console.log('');
    console.log('🔍 Creating Sherpa-ONNX STT...');

    const stt = await createSTT({
      modelPath: {
        type: 'asset',
        path: WHISPER_MODEL_PATH,
      },

      // Explicitly prefer INT8.
      preferInt8: true,

      // Explicitly tell Sherpa this is Whisper.
      modelType: 'whisper',

      // Same configuration for Tiny and Base.
      numThreads: 4,
      provider: 'cpu',
      dither: 0,

      modelOptions: {
        whisper: {
          language: 'en',
          task: 'transcribe',

          enableTokenTimestamps: false,
          enableSegmentTimestamps: false,
          tailPaddings: 1000,
        },
      },

      // IMPORTANT:
      // Native Sherpa debug logging enabled.
      debug: true,
    } as any);

    whisperRef.current = stt;

    console.log('');
    console.log('✅ SHERPA STT CREATED');
    console.log('Model:', MODEL_NAME);
    console.log('Folder:', WHISPER_MODEL_PATH);

    console.log('');
    console.log('🔎 EXPECTING NATIVE WHISPER FILE SELECTION:');
    console.log('Encoder:', EXPECTED_ENCODER);
    console.log('Decoder:', EXPECTED_DECODER);
    console.log('Tokens :', EXPECTED_TOKENS);

    console.log('');
    console.log(
      '⚠️ Native debug logs should reveal the actual selected files if exposed by Sherpa.',
    );

    console.log('================================================');
    console.log('');
  };

  // ==========================================================
  // START RECORDING
  // ==========================================================

  const startRecording = async () => {
    if (recording || processing) {
      return;
    }

    setError('');
    setTranscription('');

    audioBufferRef.current = [];
    totalSamplesRef.current = 0;

    setSampleCount(0);
    setDuration(0);

    const granted =
      await requestPermission();

    if (!granted) {
      setError(
        'Microphone permission denied',
      );

      return;
    }

    try {
      // ------------------------------------------------------
      // INITIALIZE WHISPER
      // ------------------------------------------------------

      await initializeWhisper();

      // ------------------------------------------------------
      // CREATE MIC
      // ------------------------------------------------------

      const mic =
        createPcmLiveStream({
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
        });

      micRef.current = mic;

      // ------------------------------------------------------
      // AUDIO DATA
      // ------------------------------------------------------

      removeDataListenerRef.current =
        mic.onData(
          (
            samples,
            sr,
          ) => {
            const copy =
              new Float32Array(samples);

            audioBufferRef.current.push(
              copy,
            );

            totalSamplesRef.current +=
              copy.length;

            setSampleRate(sr);

            setSampleCount(
              totalSamplesRef.current,
            );
          },
        );

      // ------------------------------------------------------
      // MIC ERROR
      // ------------------------------------------------------

      removeErrorListenerRef.current =
        mic.onError(
          message => {
            console.error(
              `🎤 MIC ERROR [${MODEL_SHORT_NAME}]:`,
              message,
            );

            setError(message);

            setRecording(false);
          },
        );

      // ------------------------------------------------------
      // TIMER
      // ------------------------------------------------------

      startTimeRef.current =
        Date.now();

      timerRef.current =
        setInterval(() => {
          const elapsed =
            Date.now() -
            startTimeRef.current;

          setDuration(
            elapsed / 1000,
          );
        }, 100);

      // ------------------------------------------------------
      // START MIC
      // ------------------------------------------------------

      await mic.start();

      setRecording(true);

      console.log(
        `🎙️ MICROPHONE STARTED [${MODEL_SHORT_NAME}]`,
      );

      console.log(
        `🧠 WHISPER ${MODEL_SHORT_NAME} RECORDING...`,
      );

    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : String(e);

      console.error(
        `❌ WHISPER ${MODEL_SHORT_NAME} START ERROR:`,
        message,
      );

      setError(message);

      await cleanup();
    }
  };

  // ==========================================================
  // STOP RECORDING + TRANSCRIBE
  // ==========================================================

  const stopRecording = async () => {
    if (!recording) {
      return;
    }

    try {
      // ------------------------------------------------------
      // STOP TIMER
      // ------------------------------------------------------

      if (timerRef.current) {
        clearInterval(
          timerRef.current,
        );

        timerRef.current = null;
      }

      // ------------------------------------------------------
      // STOP LISTENER
      // ------------------------------------------------------

      removeDataListenerRef.current?.();

      removeDataListenerRef.current =
        null;

      // ------------------------------------------------------
      // STOP MIC
      // ------------------------------------------------------

      await micRef.current?.stop();

      micRef.current = null;

      setRecording(false);

      console.log(
        `🛑 MICROPHONE STOPPED [${MODEL_SHORT_NAME}]`,
      );

      console.log(
        '📊 Total samples:',
        totalSamplesRef.current,
      );

      console.log(
        '⏱️ Duration:',
        duration.toFixed(2),
        'seconds',
      );

      // ------------------------------------------------------
      // CHECK AUDIO
      // ------------------------------------------------------

      if (
        totalSamplesRef.current === 0 ||
        audioBufferRef.current.length === 0
      ) {
        setError(
          'No audio captured',
        );

        return;
      }

      // ------------------------------------------------------
      // START INFERENCE
      // ------------------------------------------------------

      setProcessing(true);

      setTranscription(
        `${MODEL_SHORT_NAME} is thinking...`,
      );

      console.log('');
      console.log('============================================');
      console.log(
        `🧠 WHISPER ${MODEL_SHORT_NAME} INFERENCE`,
      );
      console.log('============================================');

      console.log(
        'Model:',
        MODEL_NAME,
      );

      console.log(
        'Model Path:',
        WHISPER_MODEL_PATH,
      );

      const startInference =
        Date.now();

      // ------------------------------------------------------
      // MERGE AUDIO
      // ------------------------------------------------------

      const totalSamples =
        totalSamplesRef.current;

      const completeAudio =
        new Float32Array(
          totalSamples,
        );

      let offset = 0;

      for (
        const chunk of
          audioBufferRef.current
      ) {
        completeAudio.set(
          chunk,
          offset,
        );

        offset +=
          chunk.length;
      }

      const audioDuration =
        completeAudio.length /
        SAMPLE_RATE;

      console.log(
        '🎧 Audio samples:',
        completeAudio.length,
      );

      console.log(
        '🎧 Audio duration:',
        audioDuration.toFixed(2),
        'seconds',
      );

      // ------------------------------------------------------
      // TRANSCRIBE
      // ------------------------------------------------------

      const result =
        await whisperRef.current.transcribeSamples(
          Array.from(completeAudio),
          SAMPLE_RATE,
        );

      const inferenceTime =
        Date.now() -
        startInference;

      const rtf =
        inferenceTime /
        1000 /
        audioDuration;

      console.log('');
      console.log('📝 TRANSCRIPTION RESULT');
      console.log(result);

      console.log('');
      console.log('📊 BENCHMARK RESULT');
      console.log('--------------------------------------------');
      console.log(
        'MODEL:',
        MODEL_NAME,
      );

      console.log(
        'MODEL PATH:',
        WHISPER_MODEL_PATH,
      );

      console.log(
        'ENCODER:',
        EXPECTED_ENCODER,
      );

      console.log(
        'DECODER:',
        EXPECTED_DECODER,
      );

      console.log(
        'TOKENS:',
        EXPECTED_TOKENS,
      );

      console.log(
        'AUDIO:',
        audioDuration.toFixed(2),
        'sec',
      );

      console.log(
        'INFERENCE:',
        inferenceTime,
        'ms',
      );

      console.log(
        'RTF:',
        rtf.toFixed(3),
      );

      console.log('--------------------------------------------');

      const text =
        result?.text?.trim?.() ??
        '';

      if (text) {
        setTranscription(text);
      } else {
        setTranscription(
          'Whisper returned no text.',
        );
      }

      console.log(
        `🏁 WHISPER ${MODEL_SHORT_NAME} TEST COMPLETE`,
      );

      console.log(
        '============================================',
      );

    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : String(e);

      console.error(
        `❌ WHISPER ${MODEL_SHORT_NAME} TRANSCRIPTION ERROR:`,
        message,
      );

      setError(
        `Whisper: ${message}`,
      );

      setTranscription('');

    } finally {
      setProcessing(false);

      audioBufferRef.current = [];
      totalSamplesRef.current = 0;

      // ------------------------------------------------------
      // DESTROY WHISPER
      // ------------------------------------------------------

      try {
        await whisperRef.current?.destroy?.();
      } catch {}

      whisperRef.current = null;
    }
  };

  // ============================================================
  // CLEANUP
  // ============================================================

  const cleanup = async () => {
    if (timerRef.current) {
      clearInterval(
        timerRef.current,
      );

      timerRef.current = null;
    }

    removeDataListenerRef.current?.();

    removeDataListenerRef.current =
      null;

    removeErrorListenerRef.current?.();

    removeErrorListenerRef.current =
      null;

    try {
      await micRef.current?.stop();
    } catch {}

    micRef.current = null;

    try {
      await whisperRef.current?.destroy?.();
    } catch {}

    whisperRef.current = null;

    audioBufferRef.current = [];
    totalSamplesRef.current = 0;

    setRecording(false);
    setProcessing(false);
  };

  // ============================================================
  // SCREEN UNMOUNT
  // ============================================================

  useEffect(() => {
    return () => {
      void cleanup();
    };
  }, []);

  // ============================================================
  // UI
  // ============================================================

  return (
    <SafeAreaView
      style={styles.container}>

      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }>

        <View style={styles.content}>

          {/* ==================================================
              HEADER
          ================================================== */}

          <Text style={styles.title}>
            WHISPER
          </Text>

          <Text style={styles.subtitle}>
            {USE_BASE
              ? 'BASE • INT8 • OFFLINE'
              : 'TINY • INT8 • OFFLINE'}
          </Text>

          {/* ==================================================
              MODEL CARD
          ================================================== */}

          <View style={styles.modelCard}>

            <Text style={styles.cardLabel}>
              ACTIVE MODEL
            </Text>

            <Text style={styles.modelName}>
              {MODEL_NAME}
            </Text>

            <Text style={styles.modelPath}>
              {WHISPER_MODEL_PATH}
            </Text>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>
                ENCODER
              </Text>

              <Text style={styles.value}>
                {EXPECTED_ENCODER}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>
                DECODER
              </Text>

              <Text style={styles.value}>
                {EXPECTED_DECODER}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>
                TOKENS
              </Text>

              <Text style={styles.value}>
                {EXPECTED_TOKENS}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>
                LANGUAGE
              </Text>

              <Text style={styles.value}>
                English
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>
                ENGINE
              </Text>

              <Text style={styles.value}>
                Sherpa-ONNX
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>
                SAMPLE RATE
              </Text>

              <Text style={styles.value}>
                {sampleRate} Hz
              </Text>
            </View>

          </View>

          {/* ==================================================
              STATUS
          ================================================== */}

          <View
            style={[
              styles.statusCircle,
              recording &&
                styles.statusCircleRecording,
              processing &&
                styles.statusCircleProcessing,
            ]}>

            <Text style={styles.statusIcon}>
              {recording
                ? '🎙️'
                : processing
                ? '🧠'
                : '🎤'}
            </Text>

          </View>

          <Text style={styles.status}>
            {recording
              ? 'RECORDING'
              : processing
              ? 'TRANSCRIBING'
              : 'READY'}
          </Text>

          <Text style={styles.statusSub}>
            {recording
              ? `Speak naturally • ${MODEL_SHORT_NAME}`
              : processing
              ? `${MODEL_NAME} is processing locally`
              : `Press start and speak • ${MODEL_SHORT_NAME}`}
          </Text>

          {/* ==================================================
              TRANSCRIPTION
          ================================================== */}

          <View
            style={
              styles.transcriptionCard
            }>

            <Text
              style={
                styles.transcriptionLabel
              }>
              WHISPER HEARD
            </Text>

            <Text
              style={
                transcription
                  ? styles.transcriptionText
                  : styles.placeholder
              }>

              {transcription ||
                'Your transcription will appear here...'}

            </Text>

          </View>

          {/* ==================================================
              BENCHMARK INFO
          ================================================== */}

          <View
            style={styles.infoCard}>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                MODEL
              </Text>

              <Text style={styles.infoValue}>
                {MODEL_SHORT_NAME} INT8
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                STATUS
              </Text>

              <Text style={styles.infoValue}>
                {recording
                  ? 'RECORDING'
                  : processing
                  ? 'PROCESSING'
                  : 'IDLE'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                DURATION
              </Text>

              <Text style={styles.infoValue}>
                {duration.toFixed(1)} s
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                SAMPLES
              </Text>

              <Text style={styles.infoValue}>
                {sampleCount}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                RATE
              </Text>

              <Text style={styles.infoValue}>
                {sampleRate} Hz
              </Text>
            </View>

          </View>

          {/* ==================================================
              ERROR
          ================================================== */}

          {error ? (
            <View
              style={
                styles.errorCard
              }>

              <Text
                style={
                  styles.errorTitle
                }>
                ERROR
              </Text>

              <Text
                style={
                  styles.errorText
                }>
                {error}
              </Text>

            </View>
          ) : null}

          {/* ==================================================
              BUTTON
          ================================================== */}

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={processing}
            style={[
              styles.button,
              recording &&
                styles.buttonRecording,
              processing &&
                styles.buttonDisabled,
            ]}
            onPress={
              recording
                ? stopRecording
                : startRecording
            }>

            <Text
              style={
                styles.buttonText
              }>

              {recording
                ? 'STOP & TRANSCRIBE'
                : processing
                ? 'PROCESSING...'
                : `START ${MODEL_SHORT_NAME}`}

            </Text>

          </TouchableOpacity>

          {/* ==================================================
              TEST NOTE
          ================================================== */}

          <Text
            style={
              styles.testNote
            }>

            {USE_BASE
              ? 'Whisper Base INT8 benchmark'
              : 'Whisper Tiny INT8 benchmark'}

            {'\n'}

            Offline • English • CPU • 4 threads

            {'\n\n'}

            No Qwen, Gemini or Kokoro connection.

          </Text>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
};

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor: '#050505',
    },

    scrollContent: {
      flexGrow: 1,
    },

    content: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 40,
      paddingBottom: 40,
    },

    // ========================================================
    // HEADER
    // ========================================================

    title: {
      color: '#F5F5F5',
      fontSize: 32,
      fontWeight: '900',
      letterSpacing: 7,
    },

    subtitle: {
      color: '#777',
      fontSize: 11,
      letterSpacing: 3,
      marginTop: 6,
    },

    // ========================================================
    // MODEL CARD
    // ========================================================

    modelCard: {
      width: '100%',
      maxWidth: 380,
      marginTop: 28,
      padding: 18,
      borderRadius: 18,
      backgroundColor: '#101010',
      borderWidth: 1,
      borderColor: '#292929',
    },

    cardLabel: {
      color: '#777',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 2,
    },

    modelName: {
      color: '#EAEAEA',
      fontSize: 20,
      fontWeight: '800',
      marginTop: 7,
    },

    modelPath: {
      color: '#666',
      fontSize: 11,
      marginTop: 5,
    },

    divider: {
      height: 1,
      backgroundColor: '#242424',
      marginVertical: 14,
    },

    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 5,
    },

    label: {
      color: '#666',
      fontSize: 10,
      letterSpacing: 1.5,
      flexShrink: 0,
    },

    value: {
      color: '#D8D8D8',
      fontSize: 10,
      fontWeight: '700',
      maxWidth: '65%',
      textAlign: 'right',
    },

    // ========================================================
    // STATUS
    // ========================================================

    statusCircle: {
      width: 110,
      height: 110,
      borderRadius: 55,
      marginTop: 35,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#111',
      borderWidth: 2,
      borderColor: '#333',
    },

    statusCircleRecording: {
      borderColor: '#E63B3B',
      backgroundColor: '#210909',
    },

    statusCircleProcessing: {
      borderColor: '#D4A63A',
      backgroundColor: '#211B09',
    },

    statusIcon: {
      fontSize: 42,
    },

    status: {
      color: '#E6E6E6',
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: 3,
      marginTop: 18,
    },

    statusSub: {
      color: '#666',
      fontSize: 12,
      marginTop: 7,
      textAlign: 'center',
    },

    // ========================================================
    // TRANSCRIPTION
    // ========================================================

    transcriptionCard: {
      width: '100%',
      maxWidth: 380,
      minHeight: 145,
      marginTop: 24,
      padding: 18,
      borderRadius: 18,
      backgroundColor: '#0D0D0D',
      borderWidth: 1,
      borderColor: '#292929',
    },

    transcriptionLabel: {
      color: '#AFAFAF',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 2,
      marginBottom: 14,
    },

    transcriptionText: {
      color: '#F0F0F0',
      fontSize: 18,
      lineHeight: 28,
      fontWeight: '600',
    },

    placeholder: {
      color: '#4F4F4F',
      fontSize: 16,
      lineHeight: 24,
      fontStyle: 'italic',
    },

    // ========================================================
    // INFO
    // ========================================================

    infoCard: {
      width: '100%',
      maxWidth: 380,
      marginTop: 14,
      padding: 16,
      borderRadius: 16,
      backgroundColor: '#0D0D0D',
      borderWidth: 1,
      borderColor: '#222',
    },

    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },

    infoLabel: {
      color: '#666',
      fontSize: 10,
      letterSpacing: 1.5,
    },

    infoValue: {
      color: '#CCC',
      fontSize: 11,
      fontWeight: '700',
    },

    // ========================================================
    // ERROR
    // ========================================================

    errorCard: {
      width: '100%',
      maxWidth: 380,
      marginTop: 14,
      padding: 14,
      borderRadius: 14,
      backgroundColor: '#1A0909',
      borderWidth: 1,
      borderColor: '#5A2020',
    },

    errorTitle: {
      color: '#E85A5A',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 2,
      marginBottom: 6,
    },

    errorText: {
      color: '#C88',
      fontSize: 12,
      lineHeight: 18,
    },

    // ========================================================
    // BUTTON
    // ========================================================

    button: {
      width: '100%',
      maxWidth: 380,
      marginTop: 20,
      paddingVertical: 17,
      borderRadius: 15,
      alignItems: 'center',
      backgroundColor: '#E0E0E0',
    },

    buttonRecording: {
      backgroundColor: '#C93636',
    },

    buttonDisabled: {
      backgroundColor: '#333',
    },

    buttonText: {
      color: '#050505',
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1.5,
    },

    // ========================================================
    // NOTE
    // ========================================================

    testNote: {
      color: '#4F4F4F',
      fontSize: 10,
      lineHeight: 16,
      textAlign: 'center',
      marginTop: 18,
    },
  });

export default Whispertest;