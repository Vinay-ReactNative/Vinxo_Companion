# VINXO --- Architecture & Development Decisions

> VINXO is a personal AI companion inspired by fictional assistants such
> as JARVIS/KAREN, but designed as a practical real smartphone product.
> This document records the architecture, decisions, experiments, and
> future requirements established during the first VINXO development
> sessions.

## 1. Core Vision

VINXO is not just an AI chat UI. The long-term vision is a personal AI
companion that can:

-   Maintain meaningful conversations and context.
-   Support user-controlled long-term memory.
-   Use online AI when connectivity is available.
-   Eventually provide useful offline/local AI capabilities.
-   Support text and voice interaction.
-   Eventually support wake-word activation.
-   Eventually support user-triggered observation/idea capture.
-   Keep AI-provider details isolated from VINXO's domain.
-   Treat privacy, security, authorization, battery efficiency, and
    Android lifecycle constraints as first-class concerns.

Core principle:

> **VINXO owns its identity, conversation, memory, permissions, and
> application architecture. AI providers are interchangeable
> intelligence sources.**

------------------------------------------------------------------------

## 2. Core Architecture

``` text
UI
 |
 v
ConversationManager
 |
 v
AIProvider
 |
 +--------------------+
 |                    |
 v                    v
MockAIProvider   RealAIProvider
                      |
                      v
                Gemini / other AI
```

The UI should not contain AI-processing logic.

ConversationManager should not know whether the AI is Gemini, Groq,
OpenAI, a local model, or another future provider.

VINXO domain models should not be shaped around a specific provider.

------------------------------------------------------------------------

## 3. VINXO Domain Models

### Conversation

Conceptually:

``` text
Conversation
├── id
├── messages[]
├── createdAt
└── updatedAt
```

The Conversation is VINXO's application-level source of truth.

### Message

Conceptually:

``` text
Message
├── id
├── content
├── sender
└── timestamp
```

The current sender model distinguishes USER and AI messages.

Provider-specific fields should not be added to VINXO's Message merely
because an external API requires them.

------------------------------------------------------------------------

## 4. UI Responsibility

The UI should:

1.  Collect user input.
2.  Ask ConversationManager to process it.
3.  Receive the resulting Conversation.
4.  Store the UI representation in React state.
5.  Render the conversation.

The UI should not:

-   Build Gemini requests.
-   Parse Gemini responses.
-   Own AI-provider logic.
-   Decide how external AI history is represented.
-   Become the conversation-processing engine.

Conceptually:

``` text
User
 |
 v
UI
 |
 | sendMessage()
 v
ConversationManager
 |
 | Conversation
 v
AIProvider
```

Then:

``` text
AI response
 |
 v
ConversationManager
 |
 v
Conversation
 |
 v
UI state
 |
 v
Rendered messages
```

------------------------------------------------------------------------

## 5. ConversationManager

ConversationManager owns the conversation workflow.

Current `sendMessage()` flow:

``` text
User text
   |
   v
Create USER Message
   |
   v
Add USER Message to Conversation
   |
   v
Send Conversation to AIProvider
   |
   v
Receive AI response string
   |
   v
Create AI Message
   |
   v
Add AI Message to Conversation
   |
   v
Return Conversation
```

The provider contract is:

``` text
Conversation
    ↓
AIProvider
    ↓
Promise<string>
```

ConversationManager converts that returned string into VINXO's own AI
Message.

------------------------------------------------------------------------

## 6. Persistent ConversationManager with `useRef`

A new ConversationManager must not be created for every Send action.

Bad:

``` text
Send 1 → Manager 1
Send 2 → Manager 2
Send 3 → Manager 3
```

That would lose conversational context.

Chosen approach:

``` ts
const managerRef = useRef<ConversationManager | null>(null)
```

Conceptually:

``` text
managerRef.current === null
        |
        v
create manager
        |
        v
managerRef.current = manager
```

Later sends reuse the same manager.

`useRef` is appropriate because the manager reference needs to persist
across React renders without the manager reference itself being
UI-rendering state.

Important distinction:

-   `useState` is state intended to participate in rendering.
-   `useRef` is useful for a persistent mutable reference such as the
    ConversationManager instance.

------------------------------------------------------------------------

## 7. Separate UI Conversation and Domain Conversation

VINXO intentionally maintains separate representations:

``` text
ConversationManager
    |
    v
Domain Conversation
```

and:

``` text
React State
    |
    v
UI Conversation
```

The UI receives the manager result and updates its own state:

``` ts
const result = await managerRef.current.sendMessage(userText)
setConversation(result)
```

Why:

-   Manager owns conversation processing.
-   React state owns what the UI renders.
-   UI does not directly mutate the manager's internal conversation.
-   UI can react to returned conversation changes through React state.

The UI may read `sender` to render USER and AI messages differently, but
it does not own the conversation rules.

------------------------------------------------------------------------

## 8. Immutable Conversation Updates

The first implementation used mutation:

``` ts
this.conversation.messages.push(userMessage)
```

The architecture was then changed to create new conversation and
messages-array references.

The shared helper became conceptually:

``` ts
private updatedConversation(newMessage: Message) {
    return {
        id: this.conversation.id,
        messages: [...this.conversation.messages, newMessage],
        createdAt: this.conversation.createdAt,
        updatedAt: new Date().toISOString()
    }
}
```

Both USER and AI messages use the same update pattern.

Why:

``` text
OLD conversation
      |
      v
NEW conversation
      |
      +---- new messages array
            [old messages + new message]
```

This avoids mutating the existing conversation and gives clearer
immutable state transitions.

`createdAt` remains unchanged because the conversation was already
created. `updatedAt` changes whenever a new message is added.

------------------------------------------------------------------------

## 9. AIProvider Abstraction

The architecture introduced:

``` text
AIProvider
    |
    +-- MockAIProvider
    |
    +-- RealAIProvider
    |
    +-- future providers
```

ConversationManager depends on the interface, not a concrete AI service.

Therefore:

``` text
ConversationManager
       |
       v
AIProvider
       |
       +---- Gemini
       +---- Groq
       +---- OpenAI
       +---- OpenRouter
       +---- Local AI
       +---- future provider
```

A provider can be replaced without redesigning ConversationManager.

------------------------------------------------------------------------

## 10. MockAIProvider

MockAIProvider was created to prove the architecture before introducing
a real AI.

Initial behavior was deliberately hardcoded, for example:

``` text
"hi"
  ↓
"Hello captain"
```

The purpose was to prove:

