// import { initLlama } from "llama.rn";
// import RNFS from "react-native-fs";

// const MODEL_ASSET_PATH = "models/Qwen3-1.7B-Q4_K_M.gguf";
// const MODEL_PATH = `${RNFS.DocumentDirectoryPath}/models/Qwen3-1.7B-Q4_K_M.gguf`;

// const formatError = (error: unknown) =>
//     error instanceof Error
//         ? { name: error.name, message: error.message, stack: error.stack }
//         : error;

// export class LocalLLMService {

//     private context: any = null;

//     async initialize() {
//         console.log("[LocalLLMService:1] initialize() called");
//         console.log("[LocalLLMService:2] model path:", MODEL_PATH);

//         try {
//             if (this.context) {
//                 console.log("[LocalLLMService:3] reusing existing context");
//                 return this.context;
//             }

//             console.log("[LocalLLMService:3] checking model file");
//             await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/models`);
//             const exists = await RNFS.exists(MODEL_PATH);
//             console.log("[LocalLLMService:4] model exists:", exists);

//             if (!exists) {
//                 console.log("[LocalLLMService:4] copying model from Android assets");
//                 await RNFS.copyFileAssets(MODEL_ASSET_PATH, MODEL_PATH);
//             }

//             console.log("[LocalLLMService:5] calling initLlama");
//             this.context = await initLlama({
//                 model: MODEL_PATH,
//                 use_mlock: false,
//                 n_ctx: 2048,
//                 n_threads: 6,
//                 n_gpu_layers: 0,
//                 cache_type_k: 'q8_0',
// cache_type_v: 'q8_0',
//             });
//             console.log("[LocalLLMService:6] local Qwen ready");

            
//             return this.context;
//         } catch (error) {
//             console.error("[LocalLLMService:ERROR] initialization failed", formatError(error));
//             throw error;
//         }
//     }
// }


import { initLlama } from "llama.rn";
import RNFS from "react-native-fs";

const MODEL_ASSET_PATH = "models/Qwen3-1.7B-Q4_K_M.gguf";
const MODEL_PATH = `${RNFS.DocumentDirectoryPath}/models/Qwen3-1.7B-Q4_K_M.gguf`;

const formatError = (error: unknown) =>
    error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack
        }
        : error;

export class LocalLLMService {

    private context: any = null;

    async initialize() {

        console.log("[LocalLLMService:1] initialize() called");
        console.log("[LocalLLMService:2] model path:", MODEL_PATH);

        try {

            if (this.context) {
                console.log("[LocalLLMService:3] reusing existing context");
                return this.context;
            }

            console.log("[LocalLLMService:3] checking model file");

            await RNFS.mkdir(
                `${RNFS.DocumentDirectoryPath}/models`
            );

            const exists = await RNFS.exists(MODEL_PATH);

            console.log("[LocalLLMService:4] model exists:", exists);

            if (!exists) {

                console.log(
                    "[LocalLLMService:4] copying Qwen3 model from Android assets"
                );

                await RNFS.copyFileAssets(
                    MODEL_ASSET_PATH,
                    MODEL_PATH
                );
            }

            console.log("[LocalLLMService:5] calling initLlama");

            this.context = await initLlama({

                model: MODEL_PATH,

                use_mlock: false,

                // Qwen3 mobile baseline
                n_ctx: 2048,
                n_threads: 4,

                // CPU baseline for now
                n_gpu_layers: 0,

                // // Keep KV cache explicit
                // cache_type_k: "q8_0",
                // cache_type_v: "q8_0",

            });

            console.log("[LocalLLMService:6] Qwen3-1.7B ready");

            return this.context;

        } catch (error) {

            console.error(
                "[LocalLLMService:ERROR] initialization failed",
                formatError(error)
            );

            throw error;
        }
    }
}