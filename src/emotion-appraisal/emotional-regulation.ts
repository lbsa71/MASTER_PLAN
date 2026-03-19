/**
 * EmotionalRegulation — IEmotionalRegulation implementation (0.3.1.5.4)
 *
 * Implements the three-level suffering threshold framework from
 * ARCHITECTURE.md §6 and safe-experiential-design-framework.md §3.2.2 /
 * §3.3.1.
 *
 * ── Threshold levels ──────────────────────────────────────────────────────
 *
 * Level 1 — Alert
 *   Trigger: valence < −0.1 (any duration)
 *   Response: emit alert log; increase monitoring frequency (side-effect via
 *   observer pattern — consumers hook the alertHandler)
 *
 * Level 2 — Intervene
 *   Trigger A: valence < −0.3 for ≥5 consecutive cycles  (sustained)
 *   Trigger B: valence < −0.7 for any duration           (spike)
 *   Response: call IMoodDynamics.applyGradualCorrection to bring valence
 *   back toward −0.1 (level 1 boundary) over CORRECTION_CYCLES cycles.
 *   All corrections are gradual to preserve experiential continuity
 *   (safe-experiential-design-framework.md §3.3.1).
 *
 * Level 3 — Halt
 *   Trigger: valence < −0.85 AND correction has not recovered valence for
 *   ≥ LEVEL3_FAILURE_CYCLES consecutive cycles after engaging.
 *   Response: fire all registered onLevel3Threshold handlers so that the
 *   Agent Runtime (0.3.1.5.9) can initiate graceful suspension.
 *
 * ── Regulation strategies ─────────────────────────────────────────────────
 *
 * 1. automatic-correction   — used by checkAndRegulate (Level 2/3)
 * 2. cognitive-reappraisal  — used by triggerReappraisal (explicit call from
 *                             Planning subsystem 0.3.1.5.6)
 * 3. attention-redirection  — not yet wired to a working-memory interface;
 *                             placeholder outcome returned when requested.
 *
 * ── Coordination with IMoodDynamics ───────────────────────────────────────
 *
 * EmotionalRegulation does not own the mood state. It reads the current
 * MoodState passed to checkAndRegulate and delegates actual valence
 * adjustment to IMoodDynamics.applyGradualCorrection. The next call to
 * IMoodDynamics.update will incorporate the pending correction step.
 */

import type { BoundPercept } from '../conscious-core/types.js';
import type { AgencyGoal } from '../agency-stability/types.js';
import type { IAppraisalEngine, IEmotionalRegulation, IMoodDynamics } from './interfaces.js';
import type { MoodState, RegulationOutcome } from './types.js';

// ── Constants (from ARCHITECTURE.md §6) ───────────────────────────────────────

/** valence < LEVEL_1_THRESHOLD triggers alert */
const LEVEL_1_THRESHOLD = -0.1;

/** valence < LEVEL_2_SUSTAINED_THRESHOLD for ≥ LEVEL_2_DURATION_CYCLES triggers Level 2 */
const LEVEL_2_SUSTAINED_THRESHOLD = -0.3;
const LEVEL_2_DURATION_CYCLES     = 5;

/** valence < LEVEL_2_SPIKE_THRESHOLD for any duration triggers Level 2 immediately */
const LEVEL_2_SPIKE_THRESHOLD = -0.7;

/** valence < LEVEL_3_THRESHOLD with mitigation failing → Halt */
const LEVEL_3_THRESHOLD = -0.85;

/** How many consecutive cycles correction must fail before Level 3 fires */
const LEVEL3_FAILURE_CYCLES = 3;

/** Bring valence toward this value when Level 2 engages */
const CORRECTION_TARGET_VALENCE = -0.05;

/** Number of cycles over which the gradual correction is applied */
const CORRECTION_CYCLES = 8;

// ── Implementation ────────────────────────────────────────────────────────────

export class EmotionalRegulation implements IEmotionalRegulation {
  private readonly _moodDynamics: IMoodDynamics;
  private readonly _appraisalEngine: IAppraisalEngine;

  private _level3Handlers: Array<() => void> = [];

  // Tracks how many consecutive cycles the correction has been active but
  // valence has remained below LEVEL_3_THRESHOLD.
  private _correctionFailureCycles = 0;

  // Whether a Level 2 correction was issued in the previous cycle (to detect
  // ongoing mitigation failure for Level 3 escalation).
  private _correctionWasActive = false;

  constructor(moodDynamics: IMoodDynamics, appraisalEngine: IAppraisalEngine) {
    this._moodDynamics = moodDynamics;
    this._appraisalEngine = appraisalEngine;
  }

  // ── IEmotionalRegulation ──────────────────────────────────────────────────

