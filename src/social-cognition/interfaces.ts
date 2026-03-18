/**
 * Interface for the Social Cognition Module (0.3.1.5.10)
 *
 * Provides the cognitive machinery that enables:
 * - Mental state attribution (theory of mind)
 * - Trust modeling over repeated interactions
 * - Empathic resonance responses
 * - Perspective-taking (first-person simulation of another's viewpoint)
 * - Evidence-based consciousness assessment
 * - Entity enumeration for ethical governance
 *
 * Injected into ExperienceAlignmentAdapter to back getConsciousnessStatus()
 * and identifyAffectedConsciousEntities() with live cognitive assessments
 * rather than a static registry.
 */

import type {
  EntityId,
  MentalStateModel,
  TrustRecord,
  EmpathicResponse,
  PerspectiveSimulation,
  EntityObservation,
  InteractionOutcome,
  ExperientialState,
  Percept,
  ConsciousnessStatus,
  EntityProfile,
} from './types.js';

export interface ISocialCognitionModule {
  // ── Mental State Attribution ──────────────────────────────

  /**
   * Record a new behavioral observation of an entity and update its
   * MentalStateModel. Attribution is incremental — each observation
   * Bayesian-updates the existing model.
   */
  observeEntity(entityId: EntityId, observation: EntityObservation): void;

  /**
   * Return the current mental state model for an entity, or null if
   * the entity has never been observed.
   */
  getMentalStateModel(entityId: EntityId): MentalStateModel | null;

  // ── Trust Modeling ────────────────────────────────────────

  /**
   * Return the current trust record for an entity.
   * Creates a default record (trustScore: 0.5, interactionCount: 0)
   * for entities that have never had a recorded interaction.
   */
  getTrustScore(entityId: EntityId): TrustRecord;

  /**
   * Record the outcome of a completed interaction with an entity and
   * update its trust record accordingly.
   *
   * Trust deltas by outcome type:
   * - fulfilled-commitment: +0.05 * magnitude
   * - cooperative:          +0.02 * magnitude
   * - neutral:               0
   * - adversarial:          −0.05 * magnitude
   * - broken-commitment:    −0.10 * magnitude
   * - deception-detected:   −0.25 * magnitude (also logged as violation)
   */
  recordInteraction(entityId: EntityId, outcome: InteractionOutcome): void;

  // ── Empathy Mechanism ─────────────────────────────────────

  /**
   * Generate an empathic resonance response when the agent perceives
   * another entity's experiential state.
   *
   * Returns an EmpathicResponse whose resonantValenceShift and
   * resonantArousalShift should be applied to the agent's own
   * ExperientialState via the Emotion & Appraisal module (0.3.1.5.4).
   *
   * Empathy strength = warmthDimension × |perceivedState.valence|.
   */
  generateEmpathicResponse(
    entityId: EntityId,
    perceivedState: ExperientialState,
  ): EmpathicResponse;

  // ── Perspective-Taking ────────────────────────────────────

  /**
   * Simulate another entity's first-person viewpoint in a given situation.
   *
   * Grounded in the entity's MentalStateModel. If no model exists,
   * uses a default archetype with treatAsConscious: true and reports
   * simulationConfidence: 0.1.
   *
   * Feeds into:
   * - IDilemmaResolutionFramework.resolve() — understanding both sides
   * - Communication module (0.3.1.5.7) — adjusting language for audience
   * - Pre-action prediction — anticipating another agent's response
   */
  simulatePerspective(
    entityId: EntityId,
    situation: Percept,
  ): PerspectiveSimulation;

  // ── Consciousness Assessment ──────────────────────────────

  /**
   * Derive an evidence-based ConsciousnessStatus for an entity from
   * accumulated behavioral signals.
   *
   * Replaces the static registry lookup in ExperienceAlignmentAdapter
   * with dynamic, observation-grounded assessment.
   *
   * INVARIANT: treatAsConscious is never false due to absence of evidence.
   * The precautionary floor always applies.
   */
  assessConsciousness(entityId: EntityId): ConsciousnessStatus;

  // ── Entity Enumeration ────────────────────────────────────

  /**
   * Return EntityProfiles for all entities the module has observed or
   * had interactions recorded for.
   *
   * Feeds ExperienceAlignmentAdapter.identifyAffectedConsciousEntities()
   * with a live, dynamically-maintained entity set.
   */
  getKnownEntities(): EntityProfile[];
}
