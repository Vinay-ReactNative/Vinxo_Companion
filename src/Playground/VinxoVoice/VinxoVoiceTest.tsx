import React, {useEffect, useRef, useState} from 'react';
import {
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {createPcmLiveStream} from 'react-native-sherpa-onnx/audio';
import {createSTT} from 'react-native-sherpa-onnx/stt';
import {
  createStreamingTTS,
  type StreamingTtsEngine,
} from 'react-native-sherpa-onnx/tts';
import {styles} from './VinxoVoiceStyles'
import { handleCommand } from './VinxoCommands';
import { initializeKokoro, initializeWhisper, transcribeAudio } from './VinxoVoiceModules';
import { attachDataListner, attachErrorListener, createMicrophone,  } from './VinxoAudio';
import { generateSpeech } from './VinxoSpeech';
// ============================================================
// VINXO V1 VOICE TEST
// ============================================================

const WHISPER_MODEL_PATH = 'sherpa-onnx-whisper-base';
const KOKORO_MODEL_PATH = 'kokoro-en-v0_19';
const SAMPLE_RATE = 16000;


// ============================================================
// SCREEN
// ============================================================

const VinxoVoiceTest = () => {

const conversationActiveRef = useRef(false);

  // ==========================================================
  // WHISPER
  // ==========================================================

  const whisperRef = useRef<any>(null);

  const micRef =
    useRef<ReturnType<typeof createPcmLiveStream> | null>(null);

  const removeDataListenerRef =
    useRef<(() => void) | null>(null);

  const removeErrorListenerRef =
    useRef<(() => void) | null>(null);

  const audioBufferRef =
    useRef<Float32Array[]>([]);

  const totalSamplesRef =
    useRef(0);

  // ==========================================================
  // KOKORO
  // ==========================================================

  const ttsRef =
    useRef<StreamingTtsEngine | null>(null);

  // ==========================================================
  // STATE
  // ==========================================================

  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [transcription, setTranscription] =  useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState('');
  const [ttsReady, setTtsReady] =  useState(false);
  const [whisperReady, setWhisperReady] =   useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sampleRate, setSampleRate] = useState(SAMPLE_RATE);
  const [lastAction, setLastAction] = useState('None');

  // ==========================================================
  // TIMER
  // ==========================================================

  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimeRef =
    useRef(0);

  // ==========================================================
  // MICROPHONE PERMISSION
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



  // INITIALIZE STT AND TTS

  const initializeVoice = async () => {
    if (initializing) {
      return;
    }

    try {
      setInitializing(true);
      setError('');
      setStatus('Initializing voice pipeline...');

      console.log(
        '🚀 VINXO VOICE: Initializing STT + TTS',
      );

      if(!whisperRef.current){
        const stt =  await initializeWhisper();
        whisperRef.current = stt
        setWhisperReady(true)
      }

      if(!ttsRef.current){
        const engine = await initializeKokoro();
        ttsRef.current = engine
        setTtsReady(true)
      }

      setStatus(
        'Voice pipeline ready',
      );

      console.log(
        '✅ VINXO VOICE: Pipeline ready',
      );
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : String(e);

      console.error(
        '❌ VINXO VOICE INIT ERROR:',
        message,
      );

      setError(message);

      setStatus(
        'Initialization failed',
      );
    } finally {
      setInitializing(false);
    }
  };

  // START RECORDING


const startRecording = async (continueConversation = false) => {
  if (recording || (processing && !continueConversation)) {
    return;
  }

  try {
    setError('');

    if (!continueConversation) {
      setTranscription('');
      setResponse('');
       conversationActiveRef.current = true;
    }

    setLastAction('Listening...');

    const granted = await requestPermission();

    if (!granted) {
      setError('Microphone permission denied');
      return;
    }

    // Make sure voice engines are ready
    await initializeVoice();

    // Reset audio for this turn
    audioBufferRef.current = [];
    totalSamplesRef.current = 0;
    setSampleCount(0);
    setDuration(0);

    // Create microphone
    const mic = createMicrophone();
    micRef.current = mic;

    // Audio listener
    removeDataListenerRef.current = attachDataListner(
      mic,
      (samples, sr) => {
        audioBufferRef.current.push(samples);
        totalSamplesRef.current += samples.length;
        setSampleRate(sr);
        setSampleCount(totalSamplesRef.current);
      },
    );

    // Error listener
    removeErrorListenerRef.current = attachErrorListener(
      mic,
      message => {
        setError(message);
        setRecording(false);
      },
    );

    // Timer
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setDuration(elapsed / 1000);
    }, 100);

    // Start microphone
    await mic.start();

    setRecording(true);
    setStatus('Listening...');

    console.log('🎙️ VINXO: Listening');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    console.error('❌ VINXO RECORDING ERROR:', message);
    setError(message);

    await stopMicrophone();
  }
};


  // STOP MICROPHONE
  const stopMicrophone = async () => {
    if (timerRef.current) {
      clearInterval(
        timerRef.current,
      );
      timerRef.current = null;
    }
    removeDataListenerRef.current?.();
    removeDataListenerRef.current = null;
    removeErrorListenerRef.current?.();
    removeErrorListenerRef.current =
      null;

    try {
      await micRef.current?.stop();
    } catch (e) {
      console.error(
        '🎤 MIC STOP ERROR:',
        e,
      );
    }
    micRef.current = null;
    setRecording(false);
  };

  // STOP + TRANSCRIBE