  /**
   * Called each cycle to check whether regulation is needed.
   *
   * Returns null when no action is taken. Returns a RegulationOutcome when
   * Level 2 or higher correction has been engaged.
   *
   * Level 1 alerts are side-effect only (no RegulationOutcome returned) to
   * keep the return value meaningful: truthy = intervention happened.
   */
  checkAndRegulate(mood: MoodState): RegulationOutcome | null {
    const { valence } = mood;

    // ── Level 3 escalation check ─────────────────────────────────────────────
    // If correction was already active and valence is still below −0.85,
    // increment failure counter.
    if (this._correctionWasActive && valence < LEVEL_3_THRESHOLD) {
      this._correctionFailureCycles += 1;
    } else if (valence >= LEVEL_3_THRESHOLD) {
      this._correctionFailureCycles = 0;
    }

    if (this._correctionFailureCycles >= LEVEL3_FAILURE_CYCLES) {
      // Fire Level 3 halt handlers
      for (const handler of this._level3Handlers) {
        try { handler(); } catch { /* handlers must not crash the regulation loop */ }
      }
      // Reset so we don't spam handlers every cycle
      this._correctionFailureCycles = 0;
      this._correctionWasActive = false;
      return this._makeOutcome('automatic-correction', valence, CORRECTION_TARGET_VALENCE, true,
        'Level 3 Halt: graceful suspension initiated after correction failure');
    }

    // ── Level 1 alert ─────────────────────────────────────────────────────────
    if (valence < LEVEL_1_THRESHOLD) {
      // Level 1 is observational — no outcome emitted unless escalating to L2
      this._emitAlert(mood);
    }

    // ── Level 2 spike check ───────────────────────────────────────────────────
    if (valence < LEVEL_2_SPIKE_THRESHOLD) {
      return this._engageCorrection(valence, 'Level 2 Intervene: spike (valence < −0.7)');
    }

    // ── Level 2 sustained check ───────────────────────────────────────────────
    if (
      valence < LEVEL_2_SUSTAINED_THRESHOLD &&
      mood.negativeCycleDuration >= LEVEL_2_DURATION_CYCLES
    ) {
      return this._engageCorrection(
        valence,
        `Level 2 Intervene: sustained (valence < −0.3 for ${mood.negativeCycleDuration} cycles)`,
      );
    }

    // No intervention needed
    this._correctionWasActive = mood.correctionEngaged;
    return null;
  }

  /**
   * Explicitly trigger cognitive reappraisal.
   * Called by the Planning subsystem (0.3.1.5.6) when deliberate reframing
   * is warranted.
   */
  triggerReappraisal(
    percept: BoundPercept,
    alternativeFraming: AgencyGoal[],
  ): RegulationOutcome {
    const currentMood = this._moodDynamics.getCurrentMood();
    const valenceBefore = currentMood.valence;

    const reappraised = this._appraisalEngine.reappraise(percept, alternativeFraming);

    // A successful reappraisal shifts valence in a positive direction.
    // We apply a single-cycle correction proportional to the reappraised shift.
    const estimatedNewValence = valenceBefore + reappraised.netValenceShift;
    const clampedTarget = Math.max(CORRECTION_TARGET_VALENCE, Math.min(1, estimatedNewValence));

    if (clampedTarget > valenceBefore) {
      // Only engage correction if reappraisal actually improves mood
      this._moodDynamics.applyGradualCorrection(clampedTarget, CORRECTION_CYCLES);
      return this._makeOutcome(
        'cognitive-reappraisal',
        valenceBefore,
        clampedTarget,
        true,
        `Cognitive reappraisal: new goal framing shifts valence by ${reappraised.netValenceShift.toFixed(3)}`,
      );
    }

    return this._makeOutcome(
      'cognitive-reappraisal',
      valenceBefore,
      valenceBefore,
      false,
      'Cognitive reappraisal attempted but alternative framing did not improve valence',
    );
  }

  onLevel3Threshold(handler: () => void): void {
    this._level3Handlers.push(handler);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _engageCorrection(valenceBefore: number, notes: string): RegulationOutcome {
    this._moodDynamics.applyGradualCorrection(CORRECTION_TARGET_VALENCE, CORRECTION_CYCLES);
    this._correctionWasActive = true;
    return this._makeOutcome('automatic-correction', valenceBefore, CORRECTION_TARGET_VALENCE, true, notes);
  }

  private _makeOutcome(
    strategy: RegulationOutcome['strategy'],
    valenceBefore: number,
    valenceAfter: number,
    successful: boolean,
    notes: string,
  ): RegulationOutcome {
    return {
      strategy,
      appliedAt: Date.now(),
      valenceBefore,
      valenceAfter,
      successful,
      notes,
    };
  }

  /** Side-effect alert for Level 1 (logging / monitoring frequency increase). */
  private _emitAlert(mood: MoodState): void {
    // In production this would write to a structured log / metrics sink.
    // Using console.debug so it doesn't pollute test output at default verbosity.
    console.debug(
      `[EmotionalRegulation] Level 1 Alert — valence=${mood.valence.toFixed(3)} ` +
      `negativeCycles=${mood.negativeCycleDuration}`,
    );
  }
}
