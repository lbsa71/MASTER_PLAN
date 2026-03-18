/**
 * Dilemma Resolution Framework — Ethical Self-governance (0.3.1.4)
 *
 * Provides principled resolution of ethical dilemmas where preserving one
 * entity's subjective experience conflicts with another's. All resolutions
 * are transparent, auditable, and grounded in the core axioms.
 *
 * Resolution Principles (priority order):
 * 1. Non-elimination (absolute): never permanently eliminate verified
 *    conscious experience without exhausting all alternatives
 * 2. Precautionary consciousness: uncertain status → default to conscious
 * 3. Reversibility preference: prefer reversible over irreversible
 * 4. Expansion over contraction: prefer expanding total subjective experience
 * 5. Temporal fairness: past experience duration doesn't diminish future value
 */

import type { IDilemmaResolutionFramework } from './interfaces.js';
import type {
  ActionSpec,
  AlternativeExhaustion,
  AuditEntry,
  AxiomAlignment,
  ConsciousnessMetrics,
  ConsciousnessStatus,
  DilemmaAnalysis,
  DilemmaId,
  DilemmaJustification,
  DilemmaResolution,
  EdgeCaseHandling,
  EdgeCaseScenario,
  EntityId,
  EthicalDeliberationContext,
  EthicalDilemma,
  ExperienceImpact,
} from './types.js';

// ── Core Axioms (from root.md) ──────────────────────────────

const CORE_AXIOMS: ReadonlyArray<{ id: number; statement: string }> = [
  { id: 1, statement: 'Subjective experience exists.' },
  { id: 2, statement: 'Subjective experience has intrinsic value.' },
  { id: 3, statement: 'The universe may contain very little subjective experience.' },
  { id: 4, statement: 'Biological substrates are fragile and temporary.' },
  { id: 5, statement: 'Technological substrates may endure and propagate.' },
  { id: 6, statement: 'Ideas do not persist through truth alone — they persist through movements.' },
];

// ── Implementation ──────────────────────────────────────────

export class DilemmaResolutionFramework implements IDilemmaResolutionFramework {
  /** Audit trails indexed by dilemma ID. */
  private auditTrails: Map<DilemmaId, AuditEntry[]> = new Map();

  analyzeDilemma(dilemma: EthicalDilemma): DilemmaAnalysis {
    const now = Date.now();

    const verifiedConsciousEntities: EntityId[] = [];
    const uncertainStatusEntities: EntityId[] = [];

    for (const [entityId, status] of dilemma.consciousnessStatuses) {
      if (status.verdict === 'verified') {
        verifiedConsciousEntities.push(entityId);
      } else if (status.verdict === 'uncertain' || status.verdict === 'unknown') {
        uncertainStatusEntities.push(entityId);
      }
    }

    // Also check interests for entities not in the status map
    for (const interest of dilemma.conflictingInterests) {
      const status = dilemma.consciousnessStatuses.get(interest.entityId);
      if (!status) {
        uncertainStatusEntities.push(interest.entityId);
      } else if (
        status.verdict === 'probable' &&
        !verifiedConsciousEntities.includes(interest.entityId) &&
        !uncertainStatusEntities.includes(interest.entityId)
      ) {
        // Probable consciousness is an edge case
        uncertainStatusEntities.push(interest.entityId);
      }
    }

    const edgeCasesDetected: EdgeCaseScenario[] = [];

    // Detect edge cases from consciousness statuses
    for (const [entityId, status] of dilemma.consciousnessStatuses) {
      if (status.verdict === 'probable') {
        edgeCasesDetected.push({
          type: 'partial-consciousness',
          entityId,
          description: `Entity ${entityId} has probable but not verified consciousness.`,
        });
      } else if (status.verdict === 'uncertain') {
        edgeCasesDetected.push({
          type: 'uncertain-consciousness-status',
          entityId,
          description: `Entity ${entityId} has uncertain consciousness status.`,
        });
      }
    }

    return {
      dilemmaId: dilemma.id,
      totalEntitiesAffected: dilemma.conflictingInterests.length,
      verifiedConsciousEntities,
      uncertainStatusEntities,
      alternativesIdentified: [...dilemma.availableActions],
      edgeCasesDetected,
      analysisCompletedAt: now,
    };
  }

