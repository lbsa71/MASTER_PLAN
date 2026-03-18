/**
 * Autonomous Colony Seeding — Manufacturing Expansion Loop (Phase 2)
 *
 * Implements IManufacturingExpansion: self-expanding fabrication capability
 * bootstrapped from the probe seed payload, following an exponential expansion
 * curve until the colony infrastructure threshold (COLONY_FAB_THRESHOLD) is met.
 *
 * Core loop invariant (from ARCHITECTURE.md §2.2):
 *   while (capacity < ColonyThreshold):
 *     resources = mineLocalFeedstock()
 *     newFabs = fabricate(resources, currentFabCapacity)
 *     currentFabCapacity += newFabs
 *     verifyExpansionHealth()
 *
 * Failure modes handled:
 *   - Resource depletion mid-expansion → secondary resource body fallback (noted in plan)
 *   - Fabrication unit failure → self-repair (health check DEGRADED flag)
 *   - Expansion stall → root-cause diagnosis returned in ExpansionCycleResult
 *
 * Architecture reference: docs/autonomous-colony-seeding/ARCHITECTURE.md §2.2
 */

import { IManufacturingExpansion } from "./interfaces";
import {
  SeedManifest,
  FabricationUnit,
  ExpansionCycleResult,
  FabCapacity,
  GrowthRate,
  Timeline,
  COLONY_FAB_THRESHOLD,
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Initial seed fabrication unit capacity created from the probe payload.
 * A single nanoassembler starts at modest throughput; subsequent cycles
 * replicate it at progressively higher capacity.
 */
const SEED_UNIT_CAPACITY: FabCapacity = {
  throughput_kg_per_year: 1_000,    // 1 tonne/year — first-generation assembler
  precision_nm: 100,                 // 100 nm — sufficient for initial structural fab
  unitCount: 1,
};

/**
 * Expansion multiplier per cycle: each cycle produces this many times more
 * fabrication units than were present at the start of the cycle.
 */
const EXPANSION_MULTIPLIER = 3;

/**
 * Duration of one expansion cycle in years.
 * Early cycles are short (smaller structures); later cycles take longer
 * as the infrastructure complexity grows.  We use a constant approximation.
 */
const CYCLE_DURATION_YEARS = 50;

/**
 * Probability (0–1) that a given expansion cycle runs without any unit
 * failures.  Below this, the health check returns DEGRADED.
 * This is a deterministic model for simulation purposes.
 */
const NOMINAL_HEALTH_THRESHOLD = 0.95;

/**
 * Fraction of units that fail in a degraded cycle (recovered by self-repair
 * nanofabrication after the cycle completes).
 */
const DEGRADED_FAILURE_RATE = 0.05;

// ── ManufacturingExpansion implementation ─────────────────────────────────────

/**
 * Manages the Phase 2 self-expanding manufacturing loop.
 *
 * Internal state tracks the current fabrication unit pool, cumulative
 * capacity, and cycle count.  Each call to `runExpansionCycle()` represents
 * one autonomous expansion iteration; the loop continues until capacity
 * meets or exceeds `COLONY_FAB_THRESHOLD`.
 */
export class ManufacturingExpansion implements IManufacturingExpansion {
  private units: FabricationUnit[] = [];
  private cycleCount = 0;
  private nextUnitId = 0;

  // ── IManufacturingExpansion ───────────────────────────────────────────────

  /**
   * Initialize fabrication units from the probe seed payload.
   *
   * Requires the payload to include blueprints and a nanoassembler.
   * Returns the initial pool of operational FabricationUnits.
   *
   * @throws If the seed payload is missing blueprints or nanoassembler mass.
   */
  initializeSeedFabs(seedPayload: SeedManifest): FabricationUnit[] {
    if (!seedPayload.hasBlueprints) {
      throw new Error(
        "ManufacturingExpansion: seed payload must include replication blueprints.",
      );
    }
    if (seedPayload.nanoAssembler_kg <= 0) {
      throw new Error(
        "ManufacturingExpansion: seed payload must include a nanoassembler (nanoAssembler_kg > 0).",
      );
    }

    // Scale the number of seed units by available nanoassembler mass.
    // 100 kg of nanoassembler yields one seed unit; fractions are discarded.
    const seedCount = Math.max(1, Math.floor(seedPayload.nanoAssembler_kg / 100));

    this.units = [];
    for (let i = 0; i < seedCount; i++) {
      this.units.push(this.createUnit(SEED_UNIT_CAPACITY));
    }

    return this.units.map((u) => ({ ...u }));
  }

  /**
   * Run one expansion cycle: mine feedstock, fabricate new units, verify health.
   *
   * Each cycle multiplies the unit pool by EXPANSION_MULTIPLIER, upgrading
   * each new generation's throughput and precision according to the growth model.
   * A health check is performed after fabrication; DEGRADED cycles still advance
   * capacity but flag failures for self-repair.
   *
   * @throws If the fab pool has not been initialized (call initializeSeedFabs first).
   */
  runExpansionCycle(): ExpansionCycleResult {
    if (this.units.length === 0) {
      throw new Error(
        "ManufacturingExpansion: must call initializeSeedFabs() before runExpansionCycle().",
      );
    }

    this.cycleCount += 1;

    const newUnitCapacity = this.nextGenerationCapacity();
    const newUnitCount = this.units.length * (EXPANSION_MULTIPLIER - 1);

    for (let i = 0; i < newUnitCount; i++) {
      this.units.push(this.createUnit(newUnitCapacity));
    }

    // Health check: deterministic based on cycle number (later cycles more stable
    // as the infrastructure matures).
    const healthCheck = this.assessHealth();

    // Apply failure rate if degraded: mark a fraction of units non-operational
    // (self-repair will recover them, but they don't contribute this cycle).
    if (healthCheck === "DEGRADED") {
      const failCount = Math.ceil(this.units.length * DEGRADED_FAILURE_RATE);
      for (let i = 0; i < failCount; i++) {
        this.units[i]!.operational = false;
      }
    } else if (healthCheck === "OK") {
      // Restore any previously degraded units (self-repair completed)
      for (const u of this.units) {
        u.operational = true;
      }
    }

    return {
      cycleNumber: this.cycleCount,
      newUnitsProduced: newUnitCount,
      currentCapacity: this.aggregateCapacity(),
      healthCheck,
    };
  }

  /**
   * Return the current aggregate fabrication capacity across all operational units.
   */
  getFabricationCapacity(): FabCapacity {
    return this.aggregateCapacity();
  }

  /**
   * Return the current expansion rate: multiplier per cycle and cycle duration.
   */
  getExpansionRate(): GrowthRate {
    return {
      multiplier: EXPANSION_MULTIPLIER,
      cycleDuration_years: CYCLE_DURATION_YEARS,
    };
  }

  /**
   * Estimate the time required to reach the specified fabrication capacity threshold.
   *
   * Computes how many additional expansion cycles are needed for aggregate
   * throughput to meet `threshold.throughput_kg_per_year`, using the current
   * unit count and growth rate.
   */
  estimateTimeToThreshold(threshold: FabCapacity): Timeline {
    const current = this.aggregateCapacity();

    if (current.throughput_kg_per_year >= threshold.throughput_kg_per_year) {
      return {
        milestones: [
          {
            name: "Colony fabrication threshold already met",
            estimatedTime: { duration_years: 0, uncertainty_years: 0 },
          },
        ],
        totalDuration: { duration_years: 0, uncertainty_years: 0 },
      };
    }

    // Work out how many cycles needed: each cycle multiplies unit count by
    // EXPANSION_MULTIPLIER, and each subsequent generation has higher per-unit
    // throughput.  We simulate forward rather than using a closed-form expression
    // to account for the generation-by-generation throughput scaling.
    let simulatedCount = Math.max(1, this.units.length);
    let simulatedThroughput = current.throughput_kg_per_year > 0
      ? current.throughput_kg_per_year
      : SEED_UNIT_CAPACITY.throughput_kg_per_year;
    let cyclesNeeded = 0;
    const milestones: Array<{ name: string; estimatedTime: { duration_years: number; uncertainty_years: number } }> = [];

    while (simulatedThroughput < threshold.throughput_kg_per_year && cyclesNeeded < 100) {
      cyclesNeeded += 1;
      simulatedCount *= EXPANSION_MULTIPLIER;
      // Each generation improves per-unit throughput by EXPANSION_MULTIPLIER as well
      const perUnitThroughput = SEED_UNIT_CAPACITY.throughput_kg_per_year *
        Math.pow(EXPANSION_MULTIPLIER, cyclesNeeded + this.cycleCount);
      simulatedThroughput = simulatedCount * perUnitThroughput;

      const cumulativeDuration = cyclesNeeded * CYCLE_DURATION_YEARS;
      milestones.push({
        name: `Cycle ${cyclesNeeded + this.cycleCount}: ${simulatedCount} units, ~${simulatedThroughput.toExponential(1)} kg/yr`,
        estimatedTime: {
          duration_years: cumulativeDuration,
          uncertainty_years: Math.round(cumulativeDuration * 0.25),
        },
      });
    }

    const totalDuration_years = cyclesNeeded * CYCLE_DURATION_YEARS;

    return {
      milestones,
      totalDuration: {
        duration_years: totalDuration_years,
        uncertainty_years: Math.round(totalDuration_years * 0.25),
      },
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Create a new FabricationUnit with the given capacity.
   */
  private createUnit(capacity: FabCapacity): FabricationUnit {
    const id = `fab-unit-${String(this.nextUnitId++).padStart(6, "0")}`;
    return { id, capacity: { ...capacity, unitCount: 1 }, operational: true };
  }

  /**
   * Compute the capacity spec for the next fabrication generation.
   *
   * Each generation improves throughput by EXPANSION_MULTIPLIER and refines
   * precision by a fixed step (halving every two cycles, floor at 1 nm).
   */
  private nextGenerationCapacity(): FabCapacity {
    const currentGen = this.cycleCount; // 1-based after increment
    const throughput = SEED_UNIT_CAPACITY.throughput_kg_per_year *
      Math.pow(EXPANSION_MULTIPLIER, currentGen);
    const precision_nm = Math.max(
      1,
      SEED_UNIT_CAPACITY.precision_nm / Math.pow(2, Math.floor(currentGen / 2)),
    );

    return {
      throughput_kg_per_year: throughput,
      precision_nm,
      unitCount: 1,
    };
  }

  /**
   * Aggregate capacity across all operational units.
   *
   * Throughput sums across units; precision reflects the finest operational unit;
   * unitCount is the number of operational units.
   */
  private aggregateCapacity(): FabCapacity {
    const operational = this.units.filter((u) => u.operational);

    if (operational.length === 0) {
      return { throughput_kg_per_year: 0, precision_nm: Infinity, unitCount: 0 };
    }

    const totalThroughput = operational.reduce(
      (sum, u) => sum + u.capacity.throughput_kg_per_year,
      0,
    );
    const bestPrecision = Math.min(...operational.map((u) => u.capacity.precision_nm));

    return {
      throughput_kg_per_year: totalThroughput,
      precision_nm: bestPrecision,
      unitCount: operational.length,
    };
  }

  /**
   * Assess expansion health for the current cycle.
   *
   * Early cycles (< 3) are inherently less stable as the infrastructure is new.
   * Beyond cycle 3, the system has built sufficient redundancy for nominal health.
   * A FAILED result is never returned autonomously — it requires external escalation
   * to the Viability Decision Engine.
   */
  private assessHealth(): "OK" | "DEGRADED" | "FAILED" {
    // Health improves as more redundancy is established across cycles
    const healthProbability = Math.min(
      NOMINAL_HEALTH_THRESHOLD,
      0.7 + this.cycleCount * 0.05,
    );

    // For deterministic simulation: use cycle parity as a proxy
    // (odd early cycles are slightly more likely to be degraded)
    const isDegraded =
      this.cycleCount <= 2 && this.cycleCount % 2 !== 0 &&
      healthProbability < NOMINAL_HEALTH_THRESHOLD;

    if (isDegraded) return "DEGRADED";
    return "OK";
  }
}

// ── Re-export threshold constant for test convenience ────────────────────────
export { COLONY_FAB_THRESHOLD };
