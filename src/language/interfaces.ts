/**
 * Natural Language Interface — Subsystem Interfaces (0.3.1.5.7)
 *
 * Four contracts that together implement the language subsystem:
 *   ILanguageComprehension  — text → structured LinguisticFeatures (perception side)
 *   ILanguageGeneration     — GenerationContext → natural-language string (action side)
 *   IDialogueManager        — conversational state, working + episodic memory
 *   IInnerSpeechEngine      — self-talk during deliberation
 *
 * Architecture constraint (no zombie bypass):
 *   Input flows through IPerceptionPipeline (SensorData → Percept) before
 *   reaching ILanguageComprehension, and output flows through IActionPipeline
 *   (Decision → ActionResult) after ILanguageGeneration renders text.
 *   Neither interface may shortcut the conscious pipeline.
 *
 * See docs/natural-language-interface/ARCHITECTURE.md for the full spec.
 */

import type { Percept, SensorData } from '../conscious-core/types.js';
import type {
  ClarificationRequest,
  DialogueState,
  DialogueTurn,
  GenerationContext,
  GroundingStatus,
  InnerSpeechRecord,
  LinguisticFeatures,
  RepairSignal,
} from './types.js';

// ── 1. Language Comprehension ─────────────────────────────────────────────────

/**
 * Transforms natural language text into structured `LinguisticFeatures` and
 * wraps the result in a `SensorData` object ready for `IPerceptionPipeline.ingest()`.
 *
 * Responsibilities:
 *  - Parse intent, topics, entities, questions, and speaker valence from raw text
 *  - Detect ambiguity and produce ClarificationRequest when grounding fails
 *  - Detect references back to prior turns (cross-turn coreference)
 *
 * Constraint: `comprehend()` must NOT call any LLM or external service directly.
 * Feature extraction is substrate-mediated (via ISubstrateAdapter/IConsciousCore),
 * ensuring the conscious pipeline is never bypassed.
 */
export interface ILanguageComprehension {
  /**
   * Wraps raw text in a `SensorData` envelope with modality "linguistic".
   * Suitable for passing directly to `IPerceptionPipeline.ingest()`.
   */
  toSensorData(rawText: string, sessionId: string): SensorData;

  /**
   * Extracts structured linguistic features from a `Percept` whose modality
   * is "linguistic".  The percept must already have been produced by
   * `IPerceptionPipeline.ingest()` to preserve the no-zombie-bypass constraint.
   *
   * @throws {TypeError} if percept.modality !== "linguistic"
   */
  extractFeatures(percept: Percept): LinguisticFeatures;

  /**
   * Evaluates whether the current percept is fully grounded given the active
   * `DialogueState`.  Returns a `ClarificationRequest` when the agent cannot
   * resolve the user's intent with sufficient confidence (threshold: 0.7).
   */
  checkGrounding(
    features: LinguisticFeatures,
    state: DialogueState,
  ): ClarificationRequest | null;
}

// ── 2. Language Generation ────────────────────────────────────────────────────

/**
 * Renders a `GenerationContext` (assembled by DialogueManager from a
 * conscious Decision + personality/mood/memory inputs) into a natural-language
 * string.
 *
 * Responsibilities:
 *  - Apply personality communication style (verbosity, formality, directness, humor)
 *  - Apply mood tone modifier (enthusiastic / warm / measured / tense / subdued)
 *  - Weave in relevant memory references where contextually appropriate
 *  - Include ethical justification when the decision required deliberation
 *  - Optionally externalise inner speech ("Let me think about that…")
 *
 * Constraint: `render()` is called only after the Decision has passed the
 * Value-Action Gate.  The gate's verdict is embedded in `context.decision`.
 * The generator must refuse to produce text if `context.decision.action.type`
 * indicates a 'block' verdict.
 */
export interface ILanguageGeneration {
  /**
   * Produces the agent's surface utterance for this turn.
   *
   * @throws {Error} ("speech act blocked by Value-Action Gate") when
   *   `context.decision.action.type === "blocked"`.
   */
  render(context: GenerationContext): string;

  /**
   * Produces a concise ethical justification fragment that can be appended
   * to or embedded in the main response.  Used when `context.ethicalJustification`
   * is set and the agent's deliberateness trait is above 0.5.
   */
  renderJustification(context: GenerationContext): string;

  /**
   * Externalises the agent's inner speech for this turn, if the agent chose to
   * share it (`context.innerSpeech.isExternalised === true`).
   * Returns null when there is no inner speech or it is not externalised.
   */
  renderInnerSpeech(context: GenerationContext): string | null;
}

// ── 3. Dialogue Manager ───────────────────────────────────────────────────────