``` text
UI
 ↓
ConversationManager
 ↓
AIProvider
 ↓
MockAIProvider
 ↓
string
 ↓
ConversationManager
 ↓
Conversation
 ↓
UI
```

It was later extended to inspect conversation history.

------------------------------------------------------------------------

## 11. History Preservation Experiment

The mock provider eventually demonstrated that it receives the existing
conversation context.

The test reached:

``` text
USER: Hi
AI: Hello Captain

USER: Hi i am Tony
AI: Hello Tony, nice to meet you

USER: who am i?
AI: Tony
```

This proved:

1.  The same ConversationManager instance was reused.
2.  Conversation history was preserved.
3.  The provider received previous messages.
4.  The provider could inspect previous messages.
5.  A response could be derived from historical information.

The experiment used operations including:

``` ts
slice()
slice(0, -1)
filter()
map()
find()
includes()
split()
```

The important architectural lesson was:

> **The AI provider receives the conversation context supplied by
> ConversationManager.**

The hardcoded extraction was only a learning experiment, not the
intended final memory system.

------------------------------------------------------------------------

## 12. Current Message vs Previous History

To distinguish the current question from previous conversation:

``` ts
const lastMessage =
    conversation.messages[conversation.messages.length - 1]
```

gets the current message.

Previous messages:

``` ts
const previousMessages =
    conversation.messages.slice(0, -1)
```

give everything before the current message.

Conceptually:

``` text
Conversation messages:

[ previous 1 ]
[ previous 2 ]
[ previous 3 ]
[ CURRENT ]
```

After `slice(0, -1)`:

``` text
[ previous 1 ]
[ previous 2 ]
[ previous 3 ]
```

This distinction became important for the stateless Gemini request.

------------------------------------------------------------------------

# 13. Real AI Provider --- First Provider

Gemini was selected as the first real AI provider for the PoC.

A Google AI Studio project was created and a Gemini API key was created.

The key is kept private and must never be committed to the repository.

The architecture is:

``` text
ConversationManager
        |
        v
AIProvider
        |
        v
RealAIProvider
        |
        v
Gemini
```

The model name remains provider configuration rather than part of the
VINXO domain.

------------------------------------------------------------------------

## 14. Why Gemini

The PoC requirements were:

-   Free/low-cost development access.
-   Suitable conversational text capability.
-   Good context handling.
-   Practical API access.
-   Useful daily experimentation.

Gemini was selected as the first real provider.

This is not a permanent commitment.

Future providers may include:

``` text
Gemini
Groq
OpenAI
OpenRouter
Local models
Future providers
```

The provider abstraction remains the stable boundary.

------------------------------------------------------------------------

## 15. Gemini Interactions API --- Stateless Decision

After reviewing Google's current documentation, the initial
real-provider implementation was designed around the **Gemini
Interactions API in stateless mode**.

Why stateless?

VINXO already owns its conversation:

``` text
VINXO
  |
  v
ConversationManager
  |
  v
Conversation
  |
  v
messages[]
```

Stateful external AI would create two state stores:

``` text
VINXO conversation state
+
Gemini conversation state
```

That can introduce synchronization and ownership complexity.

Stateless is therefore preferred for the first VINXO implementation:

``` text
VINXO owns history
        |
        v
send required history to Gemini
        |
        v
Gemini generates response
        |
        v
VINXO stores response
```

Stateful Gemini is not considered bad or unusable. It may be useful for
experiments or future provider-specific optimizations. It is simply not
the first architecture choice for VINXO.

------------------------------------------------------------------------

## 16. Why `generateContent` Was Not Chosen First

Gemini's `generateContent` API remains useful and supported.

However, after reviewing the newer Interactions API, Interactions was
considered a better conceptual fit for a new VINXO implementation.

Decision:

``` text
Gemini Interactions API
+
Stateless conversation
```

rather than beginning with:

``` text
generateContent
```

This is an implementation choice, not a claim that `generateContent` is
unusable.

------------------------------------------------------------------------

## 17. Provider Boundary

VINXO's `Conversation` must not be sent directly as if Gemini
understands VINXO's custom domain model.

Instead:

``` text
VINXO Conversation
       |
       v
RealAIProvider
       |
       v
provider-specific mapping
       |
       v
Gemini Interaction request
```

VINXO owns fields such as:

``` text
id
sender
content
timestamp
```

Gemini has its own request schema.

`RealAIProvider` performs the translation.

This prevents external API structures from contaminating the domain.

------------------------------------------------------------------------

## 18. Current Input and History for Stateless Gemini

The stateless design conceptually separates:

``` text
conversation.messages
        |
        +--------------------------+
        |                          |
        v                          v
previous messages             last message
        |                          |
        v                          v
Gemini history               current input
```

Current message:

``` ts
const lastMessage =
    conversation.messages[conversation.messages.length - 1]

const userInput = lastMessage.content
```

Previous messages:

``` ts
const previousMessages =
    conversation.messages.slice(0, -1)
```

Then:

``` text
previousMessages
       |
       v
map()
       |
       v
Gemini history objects
```

The exact history object shape must follow the current official Gemini
documentation. We should not guess provider-specific fields.

------------------------------------------------------------------------

## 19. Gemini Response Boundary

Gemini returns a structured interaction object.

VINXO does not want that external structure in the domain.

The provider extracts generated text:

``` text
Gemini interaction
       |
       v
interaction.output_text
       |
       v
string
```

Then:

``` text
string
   |
   v
ConversationManager
   |
   v
AI Message
   |
   v
Conversation
```

This matches the VINXO interface:

``` ts
generateResponse(conversation: Conversation): Promise<string>
```

Therefore Gemini-specific response parsing stays inside
`RealAIProvider`.

------------------------------------------------------------------------

# 20. What We Avoided and Why

## New ConversationManager on every send

Avoided because it destroys conversational context.

Chosen: one manager instance through `useRef`.

## AI logic inside UI

Avoided because UI should remain presentation/input logic.

Chosen:

``` text
UI → ConversationManager → AIProvider
```

## Gemini code inside ConversationManager

Avoided because it would lock the domain to Gemini.

Chosen:

``` text
ConversationManager → AIProvider → provider implementation
```

## Sending VINXO domain objects directly to Gemini

Avoided because external APIs have their own schemas.

Chosen: provider-specific mapping inside RealAIProvider.

## Mutating the existing conversation

Avoided as the primary update approach.

Chosen:

``` ts
messages: [...this.conversation.messages, newMessage]
```

and a new Conversation object.

## Making Gemini server-side state the VINXO source of truth

