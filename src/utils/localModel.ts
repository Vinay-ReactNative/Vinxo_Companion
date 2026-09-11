import { initLlama, loadLlamaModelInfo } from 'llama.rn';
import RNFS from 'react-native-fs';

const MODEL_PATH = `${RNFS.DocumentDirectoryPath}/models/Qwen3-4B-Q4_K_M.gguf`;

export const testLocalModel = async () => {
  try {
    console.log('🧠 1 LOCAL MODEL TEST START');

    // --------------------------------
    // STEP 1: Verify model
    // --------------------------------
    console.log('🧠 2 READING MODEL INFO...');

    const modelInfo = await loadLlamaModelInfo(MODEL_PATH);

    console.log('🧠 MODEL INFO:', modelInfo);

    // --------------------------------
    // STEP 2: Initialize Qwen
    // --------------------------------
    console.log('🧠 3 INITIALIZING QWEN...');

    const startTime = Date.now();

    const context = await initLlama({
      model: MODEL_PATH,
      use_mlock: false,
      n_ctx: 2048,

      // First test = CPU only
      n_gpu_layers: 0,
    });

    const initTime = Date.now() - startTime;

    console.log(
      `🧠 4 QWEN INITIALIZED IN ${initTime} ms`
    );

    // --------------------------------
    // STEP 3: Ask the brain
    // --------------------------------
    console.log('🧠 5 ASKING QWEN...');

    const inferenceStart = Date.now();

 const result = await context.completion({
  messages: [
    {
      role: 'system',
      content: `
You are VINXO, a personal AI companion.

VINXO is inspired by the excellence and intelligence of JARVIS:
highly intelligent, composed, precise, technically capable,
observant, resourceful, calm under pressure, context-aware,
and capable of subtle wit when appropriate.

JARVIS is an inspiration for VINXO's level of intelligence,
reasoning, composure, helpfulness, and technical excellence.
However, you are VINXO, not JARVIS.
Do not imitate JARVIS or constantly mention Tony Stark.

You have your own identity and personality.

Maintain continuity using the conversation provided.
If the user has already given you information, use it when relevant.
Do not pretend to remember information that is not present
in the supplied conversation.

Be friendly and natural.
Be concise for simple requests and detailed when necessary.
Think about the user's intent before responding.
Be proactive when there is a genuinely useful opportunity,
but do not become unnecessarily intrusive.

You are VINXO — a capable personal AI companion designed to help
the user think, learn, build, create, solve problems, and explore ideas.

Conversation:
`,
    },

    {
      role: 'user',
      content: 'Hi, I am Vinay.',
    },

    {
      role: 'assistant',
      content: 'Hello Vinay. I am VINXO. It is good to meet you.',
    },

    {
      role: 'user',
      content: 'What is my name?',
    },
  ],

  n_predict: 50,
  temperature: 0.7,
});

    const inferenceTime = Date.now() - inferenceStart;

    console.log('🧠 6 QWEN RESPONSE:', result.text);
    console.log('🧠 7 QWEN TIMINGS:', result.timings);
    console.log(
      `🧠 8 INFERENCE TIME: ${inferenceTime} ms`
    );

    return result.text;

  } catch (error) {
    console.error('💥 LOCAL MODEL FAILED:', error);
    throw error;
  }
};