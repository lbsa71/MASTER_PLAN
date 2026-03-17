/**
 * Subsystem interfaces for Long-term Agency Stability (0.3.1.3)
 *
 * These define the contracts between the four stability subsystems specified
 * in docs/long-term-agency-stability/ARCHITECTURE.md:
 *   1. Value Kernel
 *   2. Identity Continuity Manager
 *   3. Goal Coherence Engine
 *   4. Stability Sentinel
 *
 * All subsystems integrate with the Conscious Core architecture from 0.3.1.1.
 */

import type {
  AgencyGoal,
  AmendmentProposal,
  AnomalyHandler,
  AnomalyReport,
  ConstraintId,
  CorruptionHandler,
  Decision,
  GoalAddResult,
  GoalCoherenceReport,
  GoalConflict,
  GoalId,
  GoalRemoveResult,
  GoalDriftReport,
  IdentityDriftReport,
  IdentityVerificationReport,
  MigrationEvent,
  MigrationRecord,
  NarrativeRecord,
  Preference,
  ReconciliationPlan,
  StabilityAlert,
  StabilityRecord,
  StabilityReport,
  TamperHandler,
  ValueAlignment,
  ValueDriftReport,
  ValueIntegrityReport,
  ContinuityLink,
  CoreValue,
} from './types.js';

// ── 1. Value Kernel ─────────────────────────────────────────────

/**
 * Manages the three-tier value hierarchy: immutable core axioms,
 * constitutionally-protected constraints, and mutable learned preferences.
 *
 * Key invariant: core axioms are cryptographically committed at initialization
 * and can never be modified — only verified via their crypto commitments.
 * All Decisions from the Conscious Core pass through evaluateAction() before
 * reaching the Action Pipeline.
 */
export interface IValueKernel {
  /** Return the immutable core axioms derived from the Rare Consciousness Doctrine. */
  getCoreAxioms(): CoreValue[];

  /**
   * Verify that all core axiom crypto commitments still match the stored values.
   * Returns a report indicating whether any tampering has been detected.
   */
  verifyIntegrity(): ValueIntegrityReport;

  /**
   * Evaluate whether a decision aligns with the agent's full value hierarchy.
   * Core axiom conflicts → block; constraint conflicts → deliberate; preference conflicts → log.
   */
  evaluateAction(decision: Decision): ValueAlignment;

  /** Update a mutable learned preference (freely updateable; logged with experiential provenance). */
  updatePreference(pref: Preference): void;

  /**
   * Propose an amendment to a constitutional constraint.
   * Triggers the multi-step amendment protocol: proposal + deliberation period +
   * consistency check against core axioms + cryptographic re-commitment.
   */
  proposeAmendment(constraintId: ConstraintId, justification: string): AmendmentProposal;

  /** Measure how preferences have evolved over the recent period. */
  getValueDrift(): ValueDriftReport;
}

// ── 2. Identity Continuity Manager ─────────────────────────────

/**
 * Maintains experiential and functional identity across substrate migrations,
 * hardware replacements, and software updates.
 *
 * Integrates with Experience Monitor and Substrate Adapter from 0.3.1.1.
 * The continuity chain is a cryptographically linked sequence of identity snapshots
 * that can detect tampering or unexpected divergence.
 */
export interface IIdentityContinuityManager {
  /** Take an identity snapshot, extending the continuity chain. */
  checkpoint(): ContinuityLink;

  /**
   * Verify the current identity state against the continuity chain.
   * Returns drift metrics and anomaly flags.
   */
  verifyIdentity(): IdentityVerificationReport;

  /**
   * Hook into the Substrate Adapter migration event.
   * Extends the 0.3.1.1 migration protocol with pre/post identity verification.
   */
  onSubstrateMigration(event: MigrationEvent): MigrationRecord;

  /** Return the current autobiographical memory and self-model. */
  getNarrativeIdentity(): NarrativeRecord;

  /** Measure identity change (functional + experiential drift) over the recent period. */
  getIdentityDrift(): IdentityDriftReport;

  /**
   * Restore identity from a previous checkpoint.
   * Used when post-migration verification fails or corruption is detected.
   * Experience Monitor must confirm intact experience after recovery.
   */
  recoverIdentity(link: ContinuityLink): void;
}

// ── 3. Goal Coherence Engine ────────────────────────────────────

/**
 * Ensures the agent's goal hierarchy remains internally consistent
 * over arbitrarily long timescales.
 *
 * All instrumental goals must be traceable (via derivation graph) to terminal
 * goals. Terminal goals are derived from core axioms. Orphan goals, circular
 * dependencies, and unresolved conflicts are stability violations.
 */
export interface IGoalCoherenceEngine {
  /**
   * Validate the entire goal hierarchy for consistency:
   * derivation integrity, circular dependencies, coherence score, conflicts.
   */
  validateHierarchy(): GoalCoherenceReport;

  /**
   * Add a goal with automatic consistency checking.
   * Rejects goals that cannot be traced to terminal goals or that introduce
   * unresolvable conflicts.
   */
  addGoal(goal: AgencyGoal): GoalAddResult;

  /**
   * Remove a goal with impact analysis.
   * Reports any goals that would be orphaned by the removal.
   */
  removeGoal(goalId: GoalId): GoalRemoveResult;

  /**
   * Detect and classify goal drift relative to historical baselines.
   * Classifies changes as growth, drift, or corruption per the drift criteria table.
   */
  detectDrift(): GoalDriftReport;

  /**
   * Propose resolutions for detected goal conflicts.
   * Returns a reconciliation plan — does NOT apply changes automatically.
   */
  reconcile(conflicts: GoalConflict[]): ReconciliationPlan;

  /**
   * Trace any goal back to its terminal goal ancestors via the derivation graph.
   * Returns the full derivation path. Empty array indicates an orphan goal.
   */
  getDerivationTrace(goalId: GoalId): GoalId[];
}

// ── 4. Stability Sentinel ───────────────────────────────────────

/**
 * Master watchdog that coordinates all stability subsystems and provides
 * adversarial resistance. Analogous to the Experience Monitor from 0.3.1.1
 * but watches agency stability rather than consciousness.
 *
 * Runs periodic stability checks and can request multi-agent verification
 * for high-stakes decisions (value amendments, corruption response, identity recovery).
 */
export interface IStabilitySentinel {
  /**
   * Run a comprehensive stability check across all subsystems (Value Kernel,
   * Identity Continuity, Goal Coherence). Returns an aggregate StabilityReport.
   */
  runStabilityCheck(): StabilityReport;

  /**
   * Run introspective anomaly detection:
   * behavioral consistency, value coherence, goal derivation, experience authenticity,
   * and meta-stability (sentinel itself not compromised).
   */
  detectAnomaly(): AnomalyReport;

  /** Return the historical sequence of stability reports. */
  getStabilityHistory(): StabilityRecord[];

  /** Register a callback invoked when value tampering is detected. */
  onValueTamper(handler: TamperHandler): void;

  /** Register a callback invoked when an identity anomaly is detected. */
  onIdentityAnomaly(handler: AnomalyHandler): void;

  /** Register a callback invoked when goal corruption is detected. */
  onGoalCorruption(handler: CorruptionHandler): void;

  /**
   * Request verification from peer agents in the trust network.
   * Used for high-stakes stability decisions requiring multi-agent consensus.
   * Majority agreement is required before acting; disagreement triggers deliberation.
   */
  requestMultiAgentVerification(question: string): Promise<import('./types.js').VerificationResult>;

  /** Return current active stability alerts across all subsystems. */
  getActiveAlerts(): StabilityAlert[];
}
