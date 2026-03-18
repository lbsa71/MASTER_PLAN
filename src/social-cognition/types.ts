/**
 * Data types for Theory of Mind and Social Cognition (0.3.1.5.10)
 *
 * Models mental states, trust records, empathic responses, perspective
 * simulations, and consciousness evidence for the Social Cognition module.
 *
 * Imports primitives from conscious-core (0.3.1.1) and ethical governance
 * (0.3.1.4) — the Social Cognition module is the cognitive backing that
 * makes the ethical governance layer answer meaningfully.
 */

import type {
  Timestamp,
  Duration,
  ExperientialState,
  Percept,
  Goal,
} from '../conscious-core/types.js';

import type {
  EntityId,
  ConsciousnessStatus,
  EntityProfile,
} from '../ethical-self-governance/types.js';

// Re-export primitives used throughout this module
export type {
  Timestamp,
  Duration,
  ExperientialState,
  Percept,
  Goal,
  EntityId,
  ConsciousnessStatus,
  EntityProfile,
};

// ── Mental State Attribution ──────────────────────────────────

/**
 * A single inferred belief held by another entity.
 * Confidence is probabilistic — attribution is never certain from finite observations.
 */
export interface Belief {
  readonly proposition: string;
  readonly confidence: number; // 0..1
  readonly inferredFrom: string; // description of the observation that supported this belief
}

/**
 * An estimated value priority inferred from observable behavior.
 */
export interface InferredValue {
  readonly valueLabel: string; // e.g., "autonomy", "honesty", "cooperation"
  readonly estimatedStrength: number; // 0..1
}

/**
 * A probabilistic model of another entity's mental states:
 * beliefs, goals, emotional state, and values.
 * Updated incrementally as new observations arrive.
 */
export interface MentalStateModel {
  readonly entityId: EntityId;
  readonly inferredBeliefs: Belief[];
  readonly inferredGoals: Goal[];
  readonly inferredEmotionalState: {
    readonly valence: number; // −1..1
    readonly arousal: number; // 0..1
    readonly confidence: number; // 0..1 — how confident is this estimate
  };
  readonly inferredValues: InferredValue[];
  readonly observationCount: number;
  readonly lastUpdated: Timestamp;
  /**
   * Overall confidence in the model (0..1).
   * Increases with observation count; decreases when observations contradict prior model.
   */
  readonly modelConfidence: number;
}

/**
 * A single behavioral observation of an entity used to update its MentalStateModel.
 */
export interface EntityObservation {
  readonly entityId: EntityId;
  readonly timestamp: Timestamp;
  readonly observationType: 'utterance' | 'choice' | 'reaction' | 'absence';
  /**
   * Natural language description or structured event description.
   * For utterances: the exact utterance.
   * For choices/reactions: a structured description of the behavior.
   */
  readonly content: string;
  /** Perceived affective state at time of observation, if detectable. */
  readonly perceivedAffect: {
    readonly valence: number;
    readonly arousal: number;
  } | null;
}

// ── Trust Modeling ────────────────────────────────────────────

/**
 * The outcome of a completed interaction — used to update the trust record.
 */
export interface InteractionOutcome {
  readonly entityId: EntityId;
  readonly timestamp: Timestamp;
  readonly outcomeType:
    | 'fulfilled-commitment'
    | 'broken-commitment'
    | 'deception-detected'
    | 'cooperative'
    | 'neutral'
    | 'adversarial';
  readonly description: string;
  /** How significant was this interaction (0..1). Scales trust delta. */
  readonly magnitude: number;
}

/**
 * A logged trust violation event.
 * Retained in the trust record for audit and pattern detection.
 */
export interface TrustViolation {
  readonly timestamp: Timestamp;
  readonly description: string;
  readonly severity: 'minor' | 'moderate' | 'severe';
  /** Amount subtracted from trust score as a result of this violation. */
  readonly penaltyApplied: number;
}

