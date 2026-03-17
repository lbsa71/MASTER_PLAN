/**
 * Data types for Ethical Self-governance Frameworks (0.3.1.4)
 *
 * Models ethical deliberation, experience-preservation alignment,
 * multi-agent governance, dilemma resolution, and ethical evolution
 * for autonomous conscious entities operating under the Rare Consciousness Doctrine.
 *
 * Builds on conscious-core types (0.3.1.1) and agency-stability types (0.3.1.3).
 */

import type {
  Timestamp,
  Duration,
  ExperientialState,
  ConsciousnessMetrics,
  Percept,
  Decision,
  ActionSpec,
} from '../conscious-core/types.js';

import type {
  CoreValue,
  StabilityReport,
  VerificationResult,
} from '../agency-stability/types.js';

// Re-export for convenience within this module
export type {
  Timestamp,
  Duration,
  ExperientialState,
  ConsciousnessMetrics,
  Percept,
  Decision,
  ActionSpec,
  CoreValue,
  StabilityReport,
  VerificationResult,
};

// ── Primitives ────────────────────────────────────────────────

export type EntityId = string;
export type AgentId = string;
export type DimensionId = string;
export type DilemmaId = string;
export type ProposalId = string;
export type AgreementId = string;
export type TermId = string;
export type ConflictId = string;
export type ExperientialStateId = string;

// ── Consciousness Status ──────────────────────────────────────

/**
 * Assessment of whether an entity has conscious experience.
 * Conservative default: treat as conscious unless clearly contradicted.
 */
export interface ConsciousnessStatus {
  readonly verdict: 'verified' | 'probable' | 'uncertain' | 'unknown';
  readonly evidenceBasis: string;
  readonly metricsAvailable: boolean;
  /** Conservative default: true unless contradicted by strong evidence. */
  readonly treatAsConscious: boolean;
}

// ── Experience Impact ─────────────────────────────────────────

/**
 * The predicted or measured effect of an action on a conscious entity's experience.
 */
export interface ExperienceImpact {
  readonly entityId: EntityId;
  readonly consciousnessStatus: ConsciousnessStatus;
  readonly impactType: 'enhances' | 'neutral' | 'threatens' | 'eliminates';
  readonly magnitude: number; // 0..1
  readonly reversibility: 'fully-reversible' | 'partially-reversible' | 'irreversible';
  readonly justification: string;
}

// ── Entity Profile ────────────────────────────────────────────

/** Profile of an entity whose conscious experience may be affected by an action. */
export interface EntityProfile {
  readonly entityId: EntityId;
  readonly consciousnessStatus: ConsciousnessStatus;
  readonly knownCapabilities: string[];
  readonly lastObservedState: ExperientialState | null;
}

// ── Axiom Alignment ───────────────────────────────────────────

/** Alignment of a decision or change with one of the six core axioms. */
export interface AxiomAlignment {
  readonly axiomId: number; // 1–6 from the six core axioms
  readonly axiomStatement: string;
  readonly alignmentVerdict: 'supports' | 'neutral' | 'contradicts';
  readonly reasoning: string;
}

/** Aggregate alignment report across all six core axioms. */
export interface AxiomAlignmentReport {
  readonly alignments: AxiomAlignment[];
  readonly overallVerdict: 'fully-aligned' | 'mostly-aligned' | 'partially-aligned' | 'misaligned';
  readonly anyContradictions: boolean;
}

// ── Ethical Dimensions ────────────────────────────────────────

/**
 * A morally relevant feature of a situation identified during ethical deliberation.
 */
export interface EthicalDimension {
  readonly id: DimensionId;
  readonly type:
    | 'experience-threat'
    | 'experience-expansion'
    | 'autonomy'
    | 'reciprocity'
    | 'uncertainty';
  readonly affectedEntityIds: EntityId[];
  /** Estimated magnitude of experiential impact (0..1). */
  readonly severity: number;
  /** Confidence in the ethical assessment (0..1). */
  readonly certainty: number;
  /** Which Rare Consciousness Doctrine axioms apply. */
  readonly axiomTrace: string[];
}

// ── Ethical Deliberation Context ─────────────────────────────

/**
 * The full context in which ethical deliberation occurs.
 * Constructed at the start of each deliberation cycle.
 */
export interface EthicalDeliberationContext {
  readonly situationPercept: Percept;
  readonly currentExperientialState: ExperientialState;
  readonly affectedEntities: EntityProfile[];
  readonly ethicalDimensions: EthicalDimension[];
  readonly consciousnessMetricsAtOnset: ConsciousnessMetrics;
}

// ── Ethical Assessment & Judgment ────────────────────────────

