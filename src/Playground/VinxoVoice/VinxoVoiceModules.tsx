
import {createSTT,type SttEngine} from 'react-native-sherpa-onnx/stt';
import {
  createStreamingTTS,
} from 'react-native-sherpa-onnx/tts';
const WHISPER_MODEL_PATH = 'sherpa-onnx-whisper-base';
const KOKORO_MODEL_PATH = 'kokoro-en-v0_19';

export   const initializeWhisper = async () => {
    console.log('🧠 VINXO: Initializing Whisper Base INT8');

    const stt = await createSTT({
      modelPath: {
        type: 'asset',
        path: WHISPER_MODEL_PATH,
      },
      preferInt8: true,
      modelType: 'whisper',
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
      debug: true,
    } as any);
     console.log(
      '✅ VINXO: Whisper Base INT8 ready',
    );
    return stt;
  };

export const transcribeAudio = (engine:SttEngine ,audio:Float32Array,sampleRate:number)=>{
 return  engine.transcribeSamples(Array.from(audio),sampleRate)
}

  export  const initializeKokoro = async () => {
      console.log('🔊 VINXO: Initializing Kokoro');
  
      const engine =
        await createStreamingTTS({
          modelPath: {
            type: 'asset',
            path: KOKORO_MODEL_PATH,
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
      console.log(
        '✅ VINXO: Kokoro ready',
      );
      return engine;
    };
