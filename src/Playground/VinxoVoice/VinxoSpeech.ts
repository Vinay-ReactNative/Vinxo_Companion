import { StreamingTtsEngine, TtsStreamChunk, TtsStreamEnd, TtsStreamError } from "react-native-sherpa-onnx/tts";


export const generateSpeech = (
  engine: StreamingTtsEngine,
  text: string,
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    engine.generateSpeechStream(
      text,
      {
        sid: 3,
        speed: 1.0,
      },
      {
        onChunk: async (chunk: TtsStreamChunk) => {
          try {
            await engine.writePcmChunk(chunk.samples);
          } catch (error) {
            console.error('[VINXO][TTS] Chunk write failed:', error);
          }
        },

        onEnd: async (_event: TtsStreamEnd) => {
          try {
            await engine.stopPcmPlayer();
            console.log('[VINXO][TTS] Playback finished');
            resolve();
          } catch (error) {
            reject(error);
          }
        },

        onError: (error: TtsStreamError) => {
          console.error('[VINXO][TTS] Stream error:', error);
          reject(new Error(error.message));
        },
      },
    ).catch(reject);
  });
};