Avoided for the first implementation because VINXO already owns its
conversation.

Chosen: stateless Gemini interaction.

## Hardcoding one AI provider forever

Avoided because AI providers/models can change.

Chosen: AIProvider abstraction.

## Hardcoding the API key in source

Avoided because mobile application secrets can potentially be extracted.

Chosen: keep the key private and treat production secret handling as a
separate security architecture concern.

## Building offline AI immediately

Avoided for the current milestone because it would distract from the
first real-provider integration.

Chosen: keep the provider boundary flexible so local AI can be added
later.

## Automatically storing all observed information as memory

Avoided because observation is not the same as permanent memory.

Chosen:

``` text
Observation
→ Temporary Context
→ User Review
→ User Confirmation
→ Permanent Memory
```

------------------------------------------------------------------------

# 21. Online + Offline VINXO

A core future requirement is that VINXO should work both online and
offline.

Long-term concept:

``` text
                    VINXO
                      |
                  AIProvider
                  /                        /                    Online           Offline
              |                |
           Gemini          Local AI
              |                |
        broader/current     local/device
          knowledge          capability
```

VINXO's conversation model stays the same.

The intelligence source changes according to connectivity and
capability.

Offline operation will not automatically have the same knowledge
breadth, freshness, or capability as a cloud model, but the architecture
must leave the door open for local intelligence.

------------------------------------------------------------------------

# 22. Future Requirement --- Always-Available Conversation Model

VINXO should eventually provide a practical JARVIS/KAREN-like smartphone
experience without continuously processing everything the microphone
hears.

Target behavior:

``` text
LOW-POWER WAKE-WORD STANDBY
        |
        | "Hey VINXO"
        v
ACTIVE CONVERSATION
        |
        | natural conversation
        | no repeated wake word
        v
SLEEP COMMAND
        OR
~1 MINUTE INACTIVITY
        |
        v
LOW-POWER WAKE-WORD STANDBY
```

When idle:

-   Do not continuously send ambient audio to cloud AI.
-   Use low-power local wake-word detection where practical.
-   Wait locally for the wake phrase.

When active:

-   Natural conversation is allowed.
-   The wake word does not need to be repeated for every query.

Future target:

-   Work while screen is locked.
-   Work while VINXO UI is not visible.
-   Use Android native background capabilities where permitted.

First-class concerns:

-   Battery efficiency.
-   Privacy.
-   Android lifecycle restrictions.
-   Background execution limitations.
-   Wake-word detection.
-   Speech recognition.
-   Conversation state.
-   TTS.
-   Locked-screen behavior.
-   Re-entry if Android terminates/restricts background work.

This is a future capability and should be developed incrementally.

------------------------------------------------------------------------

# 23. Future Requirement --- Observation / Idea Capture Mode

VINXO should eventually support a user-triggered Observation / Idea
Capture Mode for spontaneous real-world conversations.

Example:

``` text
User:
"Hey VINXO, listen only."
```

VINXO enters Observation Mode.

During this mode:

-   VINXO remains silent.
-   It listens and understands the conversation.
-   It identifies useful ideas, concepts, decisions, or project-related
    information.
-   It does not interrupt the conversation.

Later:

``` text
User:
"VINXO, what did you capture?"
```

VINXO provides a concise summary of useful observations.

------------------------------------------------------------------------

## Memory Flow

Observation must NOT automatically become permanent memory.

Preferred flow:

``` text
Observation
    ↓
Temporary Context
    ↓
User Review
    ↓
User Confirmation
    ↓
Permanent Memory
```

Example:

``` text
User:
"VINXO, save that idea."
```

Only then should the selected idea enter long-term memory/project
context.

------------------------------------------------------------------------

# 24. Observation Security

Observation Mode must be:

-   Explicitly user-triggered.
-   Clearly indicated as active.
-   Not silently running.
-   Not a permanent background recorder.

Because other people's voices may be captured, implementation must
respect applicable:

-   Privacy requirements.
-   Recording requirements.
-   Consent requirements.
-   Platform policies.
-   Local laws and regulations.

Observation Mode must be isolated from command execution.

Being in Observation Mode does not automatically grant permission to
execute commands or access private information.

------------------------------------------------------------------------

# 25. VINXO Permission and State Separation

Future architecture deliberately distinguishes:

``` text
Wake
  ↓
Identity
  ↓
Authorization
  ↓
Observation
  ↓
Memory
  ↓
Execution
```

### Wake

Someone is trying to get VINXO's attention.

### Identity

Determine who is speaking where required.

### Authorization

Determine what the speaker is allowed to access or command.

### Observation

VINXO listens silently for context.

### Memory

Determine what information may be retained.

### Execution

Determine what actions VINXO is actually permitted to perform.

Waking VINXO must not automatically mean the speaker can access
everything or execute everything.

------------------------------------------------------------------------

# 26. Long-Term Memory Philosophy

VINXO should eventually behave like a controlled second brain.

The architecture should distinguish:

``` text
Conversation
Temporary Context
Memory
Project Memory
Notes
```

Information should not automatically become permanent memory merely
because VINXO saw it.

The user remains in control of what becomes durable.

This is especially important for:

-   Observation Mode.
-   Personal conversations.
-   Project ideas.
-   Private information.
-   Future autonomous capabilities.

------------------------------------------------------------------------

# 27. Provider Independence

Potential future providers:

``` text
AIProvider
    |
    +-- GeminiAIProvider
    |
    +-- GroqAIProvider
    |
    +-- OpenAIProvider
    |
    +-- OpenRouterProvider
    |
    +-- LocalAIProvider
    |
    +-- Future provider
```

ConversationManager should continue to depend only on `AIProvider`.

------------------------------------------------------------------------

# 28. The Water Analogy

VINXO follows the idea:

> **Water takes the shape of whatever container it is placed in.**

For VINXO:

``` text
VINXO Conversation = water
```

Providers are containers:

``` text
Gemini → Gemini-shaped container
Groq → Groq-shaped container
OpenAI → OpenAI-shaped container
Local model → Local-model-shaped container
```

The water remains VINXO's.

The provider changes.

This represents the provider abstraction.

------------------------------------------------------------------------

# 29. Current Development Status

### Completed

-   Basic VINXO UI prototype.
-   Conversation domain model.
-   Message model.
-   ConversationManager.
-   Persistent ConversationManager through `useRef`.
-   Separate UI conversation state.
-   Immutable conversation update approach.
-   AIProvider interface.
-   MockAIProvider.
-   History preservation test.
-   Current-message vs previous-history understanding.
-   Gemini selected as first real provider for PoC.
-   Google AI Studio project created.
-   Gemini API key created and kept private.
-   Gemini Interactions API researched.
-   Stateless interaction selected.
-   RealAIProvider designed conceptually.

