import { generateId } from "../../utils/generateId";
import { LocalLLMService } from "../Services/LocalLLMService";
import { Memory } from "./Memory";

export class MemoryExtractor {

    private llm = new LocalLLMService();

    private readonly systemPrompt = `
You are a memory extraction system for an AI companion.

Analyze the user's message and determine whether it contains information that should be remembered for future conversations.

Remember only information that provides useful long-term context, such as:

- The user's identity
- Relationships between people
- Important information about a person
- Stable preferences
- Important facts
- Important ongoing projects

Do NOT remember:

- Greetings
- Questions
- Normal conversation
- Temporary activities
- Requests for information
- Casual statements
- Information that is not useful in future conversations

If the message contains useful memory, return ONLY valid JSON:

{
  "isMemory": true,
  "category": "IDENTITY | RELATIONSHIP | PERSON | PREFERENCE | FACT",
  "key": "short descriptive key",
  "value": "information to remember"
}

If the message should not be remembered, return ONLY:

{
  "isMemory": false
}

Do not explain your answer.
Do not use markdown.
Do not add any text outside the JSON.
`;

    async extractMemory(message: string): Promise<Memory | null> {

        if (!message.trim()) {
            return null;
        }

        try {

            const context = await this.llm.initialize();

            const result = await context.completion({
                messages: [
                    {
                        role: "system",
                        content: this.systemPrompt
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                n_predict: 100,
                temperature: 0.1,
                enable_thinking: false,
            });

            const rawResponse = result.text?.trim();

            if (!rawResponse) {
                return null;
            }

            console.log(
                "[MemoryExtractor] Qwen response:",
                rawResponse
            );

            const parsed = JSON.parse(rawResponse);

            if (parsed.isMemory !== true) {
                return null;
            }

            if (
                !parsed.category ||
                !parsed.key ||
                !parsed.value
            ) {
                console.warn(
                    "[MemoryExtractor] Invalid memory structure:",
                    parsed
                );

                return null;
            }

            const memory: Memory = {
                id: generateId(),
                category: parsed.category,
                key: parsed.key,
                value: parsed.value,
                createdAt: generateId(),
                updatedAt: generateId(),
            };

            return memory;

        } catch (error) {

            console.error(
                "[MemoryExtractor] Memory extraction failed:",
                error
            );

            return null;
        }
    }
}