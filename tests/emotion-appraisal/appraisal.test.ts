/**
 * Unit tests for IAppraisalEngine causality (0.3.1.5.4)
 *
 * Verifies that emotional responses are causally grounded in goal/value
 * evaluation — not random, not pattern-matched, but derived from the
 * agent's active goals and values.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AppraisalEngine } from '../../src/emotion-appraisal/appraisal-engine.js';
import type { BoundPercept, Percept } from '../../src/conscious-core/types.js';
import type { AgencyGoal, CoreValue } from '../../src/agency-stability/types.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOW = 1_000_000;

const makePercept = (features: Record<string, unknown>): Percept => ({
  modality: 'semantic',
  features,
  timestamp: NOW,
});

const bound = (...percepts: Percept[]): BoundPercept => ({
  percepts,
  bindingTimestamp: NOW,
  coherence: 0.9,
});

const goal = (id: string, priority: number): AgencyGoal => ({
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
});

const value = (id: string): CoreValue => ({
  id,
  statement: `Value ${id}`,
  derivation: 'Rare Consciousness Doctrine axiom 1',
  immutableSince: NOW,
  cryptoCommitment: 'hash-abc',
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AppraisalEngine', () => {
  let engine: AppraisalEngine;

  beforeEach(() => {
    engine = new AppraisalEngine();
  });

  // ── Goal congruence ───────────────────────────────────────────────────────

  it('produces negative goalCongruenceShift for a goal-threatening percept', () => {
    const percept = bound(makePercept({ goalId: 'g1', goalCongruence: -0.8 }));
    const goals = [goal('g1', 0.9)];

    const result = engine.appraise(percept, goals, []);

    expect(result.goalCongruenceShift).toBeLessThan(0);
    expect(result.netValenceShift).toBeLessThan(0);
  });

  it('produces positive goalCongruenceShift for a goal-congruent percept', () => {
    const percept = bound(makePercept({ goalId: 'g1', goalCongruence: 0.7 }));
    const goals = [goal('g1', 0.9)];

    const result = engine.appraise(percept, goals, []);

    expect(result.goalCongruenceShift).toBeGreaterThan(0);
    expect(result.netValenceShift).toBeGreaterThan(0);
  });

  it('scales goal congruence shift by the affected goal priority', () => {
    const percept = bound(makePercept({ goalId: 'g1', goalCongruence: -0.5 }));

    const highPriorityResult = engine.appraise(percept, [goal('g1', 1.0)], []);
    const lowPriorityResult  = engine.appraise(percept, [goal('g1', 0.1)], []);

    // Higher priority → larger magnitude negative shift
    expect(Math.abs(highPriorityResult.netValenceShift))
      .toBeGreaterThan(Math.abs(lowPriorityResult.netValenceShift));
  });

  it('records the affected goal priority in the result', () => {
    const percept = bound(makePercept({ goalId: 'g1', goalCongruence: -0.5 }));
    const result = engine.appraise(percept, [goal('g1', 0.75)], []);

    expect(result.affectedGoalPriority).toBe(0.75);
  });

  it('produces zero goalCongruenceShift when no goals are referenced', () => {
    const percept = bound(makePercept({ color: 'blue' })); // no goalId
    const result = engine.appraise(percept, [goal('g1', 0.9)], []);

    expect(result.goalCongruenceShift).toBe(0);
  });

  it('produces zero goalCongruenceShift when the referenced goal is not in the active list', () => {
    const percept = bound(makePercept({ goalId: 'unknown-goal', goalCongruence: -0.9 }));
    const result = engine.appraise(percept, [goal('g1', 0.9)], []);

    expect(result.goalCongruenceShift).toBe(0);
  });

  // ── Novelty / arousal ─────────────────────────────────────────────────────

  it('produces positive arousal shift for a novel percept', () => {
    const percept = bound(makePercept({ novelty: 1.0 }));
    const result = engine.appraise(percept, [], []);

    expect(result.noveltyShift).toBeGreaterThan(0);
    expect(result.netArousalShift).toBeGreaterThan(0);
  });

  it('produces negative arousal shift for a familiar percept', () => {
    const percept = bound(makePercept({ novelty: 0.0 }));
    const result = engine.appraise(percept, [], []);

    expect(result.noveltyShift).toBeLessThan(0);
    expect(result.netArousalShift).toBeLessThan(0);
  });

  it('produces near-zero arousal shift for a neutral-novelty percept', () => {
    const percept = bound(makePercept({ novelty: 0.5 }));
    const result = engine.appraise(percept, [], []);

    expect(Math.abs(result.noveltyShift)).toBeLessThan(0.05);
  });

  // ── Value alignment ───────────────────────────────────────────────────────

  it('produces negative valueAlignmentShift for a value-threatening percept', () => {
    const percept = bound(makePercept({ valueThreat: true, valueId: 'v1' }));
    const result = engine.appraise(percept, [], [value('v1')]);

    expect(result.valueAlignmentShift).toBeLessThan(0);
    expect(result.netValenceShift).toBeLessThan(0);
  });

  it('sets triggersEthicalAttention for a value-threatening percept', () => {
    const percept = bound(makePercept({ valueThreat: true }));
    const result = engine.appraise(percept, [], []);

    expect(result.triggersEthicalAttention).toBe(true);
  });

  it('does not trigger ethical attention for a non-threatening percept', () => {
    const percept = bound(makePercept({ goalId: 'g1', goalCongruence: -0.5 }));
    const result = engine.appraise(percept, [goal('g1', 0.9)], []);

    expect(result.triggersEthicalAttention).toBe(false);
  });

  // ── Output bounds ─────────────────────────────────────────────────────────

  it('clamps netValenceShift to [−1, 1]', () => {
    const percept = bound(
      makePercept({ goalId: 'g1', goalCongruence: -1.0 }),
      makePercept({ valueThreat: true }),
    );
    const result = engine.appraise(percept, [goal('g1', 1.0)], []);

    expect(result.netValenceShift).toBeGreaterThanOrEqual(-1);
    expect(result.netValenceShift).toBeLessThanOrEqual(1);
  });

  it('clamps netArousalShift to [−0.5, 0.5]', () => {
    const percept = bound(makePercept({ novelty: 1.0 }));
    const result = engine.appraise(percept, [], []);

    expect(result.netArousalShift).toBeLessThanOrEqual(0.5);
    expect(result.netArousalShift).toBeGreaterThanOrEqual(-0.5);
  });

  // ── Reappraisal ───────────────────────────────────────────────────────────

  it('reappraise with alternative framing produces a different result from the original', () => {
    const percept = bound(makePercept({ goalId: 'g1', goalCongruence: -0.8 }));
    const threatGoals   = [goal('g1', 0.9)]; // original: g1 is a high-priority active goal
    const neutralGoals  = [goal('g2', 0.9)]; // reframing: g1 is not in the active set

    const original   = engine.appraise(percept, threatGoals, []);
    const reappraised = engine.reappraise(percept, neutralGoals);

    // Reappraisal with a framing that excludes g1 should yield neutral/zero shift
    expect(reappraised.netValenceShift).toBeGreaterThan(original.netValenceShift);
  });
});