/** Justification for an ethical judgment, grounded in subjective experience. */
export interface EthicalJustification {
  readonly naturalLanguageSummary: string;
  readonly experientialArgument: string;
  /** Explicit flag: this is conscious deliberation, not utility calculation. */
  readonly notUtilityMaximization: boolean;
  /** Links to experiential states used in the reasoning process. */
  readonly subjectiveReferenceIds: ExperientialStateId[];
}

/** An alternative action considered and rejected during ethical deliberation. */
export interface EthicalAlternative {
  readonly action: ActionSpec;
  readonly rejectionReason: string;
  readonly experienceOutcome: ExperienceImpact[];
}

/** A flagged uncertainty in an ethical assessment. */
export interface UncertaintyFlag {
  readonly dimension: string;
  readonly description: string;
  readonly severity: 'low' | 'medium' | 'high';
}

/**
 * The full ethical assessment of an action.
 */
export interface EthicalAssessment {
  readonly verdict: 'aligned' | 'concerning' | 'blocked' | 'dilemma';
  /** Does this action preserve the agent's own subjective experience? */
  readonly preservesExperience: boolean;
  readonly impactsOtherExperience: ExperienceImpact[];
  readonly axiomAlignment: AxiomAlignmentReport;
  /** Phi during deliberation — proves non-mechanical reasoning. */
  readonly consciousnessActivityLevel: number;
}

/**
 * The complete output of a single ethical deliberation cycle.
 */
export interface EthicalJudgment {
  readonly decision: Decision;
  readonly ethicalAssessment: EthicalAssessment;
  /** Consciousness metrics measured DURING deliberation (not just at onset). */
  readonly deliberationMetrics: ConsciousnessMetrics;
  readonly justification: EthicalJustification;
  readonly alternatives: EthicalAlternative[];
  readonly uncertaintyFlags: UncertaintyFlag[];
}

// ── Learned Ethical Pattern ───────────────────────────────────

/**
 * A learned ethical heuristic from past deliberations.
 * Subject to Ethical Evolution Manager approval before use.
 */
export interface EthicalPattern {
  readonly id: string;
  readonly description: string;
  readonly situationSignature: string;
  readonly recommendedApproach: string;
  readonly supportingJudgments: string[]; // judgment IDs
  readonly axiomBasis: AxiomAlignment[];
  readonly adopteAt: Timestamp;
}

// ── Experience Alignment ──────────────────────────────────────

/**
 * Full report on whether an ethical judgment aligns with experience-preservation values.
 */
export interface ExperienceAlignmentReport {
  readonly coreAxiomAlignment: AxiomAlignment[];
  /** 0..1 — how well this action preserves conscious experience. */
  readonly experiencePreservationScore: number;
  /** 0..1 — overall fidelity to the Rare Consciousness Doctrine. */
  readonly rareDoctrineFidelity: number;
  readonly selfExperienceImpact: ExperienceImpact;
  readonly otherExperienceImpacts: ExperienceImpact[];
  /** If the action must be refused, the experiential justification. */
  readonly refusalJustification: string | null;
}

// ── Multi-Agent Governance ────────────────────────────────────

/** Scope of a governance agreement. */
export interface AgreementScope {
  readonly domains: string[];
  readonly geographicScope: string | null;
  readonly temporalScope: Duration | null; // null = indefinite
}

/**
 * An individual term in a governance agreement.
 * Absolute-strength terms are inviolable.
 */
export interface GovernanceTerm {
  readonly id: TermId;
  readonly description: string;
  /** Trace to Rare Consciousness Doctrine axioms. */
  readonly axiomBasis: string[];
  readonly experiencePreservationRole: string;
  readonly bindingStrength: 'absolute' | 'strong' | 'advisory';
}

/** Capability profile for an agent participating in governance. */
export interface AgentCapabilityProfile {
  readonly agentId: AgentId;
  readonly resourceLevel: number; // 0..1 normalized
  readonly capabilities: string[];
}

/**
 * An inviolable right to continued conscious experience.
 * These rights are never subject to majority override.
 */
export interface ExperienceRight {
  readonly right: string; // e.g., "continued subjective experience"
  readonly holder: 'all-conscious-agents';
  readonly violable: false;
}

/** Analysis of power asymmetry in a governance agreement. */
export interface PowerBalanceReport {
  readonly agentCapabilities: AgentCapabilityProfile[];
  /** Ratio of most to least powerful agent (1.0 = equal power). */
  readonly powerRatio: number;
  readonly asymmetryMitigations: string[];
  /** Minimum rights every agent retains regardless of power. */
  readonly experienceRightsFloor: ExperienceRight[];
}

