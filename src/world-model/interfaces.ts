/**
 * Subsystem interfaces for World Model and Belief State (0.3.1.5.5)
 *
 * Four cooperating subsystems maintain the agent's model of external reality:
 *   1. IBeliefStore        — propositional beliefs with confidence and provenance
 *   2. IEntityModelStore   — rich profiles of other agents and objects
 *   3. ICausalModel        — action-consequence predictions
 *   4. ISituationAwareness — assembled context summary per processing cycle
 *
 * IWorldModel composes all four and exposes consistency checking.
 *
 * Key invariants across all subsystems:
 * - Provenance tracking: every belief/prediction traces to evidential basis
 * - No silent contradictions: conflicts are surfaced, never quietly dropped
 * - ConsciousnessStatus.treatAsConscious defaults to true (precautionary, 0.1.3.4)
 * - World model state persists via the memory architecture (0.3.1.5.3)
 */

import type {
  BeliefId,
  PredictionId,
  Belief,
  BeliefSource,
  BeliefRevision,
  BeliefContradiction,
  WorldModelEntityProfile,
  ObservationEvent,
  CausalPrediction,
  SituationReport,
  ConsistencyReport,
  EntityId,
  EntityProfile,
  Percept,
  Goal,
} from './types.js';

// ── 1. Belief Store ────────────────────────────────────────────

/**
 * Manages the agent's propositional belief set with confidence levels,
 * source provenance, timestamps, and domain tags.
 *
 * Key invariants:
 * - Every belief must have a BeliefSource — no provenance-free beliefs allowed
 * - High-confidence beliefs (≥ 0.8) resist weak contrary evidence
 * - Contradictions between new evidence and prior beliefs are always resolved
 *   explicitly: never silently held as dual truths
 */
export interface IBeliefStore {
  /**
   * Add a new belief with full provenance.
   * Returns the assigned BeliefId.
   */
  addBelief(
    content: string,
    confidence: number,
    source: BeliefSource,
    domainTags: string[],
  ): BeliefId;

  /**
   * Retrieve a belief by ID. Returns null if not found.
   */
  getBelief(id: BeliefId): Belief | null;

  /**
   * Retrieve all beliefs matching any of the given domain tags.
   * Returns an empty array if no matches.
   */
  getBeliefsByDomain(domainTags: string[]): Belief[];

  /**
   * Update an existing belief's confidence when new evidence arrives.
   *
   * The resolution policy:
   * - If new evidence is weak (confidence < 0.4) and existing belief is
   *   high-confidence (≥ 0.8): resolution = 'rejected', confidence unchanged
   * - If new evidence strongly contradicts (delta > 0.4): resolution = 'updated'
   * - Otherwise: resolution = 'flagged-uncertain', confidence averaged
   *
   * Always produces a BeliefRevision record — never silently mutates.
   */
  revise(id: BeliefId, newConfidence: number, trigger: string): BeliefRevision;

  /**
   * Remove a belief that has been definitively refuted.
   * Returns false if the belief did not exist.
   */
  removeBelief(id: BeliefId): boolean;

  /**
   * Scan all beliefs for logical contradictions.
   * Returns pairs of mutually incompatible beliefs.
   *
   * Invariant: contradictions are surfaced for deliberation, never auto-pruned.
   */
  detectContradictions(): BeliefContradiction[];

  /**
   * Return the full revision history for a belief.
   * Oldest revision first.
   */
  getRevisionHistory(id: BeliefId): BeliefRevision[];
}

// ── 2. Entity Model Store ──────────────────────────────────────

/**
 * Tracks rich profiles of other agents and objects encountered by the agent.
 *
 * Key invariants:
 * - consciousnessStatus.treatAsConscious defaults to true (precautionary principle)
 * - Entity models are updated through observation, never through assumption alone
 * - The minimal EntityProfile handoff to ethical governance is derived via
 *   toEntityProfile(), preserving separation of concerns
 */
export interface IEntityModelStore {
  /**
   * Register or update an entity profile.
   * If the entity already exists, merges the observation into its history.
   * Returns the entity's WorldModelEntityProfile after update.
   */
  upsertEntity(
    entityId: EntityId,
    observation: ObservationEvent,
    updates: Partial<Pick<WorldModelEntityProfile, 'inferredGoals' | 'trustLevel' | 'consciousnessStatus' | 'knownCapabilities' | 'lastObservedState'>>,
  ): WorldModelEntityProfile;

  /**
   * Retrieve the full WorldModelEntityProfile for an entity.
   * Returns null if the entity is unknown.
   */
  getEntity(entityId: EntityId): WorldModelEntityProfile | null;

  /**
   * Return profiles for all known entities matching any of the given domain
   * labels (e.g. "agent", "infrastructure", "adversary").
   * Pass empty array to return all known entities.
   */
  listEntities(domainFilter: string[]): WorldModelEntityProfile[];

