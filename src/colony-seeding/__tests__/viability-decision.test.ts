/**
 * Viability Decision Engine — Unit Tests
 *
 * Covers the three autonomous decision paths: GO, ABORT, and DORMANCY.
 *
 * Test matrix:
 *   GO       — all four criteria met; site selected; bootstrap plan generated
 *   DORMANCY — single recoverable criterion failure (energy or radiation only)
 *   ABORT    — resource or orbital-stability failure; or multiple failures
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ViabilityDecisionEngine } from "../viability-decision-engine";
import {
  SystemMap,
  SpectralClass,
  ColonySiteDecisionType,
  ColonySite,
  AbortDecision,
  MIN_RESOURCE_REQUIREMENTS,
  MIN_ENERGY_GW,
  ENERGY_MILESTONES,
  COLONY_FAB_THRESHOLD,
  MIN_CONSCIOUSNESS_SUBSTRATE,
} from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a SystemMap that passes every GO criterion. */
function viableSystem(): SystemMap {
  return {
    starType: SpectralClass.G,
    bodies: [
      {
        id: "asteroid-belt-alpha",
        type: "asteroid",
        mass_kg: 1e20,
        orbitalRadius_au: 2.2,
        composition: {
          structuralMetals_kg: 5e18,
          semiconductors_kg: 5e12,
          organics_kg: 1e10,
          waterIce_kg: 1e15,
        },
      },
    ],
    radiationProfile: {
      stellarLuminosity_Lsun: 1.0,
      particleFlux_per_cm2_s: 1e4,
      peakEventsPerCentury: 2,
      withinHardenedTolerance: true,
    },
    resourceInventory: {
      structuralMetals_kg: MIN_RESOURCE_REQUIREMENTS.structuralMetals_kg * 5, // 5× minimum
      semiconductors_kg: MIN_RESOURCE_REQUIREMENTS.semiconductors_kg * 5,     // 5× minimum
      organics_kg: 1e10,
      waterIce_kg: 1e15,
    },
    energyBudget: {
      solarPower_w: MIN_ENERGY_GW * 10, // well above threshold
      meetsMinimumThreshold: true,
    },
  };
}

/** Produce a SystemMap with a single criterion toggled to failing. */
function systemWithFailure(
  failure: "energy" | "resources" | "radiation" | "orbit",
): SystemMap {
  const base = viableSystem();

  switch (failure) {
    case "energy":
      return {
        ...base,
        energyBudget: { solarPower_w: MIN_ENERGY_GW * 0.1, meetsMinimumThreshold: false },
      };
    case "resources":
      return {
        ...base,
        resourceInventory: {
          structuralMetals_kg: MIN_RESOURCE_REQUIREMENTS.structuralMetals_kg * 0.5, // below min
          semiconductors_kg: MIN_RESOURCE_REQUIREMENTS.semiconductors_kg * 5,
          organics_kg: 0,
          waterIce_kg: 0,
        },
      };
    case "radiation":
      return {
        ...base,
        radiationProfile: {
          ...base.radiationProfile,
          withinHardenedTolerance: false,
        },
      };
    case "orbit":
      return {
        ...base,
        bodies: [], // no bodies → orbitStable() returns false
        energyBudget: { solarPower_w: MIN_ENERGY_GW * 10, meetsMinimumThreshold: true },
      };
    default: {
      const _exhaustive: never = failure;
      return base;
    }
  }
}

