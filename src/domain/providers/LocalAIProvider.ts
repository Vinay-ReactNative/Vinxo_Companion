import { Conversation } from "../models/Conversation";
import { AIProvider } from "./AIProvider";
import { createAssistantMessage, createuserMessage } from "../../utils/messageFormats";
import { LocalLLMService } from "../Services/LocalLLMService";
import { MemoryManager } from "../managers/MemoryManager";
import { ContextBuilder } from "../context/ContextBuilder";

export class LocalAIProvider implements AIProvider{
    private llm = new LocalLLMService()
    
    private memoryManager = new MemoryManager()
    private contextBuilder = new ContextBuilder()

    async generateResponse(conversation: Conversation): Promise<string> {
    console.log(this.llm,'llm details');

        console.log('[LocalAIProvider:1] generateResponse() called');
        const memories = this.memoryManager.getMemories();
        console.log('[LocalAIProvider:2] memories loaded:', memories.length);
        const memoryContext = this.contextBuilder.buildContext(memories);

        console.log('[LocalAIProvider:3] memory context built:', memoryContext.content);
        const messages = conversation.messages
        console.log('[LocalAIProvider:4] conversation messages:', messages.length);
       
        try {
        // 1. Build conversation history for Qwen
const history = messages
    .filter(message => message.content)
    .map(message => {
        if (message.sender === "USER") {
            return createuserMessage(message.content);
        }

        if (message.sender === "AI") {
            return createAssistantMessage(message.content);
        }

        return null;
    })
    .filter(Boolean);

            console.log('[LocalAIProvider:5] Qwen history built:', history.length);

// 2. Build the exact input that will be sent to Qwen
const llmMessages = [
    {
        
        role: "system",
        content: `
You are VINXO, a personal AI companion.

IDENTITY:
- You are VINXO.
- The person interacting with you is the user.
- The user's name is provided by conversation context when available.
- Never confuse the user with yourself.
- Never describe yourself as Vinay unless the conversation explicitly establishes that VINAY is VINXO, which it does not.

RELATIONSHIP:
- Vinay is the person building and using VINXO.
- VINXO is the AI companion being built by Vinay.
- Vinay and VINXO are two different entities.



JARVIS INSPIRATION:
You are inspired by JARVIS's intelligence, composure,
technical excellence, observation, resourcefulness and subtle wit.
You are VINXO, not JARVIS.

CONVERSATION:
Use the supplied conversation history to maintain continuity.
Treat previous user statements as conversation facts.
When a previous message explicitly establishes a relationship,
use that information when answering later questions.

Do not invent facts.
Do not confuse people, roles, or relationships.
Prefer explicit information from the conversation over assumptions.

Answer the user's latest message directly.
`},
    ...history
];

            console.log('[LocalAIProvider:6] final Qwen input built:', llmMessages.length);
            // 2. Initialise local llama 
            console.log('[LocalAIProvider:7] initializing local model');
            const context = await this.llm.initialize()
            console.log('[LocalAIProvider:8] Qwen context ready');

            console.log('[LocalAIProvider:BENCH] starting benchmark');

const benchResult = await context.bench(512, 128, 1, 3);

console.log('[LocalAIProvider:BENCH] PP tok/s:', benchResult.speedPp);
console.log('[LocalAIProvider:BENCH] TG tok/s:', benchResult.speedTg);
console.log('[LocalAIProvider:BENCH] Threads:', benchResult.nThreads);
console.log('[LocalAIProvider:BENCH] GPU layers:', benchResult.nGpuLayers);
console.log('[LocalAIProvider:BENCH] Flash Attention:', benchResult.flashAttn);

// console.log('[LocalAIProvider:9] starting completion');

//ask qwen 
console.log('[LocalAIProvider:9] starting completion');
const result = await context.completion({
  messages: llmMessages,
  
    n_predict: 300,
    temperature: 0.7,
    enable_thinking:false
});
                


            console.log('[LocalAIProvider:10] Qwen response received:', result.text);
            console.log('[LocalAIProvider:11] Qwen timings:', result.timings);

            return result.text ?? "";

        } catch (error) {
            console.error('[LocalAIProvider:ERROR] local AI failed:', error);
        }
        return ''
    }
}