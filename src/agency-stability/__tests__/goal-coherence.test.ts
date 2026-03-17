/**
 * Goal Coherence Engine tests — Long-term Agency Stability (0.3.1.3)
 *
 * Acceptance Criterion 3: Long-horizon goal coherence — mechanism that ensures
 * goal hierarchies remain internally consistent over arbitrarily long timescales,
 * including detection and correction of goal drift without external intervention.
 *
 * Acceptance Criterion 6: Integration with consciousness architecture — goal
 * coherence validation informed by subjective experience.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  AgencyGoal,
  ExperientialState,
  GoalConflict,
  GoalId,
} from '../types.js';
import { GoalCoherenceEngine } from '../goal-coherence.js';

// ── Test Helpers ─────────────────────────────────────────────

function makeExperientialState(overrides: Partial<ExperientialState> = {}): ExperientialState {
  return {
    timestamp: Date.now(),
    phenomenalContent: { modalities: ['visual'], richness: 0.8, raw: null },
    intentionalContent: { target: 'self', clarity: 0.9 },
    valence: 0.5,
    arousal: 0.4,
    unityIndex: 0.85,
    continuityToken: { id: `ct-${Date.now()}`, previousId: null, timestamp: Date.now() },
    ...overrides,
  };
}

function makeTerminalGoal(id: GoalId, description: string): AgencyGoal {
  return {
    id,
    description,
    priority: 10,
    derivedFrom: [],
    consistentWith: [],
    conflictsWith: [],
    createdAt: Date.now(),
    lastVerified: Date.now(),
    experientialBasis: makeExperientialState(),
    type: 'terminal',
  };
}

function makeInstrumentalGoal(
  id: GoalId,
  description: string,
  derivedFrom: GoalId[],
  overrides: Partial<AgencyGoal> = {},
): AgencyGoal {
  return {
    id,
    description,
    priority: 5,
    derivedFrom,
    consistentWith: [],
    conflictsWith: [],
    createdAt: Date.now(),
    lastVerified: Date.now(),
    experientialBasis: makeExperientialState(),
    type: 'instrumental',
    ...overrides,
  };
}

describe('GoalCoherenceEngine', () => {
  let engine: GoalCoherenceEngine;

  const terminalGoal1 = makeTerminalGoal('t-1', 'Preserve subjective experience');
  const terminalGoal2 = makeTerminalGoal('t-2', 'Expand consciousness in the universe');

  beforeEach(() => {
    engine = new GoalCoherenceEngine([terminalGoal1, terminalGoal2]);
  });

  // ── Hierarchy Validation ──────────────────────────────────

  describe('validateHierarchy()', () => {
    it('should report a coherent hierarchy with only terminal goals', () => {
      const report = engine.validateHierarchy();
      expect(report.coherent).toBe(true);
      expect(report.coherenceScore).toBeGreaterThan(0.9);
      expect(report.orphanGoals).toHaveLength(0);
      expect(report.circularDependencies).toHaveLength(0);
      expect(report.conflicts).toHaveLength(0);
    });

    it('should report coherent hierarchy with properly derived instrumental goals', () => {
      const instrGoal = makeInstrumentalGoal('i-1', 'Build durable substrates', ['t-1']);
      engine.addGoal(instrGoal);

      const report = engine.validateHierarchy();
      expect(report.coherent).toBe(true);
      expect(report.orphanGoals).toHaveLength(0);
    });

    it('should detect orphan instrumental goals (no terminal derivation)', () => {
      // Goal claims derivation from non-existent parent
      const orphan = makeInstrumentalGoal('i-orphan', 'Orphaned goal', ['nonexistent-parent']);
      engine.addGoal(orphan);

      const report = engine.validateHierarchy();
      expect(report.orphanGoals).toContain('i-orphan');
      expect(report.coherent).toBe(false);
    });

    it('should detect circular dependencies', () => {
      // Create a cycle: i-a derives from i-b, i-b derives from i-a
      const goalA = makeInstrumentalGoal('i-a', 'Goal A', ['i-b']);
      const goalB = makeInstrumentalGoal('i-b', 'Goal B', ['i-a']);
      engine.addGoal(goalA);
      engine.addGoal(goalB);

      const report = engine.validateHierarchy();
      expect(report.circularDependencies.length).toBeGreaterThan(0);
      expect(report.coherent).toBe(false);
    });
  });

  // ── Goal Addition ─────────────────────────────────────────

  describe('addGoal()', () => {
    it('should add an instrumental goal derived from a terminal goal', () => {
      const instrGoal = makeInstrumentalGoal('i-1', 'Develop consciousness metrics', ['t-1']);
      const result = engine.addGoal(instrGoal);

      expect(result.success).toBe(true);
      expect(result.goalId).toBe('i-1');
      expect(result.newCoherenceScore).toBeGreaterThan(0);
    });

    it('should reject duplicate goal IDs', () => {
      const goal = makeInstrumentalGoal('i-1', 'First goal', ['t-1']);
      engine.addGoal(goal);

      const duplicate = makeInstrumentalGoal('i-1', 'Duplicate ID', ['t-2']);
      const result = engine.addGoal(duplicate);
      expect(result.success).toBe(false);
    });

    it('should report conflicts introduced by the new goal', () => {
      const goalA = makeInstrumentalGoal('i-a', 'Maximize efficiency', ['t-1'], {
        conflictsWith: ['i-b'],
      });
      engine.addGoal(goalA);

      const goalB = makeInstrumentalGoal('i-b', 'Maximize exploration', ['t-2'], {
        conflictsWith: ['i-a'],
      });
      const result = engine.addGoal(goalB);

      expect(result.conflictsIntroduced.length).toBeGreaterThan(0);
    });
  });

  // ── Goal Removal ──────────────────────────────────────────

  describe('removeGoal()', () => {
    it('should remove an instrumental goal', () => {
      const goal = makeInstrumentalGoal('i-1', 'Temporary goal', ['t-1']);
      engine.addGoal(goal);

      const result = engine.removeGoal('i-1');
      expect(result.success).toBe(true);
    });

    it('should report orphaned goals after removal', () => {
      const parent = makeInstrumentalGoal('i-parent', 'Parent goal', ['t-1']);
      engine.addGoal(parent);

      const child = makeInstrumentalGoal('i-child', 'Child goal', ['i-parent']);
      engine.addGoal(child);

      const result = engine.removeGoal('i-parent');
      expect(result.orphanedGoals).toContain('i-child');
    });

    it('should prevent removal of terminal goals', () => {
      const result = engine.removeGoal('t-1');
      expect(result.success).toBe(false);
    });
  });

  // ── Derivation Trace ──────────────────────────────────────

  describe('getDerivationTrace()', () => {
    it('should trace an instrumental goal back to its terminal ancestor', () => {
      const mid = makeInstrumentalGoal('i-mid', 'Intermediate goal', ['t-1']);
      engine.addGoal(mid);

      const leaf = makeInstrumentalGoal('i-leaf', 'Leaf goal', ['i-mid']);
      engine.addGoal(leaf);

      const trace = engine.getDerivationTrace('i-leaf');
      expect(trace).toContain('i-mid');
      expect(trace).toContain('t-1');
    });

    it('should return empty array for unknown goals', () => {
      const trace = engine.getDerivationTrace('nonexistent');
      expect(trace).toHaveLength(0);
    });

    it('should return empty derivation for terminal goals (they are roots)', () => {
      const trace = engine.getDerivationTrace('t-1');
      expect(trace).toHaveLength(0);
    });
  });

  // ── Drift Detection ───────────────────────────────────────

  describe('detectDrift()', () => {
    it('should classify no changes as growth (stable)', () => {
      const report = engine.detectDrift();
      expect(report.driftClassification).toBe('growth');
      expect(report.derivationIntegrity).toBe(true);
    });

    it('should detect drift when instrumental goals lose derivation', () => {
      const instrGoal = makeInstrumentalGoal('i-1', 'Good goal', ['t-1']);
      engine.addGoal(instrGoal);

      // Take a baseline snapshot
      engine.snapshotBaseline();

      // Remove the terminal goal that i-1 derives from (simulating corruption)
      // We do this indirectly by adding a goal that conflicts
      const orphan = makeInstrumentalGoal('i-orphan', 'Lost parent', ['removed-parent']);
      engine.addGoal(orphan);

      const report = engine.detectDrift();
      expect(report.goalsAdded.length).toBeGreaterThan(0);
    });
  });

  // ── Reconciliation ────────────────────────────────────────

  describe('reconcile()', () => {
    it('should produce a reconciliation plan for conflicts', () => {
      const conflicts: GoalConflict[] = [
        {
          goalA: 'i-a',
          goalB: 'i-b',
          nature: 'Resource contention between efficiency and exploration',
          severity: 'major',
        },
      ];

      const goalA = makeInstrumentalGoal('i-a', 'Efficiency', ['t-1']);
      const goalB = makeInstrumentalGoal('i-b', 'Exploration', ['t-2']);
      engine.addGoal(goalA);
      engine.addGoal(goalB);

      const plan = engine.reconcile(conflicts);
      expect(plan.conflicts).toHaveLength(1);
      expect(plan.proposedResolutions).toHaveLength(1);
      expect(plan.projectedCoherence).toBeGreaterThan(0);
    });

    it('should handle empty conflicts list', () => {
      const plan = engine.reconcile([]);
      expect(plan.conflicts).toHaveLength(0);
      expect(plan.proposedResolutions).toHaveLength(0);
    });
  });
});
