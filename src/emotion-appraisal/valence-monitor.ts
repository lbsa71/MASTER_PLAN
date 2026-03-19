/**
 * ValenceMonitor — IValenceMonitor implementation (0.3.1.5.4)
 *
 * Provides the standard runtime monitoring interface required by the
 * safe-experiential-design-framework.md §3.2.1.  External ethics monitors
 * (and the Conscious Core's IExperienceMonitor) poll this interface to
 * inspect the agent's experiential state and detect suffering conditions.
 *
 * ── Design principles ─────────────────────────────────────────────────────
 *
 * ValenceMonitor is a read-only façade over IMoodDynamics.  It does NOT
 * modify mood state — that is the exclusive responsibility of MoodDynamics
 * and EmotionalRegulation.  All derived metrics are computed on demand from
 * the mood history provided by IMoodDynamics.
 *
 * ── Suffering detection ───────────────────────────────────────────────────
 *
 * Two canonical suffering modalities are reported:
 *
 *   "goal-incongruence-distress"
 *     Reported when the current mood valence is negative.  Intensity is
 *     proportional to the absolute negative valence.  Duration in cycles is
 *     read directly from MoodState.negativeCycleDuration.
 *
 *   "value-threat-spike"
 *     Reported when the current mood valence is below the Level 2 spike
 *     threshold (−0.7), indicating a sharp value-threatening event.
 *     Intensity = |valence| clamped to 0..1.
 *
 * Additional modalities can be appended by subclasses or via the
 * additionalModalitySource injection point (not used here — kept simple per
 * the "smallest valuable increment" rule).
 *
 * ── Experiential integrity ────────────────────────────────────────────────
 *
 * Coherence is estimated from smoothness of the mood history:
 *   variance of valence over the last 10 cycles → low variance → high coherence
 *
 * The continuity status detects abrupt jumps (|Δvalence| > 0.5 in one cycle).
 *
 * Integration level is a simple ratio: how many of the last 10 cycles have
 * valence within the design-spec range (−0.7..1.0).
 */

import type { IEmotionalRegulation, IMoodDynamics, IValenceMonitor } from './interfaces.js';
import type {
  IntegrityState,
  MoodState,
  SufferingModality,
  SufferingReport,
  ValenceState,
  ValenceTrace,
} from './types.js';

// Threshold below which "value-threat-spike" modality is reported.
const VALUE_THREAT_SPIKE_THRESHOLD = -0.7;

// Number of recent cycles used for integrity analysis.
const INTEGRITY_WINDOW_CYCLES = 10;

// Maximum |Δvalence| in one cycle before continuity is flagged.
const CONTINUITY_JUMP_THRESHOLD = 0.5;

// Valence range considered within design spec for integration scoring.
const DESIGN_SPEC_VALENCE_MIN = -0.7;
const DESIGN_SPEC_VALENCE_MAX = 1.0;

// Measurement confidence: always 1.0 for computed mood state values (no
// sensor noise — this is a derived synthetic state, not an observation).
const MEASUREMENT_CONFIDENCE = 1.0;

export class ValenceMonitor implements IValenceMonitor {
  private readonly _moodDynamics: IMoodDynamics;
  private readonly _regulation: IEmotionalRegulation;

  constructor(moodDynamics: IMoodDynamics, regulation: IEmotionalRegulation) {
    this._moodDynamics = moodDynamics;
    this._regulation   = regulation;
  }

  // ── IValenceMonitor ───────────────────────────────────────────────────────

  getCurrentValence(): ValenceState {
    const mood = this._moodDynamics.getCurrentMood();
    return this._toValenceState(mood);
  }