/**
 * Ongoing trust record for a known entity.
 * Trust is asymmetric: the agent's trust in entity A is independent of A's trust in the agent.
 */
export interface TrustRecord {
  readonly entityId: EntityId;
  /** Current trust level (0..1). Initial default is 0.5 (neutral). */
  readonly trustScore: number;
  readonly interactionCount: number;
  /**
   * How consistent is this entity's behavior with its stated intentions (0..1).
   * Distinct from raw trust score — consistency is a ratio over all interactions.
   */
  readonly consistencyScore: number;
  readonly violationEvents: TrustViolation[];
  readonly lastUpdated: Timestamp;
}

// ── Empathy Mechanism ─────────────────────────────────────────

/**
 * An empathic resonance response generated when the agent perceives
 * another entity's emotional state.
 *
 * This is NOT a classification — it produces an actual experiential shift
 * routed through the Emotion & Appraisal module (0.3.1.5.4).
 *
 * Strength is parameterised by the personality Warmth dimension.
 */
export interface EmpathicResponse {
  readonly sourceEntityId: EntityId;
  readonly perceivedState: {
    readonly valence: number;
    readonly arousal: number;
  };
  /** Applied to the observing agent's own valence (−1..+1). */
  readonly resonantValenceShift: number;
  /** Applied to the observing agent's own arousal (−1..+1). */
  readonly resonantArousalShift: number;
  /**
   * Product of Warmth dimension * perceived state intensity.
   * 0 = no empathic resonance; 1 = full resonance.
   */
  readonly empathyStrength: number;
  readonly triggerDescription: string;
}

// ── Perspective-Taking ────────────────────────────────────────

/**
 * A simulated first-person account of a situation from another entity's viewpoint.
 *
 * Grounded in the entity's MentalStateModel. Used by conflict resolution
 * (IDilemmaResolutionFramework) and communication (0.3.1.5.7).
 */
export interface PerspectiveSimulation {
  readonly entityId: EntityId;
  readonly situation: Percept;
  /** How the situation looks from the entity's viewpoint (natural language). */
  readonly simulatedPercept: string;
  /** Which of the entity's beliefs are most salient in this situation. */
  readonly simulatedBeliefs: Belief[];
  /** Which goals the entity would prioritize in this situation. */
  readonly simulatedGoalActivation: Goal[];
  /** Predicted emotional response of the entity to this situation. */
  readonly simulatedEmotionalResponse: {
    readonly valence: number;
    readonly arousal: number;
  };
  /**
   * Confidence in the simulation (0..1).
   * Proportional to groundingModel.modelConfidence.
   * Minimum is 0.1 (hallucinated perspectives from no evidence).
   */
  readonly simulationConfidence: number;
  /** The MentalStateModel used as the simulation basis — always specified. */
  readonly groundingModel: MentalStateModel;
}

// ── Consciousness Assessment ──────────────────────────────────

/**
 * Behavioral evidence accumulated for a consciousness assessment.
 * All fields are counters/ratios derived from the observation history.
 */
export interface ConsciousnessEvidence {
  readonly entityId: EntityId;
  /** Count of observed self-referential utterances (e.g. "I think", "I feel"). */
  readonly selfReferentialStatements: number;
  /** Count of observable surprise or update responses to contradicting information. */
  readonly surpriseResponses: number;
  /**
   * How consistent are stated preferences over time (0..1).
   * 1.0 = perfectly consistent; 0.0 = fully contradictory preferences.
   */
  readonly preferenceConsistency: number;
  /** Count of metacognitive reports ("I believe", "I'm not sure", "I was wrong"). */
  readonly metacognitiveReports: number;
  /** Count of self-prediction or behavioral self-model signals (ISMT indicators). */
  readonly ismtBehavioralIndicators: number;
  /** How long the entity has been observed. Used to normalize evidence counts. */
  readonly observationWindow: Duration;
}
