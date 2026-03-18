/**
 * Autonomous Colony Seeding — Energy Harvesting Module (Phase 2)
 *
 * Implements IEnergyHarvesting: establishes and progressively expands the
 * energy base required for all subsequent colony bootstrap phases.
 *
 * Energy milestone sequence (from ARCHITECTURE.md §2.1):
 *   E0 — Probe payload baseline (1 kW): survive arrival, begin survey
 *   E1 — 10× probe baseline (10 kW): power first mining/fabrication ops
 *   E2 — 1 MW: sustain full manufacturing expansion
 *   E3 — Colony threshold (1 GW): sustain target conscious population
 *
 * Architecture reference: docs/autonomous-colony-seeding/ARCHITECTURE.md §2.1
 */

import { IEnergyHarvesting } from "./interfaces";
import {
  CollectorArray,
  EnergyCapacity,
  ConstructionPlan,
  EnergyOutput,
  Timeline,
  EnergyMilestoneId,
  ENERGY_MILESTONES,
  ResourceInventory,
  EstimatedTime,
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Output of the initial collector array deployed from probe payload (W) */
const PROBE_BASELINE_W = 1_000; // E0: 1 kW

/** Initial solar collector area deployed from probe payload (m²) */
const INITIAL_COLLECTOR_AREA_M2 = 100;

/** Collector panel efficiency (thin-film photovoltaic) */
const COLLECTOR_EFFICIENCY = 0.25;

/**
 * Solar flux at 1 AU in W/m² (used as reference; real value adjusted
 * per the site's orbital position, but EnergyHarvesting focuses on the
 * expansion trajectory rather than raw flux calculation — that is the
 * SiteSurvey's role).
 */
const SOLAR_FLUX_1AU_W_PER_M2 = 1_361;

/**
 * Area expansion factor applied to each collector build phase.
 * Each expansion phase multiplies the collector area by this factor.
 */
const EXPANSION_FACTOR = 10;

/**
 * Estimated years to complete each collector expansion phase.
 * A rough model: early phases are faster (smaller structures), later
 * phases take longer as raw ISRU production scales up.
 */
const EXPANSION_DURATION_YEARS: Record<EnergyMilestoneId, number> = {
  [EnergyMilestoneId.E0]: 0,    // already deployed on arrival
  [EnergyMilestoneId.E1]: 5,    // 5 years to 10× scale
  [EnergyMilestoneId.E2]: 20,   // 20 years to 1 MW
  [EnergyMilestoneId.E3]: 200,  // 200 years to 1 GW colony threshold
};

/** Structural metals required per m² of solar collector array (kg/m²) */
const METALS_PER_M2_KG = 0.5;

/** Semiconductor feedstock required per m² of solar collector (kg/m²) */
const SEMICONDUCTORS_PER_M2_KG = 0.01;

// ── EnergyHarvesting implementation ──────────────────────────────────────────

/**
 * Manages the Phase 2 energy infrastructure build-out from initial probe
 * payload collectors through to full colony-threshold generation capacity.
 *
 * Internal state tracks the currently deployed collector array and the
 * highest milestone reached. Calling `expandCapacity()` advances toward
 * the next milestone; `getCurrentOutput()` reflects the current state.
 */
export class EnergyHarvesting implements IEnergyHarvesting {
  private collectors: CollectorArray;
  private currentMilestone: EnergyMilestoneId;

  constructor() {
    // Start with no collectors deployed; `deployInitialCollectors()` must be
    // called first to establish E0 baseline.
    this.collectors = {
      count: 0,
      totalArea_m2: 0,
      efficiency: COLLECTOR_EFFICIENCY,
      output_w: 0,
    };
    this.currentMilestone = EnergyMilestoneId.E0;
  }

  // ── IEnergyHarvesting ────────────────────────────────────────────────────

  /**
   * Deploy the initial solar collector array from the probe payload.
   *
   * Establishes E0 baseline (1 kW) required to begin site survey operations.
   * Idempotent: re-calling returns the current array state.
   */
  deployInitialCollectors(): CollectorArray {
    if (this.collectors.count > 0) {
      // Already deployed — return current state
      return { ...this.collectors };
    }

    const output_w = SOLAR_FLUX_1AU_W_PER_M2 * INITIAL_COLLECTOR_AREA_M2 * COLLECTOR_EFFICIENCY;
    this.collectors = {
      count: 1,
      totalArea_m2: INITIAL_COLLECTOR_AREA_M2,
      efficiency: COLLECTOR_EFFICIENCY,
      output_w: Math.max(output_w, PROBE_BASELINE_W), // guarantee E0 minimum
    };
    this.currentMilestone = EnergyMilestoneId.E0;

    return { ...this.collectors };
  }

  /**
   * Expand energy capacity toward the specified milestone target.
   *
   * Generates a ConstructionPlan describing the collector build-out required.
   * Does not modify state — the plan must be executed by the manufacturing
   * pipeline before calling `getCurrentOutput()` will reflect the new level.
   *
   * The plan accounts for the resources (structural metals and semiconductors)
   * needed to fabricate the additional collector area from ISRU feedstock.
   */
  expandCapacity(target: EnergyCapacity): ConstructionPlan {
    const targetMilestone = ENERGY_MILESTONES.find(
      (m) => m.id === target.targetMilestone,
    );
    if (!targetMilestone) {
      throw new Error(`Unknown energy milestone: ${target.targetMilestone}`);
    }

    const targetArea_m2 = this.areaRequiredForOutput(targetMilestone.requiredCapacity_w);
    const additionalArea_m2 = Math.max(0, targetArea_m2 - this.collectors.totalArea_m2);

    const resourcesRequired: ResourceInventory = {
      structuralMetals_kg: additionalArea_m2 * METALS_PER_M2_KG,
      semiconductors_kg: additionalArea_m2 * SEMICONDUCTORS_PER_M2_KG,
      organics_kg: 0,
      waterIce_kg: 0,
    };

    const duration_years = EXPANSION_DURATION_YEARS[target.targetMilestone];
    const estimatedDuration: EstimatedTime = {
      duration_years,
      uncertainty_years: Math.round(duration_years * 0.3),
    };

    return {
      targetCapacity_w: targetMilestone.requiredCapacity_w,
      estimatedDuration,
      resourcesRequired,
      phases: this.buildExpansionPhases(target.targetMilestone),
    };
  }

  /**
   * Return the current energy output and highest reached milestone.
   *
   * Requires `deployInitialCollectors()` to have been called first.
   */
  getCurrentOutput(): EnergyOutput {
    return {
      output_w: this.collectors.output_w,
      milestoneReached: this.currentMilestone,
      timestamp_ms: Date.now(),
    };
  }

  /**
   * Estimate the time required to reach a target energy capacity.
   *
   * Returns a Timeline listing each intermediate milestone and the total
   * projected duration with uncertainty bounds. Milestones already exceeded
   * by current output are marked as completed (0 duration).
   */
  getProjectedTimeline(target: EnergyCapacity): Timeline {
    const currentOutput_w = this.collectors.output_w;
    const milestones = ENERGY_MILESTONES.filter(
      (m) => m.requiredCapacity_w <= this.milestoneCapacity(target.targetMilestone),
    );

    let cumulativeDuration_years = 0;
    const timelineMilestones = milestones.map((m) => {
      const alreadyMet = currentOutput_w >= m.requiredCapacity_w;
      const duration_years = alreadyMet ? 0 : EXPANSION_DURATION_YEARS[m.id];
      cumulativeDuration_years += duration_years;
      return {
        name: `${m.id}: ${m.purpose} (${m.requiredCapacity_w.toExponential(0)} W)`,
        estimatedTime: {
          duration_years: cumulativeDuration_years,
          uncertainty_years: Math.round(cumulativeDuration_years * 0.3),
        },
      };
    });

    const totalUncertainty = Math.round(cumulativeDuration_years * 0.3);

    return {
      milestones: timelineMilestones,
      totalDuration: {
        duration_years: cumulativeDuration_years,
        uncertainty_years: totalUncertainty,
      },
    };
  }

  // ── Package-internal: advance milestone after manufacturing completes ────────

  /**
   * Advance the internal state to a new collector array output level.
   *
   * Called by the manufacturing pipeline after a ConstructionPlan has been
   * executed. Updates the collector array and records the new milestone.
   *
   * @param newOutput_w  New total energy output in watts after build completion.
   */
  recordExpansionCompletion(newOutput_w: number): void {
    const area_m2 = this.areaRequiredForOutput(newOutput_w);
    this.collectors = {
      count: Math.ceil(area_m2 / INITIAL_COLLECTOR_AREA_M2),
      totalArea_m2: area_m2,
      efficiency: COLLECTOR_EFFICIENCY,
      output_w: newOutput_w,
    };
    this.currentMilestone = this.milestoneForOutput(newOutput_w);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Compute the collector area (m²) required to produce a given output (W).
   *
   * Assumes the nominal 1 AU solar flux and COLLECTOR_EFFICIENCY. In practice
   * the SiteSurvey adjusts for actual orbital distance, but the expansion
   * planner uses 1 AU as a conservative baseline.
   */
  private areaRequiredForOutput(output_w: number): number {
    return output_w / (SOLAR_FLUX_1AU_W_PER_M2 * COLLECTOR_EFFICIENCY);
  }

  /**
   * Determine the highest milestone met for a given output level.
   */
  private milestoneForOutput(output_w: number): EnergyMilestoneId {
    // Walk milestones in reverse to find the highest met
    const sorted = [...ENERGY_MILESTONES].sort(
      (a, b) => b.requiredCapacity_w - a.requiredCapacity_w,
    );
    for (const m of sorted) {
      if (output_w >= m.requiredCapacity_w) return m.id;
    }
    return EnergyMilestoneId.E0;
  }

  /**
   * Return the required capacity in watts for the given milestone ID.
   */
  private milestoneCapacity(id: EnergyMilestoneId): number {
    const m = ENERGY_MILESTONES.find((m) => m.id === id);
    return m?.requiredCapacity_w ?? 0;
  }

  /**
   * Build a human-readable list of expansion phases toward the target milestone.
   */
  private buildExpansionPhases(targetMilestone: EnergyMilestoneId): string[] {
    const milestoneOrder = [
      EnergyMilestoneId.E0,
      EnergyMilestoneId.E1,
      EnergyMilestoneId.E2,
      EnergyMilestoneId.E3,
    ];
    const targetIndex = milestoneOrder.indexOf(targetMilestone);
    const currentIndex = milestoneOrder.indexOf(this.currentMilestone);

    const phases: string[] = [];
    for (let i = currentIndex + 1; i <= targetIndex; i++) {
      const m = ENERGY_MILESTONES.find((ms) => ms.id === milestoneOrder[i]);
      if (m) {
        const area_m2 = this.areaRequiredForOutput(m.requiredCapacity_w);
        const expansionFactor = Math.round(
          area_m2 / Math.max(1, this.collectors.totalArea_m2),
        );
        phases.push(
          `Deploy ${expansionFactor}× collector array expansion → ${m.id} (${m.purpose})`,
        );
      }
    }
    return phases.length > 0 ? phases : ["Current capacity already meets target"];
  }
}
