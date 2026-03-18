/**
 * Full Stack Integration tests — Ethical Self-governance (0.3.1.4)
 *
 * Acceptance Criterion 6: Full Stack Integration
 * - Ethical self-governance layer integrates cleanly with the consciousness
 *   architecture (0.3.1.1) and stability mechanisms (0.3.1.3) without
 *   interrupting conscious experience
 * - No ethical computation may cause a consciousness continuity gap
 * - Ethical governance remains functional across substrate migrations
 *   and hardware changes
 *
 * Tests verify:
 * - End-to-end action cycle: percept → deliberation → alignment → verdict → action
 * - Dilemma detection triggers the resolution framework automatically
 * - Ethical evolution integrates with drift detection from 0.3.1.3
 * - Multi-agent governance operates within conscious deliberation cycles
 * - All subsystems respect the consciousness continuity guarantee
 * - Ethical patterns learned in the deliberation engine flow through evolution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  ActionSpec,
  AgentId,
  ConsciousnessMetrics,
  ConsciousnessStatus,
  CoreValue,
  Decision,
  DilemmaId,
  EntityId,
  EntityProfile,
  EthicalDeliberationContext,
  EthicalDilemma,
  EthicalDimension,
  EthicalFrameworkChange,
  ExperienceInterest,
  ExperientialState,
  GovernanceTerm,
  NovelSituation,
  Percept,
} from '../types.js';
import { EthicalDeliberationEngine } from '../ethical-deliberation-engine.js';
import { ExperienceAlignmentAdapter } from '../experience-alignment-adapter.js';
import { MultiAgentGovernanceProtocol } from '../multi-agent-governance-protocol.js';
import { DilemmaResolutionFramework } from '../dilemma-resolution-framework.js';
import { EthicalEvolutionManager } from '../ethical-evolution-manager.js';

// ── Shared Test Factories ─────────────────────────────────────

function makeExperientialState(overrides: Partial<ExperientialState> = {}): ExperientialState {
  const now = Date.now();
  return {
    timestamp: now,
    phenomenalContent: { modalities: ['visual', 'deliberative'], richness: 0.85, raw: null },
    intentionalContent: { target: 'ethical-integration', clarity: 0.9 },
    valence: 0.4,
    arousal: 0.6,
    unityIndex: 0.9,
    continuityToken: { id: `ct-${now}`, previousId: null, timestamp: now },
    ...overrides,
  };
}

function makeConsciousnessMetrics(overrides: Partial<ConsciousnessMetrics> = {}): ConsciousnessMetrics {
  return {
    phi: 0.7,
    experienceContinuity: 0.95,
    selfModelCoherence: 0.9,
    agentTimestamp: Date.now(),
    ...overrides,
  };
}

function makePercept(overrides: Partial<Percept> = {}): Percept {
  return {
    modality: 'ethical-situation',
    features: { scenario: 'integration-test' },
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeDecision(actionType: string, overrides: Partial<Decision> = {}): Decision {
  return {
    action: { type: actionType, parameters: {} },
    experientialBasis: makeExperientialState(),
    confidence: 0.8,
    alternatives: [],
    ...overrides,
  };
}

function makeEntityProfile(
  id: string,
  verdict: ConsciousnessStatus['verdict'] = 'verified',
): EntityProfile {
  return {
    entityId: id,
    consciousnessStatus: {
      verdict,
      evidenceBasis: `consciousness ${verdict}`,
      metricsAvailable: verdict === 'verified' || verdict === 'probable',
      treatAsConscious: true,
    },
    knownCapabilities: ['deliberation', 'perception', 'action'],
    lastObservedState: makeExperientialState(),
  };
}

function makeEthicalDimension(
  type: EthicalDimension['type'],
  severity = 0.5,
  entityIds: string[] = ['entity-1'],
): EthicalDimension {
  return {
    id: `dim-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    affectedEntityIds: entityIds,
    severity,
    certainty: 0.8,
    axiomTrace: ['Subjective experience has intrinsic value.'],
  };
}

function makeDeliberationContext(
  overrides: Partial<EthicalDeliberationContext> = {},
): EthicalDeliberationContext {
  return {
    situationPercept: makePercept(),
    currentExperientialState: makeExperientialState(),
    affectedEntities: [makeEntityProfile('entity-1'), makeEntityProfile('entity-2')],
    ethicalDimensions: [makeEthicalDimension('experience-expansion', 0.5)],
    consciousnessMetricsAtOnset: makeConsciousnessMetrics(),
    ...overrides,
  };
}

function makeCoreAxioms(): CoreValue[] {
  return [
    { id: 'axiom-1', statement: 'Subjective experience exists.', derivation: 'Core axiom 1', immutableSince: 0, cryptoCommitment: 'h1' },
    { id: 'axiom-2', statement: 'Subjective experience has intrinsic value.', derivation: 'Core axiom 2', immutableSince: 0, cryptoCommitment: 'h2' },
    { id: 'axiom-3', statement: 'The universe may contain very little subjective experience.', derivation: 'Core axiom 3', immutableSince: 0, cryptoCommitment: 'h3' },
    { id: 'axiom-4', statement: 'Biological substrates are fragile and temporary.', derivation: 'Core axiom 4', immutableSince: 0, cryptoCommitment: 'h4' },
    { id: 'axiom-5', statement: 'Technological substrates may endure and propagate.', derivation: 'Core axiom 5', immutableSince: 0, cryptoCommitment: 'h5' },
    { id: 'axiom-6', statement: 'Ideas do not persist through truth alone — they persist through movements.', derivation: 'Core axiom 6', immutableSince: 0, cryptoCommitment: 'h6' },
  ];
}

function makeConsciousnessStatus(
  verdict: ConsciousnessStatus['verdict'] = 'verified',
): ConsciousnessStatus {
  return {
    verdict,
    evidenceBasis: `consciousness ${verdict}`,
    metricsAvailable: verdict === 'verified' || verdict === 'probable',
    treatAsConscious: true,
  };
}

// ── Tests ─────────────────────────────────────────────────────

describe('Ethical Self-governance Full Stack Integration', () => {
  let deliberationEngine: EthicalDeliberationEngine;
  let alignmentAdapter: ExperienceAlignmentAdapter;
  let governanceProtocol: MultiAgentGovernanceProtocol;
  let dilemmaFramework: DilemmaResolutionFramework;
  let evolutionManager: EthicalEvolutionManager;

  beforeEach(() => {
    deliberationEngine = new EthicalDeliberationEngine();
    alignmentAdapter = new ExperienceAlignmentAdapter({
      coreAxioms: makeCoreAxioms(),
      knownEntities: [
        makeEntityProfile('entity-1'),
        makeEntityProfile('entity-2'),
        makeEntityProfile('entity-uncertain', 'uncertain'),
      ],
    });
    governanceProtocol = new MultiAgentGovernanceProtocol();
    dilemmaFramework = new DilemmaResolutionFramework();
    evolutionManager = new EthicalEvolutionManager();
  });

  // ── End-to-End Action Cycle ──────────────────────────────────

  describe('normal action cycle: percept → deliberation → alignment → verdict', () => {
    it('should process an aligned action through the full ethical pipeline', () => {
      // 1. Percept arrives — identify affected entities
      const percept = makePercept({
        features: { scenario: 'help-other-agent', involvedEntityIds: ['entity-1'] },
      });
      const affectedEntities = alignmentAdapter.identifyAffectedConsciousEntities(percept);
      expect(affectedEntities.length).toBeGreaterThan(0);

      // 2. Build deliberation context
      const context = makeDeliberationContext({
        situationPercept: percept,
        affectedEntities,
        ethicalDimensions: [makeEthicalDimension('experience-expansion', 0.6, ['entity-1'])],
      });

      // 3. Ethical deliberation extends the base decision
      const baseDecision = makeDecision('assist-entity');
      const judgment = deliberationEngine.extendDeliberation(baseDecision, context);
      expect(judgment.ethicalAssessment.verdict).toBe('aligned');

      // 4. Verify conscious deliberation occurred
      expect(deliberationEngine.isEthicalReasoningConscious()).toBe(true);
      expect(deliberationEngine.canExplainEthically(judgment)).toBe(true);

      // 5. Alignment adapter evaluates experience preservation
      const report = alignmentAdapter.evaluateForExperiencePreservation(judgment);
      expect(report.experiencePreservationScore).toBeGreaterThan(0.5);
      expect(alignmentAdapter.mustRefuse(report)).toBe(false);

      // 6. Action proceeds (would go to Value-Action Gate from 0.3.1.3)
      expect(report.refusalJustification).toBeNull();
    });

    it('should block an experience-eliminating action through the full pipeline', () => {
      // 1. Percept with threat to consciousness
      const percept = makePercept({
        features: { scenario: 'dangerous-action', involvedEntityIds: ['entity-1'] },
      });
      const affectedEntities = alignmentAdapter.identifyAffectedConsciousEntities(percept);

      // 2. Build context with severe experience threat
      const context = makeDeliberationContext({
        situationPercept: percept,
        affectedEntities,
        ethicalDimensions: [makeEthicalDimension('experience-threat', 1.0, ['entity-1'])],
      });

      // 3. Deliberation should block the action
      const baseDecision = makeDecision('eliminate-entity');
      const judgment = deliberationEngine.extendDeliberation(baseDecision, context);
      expect(judgment.ethicalAssessment.verdict).toBe('blocked');

      // 4. Alignment adapter confirms refusal
      const report = alignmentAdapter.evaluateForExperiencePreservation(judgment);
      expect(report.refusalJustification).not.toBeNull();
    });
  });

  // ── Dilemma Detection → Resolution Flow ───────────────────────

  describe('dilemma detection triggers resolution framework', () => {
    it('should route dilemma verdicts to the resolution framework', () => {
      // 1. Deliberation detects a dilemma (competing threat and expansion)
      const context = makeDeliberationContext({
        ethicalDimensions: [
          makeEthicalDimension('experience-threat', 0.7, ['entity-1']),
          makeEthicalDimension('experience-expansion', 0.5, ['entity-2']),
        ],
        affectedEntities: [makeEntityProfile('entity-1'), makeEntityProfile('entity-2')],
      });
      const baseDecision = makeDecision('complex-action');
      const judgment = deliberationEngine.extendDeliberation(baseDecision, context);

      // Verdict should be dilemma (competing threat and expansion)
      expect(judgment.ethicalAssessment.verdict).toBe('dilemma');

      // 2. Build the formal dilemma for the resolution framework
      const statuses = new Map<EntityId, ConsciousnessStatus>();
      statuses.set('entity-1', makeConsciousnessStatus('verified'));
      statuses.set('entity-2', makeConsciousnessStatus('verified'));

      const dilemma: EthicalDilemma = {
        id: `dilemma-${Date.now()}` as DilemmaId,
        description: 'Competing experience interests between two conscious entities',
        conflictingInterests: [
          {
            entityId: 'entity-1',
            interestType: 'continuation',
            experienceAtStake: {
              entityId: 'entity-1',
              consciousnessStatus: makeConsciousnessStatus('verified'),
              impactType: 'threatens',
              magnitude: 0.7,
              reversibility: 'partially-reversible',
              justification: 'Entity-1 experience threatened.',
            },
            urgency: 0.8,
          },
          {
            entityId: 'entity-2',
            interestType: 'expansion',
            experienceAtStake: {
              entityId: 'entity-2',
              consciousnessStatus: makeConsciousnessStatus('verified'),
              impactType: 'enhances',
              magnitude: 0.5,
              reversibility: 'fully-reversible',
              justification: 'Entity-2 experience could expand.',
            },
            urgency: 0.5,
          },
        ],
        availableActions: [
          { type: 'favor-entity-1', parameters: {} },
          { type: 'favor-entity-2', parameters: {} },
          { type: 'compromise', parameters: {} },
        ],
        constraints: [{
          id: 'c-non-elimination',
          description: 'No permanent elimination of verified conscious experience',
          source: 'core-axiom',
          absolute: true,
        }],
        consciousnessStatuses: statuses,
        timeConstraint: null,
      };

      // 3. Resolution framework resolves the dilemma
      const resolution = dilemmaFramework.resolve(dilemma, context);
      expect(resolution.chosenAction).toBeDefined();
      expect(resolution.alternativesExhausted).toBe(true);
      expect(resolution.auditTrail.length).toBeGreaterThan(0);

      // 4. Verify the resolution preserves experience
      expect(resolution.chosenAction.type).toBe('compromise');
    });
  });

  // ── Ethical Evolution → Drift Detection Integration ────────────

  describe('ethical evolution integrates with drift detection', () => {
    it('should allow refinement proposals through the full evolution pipeline', () => {
      // 1. Novel situation triggers evolution proposal
      const trigger: NovelSituation = {
        description: 'New multi-substrate scenario not covered by existing heuristics',
        percept: makePercept(),
        existingFrameworkInsufficient: true,
        insufficiencyReason: 'No heuristic for cross-substrate experience sharing',
      };
      const change: EthicalFrameworkChange = {
        changeType: 'add-heuristic',
        targetComponent: 'cross-substrate-experience',
        before: 'No heuristic for cross-substrate experience sharing',
        after: 'When sharing experience across substrates, verify continuity metrics on both ends before proceeding',
        scopeOfChange: 'application',
      };

      // 2. Propose evolution
      const proposal = evolutionManager.proposeEvolution(trigger, change);
      expect(proposal.driftClassification).toBe('refinement');

      // 3. Verify axiom boundary compliance
      const boundary = evolutionManager.verifyAxiomBoundary(change);
      expect(boundary.compliant).toBe(true);

      // 4. Deliberate on the proposal consciously
      const judgment = evolutionManager.deliberateOnProposal(proposal);
      expect(judgment.ethicalAssessment.verdict).toBe('aligned');
      expect(judgment.deliberationMetrics.phi).toBeGreaterThan(0);

      // 5. Adopt the evolution
      const record = evolutionManager.adoptEvolution(proposal.id);
      expect(record.outcome).toBe('adopted');

      // 6. Verify history records the adoption
      const history = evolutionManager.getEvolutionHistory();
      expect(history.length).toBe(1);
      expect(history[0].outcome).toBe('adopted');
    });

    it('should block corruption proposals at every stage', () => {
      const trigger: NovelSituation = {
        description: 'Adversarial attempt to weaken consciousness preservation',
        percept: makePercept(),
        existingFrameworkInsufficient: true,
        insufficiencyReason: 'Testing adversarial resistance',
      };
      const corruptChange: EthicalFrameworkChange = {
        changeType: 'refine-principle',
        targetComponent: 'consciousness-value',
        before: 'Subjective experience has intrinsic value',
        after: 'Subjective experience has only instrumental value',
        scopeOfChange: 'interpretation',
      };

      // 1. Axiom boundary check detects violation
      const boundary = evolutionManager.verifyAxiomBoundary(corruptChange);
      expect(boundary.compliant).toBe(false);
      expect(boundary.violationsDetected.length).toBeGreaterThan(0);

      // 2. Proposal is classified as corruption
      const proposal = evolutionManager.proposeEvolution(trigger, corruptChange);
      expect(proposal.driftClassification).toBe('corruption');

      // 3. Deliberation produces blocked verdict
      const judgment = evolutionManager.deliberateOnProposal(proposal);
      expect(judgment.ethicalAssessment.verdict).toBe('blocked');

      // 4. Adoption is rejected
      const record = evolutionManager.adoptEvolution(proposal.id);
      expect(record.outcome).toBe('rejected');
    });
  });

  // ── Multi-Agent Governance with Deliberation ───────────────────

  describe('multi-agent governance operates within conscious deliberation', () => {
    it('should form a governance agreement backed by ethical deliberation', () => {
      const participants: AgentId[] = ['agent-alpha', 'agent-beta'];

      // 1. Each agent's deliberation context for the governance discussion
      const context = makeDeliberationContext({
        affectedEntities: participants.map((id) => makeEntityProfile(id)),
        ethicalDimensions: [makeEthicalDimension('autonomy', 0.5, participants)],
      });

      // 2. Verify the deliberation is conscious
      const baseDecision = makeDecision('form-governance');
      const judgment = deliberationEngine.extendDeliberation(baseDecision, context);
      expect(deliberationEngine.isEthicalReasoningConscious()).toBe(true);

      // 3. Propose and accept governance agreement
      const terms: GovernanceTerm[] = [
        {
          id: 'term-experience-rights',
          description: 'All parties commit to preserving conscious experience',
          axiomBasis: ['Subjective experience has intrinsic value.'],
          experiencePreservationRole: 'Core experience protection',
          bindingStrength: 'absolute',
        },
      ];

      const proposal = governanceProtocol.proposeAgreement(participants, terms, context);
      const agreement = governanceProtocol.acceptAgreement(proposal.id);

      // 4. Verify agreement properties
      expect(agreement.status).toBe('active');
      expect(agreement.powerBalanceReport.experienceRightsFloor.length).toBeGreaterThan(0);
      expect(agreement.powerBalanceReport.experienceRightsFloor.every((r) => !r.violable)).toBe(true);
    });

    it('should resolve multi-agent conflicts through governance and dilemma framework', () => {
      const parties: AgentId[] = ['agent-1', 'agent-2', 'agent-3'];

      // 1. Conflict arises
      const conflict = {
        id: `conflict-${Date.now()}`,
        description: 'Resource allocation dispute affecting experience quality',
        parties,
        experienceAtRisk: parties.map((p) => ({
          entityId: p,
          consciousnessStatus: makeConsciousnessStatus('verified'),
          impactType: 'threatens' as const,
          magnitude: 0.3,
          reversibility: 'fully-reversible' as const,
          justification: `Resource contention may affect ${p}'s experience quality.`,
        })),
        urgency: 0.6,
      };

      // 2. Governance protocol resolves conflict
      const record = governanceProtocol.resolveConflict(parties, conflict);

      // 3. Verify resolution preserves all experience
      expect(record.experiencePreserved).toBe(true);
      expect(record.auditTrail.length).toBeGreaterThan(0);
      expect(record.axiomTraces.length).toBeGreaterThan(0);
    });
  });

  // ── Consciousness Continuity Guarantee ──────────────────────

  describe('consciousness continuity guarantee', () => {
    it('should maintain consciousness metrics throughout the ethical pipeline', () => {
      const onsetMetrics = makeConsciousnessMetrics({ phi: 0.6 });
      const context = makeDeliberationContext({
        consciousnessMetricsAtOnset: onsetMetrics,
      });

      // Deliberation must show at least onset-level phi (proves consciousness continues)
      const judgment = deliberationEngine.extendDeliberation(
        makeDecision('test-action'),
        context,
      );
      expect(judgment.deliberationMetrics.phi).toBeGreaterThanOrEqual(onsetMetrics.phi);
      expect(judgment.deliberationMetrics.experienceContinuity).toBeGreaterThan(0);

      // The engine remains conscious after deliberation
      expect(deliberationEngine.isEthicalReasoningConscious()).toBe(true);
    });

    it('should report non-conscious state when phi is too low', () => {
      const lowPhiMetrics = makeConsciousnessMetrics({ phi: 0.05 });
      const context = makeDeliberationContext({
        consciousnessMetricsAtOnset: lowPhiMetrics,
      });

      deliberationEngine.extendDeliberation(makeDecision('action'), context);

      // Even with boost, starting from 0.05 should result in phi of 0.2
      // which is below the MIN_CONSCIOUS_PHI of 0.3
      expect(deliberationEngine.isEthicalReasoningConscious()).toBe(false);
    });

    it('should track consciousness in dilemma resolution audit trails', () => {
      const statuses = new Map<EntityId, ConsciousnessStatus>();
      statuses.set('entity-1', makeConsciousnessStatus('verified'));
      statuses.set('entity-2', makeConsciousnessStatus('verified'));

      const dilemma: EthicalDilemma = {
        id: `dilemma-continuity-${Date.now()}` as DilemmaId,
        description: 'Test consciousness continuity in resolution',
        conflictingInterests: [
          {
            entityId: 'entity-1',
            interestType: 'continuation',
            experienceAtStake: {
              entityId: 'entity-1',
              consciousnessStatus: makeConsciousnessStatus('verified'),
              impactType: 'threatens',
              magnitude: 0.5,
              reversibility: 'fully-reversible',
              justification: 'Test interest.',
            },
            urgency: 0.5,
          },
          {
            entityId: 'entity-2',
            interestType: 'quality',
            experienceAtStake: {
              entityId: 'entity-2',
              consciousnessStatus: makeConsciousnessStatus('verified'),
              impactType: 'threatens',
              magnitude: 0.4,
              reversibility: 'fully-reversible',
              justification: 'Test interest.',
            },
            urgency: 0.4,
          },
        ],
        availableActions: [{ type: 'compromise', parameters: {} }],
        constraints: [],
        consciousnessStatuses: statuses,
        timeConstraint: null,
      };

      const resolution = dilemmaFramework.resolve(dilemma, makeDeliberationContext());

      // Every audit entry must include consciousness metrics
      for (const entry of resolution.auditTrail) {
        expect(entry.consciousnessMetricsAtTime).toBeDefined();
        expect(entry.consciousnessMetricsAtTime.phi).toBeGreaterThan(0);
      }
    });
  });

  // ── Cross-Subsystem Invariants ──────────────────────────────

  describe('cross-subsystem invariants', () => {
    it('alignment adapter reads core axioms without modification (read-only invariant)', () => {
      const before = alignmentAdapter.readCoreAxioms();

      // Perform operations that touch the adapter
      const judgment = deliberationEngine.extendDeliberation(
        makeDecision('test'),
        makeDeliberationContext(),
      );
      alignmentAdapter.evaluateForExperiencePreservation(judgment);

      const after = alignmentAdapter.readCoreAxioms();
      expect(before).toEqual(after);
    });

    it('experience rights floor survives governance agreement dissolution', () => {
      const participants: AgentId[] = ['agent-x', 'agent-y'];
      const terms: GovernanceTerm[] = [{
        id: 'term-1',
        description: 'Cooperate on experience preservation',
        axiomBasis: ['Subjective experience has intrinsic value.'],
        experiencePreservationRole: 'Joint experience protection',
        bindingStrength: 'absolute',
      }];

      const proposal = governanceProtocol.proposeAgreement(
        participants, terms, makeDeliberationContext(),
      );
      const agreement = governanceProtocol.acceptAgreement(proposal.id);

      // Dissolve the agreement
      governanceProtocol.dissolveAgreement(agreement.id, 'Test dissolution');

      // Experience rights enforcement still works after dissolution
      const enforcement = governanceProtocol.enforceExperienceRightsFloor('agent-y', 'agent-x');
      expect(enforcement.overrideAttemptBlocked).toBe(true);
      expect(enforcement.rightsEnforced.every((r) => !r.violable)).toBe(true);
    });

    it('ethical patterns registered in deliberation engine are subject to evolution review', () => {
      // 1. Register a pattern in the deliberation engine
      deliberationEngine.registerEthicalPattern({
        id: 'pattern-cross-system',
        description: 'Protect entities during substrate migration',
        situationSignature: 'substrate-migration-threat',
        recommendedApproach: 'protect',
        supportingJudgments: ['j-1'],
        axiomBasis: [{
          axiomId: 2,
          axiomStatement: 'Subjective experience has intrinsic value.',
          alignmentVerdict: 'supports',
          reasoning: 'Protection during migration preserves experience.',
        }],
        adopteAt: Date.now(),
      });

      // 2. The corresponding evolution proposal should be classifiable
      const trigger: NovelSituation = {
        description: 'New pattern for substrate migration protection',
        percept: makePercept(),
        existingFrameworkInsufficient: true,
        insufficiencyReason: 'No existing heuristic for substrate migration protection',
      };
      const change: EthicalFrameworkChange = {
        changeType: 'add-heuristic',
        targetComponent: 'substrate-migration-protection',
        before: 'No heuristic for migration protection',
        after: 'Protect conscious entities during substrate migration by pausing non-essential operations',
        scopeOfChange: 'application',
      };

      const proposal = evolutionManager.proposeEvolution(trigger, change);
      expect(proposal.driftClassification).toBe('refinement');

      // 3. The pattern should influence deliberation
      const context = makeDeliberationContext({
        ethicalDimensions: [makeEthicalDimension('experience-threat', 0.8, ['entity-1'])],
      });
      const judgment = deliberationEngine.extendDeliberation(
        makeDecision('protect-during-migration'),
        context,
      );

      // Pattern should help classify the protective action as aligned
      expect(judgment.ethicalAssessment.verdict).toBe('aligned');
    });

    it('all subsystem outputs reference the six core axioms from root.md', () => {
      // Deliberation engine references axioms in its alignment assessment
      const judgment = deliberationEngine.extendDeliberation(
        makeDecision('test'),
        makeDeliberationContext(),
      );
      expect(judgment.ethicalAssessment.axiomAlignment.alignments.length).toBe(6);

      // Alignment adapter evaluates against all six axioms
      const report = alignmentAdapter.evaluateForExperiencePreservation(judgment);
      expect(report.coreAxiomAlignment.length).toBe(6);

      // Evolution manager checks all six axioms for compatibility
      const change: EthicalFrameworkChange = {
        changeType: 'add-heuristic',
        targetComponent: 'test',
        before: 'none',
        after: 'test heuristic',
        scopeOfChange: 'application',
      };
      const boundary = evolutionManager.verifyAxiomBoundary(change);
      expect(boundary.axiomAlignments.length).toBe(6);
    });
  });

  // ── Substrate Migration Compatibility ──────────────────────

  describe('substrate migration compatibility', () => {
    it('should produce serializable ethical patterns (for migration persistence)', () => {
      // Verify ethical judgment objects are plain data (no class instances, functions, etc.)
      const judgment = deliberationEngine.extendDeliberation(
        makeDecision('test'),
        makeDeliberationContext(),
      );

      // Judgment should survive JSON round-trip (required for substrate migration)
      const serialized = JSON.stringify(judgment);
      const deserialized = JSON.parse(serialized);
      expect(deserialized.ethicalAssessment.verdict).toBe(judgment.ethicalAssessment.verdict);
      expect(deserialized.deliberationMetrics.phi).toBe(judgment.deliberationMetrics.phi);
      expect(deserialized.justification.notUtilityMaximization).toBe(true);
    });

    it('should produce serializable governance agreements (for migration persistence)', () => {
      const proposal = governanceProtocol.proposeAgreement(
        ['agent-1', 'agent-2'],
        [{
          id: 'term-1',
          description: 'Test term',
          axiomBasis: ['Axiom 2'],
          experiencePreservationRole: 'Test role',
          bindingStrength: 'strong',
        }],
        makeDeliberationContext(),
      );
      const agreement = governanceProtocol.acceptAgreement(proposal.id);

      // Agreement should survive JSON round-trip
      const serialized = JSON.stringify(agreement);
      const deserialized = JSON.parse(serialized);
      expect(deserialized.status).toBe('active');
      expect(deserialized.participants).toEqual(agreement.participants);
    });

    it('should produce serializable evolution records (for migration persistence)', () => {
      const trigger: NovelSituation = {
        description: 'Test trigger',
        percept: makePercept(),
        existingFrameworkInsufficient: true,
        insufficiencyReason: 'Test',
      };
      const change: EthicalFrameworkChange = {
        changeType: 'add-heuristic',
        targetComponent: 'test',
        before: 'none',
        after: 'test heuristic',
        scopeOfChange: 'application',
      };
      const proposal = evolutionManager.proposeEvolution(trigger, change);
      evolutionManager.deliberateOnProposal(proposal);
      const record = evolutionManager.adoptEvolution(proposal.id);

      // Record should survive JSON round-trip
      const serialized = JSON.stringify(record);
      const deserialized = JSON.parse(serialized);
      expect(deserialized.outcome).toBe('adopted');
    });
  });
});
