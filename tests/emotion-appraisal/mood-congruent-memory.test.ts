/**
 * Mood-congruent memory retrieval tests (0.3.1.5.4)
 *
 * Verifies Acceptance Criterion #5:
 *   "Mood-congruent memory retrieval works: positive mood biases retrieval
 *    toward positive memories."
 *
 * The EmotionalInfluence subsystem exposes a `memoryValenceBias` coefficient
 * that the Memory subsystem (0.3.1.5.3) consumes when scoring candidate memories
 * for retrieval. This test file verifies that:
 *
 *   - Positive mood  → positive memoryValenceBias (retrieval biased toward happy memories)
 *   - Negative mood  → negative memoryValenceBias (retrieval biased toward unhappy memories)
 *   - Neutral mood   → near-zero memoryValenceBias (no systematic retrieval bias)
 *   - The magnitude of the bias scales with the strength of the mood valence
 *   - The same external stimulus produces different retrieval bias under
 *     different mood states (AC #4 demonstrability — different mood → different output)
 *
 * The test also verifies the full pipeline from AppraisalEngine → MoodDynamics →
 * EmotionalInfluence so the causal chain is end-to-end observable.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AppraisalEngine }    from '../../src/emotion-appraisal/appraisal-engine.js';
import { MoodDynamics }       from '../../src/emotion-appraisal/mood-dynamics.js';
import { EmotionalInfluence } from '../../src/emotion-appraisal/emotional-influence.js';
import type { AppraisalResult, MoodParameters } from '../../src/emotion-appraisal/types.js';
import type { BoundPercept, Percept } from '../../src/conscious-core/types.js';
import type { AgencyGoal }   from '../../src/agency-stability/types.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOW = 3_000_000;

function makePercept(features: Record<string, unknown>): Percept {
  return { modality: 'semantic', features, timestamp: NOW };
}

function bound(...percepts: Percept[]): BoundPercept {
  return { percepts, bindingTimestamp: NOW, coherence: 0.9 };
}

function makeGoal(id: string, priority: number): AgencyGoal {
  return {
    id,
    description: `Goal ${id}`,
    priority,
    derivedFrom: [],
    consistentWith: [],
    conflictsWith: [],
    createdAt: NOW,
    lastVerified: NOW,
    experientialBasis: null,
    type: 'terminal',
  };
}

/** Default mood parameters: moderate decay, wide bounds. */
const defaultParams: MoodParameters = {
  decayRate: 0.3,
  valenceFloor: -0.95,
  valenceCeiling: 0.95,
  arousalFloor: 0.0,
  arousalCeiling: 1.0,
};

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

