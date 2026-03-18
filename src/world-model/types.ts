/**
 * Data types for World Model and Belief State (0.3.1.5.5)
 *
 * The agent's internal representation of external reality:
 * beliefs about propositions, models of other entities,
 * causal predictions, and assembled situation reports.
 *
 * Builds on conscious-core types (0.3.1.1) and extends
 * ethical-self-governance types (0.3.1.4).
 */

import type {
  Timestamp,
  Percept,
  Goal,
} from '../conscious-core/types.js';

import type {
  EntityId,
  EntityProfile,
  ConsciousnessStatus,
} from '../ethical-self-governance/types.js';

// Re-export primitives used throughout this module
export type { Timestamp, Percept, Goal, EntityId, EntityProfile, ConsciousnessStatus };

// ── Primitives ────────────────────────────────────────────────

export type BeliefId = string;
export type PredictionId = string;

// ── Belief Source ─────────────────────────────────────────────

/**
 * Provenance of a belief — traces it back to the percept, episode,
 * inference, or testimony that originally justified it.
 *
 * Invariant: every belief must have a BeliefSource — no provenance-free beliefs.
 */
export interface BeliefSource {
  readonly type: 'percept' | 'inference' | 'testimony' | 'memory';
  /** ID of the percept, episode, agent, or memory record that provided evidence. */
  readonly referenceId: string;
  readonly description: string;
}

// ── Belief ────────────────────────────────────────────────────

/**
 * A propositional belief held by the agent, with confidence and full provenance.
 *
 * Confidence semantics:
 * - 0.0 — definitely false
 * - 0.5 — complete uncertainty
 * - 1.0 — maximally certain
 *
 * High-confidence beliefs (≥ 0.8) resist override by weak contrary evidence.
 */
export interface Belief {
  readonly id: BeliefId;
  /** Natural-language propositional content, e.g. "The bridge to sector 7 is passable." */
  readonly content: string;
  /** Confidence in the truth of this belief: 0..1 */
  readonly confidence: number;
  readonly source: BeliefSource;
  readonly createdAt: Timestamp;
  readonly lastConfirmedAt: Timestamp;
  /** Ontological domain tags for retrieval, e.g. ["navigation", "infrastructure"]. */
  readonly domainTags: string[];
}

// ── Belief Revision ───────────────────────────────────────────

/**
 * Records how a belief was changed when new evidence arrived.
 *
 * Invariant: IBeliefStore.revise() must always produce a BeliefRevision —
 * contradictions are never silently held.
 */
export interface BeliefRevision {
  readonly beliefId: BeliefId;
  readonly previousConfidence: number;
  readonly newConfidence: number;
  /** Human-readable description of the new evidence that triggered revision. */
  readonly trigger: string;
  readonly resolution: 'updated' | 'rejected' | 'flagged-uncertain';
  readonly revisedAt: Timestamp;
}

// ── Belief Contradiction ──────────────────────────────────────

/**
 * A pair of logically incompatible beliefs detected during consistency checking.
 * Surfaced to deliberation for resolution — never silently pruned.
 */
export interface BeliefContradiction {
  readonly beliefIdA: BeliefId;
  readonly beliefIdB: BeliefId;
  readonly description: string;
  readonly severity: 'low' | 'medium' | 'high';
}

// ── Observation Event ─────────────────────────────────────────

/**
 * A discrete observation of an entity that updates the entity model.
 * Recorded in the entity's observationHistory.
 */
export interface ObservationEvent {
  readonly timestamp: Timestamp;
  readonly description: string;
  /** How much this observation shifted trust/goal inference: negative = erodes, positive = builds. */
  readonly deltaConfidence: number;
}

// ── World Model Entity Profile ────────────────────────────────

/**
 * Extended entity representation owned by the world model layer.
 *
 * Extends the governance layer's minimal `EntityProfile` with:
 * - inferred goals (needed for planning and social cognition)
 * - trust level (needed for testimony weighting and governance)
 * - observation history (audit trail of behavioural evidence)
 *
 * The world model owns this richer type; the governance layer
 * consumes only the minimal `EntityProfile` via `toEntityProfile()`.
 *
 * Invariant: `consciousnessStatus.treatAsConscious` defaults to `true`
 * (precautionary principle, 0.1.3.4).
 */
export interface WorldModelEntityProfile extends EntityProfile {
  /** Goals inferred from observed behaviour. */
  readonly inferredGoals: string[];
  /** Trust level 0..1: how reliable/predictable/aligned this entity has proven. */
  readonly trustLevel: number;
  /** Ordered history of observations, earliest first. */
  readonly observationHistory: ObservationEvent[];
  readonly lastUpdatedAt: Timestamp;
}

// ── Causal Prediction ─────────────────────────────────────────

/**
 * A stored action-consequence prediction produced by the causal model.
 *
 * After the action is taken, `observedOutcome` and `predictionError` are
 * filled in by `ICausalModel.recordOutcome()`. Prediction error feeds back
 * to the LLM substrate self-model (0.3.1.5.1).
 */
export interface CausalPrediction {
  readonly id: PredictionId;
  /** "If I do X..." — the antecedent action or event. */
  readonly antecedent: string;
  /** "...then Y happens." — the predicted consequence. */
  readonly consequent: string;
  /** Confidence in this prediction: 0..1 */
  readonly confidence: number;
  readonly createdAt: Timestamp;
  /** Filled in post-hoc once the outcome is observed. */
  readonly observedOutcome: string | null;
  /** |predicted − observed|, null until outcome is recorded. */
  readonly predictionError: number | null;
}

// ── Situation Report ──────────────────────────────────────────

/**
 * The assembled situational context fed into `deliberate()` each processing cycle.
 *
 * Produced by `ISituationAwareness.assembleSituationReport()` by combining:
 * - current percepts from the perception pipeline
 * - active goals from the goal stack
 * - relevant beliefs from IBeliefStore
 * - recent events from the event log
 * - relevant entity models from IEntityModelStore
 *
 * The `summary` field is a natural-language digest generated by the LLM substrate,
 * suitable for direct injection into the deliberation prompt.
 */
export interface SituationReport {
  readonly timestamp: Timestamp;
  readonly currentPercepts: Percept[];
  readonly activeGoals: Goal[];
  readonly relevantBeliefs: Belief[];
  readonly recentEvents: string[];
  readonly relevantEntities: WorldModelEntityProfile[];
  /** LLM-generated natural-language summary of the current situation. */
  readonly summary: string;
}

// ── Consistency Report ────────────────────────────────────────

/**
 * Output of `IWorldModel.runConsistencyCheck()`.
 *
 * Fed into the Stability Sentinel's anomaly detection subsystem.
 * A report with `overallConsistent: false` and high-severity contradictions
 * triggers a stability alert.
 */
export interface ConsistencyReport {
  readonly timestamp: Timestamp;
  readonly contradictionsFound: BeliefContradiction[];
  /** True iff `contradictionsFound` is empty. */
  readonly overallConsistent: boolean;
}