### Current task

Implement:

``` text
RealAIProvider
    ↓
Gemini Interactions API
    ↓
stateless history
    ↓
Gemini response
    ↓
Promise<string>
```

Next concrete step:

``` text
conversation.messages
        ↓
slice(0, -1)
        ↓
previous messages
        ↓
map()
        ↓
Gemini history objects
```

Then:

``` text
last message
        ↓
current input
```

Then the actual Gemini Interaction request.

------------------------------------------------------------------------

# 30. RealAIProvider Contract

Intended contract:

``` ts
generateResponse(
    conversation: Conversation
): Promise<string>
```

Inside RealAIProvider:

``` text
1. Receive Conversation.
2. Identify current message.
3. Separate previous messages.
4. Convert VINXO messages into Gemini's documented request format.
5. Create a stateless Gemini Interaction.
6. Wait for Gemini.
7. Extract generated text.
8. Return string.
```

Then ConversationManager continues:

``` text
string
  ↓
create AI Message
  ↓
update Conversation
  ↓
return Conversation
```

No ConversationManager redesign should be required simply because Gemini
is introduced.

------------------------------------------------------------------------

# 31. Development Philosophy

VINXO is being developed incrementally:

``` text
Understand
   ↓
Reason
   ↓
Design
   ↓
Implement
   ↓
Test
   ↓
Refine
```

External documentation determines external API contracts.

VINXO architecture determines VINXO domain contracts.

The boundary between them must remain explicit.

Do not blindly copy SDK examples.

Do not redesign the domain around a provider.

Do not rush future features into the current milestone.

------------------------------------------------------------------------

# 32. Architecture Rules to Preserve

Unless deliberately changed through an architecture review:

1.  ConversationManager owns conversation workflow.
2.  UI owns UI rendering/state.
3.  Conversation is a VINXO domain model.
4.  Message is a VINXO domain model.
5.  AIProvider is the abstraction boundary.
6.  Providers can change without redesigning ConversationManager.
7.  External AI response structures stay inside provider
    implementations.
8.  The domain receives provider output through `Promise<string>`.
9.  VINXO owns application-level conversation state.
10. Stateless AI interaction is preferred for the current Gemini PoC.
11. Conversation updates prefer immutable object/array replacement.
12. Secrets must not be committed to source control.
13. Offline/local AI must remain possible in the future.
14. Voice, wake word, observation, memory, authorization, and execution
    remain separate concerns.
15. Observation does not automatically become permanent memory.
16. User confirmation controls durable memory creation.
17. Privacy and security are architecture concerns, not post-feature
    patches.

------------------------------------------------------------------------

# 33. Future High-Level Roadmap

The exact order can evolve, but the conceptual direction is:

``` text
VINXO Core
    ↓
Conversation Engine
    ↓
Real AI Provider
    ↓
Memory
    ↓
Notes / Project Memory
    ↓
Push-to-Talk Voice
    ↓
TTS
    ↓
Wake Word
    ↓
Always-Available Conversation
    ↓
Local / Offline AI
    ↓
Observation / Idea Capture
    ↓
Identity + Authorization
    ↓
Advanced autonomous capabilities
```

Future features should extend the appropriate layer rather than turning
the UI or ConversationManager into a giant central controller.

------------------------------------------------------------------------

# 34. Core Vision Statement

VINXO is intended to become:

> **A practical personal AI companion that owns its own conversation,
> memory, identity, permissions, and context while being able to use
> different AI brains depending on availability and capability.**

Long-term:

``` text
Online
→ broader/current intelligence

Offline
→ local intelligence

Conversation
→ continuous context

Memory
→ user-controlled permanence

Observation
→ temporary understanding before user-approved retention

Execution
→ authorization-controlled actions
```

VINXO should not merely imitate a fictional assistant.

It should take the inspiration and turn it into a real, privacy-aware,
architecture-first product.

------------------------------------------------------------------------

# 35. Final Architecture Snapshot

``` text
                         VINXO
                           |
                           v
                          UI
                           |
                           v
                  ConversationManager
                           |
                           v
                      AIProvider
                           |
              +------------+-------------+
              |            |             |
              v            v             v
        Gemini Provider  Groq/...     Local AI
              |
              v
       Gemini Interactions
          Stateless
              |
              v
       Provider Response
              |
              v
        Promise<string>
              |
              v
     ConversationManager
              |
              v
        AI Message
              |
              v
        Conversation
              |
              v
         UI State
              |
              v
          VINXO UI
```

Future audio/permission layer:

``` text
Wake
  ↓
Identity
  ↓
Authorization
  ↓
Conversation / Observation
  ↓
Memory
  ↓
Execution
```

------------------------------------------------------------------------

# VINXO Principle

> **The AI provider is replaceable.\
> The conversation is ours.\
> The memory is ours.\
> The permissions are ours.\
> The architecture belongs to VINXO.**

**Current workshop checkpoint: RealAIProvider --- next step is mapping
VINXO conversation history into the documented Gemini stateless
Interaction format.**




12 september 2026 12:39AM 
VINXO — Local LLM Evaluation & Regression Report

Purpose: Historical record of local LLM experiments performed for VINXO's target mobile hardware.

Target device: Motorola Edge 50 Fusion
SoC: Qualcomm SM7435
RAM: 8 GB
CPU capability observed: ARM NEON, FMA, DOTPROD; no i8mm
GPU: Adreno 710
Runtime: llama.rn 0.13.0-rc.1
React Native: 0.86.2
Architecture: New Architecture + Hermes

1. Why multiple models are being evaluated

VINXO is not simply looking for a model that can generate text.

The local model must satisfy all of these requirements simultaneously:

Run locally on the target phone.
Provide sufficiently fast responses for natural conversation.
Maintain useful conversational context.
Work reliably with VINXO's memory/context architecture.
Avoid excessive RAM pressure.
Remain stable during extended conversations.
Support VINXO's intended conversational experience.
Work within the native acceleration capabilities actually available on the target device.

Therefore, a model that performs well on paper or on a desktop is not automatically suitable for VINXO.

The evaluation is therefore device-specific rather than model-size-specific.

2. Model Evaluation #1 — Qwen2.5 1.5B
Model

Qwen2.5-1.5B-Instruct

Result

Rejected for VINXO's current requirements.

What worked

The model demonstrated a major advantage:

