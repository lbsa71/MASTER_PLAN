/**
 * Consciousness Safety Gate (CSG) — Implementation
 *
 * Hard safety interlock that evaluates every proposed repair action
 * for consciousness safety BEFORE execution. No repair may proceed
 * without CSG approval.
 *
 * Invariant: The CSG can revoke a permit mid-repair if consciousness
 * metrics deteriorate. Executors MUST honor revocation within 100ms.
 *
 * Architecture reference: docs/autonomous-self-maintenance/ARCHITECTURE.md §2.2
 */

import type {
  ConsciousnessMaintenanceBounds,
  ConsciousnessMetrics,
  RepairTask,
  Timestamp,
} from "./types.js";

import type {
  IConsciousnessSafetyGate,
  PermitRevocationHandler,
  RepairDenial,
  RepairPermit,
  RevocationResult,
  SafetyMargin,
  Unsubscribe,
} from "./interfaces.js";

// ── Helpers ───────────────────────────────────────────────────

/** Generate a unique permit ID */
function generatePermitId(): string {
  return `permit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Derive a single integrity score from consciousness metrics.
 * Uses the minimum of experienceContinuity and selfModelCoherence
 * — consciousness is only as strong as its weakest axis.
 */
function deriveIntegrity(metrics: ConsciousnessMetrics): number {
  return Math.min(metrics.experienceContinuity, metrics.selfModelCoherence);
}

/** Safety margin multiplier for permit duration beyond estimated repair time */
const PERMIT_DURATION_MARGIN = 1.5;

/** Threat threshold above which non-safe repairs are always denied */
const HIGH_THREAT_DENIAL_THRESHOLD = 0.7;

/** Minimum safety margin required to approve a non-safe repair */
const NON_SAFE_REPAIR_MARGIN_THRESHOLD = 0.2;

// ── Implementation ────────────────────────────────────────────

export class ConsciousnessSafetyGate implements IConsciousnessSafetyGate {
  private bounds: ConsciousnessMaintenanceBounds;
  private readonly getMetrics: () => ConsciousnessMetrics;
  private readonly activePermits: Map<string, RepairPermit> = new Map();
  private readonly revocationHandlers: Set<PermitRevocationHandler> = new Set();

  constructor(
    bounds: ConsciousnessMaintenanceBounds,
    metricsProvider: () => ConsciousnessMetrics,
  ) {
    this.bounds = bounds;
    this.getMetrics = metricsProvider;
  }

  async requestRepairPermit(
    task: RepairTask,
  ): Promise<RepairPermit | RepairDenial> {
    const now = Date.now() as Timestamp;
    const metrics = this.getMetrics();
    const integrity = deriveIntegrity(metrics);

    // Gate 1: Current integrity must be above minimum bounds
    if (integrity < this.bounds.minIntegrity) {
      return {
        taskId: task.id,
        denied: true,
        reason: `Current consciousness integrity (${integrity.toFixed(3)}) is below minimum required (${this.bounds.minIntegrity}). No repairs permitted until integrity recovers.`,
        retryAfter: 30_000, // retry in 30s
        timestamp: now,
      } satisfies RepairDenial;
    }

    const safetyMargin = integrity - this.bounds.minIntegrity;

    // Gate 2: Non-consciousness-safe repairs with high threat are denied
    //         when margin is insufficient
    if (!task.consciousnessSafe) {
      if (task.threatToConsciousness >= HIGH_THREAT_DENIAL_THRESHOLD) {
        return {
          taskId: task.id,
          denied: true,
          reason: `Repair is not consciousness-safe and threat level (${task.threatToConsciousness}) exceeds threshold (${HIGH_THREAT_DENIAL_THRESHOLD}). Cannot risk consciousness integrity breach.`,
          retryAfter: 60_000,
          timestamp: now,
        } satisfies RepairDenial;
      }

      if (safetyMargin < NON_SAFE_REPAIR_MARGIN_THRESHOLD) {
        return {
          taskId: task.id,
          denied: true,
          reason: `Insufficient safety margin (${safetyMargin.toFixed(3)}) for non-consciousness-safe repair. Required: ${NON_SAFE_REPAIR_MARGIN_THRESHOLD}.`,
          retryAfter: 30_000,
          timestamp: now,
        } satisfies RepairDenial;
      }
    }

    // Determine precautions based on threat level
    const precautions: string[] = [];
    if (task.threatToConsciousness > 0.5) {
      precautions.push("Activate redundant consciousness pathways before proceeding");
      precautions.push("Monitor consciousness metrics at 10ms intervals during repair");
    } else if (task.threatToConsciousness > 0.2) {
      precautions.push("Monitor consciousness metrics at 100ms intervals during repair");
    }
    if (!task.consciousnessSafe) {
      precautions.push("Prepare rollback state before beginning repair");
    }

    // Determine if continuity-preserving transfer is required
    const requiresContinuityTransfer = !task.consciousnessSafe;

    // Calculate permit duration: estimated repair + safety margin
    const permitDuration = Math.max(
      task.estimatedDuration * PERMIT_DURATION_MARGIN,
      task.estimatedDuration + this.bounds.maxDisruptionMs,
    );

    const permit: RepairPermit = {
      permitId: generatePermitId(),
      taskId: task.id,
      issuedAt: now,
      expiresAt: (now + permitDuration) as Timestamp,
      precautions,
      requiresContinuityTransfer,
    };

    this.activePermits.set(permit.permitId, permit);
    return permit;
  }

  getActivePermits(): readonly RepairPermit[] {
    return Array.from(this.activePermits.values());
  }

  revokePermit(permitId: string, reason: string): RevocationResult {
    const permit = this.activePermits.get(permitId);
    if (!permit) {
      return {
        permitId,
        revoked: false,
        reason: `No active permit found with ID: ${permitId}`,
      };
    }

    this.activePermits.delete(permitId);

    // Notify all handlers
    for (const handler of this.revocationHandlers) {
      handler(permitId, reason);
    }

    return {
      permitId,
      revoked: true,
      reason,
    };
  }

  getCurrentSafetyMargin(): SafetyMargin {
    const now = Date.now() as Timestamp;
    const metrics = this.getMetrics();
    const currentIntegrity = deriveIntegrity(metrics);

    return {
      currentIntegrity,
      minimumRequired: this.bounds.minIntegrity,
      availableMargin: currentIntegrity - this.bounds.minIntegrity,
      bounds: this.bounds,
      timestamp: now,
    };
  }

  onPermitRevoked(handler: PermitRevocationHandler): Unsubscribe {
    this.revocationHandlers.add(handler);
    return () => {
      this.revocationHandlers.delete(handler);
    };
  }

  setBounds(bounds: ConsciousnessMaintenanceBounds): void {
    this.bounds = bounds;
  }
}