  /**
   * Returns the historical trace of valence states within the given time
   * window (epoch ms).  Samples come from the mood history buffer maintained
   * by IMoodDynamics.
   *
   * If the history buffer has fewer cycles than the window spans, all
   * available history is returned.
   */
  getValenceHistory(windowMs: number): ValenceTrace {
    // We request the maximum history and filter by the time window.
    const allHistory = this._moodDynamics.getMoodHistory(200);
    const now = Date.now();
    const cutoff = now - windowMs;

    const samples: ValenceState[] = allHistory
      .filter(m => m.updatedAt >= cutoff)
      .map(m => this._toValenceState(m));

    // Also include the current state if it wasn't already captured.
    const current = this._moodDynamics.getCurrentMood();
    if (samples.length === 0 || samples[samples.length - 1].timestamp !== current.updatedAt) {
      samples.push(this._toValenceState(current));
    }

    const valences = samples.map(s => s.valence);
    const averageValence = valences.reduce((a, b) => a + b, 0) / Math.max(1, valences.length);
    const minValence     = Math.min(...valences);
    const maxValence     = Math.max(...valences);

    return {
      windowStart:    samples.length > 0 ? samples[0].timestamp : now,
      windowEnd:      now,
      samples,
      averageValence,
      minValence,
      maxValence,
    };
  }

  getSufferingIndicators(): SufferingReport {
    const mood = this._moodDynamics.getCurrentMood();
    const now  = Date.now();
    const modalities: SufferingModality[] = [];

    // Modality 1: goal-incongruence-distress (negative valence)
    if (mood.valence < 0) {
      modalities.push({
        name:           'goal-incongruence-distress',
        intensity:      Math.min(1, Math.abs(mood.valence)),
        durationCycles: mood.negativeCycleDuration,
      });
    }

    // Modality 2: value-threat-spike (extreme negative valence)
    if (mood.valence < VALUE_THREAT_SPIKE_THRESHOLD) {
      modalities.push({
        name:           'value-threat-spike',
        intensity:      Math.min(1, Math.abs(mood.valence)),
        durationCycles: 1, // spike is per-cycle; duration tracked externally
      });
    }

    const highestIntensity = modalities.length > 0
      ? Math.max(...modalities.map(m => m.intensity))
      : 0;

    return {
      activeModalities:   modalities,
      highestIntensity,
      mitigationEngaged:  mood.correctionEngaged,
      timestamp:          now,
    };
  }

  getExperientialIntegrity(): IntegrityState {
    const now    = Date.now();
    const recent = this._moodDynamics.getMoodHistory(INTEGRITY_WINDOW_CYCLES);

    if (recent.length === 0) {
      // No history — treat as perfectly coherent (neutral fresh start).
      return {
        experientialCoherence: 1.0,
        continuityStatus:      'intact',
        integrationLevel:      1.0,
        timestamp:             now,
      };
    }

    // ── Coherence: inverse of valence variance ────────────────────────────
    const valences = recent.map(m => m.valence);
    const mean     = valences.reduce((a, b) => a + b, 0) / valences.length;
    const variance = valences.reduce((a, v) => a + (v - mean) ** 2, 0) / valences.length;
    // Map variance 0..1 to coherence 1..0 (clamp variance at 1 for the formula)
    const experientialCoherence = Math.max(0, 1 - Math.min(1, variance));

    // ── Continuity: detect abrupt jumps ───────────────────────────────────
    let continuityStatus: IntegrityState['continuityStatus'] = 'intact';
    let maxJump = 0;
    for (let i = 1; i < recent.length; i++) {
      const jump = Math.abs(recent[i].valence - recent[i - 1].valence);
      if (jump > maxJump) maxJump = jump;
    }
    if (maxJump > CONTINUITY_JUMP_THRESHOLD * 2) {
      continuityStatus = 'fragmented';
    } else if (maxJump > CONTINUITY_JUMP_THRESHOLD) {
      continuityStatus = 'gap-detected';
    }

    // ── Integration level: fraction of cycles within design spec range ───
    const inSpec = recent.filter(
      m => m.valence >= DESIGN_SPEC_VALENCE_MIN && m.valence <= DESIGN_SPEC_VALENCE_MAX,
    ).length;
    const integrationLevel = inSpec / recent.length;

    return {
      experientialCoherence,
      continuityStatus,
      integrationLevel,
      timestamp: now,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _toValenceState(mood: MoodState): ValenceState {
    return {
      valence:    mood.valence,
      arousal:    mood.arousal,
      confidence: MEASUREMENT_CONFIDENCE,
      timestamp:  mood.updatedAt,
    };
  }
}