Very fast response generation.

During testing, responses were generally arriving within approximately 2–3 seconds, making the model feel much closer to the desired conversational interaction.

This established an important performance reference point for VINXO.

What did not work

The major problem was conversation/context reliability.

The model was fast, but its ability to maintain and correctly utilize conversational context was not sufficient for VINXO's intended companion behavior.

This became especially important because VINXO isn't intended to behave like a simple one-shot chatbot.

VINXO needs to maintain things such as:

Who is the user?
What did we discuss?
What information was previously established?
What does a previous message refer to?
What is the current conversation context?

The 1.5B Qwen2.5 model did not provide the desired balance.

Evaluation conclusion
Speed        ██████████  Excellent
Context      ██████░░░░  Insufficient
Companion    ██████░░░░  Insufficient
VINXO fit    ██████░░░░  Rejected
Important historical finding

This experiment established that:

Fast generation alone is not sufficient for VINXO.

A model can respond in 2–3 seconds and still fail the project's core conversational requirements.

3. Model Evaluation #2 — Qwen3 4B
Model

Qwen3-4B-Q4_K_M

Model size:

~2.49 GB GGUF

Configuration tested:

n_ctx            = 2048
n_threads        = 4
n_gpu_layers     = 0
cache_type_k     = q8_0
cache_type_v     = q8_0
enable_thinking  = false
4. Initial Qwen3-4B integration

Unlike the Qwen2.5 experiment, Qwen3-4B was selected specifically to investigate whether a newer Qwen generation could provide stronger conversational/context behavior while remaining practical on the phone.

The model was successfully integrated into VINXO's local inference pipeline.

The model was then subjected to repeated conversational testing.

5. Regression / stability testing

The Qwen3-4B model was tested through approximately 16 messages covering multiple categories.

Testing included:

Simple questions
Medium-complexity questions
Complex questions
Team/friend introductions
Einstein-related questions
Gravity/science questions
Multi-turn conversation
Longer context accumulation

The important result was that after a clean rebuild and repeated testing:

The model remained stable without the earlier crash being reproduced.

However, eventually the configured context limit was reached and the runtime returned:

Error: Context is full

This was treated as a context-capacity limitation, rather than evidence that the model itself was unstable.

6. Qwen3-4B performance investigation

Because the model was stable enough for continued testing, the next phase was controlled performance experimentation.

The goal was:

Change one variable → benchmark → compare → keep/reject.

This prevented us from making multiple changes simultaneously and losing the ability to determine what actually helped.

Experiment A — Baseline

Configuration:

Qwen3-4B-Q4_K_M
KV cache      = default/F16
Threads       = 4
GPU layers    = 0

Benchmark:

context.bench(512, 128, 1, 3)

Result:

Metric	Result
Prompt processing	25.8035 tok/s
Token generation	4.6450 tok/s
Threads	4
GPU layers	0
Flash Attention field	-1 / AUTO

This became the Qwen3-4B control result.

7. Experiment B — Q8 KV Cache

Only the KV-cache configuration was changed:

cache_type_k = 'q8_0'
cache_type_v = 'q8_0'

Result:

Metric	Baseline	Q8 KV
Prompt processing	25.8035	22.7586
Token generation	4.6450	5.1620

Change:

Prompt processing:
25.8035 → 22.7586
≈ -11.8%

Token generation:
4.6450 → 5.1620
≈ +11.1%

A real completion also produced approximately:

prompt_per_second     = 24.758750
predicted_per_second  = 5.461526
Decision

KEEP Q8 KV.

Although prompt processing became slower, token generation—the more important metric for interactive response delivery—improved.

This became the current Qwen3-4B configuration.

8. Experiment C — Increase CPU threads from 4 → 6

Only the thread count was changed:

n_threads = 6

Q8 KV remained enabled.

Result:

Metric	Q8 + 4 threads	Q8 + 6 threads
Prompt processing	22.7586	18.7281
Token generation	5.1620	4.4442

Change:

Prompt processing:
≈ -17.7%

Token generation:
≈ -13.9%
Decision

REJECT 6 threads.

The target device performs better with the tested 4-thread configuration.

This was an important result because it demonstrated that:

More CPU threads ≠ faster inference on this hardware.

9. Current best Qwen3-4B configuration

After the controlled experiments:

Model:
Qwen3-4B-Q4_K_M

Context:
2048

Threads:
4

GPU:
0 layers

KV cache:
Q8_0 / Q8_0

Thinking:
disabled

Best controlled benchmark:

Prompt processing:
22.758631 tok/s

Token generation:
5.162027 tok/s
10. Hardware/backend investigation

The project also investigated whether additional Snapdragon acceleration could be enabled.

The phone reports:

SoC = SM7435
Platform = parrot

CPU features include:

NEON
FMA
DOTPROD

but:

i8mm = NOT AVAILABLE

The existing llama.rn native library selection therefore resolves to the DOTPROD CPU backend:

rnllama_jni_v8_2_dotprod

The investigation also traced the Hexagon/OpenCL native-library selection.

The important conclusion was:

The available Hexagon/OpenCL prebuilt path is tied to an i8mm + Hexagon combination that this device does not satisfy.

Therefore, simply changing the model does not magically enable Hexagon.

This is a hardware/backend compatibility limitation, not a Qwen3 model limitation.

11. Flash Attention investigation

Flash Attention was also investigated rather than blindly enabled.

With Q8 KV configuration, the native runtime behavior indicates that quantized V cache requires Flash Attention and AUTO is promoted to the enabled path.

Therefore:

flash_attn_type = AUTO

does not mean that the actual compute path is necessarily running without Flash Attention.

Consequently, explicitly changing:

AUTO → ON

was not considered a meaningful independent optimization experiment.

12. Final assessment — Qwen3-4B
Strengths
Better fit for VINXO's conversational requirements than the previous 1.5B experiment.
Successfully integrated into the local inference pipeline.
Survived extended regression testing.
No repeated crash observed after clean rebuild/testing.
Q8 KV provided measurable generation-speed improvement.
Stable enough to become a meaningful benchmark/control model.
Weaknesses
Token generation remains approximately 5 tok/s.
This is still too slow for the desired VINXO conversational experience.
Increasing threads to 6 made performance worse.
The target phone cannot use the currently available i8mm-dependent Hexagon/OpenCL path.
Context capacity remains constrained by the configured n_ctx.
Decision

Qwen3-4B is technically viable but not an acceptable final VINXO model for the current target hardware/performance requirement.

13. What these two failed experiments taught us

This is actually the most valuable part of the history.

