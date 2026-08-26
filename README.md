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