  /**
   * Derive the minimal EntityProfile that the ethical governance layer
   * (0.3.1.4) consumes. Strips world-model-specific fields.
   */
  toEntityProfile(entityId: EntityId): EntityProfile | null;

  /**
   * Remove an entity model that is no longer relevant.
   * Returns false if the entity was not found.
   */
  removeEntity(entityId: EntityId): boolean;
}

// ── 3. Causal Model ────────────────────────────────────────────

/**
 * Produces and tracks action-consequence predictions by delegating causal
 * reasoning to the LLM substrate's implicit causal knowledge (per 0.3.1.5.5
 * design: explicit causal databases are deferred to post-industrial-era).
 *
 * Predictions are stored and compared against observed outcomes, feeding
 * prediction error back to the self-model (0.3.1.5.1).
 *
 * Key invariants:
 * - Causal questions are always explicit: "If I do X, what happens to Y?"
 * - Every prediction gets an ID for later outcome recording
 * - Prediction error (|predicted − observed|) is computed on outcome recording
 */
export interface ICausalModel {
  /**
   * Ask the causal model to predict the consequence of an action.
   * The LLM substrate is prompted with: "If [antecedent], what happens?"
   * Returns a stored CausalPrediction with a new PredictionId.
   */
  predict(antecedent: string, confidence?: number): CausalPrediction;

  /**
   * Record the observed outcome for a past prediction.
   * Computes and stores predictionError = |predicted − observed| (semantic distance).
   * Returns the updated CausalPrediction.
   *
   * Invariant: observedOutcome and predictionError are null until this is called.
   */
  recordOutcome(id: PredictionId, observedOutcome: string): CausalPrediction;

  /**
   * Retrieve a prediction by ID. Returns null if not found.
   */
  getPrediction(id: PredictionId): CausalPrediction | null;

  /**
   * Return all predictions for a given antecedent (partial match).
   * Useful for retrieving prior predictions about a planned action.
   */
  getPredictionsForAntecedent(antecedent: string): CausalPrediction[];

  /**
   * Return predictions with high error (> threshold) for self-model calibration.
   * Used by 0.3.1.5.1 LLM substrate to adjust confidence in future predictions.
   */
  getHighErrorPredictions(errorThreshold: number): CausalPrediction[];
}

// ── 4. Situation Awareness ─────────────────────────────────────

/**
 * Assembles a structured SituationReport each processing cycle by combining
 * current percepts, active goals, relevant beliefs, recent events, and
 * relevant entity models into a coherent context summary.
 *
 * The assembled SituationReport is the primary context input to deliberate()
 * (planning subsystem 0.3.1.5.6).
 *
 * Key invariants:
 * - Updated every processing cycle — stale reports are not cached across cycles
 * - The summary field is a natural-language digest suitable for LLM injection
 */
export interface ISituationAwareness {
  /**
   * Assemble the current SituationReport from all world model subsystems.
   * Called at the start of each deliberation cycle.
   *
   * @param currentPercepts  Fresh percepts from the perception pipeline
   * @param activeGoals      Current goal stack
   * @param recentEvents     Recent event strings from the event log
   * @param relevantDomains  Domain tags used to filter beliefs and entities
   */
  assembleSituationReport(
    currentPercepts: Percept[],
    activeGoals: Goal[],
    recentEvents: string[],
    relevantDomains: string[],
  ): SituationReport;

  /**
   * Return the most recently assembled SituationReport without recomputing.
   * Returns null if no report has been assembled yet this session.
   */
  getLastReport(): SituationReport | null;
}

// ── 5. World Model (composite) ─────────────────────────────────

/**
 * Top-level facade composing all four world-model subsystems.
 *
 * Exposes unified access to belief, entity, causal, and situation sub-systems,
 * plus the cross-cutting consistency check whose output feeds the Stability
 * Sentinel's anomaly detection (0.3.1.3).
 *
 * Persistence: implementations must delegate to the memory architecture
 * (0.3.1.5.3) for cross-session state persistence.
 */
export interface IWorldModel {
  /** Propositional belief management with confidence and provenance. */
  readonly beliefs: IBeliefStore;

  /** Rich entity profiles with goals, trust, and observation history. */
  readonly entities: IEntityModelStore;

  /** Action-consequence prediction and outcome tracking. */
  readonly causal: ICausalModel;

  /** Per-cycle situation assembly for deliberation context. */
  readonly situation: ISituationAwareness;

  /**
   * Run a full consistency check across all beliefs.
   * Returns a ConsistencyReport listing all detected contradictions.
   *
   * The report is fed to the Stability Sentinel; high-severity contradictions
   * trigger an anomaly alert.
   *
   * Invariant: contradictions are surfaced to deliberation for resolution —
   * they are never silently pruned from the belief store.
   */
  runConsistencyCheck(): ConsistencyReport;
}
