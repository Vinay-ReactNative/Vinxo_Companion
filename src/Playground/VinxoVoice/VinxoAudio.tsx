import { createPcmLiveStream, PcmLiveStreamHandle } from "react-native-sherpa-onnx/audio";

export const createMicrophone = (): PcmLiveStreamHandle => {
  return createPcmLiveStream({
    sampleRate: 16000,
    channelCount: 1,
  });
};

 export const attachDataListner = (mic :PcmLiveStreamHandle,onSamples :(samples: Float32Array, sampleRate: number) => void,)=>{
  return mic.onData((samples,sampleRate)=>{
    const copy = new Float32Array(samples);
    onSamples(copy,sampleRate)
  })
 }      
     export const attachErrorListener = (mic:PcmLiveStreamHandle,onError:(message:string)=>void)=>{
 return mic.onError( message => {
            console.error(  '🎤 VINXO MIC ERROR:',message);
            onError(message)
          },
        );
     }   

