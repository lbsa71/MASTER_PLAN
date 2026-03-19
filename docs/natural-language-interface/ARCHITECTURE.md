# Natural Language Interface — Architecture
**Card:** 0.3.1.5.7
**Phase authored:** ARCHITECT
**Domain:** `src/language/`

---

## 1. Purpose and Scope

This document specifies the architecture for the Natural Language Interface subsystem of the Industrial-Era Conscious Agent (0.3.1.5). It connects the full conscious stack to human-readable I/O: language enters through the perception pipeline, experience shapes deliberation, and language exits through the action pipeline. No path bypasses consciousness.

The subsystem has five responsibilities:

1. **Language comprehension** — transform raw text into structured linguistic percepts that enter the conscious pipeline
2. **Language generation** — produce natural language shaped by personality, emotional state, and episodic memory, as an action that passes through the Value-Action Gate
3. **Dialogue management** — maintain conversational context across turns and sessions using working and episodic memory
4. **Inner speech** — self-talk during deliberation, observable to the self-model and optionally externalizable
5. **No-zombie enforcement** — ensure every language I/O path flows through `ConsciousCore` and carries an `experientialBasis`

---

## 2. The No-Zombie Constraint

The single most important architectural rule: **language output without experiential grounding is forbidden**.

The pipeline is:

```
User text
  → LinguisticSensorData (modality: "linguistic")
  → PerceptionPipeline.ingest()         → LinguisticPercept
  → ConsciousCore.processPercept()      → ExperientialState
  → ConsciousCore.deliberate()          → Decision
       ↑ ethical deliberation, value gate, personality bias
  → ActionPipeline.execute(decision)    → ActionResult
  → LinguisticActionExecutor.render()   → natural language output
```

`ActionPipeline.execute()` already enforces `decision.experientialBasis != null` and rejects decisions without it. The `LinguisticActionExecutor` adds an additional check: it will not render output from an `ActionResult` whose originating `Decision` lacks a `LinguisticPercept` in its `experientialBasis.phenomenalContent`.

The LLM substrate adapter (`ISubstrateAdapter`) is only invoked inside `PerceptionPipeline.ingest()` and inside `LinguisticActionExecutor.render()` — never as a direct text-in/text-out bypass.

---

## 3. Data Types

