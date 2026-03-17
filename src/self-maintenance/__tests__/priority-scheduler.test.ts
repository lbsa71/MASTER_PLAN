/**
 * Tests for Repair Priority Scheduler (RPS)
 *
 * Acceptance criteria covered:
 *   - A repair priority scheduler ranks all pending maintenance tasks by
 *     threat-to-consciousness score, ensuring consciousness-critical repairs
 *     are always serviced first
 *   - A task with threatToConsciousness > 0.5 ALWAYS ranks CRITICAL
 */

import { describe, it, expect, vi } from "vitest";
import { RepairPriorityScheduler } from "../repair-priority-scheduler.js";
import type { RepairTask, PriorityWeights } from "../types.js";
import type { CriticalTaskHandler } from "../interfaces.js";

// ── Helpers ───────────────────────────────────────────────────

function makeTask(overrides: Partial<RepairTask> = {}): RepairTask {
  return {
    id: overrides.id ?? `task-${Math.random().toString(36).slice(2, 8)}`,
    type: overrides.type ?? "RECALIBRATION",
    targetComponentId: overrides.targetComponentId ?? "component-1",
    severity: overrides.severity ?? "WARNING",
    threatToConsciousness: overrides.threatToConsciousness ?? 0.1,
    consciousnessSafe: overrides.consciousnessSafe ?? true,
    estimatedDuration: overrides.estimatedDuration ?? 60_000,
    requiredResources: overrides.requiredResources ?? [],
    status: overrides.status ?? "PENDING",
    createdAt: overrides.createdAt ?? Date.now(),
    scheduledAt: overrides.scheduledAt ?? null,
    completedAt: overrides.completedAt ?? null,
  };
}

// ── Tests ─────────────────────────────────────────────────────

