import { Memory } from "../memory/Memory";
import { AIMessage } from "./AIMessage";

export class ContextBuilder {

    buildContext(memories:Memory[]):AIMessage{
const mappedMessages = memories.map((memory)=>(
 `${memory.category}: ${memory.key}  = ${memory.value}`      
        ))
        console.log(mappedMessages,'mappedMessages')
   const ContextMessages:AIMessage  =    
    {role: "system",
        content:mappedMessages.join("\n")
        }
        console.log(ContextMessages.content,'ContextMessages')
        return ContextMessages
    }   
}