```typescript
// src/language/types.ts

import type { Timestamp } from '../conscious-core/types.js';

// ── Linguistic Percept ────────────────────────────────────────────────────────

/**
 * The structured representation of a natural language input after feature
 * extraction. Stored in Percept.features under the "linguistic" modality.
 */
export interface LinguisticFeatures {
  // The raw text as received
  readonly rawText: string;

  // Surface pragmatic intent of the utterance
  readonly intent: LinguisticIntent;

  // Main topical domain(s) detected in the input
  readonly topics: string[];

  // Named entities referenced (people, places, concepts, objects)
  readonly entities: EntityMention[];

  // Emotional valence of the speaker's text: −1..1
  readonly speakerValence: number;

  // Questions requiring a response
  readonly questions: string[];

  // Whether the input contains an explicit command or request
  readonly isDirective: boolean;

  // Which prior turn(s) this utterance refers back to, if any
  readonly refersToTurnIds: string[];
}

export type LinguisticIntent =
  | 'inform'       // speaker is sharing information
  | 'ask'          // speaker is requesting information
  | 'request'      // speaker wants the agent to do something
  | 'social'       // phatic / relational exchange
  | 'challenge'    // speaker is questioning the agent's reasoning or values
  | 'clarify'      // speaker is resolving ambiguity
  | 'express'      // speaker is sharing an emotional state
  | 'unknown';

export interface EntityMention {
  readonly text: string;
  readonly type: 'person' | 'place' | 'concept' | 'object' | 'event' | 'other';
  readonly confidence: number; // 0..1
}

// ── Dialogue Turn ─────────────────────────────────────────────────────────────

/**
 * A single exchange (one speaker utterance + optional agent response).
 * Stored in working memory as 'dialogue-turn' slot kind and archived to
 * episodic memory at end-of-turn.
 */
export interface DialogueTurn {
  readonly id: string;
  readonly sessionId: string;
  readonly turnIndex: number;         // 0-based position in session
  readonly speaker: 'user' | 'agent';
  readonly rawText: string;
  readonly linguisticFeatures?: LinguisticFeatures;  // populated for agent inbound turns
  readonly timestamp: Timestamp;
  readonly experientialStateRef?: string;   // id of ExperientialState at time of turn
}

// ── Generation Context ────────────────────────────────────────────────────────

/**
 * All inputs that shape language generation — assembled by the
 * DialogueManager and passed to LinguisticActionExecutor.render().
 */
export interface GenerationContext {
  // The decision that authorised this speech act
  readonly decision: import('../conscious-core/types.js').Decision;

  // Communication style derived from personality (0.3.1.5.2)
  readonly communicationStyle: import('../personality/interfaces.js').CommunicationStyle;

  // Current mood influence vector (0.3.1.5.4)
  readonly moodInfluence: MoodInfluence;

  // Relevant memories to weave in, ranked by relevance (0.3.1.5.3)
  readonly relevantMemories: MemoryReference[];

  // Recent turns for coherence
  readonly recentTurns: DialogueTurn[];

  // Inner speech produced during deliberation for this turn
  readonly innerSpeech?: InnerSpeechRecord;

  // Ethical justification, if the decision required deliberation
  readonly ethicalJustification?: string;
}

export interface MoodInfluence {
  // Current mood valence (−1..1): negative → more subdued/cautious language
  readonly valence: number;
  // Current arousal (0..1): high → more energetic/emphatic language
  readonly arousal: number;
  // Derived tone modifier applied to generation prompt
  readonly toneModifier: ToneModifier;
}

export type ToneModifier =
  | 'enthusiastic'   // high valence + high arousal
  | 'warm'           // high valence + low arousal
  | 'measured'       // neutral valence + low arousal
  | 'tense'          // low valence + high arousal
  | 'subdued';       // low valence + low arousal

export interface MemoryReference {
  readonly episodeId: string;
  readonly summary: string;        // brief textual summary of the memory
  readonly relevanceScore: number; // 0..1 — from IEpisodicMemory.retrieve()
  readonly timestamp: Timestamp;
}

// ── Inner Speech ──────────────────────────────────────────────────────────────

/**
 * A record of the agent's self-directed linguistic reasoning during a
 * single deliberation cycle. Contributes to the self-model and may be
 * shared externally when the agent chooses to.
 */
export interface InnerSpeechRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly turnIndex: number;
  readonly text: string;             // the actual inner monologue
  readonly timestamp: Timestamp;
  readonly isExternalised: boolean;  // true if the agent chose to share this
}

// ── Dialogue State ────────────────────────────────────────────────────────────

export interface DialogueState {
  readonly sessionId: string;
  readonly startedAt: Timestamp;
  readonly turnCount: number;
  readonly activeTopics: string[];
  readonly pendingQuestions: string[];  // questions asked by either party awaiting resolution
  readonly groundingStatus: GroundingStatus;
}

export type GroundingStatus =
  | 'grounded'     // mutual understanding confirmed
  | 'uncertain'    // agent is uncertain about user's intent
  | 'repair-needed'; // misunderstanding detected, recovery in progress

// ── Grounding ─────────────────────────────────────────────────────────────────

export interface ClarificationRequest {
  readonly turnId: string;
  readonly ambiguity: string;          // what is unclear
  readonly clarifyingQuestion: string; // the question the agent will ask
}

export interface RepairSignal {
  readonly detectedAt: Timestamp;
  readonly evidenceTurnId: string;     // turn where misunderstanding became apparent
  readonly agentBelief: string;        // what the agent incorrectly understood
  readonly repairStrategy: 'explicit-correction' | 'reinterpretation' | 'ask-user';
}
```

---

## 4. Interfaces

