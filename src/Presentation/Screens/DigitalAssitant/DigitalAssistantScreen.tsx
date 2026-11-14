import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StreamingTtsEngine } from 'react-native-sherpa-onnx/tts';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { initializeKokoro, initializeWhisper } from '../../../Playground/VinxoVoice/VinxoVoiceModules';
import { generateSpeech } from '../../../Playground/VinxoVoice/VinxoSpeech';
import { attachDataListner, attachErrorListener, createMicrophone } from '../../../Playground/VinxoVoice/VinxoAudio';
import { createPcmLiveStream, PcmLiveStreamHandle } from 'react-native-sherpa-onnx/audio';
import Whispertest from '../../../Playground/Whispertest';

type DigitalAssistantScreenProps = {
  displayName?: string;
  onSendMessage?: (message: string) => void;
  onVoicePress?: () => void;
};

const DigitalAssistantScreen = ({
  displayName = 'Vinay',
  onSendMessage,
  onVoicePress,
}: DigitalAssistantScreenProps) => {
  const [message, setMessage] = useState('');
  const orbRotation = useRef(new Animated.Value(0)).current;
  const orbHighlightRotation = useRef(new Animated.Value(0)).current;
  const orbBreathing = useRef(new Animated.Value(0)).current;
  const hasMessage = message.trim().length > 0;

  const ttsRef = useRef<StreamingTtsEngine| null >(null)
const greetingStartedRef = useRef(false)
const [voiceStatus,setVoiceStatus] = useState('INITIALIZING')

//mic 
const micRef = useRef<PcmLiveStreamHandle | null>(null)

//whisper or sttref
const whisperRef = useRef<any>(null)

const [isWhisperReady,setWhisperReady] = useState(false)
useEffect(()=>{
    let isMounted = true;

    const playGreeting = async ()=>{
        if(greetingStartedRef.current){
            return 
        }
        greetingStartedRef.current = true

    try {
        setVoiceStatus('Preparing Voice')
        const engine = await initializeKokoro()
        ttsRef.current = engine

        if(!isMounted){
            await engine.destroy()
            ttsRef.current = null
            return
        }

        const sampleRate = await engine.getSampleRate()
        await engine.startPcmPlayer(sampleRate,1)
        setVoiceStatus('Speaking')

        await generateSpeech(engine,
            'Good Evening, Vinay, VINXO is ready. How can I help you today?',
        )
        if(isMounted){
            setVoiceStatus('READY')
        }
    } catch (error) {
        console.error('[VINXO] Greeting error:',error)

        if(isMounted){
            setVoiceStatus("VOICE ERROR")
        }
    }
    }

    void playGreeting()

    return ()=>{
        isMounted = false

        const engine = ttsRef.current;
        ttsRef.current = null
        if(engine){

            void (
                async ()=>{
try {
    await engine.stopPcmPlayer()
} catch (error) {
    
}
try {
    await engine.destroy()
} catch (error) {}
            })()
        }
    }
    
},[])


//request microphone permission 

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

  const startConversation = async  ()=>{
console.log('first')
        if(micRef.current){
        return
    }
    console.log('second')

const haspermission = await requestPermission()
console.log(haspermission,'haspermissionhaspermission')
    try {
        if(!haspermission){
            setVoiceStatus('mic permission denied')
            return 
        }

        //create a mic 
    const mic = createMicrophone()
    micRef.current = mic

    attachDataListner(mic,(samples,samplerate)=>{
       console.log(samples.length,'samples',samplerate,'hz')
    })
    
    attachErrorListener(mic,message=>{
        console.error('vinxo microphone errro',message)
    })
    await mic.start()
// initlaise whisper  once
     if(!whisperRef.current){
        const stt =  await initializeWhisper();
        whisperRef.current = stt
        // setWhisperReady(true)
        setVoiceStatus('whisper ready')
    }
    } catch (error) {
        console.error('[whisper error]',error)
        setVoiceStatus('[whisper error]')
    }
  }

// UI part //
  useEffect(() => {
    const rotation = Animated.loop(
      Animated.timing(orbRotation, {
        toValue: 1,
        duration: 26000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(orbBreathing, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orbBreathing, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const highlightRotation = Animated.loop(
      Animated.timing(orbHighlightRotation, {
        toValue: 1,
        duration: 34000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    rotation.start();
    breathing.start();
    highlightRotation.start();
    return () => {
      rotation.stop();
      breathing.stop();
      highlightRotation.stop();
    };
  }, [orbBreathing, orbHighlightRotation, orbRotation]);

  const orbRotate = orbRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const orbHighlightRotate = orbHighlightRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });
  const orbScale = orbBreathing.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.035],
  });

  const sendMessage = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !onSendMessage) {
      return;
    }

    onSendMessage(trimmedMessage);
    setMessage('');
  };

  return (
    <View style={styles.safeArea} >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.screen}>
          <View style={styles.brand}>
            <View style={styles.brandMark} />
            <Text style={styles.brandName}>VINXO</Text>
          </View>

          <View style={styles.mainContent}>
            <View style={styles.orbArea}>
              <View style={styles.orbGlow} />
              <View style={styles.orbOuter}>
                <View style={styles.orbCore}>
                  <Svg
                    pointerEvents="none"
                    style={StyleSheet.absoluteFill}
                    viewBox="0 0 174 174">
                    <Defs>
                      <RadialGradient id="orbBase" cx="38%" cy="30%" r="78%">
                        <Stop offset="0" stopColor="#50190F" />
                        <Stop offset="0.48" stopColor="#1B0D0B" />
                        <Stop offset="1" stopColor="#08090C" />
                      </RadialGradient>
                      <RadialGradient id="orbLight" cx="82%" cy="52%" r="65%">
                        <Stop offset="0" stopColor="#FFC96E" stopOpacity="0.95" />
                        <Stop offset="0.28" stopColor="#F45A2A" stopOpacity="0.72" />
                        <Stop offset="1" stopColor="#D32616" stopOpacity="0" />
                      </RadialGradient>
                    </Defs>
                    <Circle cx="87" cy="87" r="85" fill="url(#orbBase)" />
                    <Ellipse
                      cx="139"
                      cy="85"
                      rx="42"
                      ry="66"
                      fill="url(#orbLight)"
                      opacity="0.72"
                    />
                  </Svg>
                  <Animated.View
                    style={[
                      styles.orbMotion,
                      { transform: [{ scale: orbScale }] },
                    ]}>
                    <Animated.View
                      style={[
                        styles.orbFlow,
                        { transform: [{ rotate: orbRotate }] },
                      ]}>
                      <Svg width="100%" height="100%" viewBox="0 0 174 174">
                        <Defs>
                          <LinearGradient
                            id="flowRibbon"
                            x1="0%"
                            y1="100%"
                            x2="100%"
                            y2="0%">
                            <Stop offset="0" stopColor="#A51D14" stopOpacity="0.08" />
                            <Stop offset="0.48" stopColor="#EF4724" stopOpacity="0.38" />
                            <Stop offset="0.82" stopColor="#FFB95C" stopOpacity="0.62" />
                            <Stop offset="1" stopColor="#FFE5A1" stopOpacity="0.24" />
                          </LinearGradient>
                          <ClipPath id="flowClip">
                            <Circle cx="87" cy="87" r="85" />
                          </ClipPath>
                        </Defs>
                        <G clipPath="url(#flowClip)">
                          <Path
                            d="M 13 112 C 27 83, 49 66, 75 55 C 99 45, 122 44, 136 29 C 145 19, 155 23, 159 36 C 165 55, 150 77, 132 93 C 112 110, 89 116, 67 123 C 48 129, 36 139, 29 150 C 23 160, 13 153, 12 143 C 11 132, 9 121, 13 112 Z"
                            fill="url(#flowRibbon)"
                            opacity="0.62"
                          />
                          <Path
                            d="M 17 112 C 34 83, 57 66, 83 56 C 108 47, 127 45, 140 30"
                            fill="none"
                            stroke="#FF7540"
                            strokeOpacity="0.68"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </G>
                      </Svg>
                    </Animated.View>

                    <Animated.View
                      style={[
                        styles.orbFlow,
                        { transform: [{ rotate: orbHighlightRotate }] },
                      ]}>
                      <Svg width="100%" height="100%" viewBox="0 0 174 174">
                        <Defs>
                          <LinearGradient
                            id="flowHighlight"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%">
                            <Stop offset="0" stopColor="#EF4724" stopOpacity="0.1" />
                            <Stop offset="0.55" stopColor="#FF8A43" stopOpacity="0.72" />
                            <Stop offset="1" stopColor="#FFF0C0" stopOpacity="0.98" />
                          </LinearGradient>
                          <ClipPath id="highlightClip">
                            <Circle cx="87" cy="87" r="85" />
                          </ClipPath>
                        </Defs>
                        <G clipPath="url(#highlightClip)">
                          <Path
                            d="M 12 131 C 34 108, 58 110, 85 99 C 114 87, 141 66, 154 39"
                            fill="none"
                            stroke="url(#flowHighlight)"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          <Path
                            d="M 16 134 C 39 113, 61 115, 87 104 C 115 92, 139 72, 151 47"
                            fill="none"
                            stroke="#FFF3D1"
                            strokeOpacity="0.8"
                            strokeWidth="0.8"
                            strokeLinecap="round"
                          />
                          <Path
                            d="M 25 148 C 49 129, 75 131, 101 121 C 127 111, 149 93, 161 72"
                            fill="none"
                            stroke="#D92D1C"
                            strokeOpacity="0.48"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </G>
                      </Svg>
                    </Animated.View>
                  </Animated.View>
                </View>
              </View>
            </View>

            <View style={styles.greeting}>
              <Text style={styles.hello}>Hello {displayName}</Text>
              <Text style={styles.headline}>How can I help</Text>
              <Text style={styles.headline}>you today?</Text>
              <Text style={styles.supportingText}>
                Your day, your ideas, your companion.
              </Text>
            </View>
            <Text style={styles.voiceStatus}>
  {voiceStatus}
</Text>
          </View>

          <View style={styles.bottomArea}>
            <View style={styles.inputBar}>
              <TextInput
                accessibilityLabel="Ask Vinxo anything"
                placeholder="Ask anything..."
                placeholderTextColor={COLORS.placeholder}
                value={message}
                onChangeText={setMessage}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
                style={styles.textInput}
                selectionColor={COLORS.gold}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  hasMessage ? 'Send message' : 'Use voice input'
                }
                onPress={startConversation}
                style={({ pressed }) => [
                  styles.voiceButton,
                  hasMessage && styles.sendButton,
                  pressed && styles.buttonPressed,
                ]}>
                {hasMessage ? (
                  <Text style={styles.sendIcon}>↑</Text>
                ) : (
                  <View style={styles.waveform}>
                    {[12, 21, 31, 18, 26, 13, 20].map((height, index) => (
                      <View
                        key={index}
                        style={[styles.waveBar, { height }]}
                      />
                    ))}
                  </View>
                )}
              </Pressable>
            </View>
            <Text style={styles.footerHint}>
              {hasMessage
                ? 'Tap the arrow or press send'
                : 'Type a message or tap to speak'}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const COLORS = {
  background: '#0B0807',
  gold: '#FFD18A',
  placeholder: '#D5BFA5',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
   paddingVertical:30,
    backgroundColor: COLORS.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  screen: {
    flex: 1,
    overflow: 'hidden',
    paddingHorizontal: 24,
    backgroundColor: COLORS.background,
  },
  brand: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  brandMark: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF572E',
    shadowColor: '#FF572E',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 5,
  },
  brandName: {
    color: '#D9B889',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 4,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 8,
  },
  orbArea: {
    width: 236,
    height: 236,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 26,
  },
  orbGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(239, 85, 30, 0.035)',
    shadowColor: '#FF562C',
    shadowOpacity: 0.8,
    shadowRadius: 48,
    elevation: 18,
  },
  orbOuter: {
    width: 174,
    height: 174,
    borderRadius: 87,
    padding: 1,
    backgroundColor: '#B86937',
    shadowColor: '#EF682D',
    shadowOpacity: 0.65,
    shadowRadius: 22,
    elevation: 15,
  },
  orbCore: {
    overflow: 'hidden',
    flex: 1,
    borderRadius: 86,
    backgroundColor: '#140B09',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 138, 0.5)',
  },
  orbMotion: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbFlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  greeting: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  hello: {
    color: '#C8B8A7',
    fontSize: 17,
    fontWeight: '400',
    marginBottom: 15,
  },
  headline: {
    color: '#FFF8F0',
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -1.3,
    textAlign: 'center',
  },
  supportingText: {
    marginTop: 16,
    color: '#998879',
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  bottomArea: {
    paddingTop: 18,
    paddingBottom: 12,
  },
  inputBar: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 40,
    paddingLeft: 24,
    paddingRight: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 204, 139, 0.45)',
    backgroundColor: 'rgba(126, 54, 30, 0.42)',
    shadowColor: '#E57835',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 16,
    color: '#FFF4E6',
    fontSize: 17,
  },
  voiceButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 205, 137, 0.13)',
  },
  sendButton: {
    backgroundColor: '#E89446',
  },
  buttonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  waveform: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveBar: {
    width: 2,
    borderRadius: 2,
    backgroundColor: '#FFE2B5',
  },
  sendIcon: {
    color: '#241109',
    fontSize: 31,
    fontWeight: '500',
    lineHeight: 36,
    marginTop: -4,
  },
  footerHint: {
    marginTop: 12,
    color: '#927C69',
    fontSize: 12,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  voiceStatus: {
  marginTop: 18,
  color: '#FFD18A',
  fontSize: 11,
  fontWeight: '600',
  letterSpacing: 3,
},
});

export default DigitalAssistantScreen;