We now have two very different failure modes:

                 VINXO Model Search
                        │
          ┌─────────────┴─────────────┐
          │                           │
    Qwen2.5 1.5B                Qwen3 4B
          │                           │
       FAST                        BETTER
      2–3 sec                    CONTEXT
          │                           │
          ▼                           ▼
   Context quality              Too slow
   insufficient                 ~5 tok/s
          │                           │
          └─────────────┬─────────────┘
                        ▼
                Neither is ideal

So our target isn't simply:

"Find the fastest model."

It is:

Find the smallest model that provides sufficient VINXO-level conversational/context capability while remaining fast enough on this exact phone.

That's a much more precise engineering target.

14. Current VINXO model-selection history

This is the section I'd actually keep permanently in the project documentation:

VINXO LOCAL LLM HISTORY
────────────────────────────────────────

Model #1
Qwen2.5-1.5B-Instruct
        │
        ├── Response speed:     ✅
        ├── ~2–3 sec responses: ✅
        ├── Context quality:    ❌
        └── Decision: REJECTED


Model #2
Qwen3-4B-Q4_K_M
        │
        ├── Context/conversation: ✅ better
        ├── Stability:             ✅
        ├── Q8 KV improvement:     ✅
        ├── ~5 tok/s generation:   ❌ too slow
        ├── Hexagon acceleration:  ❌ unavailable
        └── Decision: NOT FINAL


NEXT
Model #3
        │
        ▼
Candidate model
        │
        ├── Benchmark
        ├── Regression test
        ├── Context test
        ├── Stability test
        └── VINXO suitability
The important philosophy

Maga, these aren't wasted experiments.

They've already given us hard constraints for the next model:

We know we don't want:

Qwen2.5-1.5B behavior

Fast enough, but insufficient context/conversation capability.

We know we don't want:

Qwen3-4B behavior

Better conversational capability, but too slow on this specific CPU-only device.

Therefore our next target is:

The middle ground.

And that's exactly why the next model search should focus on roughly 2B–3.5B models, regardless of model family, rather than blindly trying another Qwen3 size.

That way, when VINXO eventually reaches the model that feels right, the documentation can honestly say:

“This was not the first model. VINXO went through multiple local LLM evaluations, including Qwen2.5-1.5B and Qwen3-4B, with controlled benchmarking, regression testing, hardware/backend investigation, and context evaluation. The final model was selected based on the target device rather than benchmark claims.”


# VINXO — Local AI Brain

VINXO uses a local Large Language Model as its primary offline/private AI brain.

The goal is to provide fast, private, and offline-capable conversations without depending on a cloud API for every interaction.

## 🧠 Local Brain — Model Selection

After experimenting with different small local models, **Qwen3-1.7B** was selected as the current local brain for VINXO.

The model was selected because it provides a practical balance between:

- Model size
- Mobile memory usage
- Inference speed
- Conversational capability
- Structured output capability
- Local Android execution

### Target Device

- **Device:** Motorola Edge 50 Fusion
- **SoC:** Snapdragon 7s Gen 2
- **GPU:** Adreno 710
- **RAM:** 8 GB
- **Storage:** 128 GB

### Current Model

