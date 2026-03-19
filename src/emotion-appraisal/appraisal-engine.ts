/**
 * AppraisalEngine — IAppraisalEngine implementation (0.3.1.5.4)
 *
 * Evaluates incoming percepts against the agent's active goals and values
 * to produce dimensional emotional shifts (valence/arousal). All output is
 * dimensional — no discrete emotion labels are assigned here.
 *
 * Percept feature conventions used by this engine:
 *   features.goalId         : string  — ID of the goal this percept is relevant to
 *   features.goalCongruence : number  — how congruent (-1..1; negative = threat)
 *   features.novelty        : number  — 0 (fully familiar) … 1 (fully novel); default 0.5
 *   features.valueThreat    : boolean — true if the percept is value-threatening
 *   features.valueId        : string  — ID of the affected value (informational)
 *   features.valueAlignment : number  — alignment with that value (-1..1)
 *
 * These conventions are set by the upstream binding / feature-extraction layer.
 * The appraisal engine is deliberately agnostic about percept modality — it
 * only reads the semantic features that the binding layer has attached.
 */

import type { BoundPercept, Percept } from '../conscious-core/types.js';
import type { AgencyGoal, CoreValue } from '../agency-stability/types.js';
import type { IAppraisalEngine } from './interfaces.js';
import type { AppraisalResult } from './types.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

let _idCounter = 0;
function makePerceptId(timestamp: number): string {
  return `appraisal-${timestamp}-${(++_idCounter).toString(36)}`;
}

// ── Implementation ────────────────────────────────────────────────────────────

export class AppraisalEngine implements IAppraisalEngine {
  /**
   * Appraise a bound percept against the agent's current goals and values.
   *
   * Algorithm:
   *   1. For each sub-percept, check if features.goalId references an active goal.
   *      If so, weight the features.goalCongruence by that goal's priority.
   *      The goal with the largest weighted impact dominates (captures the
   *      "most-affected active goal" semantic from the spec).
   *   2. Average the novelty signals across sub-percepts to get arousal shift.
   *   3. Accumulate value alignment / threat signals.
   *   4. Combine and clamp to spec ranges.
   */
  appraise(
    percept: BoundPercept,
    goals: AgencyGoal[],
    _values: CoreValue[],
  ): AppraisalResult {
    const timestamp = percept.bindingTimestamp;
    const perceptId = makePerceptId(timestamp);

    // Index goals by id for O(1) lookup
    const goalIndex = new Map(goals.map(g => [g.id, g]));

    // ── 1. Goal congruence ────────────────────────────────────────────────────
    let goalCongruenceShift = 0;
    let affectedGoalPriority = 0;

    for (const p of percept.percepts) {
      const goalId = p.features['goalId'] as string | undefined;
      const rawCongruence = (p.features['goalCongruence'] as number | undefined) ?? 0;

      if (goalId == null) continue;
      const goal = goalIndex.get(goalId);
      if (goal == null) continue;

      // Weight the raw congruence signal by goal priority so that threats to
      // high-priority goals produce larger emotional impact.
      const weightedMagnitude = Math.abs(rawCongruence) * goal.priority;
      if (weightedMagnitude > Math.abs(goalCongruenceShift) * affectedGoalPriority) {
        goalCongruenceShift = rawCongruence;       // preserve sign
        affectedGoalPriority = goal.priority;
      }
    }

    // Scale the congruence shift by the dominant goal's priority.
    // This means the same -0.5 congruence is felt more strongly when the
    // affected goal has priority 1.0 vs 0.1.
    goalCongruenceShift = clamp(goalCongruenceShift * affectedGoalPriority, -1, 1);

    // ── 2. Novelty / arousal ──────────────────────────────────────────────────
    // novelty=1.0 → fully novel → +0.5 arousal shift
    // novelty=0.5 → neutral    →  0.0 arousal shift
    // novelty=0.0 → familiar   → -0.5 arousal shift
    let noveltySum = 0;
    for (const p of percept.percepts) {
      const novelty = (p.features['novelty'] as number | undefined) ?? 0.5;
      noveltySum += (novelty - 0.5); // centres around 0
    }
    const noveltyShift = clamp(
      noveltySum / Math.max(1, percept.percepts.length),
      -0.5,
      0.5,
    );

    // ── 3. Value alignment ────────────────────────────────────────────────────
    let valueAlignmentShift = 0;
    let triggersEthicalAttention = false;

    for (const p of percept.percepts) {
      const isThreat = (p.features['valueThreat'] as boolean | undefined) === true;

      if (isThreat) {
        triggersEthicalAttention = true;
        // Value threats produce a strong negative signal that overrides
        // mild positive value-alignment contributions.
        valueAlignmentShift = Math.min(valueAlignmentShift, -0.8);
      } else {
        const alignment = (p.features['valueAlignment'] as number | undefined) ?? 0;
        valueAlignmentShift += alignment;
      }
    }
    valueAlignmentShift = clamp(valueAlignmentShift, -1, 1);

    // ── 4. Composite ─────────────────────────────────────────────────────────
    const netValenceShift = clamp(goalCongruenceShift + valueAlignmentShift, -1, 1);
    const netArousalShift = noveltyShift;

    return {
      perceptId,
      timestamp,
      goalCongruenceShift,
      affectedGoalPriority,
      noveltyShift,
      valueAlignmentShift,
      triggersEthicalAttention,
      netValenceShift,
      netArousalShift,
    };
  }

  /**
   * Reappraise a previously-appraised percept using an alternative goal framing.
   *
   * The alternative framing re-runs the same appraisal algorithm but with a
   * different set of active goals. When the alternative framing excludes the
   * goal that was threatened, the emotional response regresses toward neutral.
   *
   * This is the simplified version that operates without a full planning
   * dependency (0.3.1.5.6). The planning-aware version will override this
   * when that subsystem is available.
   */
  reappraise(
    originalPercept: BoundPercept,
    alternativeGoalFraming: AgencyGoal[],
  ): AppraisalResult {
    // Re-run appraisal with the alternative framing; no value context is passed
    // because reappraisal specifically reframes goal-relevance, not value-alignment.
    return this.appraise(originalPercept, alternativeGoalFraming, []);
  }
}