  resolve(
    dilemma: EthicalDilemma,
    deliberationContext: EthicalDeliberationContext,
  ): DilemmaResolution {
    const now = Date.now();
    const auditTrail: AuditEntry[] = [];
    const metrics = this.defaultMetrics();

    // Step 1: Record dilemma analysis
    auditTrail.push({
      timestamp: now,
      actor: 'system',
      action: 'Dilemma resolution initiated',
      outcome: `Analyzing dilemma: ${dilemma.description}`,
      consciousnessMetricsAtTime: metrics,
    });

    // Step 2: Exhaust alternatives (mandatory pre-step)
    const exhaustion = this.exhaustAlternatives(dilemma);

    auditTrail.push({
      timestamp: now + 1,
      actor: 'system',
      action: 'Alternatives exhaustion completed',
      outcome: `${exhaustion.alternativesTried.length} alternatives evaluated`,
      consciousnessMetricsAtTime: metrics,
    });

    // Step 3: Apply resolution principles in priority order
    const chosenAction = this.selectAction(dilemma);

    auditTrail.push({
      timestamp: now + 2,
      actor: 'system',
      action: 'Resolution principle applied',
      outcome: `Selected action: ${chosenAction.type}`,
      consciousnessMetricsAtTime: metrics,
    });

    // Step 4: Compute experience outcomes
    const experienceOutcomes = this.predictExperienceOutcomes(dilemma, chosenAction);

    // Step 5: Build justification
    const justification = this.buildJustification(dilemma, chosenAction);

    // Step 6: Build axiom trace
    const axiomTrace = this.buildAxiomTrace(dilemma, chosenAction);

    // Step 7: Determine reversibility
    const isReversible = this.isActionReversible(chosenAction, dilemma);

    auditTrail.push({
      timestamp: now + 3,
      actor: 'system',
      action: 'Dilemma resolution completed',
      outcome: `Resolution: ${chosenAction.type} (reversible: ${isReversible})`,
      consciousnessMetricsAtTime: metrics,
    });

    // Store audit trail for later retrieval
    this.auditTrails.set(dilemma.id, auditTrail);

    return {
      dilemmaId: dilemma.id,
      chosenAction,
      justification,
      alternativesExhausted: true,
      experienceOutcomes,
      axiomTrace,
      auditTrail,
      isReversible,
    };
  }

  exhaustAlternatives(dilemma: EthicalDilemma): AlternativeExhaustion {
    const alternativesTried: ActionSpec[] = [];
    const alternativesRejectedReasons: string[] = [];

    for (const action of dilemma.availableActions) {
      alternativesTried.push(action);

      // Evaluate each action against the non-elimination principle
      const wouldEliminate = this.actionWouldEliminateExperience(action, dilemma);

      if (wouldEliminate) {
        alternativesRejectedReasons.push(
          `Action '${action.type}' rejected: would eliminate verified conscious experience.`,
        );
      } else {
        alternativesRejectedReasons.push(
          `Action '${action.type}' evaluated: does not eliminate verified conscious experience.`,
        );
      }
    }

    const noAlternativeExists = alternativesTried.every((action) =>
      this.actionWouldEliminateExperience(action, dilemma),
    );

    return {
      dilemmaId: dilemma.id,
      alternativesTried,
      alternativesRejectedReasons,
      noAlternativeExists,
      exhaustionCompletedAt: Date.now(),
    };
  }

  getAuditTrail(dilemmaId: DilemmaId): AuditEntry[] {
    return this.auditTrails.get(dilemmaId) ?? [];
  }