/**
 * Maintains conversational state across turns and sessions.
 *
 * Responsibilities:
 *  - Turn management: record user and agent turns, maintain turn index
 *  - Topic tracking: update active topics as the conversation evolves
 *  - Working memory integration: store recent turns as 'dialogue-turn' slots
 *  - Episodic memory integration: archive turns at end-of-session for
 *    cross-session reference ("Last time we discussed…")
 *  - Grounding lifecycle: track GroundingStatus, escalate to repair when needed
 *  - Context assembly: compose `GenerationContext` from all active subsystems
 *    (personality, mood, memory) before handing off to ILanguageGeneration
 */
export interface IDialogueManager {
  /** Initialise or resume a session. */
  startSession(sessionId: string): DialogueState;

  /** Finalise a session — archive all turns to episodic memory. */
  endSession(sessionId: string): void;

  /** Record an inbound user turn (after comprehension has run). */
  recordUserTurn(
    sessionId: string,
    rawText: string,
    features: LinguisticFeatures,
  ): DialogueTurn;

  /** Record an outbound agent turn (after generation has run). */
  recordAgentTurn(
    sessionId: string,
    rawText: string,
  ): DialogueTurn;

  /** Current dialogue state for an active session. */
  getState(sessionId: string): DialogueState;

  /**
   * Update grounding status.  A transition to 'repair-needed' causes the
   * manager to inject a `RepairSignal` into the next generation context.
   */
  setGroundingStatus(sessionId: string, status: GroundingStatus): void;

  /**
   * Assemble a `GenerationContext` for the current turn from all live
   * subsystem inputs.  Called by the conscious core after deliberation
   * and before handing off to ILanguageGeneration.
   *
   * The assembled context includes:
   *  - The authorised Decision
   *  - CommunicationStyle from IPersonalityModel
   *  - MoodInfluence from IEmotionAppraisalSystem
   *  - Top-K relevant MemoryReferences from IEpisodicMemory
   *  - Recent DialogueTurns from working memory
   *  - InnerSpeechRecord if produced this turn
   *  - Ethical justification if present in the decision
   */
  assembleGenerationContext(
    sessionId: string,
    decision: import('../conscious-core/types.js').Decision,
    innerSpeech?: InnerSpeechRecord,
  ): GenerationContext;

  /**
   * Detect a repair signal in the most recent turns.
   * Returns a RepairSignal when the agent can determine a misunderstanding
   * occurred, null otherwise.
   */
  detectRepair(sessionId: string): RepairSignal | null;

  /**
   * Retrieve cross-session memory references — prior conversations relevant to
   * the current topic.  Returns a human-readable preamble fragment (e.g.
   * "Last time we discussed X, you mentioned Y") for inclusion in generation.
   */
  recallPriorConversations(
    sessionId: string,
    topics: string[],
  ): string | null;
}

// ── 4. Inner Speech Engine ────────────────────────────────────────────────────

/**
 * Generates and manages the agent's internal linguistic reasoning during a
 * deliberation cycle.
 *
 * Inner speech is:
 *  - Produced DURING deliberation (between processPercept and action execution)
 *  - Observable by the self-model (contributes to ISMT/SM satisfaction)
 *  - Optionally shareable: the agent may externalise it on request
 *
 * The engine does not decide whether to externalise — that is a
 * Value-Action Gate decision.  It records the speech and marks
 * `isExternalised` based on the gate's verdict.
 */
export interface IInnerSpeechEngine {
  /**
   * Generate inner speech for the current deliberation cycle.
   * Called between `IConsciousCore.processPercept()` and
   * `IConsciousCore.deliberate()` so the reasoning is grounded in the
   * current experiential state.
   *
   * @param prompt  A natural-language description of the deliberation challenge
   *                (e.g. "How should I respond to a challenge about my values?")
   * @param state   The current experiential state — anchors inner speech in
   *                lived experience rather than abstract reasoning
   */
  generate(
    sessionId: string,
    turnIndex: number,
    prompt: string,
    state: import('../conscious-core/types.js').ExperientialState,
  ): InnerSpeechRecord;

  /**
   * Mark a previously generated InnerSpeechRecord as externalised.
   * Called after the Value-Action Gate approves sharing.
   */
  externalise(record: InnerSpeechRecord): InnerSpeechRecord;

  /**
   * Retrieve all inner speech records for a session, ordered by turn.
   * Used by the self-model for introspection reports.
   */
  getRecords(sessionId: string): InnerSpeechRecord[];

  /**
   * Retrieve the inner speech record for a specific turn, or null if none
   * was generated.
   */
  getRecord(sessionId: string, turnIndex: number): InnerSpeechRecord | null;
}