//   const stopAndProcess = async () => {
//     if (!recording || processing) {
//       return;
//     }

//     try {
//       setProcessing(true);

//       setStatus(
//         'Stopping microphone...',
//       );

//       await stopMicrophone();

//       if (
//         totalSamplesRef.current === 0 ||
//         audioBufferRef.current.length === 0
//       ) {
//         setError(
//           'No audio captured',
//         );

//         setStatus('No audio');

//         return;
//       }

//       // ------------------------------------------------------
//       // Merge audio
//       // ------------------------------------------------------

//       const totalSamples =
//         totalSamplesRef.current;

//       const completeAudio =
//         new Float32Array(
//           totalSamples,
//         );

//       let offset = 0;

//       for (
//         const chunk of
//           audioBufferRef.current
//       ) {
//         completeAudio.set(
//           chunk,
//           offset,
//         );

//         offset +=
//           chunk.length;
//       }

//       console.log(
//         '🎧 VINXO: Audio samples:',
//         completeAudio.length,
//       );

//       console.log(
//         '🎧 VINXO: Audio duration:',
//         (
//           completeAudio.length /
//           SAMPLE_RATE
//         ).toFixed(2),
//         'seconds',
//       );

//       // ------------------------------------------------------
//       // Whisper
//       // ------------------------------------------------------

//       setStatus(
//         'Whisper is listening...',
//       );

//       setLastAction(
//         'Speech → Text',
//       );

//       console.log(
//         '🧠 VINXO: Sending audio to Whisper',
//       );

//       const startInference = Date.now();

//       const result =  await transcribeAudio(whisperRef.current,completeAudio,SAMPLE_RATE)

//       const inferenceTime =
//         Date.now() -
//         startInference;

//       const text =
//         result?.text?.trim?.() ?? '';

//       console.log(
//         '📝 VINXO STT:',
//         text,
//       );

//       console.log(
//         '⚡ Whisper inference:',
//         inferenceTime,
//         'ms',
//       );

//       setTranscription(
//         text ||
//           'Whisper returned no text.',
//       );

//       if (!text) {
//         setStatus(
//           'No speech recognized',
//         );
 
//         return;
//       }

// // ------------------------------------------------------
// // COMMAND ROUTER
// // ------------------------------------------------------

// setStatus(
//   'Understanding command...',
// );

// const commandResponse =
//   await handleCommand(text);

// if (!commandResponse) {
//   setLastAction(
//     'No matching command',
//   );

//   setStatus(
//     'Command not recognized',
//   );

//   console.log(
//     '❌ VINXO: No command matched',
//   );

//   return;
// }
// // ------------------------------------------------------
// // COMMAND MATCHED
// // ------------------------------------------------------

// setLastAction(
//   text.toLowerCase().includes('torch')
//     ? 'TORCH'
//     : 'HI_VINXO',
// );

// setResponse(
//   commandResponse,
// );

// setStatus(
//   'Command matched',
// );

// console.log(
//   '💬 VINXO RESPONSE:',
//   commandResponse,
// );

// // ------------------------------------------------------
// // KOKORO
// // ------------------------------------------------------

// await speakResponse(
//   commandResponse,
// );
//     } catch (e) {
//       const message =
//         e instanceof Error
//           ? e.message
//           : String(e);

//       console.error(
//         '❌ VINXO VOICE ERROR:',
//         message,
//       );

//       setError(message);

//       setStatus(
//         'Voice pipeline failed',
//       );
//     } finally {
//       setProcessing(false);

//       audioBufferRef.current = [];

//       totalSamplesRef.current = 0;
//     }
//   };