/** Drive mood to a steady state in a given direction using repeated appraisals. */
function driveMood(dynamics: MoodDynamics, valenceTarget: number, cycles: number): void {
  for (let i = 0; i < cycles; i++) {
    dynamics.update(makeAppraisal(valenceTarget), defaultParams);
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EmotionalInfluence — mood-congruent memory bias', () => {
  let dynamics: MoodDynamics;
  let influence: EmotionalInfluence;

  beforeEach(() => {
    dynamics  = new MoodDynamics();
    influence = new EmotionalInfluence(dynamics);
  });

  // ── Direction of bias ──────────────────────────────────────────────────────

  it('positive mood produces positive memoryValenceBias', () => {
    driveMood(dynamics, 0.8, 10);
    expect(dynamics.getCurrentMood().valence).toBeGreaterThan(0);
    expect(influence.getInfluenceVector().memoryValenceBias).toBeGreaterThan(0);
  });

  it('negative mood produces negative memoryValenceBias', () => {
    driveMood(dynamics, -0.8, 10);
    expect(dynamics.getCurrentMood().valence).toBeLessThan(0);
    expect(influence.getInfluenceVector().memoryValenceBias).toBeLessThan(0);
  });

  it('neutral mood (valence=0) produces near-zero memoryValenceBias', () => {
    // Default constructor starts at valence=0
    const bias = influence.getInfluenceVector().memoryValenceBias;
    expect(Math.abs(bias)).toBeLessThan(0.05);
  });

  // ── Magnitude scales with mood valence ────────────────────────────────────

  it('stronger positive mood produces larger positive bias', () => {
    const mildDynamics   = new MoodDynamics();
    const strongDynamics = new MoodDynamics();

    driveMood(mildDynamics,   0.2, 10);
    driveMood(strongDynamics, 0.9, 10);

    const mildBias   = new EmotionalInfluence(mildDynamics).getInfluenceVector().memoryValenceBias;
    const strongBias = new EmotionalInfluence(strongDynamics).getInfluenceVector().memoryValenceBias;

    expect(strongBias).toBeGreaterThan(mildBias);
  });

  it('stronger negative mood produces larger negative bias', () => {
    const mildDynamics   = new MoodDynamics();
    const strongDynamics = new MoodDynamics();

    driveMood(mildDynamics,   -0.2, 10);
    driveMood(strongDynamics, -0.9, 10);

    const mildBias   = new EmotionalInfluence(mildDynamics).getInfluenceVector().memoryValenceBias;
    const strongBias = new EmotionalInfluence(strongDynamics).getInfluenceVector().memoryValenceBias;

    expect(strongBias).toBeLessThan(mildBias);
  });

  // ── Sign mirrors mood valence ─────────────────────────────────────────────

  it('memoryValenceBias sign always mirrors mood valence sign', () => {
    // Test with many different mood states
    const testCases = [0.9, 0.5, 0.1, 0, -0.1, -0.5, -0.9];
    for (const targetValence of testCases) {
      const d = new MoodDynamics(targetValence);
      const inf = new EmotionalInfluence(d);
      const bias = inf.getInfluenceVector().memoryValenceBias;

      if (targetValence > 0) expect(bias).toBeGreaterThan(0);
      else if (targetValence < 0) expect(bias).toBeLessThan(0);
      else expect(Math.abs(bias)).toBeLessThan(0.001);
    }
  });

  // ── End-to-end: same percept, different mood → different retrieval bias ────

  it('same percept produces different memory bias under positive vs negative mood (AC #4)', () => {
    const engine = new AppraisalEngine();
    const goals  = [makeGoal('g1', 0.9)];

    // Percept that slightly favors g1
    const percept = bound(makePercept({ goalId: 'g1', goalCongruence: 0.3 }));

    // Scenario A: agent is in a positive mood before the percept arrives
    const positiveDynamics = new MoodDynamics();
    driveMood(positiveDynamics, 0.7, 10);
    const positiveAppraisal = engine.appraise(percept, goals, []);
    positiveDynamics.update(positiveAppraisal, defaultParams);
    const positiveBias = new EmotionalInfluence(positiveDynamics).getInfluenceVector().memoryValenceBias;

    // Scenario B: agent is in a negative mood before the same percept arrives
    const negativeDynamics = new MoodDynamics();
    driveMood(negativeDynamics, -0.7, 10);
    const negativeAppraisal = engine.appraise(percept, goals, []);
    negativeDynamics.update(negativeAppraisal, defaultParams);
    const negativeBias = new EmotionalInfluence(negativeDynamics).getInfluenceVector().memoryValenceBias;

    // Different prior moods → different retrieval biases
    expect(positiveBias).toBeGreaterThan(negativeBias);
  });

  // ── memoryValenceBias range ────────────────────────────────────────────────

  it('memoryValenceBias is clamped to [−1, 1]', () => {
    // Extreme positive
    const posDynamics = new MoodDynamics(1.0);
    const posBias = new EmotionalInfluence(posDynamics).getInfluenceVector().memoryValenceBias;
    expect(posBias).toBeLessThanOrEqual(1);
    expect(posBias).toBeGreaterThanOrEqual(-1);

    // Extreme negative
    const negDynamics = new MoodDynamics(-1.0);
    const negBias = new EmotionalInfluence(negDynamics).getInfluenceVector().memoryValenceBias;
    expect(negBias).toBeLessThanOrEqual(1);
    expect(negBias).toBeGreaterThanOrEqual(-1);
  });

  // ── Full influence vector coherence ───────────────────────────────────────

  it('influence vector includes all required fields', () => {
    const vec = influence.getInfluenceVector();
    expect(vec).toHaveProperty('mood');
    expect(vec).toHaveProperty('timestamp');
    expect(vec).toHaveProperty('deliberationConfidenceBias');
    expect(vec).toHaveProperty('alternativesExpansionFactor');
    expect(vec).toHaveProperty('memoryValenceBias');
    expect(vec).toHaveProperty('riskConservatismFactor');
    expect(vec).toHaveProperty('communicationToneBias');
  });

  it('positive mood → positive deliberationConfidenceBias (related AC #4 coverage)', () => {
    driveMood(dynamics, 0.8, 10);
    expect(influence.getInfluenceVector().deliberationConfidenceBias).toBeGreaterThan(0);
  });

  it('negative mood → negative deliberationConfidenceBias (related AC #4 coverage)', () => {
    driveMood(dynamics, -0.8, 10);
    expect(influence.getInfluenceVector().deliberationConfidenceBias).toBeLessThan(0);
  });

  it('negative mood → higher alternativesExpansionFactor (considers more options)', () => {
    const neutralDynamics  = new MoodDynamics();
    const negativeDynamics = new MoodDynamics();
    driveMood(negativeDynamics, -0.8, 10);

    const neutralFactor  = new EmotionalInfluence(neutralDynamics).getInfluenceVector().alternativesExpansionFactor;
    const negativeFactor = new EmotionalInfluence(negativeDynamics).getInfluenceVector().alternativesExpansionFactor;

    expect(negativeFactor).toBeGreaterThan(neutralFactor);
  });
});
