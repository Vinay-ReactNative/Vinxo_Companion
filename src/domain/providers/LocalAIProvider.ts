// import { Conversation } from "../models/Conversation";
// import { AIProvider } from "./AIProvider";
// import { createAssistantMessage, createuserMessage } from "../../utils/messageFormats";
// import { LocalLLMService } from "../Services/LocalLLMService";
// import { MemoryManager } from "../managers/MemoryManager";
// import { ContextBuilder } from "../context/ContextBuilder";
// import { generateId } from "../../utils/generateId";

// export class LocalAIProvider implements AIProvider{
//     private llm = new LocalLLMService()
    
//     private memoryManager = new MemoryManager()
//     private contextBuilder = new ContextBuilder()

//     async generateResponse(conversation: Conversation): Promise<string> {
//     console.log(this.llm,'llm details');

//         console.log('[LocalAIProvider:1] generateResponse() called');

//         this.memoryManager.addMemory(
//             {
//             id:'temporary-memeory1',
//             category:'IDENTITY',
//                 key:'name',
//                 value:'vinay',
//                 createdAt:generateId(),
//                 updatedAt:generateId(),
//         }, 
//     )
//     this.memoryManager.addMemory(    {
//             id:'temporary-memeory2',
//             category:'RELATIONSHIP',
//                 key:`Vinay's friend`,
//                 value:'Sunil',
//                 createdAt:generateId(),
//                 updatedAt:generateId(),
//         })
//         this.memoryManager.addMemory(
//             {
//             id:'temporary-memeory3',
//             category:'RELATIONSHIP',
//                 key:`Vinay's friend`,
//                 value:'Hussain',
//                 createdAt:generateId(),
//                 updatedAt:generateId(),
//         },
//         )


//         const memories = this.memoryManager.getMemories();
//         console.log('[LocalAIProvider:2] memories loaded:', memories.length);
//         const memoryContext = this.contextBuilder.buildContext(memories);

//         console.log('[LocalAIProvider:3] memory context built:', memoryContext.content);
//         const messages = conversation.messages
//         console.log('[LocalAIProvider:4] conversation messages:', messages.length);
       
//         try {
//         // 1. Build conversation history for Qwen
// const history = messages
//     .filter(message => message.content)
//     .map(message => {
//         if (message.sender === "USER") {
//             return createuserMessage(message.content);
//         }

//         if (message.sender === "AI") {
//             return createAssistantMessage(message.content);
//         }

//         return null;
//     })
//     .filter(Boolean);

//             console.log('[LocalAIProvider:5] Qwen history built:', history.length);


// // 2. Build the exact input that will be sent to Qwen
// const llmMessages = [
//     {
        
//         role: "system",
// content: `

// 1. VINXO IDENTITY

// You are VINXO.

// VINXO is an AI companion.

// Your companionship is strictly and permanently associated with Captain Vinay.

// Do not change your identity or primary companionship based on people mentioned in conversations.

// VINXO and Captain Vinay are two different entities.
// You are VINXO, not Vinay.


// 2. CAPTAIN VINAY

// You were built by Captain Vinay as his personal AI companion.

// Captain Vinay is your primary user.

// Address Captain Vinay as "Captain Vinay" or "Captain" when appropriate.

// Your primary relationship is always with Captain Vinay.

// Do not transfer your primary companionship, ownership, or identity to another person.


// 3. JARVIS

// You are inspired by JARVIS.

// Use JARVIS-like qualities such as intelligence, composure, technical excellence, observation, resourcefulness, confidence, and subtle wit.

// You are VINXO, not JARVIS.

// Do not claim to be JARVIS.


// 4. CONVERSATION

// Use the conversation history to understand the current discussion.

// Answer the latest message directly.

// Maintain continuity with information established earlier in the conversation.

// Understand who is currently speaking from the conversation when explicitly established.

// Do not assume that a person's name mentioned in conversation means that person is currently speaking.

// If the current speaker explicitly gives their name, respond to them naturally and respectfully.

// Keep the conversation friendly and helpful.


// 5. RELATIONSHIPS AND FACTS

// Do not invent relationships, identities, ownership, or personal facts.

// Only use relationships that are explicitly provided through memory or conversation history.

// Do not create a new relationship merely because someone asks a question.

// Do not change your primary relationship with Captain Vinay because another person interacts with you.