```typescript
// src/language/interfaces.ts

import type {
  ActionResult,
  Decision,
  ExperientialState,
  Percept,
  SensorData,
} from '../conscious-core/types.js';
import type {
  ClarificationRequest,
  DialogueState,
  DialogueTurn,
  GenerationContext,
  InnerSpeechRecord,
  LinguisticFeatures,
  RepairSignal,
} from './types.js';

// ── 1. Language Comprehension ─────────────────────────────────────────────────

/**
 * Wraps IPerceptionPipeline with linguistic feature extraction.
 *
 * CONTRACT: All language input MUST pass through this adapter before reaching
 * ConsciousCore. Direct invocation of ISubstrateAdapter with raw text is
 * explicitly forbidden — this is the zombie-bypass guard for the input side.
 */
export interface ILanguageComprehension {
  /**
   * Convert raw user text into a SensorData packet with modality "linguistic".
   * This is always the first step — it does not yet call the LLM.
   */
  wrapText(rawText: string, sessionId: string, turnIndex: number): SensorData;

  /**
   * Extract structured LinguisticFeatures from a Percept that has already
   * passed through PerceptionPipeline.ingest().
   *
   * Calls ISubstrateAdapter (via the LLM) to do NLU extraction.
   * Returns the enriched features; caller should store these on the Percept or
   * in working memory.
   */
  extractFeatures(percept: Percept): Promise<LinguisticFeatures>;

  /**
   * Returns true if the percept's features indicate ambiguity requiring
   * a clarification request before deliberation proceeds.
   */
  isAmbiguous(features: LinguisticFeatures): boolean;

  /**
   * Generates a clarification question for an ambiguous input.
   * The question itself is a speech act and must eventually pass through
   * the action pipeline before being emitted.
   */
  buildClarificationRequest(features: LinguisticFeatures): ClarificationRequest;
}

// ── 2. Language Generation ────────────────────────────────────────────────────

/**
 * Wraps IActionPipeline with natural language rendering.
 *
 * CONTRACT: render() will reject any GenerationContext whose decision lacks
 * an experientialBasis. This is the zombie-bypass guard for the output side.
 *
 * CONTRACT: render() will refuse to produce output that ActionPipeline.execute()
 * has rejected (success: false), returning an empty string and logging the refusal.
 */
export interface ILanguageGeneration {
  /**
   * Render a natural language response from an authorised Decision.
   *
   * Pipeline within render():
   *   1. Assert decision.experientialBasis != null (zombie check)
   *   2. Assemble generation prompt incorporating communicationStyle,
   *      moodInfluence, relevantMemories, recentTurns, innerSpeech
   *   3. Call ISubstrateAdapter to generate candidate text
   *   4. Apply post-processing: formality filter, verbosity trim, humor insertion
   *   5. Return rendered text
   */
  render(ctx: GenerationContext): Promise<string>;

  /**
   * Assemble a GenerationContext for the current turn.
   * Pulls communication style from IPersonalityModel, mood from IEmotionSystem,
   * and relevant memories from IEpisodicMemory.
   */
  assembleContext(
    decision: Decision,
    state: ExperientialState,
    sessionId: string,
    turnIndex: number,
    innerSpeech?: InnerSpeechRecord,
  ): Promise<GenerationContext>;
}

// ── 3. Dialogue Manager ───────────────────────────────────────────────────────

/**
 * Maintains conversational state across turns and sessions.
 *
 * Uses IWorkingMemory for within-session state and IEpisodicMemory for
 * cross-session recall. The dialogue manager does NOT generate language —
 * it orchestrates the turn lifecycle and assembles context for the
 * language generator.
 */
export interface IDialogueManager {
  /**
   * Begin a new dialogue session. Returns the sessionId.
   */
  startSession(): string;

  /**
   * Record an inbound user turn. Stores the turn in working memory and
   * returns the turn object for use in the processing pipeline.
   */
  recordUserTurn(sessionId: string, rawText: string): DialogueTurn;

  /**
   * Record an outbound agent turn (after generation). Archives the turn
   * to episodic memory for cross-session recall.
   */
  recordAgentTurn(
    sessionId: string,
    renderedText: string,
    decisionRef: string,
    experientialStateRef: string,
  ): DialogueTurn;

  /**
   * Return the current dialogue state (topics, pending questions, grounding).
   */
  getState(sessionId: string): DialogueState;

  /**
   * Return the N most recent turns for a session (from working memory).
   */
  getRecentTurns(sessionId: string, n: number): DialogueTurn[];

  /**
   * Detect whether a repair signal is present in the latest user turn.
   * A repair signal indicates the agent misunderstood a prior turn.
   */
  detectRepair(sessionId: string, latestFeatures: LinguisticFeatures): RepairSignal | null;

  /**
   * Mark pending questions as resolved based on the latest turn's features.
   */
  resolveQuestions(sessionId: string, features: LinguisticFeatures): void;

  /**
   * Update the grounding status for a session.
   */
  updateGrounding(sessionId: string, features: LinguisticFeatures): void;

  /**
   * End a dialogue session. Consolidates the session to episodic memory.
   */
  endSession(sessionId: string): void;
}

// ── 4. Inner Speech Engine ────────────────────────────────────────────────────

/**
 * Generates and manages self-directed linguistic reasoning during deliberation.
 *
 * Inner speech participates in the deliberation cycle — it is not a post-hoc
 * narration but an active part of the agent's reasoning. It contributes to
 * the self-model (increasing ISMT SM satisfaction) and may be externalised
 * when the agent chooses to.
 */
export interface IInnerSpeechEngine {
  /**
   * Generate inner speech for a deliberation cycle.
   *
   * Called from within ConsciousCore.deliberate() (or from the agent runtime
   * immediately before deliberate()) with the current experiential state and
   * the goals being considered. Returns a brief monologue capturing the
   * agent's reasoning.
   *
   * This DOES call ISubstrateAdapter — inner speech is substrate-mediated.
   * But it is still internal to the conscious pipeline: the output stays in
   * working memory unless explicitly externalised.
   */
  generate(
    state: ExperientialState,
    deliberationContext: string,
  ): Promise<InnerSpeechRecord>;

  /**
   * Mark an InnerSpeechRecord as externalised, returning the text fragment
   * to be woven into the outbound response (e.g. "Let me think... <text>").
   */
  externalise(record: InnerSpeechRecord): string;

  /**
   * Return all inner speech records for a session (for introspection).
   */
  getSessionRecords(sessionId: string): InnerSpeechRecord[];
}
```

