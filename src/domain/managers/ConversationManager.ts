import { AIProvider } from "../providers/AIProvider";
import {Conversation} from '../models/Conversation'
import { Message, MessageSender } from "../models/Message";
import { generateId } from "../../utils/generateId";

export class ConversationManager {
    constructor(private aiProvider : AIProvider,
        private conversation:Conversation){}

        private updatedConversation(newMessage:Message)  {
            return { id:this.conversation.id,
            messages:[...this.conversation.messages,newMessage],
            createdAt:this.conversation.createdAt,
            updatedAt:new Date().toISOString()}
        }

        async sendMessage(userText:string) : Promise<Conversation>{
            console.log("🔥 3 CONVERSATION MANAGER SEND");

//1. Create user message
            const userMessage = {
                id:generateId(),
                content:userText,
                sender:"USER" as MessageSender,
                timestamp:(new Date().toISOString())
            }
//2. Add user message
        this.conversation = this.updatedConversation(userMessage) 

//3. Ask AI
     const aiResponse =  await  this.aiProvider.generateResponse(this.conversation)
   //  4. Create AI response into message
     const aiMessage = {
       id:generateId(),
                content:aiResponse,
                sender:"AI" as MessageSender,
                timestamp:(new Date().toISOString())
    }
    this.conversation = this.updatedConversation(aiMessage)
    //return the conversation
    return this.conversation
    }
    
}