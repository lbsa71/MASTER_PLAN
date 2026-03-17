/**
 * Repair Priority Scheduler (RPS)
 *
 * Implements IRepairPriorityScheduler — ranks all pending maintenance tasks
 * by their threat to consciousness continuity, ensuring consciousness-critical
 * repairs are always serviced first.
 *
 * Priority scoring formula (from ARCHITECTURE.md §2.1):
 *   compositeScore = consciousnessThreat * w_ct
 *                  + severityScore     * w_sev
 *                  + cascadeRisk       * w_cr
 *                  + resourceAvail     * w_ra
 *
 * Invariant: A task with threatToConsciousness > 0.5 ALWAYS ranks CRITICAL
 * regardless of other factors.
 *
 * Architecture reference: docs/autonomous-self-maintenance/ARCHITECTURE.md §2.1
 */

import type {
  FaultSeverity,
  PriorityScore,
  PriorityWeights,
  RepairTask,
  DEFAULT_PRIORITY_WEIGHTS,
} from "./types.js";
import {
  DEFAULT_PRIORITY_WEIGHTS as DEFAULT_WEIGHTS,
} from "./types.js";
import type {
  IRepairPriorityScheduler,
  CriticalTaskHandler,
  Unsubscribe,
} from "./interfaces.js";

// ── Helpers ───────────────────────────────────────────────────

/** Consciousness-critical threshold: tasks above this are always CRITICAL */
const CONSCIOUSNESS_CRITICAL_THRESHOLD = 0.5;

/** Map fault severity to a numeric score (0..1) */
function severityToScore(severity: FaultSeverity): number {
  switch (severity) {
    case "INFO":
      return 0.1;
    case "WARNING":
      return 0.4;
    case "CRITICAL":
      return 0.7;
    case "EMERGENCY":
      return 1.0;
  }
}

/**
 * Compute cascade risk from task properties.
 * Tasks that are not consciousness-safe have inherent cascade risk.
 * Connection reroutes and component replacements have moderate cascade risk.
 */
function estimateCascadeRisk(task: RepairTask): number {
  let risk = 0;
  if (!task.consciousnessSafe) risk += 0.4;
  if (task.type === "CONNECTION_REROUTE" || task.type === "COMPONENT_REPLACEMENT") {
    risk += 0.2;
  }
  if (task.severity === "EMERGENCY" || task.severity === "CRITICAL") {
    risk += 0.2;
  }
  return Math.min(1, risk);
}

/**
 * Resource availability score.
 * 1.0 = all resources available (no required resources, or all present).
 * For now, we assume resources are available; the inventory manager
 * will filter at execution time.
 */
function estimateResourceAvailability(task: RepairTask): number {
  return task.requiredResources.length === 0 ? 1.0 : 0.8;
}

// ── Internal state ────────────────────────────────────────────

interface ScoredTask {
  task: RepairTask;
  score: PriorityScore;
  insertionOrder: number;
}

// ── Implementation ────────────────────────────────────────────

export class RepairPriorityScheduler implements IRepairPriorityScheduler {
  private readonly weights: PriorityWeights;
  private readonly tasks = new Map<string, ScoredTask>();
  private readonly handlers = new Set<CriticalTaskHandler>();
  private insertionCounter = 0;

  constructor(weights?: PriorityWeights) {
    this.weights = weights ?? DEFAULT_WEIGHTS;
  }

  // ── IRepairPriorityScheduler ────────────────────────────────

  submitTask(task: RepairTask): string {
    const score = this.computeScore(task);
    this.tasks.set(task.id, {
      task,
      score,
      insertionOrder: this.insertionCounter++,
    });

    // Fire critical task handler if consciousness-critical
    if (task.threatToConsciousness > CONSCIOUSNESS_CRITICAL_THRESHOLD) {
      for (const handler of this.handlers) {
        handler(task);
      }
    }

    return task.id;
  }

  getQueue(): readonly RepairTask[] {
    return this.getSortedEntries().map((e) => e.task);
  }

  getTaskPriority(taskId: string): PriorityScore | null {
    const entry = this.tasks.get(taskId);
    return entry?.score ?? null;
  }

  getNextTask(): RepairTask | null {
    const sorted = this.getSortedEntries();
    return sorted.length > 0 ? sorted[0].task : null;
  }

  reprioritize(taskId: string, newSeverity: FaultSeverity): void {
    const entry = this.tasks.get(taskId);
    if (!entry) return;

    // Create updated task with new severity
    const updatedTask: RepairTask = {
      ...entry.task,
      severity: newSeverity,
    };
    const newScore = this.computeScore(updatedTask);
    this.tasks.set(taskId, {
      task: updatedTask,
      score: newScore,
      insertionOrder: entry.insertionOrder,
    });
  }

  onCriticalTaskQueued(handler: CriticalTaskHandler): Unsubscribe {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  removeTask(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  getWeights(): PriorityWeights {
    return this.weights;
  }

  // ── Private helpers ─────────────────────────────────────────

  private computeScore(task: RepairTask): PriorityScore {
    const threatToConsciousness = task.threatToConsciousness;
    const faultSeverity = severityToScore(task.severity);
    const cascadeRisk = estimateCascadeRisk(task);
    const resourceAvailability = estimateResourceAvailability(task);

    const compositeScore =
      threatToConsciousness * this.weights.consciousnessThreat +
      faultSeverity * this.weights.severity +
      cascadeRisk * this.weights.cascadeRisk +
      resourceAvailability * this.weights.resourceAvailability;

    return {
      taskId: task.id,
      threatToConsciousness,
      faultSeverity,
      cascadeRisk,
      resourceAvailability,
      compositeScore,
    };
  }

  /**
   * Sort entries by:
   * 1. Consciousness-critical tasks first (threatToConsciousness > 0.5)
   * 2. Composite score descending
   * 3. Insertion order (FIFO for ties)
   */
  private getSortedEntries(): ScoredTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => {
      const aCritical = a.task.threatToConsciousness > CONSCIOUSNESS_CRITICAL_THRESHOLD;
      const bCritical = b.task.threatToConsciousness > CONSCIOUSNESS_CRITICAL_THRESHOLD;

      // Consciousness-critical tasks always come first
      if (aCritical && !bCritical) return -1;
      if (!aCritical && bCritical) return 1;

      // Within same criticality tier, sort by composite score descending
      const scoreDiff = b.score.compositeScore - a.score.compositeScore;
      if (Math.abs(scoreDiff) > 1e-10) return scoreDiff;

      // Stable sort by insertion order
      return a.insertionOrder - b.insertionOrder;
    });
  }
}