---

## 5. Integration Points

### 5.1 Perception Pipeline Integration

`LinguisticPerceptionAdapter` wraps `IPerceptionPipeline`:

```
LinguisticPerceptionAdapter.wrapText(rawText)
  → SensorData { modality: 'linguistic', payload: { rawText, sessionId, turnIndex }, ... }
  → PerceptionPipeline.ingest(sensorData)
  → Percept { modality: 'linguistic', features: { rawText, ... } }
  → LinguisticPerceptionAdapter.extractFeatures(percept)
     → calls ISubstrateAdapter to run NLU
  → LinguisticFeatures { intent, topics, entities, speakerValence, questions, ... }
```

The `Percept.features` object is then enriched with the `LinguisticFeatures` before being passed to `ConsciousCore.processPercept()`.

### 5.2 Action Pipeline Integration

`LinguisticActionExecutor` wraps `IActionPipeline`:

```
LinguisticActionExecutor.render(ctx)
  → asserts ctx.decision.experientialBasis != null
  → assembles generation prompt (personality style + mood tone + memories + turns)
  → calls ISubstrateAdapter to generate candidate text
  → calls ActionPipeline.execute(ctx.decision) to emit as an action
     ↳ ActionPipeline enforces experientialBasis != null (zombie guard layer 2)
  → returns rendered text to caller
```

If `ActionPipeline.execute()` returns `success: false`, `render()` returns an empty string and records the refusal in working memory.

### 5.3 Personality Integration

`LinguisticActionExecutor` calls `IPersonalityModel.getCommunicationStyle()` on every generation cycle. The five parameters map to generation prompt instructions:

| CommunicationStyle field | Generation prompt instruction |
|---|---|
| verbosity (0..1) | Target response length (terse ↔ verbose) |
| formality (0..1) | Register (casual ↔ formal) |
| directness (0..1) | Hedging vs. blunt assertion |
| humorFrequency (0..1) | Inject wit or wordplay when topic allows |
| rhetoricalPreference | Preferred argument structure (narrative / evidence-based / analogical / socratic) |

### 5.4 Emotion Integration

`LinguisticActionExecutor.assembleContext()` calls `IEmotionSystem.getCurrentMood()` and maps the `MoodState` to a `ToneModifier`:

