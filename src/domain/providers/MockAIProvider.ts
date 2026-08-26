import { Conversation } from "../models/Conversation";
import { AIProvider } from "./AIProvider";

export class MockAIProvider implements AIProvider{
   async generateResponse(conversation: Conversation): Promise<string> {
     const lastMessage =  conversation.messages[conversation.messages.length - 1 ] 
     console.log(lastMessage.content,"content")
     const previousmessages = conversation.messages.slice(0,-1)
     const filtereddata = previousmessages.filter(messages=>messages.sender === 'USER')
     console.log(filtereddata,'data') 
     const filteredDataContent = filtereddata?.map(message=>message.content)
     console.log(filteredDataContent,'filteredDataContent')
const findData = filteredDataContent.find(message=>message.includes('i am'))

     if(lastMessage.content === 'hi'){
        return 'Hello captain'
     } else if (lastMessage.content === 'Hi i am tony'){
        return 'Hello tony, nice to meet you '
     }
     else if (lastMessage.content === 'who am i?'){
const spliData = findData?.split('Hi i am')[1]
return spliData?.trim() ?? ''

     } else {
     return 'i dont know captain'
     }
    }
}