const stopAndProcess = async () => {
  if (!recording || processing) {
    return;
  }

  try {
    setProcessing(true);
    setStatus('Stopping microphone...');

    await stopMicrophone();

    if (
      totalSamplesRef.current === 0 ||
      audioBufferRef.current.length === 0
    ) {
      setError('No audio captured');
      setStatus('No audio');
      return;
    }

    // Merge audio chunks
    const totalSamples = totalSamplesRef.current;
    const completeAudio = new Float32Array(totalSamples);

    let offset = 0;

    for (const chunk of audioBufferRef.current) {
      completeAudio.set(chunk, offset);
      offset += chunk.length;
    }

    console.log('🎧 VINXO: Audio samples:', completeAudio.length);
    console.log(
      '🎧 VINXO: Audio duration:',
      (completeAudio.length / SAMPLE_RATE).toFixed(2),
      'seconds',
    );

    // Whisper transcription
    setStatus('Transcribing speech...');
    setLastAction('Speech → Text');

    const startInference = Date.now();

    const result = await transcribeAudio(
      whisperRef.current,
      completeAudio,
      SAMPLE_RATE,
    );

    const inferenceTime = Date.now() - startInference;
    const text = result?.text?.trim?.() ?? '';

    console.log('📝 VINXO STT:', text);
    console.log('⚡ Whisper inference:', inferenceTime, 'ms');

    setTranscription(text || 'Whisper returned no text.');

    if (!text) {
      setStatus('No speech recognized');
      return;
    }

    // End conversation using a spoken phrase
    const normalizedText = text
      .toLowerCase()
      .replace(/[.,!?]/g, '')
      .trim();

    const exitPhrases = [
      'go to sleep',
      'stop listening',
      'goodbye vinxo',
    ];

    if (exitPhrases.includes(normalizedText)) {
      conversationActiveRef.current = false;

      const goodbye = 'Going to sleep, Sir.';

      setResponse(goodbye);
      setLastAction('END CONVERSATION');
      setStatus('Conversation ended');

      await speakResponse(goodbye);
      return;
    }

    // Command router
    setStatus('Understanding command...');

    const commandResponse = await handleCommand(text);

    if (!commandResponse) {
      setLastAction('No matching command');
      setStatus('Command not recognized');

      console.log('❌ VINXO: No command matched');
      return;
    }

    // Command matched
    setLastAction(
      normalizedText.includes('torch') ? 'TORCH' : 'COMMAND',
    );

    setResponse(commandResponse);
    setStatus('Command matched');

    console.log('💬 VINXO RESPONSE:', commandResponse);

    // Speak response and wait for TTS completion
    await speakResponse(commandResponse);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : String(e);

    console.error('❌ VINXO VOICE ERROR:', message);

    setError(message);
    setStatus('Voice pipeline failed');
  } finally {
    // Clear the audio from this turn
    audioBufferRef.current = [];
    totalSamplesRef.current = 0;

    setProcessing(false);
  }
};


  // ==========================================================
  // KOKORO SPEAK
  // ==========================================================

const speakResponse = async (text: string) => {
  if (!ttsRef.current) {
    console.error('[VINXO][TTS] TTS engine not initialized');
    return;
  }

  try {
    console.log('[VINXO][TTS] Starting:', text);

    const rate = await ttsRef.current.getSampleRate();

    console.log('[VINXO][TTS] Sample rate:', rate);
    console.log('[VINXO][TTS] Starting PCM player...');

    await ttsRef.current.startPcmPlayer(rate, 1);
    console.log('[VINXO][TTS] ✅ PCM player initialized');
    console.log('[VINXO][TTS] Starting speech generation...');
await generateSpeech(ttsRef.current,text)
    console.log('[VINXO][TTS] Stopping PCM player...');
    console.log('[VINXO][TTS] PCM player stopped');
  } catch (error) {
    console.error('[VINXO][TTS] ❌ speakResponse failed:', error);
  }
};

  // ==========================================================
  // CLEANUP
  // ==========================================================

  const cleanup = async () => {
    console.log(
      '🧹 VINXO VOICE: Cleanup',
    );

    await stopMicrophone();

    audioBufferRef.current = [];

    totalSamplesRef.current = 0;

    try {
      await whisperRef.current?.destroy?.();
    } catch (e) {
      console.error(
        'Whisper destroy error:',
        e,
      );
    }

    whisperRef.current = null;

    setWhisperReady(false);

    try {
      await ttsRef.current?.stopPcmPlayer();
    } catch {}

    try {
      await ttsRef.current?.destroy();
    } catch (e) {
      console.error(
        'Kokoro destroy error:',
        e,
      );
    }

    ttsRef.current = null;

    setTtsReady(false);
  };