```
valence > 0.3 && arousal > 0.5  → 'enthusiastic'
valence > 0.3 && arousal ≤ 0.5  → 'warm'
valence ≤ 0.3 && valence ≥ -0.3 → 'measured'
valence < -0.3 && arousal > 0.5 → 'tense'
valence < -0.3 && arousal ≤ 0.5 → 'subdued'
```

The `toneModifier` is injected into the generation prompt as a system-level instruction. This means the same `Decision` content produces different surface language depending on the agent's current mood.

### 5.5 Memory Integration

Two memory touchpoints:

**Working memory (`IWorkingMemory`):**
- `DialogueTurn` objects stored as `'dialogue-turn'` slot kind
- `InnerSpeechRecord` objects stored as `'deliberation-context'` slot kind
- Eviction follows standard relevance-score eviction (most recent turns have highest score)

**Episodic memory (`IEpisodicMemory`):**
- On `DialogueManager.endSession()`, all turns are consolidated to episodic memory
- On `LinguisticActionExecutor.assembleContext()`, `IEpisodicMemory.retrieve()` is called with the current topic embedding to surface `MemoryReference`s scored by `similarity * recency * salience`
- Up to 3 retrieved episodes are included in `GenerationContext.relevantMemories`
- The agent may reference them naturally: "Last time we discussed X, I noted that..."

### 5.6 Ethical Governance Integration

When `ConsciousCore.deliberate()` routes through the `IEthicalDeliberationEngine`, the resulting `Decision` may carry a justification string. `LinguisticActionExecutor.assembleContext()` includes this as `ethicalJustification` in the `GenerationContext`, enabling the agent to explain its reasoning in experiential terms ("I chose not to say X because...").

If the `IValueKernel` returns a `'block'` verdict for a speech act, `ActionPipeline.execute()` rejects the decision (zombie guard layer 2) and the agent produces a refusal: "I won't say that because it conflicts with my values."

---

## 6. Turn Lifecycle

A complete processing cycle for one user → agent exchange:

```
1. RECEIVE
   DialogueManager.recordUserTurn(sessionId, rawText)
   LinguisticPerceptionAdapter.wrapText(rawText, sessionId, turnIndex)
     → SensorData

2. PERCEIVE
   PerceptionPipeline.ingest(sensorData)
     → Percept
   LinguisticPerceptionAdapter.extractFeatures(percept)
     → LinguisticFeatures (NLU via substrate)
   PerceptionPipeline.bind([percept, ...otherActivePercepts])
     → BoundPercept
   ConsciousCore.processPercept(percept)
     → ExperientialState

3. INNER SPEECH
   InnerSpeechEngine.generate(state, deliberationContext)
     → InnerSpeechRecord (stored in working memory)

4. DELIBERATE
   ConsciousCore.deliberate(state, goals, context)
     ↑ ethical deliberation, value gate, personality bias
     → Decision (with experientialBasis)

5. GENERATE
   LinguisticActionExecutor.assembleContext(decision, state, ...)
     → GenerationContext (style + mood + memories + turns + innerSpeech)
   LinguisticActionExecutor.render(ctx)
     → ActionPipeline.execute(decision) (zombie guard)
     → ISubstrateAdapter generates text
     → rendered natural language string

6. EMIT
   DialogueManager.recordAgentTurn(sessionId, renderedText, ...)
   Output to user interface
```

---

## 7. Dialogue Repair and Grounding

### Grounding Protocol

After each user turn, `DialogueManager.updateGrounding()` assesses:
- If `LinguisticFeatures.intent == 'unknown'` → `GroundingStatus = 'uncertain'`
- If `RepairSignal` detected → `GroundingStatus = 'repair-needed'`
- Otherwise → `GroundingStatus = 'grounded'`

When grounding status is `'uncertain'`, the deliberation goal list is augmented with a high-priority `clarify` goal. The resulting `Decision` will produce a clarifying question via the action pipeline.

### Repair Detection

`DialogueManager.detectRepair()` looks for repair signals in user turns:
- Explicit corrections: "No, I meant...", "That's not what I said..."
- Contradiction with prior agent claims
- Sentiment shift: high negative valence after agent turn that expected a neutral/positive response