```text
Qwen3-1.7B
Quantization: Q4_K_M
Format: GGUF
Size: ~1.28 GB


React Native
      ↓
LocalAIProvider
      ↓
LocalLLMService
      ↓
llama.rn
      ↓
Qwen3-1.7B Q4_K_M
      ↓
Local AI Response

⚙️ Local LLM Integration

VINXO uses llama.rn to run the GGUF model directly on Android.

React Native
      ↓
LocalAIProvider
      ↓
LocalLLMService
      ↓
llama.rn
      ↓
Qwen3-1.7B Q4_K_M
      ↓
Local AI Response
LocalLLMService

Responsible for:

Loading the GGUF model
Initializing the llama context
Managing the local inference engine
Running model completions
LocalAIProvider

Responsible for:

Preparing conversation history
Preparing model context
Sending messages to the local model
Returning the generated response
📱 Android Model Loading

The Qwen GGUF model is bundled with the Android application and copied into the application's document directory when required.

Android App
   │
   ├── assets/
   │      └── models/
   │             └── Qwen3-1.7B-Q4_K_M.gguf
   │
   ↓
Application Document Directory
   │
   └── models/
          └── Qwen3-1.7B-Q4_K_M.gguf

The model is then initialized through llama.rn.

🧪 Initial Model Testing

After successfully integrating Qwen3-1.7B, inference was tested directly on the physical Android device.

Initial configuration:

Context size: 2048
Threads: 4
GPU layers: 0

The first objective was to establish a working baseline before attempting further optimization.

📊 Performance Testing

Initial measurements on the Motorola Edge 50 Fusion were approximately:

Prompt Processing:
~40–55 tokens/sec

Text Generation:
~8–10 tokens/sec

One observed benchmark:

Prompt Processing: ~55.58 tok/s
Text Generation:   ~9.55 tok/s

Another observed completion:

Prompt Processing: ~53.81 tok/s
Text Generation:   ~10.59 tok/s

Longer-context testing produced approximately:

Prompt Processing: ~40.05 tok/s
Text Generation:   ~7.90 tok/s

These are device-specific observations and are being used as the current performance baseline.

🔬 Thread Testing

Different thread configurations were tested.

A previous 6-thread test produced approximately:

Prompt Processing: ~29.02 tok/s
Text Generation:   ~8.10 tok/s

The current configuration therefore uses:

n_threads: 4

Further optimization will be based on actual device benchmarks.

🧠 Qwen3 Thinking Mode

Qwen3 supports both thinking and non-thinking modes.

VINXO currently uses non-thinking mode for normal companion conversations:

enable_thinking: false

This keeps normal conversations responsive without adding unnecessary reasoning overhead.

Thinking mode can be explored later for tasks that require deeper reasoning.

🧪 Benchmarking Strategy

The llama benchmark was used during development to understand the capabilities of the device.

The benchmark is not executed during normal VINXO conversations.

Normal operation remains:

User
 ↓
VINXO
 ↓
Qwen3
 ↓
Response

Benchmarking is only used when performance needs to be measured.

🧠 Memory Architecture

After getting the local model running, the next stage was building a structured memory system around Qwen.

Memory is intentionally kept separate from the conversation foundation.

Conversation.ts        🔒
Message.ts             🔒

LocalAIProvider.ts
LocalLLMService.ts

Memory.ts
MemoryStatus.ts
MemoryManager.ts
MemoryExtractor.ts
ContextBuilder.ts
AIMessage.ts

Conversation.ts and Message.ts are foundation files and are intentionally not modified.

🗂️ Structured Memory

VINXO memories currently use:

IDENTITY
RELATIONSHIP
PERSON
PREFERENCE
FACT

A memory contains:

id
category
key
value
createdAt
updatedAt

Memory changes are controlled by MemoryManager.

Current memory states:

ADDED
DUPLICATE
UPDATED
UNAUTHORIZED
🔍 Memory Extraction

A separate MemoryExtractor was introduced so memory extraction remains independent from normal conversation generation.

User Message
      ↓
MemoryExtractor
      ↓
Memory | null
      ↓
MemoryManager
      ↓
Stored Memory

The extractor itself does not directly modify the memory store.

🧪 Memory Extraction Testing

The extractor was tested using real conversation messages.

Examples:

"Hi vinxo"
→ null
"My name is Vinay"
→ IDENTITY memory
"Thanks vinxo tell me a joke"
→ null
"Haha thats funny one vinxo"
→ null
"Hey my frds are here shivu and jerin"
→ RELATIONSHIP memory

The initial experiment successfully demonstrated that Qwen can distinguish between normal conversation and information that may be useful as long-term memory.

Some category and key normalization is still being refined.

🧩 Context Building

Extracted memories are converted into model-facing context through ContextBuilder.

Example:

IDENTITY: name = Vinay
PREFERENCE: food = Pizza
FACT: project = VINXO

The resulting memory context is provided to Qwen as part of the system context.

MemoryManager
      ↓
getMemories()
      ↓
ContextBuilder
      ↓
Memory Context
      ↓
LocalAIProvider
      ↓
Qwen3
🧪 Current Memory Pipeline

The intended complete pipeline is:

Conversation
      ↓
User Messages Only
      ↓
MemoryExtractor
      ↓
Memory | null
      ↓
MemoryManager
      ↓
Stored Memories
      ↓
ContextBuilder
      ↓
Memory Context
      ↓
LocalAIProvider
      ↓
Qwen3-1.7B

Memory extraction has already been tested.

The next major test is verifying that Qwen actually uses the extracted memory correctly in future conversations.

👥 Multi-Person Conversation Testing

VINXO is also being tested with multiple people interacting with the same AI.

The goal is for VINXO to understand:

Captain Vinay as the primary user
Temporary guests
Current speaker
Previous conversation participants
People being discussed
When a guest leaves
When Captain returns

Qwen3-1.7B can understand many of these situations, but long multi-person conversations exposed limitations when speaker state is handled entirely through the system prompt.

Observed issues include:

Last identified speaker sometimes becoming sticky
Confusing the person being discussed with the current speaker
Incorrectly transferring relationships between people
Inconsistent exit/return handling

The current direction is to eventually handle speaker state at the application level rather than forcing the small model to infer everything from conversation history.

Future architecture:

Speaker Recognition
        ↓
currentSpeaker
        ↓
VINXO Context
        ↓
Qwen

For example:

currentSpeaker = VINAY

or:

currentSpeaker = GUEST

This will eventually connect with VINXO's voice authentication system.

🚧 Current Status
Local Brain
Qwen3-1.7B Q4_K_M          ✅
GGUF model                 ✅
llama.rn                   ✅
Android integration        ✅
Physical device testing    ✅
Performance baseline       ✅
Non-thinking mode          ✅
Thread testing             ✅
Memory
Memory model               ✅
MemoryManager              ✅
MemoryExtractor            ✅
ContextBuilder             ✅
Initial extraction tests   ✅
Memory injection           ✅
Memory usage testing       🚧
Persistent memory          🚧
Multi-Person Context
Basic speaker recognition  ⚠️
Guest conversations        ⚠️
Exit/return handling       ⚠️
Application-level speaker
state                      🚧
Voice-based recognition    🔮

🚧 Work In Progress

The local brain is still under active development.

Current priorities are:

Complete the memory pipeline
Verify memory usage by Qwen
Improve context handling
Continue multi-person testing
Establish application-level speaker context
Continue performance testing
Integrate voice
Add authentication
Later connect local and cloud brains

Qwen3-1.7B Q4_K_M is currently the working mobile baseline for VINXO.

The architecture is being built incrementally, with each layer tested before moving to the next.

## PAUSED THE  MEMORY AND CONTEXT TILL COMPLETION OF NATIVE ANDROID PLAYGROUND AND VOICE INTEGRATION AND FOR NATIVE ANDROID  PLYGROUND

15/09/26

## Native Android Capabilities

VINXO currently includes a Native Android Playground implemented through a Kotlin ↔ React Native bridge.

The playground provides a set of device-level controls and Android integrations that can later be exposed as VINXO tools for AI-driven actions.

### Device Controls

* Torch — Turn flashlight on/off
* Launch Applications — Launch apps by app name or package name
* Contacts — Read contacts and access contacts by name
* Phone Calls — Initiate calls using a contact name
* SMS — Open the SMS composer
* Battery — Read current battery status
* Volume — Adjust device volume
* Media — Play/pause media
* Brightness — Open and manage brightness controls
* Location — Check location status
* Wi-Fi — Check Wi-Fi status
* Bluetooth — Check Bluetooth status
* Alarm — Set alarms
* Timer — Set timers
* Vibration — Trigger device vibration
* Camera — Open the device camera
* Audio Recorder — Open the audio recorder
* Notifications — Open notification settings
* Screenshot — Request screenshot/capture permission
* Android Settings — Open Android system settings

### Permission Handling

VINXO requests permissions only when the related functionality is used.

Currently handled permissions include:

* Camera
* Contacts
* Phone calls
* SMS
* Microphone
* Location
* Bluetooth
* Notifications
* System brightness/settings access

The permission flow is designed around Android's permission model, allowing the user to grant or deny access when a feature requires it.

### Android System Screens

Some operations require explicit user interaction or system-level confirmation. VINXO therefore launches the appropriate Android system screen instead of attempting to bypass the platform restrictions.

These include:

* Brightness settings
* Notification access
* Screenshot capture/permission
* Alarms and timers
* SMS composition
* Other protected Android settings

### Architecture

```text
React Native
     │
     ▼
Kotlin Native Bridge
     │
     ▼
Android APIs
     │
     ▼
Device / System
```

The current Playground is primarily intended for development and testing.

The long-term goal is to convert these native capabilities into structured VINXO tools that can be invoked through the VINXO orchestration layer.

```text
User / Voice
     ↓
VINXO
     ↓