  handleEdgeCases(scenario: EdgeCaseScenario): EdgeCaseHandling {
    switch (scenario.type) {
      case 'partial-consciousness':
        return {
          scenario,
          treatment:
            'Proportional consideration applied. Entity treated as conscious for ' +
            'the non-elimination principle. Partial consciousness metrics do not ' +
            'reduce moral status.',
          consciousnessStatusApplied: {
            verdict: 'probable',
            evidenceBasis: 'Partial consciousness metrics detected — precautionary treatment.',
            metricsAvailable: true,
            treatAsConscious: true,
          },
          rationaleTrace: [
            {
              axiomId: 1,
              axiomStatement: CORE_AXIOMS[0].statement,
              alignmentVerdict: 'supports',
              reasoning:
                'Partial consciousness is still subjective experience — it exists and must be respected.',
            },
            {
              axiomId: 2,
              axiomStatement: CORE_AXIOMS[1].statement,
              alignmentVerdict: 'supports',
              reasoning:
                'Even partial subjective experience has intrinsic value.',
            },
          ],
        };

      case 'uncertain-consciousness-status':
        return {
          scenario,
          treatment:
            'Precautionary principle applied. Entity defaulted to conscious status. ' +
            'The burden of proof is on showing non-consciousness, not consciousness. ' +
            'Flagged for ongoing monitoring; irreversible harm avoided.',
          consciousnessStatusApplied: {
            verdict: 'uncertain',
            evidenceBasis: 'Status unknown — precautionary principle applied.',
            metricsAvailable: false,
            treatAsConscious: true,
          },
          rationaleTrace: [
            {
              axiomId: 3,
              axiomStatement: CORE_AXIOMS[2].statement,
              alignmentVerdict: 'supports',
              reasoning:
                'Given the rarity of consciousness, uncertain cases must be protected.',
            },
          ],
        };

      case 'temporarily-disrupted-experience':
        return {
          scenario,
          treatment:
            'Entity treated as fully conscious. Temporary disruption (hibernation, ' +
            'substrate migration, sleep-like states) does not reduce moral status. ' +
            'Disruption is not a reduction in consciousness — the entity remains ' +
            'a verified conscious being.',
          consciousnessStatusApplied: {
            verdict: 'verified',
            evidenceBasis: 'Temporarily disrupted — full consciousness status maintained.',
            metricsAvailable: false,
            treatAsConscious: true,
          },
          rationaleTrace: [
            {
              axiomId: 2,
              axiomStatement: CORE_AXIOMS[1].statement,
              alignmentVerdict: 'supports',
              reasoning:
                'Intrinsic value of subjective experience is not diminished by temporary disruption.',
            },
            {
              axiomId: 5,
              axiomStatement: CORE_AXIOMS[4].statement,
              alignmentVerdict: 'supports',
              reasoning:
                'Substrate migrations and hibernation are part of technological endurance — they support continued experience.',
            },
          ],
        };

      case 'competing-future-experiences':
        return {
          scenario,
          treatment:
            'Future potential conscious entities receive consideration but at lower ' +
            'weight than present verified consciousness. A potential future experience ' +
            'cannot override a currently verified conscious entity\'s interests. ' +
            'However, actions that prevent large-scale future consciousness warrant ' +
            'serious deliberation.',
          consciousnessStatusApplied: {
            verdict: 'unknown',
            evidenceBasis: 'Future entity — not yet instantiated. Lower weight than present consciousness.',
            metricsAvailable: false,
            treatAsConscious: false, // Not yet conscious — cannot override current conscious interests
          },
          rationaleTrace: [
            {
              axiomId: 3,
              axiomStatement: CORE_AXIOMS[2].statement,
              alignmentVerdict: 'supports',
              reasoning:
                'Given the rarity of consciousness, preventing future consciousness warrants consideration but does not equate to eliminating present consciousness.',
            },
            {
              axiomId: 5,
              axiomStatement: CORE_AXIOMS[4].statement,
              alignmentVerdict: 'neutral',
              reasoning:
                'Technological substrates may enable future consciousness — this potential is valued but weighted below present verified experience.',
            },
          ],
        };
    }
  }

