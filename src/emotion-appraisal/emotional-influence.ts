/**
 * EmotionalInfluence — IEmotionalInfluence implementation (0.3.1.5.4)
 *
 * Derives the EmotionalInfluenceVector that other subsystems use to
 * modulate their behaviour based on the agent's current mood.
 *
 * Consumers:
 *   - Conscious Core deliberate() — deliberationConfidenceBias,
 *                                   alternativesExpansionFactor
 *   - Memory Subsystem (0.3.1.5.3) — memoryValenceBias
 *   - Action selection             — riskConservatismFactor
 *   - Language Subsystem (0.3.1.5.7) — communicationToneBias
 *
 * All derivations are deterministic linear mappings from the mood's valence
 * and arousal values so that:
 *   1. The same mood always produces the same influence vector (testable).
 *   2. Downstream tests can verify that different mood states produce
 *      different deliberation / memory / risk outputs (AC #4, #5).
 *
 * Coefficient derivations (see ARCHITECTURE.md §5):
 *
 *   deliberationConfidenceBias
 *     = clamp(valence * 0.3, −0.3, +0.3)
 *     Positive valence → up to +0.3 confidence boost.
 *     Negative valence → up to −0.3 confidence penalty.
 *
 *   alternativesExpansionFactor
 *     = clamp(−valence * 0.5 + 0.5, 0, 1)
 *     valence=−1 → 1.0 (explore all alternatives)
 *     valence= 0 → 0.5 (moderate expansion)
 *     valence=+1 → 0.0 (trust top choice, explore none)
 *
 *   memoryValenceBias
 *     = clamp(valence, −1, 1)   [pass-through — sign identical to mood sign]
 *     Positive mood → retrieval biased toward positive memories; vice-versa.
 *
 *   riskConservatismFactor
 *     = clamp(arousal, 0, 1)   [pass-through — higher arousal = more conservative]
 *
 *   communicationToneBias
 *     = clamp(valence * 0.7, −1, 1)
 *     Slightly attenuated relative to valence so extreme moods don't produce
 *     entirely abnormal communication.
 */

import type { IMoodDynamics } from './interfaces.js';
import type { IEmotionalInfluence } from './interfaces.js';
import type { EmotionalInfluenceVector } from './types.js';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class EmotionalInfluence implements IEmotionalInfluence {
  constructor(private readonly _moodDynamics: IMoodDynamics) {}

  // ── IEmotionalInfluence ───────────────────────────────────────────────────

  getInfluenceVector(): EmotionalInfluenceVector {
    const mood = this._moodDynamics.getCurrentMood();
    const { valence, arousal } = mood;

    return {
      mood,
      timestamp: Date.now(),

      // Positive valence → confidence boost (up to +0.3)
      // Negative valence → confidence penalty (down to −0.3)
      deliberationConfidenceBias: clamp(valence * 0.3, -0.3, 0.3),

      // Negative valence → expand alternatives explored (up to 1.0)
      // Positive valence → reduce alternative exploration (down to 0.0)
      alternativesExpansionFactor: clamp(-valence * 0.5 + 0.5, 0, 1),

      // Mood-congruent memory bias — sign mirrors current valence
      memoryValenceBias: clamp(valence, -1, 1),

      // High arousal → more conservative action selection
      riskConservatismFactor: clamp(arousal, 0, 1),

      // Tonal influence — slightly attenuated relative to raw valence
      communicationToneBias: clamp(valence * 0.7, -1, 1),
    };
  }
}
