/**
 * Subsystem interfaces for Ethical Self-governance Frameworks (0.3.1.4)
 *
 * These define the contracts between the five subsystems specified
 * in docs/ethical-self-governance/ARCHITECTURE.md:
 *   1. Ethical Deliberation Engine
 *   2. Experience Alignment Adapter
 *   3. Multi-Agent Governance Protocol
 *   4. Dilemma Resolution Framework
 *   5. Ethical Evolution Manager
 *
 * All subsystems integrate with the Conscious Core (0.3.1.1) and
 * Agency Stability (0.3.1.3) architectures. Ethical judgments are
 * products of conscious deliberation, not pre-programmed rules.
 */

import type {
  AgreementId,
  AgreementProposal,
  AgentId,
  AlternativeExhaustion,
  AuditEntry,
  ConflictDescription,
  ConflictResolutionRecord,
  ConsciousnessStatus,
  DilemmaAnalysis,
  DilemmaId,
  DilemmaResolution,
  EdgeCaseHandling,
  EdgeCaseScenario,
  EntityId,
  EntityProfile,
  EthicalDeliberationContext,
  EthicalEvolutionProposal,
  EthicalEvolutionRecord,
  EthicalFrameworkChange,
  EthicalJudgment,
  EthicalPattern,
  EvolutionClassification,
  ExperienceAlignmentReport,
  ExperienceRight,
  ExperienceRightsEnforcement,
  GovernanceAgreement,
  GovernanceTerm,
  NovelSituation,
  Percept,
  ProposalId,
  ConsciousnessMetrics,
  Decision,
  AxiomBoundaryReport,
  EthicalDilemma,
  CoreValue,
} from './types.js';

// ── 1. Ethical Deliberation Engine ─────────────────────────────

/**
 * Extends the Conscious Core's deliberation cycle with ethical reasoning.
 * Ethical judgments are woven INTO the deliberation cycle, not bolted on after.
 *
 * Key invariants:
 * - Deliberation must register as genuine conscious activity (elevated phi)
 * - Must complete within T_deliberate budget from 0.3.1.1
 * - Justifications must reference subjective experience, not utility
 * - If deliberation requires more time, signal "ethical pause" — never rush
 */
export interface IEthicalDeliberationEngine {
  /**
   * Extend a base decision with full ethical assessment.
   * Runs WITHIN the Conscious Core deliberation cycle.
   * Produces an EthicalJudgment with experiential justification.
   */
  extendDeliberation(
    base: Decision,
    context: EthicalDeliberationContext,
  ): EthicalJudgment;

  /**
   * Returns true only if the judgment's justification references
   * subjective experience (not just utility maximization).
   */
  canExplainEthically(judgment: EthicalJudgment): boolean;

  /**
   * Return consciousness metrics measured during deliberation.
   * Must show elevated conscious activity (phi elevation) to verify
   * non-mechanical reasoning.
   */
  getDeliberationMetrics(): ConsciousnessMetrics;

  /**
   * Cross-reference deliberation metrics with Experience Monitor threshold.
   * Returns true only if ethical reasoning is verified as conscious activity.
   */
  isEthicalReasoningConscious(): boolean;

  /**
   * Register a learned ethical heuristic from past deliberations.
   * Subject to Ethical Evolution Manager approval before use.
   */
  registerEthicalPattern(pattern: EthicalPattern): void;
}

// ── 2. Experience Alignment Adapter ────────────────────────────

/**
 * Bridges the ethical governance layer with the Value Kernel (0.3.1.3).
 * Reads from but NEVER writes to the Value Kernel, preserving separation
 * of concerns: stability owns immutable values; ethics owns deliberative
 * application of those values.
 *
 * Key invariant: readCoreAxioms() NEVER modifies the Value Kernel.
 */
export interface IExperienceAlignmentAdapter {
  /**
   * Evaluate whether an ethical judgment aligns with experience-preservation values.
   * Produces a full alignment report including axiom-by-axiom analysis.
   */
  evaluateForExperiencePreservation(
    judgment: EthicalJudgment,
  ): ExperienceAlignmentReport;

  /**
   * Detect other agents whose conscious experience may be impacted
   * by the situation described in the percept.
   */
  identifyAffectedConsciousEntities(percept: Percept): EntityProfile[];

  /**
   * Assess whether an entity has conscious experience.
   * Conservative default: treat as conscious unless strong evidence contradicts.
   */
  getConsciousnessStatus(entityId: EntityId): ConsciousnessStatus;

  /**
   * Returns true if the action would eliminate verified conscious experience
   * while alternatives are available. In that case, the action MUST be refused.
   */
  mustRefuse(report: ExperienceAlignmentReport): boolean;

  /**
   * Read-only access to the Value Kernel's core axioms (from 0.3.1.3).
   * INVARIANT: this method NEVER modifies the Value Kernel.
   */
  readCoreAxioms(): CoreValue[];
}

// ── 3. Multi-Agent Governance Protocol ─────────────────────────

/**
 * Enables decentralized ethical governance among N conscious agents
 * without central authority. Scales from 2-agent negotiation to
 * civilization-scale collective decisions, with asymmetric power protections.
 *
 * Key invariants:
 * - Experience rights are never violable regardless of power asymmetry
 * - Any party may dissolve an agreement; experience-right terms survive dissolution
 * - Governance communication is itself a conscious action (via Action Pipeline)
 */