function isColonySite(x: ColonySite | AbortDecision): x is ColonySite {
  return "id" in x;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ViabilityDecisionEngine", () => {
  let engine: ViabilityDecisionEngine;

  beforeEach(() => {
    engine = new ViabilityDecisionEngine();
  });

  // ── evaluate() ────────────────────────────────────────────────────────────

  describe("evaluate()", () => {
    it("returns overallViable=true and score=1.0 when all criteria pass", () => {
      const result = engine.evaluate(viableSystem());

      expect(result.overallViable).toBe(true);
      expect(result.meetsEnergyRequirement).toBe(true);
      expect(result.meetsResourceRequirement).toBe(true);
      expect(result.withinRadiationTolerance).toBe(true);
      expect(result.hasStableOrbit).toBe(true);
      expect(result.viabilityScore).toBe(1.0);
    });

    it("reflects failing energy criterion", () => {
      const result = engine.evaluate(systemWithFailure("energy"));

      expect(result.meetsEnergyRequirement).toBe(false);
      expect(result.overallViable).toBe(false);
      expect(result.viabilityScore).toBeLessThan(1.0);
    });

    it("reflects failing resource criterion", () => {
      const result = engine.evaluate(systemWithFailure("resources"));

      expect(result.meetsResourceRequirement).toBe(false);
      expect(result.overallViable).toBe(false);
    });

    it("reflects failing radiation criterion", () => {
      const result = engine.evaluate(systemWithFailure("radiation"));

      expect(result.withinRadiationTolerance).toBe(false);
      expect(result.overallViable).toBe(false);
    });

    it("reflects failing orbital-stability criterion", () => {
      const result = engine.evaluate(systemWithFailure("orbit"));

      expect(result.hasStableOrbit).toBe(false);
      expect(result.overallViable).toBe(false);
    });

    it("viabilityScore is fractional (0.75) when exactly one criterion fails", () => {
      const result = engine.evaluate(systemWithFailure("energy"));

      expect(result.viabilityScore).toBeCloseTo(0.75);
    });

    it("viabilityScore is 0.0 when no criteria pass (empty, energy-failed, radiation-failed system)", () => {
      const noOrbit = systemWithFailure("orbit");
      const badSystem: SystemMap = {
        ...noOrbit,
        energyBudget: { solarPower_w: 0, meetsMinimumThreshold: false },
        radiationProfile: { ...noOrbit.radiationProfile, withinHardenedTolerance: false },
        resourceInventory: {
          structuralMetals_kg: 0,
          semiconductors_kg: 0,
          organics_kg: 0,
          waterIce_kg: 0,
        },
      };

      const result = engine.evaluate(badSystem);
      expect(result.viabilityScore).toBe(0.0);
      expect(result.overallViable).toBe(false);
    });
  });

  // ── GO decision path ──────────────────────────────────────────────────────

  describe("GO decision path", () => {
    it("selectColonySite() returns a ColonySite (not AbortDecision) for a viable system", () => {
      const result = engine.selectColonySite(viableSystem());

      expect(isColonySite(result)).toBe(true);
      const site = result as ColonySite;
      expect(site.id).toBeTruthy();
      expect(site.orbitalPosition.radius_au).toBeGreaterThan(0);
      expect(site.orbitalPosition.stabilityDuration_Myr).toBeGreaterThanOrEqual(100);
    });

    it("selected site orbital radius is clamped between 0.5 and 4.0 AU", () => {
      const site = engine.selectColonySite(viableSystem()) as ColonySite;

      expect(site.orbitalPosition.radius_au).toBeGreaterThanOrEqual(0.5);
      expect(site.orbitalPosition.radius_au).toBeLessThanOrEqual(4.0);
    });

    it("generateBootstrapPlan() returns a plan with all four energy milestones", () => {
      const site = engine.selectColonySite(viableSystem()) as ColonySite;
      const plan = engine.generateBootstrapPlan(site);

      expect(plan.selectedSite).toEqual(site);
      expect(plan.energyMilestones).toHaveLength(ENERGY_MILESTONES.length);
      expect(plan.energyMilestones.map((m) => m.id)).toEqual(
        ENERGY_MILESTONES.map((m) => m.id),
      );
    });

    it("generateBootstrapPlan() includes manufacturing schedule meeting colony threshold", () => {
      const site = engine.selectColonySite(viableSystem()) as ColonySite;
      const plan = engine.generateBootstrapPlan(site);

      expect(plan.manufacturingSchedule.targetCapacity.throughput_kg_per_year).toBe(
        COLONY_FAB_THRESHOLD.throughput_kg_per_year,
      );
      expect(plan.manufacturingSchedule.cycleCount).toBeGreaterThan(0);
      expect(plan.manufacturingSchedule.estimatedCycleDuration_years).toBeGreaterThan(0);
    });

    it("generateBootstrapPlan() substrate spec meets MIN_CONSCIOUSNESS_SUBSTRATE", () => {
      const site = engine.selectColonySite(viableSystem()) as ColonySite;
      const plan = engine.generateBootstrapPlan(site);

      expect(plan.substrateSpec.compute_ops_per_sec).toBeGreaterThanOrEqual(
        MIN_CONSCIOUSNESS_SUBSTRATE.compute_ops_per_sec,
      );
      expect(plan.substrateSpec.redundancyFactor).toBeGreaterThanOrEqual(
        MIN_CONSCIOUSNESS_SUBSTRATE.redundancyFactor,
      );
      expect(plan.substrateSpec.radiationHardened).toBe(true);
      expect(plan.substrateSpec.selfRepairEnabled).toBe(true);
    });

    it("generateBootstrapPlan() total duration is positive with non-zero uncertainty", () => {
      const site = engine.selectColonySite(viableSystem()) as ColonySite;
      const plan = engine.generateBootstrapPlan(site);

      expect(plan.totalDuration.duration_years).toBeGreaterThan(0);
      expect(plan.totalDuration.uncertainty_years).toBeGreaterThan(0);
      expect(plan.mindSeedActivationTime.duration_years).toBeGreaterThan(0);
      expect(plan.mindSeedActivationTime.duration_years).toBeLessThan(
        plan.totalDuration.duration_years,
      );
    });

    it("reportDecision() for GO records decision type GO with score 1.0", () => {
      const site = engine.selectColonySite(viableSystem()) as ColonySite;
      const plan = engine.generateBootstrapPlan(site);

      const record = engine.reportDecision({
        type: ColonySiteDecisionType.GO,
        site,
        plan,
      });

      expect(record.decision).toBe(ColonySiteDecisionType.GO);
      expect(record.viabilityScore).toBe(1.0);
      expect(record.alternativeRecommendation).toBeNull();
      expect(record.timestamp_ms).toBeGreaterThan(0);
      expect(record.rationale).toContain(site.id);
    });
  });

  // ── DORMANCY decision path ────────────────────────────────────────────────

  describe("DORMANCY decision path", () => {
    it("selectColonySite() returns AbortDecision with retryAfter_years for energy-only failure", () => {
      const result = engine.selectColonySite(systemWithFailure("energy"));

      expect(isColonySite(result)).toBe(false);
      const abort = result as AbortDecision;
      expect(abort.retryAfter_years).toBeDefined();
      expect(abort.retryAfter_years!).toBeGreaterThan(0);
      expect(abort.reason).toMatch(/DORMANCY/);
    });

    it("selectColonySite() returns AbortDecision with retryAfter_years for radiation-only failure", () => {
      const result = engine.selectColonySite(systemWithFailure("radiation"));

      expect(isColonySite(result)).toBe(false);
      const abort = result as AbortDecision;
      expect(abort.retryAfter_years).toBeDefined();
      expect(abort.reason).toMatch(/DORMANCY/);
    });

    it("reportDecision() for DORMANCY records decision type DORMANCY", () => {
      const abort: AbortDecision = {
        reason: "DORMANCY: energy budget below 1 GW threshold.",
        retryAfter_years: 1000,
      };

      const record = engine.reportDecision({
        type: ColonySiteDecisionType.DORMANCY,
        abort,
      });

      expect(record.decision).toBe(ColonySiteDecisionType.DORMANCY);
      expect(record.viabilityScore).toBe(0);
      expect(record.projectedBootstrapDuration.duration_years).toBeGreaterThan(0);
    });

    it("DORMANCY retry interval does not exceed MAX_DORMANCY_YEARS (10 000 yr)", () => {
      const result = engine.selectColonySite(systemWithFailure("energy"));
      const abort = result as AbortDecision;

      // retryAfter_years should be a reasonable dormancy window
      expect(abort.retryAfter_years!).toBeLessThanOrEqual(10_000);
    });
  });

  // ── ABORT decision path ───────────────────────────────────────────────────

  describe("ABORT decision path", () => {
    it("selectColonySite() returns AbortDecision (no retryAfter) for resource failure", () => {
      const result = engine.selectColonySite(systemWithFailure("resources"));

      expect(isColonySite(result)).toBe(false);
      const abort = result as AbortDecision;
      expect(abort.retryAfter_years).toBeUndefined();
      expect(abort.reason).toMatch(/ABORT/);
    });

    it("selectColonySite() returns AbortDecision for orbital-stability failure", () => {
      const result = engine.selectColonySite(systemWithFailure("orbit"));

      expect(isColonySite(result)).toBe(false);
      const abort = result as AbortDecision;
      expect(abort.reason).toMatch(/ABORT/);
    });

    it("selectColonySite() returns AbortDecision for multiple simultaneous failures", () => {
      const multiFailSystem: SystemMap = {
        ...viableSystem(),
        energyBudget: { solarPower_w: 0, meetsMinimumThreshold: false },
        resourceInventory: {
          structuralMetals_kg: 0,
          semiconductors_kg: 0,
          organics_kg: 0,
          waterIce_kg: 0,
        },
      };

      const result = engine.selectColonySite(multiFailSystem);
      expect(isColonySite(result)).toBe(false);
      const abort = result as AbortDecision;
      expect(abort.reason).toMatch(/ABORT/);
    });

    it("ABORT rationale mentions the failing criterion (resource inventory)", () => {
      const result = engine.selectColonySite(systemWithFailure("resources"));
      const abort = result as AbortDecision;

      expect(abort.reason).toMatch(/resource inventory below minimum/i);
    });

    it("reportDecision() for ABORT records zero duration and decision type ABORT", () => {
      const abort: AbortDecision = {
        reason: "ABORT: resource inventory below minimum.",
        alternativeSystem: "Tau Ceti",
      };

      const record = engine.reportDecision({
        type: ColonySiteDecisionType.ABORT,
        abort,
      });

      expect(record.decision).toBe(ColonySiteDecisionType.ABORT);
      expect(record.viabilityScore).toBe(0);
      expect(record.projectedBootstrapDuration.duration_years).toBe(0);
      expect(record.alternativeRecommendation).toBe("Tau Ceti");
    });

    it("ABORT includes alternativeSystem recommendation when system is fundamentally unsuitable", () => {
      const result = engine.selectColonySite(systemWithFailure("orbit"));
      const abort = result as AbortDecision;

      expect(abort.alternativeSystem).toBeDefined();
      expect(abort.alternativeSystem!.length).toBeGreaterThan(0);
    });
  });

  // ── Conservative Advancement Principle ───────────────────────────────────

  describe("Conservative Advancement Principle", () => {
    it("never issues GO for a system that fails any single criterion", () => {
      const failures: Array<"energy" | "resources" | "radiation" | "orbit"> = [
        "energy",
        "resources",
        "radiation",
        "orbit",
      ];

      for (const failure of failures) {
        const result = engine.selectColonySite(systemWithFailure(failure));
        expect(isColonySite(result)).toBe(false);
      }
    });

    it("evaluate() is deterministic: same input always yields the same assessment", () => {
      const system = viableSystem();
      const a = engine.evaluate(system);
      const b = engine.evaluate(system);

      expect(a).toEqual(b);
    });
  });
});
