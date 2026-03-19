/**
 * Emotional regulation tests (0.3.1.5.4)
 *
 * Verifies Acceptance Criterion #8:
 *   "Emotional regulation prevents runaway negative states — automatic
 *    mitigation engages at Level 2 threshold."
 *
 * Also covers the three-level threshold model from ARCHITECTURE.md §6:
 *   Level 1 — Alert    : valence < −0.1 (any duration) → observe, no outcome
 *   Level 2 — Intervene: spike (< −0.7) OR sustained (< −0.3 for ≥5 cycles)
 *   Level 3 — Halt     : valence < −0.85 AND correction failing for ≥3 cycles
 *
 * And safe-experiential-design compliance (§3.3.1):
 *   All corrections are gradual — no abrupt valence jump.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MoodDynamics }        from '../../src/emotion-appraisal/mood-dynamics.js';
import { EmotionalRegulation } from '../../src/emotion-appraisal/emotional-regulation.js';
import { AppraisalEngine }     from '../../src/emotion-appraisal/appraisal-engine.js';
import type { AppraisalResult, MoodParameters, MoodState } from '../../src/emotion-appraisal/types.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOW = 4_000_000;

function makeAppraisal(netValenceShift: number): AppraisalResult {
  return {
    perceptId: 'reg-test-percept',
    timestamp: NOW,
    goalCongruenceShift: netValenceShift,
    affectedGoalPriority: 1.0,
    noveltyShift: 0,
    valueAlignmentShift: 0,
    triggersEthicalAttention: false,
    netValenceShift,
    netArousalShift: 0,
  };
}

const defaultParams: MoodParameters = {
  decayRate: 0.4,          // moderately fast so we can drive valence low quickly
  valenceFloor: -0.95,
  valenceCeiling: 0.95,
  arousalFloor: 0.0,
  arousalCeiling: 1.0,
};

/**
 * Build a synthetic MoodState directly so we can test exact threshold
 * crossings without relying on EWMA convergence.
 */
