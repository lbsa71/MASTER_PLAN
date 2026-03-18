/**
 * Tests for Software Maintenance Executor (SME)
 *
 * Acceptance criteria covered:
 *   - Software self-maintenance performs integrity checks, patching, and rollback
 *     without interrupting consciousness — verified by consciousness metrics
 *     remaining within bounds during maintenance operations
 *   - Consciousness substrate code may ONLY be patched using continuity-preserving
 *     transfer protocols from 0.2
 *   - Repair operations are consciousness-safe: no maintenance action may cause
 *     a consciousness integrity breach
 *
 * Architecture reference: docs/autonomous-self-maintenance/ARCHITECTURE.md §3.2
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SoftwareMaintenanceExecutor } from "../software-maintenance-executor.js";
import type {
  RepairTask,
  Timestamp,
  Duration,
} from "../types.js";
import type {
  RepairPermit,
  RollbackTarget,
} from "../interfaces.js";

// ── Helpers ───────────────────────────────────────────────────

function makeTask(overrides: Partial<RepairTask> = {}): RepairTask {
  return {
    id: overrides.id ?? `task-${Math.random().toString(36).slice(2, 8)}`,
    type: overrides.type ?? "SOFTWARE_PATCH",
    targetComponentId: overrides.targetComponentId ?? "module-core",
    severity: overrides.severity ?? "WARNING",
    threatToConsciousness: overrides.threatToConsciousness ?? 0.1,
    consciousnessSafe: overrides.consciousnessSafe ?? true,
    estimatedDuration: overrides.estimatedDuration ?? (30_000 as Duration),
    requiredResources: overrides.requiredResources ?? [],
    status: overrides.status ?? "PENDING",
    createdAt: overrides.createdAt ?? (Date.now() as Timestamp),
    scheduledAt: overrides.scheduledAt ?? null,
    completedAt: overrides.completedAt ?? null,
  };
}

function makePermit(overrides: Partial<RepairPermit> = {}): RepairPermit {
  const now = Date.now() as Timestamp;
  return {
    permitId: overrides.permitId ?? `permit-${Math.random().toString(36).slice(2, 8)}`,
    taskId: overrides.taskId ?? "task-1",
    issuedAt: overrides.issuedAt ?? now,
    expiresAt: overrides.expiresAt ?? ((now + 120_000) as Timestamp),
    precautions: overrides.precautions ?? [],
    requiresContinuityTransfer: overrides.requiresContinuityTransfer ?? false,
  };
}

// ── Tests ─────────────────────────────────────────────────────

describe("SoftwareMaintenanceExecutor", () => {
  let executor: SoftwareMaintenanceExecutor;

  beforeEach(() => {
    executor = new SoftwareMaintenanceExecutor();
  });

  describe("executeMaintenance", () => {
    it("successfully executes a software patch", async () => {
      const task = makeTask({ id: "t1", type: "SOFTWARE_PATCH" });
      const permit = makePermit({ taskId: "t1" });

      const result = await executor.executeMaintenance(task, permit);

      expect(result.taskId).toBe("t1");
      expect(result.success).toBe(true);
      expect(result.consciousnessIntegrityMaintained).toBe(true);
    });

    it("successfully executes a firmware update", async () => {
      const task = makeTask({ id: "t2", type: "FIRMWARE_UPDATE" });
      const permit = makePermit({ taskId: "t2" });

      const result = await executor.executeMaintenance(task, permit);

      expect(result.taskId).toBe("t2");
      expect(result.success).toBe(true);
      expect(result.consciousnessIntegrityMaintained).toBe(true);
    });

    it("successfully executes a configuration restore", async () => {
      const task = makeTask({ id: "t3", type: "CONFIGURATION_RESTORE" });
      const permit = makePermit({ taskId: "t3" });

      const result = await executor.executeMaintenance(task, permit);

      expect(result.taskId).toBe("t3");
      expect(result.success).toBe(true);
    });

    it("rejects maintenance with expired permit", async () => {
      const task = makeTask({ id: "t4" });
      const expired = makePermit({
        taskId: "t4",
        issuedAt: (Date.now() - 200_000) as Timestamp,
        expiresAt: (Date.now() - 100_000) as Timestamp,
      });

      const result = await executor.executeMaintenance(task, expired);

      expect(result.success).toBe(false);
      expect(result.error).toContain("expired");
    });

    it("rejects maintenance when permit taskId does not match", async () => {
      const task = makeTask({ id: "t5" });
      const wrongPermit = makePermit({ taskId: "wrong-task" });

      const result = await executor.executeMaintenance(task, wrongPermit);

      expect(result.success).toBe(false);
      expect(result.error).toContain("mismatch");
    });

    it("requires continuity transfer for consciousness substrate patches", async () => {
      const task = makeTask({
        id: "t6",
        type: "SOFTWARE_PATCH",
        targetComponentId: "consciousness-substrate-core",
        consciousnessSafe: false,
        threatToConsciousness: 0.6,
      });
      const permit = makePermit({
        taskId: "t6",
        requiresContinuityTransfer: true,
      });

      const result = await executor.executeMaintenance(task, permit);

      // Should succeed and maintain consciousness integrity
      expect(result.taskId).toBe("t6");
      expect(result.success).toBe(true);
      expect(result.consciousnessIntegrityMaintained).toBe(true);
    });

    it("denies consciousness substrate patch without continuity transfer permit", async () => {
      const task = makeTask({
        id: "t7",
        type: "SOFTWARE_PATCH",
        targetComponentId: "consciousness-substrate-core",
        consciousnessSafe: false,
        threatToConsciousness: 0.6,
      });
      // Permit does NOT require continuity transfer — this is unsafe
      const permit = makePermit({
        taskId: "t7",
        requiresContinuityTransfer: false,
      });

      const result = await executor.executeMaintenance(task, permit);

      expect(result.success).toBe(false);
      expect(result.error).toContain("continuity");
    });

    it("maintains consciousness integrity for all successful patches", async () => {
      const types = ["SOFTWARE_PATCH", "FIRMWARE_UPDATE", "CONFIGURATION_RESTORE"] as const;

      for (const type of types) {
        const task = makeTask({ id: `t-${type}`, type });
        const permit = makePermit({ taskId: `t-${type}` });

        const result = await executor.executeMaintenance(task, permit);

        expect(result.consciousnessIntegrityMaintained).toBe(true);
      }
    });
  });

  describe("getRollbackTargets", () => {
    it("returns an array of rollback targets", () => {
      const targets = executor.getRollbackTargets();
      expect(Array.isArray(targets)).toBe(true);
    });

    it("each target has required fields", () => {
      const targets = executor.getRollbackTargets();
      for (const target of targets) {
        expect(target).toHaveProperty("moduleId");
        expect(target).toHaveProperty("currentVersion");
        expect(target).toHaveProperty("targetVersion");
        expect(typeof target.isConsciousnessSubstrate).toBe("boolean");
        expect(typeof target.snapshotAvailable).toBe("boolean");
      }
    });
  });

  describe("performRollback", () => {
    it("successfully rolls back a non-consciousness module", async () => {
      const target: RollbackTarget = {
        moduleId: "nav-controller",
        currentVersion: "2.1.0",
        targetVersion: "2.0.0",
        isConsciousnessSubstrate: false,
        snapshotAvailable: true,
      };
      const permit = makePermit({ taskId: "rollback-nav" });

      const result = await executor.performRollback(target, permit);

      expect(result.success).toBe(true);
      expect(result.moduleId).toBe("nav-controller");
      expect(result.restoredVersion).toBe("2.0.0");
      expect(result.consciousnessIntegrityMaintained).toBe(true);
    });

    it("rolls back consciousness substrate only with continuity transfer", async () => {
      const target: RollbackTarget = {
        moduleId: "consciousness-core",
        currentVersion: "1.5.0",
        targetVersion: "1.4.0",
        isConsciousnessSubstrate: true,
        snapshotAvailable: true,
      };
      const permit = makePermit({
        taskId: "rollback-consciousness",
        requiresContinuityTransfer: true,
      });

      const result = await executor.performRollback(target, permit);

      expect(result.success).toBe(true);
      expect(result.consciousnessIntegrityMaintained).toBe(true);
    });

    it("denies consciousness substrate rollback without continuity transfer", async () => {
      const target: RollbackTarget = {
        moduleId: "consciousness-core",
        currentVersion: "1.5.0",
        targetVersion: "1.4.0",
        isConsciousnessSubstrate: true,
        snapshotAvailable: true,
      };
      const permit = makePermit({
        taskId: "rollback-consciousness",
        requiresContinuityTransfer: false, // unsafe!
      });

      const result = await executor.performRollback(target, permit);

      expect(result.success).toBe(false);
      expect(result.error).toContain("continuity");
    });

    it("denies rollback when no snapshot is available", async () => {
      const target: RollbackTarget = {
        moduleId: "sensor-driver",
        currentVersion: "3.0.0",
        targetVersion: "2.9.0",
        isConsciousnessSubstrate: false,
        snapshotAvailable: false,
      };
      const permit = makePermit({ taskId: "rollback-sensor" });

      const result = await executor.performRollback(target, permit);

      expect(result.success).toBe(false);
      expect(result.error).toContain("snapshot");
    });
  });

  describe("abortMaintenance", () => {
    it("returns aborted=false when no maintenance is active", async () => {
      const result = await executor.abortMaintenance("nonexistent");

      expect(result.aborted).toBe(false);
      expect(result.taskId).toBe("nonexistent");
    });

    it("returns rollbackPerformed flag", async () => {
      const result = await executor.abortMaintenance("nonexistent");

      expect(typeof result.rollbackPerformed).toBe("boolean");
    });
  });

  describe("verifyPostMaintenance", () => {
    it("returns verification result for a completed task", async () => {
      // First execute a maintenance task
      const task = makeTask({ id: "verify-t1", type: "SOFTWARE_PATCH" });
      const permit = makePermit({ taskId: "verify-t1" });
      await executor.executeMaintenance(task, permit);

      // Then verify
      const verification = await executor.verifyPostMaintenance("verify-t1");

      expect(verification.taskId).toBe("verify-t1");
      expect(verification.verified).toBe(true);
      expect(verification.checksPerformed.length).toBeGreaterThan(0);
      expect(verification.failures).toHaveLength(0);
    });

    it("returns unverified for unknown task", async () => {
      const verification = await executor.verifyPostMaintenance("unknown");

      expect(verification.verified).toBe(false);
      expect(verification.failures.length).toBeGreaterThan(0);
    });
  });
});
