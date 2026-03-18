/**
 * Hardware Repair Executor (HRE) — Implementation
 *
 * Performs physical repair actions: component replacement, recalibration,
 * connection re-routing, and workarounds.
 *
 * Constraint: The HRE must check with the CSG before and during any repair
 * that physically affects systems within or adjacent to the Consciousness
 * Enclosure.
 *
 * Architecture reference: docs/autonomous-self-maintenance/ARCHITECTURE.md §3.1
 */

import type {
  Duration,
  RepairResult,
  RepairTask,
  RepairType,
  Timestamp,
} from "./types.js";

import type {
  AbortResult,
  ActiveRepairStatus,
  IHardwareRepairExecutor,
  RepairCapability,
  RepairPermit,
  ResourceRequirement,
} from "./interfaces.js";

// ── Repair Duration Estimates (ms) ──────────────────────────

const DURATION_ESTIMATES: Record<RepairType, Duration> = {
  COMPONENT_REPLACEMENT: 300_000 as Duration, // 5 min
  RECALIBRATION: 60_000 as Duration, // 1 min
  CONNECTION_REROUTE: 120_000 as Duration, // 2 min
  SOFTWARE_PATCH: 30_000 as Duration, // not a hardware repair but included for completeness
  FIRMWARE_UPDATE: 45_000 as Duration, // not a hardware repair but included for completeness
  CONFIGURATION_RESTORE: 15_000 as Duration, // not a hardware repair but included for completeness
  ROLLBACK: 30_000 as Duration, // not a hardware repair but included for completeness
};

// ── Supported Hardware Repair Capabilities ──────────────────

const HARDWARE_CAPABILITIES: readonly RepairCapability[] = [
  {
    repairType: "COMPONENT_REPLACEMENT",
    autonomyLevel: "FULLY_AUTONOMOUS",
    compatibleComponents: ["actuator", "sensor", "connector", "bearing", "motor"],
    description:
      "Swap a degraded modular component with a spare from inventory",
  },
  {
    repairType: "RECALIBRATION",
    autonomyLevel: "FULLY_AUTONOMOUS",
    compatibleComponents: ["sensor", "actuator", "control-loop", "encoder"],
    description:
      "Re-zero sensors, re-tune control loops, and restore nominal operating parameters",
  },
  {
    repairType: "CONNECTION_REROUTE",
    autonomyLevel: "FULLY_AUTONOMOUS",
    compatibleComponents: ["data-bus", "power-rail", "signal-path", "network-link"],
    description:
      "Bypass a failed connection by activating an alternate path",
  },
] as const;

// ── Active Repair Tracking ──────────────────────────────────

interface ActiveRepair {
  taskId: string;
  permitId: string;
  startedAt: Timestamp;
  estimatedCompletion: Timestamp;
}

// ── Implementation ──────────────────────────────────────────

export class HardwareRepairExecutor implements IHardwareRepairExecutor {
  private readonly activeRepairs = new Map<string, ActiveRepair>();

  getRepairCapabilities(): readonly RepairCapability[] {
    return HARDWARE_CAPABILITIES;
  }

  estimateRepairDuration(task: RepairTask): Duration {
    return DURATION_ESTIMATES[task.type] ?? (60_000 as Duration);
  }

  estimateRepairResources(task: RepairTask): readonly ResourceRequirement[] {
    switch (task.type) {
      case "COMPONENT_REPLACEMENT":
        return [
          {
            resourceId: `part-${task.targetComponentId}`,
            quantityNeeded: 1,
            unit: "unit",
            critical: true,
          },
          {
            resourceId: "lubricant-general",
            quantityNeeded: 5,
            unit: "ml",
            critical: false,
          },
        ];
      case "RECALIBRATION":
        return [
          {
            resourceId: "calibration-standard",
            quantityNeeded: 1,
            unit: "unit",
            critical: false,
          },
        ];
      case "CONNECTION_REROUTE":
        return [
          {
            resourceId: "connector-jumper",
            quantityNeeded: 2,
            unit: "unit",
            critical: true,
          },
        ];
      default:
        return [];
    }
  }

