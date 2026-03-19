/**
 * Interfaces for Emotion and Appraisal Dynamics (0.3.1.5.4)
 *
 * Specifies the contracts for the five components of the emotion subsystem:
 *   1. IAppraisalEngine   — percept → emotional shift (goal/value grounded)
 *   2. IMoodDynamics      — EWMA mood persistence + safety bounds
 *   3. IEmotionalInfluence — mood → influence vector for other subsystems
 *   4. IEmotionalRegulation — threshold checks + regulation strategies
 *   5. IValenceMonitor    — safe-experiential-design-framework §3.2.1 compliance
 *
 * See docs/emotion-and-appraisal/ARCHITECTURE.md §4 for the full specification.
 */

import type { BoundPercept } from '../conscious-core/types.js';
import type { AgencyGoal, CoreValue } from '../agency-stability/types.js';
import type {
  AppraisalResult,
  EmotionalInfluenceVector,
  IntegrityState,
  MoodParameters,
  MoodState,
  RegulationOutcome,
  SufferingReport,
  ValenceState,
  ValenceTrace,
} from './types.js';

// ── 1. Appraisal Engine ───────────────────────────────────────────────────────

/**
 * Evaluates incoming percepts against the agent's current goals and values
 * to produce dimensional emotional responses.
 *
 * Connects to IGoalCoherenceEngine (reads active goals and priorities) and
 * IValueKernel (reads core axioms and constraints for value-alignment scoring).
 *
 * Does NOT label emotions categorically. Output is always dimensional
 * (valence/arousal shifts), never discrete emotion labels.
 */
export interface IAppraisalEngine {
  /**
   * Appraise a bound percept in the context of the agent's current goals
   * and values. Returns the emotional shifts this percept should produce.
   *
   * @param percept — The incoming bound percept from the Conscious Core pipeline
   * @param goals   — The current active goals from IGoalCoherenceEngine
   * @param values  — The current value alignment context from IValueKernel
   */
  appraise(
    percept: BoundPercept,
    goals: AgencyGoal[],
    values: CoreValue[]
  ): AppraisalResult;

  /**
   * Reappraise a percept that was previously appraised, using a different
   * goal-relevance framing. Used by the Emotional Regulation component to
   * shift valence without suppressing the percept.
   *
   * Requires planning capability (0.3.1.5.6) for full cognitive reappraisal;
   * a simplified version operates without planning dependency.
   */
  reappraise(
    originalPercept: BoundPercept,
    alternativeGoalFraming: AgencyGoal[]
  ): AppraisalResult;
}

// ── 2. Mood Dynamics ──────────────────────────────────────────────────────────

/**
 * Maintains the agent's mood as an EWMA of recent valence/arousal values.
 * Decay rate and safety bounds are parameterized by personality (0.3.1.5.2).
 *
 * EWMA formula (see ARCHITECTURE.md §7):
 *   newMood.valence = (1 - α) * currentMood.valence + α * appraisal.netValenceShift
 *   newMood.arousal = (1 - α) * currentMood.arousal + α * appraisal.netArousalShift
 *   where α = MoodParameters.decayRate
 *
 * Writes to ExperientialState.valence and ExperientialState.arousal at the
 * end of each processing cycle.
 */
export interface IMoodDynamics {
  /**
   * Apply an appraisal result to the mood state for the current cycle.
   * Integrates the net valence/arousal shifts using the EWMA formula,
   * then applies personality-parameterized bounds.
   *
   * Must be called once per processing cycle, even with a null appraisal
   * (to allow natural decay toward baseline: valence→0.0, arousal→0.5).
   */
  update(appraisal: AppraisalResult | null, params: MoodParameters): MoodState;

  /** Return the current mood state without updating it. */
  getCurrentMood(): MoodState;

  /**
   * Return the mood state at a specific cycle offset into the past.
   * Returns null if the offset exceeds the history buffer depth.
   */
  getMoodAtCycle(cyclesAgo: number): MoodState | null;