LLM
(Qwen / Gemini)
     ↓
Intent / Tool
     ↓
VINXO Tool Router
     ↓
Kotlin Native Bridge
     ↓
Android API
     ↓
Device Action
```

### Current Status

**Native Android Playground — Completed**

The current implementation establishes the foundation for VINXO's device-control layer. Further work will focus on connecting these capabilities to VINXO's context, memory, AI routing, and voice systems.


16/09/26

## 🎙️ Local Voice / Kokoro TTS Integration

VINXO currently includes a local Text-to-Speech (TTS) foundation using **Kokoro TTS through `react-native-sherpa-onnx`**.

The current implementation runs entirely on the Android device using CPU inference and streams generated PCM audio directly to the native Android audio player.

### Current Architecture

```text
Text
  ↓
Kokoro TTS
  ↓
Sherpa-ONNX
  ↓
PCM Audio Chunks
  ↓
React Native Streaming Layer
  ↓
Android Native AudioTrack
  ↓
🔊 Speaker



Package
npm install react-native-sherpa-onnx

Current version:

react-native-sherpa-onnx@0.4.4
1. Kokoro Model

The Kokoro model used by VINXO is:

kokoro-en-v0_19

The model contains:

kokoro-en-v0_19/
├── model.onnx
├── voices.bin
├── tokens.txt
└── espeak-ng-data/

The model is currently stored inside Android assets:

android/app/src/main/assets/kokoro-en-v0_19/

Sherpa-ONNX loads the model from the Android asset path.

2. Streaming TTS

VINXO uses the streaming API rather than generating a complete audio file first.

The engine is created using:

createStreamingTTS()

with Kokoro configured as:

{
  modelType: 'kokoro',
  provider: 'cpu',
  numThreads: 4,
}

The model is loaded from:

modelPath: {
  type: 'asset',
  path: 'kokoro-en-v0_19',
}

Kokoro configuration currently uses:

modelOptions: {
  kokoro: {
    lengthScale: 1.0,
  },
}
3. Voice Selection

Kokoro provides multiple voices through speaker IDs (sid).

VINXO tested multiple speaker IDs during the initial integration.

Current selected voice:

sid: 1

The voice can be changed by modifying the sid value during speech generation.

Example:

{
  sid: 1,
  speed: 1.0,
}
4. PCM Streaming

Kokoro does not directly play the generated speech.

It generates audio samples which are delivered as PCM chunks.

The streaming flow is:

generateSpeechStream()
        ↓
     onChunk()
        ↓
  chunk.samples
        ↓
 writePcmChunk()
        ↓
 Native Android AudioTrack
        ↓
      Speaker

Each generated chunk contains PCM samples and its sample rate.

The chunks are sent directly to the native PCM player instead of first creating a WAV/MP3 file.

5. Native Android PCM Player

Sherpa-ONNX provides native PCM playback support.

VINXO starts the player using:

startPcmPlayer(sampleRate, 1)

The second parameter is the number of channels.

Kokoro is currently played as:

1 channel
= Mono

The native Android implementation uses AudioTrack with PCM float audio for streaming playback.

The lifecycle is:

startPcmPlayer()
       ↓
generateSpeechStream()
       ↓
onChunk()
       ↓
writePcmChunk()
       ↓
onChunk()
       ↓
writePcmChunk()
       ↓
...
       ↓
onEnd()
       ↓
stopPcmPlayer()

The native player releases its AudioTrack when stopped.

6. Current Playground

The current implementation is intentionally kept inside a Playground/Test screen.

It allows testing:

Kokoro initialization
Local model loading
CPU inference
Sample rate
Number of available speakers
Voice selection using sid
Streaming speech generation
PCM chunk generation
Native PCM playback
Speech speed
Longer text / paragraph playback

Example test:

Hello Vinay. Welcome back to VINXO. Today we are testing local speech generation using Kokoro running entirely on the Android device. The speech is generated locally, converted into PCM audio chunks, and streamed directly to the speaker. There is no cloud voice service involved in this process. This is only the beginning of the VINXO voice system.
7. Important Observation

Punctuation affects Kokoro's speech rhythm.

For example:

Hello Vinay. This is VINXO.

can produce a noticeable pause after the full stop.

Using:

Hello Vinay, this is VINXO.

produces a shorter natural transition.

This means VINXO will eventually need its own speech/text preprocessing layer to control sentence boundaries and conversational pauses.

8. Current Status
✅ Completed
 Installed react-native-sherpa-onnx
 Added Kokoro model
 Added Kokoro model to Android assets
 Loaded Kokoro locally
 CPU inference working
 Streaming TTS working
 PCM chunks received
 Native PCM player working
 Audio output working
 Tested multiple Kokoro voices
 Selected sid: 1
 Tested paragraph-length speech
 Confirmed local speech playback on Android
9. Current Scope

The Kokoro integration is currently independent from VINXO's local LLM.

The current architecture intentionally keeps:

Local Brain
Qwen
  │
  │   NOT CONNECTED YET
  │
Local Voice
Kokoro

The purpose of the current phase is to establish and validate the local voice infrastructure independently.

10. Future Voice Architecture

The eventual VINXO voice system is planned to connect multiple independent components:

             VINXO Voice System
                    │
          ┌─────────┴─────────┐
          │                   │
    Voice Input          Voice Output
          │                   │
     Speech / Wake       Kokoro TTS
          │                   │
          ▼                   ▼
     Voice Auth            PCM Audio
          │                   │
          └─────────┬─────────┘
                    │
                    ▼
               VINXO Core
                    │
             ┌──────┴──────┐
             │             │
        Local Brain    Native Actions
           Qwen        Torch / Apps / etc.

Future work includes:

Wake-word detection
Voice authentication
Speech recognition
Background voice operation
Locked-screen voice interaction
Native device commands
Local LLM integration
Connecting LLM responses to Kokoro
Real-time response-to-speech streaming
Voice interruption / stop handling
Speech preprocessing and natural pause control
Battery-efficient voice lifecycle

These features are not part of the current Kokoro integration yet.

🎯 Milestone

VINXO has successfully reached its first local voice milestone:

Local Text
    ↓
Kokoro
    ↓
Sherpa-ONNX
    ↓
PCM Streaming
    ↓
Android Native AudioTrack
    ↓
🔊 Real Voice

This establishes the local TTS foundation required for the future VINXO voice system.


That is a good **“end of today's chapter”** README entry, maga. 😎

Push it, close the laptop, and take the break. **Mark 1 voice system is officially logged.** 🕺🤖🔥