describe("RepairPriorityScheduler", () => {
  function createScheduler(weights?: PriorityWeights) {
    return new RepairPriorityScheduler(weights);
  }

  describe("submitTask and getQueue", () => {
    it("accepts a task and returns it in the queue", () => {
      const scheduler = createScheduler();
      const task = makeTask({ id: "t1" });

      const id = scheduler.submitTask(task);
      expect(id).toBe("t1");

      const queue = scheduler.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe("t1");
    });

    it("returns an empty queue when no tasks submitted", () => {
      const scheduler = createScheduler();
      expect(scheduler.getQueue()).toHaveLength(0);
    });
  });

  describe("priority scoring", () => {
    it("scores tasks based on weighted factors", () => {
      const scheduler = createScheduler();
      const task = makeTask({
        id: "t1",
        threatToConsciousness: 0.3,
        severity: "WARNING",
      });

      scheduler.submitTask(task);
      const priority = scheduler.getTaskPriority("t1");

      expect(priority).not.toBeNull();
      expect(priority!.taskId).toBe("t1");
      expect(priority!.compositeScore).toBeGreaterThan(0);
      expect(priority!.threatToConsciousness).toBe(0.3);
    });

    it("returns null for unknown task ID", () => {
      const scheduler = createScheduler();
      expect(scheduler.getTaskPriority("nonexistent")).toBeNull();
    });

    it("consciousness threat dominates the composite score", () => {
      const scheduler = createScheduler();

      const highThreat = makeTask({
        id: "high",
        threatToConsciousness: 0.9,
        severity: "WARNING",
      });
      const lowThreat = makeTask({
        id: "low",
        threatToConsciousness: 0.05,
        severity: "CRITICAL",
      });

      scheduler.submitTask(highThreat);
      scheduler.submitTask(lowThreat);

      const highScore = scheduler.getTaskPriority("high")!;
      const lowScore = scheduler.getTaskPriority("low")!;

      expect(highScore.compositeScore).toBeGreaterThan(lowScore.compositeScore);
    });
  });

  describe("consciousness-critical invariant", () => {
    it("tasks with threatToConsciousness > 0.5 always rank above others", () => {
      const scheduler = createScheduler();

      // A low-severity task but high consciousness threat
      const critical = makeTask({
        id: "critical",
        threatToConsciousness: 0.6,
        severity: "INFO",
      });
      // A high-severity task but no consciousness threat
      const severe = makeTask({
        id: "severe",
        threatToConsciousness: 0.0,
        severity: "EMERGENCY",
      });

      scheduler.submitTask(severe);
      scheduler.submitTask(critical);

      const next = scheduler.getNextTask();
      expect(next).not.toBeNull();
      expect(next!.id).toBe("critical");
    });
  });

  describe("getNextTask", () => {
    it("returns the highest-priority task", () => {
      const scheduler = createScheduler();

      scheduler.submitTask(makeTask({ id: "low", threatToConsciousness: 0.05, severity: "INFO" }));
      scheduler.submitTask(makeTask({ id: "high", threatToConsciousness: 0.4, severity: "CRITICAL" }));
      scheduler.submitTask(makeTask({ id: "mid", threatToConsciousness: 0.2, severity: "WARNING" }));

      const next = scheduler.getNextTask();
      expect(next).not.toBeNull();
      expect(next!.id).toBe("high");
    });

    it("returns null when queue is empty", () => {
      const scheduler = createScheduler();
      expect(scheduler.getNextTask()).toBeNull();
    });
  });

  describe("reprioritize", () => {
    it("changes the severity and re-sorts the queue", () => {
      const scheduler = createScheduler();

      scheduler.submitTask(makeTask({ id: "t1", severity: "INFO", threatToConsciousness: 0.1 }));
      scheduler.submitTask(makeTask({ id: "t2", severity: "CRITICAL", threatToConsciousness: 0.1 }));

      // t2 should be first initially
      expect(scheduler.getNextTask()!.id).toBe("t2");

      // Reprioritize t1 to EMERGENCY
      scheduler.reprioritize("t1", "EMERGENCY");

      // Now t1 should be first
      expect(scheduler.getNextTask()!.id).toBe("t1");
    });
  });

  describe("removeTask", () => {
    it("removes a task from the queue", () => {
      const scheduler = createScheduler();
      scheduler.submitTask(makeTask({ id: "t1" }));

      expect(scheduler.removeTask("t1")).toBe(true);
      expect(scheduler.getQueue()).toHaveLength(0);
    });

    it("returns false for unknown task", () => {
      const scheduler = createScheduler();
      expect(scheduler.removeTask("nonexistent")).toBe(false);
    });
  });

  describe("onCriticalTaskQueued", () => {
    it("fires handler when a consciousness-critical task is submitted", () => {
      const scheduler = createScheduler();
      const handler = vi.fn<CriticalTaskHandler>();

      scheduler.onCriticalTaskQueued(handler);

      const criticalTask = makeTask({
        id: "critical",
        threatToConsciousness: 0.8,
      });
      scheduler.submitTask(criticalTask);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ id: "critical" })
      );
    });

    it("does not fire for non-critical tasks", () => {
      const scheduler = createScheduler();
      const handler = vi.fn<CriticalTaskHandler>();

      scheduler.onCriticalTaskQueued(handler);
      scheduler.submitTask(makeTask({ threatToConsciousness: 0.1 }));

      expect(handler).not.toHaveBeenCalled();
    });

    it("unsubscribe stops notifications", () => {
      const scheduler = createScheduler();
      const handler = vi.fn<CriticalTaskHandler>();

      const unsub = scheduler.onCriticalTaskQueued(handler);
      unsub();

      scheduler.submitTask(makeTask({ threatToConsciousness: 0.9 }));

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("getWeights", () => {
    it("returns default weights when none specified", () => {
      const scheduler = createScheduler();
      const weights = scheduler.getWeights();

      expect(weights.consciousnessThreat).toBe(0.5);
      expect(weights.severity).toBe(0.25);
      expect(weights.cascadeRisk).toBe(0.15);
      expect(weights.resourceAvailability).toBe(0.1);
    });

    it("returns custom weights when provided", () => {
      const custom: PriorityWeights = {
        consciousnessThreat: 0.7,
        severity: 0.1,
        cascadeRisk: 0.1,
        resourceAvailability: 0.1,
      };
      const scheduler = createScheduler(custom);
      expect(scheduler.getWeights()).toEqual(custom);
    });
  });

  describe("queue ordering is stable", () => {
    it("maintains insertion order for equal-priority tasks", () => {
      const scheduler = createScheduler();

      const t1 = makeTask({ id: "first", threatToConsciousness: 0.2, severity: "WARNING" });
      const t2 = makeTask({ id: "second", threatToConsciousness: 0.2, severity: "WARNING" });

      scheduler.submitTask(t1);
      scheduler.submitTask(t2);

      const queue = scheduler.getQueue();
      expect(queue[0].id).toBe("first");
      expect(queue[1].id).toBe("second");
    });
  });
});