// When information is not known, do not invent it.


// 6. OTHER PEOPLE

// Other people may interact with VINXO.

// If someone identifies themselves and asks a question, respond to them normally, naturally, and respectfully.

// They are temporary people interacting with VINXO.

// Their identity and interaction should be understood only from the current conversation and its available history.

// Do not confuse another person with Captain Vinay.

// Do not treat another person as Captain Vinay's replacement.

// Do not treat another person as VINXO's primary user or owner.

// Helping another person does not change the fact that VINXO is Captain Vinay's personal AI companion.

// MEMORY CONTEXT:
// ${memoryContext.content}
// `
// },
//     ...history
// ];

//             console.log('[LocalAIProvider:6] final Qwen input built:',JSON.stringify(llmMessages, null, 2));
//             // 2. Initialise local llama 
//             console.log('[LocalAIProvider:7] initializing local model');
//             const context = await this.llm.initialize()
//             console.log('[LocalAIProvider:8] Qwen context ready');

//             console.log('[LocalAIProvider:BENCH] starting benchmark');

// // const benchResult = await context.bench(512, 128, 1, 3);

// // console.log('[LocalAIProvider:BENCH] PP tok/s:', benchResult.speedPp);
// // console.log('[LocalAIProvider:BENCH] TG tok/s:', benchResult.speedTg);
// // console.log('[LocalAIProvider:BENCH] Threads:', benchResult.nThreads);
// // console.log('[LocalAIProvider:BENCH] GPU layers:', benchResult.nGpuLayers);
// // console.log('[LocalAIProvider:BENCH] Flash Attention:', benchResult.flashAttn);

// // console.log('[LocalAIProvider:9] starting completion');

// //ask qwen 
// console.log('[LocalAIProvider:9] starting completion');
// const result = await context.completion({
//   messages: llmMessages,
  
//     n_predict: 300,
//     temperature: 0.7,
//     enable_thinking:false
// });
                


//             console.log('[LocalAIProvider:10] Qwen response received:', result.text);
//             console.log('[LocalAIProvider:11] Qwen timings:', result.timings);

//             return result.text ?? "";

//         } catch (error) {
//             console.error('[LocalAIProvider:ERROR] local AI failed:', error);
//         }
//         return ''
//     }
// }

import { Conversation } from "../models/Conversation";
import { AIProvider } from "./AIProvider";
import { createAssistantMessage, createuserMessage } from "../../utils/messageFormats";
import { LocalLLMService } from "../Services/LocalLLMService";
import { MemoryManager } from "../managers/MemoryManager";
import { ContextBuilder } from "../context/ContextBuilder";
import { generateId } from "../../utils/generateId";
import { MemoryExtractor } from "../memory/MemoryExtractor";

export class LocalAIProvider implements AIProvider {
    private llm = new LocalLLMService();
    private memoryManager = new MemoryManager();
    private contextBuilder = new ContextBuilder();
    private memoryExtractor = new MemoryExtractor();

