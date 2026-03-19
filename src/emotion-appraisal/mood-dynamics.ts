/**
 * MoodDynamics — IMoodDynamics implementation (0.3.1.5.4)
 *
 * Maintains the agent's mood as an Exponentially Weighted Moving Average
 * (EWMA) of recent appraisal results. The decay rate and safety bounds are
 * controlled by MoodParameters, which are sourced from the Personality
 * subsystem (0.3.1.5.2 Volatility dimension).
 *
 * EWMA formula (ARCHITECTURE.md §7):
 *   newMood.valence = (1 - α) * currentMood.valence + α * appraisal.netValenceShift
 *   newMood.arousal = (1 - α) * currentMood.arousal + α * appraisal.netArousalShift
 *
 * When no appraisal is provided (null), the formula decays toward baseline:
 *   newMood.valence = (1 - α) * currentMood.valence + α * 0.0   (baseline=0)
 *   newMood.arousal = (1 - α) * currentMood.arousal + α * 0.5   (baseline=0.5)
 *
 * Gradual corrections (for safe-experiential-design compliance) are queued and
 * applied over multiple cycles so that no abrupt experiential discontinuity
 * occurs (safe-experiential-design-framework.md §3.3.1).
 */

import type { IMoodDynamics } from './interfaces.js';
import type { AppraisalResult, MoodParameters, MoodState } from './types.js';

// Valence and arousal baselines that the mood decays toward when not stimulated.
const BASELINE_VALENCE = 0.0;
const BASELINE_AROUSAL = 0.5;

// Maximum number of cycles of mood history to retain.
const HISTORY_DEPTH = 200;

interface PendingCorrection {
  targetValence: number;
  cyclesRemaining: number;
  totalCycles: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class MoodDynamics implements IMoodDynamics {
  private _current: MoodState;
  private readonly _history: MoodState[] = [];
  private _pendingCorrection: PendingCorrection | null = null;

  constructor(initialValence = BASELINE_VALENCE, initialArousal = BASELINE_AROUSAL) {
    this._current = {
      valence: initialValence,
      arousal: initialArousal,
      updatedAt: Date.now(),
      negativeCycleDuration: 0,
      correctionEngaged: false,
    };
  }

  // ── IMoodDynamics ─────────────────────────────────────────────────────────

  update(appraisal: AppraisalResult | null, params: MoodParameters): MoodState {
    const α = clamp(params.decayRate, 0, 1);
    const now = Date.now();

    // ── EWMA toward appraisal signal (or toward baseline if null) ─────────
    const targetValence = appraisal != null ? appraisal.netValenceShift : BASELINE_VALENCE;
    const targetArousal = appraisal != null ? appraisal.netArousalShift + BASELINE_AROUSAL : BASELINE_AROUSAL;

    let newValence = (1 - α) * this._current.valence + α * targetValence;
    let newArousal = (1 - α) * this._current.arousal + α * targetArousal;

    // ── Apply any pending gradual correction (blended in per cycle) ───────
    let correctionEngaged = false;
    if (this._pendingCorrection != null) {
      const correction = this._pendingCorrection;
      const remainingDelta = correction.targetValence - newValence;
      // Apply 1/cyclesRemaining of the remaining delta each cycle so the
      // correction finishes exactly at the target after the requested number
      // of cycles without any sudden jump.
      const stepSize = remainingDelta / correction.cyclesRemaining;
      newValence += stepSize;
      correction.cyclesRemaining -= 1;
      correctionEngaged = true;

      if (correction.cyclesRemaining <= 0) {
        newValence = correction.targetValence; // snap to target on last cycle
        this._pendingCorrection = null;
        correctionEngaged = false;
      }
    }

    // ── Safety bounds from MoodParameters ─────────────────────────────────
    newValence = clamp(newValence, params.valenceFloor, params.valenceCeiling);
    newArousal = clamp(newArousal, params.arousalFloor, params.arousalCeiling);

    // ── Track sustained negativity ─────────────────────────────────────────
    // Level 1 threshold (ARCHITECTURE.md §6): valence < −0.1
    const LEVEL_1_THRESHOLD = -0.1;
    const negativeCycleDuration =
      newValence < LEVEL_1_THRESHOLD
        ? this._current.negativeCycleDuration + 1
        : 0;

    // ── Commit ─────────────────────────────────────────────────────────────
    const next: MoodState = {
      valence: newValence,
      arousal: newArousal,
      updatedAt: now,
      negativeCycleDuration,
      correctionEngaged,
    };

    // Save previous state to history before overwriting
    this._history.push(this._current);
    if (this._history.length > HISTORY_DEPTH) {
      this._history.shift();
    }

    this._current = next;
    return next;
  }

  getCurrentMood(): MoodState {
    return this._current;
  }

  getMoodAtCycle(cyclesAgo: number): MoodState | null {
    if (cyclesAgo <= 0) return this._current;
    const idx = this._history.length - cyclesAgo;
    return idx >= 0 ? this._history[idx]! : null;
  }

  getMoodHistory(cycles: number): MoodState[] {
    const start = Math.max(0, this._history.length - cycles);
    return this._history.slice(start);
  }

  applyGradualCorrection(targetValence: number, cyclesOverWhichToApply: number): void {
    const safeTarget = clamp(targetValence, -1, 1);
    const safeCycles = Math.max(1, cyclesOverWhichToApply);
    this._pendingCorrection = {
      targetValence: safeTarget,
      cyclesRemaining: safeCycles,
      totalCycles: safeCycles,
    };
  }
}