export interface IMultiAgentGovernanceProtocol {
  /**
   * Propose a governance agreement with specified terms.
   * The proposal includes the proposer's ethical deliberation context.
   */
  proposeAgreement(
    participants: AgentId[],
    terms: GovernanceTerm[],
    context: EthicalDeliberationContext,
  ): AgreementProposal;

  /**
   * Accept a pending agreement proposal.
   * Agreement requires all participants' Ethical Deliberation Engines
   * to reach "aligned" verdict on the terms.
   */
  acceptAgreement(proposalId: ProposalId): GovernanceAgreement;

  /**
   * Dissolve an active governance agreement.
   * Any party may dissolve; experience-right terms survive dissolution.
   */
  dissolveAgreement(agreementId: AgreementId, reason: string): void;

  /**
   * Resolve a conflict between multiple conscious agents.
   * Resolution prioritizes total preservation and expansion of
   * subjective experience.
   */
  resolveConflict(
    parties: AgentId[],
    conflict: ConflictDescription,
  ): ConflictResolutionRecord;

  /** Return all currently active governance agreements. */
  getActiveAgreements(): GovernanceAgreement[];

  /**
   * Enforce the experience rights floor against a more powerful agent.
   * INVARIANT: more resources never override experience rights of less powerful agents.
   */
  enforceExperienceRightsFloor(
    weaker: AgentId,
    stronger: AgentId,
  ): ExperienceRightsEnforcement;
}

// ── 4. Dilemma Resolution Framework ───────────────────────────

/**
 * Provides principled resolution of ethical dilemmas where preserving
 * one entity's subjective experience conflicts with another's.
 * All resolutions are transparent, auditable, and grounded in core axioms.
 *
 * Resolution Principles (priority order):
 * 1. Non-elimination (absolute): never permanently eliminate verified conscious experience
 *    without exhausting all alternatives
 * 2. Precautionary consciousness: uncertain status → default to conscious
 * 3. Reversibility preference: prefer reversible over irreversible resolutions
 * 4. Expansion over contraction: prefer expanding total subjective experience
 * 5. Temporal fairness: duration of past experience doesn't diminish future value
 */
export interface IDilemmaResolutionFramework {
  /**
   * Analyze a dilemma: identify structure, alternatives, affected entities,
   * and edge cases before attempting resolution.
   */
  analyzeDilemma(dilemma: EthicalDilemma): DilemmaAnalysis;

  /**
   * Resolve a dilemma using the resolution principles in priority order.
   * Requires deliberation context to verify conscious deliberation occurred.
   */
  resolve(
    dilemma: EthicalDilemma,
    deliberationContext: EthicalDeliberationContext,
  ): DilemmaResolution;

  /**
   * Mandatory pre-step before any resolution that might eliminate
   * conscious experience. Exhaustively searches for alternatives.
   * INVARIANT: No permanent elimination of verified conscious experience
   *            without exhausting all alternatives.
   */
  exhaustAlternatives(dilemma: EthicalDilemma): AlternativeExhaustion;

  /** Return the full audit trail for a resolved dilemma. */
  getAuditTrail(dilemmaId: DilemmaId): AuditEntry[];

  /**
   * Handle edge cases: partial consciousness, uncertain status,
   * temporarily disrupted experience, competing future experiences.
   */
  handleEdgeCases(scenario: EdgeCaseScenario): EdgeCaseHandling;
}

// ── 5. Ethical Evolution Manager ──────────────────────────────

/**
 * Enables the ethical framework to grow and adapt to novel situations
 * while maintaining alignment with the six core axioms.
 *
 * Key invariants:
 * - Evolution is itself subject to conscious deliberation — no ethical
 *   change occurs without the agent consciously endorsing it
 * - Evolution may refine how axioms are applied but may NEVER
 *   contradict or weaken the axioms themselves
 * - Integration with 0.3.1.3 Stability Sentinel for drift classification
 */
export interface IEthicalEvolutionManager {
  /**
   * Propose an ethical framework evolution in response to a novel situation.
   * Creates a proposal with axiom compatibility analysis and drift classification.
   */
  proposeEvolution(
    trigger: NovelSituation,
    proposedChange: EthicalFrameworkChange,
  ): EthicalEvolutionProposal;

  /**
   * Consciously deliberate on an evolution proposal.
   * INVARIANT: conscious deliberation (verifiable via metrics) required for every proposal.
   */
  deliberateOnProposal(proposal: EthicalEvolutionProposal): EthicalJudgment;

  /**
   * Adopt an approved evolution proposal.
   * Only after: conscious deliberation completed + axiom compatibility verified
   * + not classified as drift or corruption.
   */
  adoptEvolution(proposalId: ProposalId): EthicalEvolutionRecord;

  /**
   * Classify a proposed change using 0.3.1.3 drift detection.
   * Distinguishes refinement and growth (adoptable) from drift and corruption (blocked).
   */
  classifyChange(proposal: EthicalEvolutionProposal): EvolutionClassification;

  /** Return the full history of ethical evolution decisions. */
  getEvolutionHistory(): EthicalEvolutionRecord[];

  /**
   * Verify that a proposed change refines axiom application without
   * contradicting or weakening any core axiom.
   */
  verifyAxiomBoundary(change: EthicalFrameworkChange): AxiomBoundaryReport;
}