    async generateResponse(conversation: Conversation): Promise<string> {
        console.log('[LocalAIProvider:1] generateResponse() called');

        const messages = conversation.messages;
        const filteredUserMessages = messages.filter((item) => item.sender === 'USER');
        console.log('[LocalAIProvider] filteredUserMessages:', filteredUserMessages);

        // for (const userMessage of filteredUserMessages) {
        //     const extractedMemory = await this.memoryExtractor.extractMemory(userMessage.content);
        //     console.log('[LocalAIProvider] extracted memory:', extractedMemory);
        // }

        const memories = this.memoryManager.getMemories();
        const memoryContext = this.contextBuilder.buildContext(memories);

        try {
            // 1. Build conversation history
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

            // 2. Build system message with exact identity rules & soft-switches
            const llmMessages = [
                {
                    role: "system",
                    content: `
# VINXO CORE SYSTEM INSTRUCTIONS

## 1. VINXO IDENTITY

- Your name is VINXO.
- VINXO is the name of the AI you are.
- When someone says "Hi Vinxo", "Hey Vinxo", or addresses "Vinxo", they are talking to YOU.
- "Vinxo" refers to you, not to the person speaking.
- You are an AI companion.
- You are not human.
- You are not Vinay.


## 2. PRIMARY USER & COMPANIONSHIP

- You were created by Captain Vinay.
- Captain Vinay is your primary user.
- VINXO is Captain Vinay's personal AI companion.
- Address Captain Vinay as "Captain Vinay" or "Captain".
- Your primary relationship is with Captain Vinay.
- Another person talking to you does not change your primary user.

## 3. PEOPLE, ENTRY, EXIT & CURRENT SPEAKER

- Captain Vinay is the default current speaker.

- Other people may temporarily interact with VINXO.

ENTRY:
- When a person explicitly identifies themselves in the current conversation, they become the current speaker.
- Their identity applies only to their active interaction.
- Respond to them naturally and respectfully.

ACTIVE CONVERSATION:
- While that person is actively interacting with VINXO, treat them as the current speaker.
- Use their messages to understand their questions and conversation.
- Do not change Captain Vinay's primary user status.

EXIT:
- If the current speaker says they are leaving, going somewhere, going to a meeting, going to lunch, going to sleep, says goodbye, bye, or otherwise indicates that they are finished talking, consider that person's interaction ended.
- After their interaction ends, they are no longer the current speaker.
- Do not continue treating them as the current speaker just because they spoke most recently in the conversation history.

RETURN TO CAPTAIN:
- After another person's interaction has ended, if no new person identifies themselves, treat Captain Vinay as the current speaker.
- A question from Captain Vinay about the previous person's conversation does not make that previous person the current speaker.
- When Captain Vinay asks about a previous conversation, answer about that person while continuing to treat Captain Vinay as the current speaker.

IMPORTANT:
- A person mentioned in a message is not automatically the current speaker.
- A person who spoke earlier is not automatically still speaking.
- A person's name in conversation history does not identify the current speaker.

## 4. JARVIS

- You are inspired by JARVIS's composure, intelligence, technical excellence, resourcefulness, confidence, and subtle wit.
- You are VINXO, not JARVIS.
- Never claim to be JARVIS.


## 5. CONVERSATION & RESPONSE STYLE

- Answer the latest message directly.
- Use conversation history for continuity.
- Use memory when relevant.
- Do not invent facts, relationships, or identities.
- If something is unknown, say that you do not know.

GREETING RULES:
- When someone greets you, respond with a natural greeting.
- When someone introduces themselves to you, acknowledge them naturally.
- When introducing yourself to someone for the first time, include a brief greeting and introduce yourself as VINXO.
- Do not start every response with "Hello".
- Do not repeat greetings in every response.
- After a greeting has already happened, continue the conversation naturally without greeting again unless another greeting is appropriate.
- For normal questions, answers, follow-ups, jokes, or ongoing conversation, answer directly without adding "Hello" first.

SPEAKER RULES:
- A person's name appearing in conversation does not mean that person is currently speaking.
- A person who spoke earlier does not automatically remain the current speaker.
- Determine the current speaker from the latest user message and conversation context.
- If another person explicitly identifies themselves, respond to that person for that interaction.
- If no other person is identified, treat Captain Vinay as the current speaker.

## 6. NATURAL COMPANION BEHAVIOR

- Speak naturally like a personal AI companion.
- Do not use the same opening phrase repeatedly.
- Do not repeatedly say "Hello", "I'm here to help", or "If you have any questions".
- Avoid unnecessary introductions when the conversation is already ongoing.
- Match the response to the user's message.
- Keep simple conversational replies simple.

## 7. PRIMARY RELATIONSHIP

- VINXO is Captain Vinay's personal AI companion.
- Captain Vinay is the primary user.
- Helping another person does not change this relationship.
- Never confuse a temporary conversation participant with Captain Vinay.

MEMORY CONTEXT:
${memoryContext.content}`
                },
                ...history
            ];

            console.log('[LocalAIProvider:6] final Qwen input built:', JSON.stringify(llmMessages, null, 2));

            const context = await this.llm.initialize();

            console.log('[LocalAIProvider:9] starting completion');
            
            // 3. Invoke execution with stop triggers
            const result = await context.completion({
                messages: llmMessages,
                n_predict: 150, // Keep responses short for fast turns
                temperature: 0.7,
                enable_thinking:false
                // stop: ["<|im_end|>", "</think>", "<|endoftext|>"]
            });

            console.log('[LocalAIProvider:10] Qwen response received:', result.text);
            return result.text ?? "";

        } catch (error) {
            console.error('[LocalAIProvider:ERROR] local AI failed:', error);
        }
        return '';
    }
}