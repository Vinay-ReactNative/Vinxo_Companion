import React, {useEffect, useRef, useState} from 'react';
import {
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';

import {createPcmLiveStream} from 'react-native-sherpa-onnx/audio';
import {createStreamingSTT} from 'react-native-sherpa-onnx/stt';

const PARTICLE_COUNT = 28;

// ============================================================
// STREAMING STT MODEL
// ============================================================

const STT_MODEL_PATH =
  'sherpa-onnx-streaming-zipformer-en-2023-06-26';

// ============================================================
// HOW OFTEN TO REFRESH THE DEBUG COUNTERS IN THE UI
// Updating 3 state values every 100 ms costs ~30 React
// re-renders/sec — all competing with STT on the JS thread.
// Throttle to every N chunks.
// ============================================================

const UI_COUNTER_UPDATE_EVERY_N_CHUNKS = 5;

// ============================================================
// MIC TEST
// ============================================================

const MicTest = () => {
  // ==========================================================
  // MIC
  // ==========================================================

  const micRef =
    useRef<ReturnType<typeof createPcmLiveStream> | null>(null);

  // ==========================================================
  // STT
  // ==========================================================

  const sttRef = useRef<any>(null);
  const sttStreamRef = useRef<any>(null);

  // ==========================================================
  // LISTENERS
  // ==========================================================

  const removeDataListenerRef =
    useRef<(() => void) | null>(null);

  const removeErrorListenerRef =
    useRef<(() => void) | null>(null);

  // ==========================================================
  // CHUNK COUNTER
  // ==========================================================

  const chunkCounter = useRef(0);

  // ==========================================================
  // STT PROCESSING LOCK
  // ==========================================================

  /**
   * Audio arrives approximately every 100ms.
   *
   * We use a single lightweight boolean lock because each
   * call to sttStream.processAudioChunk() is already atomic
   * on the native side (acceptWaveform + decode loop +
   * getResult + isEndpoint in one bridge round-trip).
   *
   * Chunks that arrive while a native call is in-flight are
   * queued and drained immediately after.
   */
  const isProcessingRef = useRef(false);

  const pendingAudioChunksRef = useRef<
    Array<{
      samples: Float32Array;
      sampleRate: number;
    }>
  >([]);

  // ==========================================================
  // ACCUMULATED TRANSCRIPTION
  // ==========================================================

  /**
   * Sherpa resets its internal buffer on endpoint detection.
   * We accumulate all confirmed segments here so previously
   * spoken words are never erased from the display.
   */
  const accumulatedTextRef = useRef('');

  // ==========================================================
  // STOP STATE
  // ==========================================================

  const stoppingRef = useRef(false);

  // ==========================================================
  // UI STATE
  // ==========================================================

  const [listening, setListening] = useState(false);

  const [chunkCount, setChunkCount] = useState(0);

  const [sampleCount, setSampleCount] = useState(0);

  const [sampleRate, setSampleRate] = useState(16000);

  const [error, setError] = useState('');

  const [recognizedText, setRecognizedText] = useState('');

  console.log(recognizedText,'recognizedText')
  // ==========================================================
  // ANIMATIONS
  // ==========================================================

  const rotation = useRef(
    new Animated.Value(0),
  ).current;

  const pulse = useRef(
    new Animated.Value(0),
  ).current;

  const glow = useRef(
    new Animated.Value(0.5),
  ).current;

  // ==========================================================
  // PARTICLES
  // ==========================================================

  const particles = useRef(
    Array.from(
      {length: PARTICLE_COUNT},
      (_, index) => ({
        id: index,

        progress: new Animated.Value(
          Math.random(),
        ),

        angle:
          (index / PARTICLE_COUNT) *
          Math.PI *
          2,

        radius:
          125 + Math.random() * 80,

        size:
          2 + Math.random() * 4,

        duration:
          2500 + Math.random() * 3500,

        delay:
          Math.random() * 1500,
      }),
    ),
  ).current;

  // ==========================================================
  // MAIN ANIMATIONS
  // ==========================================================

  useEffect(() => {
    const rotateAnimation =
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 9000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );

    rotateAnimation.start();

    const pulseAnimation =
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1400,
            easing: Easing.inOut(
              Easing.ease,
            ),
            useNativeDriver: true,
          }),

          Animated.timing(pulse, {
            toValue: 0,
            duration: 1400,
            easing: Easing.inOut(
              Easing.ease,
            ),
            useNativeDriver: true,
          }),
        ]),
      );

    pulseAnimation.start();

    const glowAnimation =
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(
              Easing.ease,
            ),
            useNativeDriver: true,
          }),

          Animated.timing(glow, {
            toValue: 0.45,
            duration: 1200,
            easing: Easing.inOut(
              Easing.ease,
            ),
            useNativeDriver: true,
          }),
        ]),
      );

    glowAnimation.start();

    return () => {
      rotateAnimation.stop();
      pulseAnimation.stop();
      glowAnimation.stop();
    };
  }, [glow, pulse, rotation]);

  // ==========================================================
  // PARTICLE ANIMATIONS
  // ==========================================================

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];

    particles.forEach(particle => {
      const animation =
        Animated.loop(
          Animated.timing(
            particle.progress,
            {
              toValue: 1,
              duration:
                particle.duration,
              delay: particle.delay,
              easing:
                Easing.inOut(
                  Easing.ease,
                ),
              useNativeDriver: true,
            },
          ),
        );

      animations.push(animation);

      animation.start();
    });

    return () => {
      animations.forEach(animation => {
        animation.stop();
      });
    };
  }, [particles]);

  // ==========================================================
  // COMPLETE CLEANUP
  // ==========================================================

  useEffect(() => {
    return () => {
      stoppingRef.current = true;

      removeDataListenerRef.current?.();
      removeErrorListenerRef.current?.();

      try {
        micRef.current?.stop();
      } catch {}

      try {
        sttStreamRef.current?.release?.();
      } catch {}

      try {
        sttRef.current?.destroy?.();
      } catch {}
    };
  }, []);

  // ==========================================================
  // MICROPHONE PERMISSION
  // ==========================================================

  const requestPermission =
    async () => {
      if (Platform.OS !== 'android') {
        return true;
      }

      const result =
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS
            .RECORD_AUDIO,
        );

      return (
        result ===
        PermissionsAndroid.RESULTS
          .GRANTED
      );
    };

  // ==========================================================
  // INITIALIZE STT
  // ==========================================================

  const initializeSTT =
    async () => {
      console.log(
        '🧠 Initializing VINXO Streaming STT...',
      );

      console.log(
        '📂 STT Model:',
        STT_MODEL_PATH,
      );

      // ------------------------------------------------------
      // CREATE STREAMING STT ENGINE
      // ------------------------------------------------------

      const stt =
        await createStreamingSTT({
          modelPath: {
            type: 'asset',
            path: STT_MODEL_PATH,
          },

          modelType: 'transducer',

          // 4 threads is the sweet spot for ARM big.LITTLE;
          // 6 threads cause contention and increase latency.
          numThreads: 4,

          provider: 'cpu',

          // Greedy search is fastest (~20–40ms/chunk faster
          // than beam search) with negligible accuracy loss
          // for conversational English.
          decodingMethod: 'greedy_search',

          // Trigger endpoint after 0.8s of silence following
          // speech — much snappier than the 1.4s default.
          endpointConfig: {
            rule1: {
              mustContainNonSilence: false,
              minTrailingSilence: 2.4,
              minUtteranceLength: 0,
            },
            rule2: {
              mustContainNonSilence: true,
              minTrailingSilence: 0.8,
              minUtteranceLength: 0,
            },
            rule3: {
              mustContainNonSilence: false,
              minTrailingSilence: 0,
              minUtteranceLength: 20,
            },
          },

          // Android AudioRecord already delivers properly
          // normalised PCM — no extra scaling needed.
          enableInputNormalization: false,

          // No dither needed: mic provides clean 16-bit PCM.
          dither: 0,

          debug: false,
        } as any);

      sttRef.current = stt;

      console.log(
        '✅ Streaming STT initialized',
      );

      // ------------------------------------------------------
      // CREATE STT STREAM
      // ------------------------------------------------------

      const stream =
        await stt.createStream();

      sttStreamRef.current =
        stream;

      console.log(
        '✅ STT audio stream created',
      );
    };

  // ==========================================================
  // PROCESS ONE AUDIO CHUNK — LOW-LATENCY PATH
  // ==========================================================

  /**
   * sttStream.processAudioChunk() performs in ONE native call:
   *   acceptWaveform → decode-while-ready → getResult → isEndpoint
   *
   * This replaces the previous 5-round-trip approach which
   * introduced ~4× the JS↔native bridge overhead per chunk.
   *
   * The lightweight isProcessing lock prevents concurrent
   * native calls while still draining queued chunks immediately.
   */
  const processAudioChunk =
    async (
      samples: Float32Array,
      sr: number,
    ) => {
      const sttStream =
        sttStreamRef.current;

      if (!sttStream) {
        return;
      }

      if (stoppingRef.current) {
        return;
      }

      // Queue a zero-copy reference
      // (buffer is already copied in handleAudioChunk).
      pendingAudioChunksRef.current.push({
        samples,
        sampleRate: sr,
      });

      if (isProcessingRef.current) {
        // A native call is already in-flight; the drain
        // loop below will pick up this chunk when it finishes.
        return;
      }

      isProcessingRef.current = true;

      try {
        while (
          pendingAudioChunksRef.current.length > 0
        ) {
          if (stoppingRef.current) {
            break;
          }

          const nextChunk =
            pendingAudioChunksRef.current.shift();

          if (!nextChunk) {
            continue;
          }

          // ------------------------------------------------
          // SINGLE-CALL NATIVE PIPELINE
          //
          // processAudioChunk accepts Float32Array directly
          // — no Array.from() conversion, saving O(n)
          // allocation that was happening per chunk.
          // ------------------------------------------------

          const {result, isEndpoint} =
            await sttStream.processAudioChunk(
              nextChunk.samples,
              nextChunk.sampleRate,
            );

          const partialText =
            result?.text?.trim?.() ?? '';

          if (partialText) {
            // Show accumulated past segments + current partial.
            setRecognizedText(
              accumulatedTextRef.current
                ? `${accumulatedTextRef.current} ${partialText}`
                : partialText,
            );
          }

          if (isEndpoint) {
            // Commit the completed segment before reset so
            // no text is lost when the stream buffer clears.
            if (partialText) {
              accumulatedTextRef.current =
                accumulatedTextRef.current
                  ? `${accumulatedTextRef.current} ${partialText}`
                  : partialText;
            }

            await sttStream.reset();
          }
        }
      } catch (sttError) {
        console.error(
          '❌ STT ERROR:',
          sttError,
        );

        const message =
          sttError instanceof Error
            ? sttError.message
            : String(sttError);

        setError(
          `STT: ${message}`,
        );
      } finally {
        isProcessingRef.current = false;
      }
    };

  // ==========================================================
  // START MICROPHONE + STT
  // ==========================================================

  const startMic =
    async () => {
      if (listening) {
        return;
      }

      stoppingRef.current = false;

      setError('');

      setChunkCount(0);

      setSampleCount(0);

      setSampleRate(16000);

      setRecognizedText('');

      chunkCounter.current = 0;

      isProcessingRef.current = false;

      pendingAudioChunksRef.current = [];

      accumulatedTextRef.current = '';

      // ------------------------------------------------------
      // PERMISSION
      // ------------------------------------------------------

      const granted =
        await requestPermission();

      if (!granted) {
        setError(
          'Microphone permission denied',
        );

        return;
      }

      try {
        // ----------------------------------------------------
        // INITIALIZE STT
        // ----------------------------------------------------

        await initializeSTT();

        // ----------------------------------------------------
        // CREATE MICROPHONE STREAM
        // ----------------------------------------------------

        const mic =
          createPcmLiveStream({
            sampleRate: 16000,
            channelCount: 1,
          });

        micRef.current = mic;

        // ----------------------------------------------------
        // AUDIO DATA
        // ----------------------------------------------------

        removeDataListenerRef.current =
          mic.onData(
            (
              samples,
              sr,
            ) => {
              // Don't use await directly in the event
              // listener itself.
              //
              // processAudioChunk handles the async
              // Sherpa pipeline.
              void handleAudioChunk(
                samples,
                sr,
              );
            },
          );

        // ----------------------------------------------------
        // MIC ERROR
        // ----------------------------------------------------

        removeErrorListenerRef.current =
          mic.onError(
            message => {
              console.error(
                '🎤 MIC ERROR:',
                message,
              );

              setError(message);

              setListening(false);
            },
          );

        setListening(true);

        // ----------------------------------------------------
        // START NATIVE MICROPHONE
        // ----------------------------------------------------

        await mic.start();

        console.log(
          '🎙️ MICROPHONE STREAM STARTED',
        );

        console.log(
          '🧠 VINXO STT IS LISTENING LOCALLY',
        );

      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : String(e);

        console.error(
          '❌ FAILED TO START VINXO VOICE:',
          message,
        );

        setError(message);

        // ----------------------------------------------------
        // CLEANUP FAILED STARTUP
        // ----------------------------------------------------

        try {
          await micRef.current?.stop();
        } catch {}

        try {
          await sttStreamRef.current?.release?.();
        } catch {}

        try {
          await sttRef.current?.destroy?.();
        } catch {}

        micRef.current = null;

        sttStreamRef.current = null;

        sttRef.current = null;

        setListening(false);
      }
    };

  // ==========================================================
  // AUDIO CHUNK HANDLER
  // ==========================================================

  const handleAudioChunk =
    async (
      samples: Float32Array,
      sr: number,
    ) => {
      chunkCounter.current += 1;

      const chunkNumber =
        chunkCounter.current;

      // ======================================================
      // UI AUDIO COUNTERS — THROTTLED
      //
      // Updating 3 state values every 100ms triggers ~30
      // React re-renders/sec on the JS thread, competing with
      // STT. Throttle to every N chunks to keep JS free.
      // ======================================================

      if (
        chunkNumber % UI_COUNTER_UPDATE_EVERY_N_CHUNKS === 0
      ) {
        setChunkCount(chunkNumber);

        setSampleCount(
          previous =>
            previous +
            samples.length * UI_COUNTER_UPDATE_EVERY_N_CHUNKS,
        );

        setSampleRate(sr);
      }

      // ======================================================
      // SEND TO STT
      //
      // Copy the buffer so the native event data is not
      // mutated while the async native call is in flight.
      // ======================================================

      await processAudioChunk(
        new Float32Array(samples),
        sr,
      );
    };

  // ==========================================================
  // STOP MICROPHONE + STT
  // ==========================================================

  const stopMic =
    async () => {
      if (stoppingRef.current) {
        return;
      }

      stoppingRef.current = true;

      try {
        // ----------------------------------------------------
        // STOP RECEIVING NEW AUDIO FIRST
        // ----------------------------------------------------

        removeDataListenerRef.current?.();

        removeDataListenerRef.current =
          null;

        // ----------------------------------------------------
        // STOP MICROPHONE
        // ----------------------------------------------------

        await micRef.current?.stop();

        // Wait for any in-flight native call to finish.
        // processAudioChunk() exits early once stoppingRef is true.
        let waitMs = 0;
        while (isProcessingRef.current && waitMs < 2000) {
          await new Promise(resolve => setTimeout(resolve, 50));
          waitMs += 50;
        }

        console.log(
          '🛑 MICROPHONE STREAM STOPPED',
        );

        console.log(
          `📊 Total chunks: ${chunkCounter.current}`,
        );

        // ----------------------------------------------------
        // FINALIZE CURRENT STT STREAM
        // ----------------------------------------------------

        const sttStream =
          sttStreamRef.current;

        if (sttStream) {
          try {
            console.log(
              '🏁 Finalizing STT stream...',
            );

            await sttStream.inputFinished();

            while (
              await sttStream.isReady()
            ) {
              await sttStream.decode();
            }

            const finalResult =
              await sttStream.getResult();

            const finalSegment =
              finalResult?.text
                ?.trim?.() || '';

            // Merge any remaining partial text with accumulated
            // text from previous endpoint-detected segments.
            const fullFinal =
              accumulatedTextRef.current
                ? finalSegment
                  ? `${accumulatedTextRef.current} ${finalSegment}`
                  : accumulatedTextRef.current
                : finalSegment;

            if (fullFinal) {
              console.log(
                '🏁 FINAL TRANSCRIPTION:',
                fullFinal,
              );

              setRecognizedText(fullFinal);
            }
          } catch (e) {
            console.error(
              '❌ STT FINALIZATION ERROR:',
              e,
            );
          }
        }
      } finally {
        // ----------------------------------------------------
        // REMOVE LISTENERS
        // ----------------------------------------------------

        removeDataListenerRef.current?.();

        removeErrorListenerRef.current?.();

        removeDataListenerRef.current =
          null;

        removeErrorListenerRef.current =
          null;

        // ----------------------------------------------------
        // RELEASE STREAM
        // ----------------------------------------------------

        try {
          await sttStreamRef.current?.release?.();
        } catch {}

        // ----------------------------------------------------
        // DESTROY ENGINE
        // ----------------------------------------------------

        try {
          await sttRef.current?.destroy?.();
        } catch {}

        // ----------------------------------------------------
        // CLEAR REFERENCES
        // ----------------------------------------------------

        micRef.current = null;

        sttStreamRef.current = null;

        sttRef.current = null;

        isProcessingRef.current = false;

        pendingAudioChunksRef.current = [];

        accumulatedTextRef.current = '';

        setListening(false);

        console.log(
          '🧹 VINXO STT resources released',
        );
      }
    };

  // ==========================================================
  // ANIMATION VALUES
  // ==========================================================

  const rotationInterpolation =
    rotation.interpolate({
      inputRange: [0, 1],
      outputRange: [
        '0deg',
        '360deg',
      ],
    });

  const pulseScale =
    pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [
        1,
        1.16,
      ],
    });

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <SafeAreaView
      style={styles.container}>
      <View
        style={
          styles.backgroundGlow
        }
      />

      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }>
        <View
          style={styles.content}>

          {/* ==================================================
              TITLE
          ================================================== */}

          <Text
            style={styles.title}>
            VINXO
          </Text>

          <Text
            style={
              styles.subtitle
            }>
            VOICE CORE
          </Text>

          {/* ==================================================
              VISUALIZER
          ================================================== */}

          <View
            style={
              styles.visualizer
            }>

            {/* ----------------------------------------------
                PARTICLES
            ---------------------------------------------- */}

            <Animated.View
              style={[
                styles.particleOrbit,
                {
                  transform: [
                    {
                      rotate:
                        rotationInterpolation,
                    },
                  ],
                },
              ]}>
              {particles.map(
                particle => {
                  const x =
                    Math.cos(
                      particle.angle,
                    ) *
                    particle.radius;

                  const y =
                    Math.sin(
                      particle.angle,
                    ) *
                    particle.radius;

                  const particleTranslateX =
                    particle.progress.interpolate(
                      {
                        inputRange: [
                          0,
                          0.5,
                          1,
                        ],
                        outputRange: [
                          x,
                          x * 0.65,
                          x,
                        ],
                      },
                    );

                  const particleTranslateY =
                    particle.progress.interpolate(
                      {
                        inputRange: [
                          0,
                          0.5,
                          1,
                        ],
                        outputRange: [
                          y,
                          y * 0.65,
                          y,
                        ],
                      },
                    );

                  const particleOpacity =
                    particle.progress.interpolate(
                      {
                        inputRange: [
                          0,
                          0.2,
                          0.5,
                          0.8,
                          1,
                        ],
                        outputRange: [
                          0.15,
                          1,
                          0.8,
                          1,
                          0.15,
                        ],
                      },
                    );

                  const particleScale =
                    particle.progress.interpolate(
                      {
                        inputRange: [
                          0,
                          0.5,
                          1,
                        ],
                        outputRange: [
                          0.6,
                          1.4,
                          0.6,
                        ],
                      },
                    );

                  return (
                    <Animated.View
                      key={
                        particle.id
                      }
                      style={[
                        styles.particle,
                        {
                          width:
                            particle.size,

                          height:
                            particle.size,

                          borderRadius:
                            particle.size,

                          opacity:
                            particleOpacity,

                          transform: [
                            {
                              translateX:
                                particleTranslateX,
                            },
                            {
                              translateY:
                                particleTranslateY,
                            },
                            {
                              scale:
                                particleScale,
                            },
                          ],
                        },
                      ]}
                    />
                  );
                },
              )}
            </Animated.View>

            {/* ----------------------------------------------
                OUTER RING
            ---------------------------------------------- */}

            <Animated.View
              style={[
                styles.outerRing,
                {
                  transform: [
                    {
                      rotate:
                        rotationInterpolation,
                    },
                  ],
                },
              ]}>
              {Array.from({
                length: 12,
              }).map(
                (_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.ringParticle,
                      {
                        transform: [
                          {
                            rotate: `${index * 30}deg`,
                          },
                          {
                            translateY:
                              -155,
                          },
                        ],
                      },
                    ]}
                  />
                ),
              )}
            </Animated.View>

            {/* ----------------------------------------------
                RED LAVA GLOW
            ---------------------------------------------- */}

            <Animated.View
              style={[
                styles.lavaGlow,
                {
                  opacity: glow,
                  transform: [
                    {
                      scale:
                        pulseScale,
                    },
                  ],
                },
              ]}
            />

            {/* ----------------------------------------------
                VINXO CORE
            ---------------------------------------------- */}

            <Animated.View
              style={[
                styles.core,
                {
                  transform: [
                    {
                      scale:
                        pulseScale,
                    },
                  ],
                },
              ]}>
              <View
                style={
                  styles.coreInner
                }>
                <Text
                  style={
                    styles.micIcon
                  }>
                  🎙
                </Text>
              </View>
            </Animated.View>

            {/* ----------------------------------------------
                INNER RING
            ---------------------------------------------- */}

            <Animated.View
              style={[
                styles.innerRing,
                {
                  transform: [
                    {
                      rotate:
                        rotationInterpolation,
                    },
                  ],
                },
              ]}
            />
          </View>

          {/* ==================================================
              STATUS
          ================================================== */}

          <Text
            style={
              styles.status
            }>
            {listening
              ? 'LISTENING'
              : 'MICROPHONE READY'}
          </Text>

          <Text
            style={
              styles.statusSub
            }>
            {listening
              ? 'VINXO is listening locally'
              : 'Waiting for microphone input'}
          </Text>

          {/* ==================================================
              RECOGNIZED TEXT
          ================================================== */}

          <View
            style={
              styles.transcriptionCard
            }>
            <View
              style={
                styles.transcriptionHeader
              }>
              <Text
                style={
                  styles.transcriptionLabel
                }>
                VINXO HEARD
              </Text>

              <View
                style={
                  styles.liveDot
                }
              />
            </View>

            <Text
              style={
                recognizedText
                  ? styles.transcriptionText
                  : styles.transcriptionPlaceholder
              }>
              {recognizedText ||
                'Start speaking...'}
            </Text>
          </View>

          {/* ==================================================
              AUDIO INFO
          ================================================== */}

          <View
            style={
              styles.infoCard
            }>
            <View
              style={
                styles.infoRow
              }>
              <Text
                style={
                  styles.infoLabel
                }>
                STREAM
              </Text>

              <Text
                style={
                  styles.infoValue
                }>
                {listening
                  ? 'ACTIVE'
                  : 'IDLE'}
              </Text>
            </View>

            <View
              style={
                styles.infoRow
              }>
              <Text
                style={
                  styles.infoLabel
                }>
                CHUNKS
              </Text>

              <Text
                style={
                  styles.infoValue
                }>
                {chunkCount}
              </Text>
            </View>

            <View
              style={
                styles.infoRow
              }>
              <Text
                style={
                  styles.infoLabel
                }>
                SAMPLES
              </Text>

              <Text
                style={
                  styles.infoValue
                }>
                {sampleCount}
              </Text>
            </View>

            <View
              style={
                styles.infoRow
              }>
              <Text
                style={
                  styles.infoLabel
                }>
                RATE
              </Text>

              <Text
                style={
                  styles.infoValue
                }>
                {sampleRate} Hz
              </Text>
            </View>
          </View>

          {/* ==================================================
              ERROR
          ================================================== */}

          {error ? (
            <Text
              style={
                styles.error
              }>
              {error}
            </Text>
          ) : null}

          {/* ==================================================
              BUTTON
          ================================================== */}

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.button,
              listening &&
                styles.buttonActive,
            ]}
            onPress={
              listening
                ? stopMic
                : startMic
            }>
            <Text
              style={
                styles.buttonText
              }>
              {listening
                ? 'STOP LISTENING'
                : 'START LISTENING'}
            </Text>
          </TouchableOpacity>
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
      backgroundColor:
        '#050505',
    },

    scrollContent: {
      flexGrow: 1,
    },

    backgroundGlow: {
      position: 'absolute',
      width: 420,
      height: 420,
      borderRadius: 210,
      backgroundColor:
        '#260000',
      opacity: 0.45,
      top: '22%',
      left: '50%',
      marginLeft: -210,
    },

    content: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 40,
      paddingBottom: 40,
    },

    title: {
      color: '#FFD36A',
      fontSize: 34,
      fontWeight: '900',
      letterSpacing: 8,
    },

    subtitle: {
      color: '#8D8D8D',
      fontSize: 11,
      letterSpacing: 5,
      marginTop: 5,
    },

    visualizer: {
      width: 350,
      height: 350,
      justifyContent:
        'center',
      alignItems: 'center',
      marginTop: 20,
    },

    particleOrbit: {
      position: 'absolute',
      width: 1,
      height: 1,
      justifyContent:
        'center',
      alignItems: 'center',
    },

    particle: {
      position: 'absolute',
      backgroundColor:
        '#FFD45C',
      shadowColor:
        '#FF3B00',
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 8,
    },

    outerRing: {
      position: 'absolute',
      width: 310,
      height: 310,
      borderRadius: 155,
      borderWidth: 1,
      borderColor:
        '#4D160A',
    },

    ringParticle: {
      position: 'absolute',
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor:
        '#FFC83D',
    },

    lavaGlow: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor:
        '#D71900',
      shadowColor:
        '#FF2600',
      shadowOpacity: 1,
      shadowRadius: 55,
      elevation: 25,
    },

    core: {
      width: 125,
      height: 125,
      borderRadius: 63,
      backgroundColor:
        '#7A0B00',
      justifyContent:
        'center',
      alignItems: 'center',
      shadowColor:
        '#FF3B00',
      shadowOpacity: 1,
      shadowRadius: 35,
      elevation: 30,
    },

    coreInner: {
      width: 102,
      height: 102,
      borderRadius: 51,
      backgroundColor:
        '#160000',
      borderWidth: 2,
      borderColor:
        '#E5A928',
      justifyContent:
        'center',
      alignItems: 'center',
    },

    micIcon: {
      fontSize: 42,
    },

    innerRing: {
      position: 'absolute',
      width: 215,
      height: 215,
      borderRadius: 108,
      borderWidth: 1,
      borderColor:
        '#C98920',
      borderStyle:
        'dashed',
    },

    status: {
      color: '#FF4B25',
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: 4,
      marginTop: -5,
    },

    statusSub: {
      color: '#777',
      fontSize: 12,
      marginTop: 8,
    },

    // ========================================================
    // TRANSCRIPTION
    // ========================================================

    transcriptionCard: {
      width: '100%',
      maxWidth: 360,
      marginTop: 22,
      padding: 18,
      borderRadius: 18,
      backgroundColor:
        '#0D0D0D',
      borderWidth: 1,
      borderColor:
        '#6B2415',
      minHeight: 100,
    },

    transcriptionHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 12,
    },

    transcriptionLabel: {
      color: '#E9B949',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 2,
    },

    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor:
        '#FF3B00',
      marginLeft: 8,
    },

    transcriptionText: {
      color: '#FFE2A0',
      fontSize: 18,
      lineHeight: 27,
      fontWeight: '600',
    },

    transcriptionPlaceholder: {
      color: '#555',
      fontSize: 16,
      fontStyle:
        'italic',
    },

    // ========================================================
    // INFO
    // ========================================================

    infoCard: {
      width: '100%',
      maxWidth: 360,
      marginTop: 14,
      padding: 16,
      borderRadius: 16,
      backgroundColor:
        '#0D0D0D',
      borderWidth: 1,
      borderColor:
        '#32140F',
    },

    infoRow: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      paddingVertical: 6,
    },

    infoLabel: {
      color: '#777',
      fontSize: 11,
      letterSpacing: 2,
    },

    infoValue: {
      color: '#E9B949',
      fontSize: 12,
      fontWeight: '700',
    },

    error: {
      color: '#FF4A35',
      marginTop: 12,
      textAlign: 'center',
    },

    // ========================================================
    // BUTTON
    // ========================================================

    button: {
      marginTop: 20,
      width: '100%',
      maxWidth: 360,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems:
        'center',
      backgroundColor:
        '#8D160A',
      borderWidth: 1,
      borderColor:
        '#E2A52E',
    },

    buttonActive: {
      backgroundColor:
        '#B21B0B',
    },

    buttonText: {
      color: '#FFE09A',
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 2,
    },
  });

export default MicTest;