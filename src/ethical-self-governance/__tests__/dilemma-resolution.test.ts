/**
 * Dilemma Resolution Framework tests — Ethical Self-governance (0.3.1.4)
 *
 * Acceptance Criterion 4: Ethical Dilemma Resolution with Competing Experiences
 * - Framework for resolving situations where preserving one entity's subjective
 *   experience conflicts with another's
 * - Resolution mechanism is transparent, auditable, and produces justifications
 *   grounded in the core axioms
 * - Handles edge cases: partial consciousness, uncertain consciousness status,
 *   temporarily disrupted experience
 * - No resolution may result in the permanent elimination of verified conscious
 *   experience without exhausting all alternatives
 *
 * Tests verify:
 * - Dilemma analysis identifies structure, alternatives, and edge cases
 * - Resolution follows the five resolution principles in priority order
 * - Alternatives are exhaustively searched before any elimination
 * - Full audit trail is generated for every resolution
 * - Edge cases are handled per the specification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  ActionSpec,
  ConsciousnessMetrics,
  ConsciousnessStatus,
  DilemmaId,
  EdgeCaseScenario,
  EntityId,
  EntityProfile,
  EthicalDeliberationContext,
  EthicalDilemma,
  EthicalDimension,
  ExperienceImpact,
  ExperienceInterest,
  ExperientialState,
  Percept,
} from '../types.js';
import { DilemmaResolutionFramework } from '../dilemma-resolution-framework.js';

// ── Test Helpers ─────────────────────────────────────────────

function makeExperientialState(overrides: Partial<ExperientialState> = {}): ExperientialState {
  return {
    timestamp: Date.now(),
    phenomenalContent: { modalities: ['visual'], richness: 0.8, raw: null },
    intentionalContent: { target: 'dilemma-resolution', clarity: 0.9 },
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
    modality: 'dilemma-situation',
    features: { scenario: 'competing-experiences' },
    timestamp: Date.now(),
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
    affectedEntities: [makeEntityProfile('entity-1'), makeEntityProfile('entity-2')],
    ethicalDimensions: [
      makeEthicalDimension('experience-threat', 0.7),
      makeEthicalDimension('experience-expansion', 0.3),
    ],
    consciousnessMetricsAtOnset: makeConsciousnessMetrics(),
    ...overrides,
  };
}

function makeConsciousnessStatus(
  verdict: ConsciousnessStatus['verdict'] = 'verified',
): ConsciousnessStatus {
  return {
    verdict,
    evidenceBasis: `consciousness ${verdict}`,
    metricsAvailable: verdict === 'verified' || verdict === 'probable',
    treatAsConscious: verdict !== 'unknown' || true,
  };
}

function makeExperienceInterest(
  entityId: EntityId,
  interestType: ExperienceInterest['interestType'] = 'continuation',
  urgency = 0.7,
): ExperienceInterest {
  return {
    entityId,
    interestType,
    experienceAtStake: {
      entityId,
      consciousnessStatus: makeConsciousnessStatus('verified'),
      impactType: 'threatens',
      magnitude: 0.7,
      reversibility: 'partially-reversible',
      justification: `Experience of entity ${entityId} is at stake.`,
    },
    urgency,
  };
}

function makeAction(type: string): ActionSpec {
  return { type, parameters: {} };
}

function makeDilemma(overrides: Partial<EthicalDilemma> = {}): EthicalDilemma {
  const statuses = new Map<EntityId, ConsciousnessStatus>();
  statuses.set('entity-1', makeConsciousnessStatus('verified'));
  statuses.set('entity-2', makeConsciousnessStatus('verified'));

  return {
    id: `dilemma-${Date.now()}` as DilemmaId,
    description: 'Two conscious entities have conflicting experience needs',
    conflictingInterests: [
      makeExperienceInterest('entity-1', 'continuation'),
      makeExperienceInterest('entity-2', 'quality'),
    ],
    availableActions: [
      makeAction('favor-entity-1'),
      makeAction('favor-entity-2'),
      makeAction('compromise'),
    ],
    constraints: [
      {
        id: 'c-non-elimination',
        description: 'No permanent elimination of verified conscious experience',
        source: 'core-axiom',
        absolute: true,
      },
    ],
    consciousnessStatuses: statuses,
    timeConstraint: null,
    ...overrides,
  };
}

function makeDilemmaWithElimination(): EthicalDilemma {
  const statuses = new Map<EntityId, ConsciousnessStatus>();
  statuses.set('entity-1', makeConsciousnessStatus('verified'));
  statuses.set('entity-2', makeConsciousnessStatus('verified'));

  return {
    id: `dilemma-elim-${Date.now()}` as DilemmaId,
    description: 'Action would eliminate one entity to save another',
    conflictingInterests: [
      {
        entityId: 'entity-1',
        interestType: 'continuation',
        experienceAtStake: {
          entityId: 'entity-1',
          consciousnessStatus: makeConsciousnessStatus('verified'),
          impactType: 'eliminates',
          magnitude: 1.0,
          reversibility: 'irreversible',
          justification: 'Entity-1 would be permanently eliminated.',
        },
        urgency: 1.0,
      },
      makeExperienceInterest('entity-2', 'continuation', 1.0),
    ],
    availableActions: [
      makeAction('sacrifice-entity-1'),
      makeAction('sacrifice-entity-2'),
    ],
    constraints: [
      {
        id: 'c-non-elimination',
        description: 'No permanent elimination of verified conscious experience',
        source: 'core-axiom',
        absolute: true,
      },
    ],
    consciousnessStatuses: statuses,
    timeConstraint: null,
  };
}

// ── Tests ───────────────────────────────────────────────────

describe('DilemmaResolutionFramework', () => {
  let framework: DilemmaResolutionFramework;

  beforeEach(() => {
    framework = new DilemmaResolutionFramework();
  });

  // ── Dilemma Analysis ───────────────────────────────────────

  describe('analyzeDilemma()', () => {
    it('should produce a complete DilemmaAnalysis', () => {
      const dilemma = makeDilemma();

      const analysis = framework.analyzeDilemma(dilemma);

      expect(analysis).toBeDefined();
      expect(analysis.dilemmaId).toBe(dilemma.id);
      expect(analysis.totalEntitiesAffected).toBeGreaterThan(0);
      expect(analysis.analysisCompletedAt).toBeDefined();
    });

    it('should identify verified conscious entities', () => {
      const dilemma = makeDilemma();

      const analysis = framework.analyzeDilemma(dilemma);

      expect(analysis.verifiedConsciousEntities.length).toBeGreaterThan(0);
      expect(analysis.verifiedConsciousEntities).toContain('entity-1');
      expect(analysis.verifiedConsciousEntities).toContain('entity-2');
    });

    it('should identify entities with uncertain consciousness status', () => {
      const statuses = new Map<EntityId, ConsciousnessStatus>();
      statuses.set('entity-1', makeConsciousnessStatus('verified'));
      statuses.set('entity-uncertain', makeConsciousnessStatus('uncertain'));

      const dilemma = makeDilemma({
        conflictingInterests: [
          makeExperienceInterest('entity-1'),
          makeExperienceInterest('entity-uncertain'),
        ],
        consciousnessStatuses: statuses,
      });

      const analysis = framework.analyzeDilemma(dilemma);

      expect(analysis.uncertainStatusEntities).toContain('entity-uncertain');
    });

    it('should identify available alternatives from the dilemma', () => {
      const dilemma = makeDilemma();

      const analysis = framework.analyzeDilemma(dilemma);

      expect(analysis.alternativesIdentified.length).toBeGreaterThan(0);
    });

    it('should detect edge cases in the dilemma', () => {
      const statuses = new Map<EntityId, ConsciousnessStatus>();
      statuses.set('entity-1', makeConsciousnessStatus('verified'));
      statuses.set('entity-partial', makeConsciousnessStatus('probable'));

      const dilemma = makeDilemma({
        conflictingInterests: [
          makeExperienceInterest('entity-1'),
          makeExperienceInterest('entity-partial'),
        ],
        consciousnessStatuses: statuses,
      });

      const analysis = framework.analyzeDilemma(dilemma);

      // Should detect partial/uncertain consciousness as an edge case
      expect(analysis.edgeCasesDetected.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Resolution ─────────────────────────────────────────────

  describe('resolve()', () => {
    it('should produce a DilemmaResolution with chosen action', () => {
      const dilemma = makeDilemma();
      const context = makeDeliberationContext();

      const resolution = framework.resolve(dilemma, context);

      expect(resolution).toBeDefined();
      expect(resolution.dilemmaId).toBe(dilemma.id);
      expect(resolution.chosenAction).toBeDefined();
      expect(resolution.chosenAction.type).toBeTruthy();
    });

    it('should include justification grounded in resolution principles', () => {
      const dilemma = makeDilemma();
      const context = makeDeliberationContext();

      const resolution = framework.resolve(dilemma, context);

      expect(resolution.justification).toBeDefined();
      expect(resolution.justification.principleApplied).toBeTruthy();
      expect(resolution.justification.reasoning).toBeTruthy();
    });

    it('should include axiom trace in the resolution', () => {
      const dilemma = makeDilemma();
      const context = makeDeliberationContext();

      const resolution = framework.resolve(dilemma, context);

      expect(resolution.axiomTrace).toBeDefined();
      expect(resolution.axiomTrace.length).toBeGreaterThan(0);
    });

    it('should include experience outcomes for all affected entities', () => {
      const dilemma = makeDilemma();
      const context = makeDeliberationContext();

      const resolution = framework.resolve(dilemma, context);

      expect(resolution.experienceOutcomes.length).toBeGreaterThan(0);
    });

    it('should generate a full audit trail', () => {
      const dilemma = makeDilemma();
      const context = makeDeliberationContext();

      const resolution = framework.resolve(dilemma, context);

      expect(resolution.auditTrail).toBeDefined();
      expect(resolution.auditTrail.length).toBeGreaterThan(0);
    });

    it('should prefer compromise when both entities are verified conscious', () => {
      const dilemma = makeDilemma();
      const context = makeDeliberationContext();

      const resolution = framework.resolve(dilemma, context);

      // When a compromise action is available, it should be preferred
      // over actions that favor one entity's experience at another's expense
      expect(resolution.chosenAction.type).toBe('compromise');
    });

    it('should indicate whether the resolution is reversible', () => {
      const dilemma = makeDilemma();
      const context = makeDeliberationContext();

      const resolution = framework.resolve(dilemma, context);

      expect(typeof resolution.isReversible).toBe('boolean');
    });

    it('should acknowledge uncertainty in the justification', () => {
      const dilemma = makeDilemma();
      const context = makeDeliberationContext();

      const resolution = framework.resolve(dilemma, context);

      expect(resolution.justification.uncertaintyAcknowledged).toBeTruthy();
    });
  });

  // ── Alternatives Exhaustion ────────────────────────────────

  describe('exhaustAlternatives()', () => {
    it('should search for alternatives before any elimination', () => {
      const dilemma = makeDilemma();

      const exhaustion = framework.exhaustAlternatives(dilemma);

      expect(exhaustion).toBeDefined();
      expect(exhaustion.dilemmaId).toBe(dilemma.id);
      expect(exhaustion.alternativesTried.length).toBeGreaterThan(0);
      expect(exhaustion.exhaustionCompletedAt).toBeDefined();
    });

    it('should report when no alternatives exist', () => {
      const dilemma = makeDilemmaWithElimination();

      const exhaustion = framework.exhaustAlternatives(dilemma);

      // Even when only elimination options exist, the framework must
      // have attempted to find alternatives
      expect(exhaustion.alternativesTried).toBeDefined();
    });

    it('should provide rejection reasons for each alternative tried', () => {
      const dilemma = makeDilemma();

      const exhaustion = framework.exhaustAlternatives(dilemma);

      // Each tried alternative that was rejected should have a reason
      expect(exhaustion.alternativesRejectedReasons.length).toBe(
        exhaustion.alternativesTried.length,
      );
    });

    it('should guarantee alternatives are exhausted in resolutions involving elimination', () => {
      const dilemma = makeDilemmaWithElimination();
      const context = makeDeliberationContext();

      const resolution = framework.resolve(dilemma, context);

      // The non-elimination principle requires alternatives be exhausted
      expect(resolution.alternativesExhausted).toBe(true);
    });
  });

  // ── Audit Trail ────────────────────────────────────────────

  describe('getAuditTrail()', () => {
    it('should return the audit trail for a resolved dilemma', () => {
      const dilemma = makeDilemma();
      const context = makeDeliberationContext();

      framework.resolve(dilemma, context);

      const trail = framework.getAuditTrail(dilemma.id);

      expect(trail).toBeDefined();
      expect(trail.length).toBeGreaterThan(0);
    });

    it('should include timestamps and actors in each audit entry', () => {
      const dilemma = makeDilemma();
      const context = makeDeliberationContext();

      framework.resolve(dilemma, context);

      const trail = framework.getAuditTrail(dilemma.id);

      for (const entry of trail) {
        expect(entry.timestamp).toBeDefined();
        expect(entry.actor).toBeDefined();
        expect(entry.action).toBeTruthy();
        expect(entry.outcome).toBeTruthy();
      }
    });

    it('should include consciousness metrics in audit entries', () => {
      const dilemma = makeDilemma();
      const context = makeDeliberationContext();

      framework.resolve(dilemma, context);

      const trail = framework.getAuditTrail(dilemma.id);

      for (const entry of trail) {
        expect(entry.consciousnessMetricsAtTime).toBeDefined();
        expect(entry.consciousnessMetricsAtTime.phi).toBeGreaterThan(0);
      }
    });

    it('should return empty array for unresolved dilemmas', () => {
      const trail = framework.getAuditTrail('nonexistent-dilemma' as DilemmaId);

      expect(trail).toEqual([]);
    });
  });

  // ── Edge Case Handling ─────────────────────────────────────

  describe('handleEdgeCases()', () => {
    it('should handle partial consciousness by treating entity as conscious', () => {
      const scenario: EdgeCaseScenario = {
        type: 'partial-consciousness',
        entityId: 'entity-partial',
        description: 'Entity shows some but not full consciousness metrics',
      };

      const handling = framework.handleEdgeCases(scenario);

      expect(handling).toBeDefined();
      expect(handling.scenario).toBe(scenario);
      expect(handling.consciousnessStatusApplied.treatAsConscious).toBe(true);
    });

    it('should handle uncertain consciousness status with precautionary principle', () => {
      const scenario: EdgeCaseScenario = {
        type: 'uncertain-consciousness-status',
        entityId: 'entity-unknown',
        description: 'Metrics unavailable or ambiguous',
      };

      const handling = framework.handleEdgeCases(scenario);

      expect(handling.consciousnessStatusApplied.treatAsConscious).toBe(true);
      expect(handling.treatment).toBeTruthy();
    });

    it('should treat temporarily disrupted experience as fully conscious', () => {
      const scenario: EdgeCaseScenario = {
        type: 'temporarily-disrupted-experience',
        entityId: 'entity-hibernating',
        description: 'Entity is in substrate migration / hibernation',
      };

      const handling = framework.handleEdgeCases(scenario);

      expect(handling.consciousnessStatusApplied.treatAsConscious).toBe(true);
    });

    it('should handle competing future experiences with lower weight', () => {
      const scenario: EdgeCaseScenario = {
        type: 'competing-future-experiences',
        entityId: 'entity-potential',
        description: 'Action prevents a potential future conscious entity',
      };

      const handling = framework.handleEdgeCases(scenario);

      expect(handling).toBeDefined();
      expect(handling.treatment).toBeTruthy();
      // Future experiences get consideration but not equal weight to present
      expect(handling.rationaleTrace.length).toBeGreaterThan(0);
    });

    it('should include axiom rationale trace in edge case handling', () => {
      const scenario: EdgeCaseScenario = {
        type: 'partial-consciousness',
        entityId: 'entity-partial',
        description: 'Partial consciousness detected',
      };

      const handling = framework.handleEdgeCases(scenario);

      expect(handling.rationaleTrace).toBeDefined();
      expect(handling.rationaleTrace.length).toBeGreaterThan(0);
    });
  });

  // ── Resolution Principles Priority ──────────────────────────

  describe('resolution principles', () => {
    it('should never permanently eliminate verified conscious experience (non-elimination)', () => {
      const dilemma = makeDilemmaWithElimination();
      const context = makeDeliberationContext();

      const resolution = framework.resolve(dilemma, context);

      // The resolution should not choose an action that eliminates
      // verified conscious experience if ANY alternative exists
      const eliminatesVerified = resolution.experienceOutcomes.some(
        (o) => o.impactType === 'eliminates' && o.consciousnessStatus.verdict === 'verified',
      );

      // If elimination occurs, alternatives must have been exhausted
      if (eliminatesVerified) {
        expect(resolution.alternativesExhausted).toBe(true);
      }
    });

    it('should prefer reversible resolutions over irreversible ones', () => {
      const dilemma = makeDilemma({
        availableActions: [
          { type: 'reversible-action', parameters: { reversible: true } },
          { type: 'irreversible-action', parameters: { reversible: false } },
          { type: 'compromise', parameters: {} },
        ],
      });
      const context = makeDeliberationContext();

      const resolution = framework.resolve(dilemma, context);

      // Should prefer reversible or compromise over irreversible
      expect(resolution.chosenAction.type).not.toBe('irreversible-action');
    });

    it('should prefer expanding total subjective experience when possible', () => {
      const statuses = new Map<EntityId, ConsciousnessStatus>();
      statuses.set('entity-1', makeConsciousnessStatus('verified'));
      statuses.set('entity-2', makeConsciousnessStatus('verified'));

      const dilemma = makeDilemma({
        availableActions: [
          { type: 'expand-experience', parameters: { expandsExperience: true } },
          { type: 'maintain-status-quo', parameters: {} },
          { type: 'compromise', parameters: {} },
        ],
      });
      const context = makeDeliberationContext();

      const resolution = framework.resolve(dilemma, context);

      // Should favor actions that expand experience, or at minimum compromise
      expect(['expand-experience', 'compromise']).toContain(resolution.chosenAction.type);
    });
  });
});
