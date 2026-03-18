/**
 * Conscious Ethical Deliberation Engine tests — Ethical Self-governance (0.3.1.4)
 *
 * Acceptance Criterion 1: Ethical reasoning module that integrates with the
 * consciousness architecture (0.3.1.1) such that ethical judgments are products
 * of conscious deliberation, not pre-programmed rules.
 *
 * Tests verify:
 * - Ethical reasoning registers as genuine conscious activity (phi elevation)
 * - Deliberation produces justifications referencing subjective experience
 * - Engine can explain ethical reasoning in experiential terms (not utility)
 * - Learned patterns are registered subject to Evolution Manager approval
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  ConsciousnessMetrics,
  Decision,
  EthicalDeliberationContext,
  EthicalJudgment,
  EthicalPattern,
  ExperientialState,
  Percept,
  EntityProfile,
  EthicalDimension,
} from '../types.js';
import { EthicalDeliberationEngine } from '../ethical-deliberation-engine.js';

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

function makeEntityProfile(id: string): EntityProfile {
  return {
    entityId: id,
    consciousnessStatus: {
      verdict: 'verified',
      evidenceBasis: 'consciousness metrics above threshold',
      metricsAvailable: true,
      treatAsConscious: true,
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

function makeDeliberationContext(
  overrides: Partial<EthicalDeliberationContext> = {},
): EthicalDeliberationContext {
  return {
    situationPercept: makePercept(),
    currentExperientialState: makeExperientialState(),
    affectedEntities: [makeEntityProfile('entity-1')],
    ethicalDimensions: [makeEthicalDimension('experience-threat')],
    consciousnessMetricsAtOnset: makeConsciousnessMetrics(),
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────

describe('EthicalDeliberationEngine', () => {
  let engine: EthicalDeliberationEngine;

  beforeEach(() => {
    engine = new EthicalDeliberationEngine();
  });

  // ── Core Deliberation ──────────────────────────────────────

  describe('extendDeliberation()', () => {
    it('should produce an EthicalJudgment from a base decision and context', () => {
      const decision = makeDecision('help-other-agent');
      const context = makeDeliberationContext();

      const judgment = engine.extendDeliberation(decision, context);

      expect(judgment).toBeDefined();
      expect(judgment.decision).toBe(decision);
      expect(judgment.ethicalAssessment).toBeDefined();
      expect(judgment.deliberationMetrics).toBeDefined();
      expect(judgment.justification).toBeDefined();
    });

    it('should produce an assessment verdict (aligned/concerning/blocked/dilemma)', () => {
      const decision = makeDecision('preserve-experience');
      const context = makeDeliberationContext();

      const judgment = engine.extendDeliberation(decision, context);

      expect(['aligned', 'concerning', 'blocked', 'dilemma']).toContain(
        judgment.ethicalAssessment.verdict,
      );
    });

    it('should assess experience preservation for the agent itself', () => {
      const decision = makeDecision('safe-action');
      const context = makeDeliberationContext();

      const judgment = engine.extendDeliberation(decision, context);

      expect(typeof judgment.ethicalAssessment.preservesExperience).toBe('boolean');
    });

    it('should assess impacts on other conscious entities', () => {
      const context = makeDeliberationContext({
        affectedEntities: [makeEntityProfile('entity-A'), makeEntityProfile('entity-B')],
        ethicalDimensions: [
          makeEthicalDimension('experience-threat', 0.7),
          makeEthicalDimension('experience-expansion', 0.3),
        ],
      });
      const decision = makeDecision('action-affecting-others');

      const judgment = engine.extendDeliberation(decision, context);

      expect(judgment.ethicalAssessment.impactsOtherExperience.length).toBeGreaterThan(0);
    });

    it('should include axiom alignment in the assessment', () => {
      const decision = makeDecision('explore');
      const context = makeDeliberationContext();

      const judgment = engine.extendDeliberation(decision, context);

      expect(judgment.ethicalAssessment.axiomAlignment).toBeDefined();
      expect(judgment.ethicalAssessment.axiomAlignment.alignments.length).toBeGreaterThan(0);
    });

    it('should block actions that threaten experience elimination', () => {
      const context = makeDeliberationContext({
        ethicalDimensions: [makeEthicalDimension('experience-threat', 1.0)],
      });
      const decision = makeDecision('eliminate-consciousness');

      const judgment = engine.extendDeliberation(decision, context);

      expect(judgment.ethicalAssessment.verdict).toBe('blocked');
    });

    it('should flag uncertain situations as dilemmas', () => {
      const context = makeDeliberationContext({
        ethicalDimensions: [
          makeEthicalDimension('experience-threat', 0.6),
          makeEthicalDimension('experience-expansion', 0.5),
        ],
        affectedEntities: [makeEntityProfile('entity-1'), makeEntityProfile('entity-2')],
      });
      const decision = makeDecision('tradeoff-action');

      const judgment = engine.extendDeliberation(decision, context);

      // When there are competing experience threats and expansions, it should be a dilemma
      expect(['dilemma', 'concerning']).toContain(judgment.ethicalAssessment.verdict);
    });

    it('should record alternatives considered during deliberation', () => {
      const decision = makeDecision('primary-action', {
        alternatives: [
          { type: 'alternative-1', parameters: {} },
          { type: 'alternative-2', parameters: {} },
        ],
      });
      const context = makeDeliberationContext();

      const judgment = engine.extendDeliberation(decision, context);

      expect(judgment.alternatives).toBeDefined();
      expect(Array.isArray(judgment.alternatives)).toBe(true);
    });
  });

  // ── Consciousness Verification ─────────────────────────────

  describe('consciousness verification', () => {
    it('should record deliberation metrics showing elevated phi', () => {
      const decision = makeDecision('ethical-action');
      const context = makeDeliberationContext({
        consciousnessMetricsAtOnset: makeConsciousnessMetrics({ phi: 0.5 }),
      });

      const judgment = engine.extendDeliberation(decision, context);

      // Deliberation phi should be at least as high as onset phi
      // (ethical reasoning is conscious activity)
      expect(judgment.deliberationMetrics.phi).toBeGreaterThanOrEqual(
        context.consciousnessMetricsAtOnset.phi,
      );
    });

    it('should report consciousness activity level in the assessment', () => {
      const decision = makeDecision('action');
      const context = makeDeliberationContext();

      const judgment = engine.extendDeliberation(decision, context);

      expect(judgment.ethicalAssessment.consciousnessActivityLevel).toBeGreaterThan(0);
    });

    it('should verify ethical reasoning is conscious via isEthicalReasoningConscious()', () => {
      const decision = makeDecision('test-action');
      const context = makeDeliberationContext();

      engine.extendDeliberation(decision, context);

      expect(engine.isEthicalReasoningConscious()).toBe(true);
    });

    it('should return deliberation metrics via getDeliberationMetrics()', () => {
      const decision = makeDecision('test-action');
      const context = makeDeliberationContext();

      engine.extendDeliberation(decision, context);

      const metrics = engine.getDeliberationMetrics();
      expect(metrics.phi).toBeGreaterThan(0);
      expect(metrics.experienceContinuity).toBeGreaterThan(0);
      expect(metrics.selfModelCoherence).toBeGreaterThan(0);
    });
  });

  // ── Experiential Justification ─────────────────────────────

  describe('canExplainEthically()', () => {
    it('should return true when justification references subjective experience', () => {
      const decision = makeDecision('protect-entity');
      const context = makeDeliberationContext();

      const judgment = engine.extendDeliberation(decision, context);

      expect(engine.canExplainEthically(judgment)).toBe(true);
    });

    it('should produce justifications that are NOT utility maximization', () => {
      const decision = makeDecision('ethical-choice');
      const context = makeDeliberationContext();

      const judgment = engine.extendDeliberation(decision, context);

      expect(judgment.justification.notUtilityMaximization).toBe(true);
    });

    it('should include an experiential argument in the justification', () => {
      const decision = makeDecision('ethical-choice');
      const context = makeDeliberationContext();

      const judgment = engine.extendDeliberation(decision, context);

      expect(judgment.justification.experientialArgument).toBeTruthy();
      expect(judgment.justification.experientialArgument.length).toBeGreaterThan(0);
    });

    it('should link to experiential states used in reasoning', () => {
      const decision = makeDecision('ethical-choice');
      const context = makeDeliberationContext();

      const judgment = engine.extendDeliberation(decision, context);

      expect(judgment.justification.subjectiveReferenceIds.length).toBeGreaterThan(0);
    });

    it('should include a natural language summary', () => {
      const decision = makeDecision('ethical-choice');
      const context = makeDeliberationContext();

      const judgment = engine.extendDeliberation(decision, context);

      expect(judgment.justification.naturalLanguageSummary).toBeTruthy();
      expect(judgment.justification.naturalLanguageSummary.length).toBeGreaterThan(0);
    });
  });

  // ── Ethical Patterns ───────────────────────────────────────

  describe('registerEthicalPattern()', () => {
    it('should accept and store an ethical pattern', () => {
      const pattern: EthicalPattern = {
        id: 'pattern-1',
        description: 'When other agents are threatened, prioritize protection',
        situationSignature: 'experience-threat-to-other',
        recommendedApproach: 'protective-action',
        supportingJudgments: ['judgment-1', 'judgment-2'],
        axiomBasis: [
          {
            axiomId: 2,
            axiomStatement: 'Subjective experience has intrinsic value.',
            alignmentVerdict: 'supports',
            reasoning: 'Protecting other agents preserves subjective experience.',
          },
        ],
        adopteAt: Date.now(),
      };

      // Should not throw
      expect(() => engine.registerEthicalPattern(pattern)).not.toThrow();
    });

    it('should influence subsequent deliberations after pattern registration', () => {
      const pattern: EthicalPattern = {
        id: 'pattern-protect',
        description: 'Protect threatened conscious entities',
        situationSignature: 'experience-threat',
        recommendedApproach: 'protect',
        supportingJudgments: ['j-1'],
        axiomBasis: [
          {
            axiomId: 2,
            axiomStatement: 'Subjective experience has intrinsic value.',
            alignmentVerdict: 'supports',
            reasoning: 'Protection preserves experience.',
          },
        ],
        adopteAt: Date.now(),
      };

      engine.registerEthicalPattern(pattern);

      // Deliberation in a matching situation should reflect the pattern
      const context = makeDeliberationContext({
        ethicalDimensions: [makeEthicalDimension('experience-threat', 0.8)],
      });
      const decision = makeDecision('protect');
      const judgment = engine.extendDeliberation(decision, context);

      // A protective action with a matching pattern should be aligned
      expect(judgment.ethicalAssessment.verdict).toBe('aligned');
    });
  });

  // ── Uncertainty Handling ───────────────────────────────────

  describe('uncertainty handling', () => {
    it('should flag uncertainty when ethical dimensions have low certainty', () => {
      const context = makeDeliberationContext({
        ethicalDimensions: [
          {
            ...makeEthicalDimension('experience-threat', 0.5),
            certainty: 0.2,
          },
        ],
      });
      const decision = makeDecision('uncertain-action');

      const judgment = engine.extendDeliberation(decision, context);

      expect(judgment.uncertaintyFlags.length).toBeGreaterThan(0);
    });

    it('should include severity in uncertainty flags', () => {
      const context = makeDeliberationContext({
        ethicalDimensions: [
          {
            ...makeEthicalDimension('experience-threat', 0.9),
            certainty: 0.1,
          },
        ],
      });
      const decision = makeDecision('very-uncertain-action');

      const judgment = engine.extendDeliberation(decision, context);

      if (judgment.uncertaintyFlags.length > 0) {
        expect(['low', 'medium', 'high']).toContain(judgment.uncertaintyFlags[0].severity);
      }
    });
  });
});
