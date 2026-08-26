import { initLlama, loadLlamaModelInfo } from "llama.rn";

const MODEL_PATH =   'file:///data/user/0/com.vinxocompanion/files/models/qwen2.5-1.5b-instruct-q4_k_m.gguf';


export class LocalLLMService {

    private context :any = null

    async initialize(){

        if(this.context){
            console.log('local qwen already intialized');
            return this.context;
        }
                console.log("🧠 INITIALIZING LOCAL QWEN...");

                this.context = await initLlama(
                    {
                        model:MODEL_PATH,
                        use_mlock:false,
                        n_ctx:2048,
                        n_gpu_layers:0
                    }
                )
                   console.log("🧠 LOCAL QWEN READY");

                   return this.context
    }
}
