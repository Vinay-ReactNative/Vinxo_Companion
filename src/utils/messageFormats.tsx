

//creating userMessage
export const createuserMessage = (text:string)=>{
            return {
                role:"user" as const ,
                content:text,
            }
        }
//creating Assistantmessage
export const createAssistantMessage = (text:string)=>{
            return {
                role:"assistant" as const ,
                content:text
            }
        }