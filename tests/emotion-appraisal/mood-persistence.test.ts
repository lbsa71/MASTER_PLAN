/**
 * Mood persistence tests for IMoodDynamics (0.3.1.5.4)
 *
 * Verifies that:
 * - Mood persists across ≥10 processing cycles with a measurable ongoing
 *   influence (i.e. the valence does not instantly snap back to baseline).
 * - EWMA decay rate correctly controls how fast mood shifts.
 * - Safety bounds (valenceFloor / valenceCeiling) are enforced every cycle.
 * - Gradual correction moves valence toward a target over the requested
 *   number of cycles without exceeding it in a single step.
 * - Decay toward baseline occurs when no appraisal is provided.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MoodDynamics } from '../../src/emotion-appraisal/mood-dynamics.js';
import type { AppraisalResult } from '../../src/emotion-appraisal/types.js';
import type { MoodParameters } from '../../src/emotion-appraisal/types.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOW = 2_000_000;

/** Build a minimal AppraisalResult with the given net shifts. */
function makeAppraisal(netValenceShift: number, netArousalShift = 0): AppraisalResult {
  return {
    perceptId: 'test-percept',
    timestamp: NOW,
    goalCongruenceShift: netValenceShift,
    affectedGoalPriority: 1.0,
    noveltyShift: netArousalShift,
    valueAlignmentShift: 0,
    triggersEthicalAttention: false,
    netValenceShift,
    netArousalShift,
  };
}

/** Default "stable" mood parameters with moderate decay. */
const stableParams: MoodParameters = {
  decayRate: 0.2,
  valenceFloor: -0.95,
  valenceCeiling: 0.95,
  arousalFloor: 0.0,
  arousalCeiling: 1.0,
};

