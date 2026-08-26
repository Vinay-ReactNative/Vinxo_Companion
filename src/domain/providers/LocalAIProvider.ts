import { loadLlamaModelInfo } from "llama.rn";
import { Conversation } from "../models/Conversation";
import { AIProvider } from "./AIProvider";
import { createAssistantMessage, createuserMessage } from "../../utils/messageFormats";
import { LocalLLMService } from "../Services/LocalLLMService";

export class LocalAIProvider implements AIProvider{
    private llm = new LocalLLMService()
    async generateResponse(conversation: Conversation): Promise<string> {
        console.log('Local AI provider reached')

        const messages = conversation.messages
        console.log('messages',messages)
       

        try {

            // 1. messages history for context
        const history = messages.filter(messages=>messages.content).map(message=>{
            if(message.sender === 'USER'){
               return  createuserMessage(message.content)
            } 
            if(message.sender === 'AI'){
                return createAssistantMessage(message.content)
            }
            return null
        }).filter(Boolean)
            console.log('local history from local llm:',history)
            
            // 2. Initialise local llama 
            const context = await this.llm.initialize()
            console.log("🧠 QWEN CONTEXT READY");

            //3.ask qwen 
            const result = await context.completion({
                messages:[
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
Use the supplied conversation to maintain continuity.
Do not invent facts that are not present.
When answering questions about identity, prefer the explicit
identity information above over uncertain inference.
`
                    },
                    ...history,
                ],
                 n_predict: 100,
                temperature: 0.7,
            })

            console.log("🧠 QWEN RESPONSE:", result.text);
            console.log("🧠 QWEN TIMINGS:", result.timings);

            return result.text ?? "";

        } catch (error) {
            console.log('local ai error:',error)
        }
        return ''
    }
}