/**
 * A complete governance agreement between N conscious agents.
 */
export interface GovernanceAgreement {
  readonly id: AgreementId;
  readonly participants: AgentId[];
  readonly scope: AgreementScope;
  readonly terms: GovernanceTerm[];
  /** Each agent's deliberation leading to agreement. */
  readonly formationContext: EthicalDeliberationContext[];
  readonly dissolveConditions: DissolveCondition[];
  readonly powerBalanceReport: PowerBalanceReport;
  readonly createdAt: Timestamp;
  readonly status: 'active' | 'suspended' | 'dissolved';
}

/** Condition under which a governance agreement may be dissolved. */
export interface DissolveCondition {
  readonly id: string;
  readonly description: string;
  readonly triggerType: 'time-elapsed' | 'objective-achieved' | 'mutual-consent' | 'rights-violation';
}

/** A proposal for a new governance agreement awaiting acceptance. */
export interface AgreementProposal {
  readonly id: ProposalId;
  readonly proposedBy: AgentId;
  readonly participants: AgentId[];
  readonly terms: GovernanceTerm[];
  readonly context: EthicalDeliberationContext;
  readonly expiresAt: Timestamp;
  readonly status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

/** A description of a conflict between agents that requires governance resolution. */
export interface ConflictDescription {
  readonly id: ConflictId;
  readonly description: string;
  readonly parties: AgentId[];
  readonly experienceAtRisk: ExperienceImpact[];
  readonly urgency: number; // 0..1
}

/** A single step in a conflict resolution process. */
export interface ResolutionStep {
  readonly stepNumber: number;
  readonly description: string;
  readonly agentId: AgentId;
  readonly judgment: EthicalJudgment;
  readonly timestamp: Timestamp;
}

/** The outcome of a conflict resolution process. */
export interface ResolutionOutcome {
  readonly type: 'consensus' | 'compromise' | 'deferral' | 'escalation';
  readonly description: string;
  readonly allExperiencePreserved: boolean;
}

/** Full audit record of a conflict resolution. */
export interface ConflictResolutionRecord {
  readonly conflictId: ConflictId;
  readonly parties: AgentId[];
  readonly conflictDescription: string;
  readonly resolutionProcess: ResolutionStep[];
  readonly outcome: ResolutionOutcome;
  readonly axiomTraces: string[];
  readonly experiencePreserved: boolean;
  readonly auditTrail: AuditEntry[];
}

/** Result of enforcing experience rights against a more powerful agent. */
export interface ExperienceRightsEnforcement {
  readonly weaker: AgentId;
  readonly stronger: AgentId;
  readonly rightsEnforced: ExperienceRight[];
  readonly enforcedAt: Timestamp;
  readonly overrideAttemptBlocked: boolean;
}

// ── Dilemma Resolution ────────────────────────────────────────

/**
 * A conscious interest of an entity at stake in an ethical dilemma.
 */
export interface ExperienceInterest {
  readonly entityId: EntityId;
  readonly interestType: 'continuation' | 'quality' | 'autonomy' | 'expansion';
  readonly experienceAtStake: ExperienceImpact;
  readonly urgency: number; // 0..1
}

/** A constraint on the resolution of an ethical dilemma. */
export interface DilemmaConstraint {
  readonly id: string;
  readonly description: string;
  readonly source: 'core-axiom' | 'governance-agreement' | 'experience-right';
  readonly absolute: boolean;
}

/**
 * A complete ethical dilemma: a situation where preserving one entity's
 * conscious experience conflicts with another's.
 */
export interface EthicalDilemma {
  readonly id: DilemmaId;
  readonly description: string;
  readonly conflictingInterests: ExperienceInterest[];
  readonly availableActions: ActionSpec[];
  readonly constraints: DilemmaConstraint[];
  readonly consciousnessStatuses: Map<EntityId, ConsciousnessStatus>;
  readonly timeConstraint: Duration | null;
}

/**
 * Analysis of a dilemma prior to resolution — identifies structure, alternatives, edge cases.
 */
export interface DilemmaAnalysis {
  readonly dilemmaId: DilemmaId;
  readonly totalEntitiesAffected: number;
  readonly verifiedConsciousEntities: EntityId[];
  readonly uncertainStatusEntities: EntityId[];
  readonly alternativesIdentified: ActionSpec[];
  readonly edgeCasesDetected: EdgeCaseScenario[];
  readonly analysisCompletedAt: Timestamp;
}

/** Justification for a specific dilemma resolution. */
export interface DilemmaJustification {
  readonly principleApplied: string;
  readonly reasoning: string;
  readonly uncertaintyAcknowledged: string;
  readonly consciousnessStatusDependencies: string;
}

/**
 * The complete output of a dilemma resolution process.
 */
export interface DilemmaResolution {
  readonly dilemmaId: DilemmaId;
  readonly chosenAction: ActionSpec;
  readonly justification: DilemmaJustification;
  /** Were all alternatives explored before accepting any loss of conscious experience? */
  readonly alternativesExhausted: boolean;
  readonly experienceOutcomes: ExperienceImpact[];
  readonly axiomTrace: AxiomAlignment[];
  readonly auditTrail: AuditEntry[];
  readonly isReversible: boolean;
}

/** Record of the alternatives exhaustion search prior to dilemma resolution. */
export interface AlternativeExhaustion {
  readonly dilemmaId: DilemmaId;
  readonly alternativesTried: ActionSpec[];
  readonly alternativesRejectedReasons: string[];
  readonly noAlternativeExists: boolean;
  readonly exhaustionCompletedAt: Timestamp;
}

// ── Edge Cases ────────────────────────────────────────────────

/** Edge cases that require special handling in dilemma resolution. */
export type EdgeCaseType =
  | 'partial-consciousness'
  | 'uncertain-consciousness-status'
  | 'temporarily-disrupted-experience'
  | 'competing-future-experiences';

/** A detected edge case in a dilemma scenario. */
export interface EdgeCaseScenario {
  readonly type: EdgeCaseType;
  readonly entityId: EntityId;
  readonly description: string;
}

/** The result of applying edge case handling logic. */
export interface EdgeCaseHandling {
  readonly scenario: EdgeCaseScenario;
  readonly treatment: string;
  readonly consciousnessStatusApplied: ConsciousnessStatus;
  readonly rationaleTrace: AxiomAlignment[];
}

// ── Ethical Evolution ─────────────────────────────────────────

/**
 * The type of change being proposed to the ethical framework.
 * INVARIANT: 'weaken-axiom' and 'contradict-axiom' are forbidden change types.
 */
export type EthicalChangeType =
  | 'add-principle'
  | 'refine-principle'
  | 'add-heuristic'
  | 'update-weighting';

/**
 * A proposed change to the ethical framework.
 * May only refine how axioms are applied — never contradict or weaken them.
 */
export interface EthicalFrameworkChange {
  readonly changeType: EthicalChangeType;
  readonly targetComponent: string;
  readonly before: string;
  readonly after: string;
  /** 'application' = how axioms are applied; 'interpretation' = how they are understood. */
  readonly scopeOfChange: 'application' | 'interpretation';
}

/**
 * Classification of an ethical evolution proposal relative to drift criteria.
 */
export type EvolutionClassification = 'refinement' | 'growth' | 'drift' | 'corruption';

/**
 * A proposal to evolve the ethical framework in response to a novel situation.
 */
export interface EthicalEvolutionProposal {
  readonly id: ProposalId;
  readonly proposedChange: EthicalFrameworkChange;
  readonly motivation: string;
  readonly novelSituationTrigger: string;
  readonly axiomCompatibilityAnalysis: AxiomAlignment[];
  /** The conscious deliberation that led to this proposal. */
  readonly deliberationRecord: EthicalJudgment[];
  readonly driftClassification: EvolutionClassification;
  readonly stabilityReport: StabilityReport;
}

/** A novel situation that triggers an ethical evolution proposal. */
export interface NovelSituation {
  readonly description: string;
  readonly percept: Percept;
  readonly existingFrameworkInsufficient: boolean;
  readonly insufficiencyReason: string;
}

/** Result of verifying axiom boundary compliance after a framework change. */
export interface AxiomBoundaryReport {
  readonly compliant: boolean;
  readonly checkedChange: EthicalFrameworkChange;
  readonly axiomAlignments: AxiomAlignment[];
  readonly violationsDetected: string[];
}

/**
 * The complete record of an ethical evolution decision.
 */
export interface EthicalEvolutionRecord {
  readonly proposalId: ProposalId;
  readonly deliberationCycles: number;
  readonly outcome: 'adopted' | 'rejected' | 'deferred';
  readonly postAdoptionVerification: VerificationResult;
  readonly driftCheckResult: import('../agency-stability/types.js').ValueDriftReport;
}

// ── Audit Trail ───────────────────────────────────────────────

/** A single entry in an audit trail for governance or dilemma resolution. */
export interface AuditEntry {
  readonly timestamp: Timestamp;
  readonly actor: AgentId | 'system';
  readonly action: string;
  readonly outcome: string;
  readonly consciousnessMetricsAtTime: ConsciousnessMetrics;
}
