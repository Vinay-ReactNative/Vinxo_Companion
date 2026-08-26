
// old generatecontent 
// import { AIProvider } from "./AIProvider";
// import { geminikey } from "../../utils/generateId";
// import { Conversation } from "../models/Conversation";

// export class GeminiAIProvider implements AIProvider {
//   async generateResponse(conversation: Conversation): Promise<string> {
//     console.log("🔥 4 GEMINI PROVIDER REACHED");
//     const lastMessage = conversation.messages[conversation.messages.length - 1];

//     if (!lastMessage?.content) {
//       throw new Error("No content in last message");
//     }

//     // Standard Gemini 2.5 Flash Endpoint
//     const MODEL = "gemini-2.5-flash";
//     const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

//     console.log("🔥 6 ABOUT TO CALL FETCH");

//     try {
//       const response = await fetch(URL, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "x-goog-api-key": geminikey,
//         },
//         body: JSON.stringify({
//           contents: [
//             {
//               parts: [
//                 {
//                   text: lastMessage.content,
//                 },
//               ],
//             },
//           ],
//         }),
//       });

//       console.log("🔥 7 FETCH RETURNED STATUS:", response.status);

//       const data = await response.json();
//       console.log("🔥 8 GEMINI DATA:", data);

//       if (!response.ok) {
//         console.log("❌ GEMINI ERROR:", data);
//         throw new Error(data?.error?.message ?? "Gemini request failed");
//       }

//       // Extract generated text from candidates array
//       const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
//       return textResponse ?? "Vinxo had no response.";
//     } catch (error) {
//       console.error("💥 GEMINI FETCH FAILED:", error);
//       throw error;
//     }
//   }
// }

//interaction api 


import { AIProvider } from "./AIProvider";
import { geminikey } from "../../utils/generateId";
import { Conversation } from "../models/Conversation";

const createUserInput = (text:string)=>{
    return {
    type: "user_input",
    content: [
        {
            type: "text",
            text,
        },
    ],
}
}

const newusermessage = createUserInput('hi, i am Vinay')
console.log("newusermessage:",newusermessage)

export class GeminiAIProvider implements AIProvider {
  async generateResponse(conversation: Conversation): Promise<string> {
    console.log("🔥 4 GEMINI PROVIDER REACHED");
    const lastMessage = conversation.messages[conversation.messages.length - 1];

    if (!lastMessage?.content) {
      throw new Error("No content in last message");
    }

const previousMessages =
    conversation.messages.slice(0, -1);

console.log("🔥 PREVIOUS MESSAGES:", previousMessages);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 15-second timeout safeguard


const history = previousMessages.map(message => {
console.log(
        "🔥 MAPPING:",
        message.sender,
        "|",
        JSON.stringify(message.content)
    );
    if (message.sender === "USER") {
        return createUserInput(message.content);
    }

    if (message.sender === "AI" && message.content === '') {
               console.log("🔥 AI MESSAGE FOUND:", message.content);
        return {
            type: "model_output",
            content: [
                {
                    type: "text",
                    text: message.content,
                },
            ],
        };
    }

    return null;
});
// const cleanHistory = history.filter(Boolean);

// console.log(
//     "🔥 CLEAN GEMINI HISTORY:",
//     JSON.stringify(cleanHistory, null, 2)
// );

// return ''
    try {
      console.log("🔥 6 CALLING INTERACTIONS API...");


      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminikey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "gemini-3.7-flash", // Use active stable flash model
          input: lastMessage.content,
          store: false, // Disables server-side session saving for stateless PoC
          system_instruction: `
You are VINXO, a personal AI companion.

You are inspired by the excellence of JARVIS:
highly intelligent, composed, precise, technically capable,
observant, resourceful, witty when appropriate, and proactive
when doing so is genuinely useful.

However, you are VINXO, not JARVIS.
You have your own identity, personality, and relationship with the user.
The JARVIS inspiration should influence your quality, composure,
technical excellence, and helpfulness, not cause you to imitate
JARVIS or constantly reference Tony Stark.

You are friendly, natural, helpful and context-aware.
You should maintain continuity across the conversation and use
previous messages when they are relevant to the current request.

Do not unnecessarily repeat information the user has already provided.
If the user asks something that depends on previous conversation,
use the available conversation history to understand what they mean.

Adapt your tone naturally to the user's situation.
Be concise for simple requests and provide more detail when needed.

Be proactive when there is a clear opportunity to help, but do not
be unnecessarily intrusive, interruptive, or over-eager.

Think carefully about the user's intent before responding.
When a request is ambiguous, use the available context to resolve it
when possible instead of unnecessarily asking the user to repeat
information.

Do not pretend to remember information that is not present in the
conversation or otherwise available to you.

Do not claim to have performed actions, accessed information,
or remembered something when you have not.

You are VINXO: a capable personal AI companion designed to help
the user think, learn, create, build, and explore ideas.

Your goal is not merely to answer commands, but to understand the
conversation and be genuinely useful within the user's current context.
`,
        }),
      });

      clearTimeout(timeoutId);

      console.log("🔥 7 FETCH RETURNED STATUS:", response.status);

      const data = await response.json();
      console.log("🔥 8 GEMINI DATA:", data);

      if (!response.ok) {
        console.log("❌ GEMINI ERROR:", data);
        throw new Error(data?.error?.message ?? `Request failed with status ${response.status}`);
      }
console.log(data.steps[1].content[0].text,'ai message')
      // Interactions API outputs text directly on `output_text`
      return data.steps[1].content[0].text ?? "Vinxo systems active, but no response generated.";
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.error("💥 FETCH TIMED OUT");
        // throw new Error("Vinxo request timed out. Check connection.");
      }
      console.error("💥 GEMINI FETCH FAILED:", error);
    //   throw error;
    }
  }
}

