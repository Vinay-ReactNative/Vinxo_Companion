import { useEffect } from "react";
import { ConversationManager } from "../domain/managers/ConversationManager";
import { Conversation } from "../domain/models/Conversation";
import { MockAIProvider } from "../domain/providers/MockAIProvider";
import { generateId } from "../utils/generateId";
import { testLocalModel } from "../utils/localModel";


export const testConversation = async ()=>{
const conversation : Conversation = {

    id:generateId(),
    messages:[],
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
}

const mockAi = new  MockAIProvider()

const manager = new ConversationManager(mockAi,conversation)

const result = await manager.sendMessage('Hi')

console.warn('first response froim domain :',result)
}


useEffect(()=>{
 testLocalModel()
},[])