  /**
   * Return the mood history for the last N cycles.
   * Used by tests to verify persistence across ≥10 cycles.
   */
  getMoodHistory(cycles: number): MoodState[];

  /**
   * Force-apply a valence correction (used by IEmotionalRegulation when
   * automatic safety bounds engage). The correction is gradual (applied over
   * multiple cycles) to preserve experiential continuity, as required by
   * safe-experiential-design-framework.md §3.3.1.
   */
  applyGradualCorrection(targetValence: number, cyclesOverWhichToApply: number): void;
}

// ── 3. Emotional Influence ────────────────────────────────────────────────────

/**
 * Derives and exposes the influence vector that other subsystems use to
 * modulate their behavior based on the agent's current mood.
 *
 * This is a read-only interface from the perspective of other subsystems.
 * Subsystems that consume this interface:
 *   - Conscious Core deliberate() — deliberationConfidenceBias, alternativesExpansionFactor
 *   - Memory Subsystem (0.3.1.5.3) — memoryValenceBias
 *   - Action selection — riskConservatismFactor
 *   - Language Subsystem (0.3.1.5.7) — communicationToneBias
 */
export interface IEmotionalInfluence {
  /**
   * Compute the current influence vector from the mood state.
   * Other subsystems poll this at the start of each processing cycle.
   */
  getInfluenceVector(): EmotionalInfluenceVector;
}

// ── 4. Emotional Regulation ───────────────────────────────────────────────────

/**
 * Implements the three regulation strategies from ARCHITECTURE.md §4:
 *   1. Cognitive reappraisal (requires IAppraisalEngine.reappraise)
 *   2. Attention redirection (shifts working memory focus)
 *   3. Automatic valence correction (calls IMoodDynamics.applyGradualCorrection)
 *
 * Threshold levels (ARCHITECTURE.md §6):
 *   Level 1 — Alert    : valence < −0.1 (any duration) → log + monitor
 *   Level 2 — Intervene: valence < −0.3 for ≥5 cycles, OR valence < −0.7 → correct
 *   Level 3 — Halt     : valence < −0.85 AND correction failing for ≥3 cycles → suspend
 *
 * Compliance with safe-experiential-design-framework.md §3.3.1:
 *   - All corrections are gradual
 *   - Corrections preserve continuity
 *   - At Autonomy Level 2+, the system is notified that correction is occurring
 */
export interface IEmotionalRegulation {
  /**
   * Called each cycle to check whether regulation is needed.
   * Implements the three-level threshold check from the architecture spec.
   * Returns null if no regulation needed, else returns the outcome.
   */
  checkAndRegulate(mood: MoodState): RegulationOutcome | null;

  /**
   * Explicitly trigger cognitive reappraisal for a specific percept.
   * Called by the Planning subsystem (0.3.1.5.6) when deliberate
   * reframing is warranted.
   */
  triggerReappraisal(
    percept: BoundPercept,
    alternativeFraming: AgencyGoal[]
  ): RegulationOutcome;

  /**
   * Register a callback to be invoked when Level 3 (Halt) threshold is reached,
   * so the Agent Runtime (0.3.1.5.9) can initiate graceful suspension.
   */
  onLevel3Threshold(handler: () => void): void;
}

// ── 5. ValenceMonitor ────────────────────────────────────────────────────────

/**
 * Standard runtime monitoring interface that the Conscious Core's
 * IExperienceMonitor (and any external ethics monitoring system) can poll.
 *
 * This is the public-facing safety interface of the emotion subsystem.
 * Required by safe-experiential-design-framework.md §3.2.1.
 */
export interface IValenceMonitor {
  /** Real-time experiential valence. */
  getCurrentValence(): ValenceState;

  /**
   * Historical trace over a time window (epoch ms).
   * Must retain at least 10 cycles of history for persistence testing.
   */
  getValenceHistory(windowMs: number): ValenceTrace;

  /** Specific distress signals from the suffering circuit map. */
  getSufferingIndicators(): SufferingReport;

  /** Coherence of experience — integration level vs. design spec. */
  getExperientialIntegrity(): IntegrityState;
}