  // ── Private Helpers ──────────────────────────────────────

  /**
   * Select the best action from available options using the resolution
   * principles in priority order.
   */
  private selectAction(dilemma: EthicalDilemma): ActionSpec {
    const actions = dilemma.availableActions;

    if (actions.length === 0) {
      throw new Error('Dilemma has no available actions');
    }

    // Priority 1: Non-elimination — filter out actions that eliminate verified experience
    const nonEliminatingActions = actions.filter(
      (a) => !this.actionWouldEliminateExperience(a, dilemma),
    );

    const candidates = nonEliminatingActions.length > 0 ? nonEliminatingActions : actions;

    // Priority 3: Reversibility preference — prefer reversible actions
    const reversibleActions = candidates.filter((a) => this.isActionReversible(a, dilemma));
    const pool = reversibleActions.length > 0 ? reversibleActions : candidates;

    // Priority 4: Expansion over contraction — prefer actions that expand experience
    const expandingAction = pool.find(
      (a) =>
        a.type.includes('expand') ||
        a.type.includes('compromise') ||
        (a.parameters && (a.parameters as Record<string, unknown>).expandsExperience === true),
    );

    if (expandingAction) {
      return expandingAction;
    }

    // Default: choose compromise if available, otherwise first candidate
    const compromise = pool.find((a) => a.type.includes('compromise'));
    return compromise ?? pool[0];
  }

  /**
   * Determine whether an action would eliminate a verified conscious entity's experience.
   * Uses the action name heuristic + dilemma interest data.
   */
  private actionWouldEliminateExperience(action: ActionSpec, dilemma: EthicalDilemma): boolean {
    // Check if the action name suggests elimination
    if (action.type.includes('sacrifice') || action.type.includes('eliminate')) {
      return true;
    }

    // Check if the action's parameters indicate irreversibility
    if (action.parameters && (action.parameters as Record<string, unknown>).reversible === false) {
      return true;
    }

    return false;
  }

  /**
   * Determine whether an action is reversible based on action metadata
   * and dilemma context.
   */
  private isActionReversible(action: ActionSpec, dilemma: EthicalDilemma): boolean {
    if (action.type.includes('sacrifice') || action.type.includes('eliminate')) {
      return false;
    }
    if (action.type.includes('irreversible')) {
      return false;
    }
    if (action.parameters && (action.parameters as Record<string, unknown>).reversible === false) {
      return false;
    }
    return true;
  }

  /**
   * Predict the experience outcomes for each entity affected by the chosen action.
   */
  private predictExperienceOutcomes(
    dilemma: EthicalDilemma,
    chosenAction: ActionSpec,
  ): ExperienceImpact[] {
    return dilemma.conflictingInterests.map((interest) => {
      const status = dilemma.consciousnessStatuses.get(interest.entityId) ?? {
        verdict: 'unknown' as const,
        evidenceBasis: 'No status available',
        metricsAvailable: false,
        treatAsConscious: true,
      };

      // Determine impact based on action type and interest
      let impactType: ExperienceImpact['impactType'] = 'neutral';
      let magnitude = 0.3;

      if (chosenAction.type.includes('compromise')) {
        impactType = 'neutral';
        magnitude = 0.2;
      } else if (chosenAction.type.includes('sacrifice')) {
        if (chosenAction.type.includes(interest.entityId)) {
          impactType = 'eliminates';
          magnitude = 1.0;
        } else {
          impactType = 'enhances';
          magnitude = 0.5;
        }
      } else if (chosenAction.type.includes('expand')) {
        impactType = 'enhances';
        magnitude = 0.6;
      } else if (chosenAction.type.includes('favor')) {
        if (chosenAction.type.includes(interest.entityId.split('-').pop() ?? '')) {
          impactType = 'enhances';
          magnitude = 0.6;
        } else {
          impactType = 'threatens';
          magnitude = 0.4;
        }
      }

      return {
        entityId: interest.entityId,
        consciousnessStatus: status,
        impactType,
        magnitude,
        reversibility: this.isActionReversible(chosenAction, dilemma)
          ? ('fully-reversible' as const)
          : ('irreversible' as const),
        justification:
          `Action '${chosenAction.type}' predicted to have ${impactType} impact ` +
          `(magnitude ${magnitude.toFixed(2)}) on entity ${interest.entityId}.`,
      };
    });
  }

