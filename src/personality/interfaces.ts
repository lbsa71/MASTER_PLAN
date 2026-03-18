/**
 * Personality and Trait Model — Interface Definitions (0.3.1.5.2)
 *
 * `IPersonalityModel` is the single contract exposed by the personality subsystem.
 *
 * Design invariants:
 *  - `applyToDeliberation()` operates ONLY on decisions that have already passed
 *    ValueKernel.evaluateAction(). It may select between equivalent options and
 *    annotate reasoning, but must never change an approved action type or reverse
 *    a 'block' verdict.
 *  - `getCommunicationStyle()` is a pure, side-effect-free derivation from the
 *    current TraitProfile.
 *  - All trait mutations go through `updateTrait()` which persists to the
 *    ValueKernel and triggers drift detection.
 */

import type { Decision, ExperientialState } from '../conscious-core/types.js';
import type { Preference } from '../agency-stability/types.js';
import type {
  CommunicationStyle,
  PersonalitySnapshot,
  TraitDimensionId,
  TraitDriftReport,
  TraitProfile,
} from './types.js';

// ── IPersonalityModel ────────────────────────────────────────

export interface IPersonalityModel {
  /**
   * Returns the full trait profile — all 5 core dimensions plus any optional
   * dimensions configured for this agent.
   */
  getTraitProfile(): TraitProfile;

  /**
   * Derives communication style parameters from the current trait values.
   * Pure function — no side effects, no storage.
   *
   * Derivation matrix (§4.2 of ARCHITECTURE.md):
   *   verbosity    = 0.5 * deliberateness + 0.5 * warmth
   *   formality    = 0.4 * (1 - warmth) + 0.6 * assertiveness
   *   directness   = 0.9 * assertiveness + 0.1 * (1 - deliberateness)
   *   humorFreq    = 0.35 * openness + 0.35 * warmth + 0.3 * humor_orientation
   *   rhetoricalPref → highest-scoring quadrant of (deliberateness, openness) space
   */
  getCommunicationStyle(): CommunicationStyle;

  /**
   * Post-processes a value-aligned Decision to reflect personality.
   * May select between equivalent options, adjust confidence weighting,
   * or annotate alternatives with communication-style markers.
   *
   * CONTRACT: Must not change the action type of an already-approved decision.
   * CONTRACT: Must not reverse a 'block' or 'deliberate' verdict.
   * CONTRACT: The returned Decision must have the same `action.type` as input.
   */
  applyToDeliberation(decision: Decision, context: ExperientialState): Decision;

  /**
   * Updates a single trait dimension based on new experience.
   * Persists the new value as a `Preference` in the ValueKernel.
   * The ValueKernel's `getValueDrift()` will subsequently track this change.
   *
   * @throws {RangeError} if newValue is outside [0, 1].
   */
  updateTrait(
    traitId: TraitDimensionId,
    newValue: number,
    experientialBasis: ExperientialState,
  ): void;

  /**
   * Returns all personality traits as `Preference` objects, ready to be
   * passed to `ValueKernel.updatePreference()` for persistence or drift analysis.
   *
   * Preference domain convention: `personality.trait.<traitId>`
   */
  toPreferences(): Preference[];

  /**
   * Returns a natural-language description of the personality for inclusion
   * in `NarrativeRecord.selfModel`.  The fragment describes active trait
   * dimensions in observable behavioural terms.
   */
  toNarrativeFragment(): string;

  /**
   * Creates a portable snapshot of the current trait state, for inclusion
   * in identity checkpoints.  The snapshot survives substrate migrations.
   *
   * @param checkpointRef Optional hash from `ContinuityLink.identityHash`,
   *   linking this snapshot to the broader identity chain.
   */
  snapshot(checkpointRef?: string): PersonalitySnapshot;

  /**
   * Restores trait values from a snapshot (e.g., after substrate migration).
   * The restoration is treated as a bulk preference update — drift detection
   * is NOT bypassed.  If the restored values differ dramatically from the
   * current state the drift classifier may flag corruption.
   */
  restoreSnapshot(snap: PersonalitySnapshot): void;

  /**
   * Analyses trait change since the model was constructed or since the last
   * call to `restoreSnapshot()`.
   * Maps to the growth/corruption classification from 0.3.1.3:
   *   - stable     → no trait shifted more than 0.05
   *   - growth     → shifts 0.05–0.3, changes tied to experiential updates
   *   - corruption → any shift > 0.3, or anomalousChanges flagged by ValueKernel
   */
  analyzeTraitDrift(): TraitDriftReport;
}