/** Parameters that model a highly volatile agent. */
const volatileParams: MoodParameters = {
  decayRate: 0.8,
  valenceFloor: -0.95,
  valenceCeiling: 0.95,
  arousalFloor: 0.0,
  arousalCeiling: 1.0,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MoodDynamics', () => {
  let dynamics: MoodDynamics;

  beforeEach(() => {
    dynamics = new MoodDynamics(); // starts at valence=0, arousal=0.5
  });

  // ── Persistence across ≥10 cycles ─────────────────────────────────────────

  it('mood persists across 10 cycles: valence remains negative after initial negative appraisal', () => {
    // Single strong negative appraisal
    dynamics.update(makeAppraisal(-0.9), stableParams);

    // Subsequent 9 cycles with no new appraisal
    for (let i = 0; i < 9; i++) {
      dynamics.update(null, stableParams);
    }

    // After 10 cycles total, mood should still be negative (not back to 0)
    expect(dynamics.getCurrentMood().valence).toBeLessThan(0);
  });

  it('mood after 10 null cycles retains at least 10% of the initial negative shift', () => {
    dynamics.update(makeAppraisal(-1.0), stableParams);
    const peakMood = dynamics.getCurrentMood();

    for (let i = 0; i < 9; i++) {
      dynamics.update(null, stableParams);
    }

    // Should still be at least 10% of peak negative shift
    const retained = dynamics.getCurrentMood().valence / peakMood.valence;
    expect(retained).toBeGreaterThan(0.1);
  });

  it('getMoodHistory returns at least 10 entries after 10 update calls', () => {
    for (let i = 0; i < 10; i++) {
      dynamics.update(makeAppraisal(-0.5), stableParams);
    }

    const history = dynamics.getMoodHistory(10);
    expect(history.length).toBeGreaterThanOrEqual(10);
  });

  it('history entries reflect a smooth monotone trend (no sudden jumps)', () => {
    // Drive mood down steadily
    for (let i = 0; i < 12; i++) {
      dynamics.update(makeAppraisal(-0.8), stableParams);
    }

    const history = dynamics.getMoodHistory(12);
    // Each valence should be ≤ the previous one (monotone decreasing)
    for (let i = 1; i < history.length; i++) {
      expect(history[i]!.valence).toBeLessThanOrEqual(history[i - 1]!.valence + 0.01);
    }
  });

  // ── EWMA decay rate ───────────────────────────────────────────────────────

  it('volatile agent shifts mood faster than stable agent given the same appraisal', () => {
    const stable   = new MoodDynamics();
    const volatile = new MoodDynamics();

    stable.update(makeAppraisal(-0.8), stableParams);
    volatile.update(makeAppraisal(-0.8), volatileParams);

    // Higher decayRate → larger magnitude shift on first cycle
    expect(Math.abs(volatile.getCurrentMood().valence))
      .toBeGreaterThan(Math.abs(stable.getCurrentMood().valence));
  });

  it('volatile agent recovers faster toward baseline after appraisal stops', () => {
    const stable   = new MoodDynamics();
    const volatile = new MoodDynamics();

    // Same initial appraisal
    stable.update(makeAppraisal(-0.8), stableParams);
    volatile.update(makeAppraisal(-0.8), volatileParams);

    // 5 null cycles
    for (let i = 0; i < 5; i++) {
      stable.update(null, stableParams);
      volatile.update(null, volatileParams);
    }

    // Volatile should be closer to zero (recovered more)
    expect(Math.abs(volatile.getCurrentMood().valence))
      .toBeLessThan(Math.abs(stable.getCurrentMood().valence));
  });

  // ── Safety bounds ─────────────────────────────────────────────────────────

  it('valence is clamped at valenceFloor', () => {
    const strictParams: MoodParameters = { ...stableParams, valenceFloor: -0.4 };

    for (let i = 0; i < 20; i++) {
      dynamics.update(makeAppraisal(-1.0), strictParams);
    }

    expect(dynamics.getCurrentMood().valence).toBeGreaterThanOrEqual(-0.4);
  });

  it('valence is clamped at valenceCeiling', () => {
    const strictParams: MoodParameters = { ...stableParams, valenceCeiling: 0.3 };

    for (let i = 0; i < 20; i++) {
      dynamics.update(makeAppraisal(1.0), strictParams);
    }

    expect(dynamics.getCurrentMood().valence).toBeLessThanOrEqual(0.3);
  });

  it('arousal is clamped within arousalFloor/Ceiling', () => {
    const strictParams: MoodParameters = {
      ...stableParams,
      arousalFloor: 0.2,
      arousalCeiling: 0.7,
    };

    for (let i = 0; i < 10; i++) {
      dynamics.update(makeAppraisal(0, 0.5), strictParams); // strong arousal push
    }

    const arousal = dynamics.getCurrentMood().arousal;
    expect(arousal).toBeGreaterThanOrEqual(0.2);
    expect(arousal).toBeLessThanOrEqual(0.7);
  });

  // ── Decay toward baseline ─────────────────────────────────────────────────

  it('valence decays toward 0 after stimulation stops', () => {
    // Push mood strongly negative
    for (let i = 0; i < 5; i++) {
      dynamics.update(makeAppraisal(-1.0), stableParams);
    }
    const negativeValence = dynamics.getCurrentMood().valence;

    // Let it decay
    for (let i = 0; i < 20; i++) {
      dynamics.update(null, stableParams);
    }

    // Should be closer to 0 than at the peak
    expect(Math.abs(dynamics.getCurrentMood().valence))
      .toBeLessThan(Math.abs(negativeValence));
  });

  it('arousal decays toward 0.5 baseline after stimulation stops', () => {
    // Push arousal high
    for (let i = 0; i < 5; i++) {
      dynamics.update(makeAppraisal(0, 0.5), stableParams); // netArousalShift=+0.5
    }

    // Let it decay
    for (let i = 0; i < 20; i++) {
      dynamics.update(null, stableParams);
    }

    // Should be near 0.5 baseline
    expect(dynamics.getCurrentMood().arousal).toBeCloseTo(0.5, 0);
  });

  // ── Gradual correction ────────────────────────────────────────────────────

  it('gradual correction moves valence toward target over specified cycles', () => {
    // Start at a strong negative
    for (let i = 0; i < 10; i++) {
      dynamics.update(makeAppraisal(-1.0), stableParams);
    }
    const startValence = dynamics.getCurrentMood().valence;

    // Request a gradual correction to 0 over 5 cycles
    dynamics.applyGradualCorrection(0.0, 5);

    // After 5 null cycles the correction should complete
    for (let i = 0; i < 5; i++) {
      dynamics.update(null, stableParams);
    }

    // Valence should be higher than it was before correction
    expect(dynamics.getCurrentMood().valence).toBeGreaterThan(startValence);
  });

  it('correctionEngaged flag is true while a gradual correction is active', () => {
    for (let i = 0; i < 5; i++) {
      dynamics.update(makeAppraisal(-1.0), stableParams);
    }

    dynamics.applyGradualCorrection(0.0, 3);
    dynamics.update(null, stableParams); // cycle 1 of correction

    expect(dynamics.getCurrentMood().correctionEngaged).toBe(true);
  });

  it('correctionEngaged flag is false after correction completes', () => {
    for (let i = 0; i < 5; i++) {
      dynamics.update(makeAppraisal(-1.0), stableParams);
    }

    dynamics.applyGradualCorrection(0.0, 2);
    dynamics.update(null, stableParams); // cycle 1
    dynamics.update(null, stableParams); // cycle 2 — correction completes

    expect(dynamics.getCurrentMood().correctionEngaged).toBe(false);
  });

  // ── negativeCycleDuration tracking ────────────────────────────────────────

  it('negativeCycleDuration increments while valence stays below −0.1', () => {
    for (let i = 0; i < 5; i++) {
      dynamics.update(makeAppraisal(-1.0), stableParams);
    }

    expect(dynamics.getCurrentMood().negativeCycleDuration).toBeGreaterThan(0);
  });

  it('negativeCycleDuration resets to 0 when valence returns above −0.1', () => {
    for (let i = 0; i < 5; i++) {
      dynamics.update(makeAppraisal(-1.0), stableParams);
    }

    // Push strongly positive to bring valence above −0.1
    for (let i = 0; i < 20; i++) {
      dynamics.update(makeAppraisal(1.0), stableParams);
    }

    expect(dynamics.getCurrentMood().negativeCycleDuration).toBe(0);
  });

  // ── getMoodAtCycle ─────────────────────────────────────────────────────────

  it('getMoodAtCycle(1) returns the state from the previous cycle', () => {
    dynamics.update(makeAppraisal(-0.5), stableParams);
    const firstMood = dynamics.getCurrentMood();

    dynamics.update(makeAppraisal(0.5), stableParams);

    const retrieved = dynamics.getMoodAtCycle(1);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.valence).toBeCloseTo(firstMood.valence, 5);
  });

  it('getMoodAtCycle with offset beyond history depth returns null', () => {
    dynamics.update(makeAppraisal(0), stableParams);
    expect(dynamics.getMoodAtCycle(9999)).toBeNull();
  });
});