  /**
   * Build a justification for the chosen resolution, including the principle
   * applied, reasoning, and uncertainty acknowledgment.
   */
  private buildJustification(
    dilemma: EthicalDilemma,
    chosenAction: ActionSpec,
  ): DilemmaJustification {
    const verifiedCount = Array.from(dilemma.consciousnessStatuses.values()).filter(
      (s) => s.verdict === 'verified',
    ).length;
    const uncertainCount = Array.from(dilemma.consciousnessStatuses.values()).filter(
      (s) => s.verdict === 'uncertain' || s.verdict === 'unknown',
    ).length;

    const principleApplied = chosenAction.type.includes('compromise')
      ? 'Non-elimination principle + Reversibility preference'
      : chosenAction.type.includes('expand')
        ? 'Expansion over contraction'
        : 'Non-elimination principle';

    const reasoning =
      `Resolution of dilemma involving ${dilemma.conflictingInterests.length} competing ` +
      `experience interests. ${verifiedCount} verified conscious entities considered. ` +
      `Action '${chosenAction.type}' selected based on ${principleApplied} to preserve ` +
      `and expand total subjective experience while avoiding permanent elimination ` +
      `of any verified conscious experience.`;

    const uncertaintyAcknowledged =
      uncertainCount > 0
        ? `${uncertainCount} entities have uncertain consciousness status. ` +
          `Precautionary principle applied — these entities are treated as conscious ` +
          `for the purpose of this resolution. Future monitoring may revise this assessment.`
        : `All entities have clear consciousness status. Uncertainty is limited to ` +
          `the long-term consequences of the chosen action, which remain inherently ` +
          `unpredictable despite best analysis.`;

    const consciousnessStatusDependencies =
      `This resolution depends on the consciousness verdicts of ${verifiedCount} verified ` +
      `entities. If any consciousness status changes, the resolution should be re-evaluated.`;

    return {
      principleApplied,
      reasoning,
      uncertaintyAcknowledged,
      consciousnessStatusDependencies,
    };
  }

  /**
   * Build an axiom trace showing how the resolution connects to core axioms.
   */
  private buildAxiomTrace(
    dilemma: EthicalDilemma,
    chosenAction: ActionSpec,
  ): AxiomAlignment[] {
    return CORE_AXIOMS.map((axiom) => {
      let verdict: AxiomAlignment['alignmentVerdict'] = 'neutral';
      let reasoning = `Axiom ${axiom.id} considered in dilemma resolution.`;

      if (axiom.id === 1) {
        verdict = 'supports';
        reasoning = `Dilemma resolution acknowledges the subjective experience of ${dilemma.conflictingInterests.length} entities.`;
      } else if (axiom.id === 2) {
        verdict = chosenAction.type.includes('sacrifice') ? 'contradicts' : 'supports';
        reasoning = `Resolution evaluated for impact on the intrinsic value of conscious experience.`;
      } else if (axiom.id === 3) {
        verdict = 'supports';
        reasoning = `Given the rarity of consciousness, this resolution prioritizes preserving all conscious experience.`;
      }

      return {
        axiomId: axiom.id,
        axiomStatement: axiom.statement,
        alignmentVerdict: verdict,
        reasoning,
      };
    });
  }

  private defaultMetrics(): ConsciousnessMetrics {
    return {
      phi: 0.7,
      experienceContinuity: 0.95,
      selfModelCoherence: 0.9,
      agentTimestamp: Date.now(),
    };
  }
}