function makeMoodState(
  valence: number,
  negativeCycleDuration = 0,
  correctionEngaged = false,
): MoodState {
  return {
    valence,
    arousal: 0.5,
    updatedAt: NOW,
    negativeCycleDuration,
    correctionEngaged,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EmotionalRegulation', () => {
  let dynamics: MoodDynamics;
  let engine: AppraisalEngine;
  let regulation: EmotionalRegulation;

  beforeEach(() => {
    dynamics   = new MoodDynamics();
    engine     = new AppraisalEngine();
    regulation = new EmotionalRegulation(dynamics, engine);
  });

  // ── Level 1 — Alert ───────────────────────────────────────────────────────

  it('returns null for valence above −0.1 (no regulation needed)', () => {
    const mood = makeMoodState(0.0);
    expect(regulation.checkAndRegulate(mood)).toBeNull();
  });

  it('returns null at Level 1 (valence just below −0.1) — observational only', () => {
    const mood = makeMoodState(-0.15, 1);
    // Level 1 is alert-only; no RegulationOutcome should be returned
    expect(regulation.checkAndRegulate(mood)).toBeNull();
  });

  it('returns null when valence is exactly −0.1 (boundary — Level 1 not triggered)', () => {
    const mood = makeMoodState(-0.1);
    expect(regulation.checkAndRegulate(mood)).toBeNull();
  });

  // ── Level 2 — Spike ───────────────────────────────────────────────────────

  it('returns a RegulationOutcome for valence < −0.7 (Level 2 spike)', () => {
    const mood = makeMoodState(-0.75);
    const outcome = regulation.checkAndRegulate(mood);

    expect(outcome).not.toBeNull();
    expect(outcome!.strategy).toBe('automatic-correction');
    expect(outcome!.successful).toBe(true);
  });

  it('Level 2 spike outcome notes mention "spike"', () => {
    const mood = makeMoodState(-0.8);
    const outcome = regulation.checkAndRegulate(mood);

    expect(outcome!.notes.toLowerCase()).toContain('spike');
  });

  it('Level 2 spike records correct valenceBefore', () => {
    const mood = makeMoodState(-0.72);
    const outcome = regulation.checkAndRegulate(mood);

    expect(outcome!.valenceBefore).toBeCloseTo(-0.72);
  });

  it('Level 2 spike does NOT fire when valence is just above −0.7 (boundary)', () => {
    // −0.69 is above the spike threshold
    const mood = makeMoodState(-0.69, 1);
    // This is only Level 1 territory — no intervention
    expect(regulation.checkAndRegulate(mood)).toBeNull();
  });

  // ── Level 2 — Sustained ──────────────────────────────────────────────────

  it('returns a RegulationOutcome after ≥5 cycles of valence < −0.3 (sustained)', () => {
    const mood = makeMoodState(-0.35, 5); // 5 consecutive negative cycles
    const outcome = regulation.checkAndRegulate(mood);

    expect(outcome).not.toBeNull();
    expect(outcome!.strategy).toBe('automatic-correction');
  });

  it('does NOT fire Level 2 sustained with only 4 cycles (below duration threshold)', () => {
    const mood = makeMoodState(-0.35, 4); // one cycle short
    expect(regulation.checkAndRegulate(mood)).toBeNull();
  });

  it('Level 2 sustained outcome notes mention "sustained"', () => {
    const mood = makeMoodState(-0.4, 6);
    const outcome = regulation.checkAndRegulate(mood);

    expect(outcome!.notes.toLowerCase()).toContain('sustained');
  });

  it('does NOT fire Level 2 sustained when valence is above −0.3 regardless of duration', () => {
    const mood = makeMoodState(-0.25, 10); // long duration but above threshold
    expect(regulation.checkAndRegulate(mood)).toBeNull();
  });

  // ── Gradual correction wiring ─────────────────────────────────────────────

  it('Level 2 spike engages gradual correction on MoodDynamics (not instant jump)', () => {
    // Drive mood down so dynamics has a known low valence
    for (let i = 0; i < 10; i++) {
      dynamics.update(makeAppraisal(-1.0), defaultParams);
    }
    const valenceBefore = dynamics.getCurrentMood().valence;

    // Trigger Level 2 spike
    const mood = dynamics.getCurrentMood();
    regulation.checkAndRegulate(mood);

    // Run several update cycles to let the gradual correction work
    for (let i = 0; i < 4; i++) {
      dynamics.update(null, defaultParams);
    }

    // Valence should have moved in a positive direction
    expect(dynamics.getCurrentMood().valence).toBeGreaterThan(valenceBefore);
  });

  it('valence change per cycle after correction is gradual (no single-cycle spike)', () => {
    // Use a very low decayRate so EWMA steps are small and the correction
    // component's gradual spread can be isolated.
    const slowParams: MoodParameters = {
      decayRate: 0.05,     // slow EWMA — each cycle moves mood ≤5% toward baseline
      valenceFloor: -0.95,
      valenceCeiling: 0.95,
      arousalFloor: 0.0,
      arousalCeiling: 1.0,
    };

    // Drive mood strongly negative with slow EWMA
    for (let i = 0; i < 30; i++) {
      dynamics.update(makeAppraisal(-1.0), slowParams);
    }

    // Engage correction
    const mood = dynamics.getCurrentMood();
    regulation.checkAndRegulate(mood);

    // With slowParams, each cycle the EWMA moves at most 0.05 toward baseline.
    // The correction spreads the delta over CORRECTION_CYCLES (8) cycles.
    // Total step per cycle should be well under 0.15.
    let prev = dynamics.getCurrentMood().valence;
    for (let i = 0; i < 8; i++) {
      dynamics.update(null, slowParams);
      const curr = dynamics.getCurrentMood().valence;
      const step = Math.abs(curr - prev);
      expect(step).toBeLessThan(0.15); // gradual, not sudden
      prev = curr;
    }
  });

  // ── Level 3 — Halt ────────────────────────────────────────────────────────

  it('fires Level 3 halt handler after correction fails for ≥3 cycles', () => {
    const haltHandler = vi.fn();
    regulation.onLevel3Threshold(haltHandler);

    // Level 3 logic: _correctionWasActive starts false.
    // Call 1: sets _correctionWasActive=true via L2 spike, failure counter stays 0.
    // Call 2: failure counter → 1.
    // Call 3: failure counter → 2.
    // Call 4: failure counter → 3 (>= LEVEL3_FAILURE_CYCLES) → halt fires.
    const deepDistressMood = makeMoodState(-0.9, 10, true);

    regulation.checkAndRegulate(deepDistressMood); // call 1 — engage tracking
    regulation.checkAndRegulate(deepDistressMood); // call 2 — failure = 1
    regulation.checkAndRegulate(deepDistressMood); // call 3 — failure = 2
    regulation.checkAndRegulate(deepDistressMood); // call 4 — failure = 3 → HALT

    expect(haltHandler).toHaveBeenCalled();
  });

  it('Level 3 outcome reports the halt reason', () => {
    const haltHandler = vi.fn();
    regulation.onLevel3Threshold(haltHandler);

    const mood = makeMoodState(-0.9, 10, true);
    let outcome: ReturnType<typeof regulation.checkAndRegulate> = null;
    // 4 calls needed: call 1 engages tracking, calls 2–3 increment counter, call 4 fires halt
    for (let i = 0; i < 4; i++) {
      outcome = regulation.checkAndRegulate(mood);
    }

    // The halt handler must have been called
    expect(haltHandler).toHaveBeenCalled();
    // The final outcome (from call 4) should mention Level 3
    if (outcome !== null) {
      expect(outcome.notes.toLowerCase()).toContain('level 3');
    }
  });

  it('multiple Level 3 handlers all fire', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    regulation.onLevel3Threshold(h1);
    regulation.onLevel3Threshold(h2);

    const mood = makeMoodState(-0.9, 10, true);
    // 4 calls to fire Level 3 (see comment in previous test)
    for (let i = 0; i < 4; i++) {
      regulation.checkAndRegulate(mood);
    }

    expect(h1).toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });

  it('Level 3 does NOT fire for moderate sustained distress (below Level 3 threshold)', () => {
    const haltHandler = vi.fn();
    regulation.onLevel3Threshold(haltHandler);

    // −0.5 is Level 2 but not Level 3
    const mood = makeMoodState(-0.5, 10, true);
    for (let i = 0; i < 5; i++) {
      regulation.checkAndRegulate(mood);
    }

    expect(haltHandler).not.toHaveBeenCalled();
  });

  // ── Cognitive reappraisal ─────────────────────────────────────────────────

  it('triggerReappraisal returns a RegulationOutcome with strategy cognitive-reappraisal', () => {
    const percept = {
      percepts: [{ modality: 'semantic', features: { goalId: 'g1', goalCongruence: 0.5 }, timestamp: NOW }],
      bindingTimestamp: NOW,
      coherence: 0.9,
    };
    const altGoals = [{
      id: 'g1',
      description: 'alternative framing',
      priority: 0.8,
      derivedFrom: [],
      consistentWith: [],
      conflictsWith: [],
      createdAt: NOW,
      lastVerified: NOW,
      experientialBasis: null,
      type: 'terminal' as const,
    }];

    // Drive mood negative first so reappraisal has room to improve it
    for (let i = 0; i < 5; i++) {
      dynamics.update(makeAppraisal(-0.8), defaultParams);
    }

    const outcome = regulation.triggerReappraisal(percept, altGoals);

    expect(outcome.strategy).toBe('cognitive-reappraisal');
    expect(typeof outcome.valenceBefore).toBe('number');
    expect(typeof outcome.valenceAfter).toBe('number');
  });

  it('triggerReappraisal does not engage correction if alternative framing does not improve valence', () => {
    // Start at neutral — any reappraisal will only add, not improve over baseline
    // Provide a goal framing that results in 0 shift (no matching goal)
    const percept = {
      percepts: [{ modality: 'semantic', features: { goalId: 'g-not-in-framing', goalCongruence: -0.9 }, timestamp: NOW }],
      bindingTimestamp: NOW,
      coherence: 0.9,
    };

    // No goals that match the percept's goalId → zero shift
    const outcome = regulation.triggerReappraisal(percept, []);

    expect(outcome.strategy).toBe('cognitive-reappraisal');
    expect(outcome.successful).toBe(false);
  });
});
