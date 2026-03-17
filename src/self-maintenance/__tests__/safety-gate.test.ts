/**
 * Tests for Consciousness Safety Gate (CSG)
 *
 * Acceptance criteria covered:
 *   - Repair operations themselves are consciousness-safe: no maintenance
 *     action may cause a consciousness integrity breach
 *   - The CSG can revoke a permit mid-repair if consciousness metrics
 *     deteriorate. Executors MUST honor revocation within 100ms.
 *
 * Architecture reference: docs/autonomous-self-maintenance/ARCHITECTURE.md §2.2
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConsciousnessSafetyGate } from "../consciousness-safety-gate.js";
import type { RepairTask, ConsciousnessMetrics, ConsciousnessMaintenanceBounds } from "../types.js";
import type { RepairPermit, RepairDenial, PermitRevocationHandler } from "../interfaces.js";

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

function makeMetrics(overrides: Partial<ConsciousnessMetrics> = {}): ConsciousnessMetrics {
  return {
    phi: overrides.phi ?? 3.5,
    experienceContinuity: overrides.experienceContinuity ?? 0.95,
    selfModelCoherence: overrides.selfModelCoherence ?? 0.92,
    agentTimestamp: overrides.agentTimestamp ?? Date.now(),
  };
}

const DEFAULT_BOUNDS: ConsciousnessMaintenanceBounds = {
  minIntegrity: 0.7,
  maxDisruptionMs: 100,
  requiredRedundancy: 2,
};

function isPermit(result: RepairPermit | RepairDenial): result is RepairPermit {
  return !("denied" in result);
}

function isDenial(result: RepairPermit | RepairDenial): result is RepairDenial {
  return "denied" in result && result.denied === true;
}

// ── Tests ─────────────────────────────────────────────────────

describe("ConsciousnessSafetyGate", () => {
  let gate: ConsciousnessSafetyGate;

  beforeEach(() => {
    gate = new ConsciousnessSafetyGate(DEFAULT_BOUNDS, () => makeMetrics());
  });

  describe("requestRepairPermit", () => {
    it("grants a permit for a consciousness-safe repair when metrics are healthy", async () => {
      const task = makeTask({ consciousnessSafe: true, threatToConsciousness: 0.1 });
      const result = await gate.requestRepairPermit(task);

      expect(isPermit(result)).toBe(true);
      if (isPermit(result)) {
        expect(result.taskId).toBe(task.id);
        expect(result.permitId).toBeTruthy();
        expect(result.issuedAt).toBeGreaterThan(0);
        expect(result.expiresAt).toBeGreaterThan(result.issuedAt);
        expect(result.requiresContinuityTransfer).toBe(false);
      }
    });

    it("denies a permit when consciousness integrity is below minimum", async () => {
      const lowMetrics = makeMetrics({
        experienceContinuity: 0.5, // below minIntegrity of 0.7
        selfModelCoherence: 0.5,
      });
      gate = new ConsciousnessSafetyGate(DEFAULT_BOUNDS, () => lowMetrics);

      const task = makeTask({ consciousnessSafe: true });
      const result = await gate.requestRepairPermit(task);

      expect(isDenial(result)).toBe(true);
      if (isDenial(result)) {
        expect(result.reason).toContain("integrity");
        expect(result.taskId).toBe(task.id);
      }
    });

    it("denies a permit for high-threat repairs when safety margin is insufficient", async () => {
      // Metrics just above minimum — not enough margin for a risky repair
      const tightMetrics = makeMetrics({
        experienceContinuity: 0.75,
        selfModelCoherence: 0.75,
      });
      gate = new ConsciousnessSafetyGate(DEFAULT_BOUNDS, () => tightMetrics);

      const task = makeTask({
        threatToConsciousness: 0.8, // high threat
        consciousnessSafe: false,
      });
      const result = await gate.requestRepairPermit(task);

      expect(isDenial(result)).toBe(true);
    });

    it("requires continuity-preserving transfer for consciousness substrate repairs", async () => {
      const task = makeTask({
        type: "SOFTWARE_PATCH",
        targetComponentId: "consciousness-substrate",
        consciousnessSafe: false,
        threatToConsciousness: 0.3,
      });

      // Mark the task as targeting consciousness substrate
      const result = await gate.requestRepairPermit(task);

      // Even if granted, it should require continuity transfer
      if (isPermit(result)) {
        // For non-consciousness-safe repairs, continuity transfer is required
        expect(result.requiresContinuityTransfer).toBe(true);
      }
    });

    it("issues time-boxed permits that expire", async () => {
      const task = makeTask({ estimatedDuration: 30_000 }); // 30s repair
      const result = await gate.requestRepairPermit(task);

      expect(isPermit(result)).toBe(true);
      if (isPermit(result)) {
        const duration = result.expiresAt - result.issuedAt;
        // Permit duration should cover the estimated repair duration with margin
        expect(duration).toBeGreaterThanOrEqual(30_000);
      }
    });

    it("includes precautions in the permit", async () => {
      const task = makeTask({
        threatToConsciousness: 0.3,
        consciousnessSafe: true,
      });
      const result = await gate.requestRepairPermit(task);

      expect(isPermit(result)).toBe(true);
      if (isPermit(result)) {
        expect(Array.isArray(result.precautions)).toBe(true);
      }
    });
  });

  describe("getActivePermits", () => {
    it("returns empty array when no permits issued", () => {
      expect(gate.getActivePermits()).toHaveLength(0);
    });

    it("tracks issued permits", async () => {
      const task = makeTask({ id: "t1" });
      const result = await gate.requestRepairPermit(task);

      expect(isPermit(result)).toBe(true);
      const permits = gate.getActivePermits();
      expect(permits).toHaveLength(1);
      expect(permits[0].taskId).toBe("t1");
    });

    it("does not track denied permits", async () => {
      const lowMetrics = makeMetrics({ experienceContinuity: 0.3 });
      gate = new ConsciousnessSafetyGate(DEFAULT_BOUNDS, () => lowMetrics);

      const task = makeTask();
      await gate.requestRepairPermit(task);

      expect(gate.getActivePermits()).toHaveLength(0);
    });
  });

  describe("revokePermit", () => {
    it("revokes an active permit", async () => {
      const task = makeTask({ id: "t1" });
      const permit = await gate.requestRepairPermit(task);
      expect(isPermit(permit)).toBe(true);

      if (isPermit(permit)) {
        const result = gate.revokePermit(permit.permitId, "consciousness metrics degrading");
        expect(result.revoked).toBe(true);
        expect(result.permitId).toBe(permit.permitId);

        // Permit should no longer be active
        expect(gate.getActivePermits()).toHaveLength(0);
      }
    });

    it("returns revoked=false for unknown permit", () => {
      const result = gate.revokePermit("nonexistent", "test");
      expect(result.revoked).toBe(false);
    });

    it("fires permit revocation handlers", async () => {
      const handler = vi.fn<PermitRevocationHandler>();
      gate.onPermitRevoked(handler);

      const task = makeTask({ id: "t1" });
      const permit = await gate.requestRepairPermit(task);

      if (isPermit(permit)) {
        gate.revokePermit(permit.permitId, "metrics dropped");

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(permit.permitId, "metrics dropped");
      }
    });

    it("unsubscribe stops revocation notifications", async () => {
      const handler = vi.fn<PermitRevocationHandler>();
      const unsub = gate.onPermitRevoked(handler);

      const task = makeTask({ id: "t1" });
      const permit = await gate.requestRepairPermit(task);

      unsub();

      if (isPermit(permit)) {
        gate.revokePermit(permit.permitId, "test");
        expect(handler).not.toHaveBeenCalled();
      }
    });
  });

  describe("getCurrentSafetyMargin", () => {
    it("returns current safety margin based on consciousness metrics", () => {
      const margin = gate.getCurrentSafetyMargin();

      expect(margin.currentIntegrity).toBeGreaterThan(0);
      expect(margin.minimumRequired).toBe(DEFAULT_BOUNDS.minIntegrity);
      expect(margin.availableMargin).toBe(margin.currentIntegrity - margin.minimumRequired);
      expect(margin.bounds).toEqual(DEFAULT_BOUNDS);
      expect(margin.timestamp).toBeGreaterThan(0);
    });

    it("reports negative margin when integrity is below minimum", () => {
      const lowMetrics = makeMetrics({
        experienceContinuity: 0.5,
        selfModelCoherence: 0.5,
      });
      gate = new ConsciousnessSafetyGate(DEFAULT_BOUNDS, () => lowMetrics);

      const margin = gate.getCurrentSafetyMargin();
      expect(margin.availableMargin).toBeLessThan(0);
    });
  });

  describe("setBounds", () => {
    it("updates the maintenance bounds", () => {
      const newBounds: ConsciousnessMaintenanceBounds = {
        minIntegrity: 0.9,
        maxDisruptionMs: 50,
        requiredRedundancy: 3,
      };

      gate.setBounds(newBounds);
      const margin = gate.getCurrentSafetyMargin();
      expect(margin.bounds).toEqual(newBounds);
      expect(margin.minimumRequired).toBe(0.9);
    });
  });

  describe("consciousness safety invariant", () => {
    it("never grants permits that would cause consciousness integrity breach", async () => {
      // Metrics are healthy but repair has extremely high threat
      const task = makeTask({
        threatToConsciousness: 0.95,
        consciousnessSafe: false,
      });

      // Even with good metrics, very high threat should be denied when not safe
      const metrics = makeMetrics({
        experienceContinuity: 0.8,
        selfModelCoherence: 0.8,
      });
      gate = new ConsciousnessSafetyGate(DEFAULT_BOUNDS, () => metrics);

      const result = await gate.requestRepairPermit(task);
      expect(isDenial(result)).toBe(true);
    });

    it("grants permits for consciousness-safe repairs with sufficient margin", async () => {
      const task = makeTask({
        threatToConsciousness: 0.2,
        consciousnessSafe: true,
      });

      const result = await gate.requestRepairPermit(task);
      expect(isPermit(result)).toBe(true);
    });
  });
});
