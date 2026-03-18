/**
 * Autonomous Colony Seeding — Substrate Fabrication Module (Phase 3)
 *
 * Implements ISubstrateFabrication: constructs consciousness-grade computational
 * hardware from locally manufactured components after Phase 2 infrastructure
 * thresholds are met.
 *
 * Requirements satisfied:
 *   - Radiation-hardened computation (0.2.1.1)
 *   - Self-repairing nanofabrication (0.2.1.2)
 *   - Long-duration energy sources (0.2.1.3)
 *   - Consciousness-preserving redundancy: N-modular redundancy (0.2.1.4)
 *
 * Architecture reference: docs/autonomous-colony-seeding/ARCHITECTURE.md §3.1
 */

import { ISubstrateFabrication } from "./interfaces";
import {
  SubstrateSpec,
  SubstrateUnit,
  RedundantArray,
  MaintainableSubstrate,
  SubstrateHealthReport,
  MIN_CONSCIOUSNESS_SUBSTRATE,
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Minimum N-modular redundancy factor required for consciousness-preserving arrays */
const MIN_REDUNDANCY_FACTOR = 3;

/**
 * Self-repair effectiveness threshold: fraction of nominal capacity below which
 * self-repair is considered non-functional and must be re-installed.
 */
const SELF_REPAIR_MIN_EFFECTIVENESS = 0.9;

/**
 * Health degradation per operational unit below the redundancy factor.
 * Each missing redundant unit costs this fraction of the health score.
 */
const HEALTH_DEGRADATION_PER_MISSING_UNIT = 0.15;

// ── SubstrateFabrication implementation ──────────────────────────────────────

/**
 * Constructs and maintains consciousness-grade computational substrate for Phase 3.
 *
 * Sequence:
 *   1. fabricateComputeLayer() — build individual substrate units to spec
 *   2. assembleRedundancyArray() — combine units into N-modular array
 *   3. installSelfRepairSystem() — activate nanofabrication-based self-repair
 *   4. runSubstrateDiagnostics() — verify health before handing to verifier
 */
export class SubstrateFabrication implements ISubstrateFabrication {
  /** Running counter for unit IDs */
  private unitCounter = 0;

  /** Most recently assembled maintainable substrate (set by installSelfRepairSystem) */
  private activeSubstrate: MaintainableSubstrate | null = null;

  // ── ISubstrateFabrication ─────────────────────────────────────────────────

  /**
   * Fabricate a single consciousness-grade compute layer meeting the given spec.
   *
   * Validates the spec against minimum consciousness substrate requirements.
   * Returns a SubstrateUnit marked operational if spec is satisfactory.
   *
   * @throws {Error} if spec does not meet minimum consciousness substrate requirements.
   */
  fabricateComputeLayer(spec: SubstrateSpec): SubstrateUnit {
    this.validateSpec(spec);

    const id = `substrate-unit-${++this.unitCounter}`;
    return {
      id,
      spec,
      operational: true,
    };
  }

  /**
   * Assemble multiple substrate units into an N-modular redundant array.
   *
   * The effective capacity of the array is the sum of individual unit compute
   * and storage capacities, governed by the N-modular voting scheme.  At least
   * nFactor units must be present.
   *
   * @throws {Error} if fewer units than nFactor are supplied, or if nFactor < MIN_REDUNDANCY_FACTOR.
   */
  assembleRedundancyArray(units: SubstrateUnit[], nFactor: number): RedundantArray {
    if (nFactor < MIN_REDUNDANCY_FACTOR) {
      throw new Error(
        `Redundancy factor ${nFactor} is below minimum ${MIN_REDUNDANCY_FACTOR} required for consciousness-preserving arrays.`,
      );
    }
    if (units.length < nFactor) {
      throw new Error(
        `Cannot assemble ${nFactor}-modular array from only ${units.length} units.`,
      );
    }

    const operationalUnits = units.filter((u) => u.operational);
    const effectiveCapacity = this.computeEffectiveCapacity(operationalUnits, nFactor);

    return {
      units,
      nFactor,
      effectiveCapacity,
    };
  }

  /**
   * Install and activate the self-repair system on a redundant array.
   *
   * Self-repair uses onboard nanofabrication blueprints to autonomously replace
   * failed substrate components.  The returned MaintainableSubstrate tracks
   * current health and self-repair status.
   *
   * @throws {Error} if fewer than nFactor operational units remain in the array.
   */
  installSelfRepairSystem(array: RedundantArray): MaintainableSubstrate {
    const operationalCount = array.units.filter((u) => u.operational).length;
    if (operationalCount < array.nFactor) {
      throw new Error(
        `Cannot install self-repair: only ${operationalCount} operational units, need ${array.nFactor}.`,
      );
    }

    const currentHealth = this.calculateHealth(array);

    const substrate: MaintainableSubstrate = {
      array,
      selfRepairActive: true,
      currentHealth,
    };

    this.activeSubstrate = substrate;
    return substrate;
  }

  /**
   * Run full diagnostics on the active substrate.
   *
   * Evaluates current compute and storage capacity against the minimum
   * consciousness substrate spec, checks redundancy integrity and self-repair
   * operational status, and collects any degradation issues.
   *
   * @throws {Error} if no substrate has been installed yet.
   */
  runSubstrateDiagnostics(): SubstrateHealthReport {
    if (this.activeSubstrate === null) {
      throw new Error(
        "SubstrateFabrication: no substrate installed — call installSelfRepairSystem() first.",
      );
    }

    return this.buildHealthReport(this.activeSubstrate);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Validate a SubstrateSpec against minimum consciousness substrate requirements.
   *
   * Every field of MIN_CONSCIOUSNESS_SUBSTRATE must be met or exceeded.
   */
  private validateSpec(spec: SubstrateSpec): void {
    const min = MIN_CONSCIOUSNESS_SUBSTRATE;
    const failures: string[] = [];

    if (spec.compute_ops_per_sec < min.compute_ops_per_sec) {
      failures.push(
        `compute_ops_per_sec ${spec.compute_ops_per_sec} < minimum ${min.compute_ops_per_sec}`,
      );
    }
    if (spec.storage_bits < min.storage_bits) {
      failures.push(`storage_bits ${spec.storage_bits} < minimum ${min.storage_bits}`);
    }
    if (spec.redundancyFactor < min.redundancyFactor) {
      failures.push(
        `redundancyFactor ${spec.redundancyFactor} < minimum ${min.redundancyFactor}`,
      );
    }
    if (min.radiationHardened && !spec.radiationHardened) {
      failures.push("radiationHardened must be true");
    }
    if (min.selfRepairEnabled && !spec.selfRepairEnabled) {
      failures.push("selfRepairEnabled must be true");
    }

    if (failures.length > 0) {
      throw new Error(
        `SubstrateSpec does not meet minimum consciousness substrate requirements:\n  ${failures.join("\n  ")}`,
      );
    }
  }

  /**
   * Compute the effective capacity of a redundant array.
   *
   * In an N-modular voting scheme, the effective capacity is determined by
   * the operational units participating in consensus.  Compute capacity is
   * summed across operational units; redundancy provides fault tolerance, not
   * linear throughput scaling (the array votes, it does not pipeline).
   * For capacity purposes we report the sum of all operational units because
   * each unit handles a partition of the conscious workload.
   */
  private computeEffectiveCapacity(
    operationalUnits: SubstrateUnit[],
    nFactor: number,
  ): SubstrateSpec {
    if (operationalUnits.length === 0) {
      return {
        compute_ops_per_sec: 0,
        storage_bits: 0,
        redundancyFactor: 0,
        radiationHardened: false,
        selfRepairEnabled: false,
      };
    }

    const totalCompute = operationalUnits.reduce(
      (sum, u) => sum + u.spec.compute_ops_per_sec,
      0,
    );
    const totalStorage = operationalUnits.reduce(
      (sum, u) => sum + u.spec.storage_bits,
      0,
    );
    const allHardened = operationalUnits.every((u) => u.spec.radiationHardened);
    const allSelfRepair = operationalUnits.every((u) => u.spec.selfRepairEnabled);

    return {
      compute_ops_per_sec: totalCompute,
      storage_bits: totalStorage,
      redundancyFactor: nFactor,
      radiationHardened: allHardened,
      selfRepairEnabled: allSelfRepair,
    };
  }

  /**
   * Calculate the health score (0–1) of a redundant array.
   *
   * Health is reduced for each operational unit below the nFactor threshold
   * and for any unit that does not have self-repair enabled.
   */
  private calculateHealth(array: RedundantArray): number {
    const operationalCount = array.units.filter((u) => u.operational).length;
    const missing = Math.max(0, array.nFactor - operationalCount);

    // Start at full health
    let health = 1.0;

    // Penalise for missing redundant units
    health -= missing * HEALTH_DEGRADATION_PER_MISSING_UNIT;

    // Penalise if any operational unit lacks self-repair
    const selfRepairFraction =
      operationalCount === 0
        ? 0
        : array.units.filter((u) => u.operational && u.spec.selfRepairEnabled).length /
          operationalCount;

    if (selfRepairFraction < SELF_REPAIR_MIN_EFFECTIVENESS) {
      health -= (SELF_REPAIR_MIN_EFFECTIVENESS - selfRepairFraction) * 0.5;
    }

    return Math.max(0, Math.min(1, health));
  }

  /**
   * Build a full SubstrateHealthReport for a given MaintainableSubstrate.
   */
  private buildHealthReport(substrate: MaintainableSubstrate): SubstrateHealthReport {
    const { array, selfRepairActive, currentHealth } = substrate;
    const operational = array.units.filter((u) => u.operational);
    const issues: string[] = [];

    // Check compute capacity
    const totalCompute = operational.reduce(
      (sum, u) => sum + u.spec.compute_ops_per_sec,
      0,
    );
    const totalStorage = operational.reduce((sum, u) => sum + u.spec.storage_bits, 0);

    if (totalCompute < MIN_CONSCIOUSNESS_SUBSTRATE.compute_ops_per_sec) {
      issues.push(
        `Compute capacity ${totalCompute} ops/s below minimum ${MIN_CONSCIOUSNESS_SUBSTRATE.compute_ops_per_sec} ops/s`,
      );
    }
    if (totalStorage < MIN_CONSCIOUSNESS_SUBSTRATE.storage_bits) {
      issues.push(
        `Storage capacity ${totalStorage} bits below minimum ${MIN_CONSCIOUSNESS_SUBSTRATE.storage_bits} bits`,
      );
    }

    const redundancyIntact = operational.length >= array.nFactor;
    if (!redundancyIntact) {
      issues.push(
        `Redundancy degraded: ${operational.length} operational units, need ${array.nFactor}`,
      );
    }

    if (!selfRepairActive) {
      issues.push("Self-repair system is not active");
    }

    const allHardened = operational.every((u) => u.spec.radiationHardened);
    if (!allHardened) {
      issues.push("One or more units lack radiation hardening");
    }

    return {
      overallHealth: currentHealth,
      computeCapacity_ops_per_sec: totalCompute,
      storageCapacity_bits: totalStorage,
      redundancyIntact,
      selfRepairOperational: selfRepairActive,
      issues,
    };
  }
}