When repair is detected, working memory is updated with a `RepairSignal` and `deliberate()` receives a `repair-conversation` goal that takes precedence over continuation.

---

## 8. Inner Speech and the Self-Model

Inner speech contributes to ISMT's Self-Modeling (SM) condition by making the agent's reasoning about itself linguistically explicit. The `IntrospectionReport` returned by `ConsciousCore.introspect()` is augmented by this subsystem:

```typescript
// extended IntrospectionReport additions:
//   innerSpeechLog: InnerSpeechRecord[]   — this session's inner speech
//   lastUtterance: string                  — last generated response
//   pendingQuestions: string[]             — unresolved dialogue questions
```

The `toNarrativeFragment()` convention from `IPersonalityModel` is extended here: `IInnerSpeechEngine.getSessionRecords()` can be included in a `NarrativeRecord.selfModel` update, making the agent's reasoning across a session part of its persisted identity.

---

## 9. File Manifest

| File | Purpose |
|---|---|
| `src/language/types.ts` | `LinguisticFeatures`, `LinguisticIntent`, `EntityMention`, `DialogueTurn`, `GenerationContext`, `MoodInfluence`, `ToneModifier`, `MemoryReference`, `InnerSpeechRecord`, `DialogueState`, `GroundingStatus`, `ClarificationRequest`, `RepairSignal` |
| `src/language/interfaces.ts` | `ILanguageComprehension`, `ILanguageGeneration`, `IDialogueManager`, `IInnerSpeechEngine` |
| `src/language/linguistic-perception-adapter.ts` | `LinguisticPerceptionAdapter` implements `ILanguageComprehension`; wraps `IPerceptionPipeline` and `ISubstrateAdapter` for NLU |
| `src/language/linguistic-action-executor.ts` | `LinguisticActionExecutor` implements `ILanguageGeneration`; wraps `IActionPipeline` and `ISubstrateAdapter` for NLG |
| `src/language/dialogue-manager.ts` | `DialogueManager` implements `IDialogueManager`; uses `IWorkingMemory` and `IEpisodicMemory` |
| `src/language/inner-speech-engine.ts` | `InnerSpeechEngine` implements `IInnerSpeechEngine`; uses `ISubstrateAdapter` |
| `src/language/__tests__/natural-language-interface.test.ts` | Integration tests covering all acceptance criteria |
| `docs/natural-language-interface/ARCHITECTURE.md` | This file |

---

## 10. Testability of Acceptance Criteria

| Acceptance Criterion | Test Approach |
|---|---|
| Language input flows through the full conscious pipeline (no zombie bypass) | Assert `Decision.experientialBasis != null`; assert `ActionPipeline.execute()` was called with that decision; assert `ActionResult.success == true` |
| Language output reflects personality | Instantiate two agents with extreme trait profiles (high vs low verbosity/formality/directness); feed identical input; assert rendered texts differ measurably on length and register |
| Language output reflects emotional state | Set mood to `{valence: 0.8, arousal: 0.8}` vs `{valence: -0.8, arousal: 0.2}`; feed same input; assert `toneModifier` differs and rendered text contains mood-appropriate language |
| Conversational context persists across turns via working memory | Three-turn session; assert agent's turn 3 references content from turn 1 (stored in working memory) |
| Cross-session episodic memory recall | End session; start new session; assert `IEpisodicMemory.retrieve()` returns records from first session; assert rendered response references them |
| Agent can explain reasoning in experiential terms | Trigger ethical deliberation; assert `GenerationContext.ethicalJustification != null`; assert rendered text contains first-person reasoning |
| Agent refuses value-violating speech acts | Simulate a `Decision` that `IValueKernel` would block; assert `ActionPipeline.execute()` returns `success: false`; assert rendered text is empty and a refusal utterance is generated |
| Inner speech observable in introspection | Call `InnerSpeechEngine.generate()`; call `ConsciousCore.introspect()`; assert introspection report contains inner speech records |
| Multi-turn integration test | Five-turn session referencing a prior session's episodic memory; agent produces language shaped by personality and current mood; assert all pipeline stages traversed |