  async executeRepair(
    task: RepairTask,
    permit: RepairPermit,
  ): Promise<RepairResult> {
    const now = Date.now() as Timestamp;

    // Validate permit matches task
    if (permit.taskId !== task.id) {
      return {
        taskId: task.id,
        success: false,
        timestamp: now,
        durationActual: 0 as Duration,
        consciousnessIntegrityMaintained: true,
        error: `Permit/task mismatch: permit is for task '${permit.taskId}' but repair requested for '${task.id}'`,
      };
    }

    // Validate permit has not expired
    if (now > permit.expiresAt) {
      return {
        taskId: task.id,
        success: false,
        timestamp: now,
        durationActual: 0 as Duration,
        consciousnessIntegrityMaintained: true,
        error: `Permit '${permit.permitId}' has expired (expired at ${permit.expiresAt})`,
      };
    }

    // Track active repair
    const estimatedDuration = this.estimateRepairDuration(task);
    const activeRepair: ActiveRepair = {
      taskId: task.id,
      permitId: permit.permitId,
      startedAt: now,
      estimatedCompletion: (now + estimatedDuration) as Timestamp,
    };
    this.activeRepairs.set(task.id, activeRepair);

    try {
      // Simulate repair execution
      // In a real system, this would involve actuator commands, sensor reads, etc.
      const repairDuration = this.simulateRepair(task);

      const completedAt = Date.now() as Timestamp;

      return {
        taskId: task.id,
        success: true,
        timestamp: completedAt,
        durationActual: (completedAt - now) as Duration,
        consciousnessIntegrityMaintained: true,
      };
    } catch (err) {
      const completedAt = Date.now() as Timestamp;
      return {
        taskId: task.id,
        success: false,
        timestamp: completedAt,
        durationActual: (completedAt - now) as Duration,
        consciousnessIntegrityMaintained: true,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      this.activeRepairs.delete(task.id);
    }
  }

  async abortRepair(taskId: string): Promise<AbortResult> {
    const active = this.activeRepairs.get(taskId);
    if (!active) {
      return {
        taskId,
        aborted: false,
        rollbackPerformed: false,
        error: `No active repair found for task '${taskId}'`,
      };
    }

    // Remove from active repairs
    this.activeRepairs.delete(taskId);

    return {
      taskId,
      aborted: true,
      rollbackPerformed: true,
    };
  }

  getActiveRepairs(): readonly ActiveRepairStatus[] {
    const now = Date.now() as Timestamp;
    return Array.from(this.activeRepairs.values()).map((active) => {
      const totalDuration = active.estimatedCompletion - active.startedAt;
      const elapsed = now - active.startedAt;
      const progressPercent = Math.min(
        100,
        Math.max(0, (elapsed / totalDuration) * 100),
      );

      return {
        taskId: active.taskId,
        permitId: active.permitId,
        startedAt: active.startedAt,
        estimatedCompletion: active.estimatedCompletion,
        progressPercent,
        consciousnessMetricsStable: true,
      };
    });
  }

  // ── Private helpers ─────────────────────────────────────────

  /**
   * Simulate a repair operation. In a real system this would execute
   * physical actuator commands, sensor reads, and verification loops.
   * Here we just model it as a synchronous operation for testing.
   */
  private simulateRepair(task: RepairTask): void {
    // Simulation placeholder — real implementation would perform
    // the actual repair steps for each repair type
    switch (task.type) {
      case "COMPONENT_REPLACEMENT":
        // 1. Disengage old component
        // 2. Remove old component
        // 3. Insert new component from inventory
        // 4. Engage and verify
        break;
      case "RECALIBRATION":
        // 1. Enter calibration mode
        // 2. Apply calibration standard
        // 3. Adjust parameters
        // 4. Verify within tolerance
        break;
      case "CONNECTION_REROUTE":
        // 1. Identify alternate path
        // 2. Activate alternate path
        // 3. Verify connectivity
        // 4. Decommission failed path
        break;
      default:
        // Other repair types are handled by software executor
        break;
    }
  }
}
