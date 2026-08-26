import { Conversation } from "../models/Conversation";


export interface AIProvider {
   
generateResponse(conversation:Conversation):Promise<string>
}
