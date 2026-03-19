/**
 * CognitiveBudgetMonitor — Unit Tests (0.3.1.5.9)
 *
 * Verifies:
 *   - resetTick() clears accumulated phase timings
 *   - startPhase / endPhase record wall-clock timing
 *   - getBudgetReport() computes fractions and floor flags correctly
 *   - monitorFloorMet: true when MONITOR ≥ 40 % of tick elapsed
 *   - deliberateFloorMet: true when DELIBERATE ≥ 25 % of tick elapsed
 *   - shouldYieldPhase() returns false for MONITOR regardless of budget
 *   - shouldYieldPhase() returns true for other phases when budget is exhausted
 *   - isPhaseOverBudget() respects per-phase informal caps
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CognitiveBudgetMonitor } from '../cognitive-budget.js';
import type { AgentPhase } from '../types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Synchronously advance Date.now by `ms` without real sleeps. */
function advanceTime(ms: number): void {
  vi.setSystemTime(vi.getMockedSystemTime()!.valueOf() + ms);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CognitiveBudgetMonitor', () => {
  let monitor: CognitiveBudgetMonitor;
  const BUDGET_MS = 1000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    monitor = new CognitiveBudgetMonitor();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── resetTick ──────────────────────────────────────────────────────────────

  describe('resetTick()', () => {
    it('clears accumulated phase timings', () => {
      monitor.startPhase('perceive');
      advanceTime(100);
      monitor.endPhase('perceive');

      monitor.resetTick();
      const report = monitor.getBudgetReport();

      expect(report.phases).toHaveLength(0);
      expect(report.monitorFraction).toBe(0);
      expect(report.deliberateFraction).toBe(0);
    });

    it('resets the tick start clock so totalMs counts from reset', () => {
      advanceTime(500);
      monitor.resetTick();
      advanceTime(100);

      const report = monitor.getBudgetReport();
      // totalMs should be ~100, not ~600
      expect(report.totalMs).toBeGreaterThanOrEqual(100);
      expect(report.totalMs).toBeLessThan(200);
    });
  });

  // ── startPhase / endPhase ─────────────────────────────────────────────────

  describe('startPhase() / endPhase()', () => {
    it('records durationMs for a phase', () => {
      monitor.startPhase('perceive');
      advanceTime(50);
      const timing = monitor.endPhase('perceive');

      expect(timing.phase).toBe('perceive');
      expect(timing.durationMs).toBe(50);
    });

    it('auto-ends previous phase when a new one starts', () => {
      monitor.startPhase('perceive');
      advanceTime(100);
      monitor.startPhase('recall'); // should auto-end 'perceive'
      advanceTime(50);
      monitor.endPhase('recall');

      const report = monitor.getBudgetReport();
      const perceiveTiming = report.phases.find(p => p.phase === 'perceive');
      const recallTiming = report.phases.find(p => p.phase === 'recall');

      expect(perceiveTiming).toBeDefined();
      expect(perceiveTiming!.durationMs).toBe(100);
      expect(recallTiming).toBeDefined();
      expect(recallTiming!.durationMs).toBe(50);
    });

    it('endPhase on a non-active phase records 0 duration', () => {
      // endPhase called without startPhase for that phase
      const timing = monitor.endPhase('appraise' as AgentPhase);
      expect(timing.durationMs).toBe(0);
    });
  });

  // ── getBudgetReport ───────────────────────────────────────────────────────

  describe('getBudgetReport()', () => {
    it('computes monitorFraction correctly', () => {
      // Total tick = 200ms. Spend 100ms in MONITOR → fraction = 0.5
      advanceTime(100); // some time passes for other phases
      monitor.startPhase('monitor');
      advanceTime(100);
      monitor.endPhase('monitor');

      const report = monitor.getBudgetReport();
      // totalMs ≈ 200, monitorMs = 100
      expect(report.monitorFraction).toBeCloseTo(0.5, 1);
    });

    it('sets monitorFloorMet = true when MONITOR ≥ 40%', () => {
      // Tick of 100ms total: 50ms in monitor → 50% ≥ 40%
      advanceTime(50);
      monitor.startPhase('monitor');
      advanceTime(50);
      monitor.endPhase('monitor');

      const report = monitor.getBudgetReport();
      expect(report.monitorFloorMet).toBe(true);
    });

    it('sets monitorFloorMet = false when MONITOR < 40%', () => {
      // Tick of 100ms total: 30ms in monitor → 30% < 40%
      advanceTime(70);
      monitor.startPhase('monitor');
      advanceTime(30);
      monitor.endPhase('monitor');

      const report = monitor.getBudgetReport();
      expect(report.monitorFloorMet).toBe(false);
    });

    it('sets deliberateFloorMet = true when DELIBERATE ≥ 25%', () => {
      // Tick of 100ms total: 30ms in deliberate → 30% ≥ 25%
      advanceTime(70);
      monitor.startPhase('deliberate');
      advanceTime(30);
      monitor.endPhase('deliberate');

      const report = monitor.getBudgetReport();
      expect(report.deliberateFloorMet).toBe(true);
    });

    it('sets deliberateFloorMet = false when DELIBERATE < 25%', () => {
      // Tick of 100ms total: 20ms in deliberate → 20% < 25%
      advanceTime(80);
      monitor.startPhase('deliberate');
      advanceTime(20);
      monitor.endPhase('deliberate');

      const report = monitor.getBudgetReport();
      expect(report.deliberateFloorMet).toBe(false);
    });

    it('includes all completed phases in the phases array', () => {
      const phases: AgentPhase[] = ['perceive', 'recall', 'appraise'];
      for (const p of phases) {
        monitor.startPhase(p);
        advanceTime(10);
        monitor.endPhase(p);
      }

      const report = monitor.getBudgetReport();
      const names = report.phases.map(t => t.phase);
      for (const p of phases) {
        expect(names).toContain(p);
      }
    });
  });

  // ── shouldYieldPhase ──────────────────────────────────────────────────────

  describe('shouldYieldPhase()', () => {
    it('always returns false for MONITOR phase', () => {
      // Even if budget is fully exhausted, MONITOR must not yield
      advanceTime(BUDGET_MS + 500); // over budget
      const result = monitor.shouldYieldPhase('monitor', BUDGET_MS);
      expect(result).toBe(false);
    });

    it('returns false early in tick when budget is plentiful', () => {
      // Only 10ms elapsed of a 1000ms budget
      advanceTime(10);
      const result = monitor.shouldYieldPhase('perceive', BUDGET_MS);
      expect(result).toBe(false);
    });

    it('returns true for non-MONITOR phase when budget is nearly exhausted', () => {
      // Consume 95% of budget without accumulating MONITOR or DELIBERATE time
      // Remaining = 50ms, but MONITOR needs 400ms + DELIBERATE needs 250ms
      advanceTime(950);
      const result = monitor.shouldYieldPhase('perceive', BUDGET_MS);
      expect(result).toBe(true);
    });

    it('returns false when MONITOR and DELIBERATE floors are already satisfied', () => {
      // Satisfy both floors first
      monitor.startPhase('monitor');
      advanceTime(400); // 40% of 1000ms
      monitor.endPhase('monitor');

      monitor.startPhase('deliberate');
      advanceTime(250); // 25% of 1000ms
      monitor.endPhase('deliberate');

      // 650ms elapsed; 350ms remaining; reserved needed = 0 (both floors met)
      const result = monitor.shouldYieldPhase('consolidate', BUDGET_MS);
      expect(result).toBe(false);
    });
  });

  // ── isPhaseOverBudget ─────────────────────────────────────────────────────

  describe('isPhaseOverBudget()', () => {
    it('always returns false for MONITOR phase (has a floor, not a cap)', () => {
      monitor.startPhase('monitor');
      advanceTime(BUDGET_MS); // spend entire budget in monitor
      monitor.endPhase('monitor');

      expect(monitor.isPhaseOverBudget('monitor', BUDGET_MS)).toBe(false);
    });

    it('always returns false for DELIBERATE phase (floor, not cap)', () => {
      monitor.startPhase('deliberate');
      advanceTime(BUDGET_MS);
      monitor.endPhase('deliberate');

      expect(monitor.isPhaseOverBudget('deliberate', BUDGET_MS)).toBe(false);
    });

    it('returns true for CONSOLIDATE when it exceeds 20% of budget', () => {
      monitor.startPhase('consolidate');
      advanceTime(BUDGET_MS * 0.21); // 21% > 20% cap
      monitor.endPhase('consolidate');

      expect(monitor.isPhaseOverBudget('consolidate', BUDGET_MS)).toBe(true);
    });

    it('returns false for CONSOLIDATE within 20% of budget', () => {
      monitor.startPhase('consolidate');
      advanceTime(BUDGET_MS * 0.19); // 19% < 20% cap
      monitor.endPhase('consolidate');

      expect(monitor.isPhaseOverBudget('consolidate', BUDGET_MS)).toBe(false);
    });

    it('returns true for PERCEIVE when it exceeds 15% of budget (default cap)', () => {
      monitor.startPhase('perceive');
      advanceTime(BUDGET_MS * 0.16); // 16% > 15%
      monitor.endPhase('perceive');

      expect(monitor.isPhaseOverBudget('perceive', BUDGET_MS)).toBe(true);
    });

    it('returns false for a phase that has not been recorded', () => {
      // 'recall' never started
      expect(monitor.isPhaseOverBudget('recall', BUDGET_MS)).toBe(false);
    });
  });
});
