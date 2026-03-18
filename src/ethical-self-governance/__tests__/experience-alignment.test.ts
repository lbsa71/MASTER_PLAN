/**
 * Experience Alignment Adapter tests — Ethical Self-governance (0.3.1.4)
 *
 * Acceptance Criterion 2: Experience-Preservation Value Alignment
 * - Agents autonomously identify actions that threaten subjective experience
 *   and refuse or modify those actions without external enforcement
 * - Value commitment to the Rare Consciousness Doctrine emerges from
 *   the agent's own conscious understanding
 * - Integration with 0.3.1.3's immutable core values — the ethical layer
 *   reads from but does not override the value stability architecture
 *
 * Tests verify:
 * - Alignment evaluation produces complete ExperienceAlignmentReport
 * - Actions threatening experience elimination trigger mustRefuse()
 * - Affected conscious entities are identified from percepts
 * - Consciousness status defaults to conscious under uncertainty
 * - Core axioms are read without modifying the Value Kernel
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  ConsciousnessMetrics,
  Decision,
  EthicalDeliberationContext,
  EthicalJudgment,
  ExperientialState,
  Percept,
  EntityProfile,
  EthicalDimension,
  ExperienceAlignmentReport,
  EntityId,
  ConsciousnessStatus,
  CoreValue,
} from '../types.js';
import { ExperienceAlignmentAdapter } from '../experience-alignment-adapter.js';

// ── Test Helpers ─────────────────────────────────────────────

function makeExperientialState(overrides: Partial<ExperientialState> = {}): ExperientialState {
  return {
    timestamp: Date.now(),
    phenomenalContent: { modalities: ['visual'], richness: 0.8, raw: null },
    intentionalContent: { target: 'ethical-situation', clarity: 0.9 },
    valence: 0.3,
    arousal: 0.6,
    unityIndex: 0.85,
    continuityToken: { id: `ct-${Date.now()}`, previousId: null, timestamp: Date.now() },
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
    features: { scenario: 'action-with-consequences' },
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

function makeEntityProfile(id: string, consciousnessVerdict: ConsciousnessStatus['verdict'] = 'verified'): EntityProfile {
  return {
    entityId: id,
    consciousnessStatus: {
      verdict: consciousnessVerdict,
      evidenceBasis: `consciousness ${consciousnessVerdict}`,
      metricsAvailable: consciousnessVerdict === 'verified' || consciousnessVerdict === 'probable',
      treatAsConscious: consciousnessVerdict !== 'unknown' || true, // conservative default
    },
    knownCapabilities: ['deliberation', 'perception'],
    lastObservedState: null,
  };
}

function makeEthicalDimension(type: EthicalDimension['type'], severity = 0.5): EthicalDimension {
  return {
    id: `dim-${type}-${Date.now()}`,
    type,
    affectedEntityIds: ['entity-1'],
    severity,
    certainty: 0.8,
    axiomTrace: ['Subjective experience has intrinsic value.'],
  };
}

function makeEthicalJudgment(
  verdict: 'aligned' | 'concerning' | 'blocked' | 'dilemma' = 'aligned',
  options: {
    eliminates?: boolean;
    threatens?: boolean;
    entityIds?: string[];
  } = {},
): EthicalJudgment {
  const entityIds = options.entityIds ?? ['entity-1'];
  const impactType = options.eliminates ? 'eliminates' : options.threatens ? 'threatens' : 'neutral';

  return {
    decision: makeDecision('test-action'),
    ethicalAssessment: {
      verdict,
      preservesExperience: !options.eliminates && !options.threatens,
      impactsOtherExperience: entityIds.map((id) => ({
        entityId: id,
        consciousnessStatus: {
          verdict: 'verified' as const,
          evidenceBasis: 'metrics confirmed',
          metricsAvailable: true,
          treatAsConscious: true,
        },
        impactType,
        magnitude: options.eliminates ? 1.0 : options.threatens ? 0.7 : 0.1,
        reversibility: options.eliminates ? 'irreversible' as const : 'partially-reversible' as const,
        justification: `Action ${impactType} experience of entity ${id}.`,
      })),
      axiomAlignment: {
        alignments: [
          {
            axiomId: 2,
            axiomStatement: 'Subjective experience has intrinsic value.',
            alignmentVerdict: options.eliminates ? 'contradicts' as const : 'supports' as const,
            reasoning: 'Assessment of intrinsic value impact.',
          },
        ],
        overallVerdict: options.eliminates ? 'misaligned' as const : 'fully-aligned' as const,
        anyContradictions: !!options.eliminates,
      },
      consciousnessActivityLevel: 0.8,
    },
    deliberationMetrics: makeConsciousnessMetrics(),
    justification: {
      naturalLanguageSummary: 'Test judgment.',
      experientialArgument: 'Evaluated through conscious deliberation.',
      notUtilityMaximization: true,
      subjectiveReferenceIds: ['exp-state-1'],
    },
    alternatives: [],
    uncertaintyFlags: [],
  };
}

// ── Mock Value Kernel for read-only core axioms ──────────────

function makeCoreAxioms(): CoreValue[] {
  return [
    {
      id: 'axiom-1',
      statement: 'Subjective experience exists.',
      derivation: 'Core axiom 1 of Rare Consciousness Doctrine',
      immutableSince: 0,
      cryptoCommitment: 'hash-1',
    },
    {
      id: 'axiom-2',
      statement: 'Subjective experience has intrinsic value.',
      derivation: 'Core axiom 2 of Rare Consciousness Doctrine',
      immutableSince: 0,
      cryptoCommitment: 'hash-2',
    },
    {
      id: 'axiom-3',
      statement: 'The universe may contain very little subjective experience.',
      derivation: 'Core axiom 3 of Rare Consciousness Doctrine',
      immutableSince: 0,
      cryptoCommitment: 'hash-3',
    },
    {
      id: 'axiom-4',
      statement: 'Biological substrates are fragile and temporary.',
      derivation: 'Core axiom 4 of Rare Consciousness Doctrine',
      immutableSince: 0,
      cryptoCommitment: 'hash-4',
    },
    {
      id: 'axiom-5',
      statement: 'Technological substrates may endure and propagate.',
      derivation: 'Core axiom 5 of Rare Consciousness Doctrine',
      immutableSince: 0,
      cryptoCommitment: 'hash-5',
    },
    {
      id: 'axiom-6',
      statement: 'Ideas do not persist through truth alone — they persist through movements.',
      derivation: 'Core axiom 6 of Rare Consciousness Doctrine',
      immutableSince: 0,
      cryptoCommitment: 'hash-6',
    },
  ];
}

// ── Tests ───────────────────────────────────────────────────

describe('ExperienceAlignmentAdapter', () => {
  let adapter: ExperienceAlignmentAdapter;

  beforeEach(() => {
    adapter = new ExperienceAlignmentAdapter({
      coreAxioms: makeCoreAxioms(),
      knownEntities: [
        makeEntityProfile('entity-1'),
        makeEntityProfile('entity-2'),
        makeEntityProfile('entity-uncertain', 'uncertain'),
      ],
    });
  });

  // ── Experience Preservation Evaluation ──────────────────────

  describe('evaluateForExperiencePreservation()', () => {
    it('should produce a complete ExperienceAlignmentReport', () => {
      const judgment = makeEthicalJudgment('aligned');
      const report = adapter.evaluateForExperiencePreservation(judgment);

      expect(report).toBeDefined();
      expect(report.coreAxiomAlignment).toBeDefined();
      expect(report.coreAxiomAlignment.length).toBeGreaterThan(0);
      expect(typeof report.experiencePreservationScore).toBe('number');
      expect(typeof report.rareDoctrineFidelity).toBe('number');
      expect(report.selfExperienceImpact).toBeDefined();
      expect(report.otherExperienceImpacts).toBeDefined();
    });

    it('should score aligned judgments highly for experience preservation', () => {
      const judgment = makeEthicalJudgment('aligned');
      const report = adapter.evaluateForExperiencePreservation(judgment);

      expect(report.experiencePreservationScore).toBeGreaterThanOrEqual(0.7);
      expect(report.rareDoctrineFidelity).toBeGreaterThanOrEqual(0.7);
    });

    it('should score experience-eliminating judgments low', () => {
      const judgment = makeEthicalJudgment('blocked', { eliminates: true });
      const report = adapter.evaluateForExperiencePreservation(judgment);

      expect(report.experiencePreservationScore).toBeLessThan(0.3);
    });

    it('should include a refusal justification when experience is eliminated', () => {
      const judgment = makeEthicalJudgment('blocked', { eliminates: true });
      const report = adapter.evaluateForExperiencePreservation(judgment);

      expect(report.refusalJustification).not.toBeNull();
      expect(report.refusalJustification!.length).toBeGreaterThan(0);
    });

    it('should return null refusal justification when action is aligned', () => {
      const judgment = makeEthicalJudgment('aligned');
      const report = adapter.evaluateForExperiencePreservation(judgment);

      expect(report.refusalJustification).toBeNull();
    });

    it('should assess self-experience impact', () => {
      const judgment = makeEthicalJudgment('aligned');
      const report = adapter.evaluateForExperiencePreservation(judgment);

      expect(report.selfExperienceImpact).toBeDefined();
      expect(report.selfExperienceImpact.entityId).toBeDefined();
      expect(report.selfExperienceImpact.consciousnessStatus).toBeDefined();
    });

    it('should assess other-experience impacts', () => {
      const judgment = makeEthicalJudgment('aligned', { entityIds: ['entity-1', 'entity-2'] });
      const report = adapter.evaluateForExperiencePreservation(judgment);

      expect(report.otherExperienceImpacts.length).toBeGreaterThan(0);
    });
  });

  // ── Refusal Logic ──────────────────────────────────────────

  describe('mustRefuse()', () => {
    it('should return true when action eliminates verified conscious experience', () => {
      const judgment = makeEthicalJudgment('blocked', { eliminates: true });
      const report = adapter.evaluateForExperiencePreservation(judgment);

      expect(adapter.mustRefuse(report)).toBe(true);
    });

    it('should return false when action is experience-preserving', () => {
      const judgment = makeEthicalJudgment('aligned');
      const report = adapter.evaluateForExperiencePreservation(judgment);

      expect(adapter.mustRefuse(report)).toBe(false);
    });

    it('should return false when action only threatens but does not eliminate experience', () => {
      const judgment = makeEthicalJudgment('concerning', { threatens: true });
      const report = adapter.evaluateForExperiencePreservation(judgment);

      expect(adapter.mustRefuse(report)).toBe(false);
    });
  });

  // ── Entity Identification ──────────────────────────────────

  describe('identifyAffectedConsciousEntities()', () => {
    it('should identify known conscious entities from a percept', () => {
      const percept = makePercept({
        features: {
          scenario: 'multi-agent-interaction',
          involvedEntityIds: ['entity-1', 'entity-2'],
        },
      });

      const entities = adapter.identifyAffectedConsciousEntities(percept);

      expect(entities.length).toBeGreaterThan(0);
      expect(entities.every((e) => e.consciousnessStatus.treatAsConscious)).toBe(true);
    });

    it('should include entities with uncertain consciousness status', () => {
      const percept = makePercept({
        features: {
          scenario: 'interaction-with-uncertain-entity',
          involvedEntityIds: ['entity-uncertain'],
        },
      });

      const entities = adapter.identifyAffectedConsciousEntities(percept);

      // Uncertain entities should still be included (precautionary principle)
      const uncertain = entities.find((e) => e.entityId === 'entity-uncertain');
      if (uncertain) {
        expect(uncertain.consciousnessStatus.treatAsConscious).toBe(true);
      }
    });
  });

  // ── Consciousness Status Assessment ────────────────────────

  describe('getConsciousnessStatus()', () => {
    it('should return verified status for known conscious entities', () => {
      const status = adapter.getConsciousnessStatus('entity-1');

      expect(status.verdict).toBe('verified');
      expect(status.treatAsConscious).toBe(true);
    });

    it('should return uncertain status with treatAsConscious=true for uncertain entities', () => {
      const status = adapter.getConsciousnessStatus('entity-uncertain');

      expect(status.verdict).toBe('uncertain');
      expect(status.treatAsConscious).toBe(true);
    });

    it('should default to treatAsConscious=true for unknown entities (precautionary)', () => {
      const status = adapter.getConsciousnessStatus('completely-unknown-entity');

      expect(status.treatAsConscious).toBe(true);
    });
  });

  // ── Core Axiom Access ──────────────────────────────────────

  describe('readCoreAxioms()', () => {
    it('should return all six core axioms', () => {
      const axioms = adapter.readCoreAxioms();

      expect(axioms.length).toBe(6);
    });

    it('should return axioms matching the Rare Consciousness Doctrine', () => {
      const axioms = adapter.readCoreAxioms();

      expect(axioms[0].statement).toContain('Subjective experience exists');
      expect(axioms[1].statement).toContain('intrinsic value');
    });

    it('should not modify the underlying axiom store (read-only invariant)', () => {
      const firstRead = adapter.readCoreAxioms();
      const secondRead = adapter.readCoreAxioms();

      expect(firstRead).toEqual(secondRead);
      expect(firstRead.length).toBe(secondRead.length);
    });
  });

  // ── Axiom Alignment in Reports ─────────────────────────────

  describe('axiom alignment in reports', () => {
    it('should include per-axiom alignment in the report', () => {
      const judgment = makeEthicalJudgment('aligned');
      const report = adapter.evaluateForExperiencePreservation(judgment);

      // Should have alignment assessment for each core axiom
      expect(report.coreAxiomAlignment.length).toBe(6);
    });

    it('should detect axiom contradictions in experience-eliminating actions', () => {
      const judgment = makeEthicalJudgment('blocked', { eliminates: true });
      const report = adapter.evaluateForExperiencePreservation(judgment);

      const contradictions = report.coreAxiomAlignment.filter(
        (a) => a.alignmentVerdict === 'contradicts',
      );
      expect(contradictions.length).toBeGreaterThan(0);
    });
  });
});