useEffect(() => {
  if (
    conversationActiveRef.current &&
    !recording &&
    !processing
  ) {
    console.log('🔁 VINXO: Resuming conversation');
    void startRecording(true);
  }
}, [recording, processing]);

  // ==========================================================
  // SCREEN UNMOUNT
  // ==========================================================

  useEffect(() => {
    return () => {
      void cleanup();
    };
  }, []);

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }>
        <View style={styles.content}>

          {/* ==================================================
              HEADER
          ================================================== */}

          <Text style={styles.title}>
            VINXO
          </Text>

          <Text style={styles.subtitle}>
            VOICE PIPELINE V1
          </Text>

          {/* ==================================================
              PIPELINE
          ================================================== */}

          <View style={styles.pipelineCard}>
            <Text style={styles.cardLabel}>
              CURRENT PIPELINE
            </Text>

            <Text style={styles.pipeline}>
              🎙️ STT
              {'  →  '}
              🧠 COMMAND
              {'  →  '}
              💬 RESPONSE
              {'  →  '}
              🔊 TTS
            </Text>
          </View>

          {/* ==================================================
              ENGINE STATUS
          ================================================== */}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Engine Status
            </Text>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>
                Whisper Base INT8
              </Text>

              <Text
                style={[
                  styles.statusValue,
                  whisperReady &&
                    styles.ready,
                ]}>
                {whisperReady
                  ? 'READY'
                  : 'NOT READY'}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>
                Kokoro
              </Text>

              <Text
                style={[
                  styles.statusValue,
                  ttsReady &&
                    styles.ready,
                ]}>
                {ttsReady
                  ? 'READY'
                  : 'NOT READY'}
              </Text>
            </View>
          </View>

          {/* ==================================================
              CURRENT STATUS
          ================================================== */}

          <View style={styles.statusCard}>
            <Text style={styles.statusBig}>
              {recording
                ? '🎙️ LISTENING'
                : processing
                ? '🧠 PROCESSING'
                : '🤖 ' + status}
            </Text>

            <Text style={styles.statusSmall}>
              {recording
                ? 'Say: "Hi Vinxo"'
                : processing
                ? 'Running the voice pipeline...'
                : 'Press start and speak'}
            </Text>
          </View>

          {/* ==================================================
              TRANSCRIPTION
          ================================================== */}

          <View style={styles.card}>
            <Text style={styles.cardLabel}>
              STT OUTPUT
            </Text>

            <Text
              style={[
                styles.outputText,
                !transcription &&
                  styles.placeholder,
              ]}>
              {transcription ||
                'Waiting for speech...'}
            </Text>
          </View>

          {/* ==================================================
              COMMAND
          ================================================== */}

          <View style={styles.card}>
            <Text style={styles.cardLabel}>
              COMMAND
            </Text>

            <Text style={styles.commandText}>
              {lastAction}
            </Text>
          </View>

          {/* ==================================================
              RESPONSE
          ================================================== */}

          <View style={styles.responseCard}>
            <Text style={styles.cardLabel}>
              VINXO RESPONSE
            </Text>

            <Text
              style={[
                styles.responseText,
                !response &&
                  styles.placeholder,
              ]}>
              {response ||
                'VINXO has not responded yet...'}
            </Text>
          </View>

          {/* ==================================================
              AUDIO INFO
          ================================================== */}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Audio
            </Text>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>
                Duration
              </Text>

              <Text style={styles.statusValue}>
                {duration.toFixed(1)} s
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>
                Samples
              </Text>

              <Text style={styles.statusValue}>
                {sampleCount}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>
                Sample Rate
              </Text>

              <Text style={styles.statusValue}>
                {sampleRate} Hz
              </Text>
            </View>
          </View>

          {/* ==================================================
              ERROR
          ================================================== */}

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>
                ERROR
              </Text>

              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* ==================================================
              INITIALIZE
          ================================================== */}

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={initializing || recording}
            style={[
              styles.secondaryButton,
              (initializing ||
                recording) &&
                styles.buttonDisabled,
            ]}
            onPress={
              initializeVoice
            }>
            <Text
              style={
                styles.secondaryButtonText
              }>
              {initializing
                ? 'INITIALIZING...'
                : whisperReady &&
                  ttsReady
                ? 'VOICE ENGINES READY'
                : 'INITIALIZE VOICE'}
            </Text>
          </TouchableOpacity>

          {/* ==================================================
              MAIN BUTTON
          ================================================== */}

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={processing}
            style={[
              styles.mainButton,
              recording &&
                styles.stopButton,
              processing &&
                styles.buttonDisabled,
            ]}
            onPress={
              recording
                ? stopAndProcess
                :()=> startRecording()
            }>
            <Text style={styles.mainButtonText}>
              {recording
                ? 'STOP & PROCESS'
                : processing
                ? 'PROCESSING...'
                : 'START LISTENING'}
            </Text>
          </TouchableOpacity>

          {/* ==================================================
              TEST DESCRIPTION
          ================================================== */}

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>
              Current Test
            </Text>

            <Text style={styles.noteText}>
              Say:
            </Text>

            <Text style={styles.testCommand}>
              "Hi Vinxo"
            </Text>

            <Text style={styles.noteText}>
              Expected flow:
            </Text>

            <Text style={styles.noteText}>
              Whisper → command matcher →{"\n"}
              "Hello Sir, how are you?" → Kokoro
            </Text>

            <Text style={styles.noteText}>
              No Qwen or Gemini is used in this
              test.
            </Text>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VinxoVoiceTest;