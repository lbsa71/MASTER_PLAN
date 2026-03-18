import { describe, it, expect } from "vitest";
import {
  createStellarCharacterization,
  validateStellarCharacterization,
  createSunlikestar,
  createRedDwarfStar,
  createOrangeDwarfStar,
  createCollectorUnit,
  computeTotalCollectorOutput,
  computeEnergyBudget,
  validateEnergyBudget,
  estimateCollectorsForTarget,
  rankBodiesByPriority,
  evaluateSurvey,
  createMiningPlan,
  getDefaultRefiningRecipe,
  computeRefiningOutput,
  checkFeedstockMeetsSpec,
  computeFeedstockInventory,
  computeReplicationReadiness,
  evaluateReplicationReadiness,
  determineBootstrapPhase,
  validateBootstrapTimeline,
  validateSeedPackageFraction,
  adaptRefiningForComposition,
  isEnergySufficient,
} from "../extraction.js";
import {
  type CelestialBody,
  type CompositionAssay,
  type RawMaterialEntry,
  type FeedstockEntry,
  type FeedstockSpec,
  MaterialClass,
  ALL_MATERIAL_CLASSES,
  BootstrapPhase,
  RefiningProcess,
  SEED_PHASE_POWER_WATTS,
  TARGET_FULL_SCALE_POWER_WATTS,
  MIN_RESERVE_MARGIN,
  SEMICONDUCTOR_PURITY,
  MAX_REPLICATION_TIMELINE_YEARS,
} from "../types.js";

// ── Stellar Characterization ────────────────────────────────────────────────

describe("createStellarCharacterization", () => {
  it("creates a valid G2 star (Sun-like)", () => {
    const star = createSunlikestar();
    expect(star.spectralClass).toBe("G");
    expect(star.subType).toBe(2);
    expect(star.luminosity_solar).toBe(1.0);
    expect(star.temperature_K).toBeGreaterThan(5200);
    expect(star.temperature_K).toBeLessThan(6000);
  });

  it("creates a valid M5 red dwarf", () => {
    const star = createRedDwarfStar();
    expect(star.spectralClass).toBe("M");
    expect(star.luminosity_solar).toBeLessThan(0.01);
    expect(star.temperature_K).toBeGreaterThan(2400);
    expect(star.temperature_K).toBeLessThan(3700);
  });

  it("creates a valid K1 orange dwarf", () => {
    const star = createOrangeDwarfStar();
    expect(star.spectralClass).toBe("K");
    expect(star.luminosity_solar).toBeCloseTo(0.5, 1);
  });
});

describe("validateStellarCharacterization", () => {
  it("passes for valid Sun-like star", () => {
    const star = createSunlikestar();
    const result = validateStellarCharacterization(star);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails for out-of-range sub-type", () => {
    const star = createStellarCharacterization("G", 12, 1.0);
    const result = validateStellarCharacterization(star);
    expect(result.valid).toBe(false);
  });

  it("warns for unusual luminosity for spectral class", () => {
    // G-class star with M-class luminosity
    const star = createStellarCharacterization("G", 2, 0.001);
    const result = validateStellarCharacterization(star);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Luminosity");
  });
});

// ── Energy Harvesting ───────────────────────────────────────────────────────

describe("computeTotalCollectorOutput", () => {
  it("sums collector outputs weighted by health", () => {
    const collectors = [
      createCollectorUnit("c1", 1e9, false),
      createCollectorUnit("c2", 1e9, true),
    ];
    collectors[1].health = 0.5;
    expect(computeTotalCollectorOutput(collectors)).toBe(1.5e9);
  });

  it("returns 0 for empty collector array", () => {
    expect(computeTotalCollectorOutput([])).toBe(0);
  });
});

describe("computeEnergyBudget", () => {
  it("allocates power with ≥ 20% reserve", () => {
    const budget = computeEnergyBudget(1e12);
    const allocated =
      budget.miningAllocation_watts +
      budget.refiningAllocation_watts +
      budget.fabricationAllocation_watts +
      budget.computationAllocation_watts;
    const reserve = 1 - allocated / budget.totalOutput_watts;
    expect(reserve).toBeGreaterThanOrEqual(MIN_RESERVE_MARGIN - 0.001);
  });

  it("passes validation", () => {
    const budget = computeEnergyBudget(1e12);
    expect(validateEnergyBudget(budget).valid).toBe(true);
  });
});

describe("estimateCollectorsForTarget", () => {
  it("requires more collectors around dimmer stars", () => {
    const sunlike = createSunlikestar();
    const redDwarf = createRedDwarfStar();
    const outputPerUnit = 1e9;
    const target = 1e12;

    const sunCollectors = estimateCollectorsForTarget(sunlike, target, outputPerUnit);
    const dwarfCollectors = estimateCollectorsForTarget(redDwarf, target, outputPerUnit);

    expect(dwarfCollectors).toBeGreaterThan(sunCollectors);
  });
});

// ── Prospecting and Mining ──────────────────────────────────────────────────

describe("rankBodiesByPriority", () => {
  const bodies: CelestialBody[] = [
    {
      bodyId: "ast-1",
      bodyType: "asteroid",
      mass_kg: 1e12,
      surfaceGravity_m_per_s2: 0.01,
      orbitalDistance_AU: 2.5,
    },
    {
      bodyId: "moon-1",
      bodyType: "moon",
      mass_kg: 1e18,
      surfaceGravity_m_per_s2: 1.2,
      orbitalDistance_AU: 1.0,
    },
  ];

  it("ranks bodies with more required material classes higher", () => {
    const assays = new Map<string, CompositionAssay>();
    assays.set("ast-1", {
      bodyId: "ast-1",
      composition: new Map([
        [MaterialClass.StructuralMetals, 0.4],
        [MaterialClass.Semiconductors, 0.1],
      ]),
      confidence: 0.9,
      method: "spectroscopic",
    });
    assays.set("moon-1", {
      bodyId: "moon-1",
      composition: new Map([[MaterialClass.Volatiles, 0.3]]),
      confidence: 0.9,
      method: "spectroscopic",
    });

    const ranked = rankBodiesByPriority(
      bodies,
      assays,
      [MaterialClass.StructuralMetals, MaterialClass.Semiconductors]
    );

    expect(ranked[0].bodyId).toBe("ast-1");
  });
});

describe("evaluateSurvey", () => {
  it("detects when all material classes are coverable", () => {
    const bodies: CelestialBody[] = [
      { bodyId: "a1", bodyType: "asteroid", mass_kg: 1e12, surfaceGravity_m_per_s2: 0.01, orbitalDistance_AU: 2 },
    ];
    const assays = new Map<string, CompositionAssay>();
    const comp = new Map<MaterialClass, number>();
    for (const cls of ALL_MATERIAL_CLASSES) {
      comp.set(cls, 0.1);
    }
    assays.set("a1", { bodyId: "a1", composition: comp, confidence: 0.9, method: "xrf" });

    const result = evaluateSurvey(bodies, assays, ALL_MATERIAL_CLASSES);
    expect(result.allClassesCoverable).toBe(true);
  });

  it("detects when material classes are missing", () => {
    const bodies: CelestialBody[] = [
      { bodyId: "a1", bodyType: "asteroid", mass_kg: 1e12, surfaceGravity_m_per_s2: 0.01, orbitalDistance_AU: 2 },
    ];
    const assays = new Map<string, CompositionAssay>();
    assays.set("a1", {
      bodyId: "a1",
      composition: new Map([[MaterialClass.StructuralMetals, 0.5]]),
      confidence: 0.9,
      method: "xrf",
    });

    const result = evaluateSurvey(bodies, assays, ALL_MATERIAL_CLASSES);
    expect(result.allClassesCoverable).toBe(false);
  });
});

describe("createMiningPlan", () => {
  it("creates a plan with positive extraction rate and timeline", () => {
    const body: CelestialBody = {
      bodyId: "ast-1",
      bodyType: "asteroid",
      mass_kg: 1e12,
      surfaceGravity_m_per_s2: 0.01,
      orbitalDistance_AU: 2.5,
    };
    const assay: CompositionAssay = {
      bodyId: "ast-1",
      composition: new Map([[MaterialClass.StructuralMetals, 0.3]]),
      confidence: 0.9,
      method: "xrf",
    };

    const plan = createMiningPlan(body, assay, [MaterialClass.StructuralMetals], 10000);
    expect(plan.extractionRate_kg_per_day).toBeGreaterThan(0);
    expect(plan.timeline_days).toBeGreaterThan(0);
    expect(plan.bodyId).toBe("ast-1");
  });
});

// ── Refining ────────────────────────────────────────────────────────────────

describe("getDefaultRefiningRecipe", () => {
  it("provides recipes for all material classes", () => {
    for (const cls of ALL_MATERIAL_CLASSES) {
      const recipe = getDefaultRefiningRecipe(cls);
      expect(recipe.materialClass).toBe(cls);
      expect(recipe.processes.length).toBeGreaterThan(0);
      expect(recipe.outputPurity).toBeGreaterThan(0);
      expect(recipe.yieldFraction).toBeGreaterThan(0);
      expect(recipe.yieldFraction).toBeLessThanOrEqual(1);
    }
  });

  it("achieves semiconductor-grade purity for semiconductors", () => {
    const recipe = getDefaultRefiningRecipe(MaterialClass.Semiconductors);
    expect(recipe.outputPurity).toBeGreaterThanOrEqual(SEMICONDUCTOR_PURITY);
  });
});

describe("computeRefiningOutput", () => {
  it("applies yield fraction to raw material mass", () => {
    const raw: RawMaterialEntry = {
      materialClass: MaterialClass.StructuralMetals,
      mass_kg: 1000,
      sourceBodyId: "ast-1",
      rawPurity: 0.5,
    };
    const recipe = getDefaultRefiningRecipe(MaterialClass.StructuralMetals);
    const output = computeRefiningOutput(raw, recipe);
    expect(output.mass_kg).toBeCloseTo(1000 * recipe.yieldFraction);
    expect(output.purity).toBe(recipe.outputPurity);
  });
});

describe("checkFeedstockMeetsSpec", () => {
  it("returns true when mass and purity meet requirements", () => {
    const entry: FeedstockEntry = {
      materialClass: MaterialClass.StructuralMetals,
      mass_kg: 5000,
      purity: 0.999,
      meetsSpec: true,
    };
    const req = { materialClass: MaterialClass.StructuralMetals, mass_kg: 3000, purityRequired: 0.99 };
    expect(checkFeedstockMeetsSpec(entry, req)).toBe(true);
  });

  it("returns false when purity is insufficient", () => {
    const entry: FeedstockEntry = {
      materialClass: MaterialClass.Semiconductors,
      mass_kg: 5000,
      purity: 0.99,
      meetsSpec: false,
    };
    const req = { materialClass: MaterialClass.Semiconductors, mass_kg: 100, purityRequired: SEMICONDUCTOR_PURITY };
    expect(checkFeedstockMeetsSpec(entry, req)).toBe(false);
  });
});

// ── Replication Readiness ───────────────────────────────────────────────────

describe("computeReplicationReadiness", () => {
  it("returns 1.0 when all classes are fully stocked", () => {
    const completionByClass = new Map<MaterialClass, number>();
    for (const cls of ALL_MATERIAL_CLASSES) {
      completionByClass.set(cls, 1.0);
    }
    const inventory = { entries: [], completionByClass };
    expect(computeReplicationReadiness(inventory)).toBe(1.0);
  });

  it("returns 0 for empty inventory", () => {
    const inventory = { entries: [], completionByClass: new Map() };
    expect(computeReplicationReadiness(inventory)).toBe(0);
  });

  it("returns average completion across classes", () => {
    const completionByClass = new Map<MaterialClass, number>();
    completionByClass.set(MaterialClass.StructuralMetals, 1.0);
    completionByClass.set(MaterialClass.Semiconductors, 0.5);
    const inventory = { entries: [], completionByClass };
    expect(computeReplicationReadiness(inventory)).toBeCloseTo(0.75);
  });
});

describe("evaluateReplicationReadiness", () => {
  it("signals ready when all spec requirements met", () => {
    const spec: FeedstockSpec = [
      { materialClass: MaterialClass.StructuralMetals, mass_kg: 1000, purityRequired: 0.99 },
      { materialClass: MaterialClass.Semiconductors, mass_kg: 100, purityRequired: 0.999 },
    ];
    const entries: FeedstockEntry[] = [
      { materialClass: MaterialClass.StructuralMetals, mass_kg: 1500, purity: 0.999, meetsSpec: true },
      { materialClass: MaterialClass.Semiconductors, mass_kg: 200, purity: 0.9999, meetsSpec: true },
    ];
    const inventory = computeFeedstockInventory(entries, spec);
    const signal = evaluateReplicationReadiness(inventory, spec, 25);
    expect(signal.ready).toBe(true);
    expect(signal.totalFeedstockMass_kg).toBe(1700);
  });

  it("signals not ready when material is insufficient", () => {
    const spec: FeedstockSpec = [
      { materialClass: MaterialClass.StructuralMetals, mass_kg: 1000, purityRequired: 0.99 },
    ];
    const entries: FeedstockEntry[] = [
      { materialClass: MaterialClass.StructuralMetals, mass_kg: 500, purity: 0.999, meetsSpec: true },
    ];
    const inventory = computeFeedstockInventory(entries, spec);
    const signal = evaluateReplicationReadiness(inventory, spec, 15);
    expect(signal.ready).toBe(false);
  });
});

// ── Bootstrap Sequence ──────────────────────────────────────────────────────

describe("determineBootstrapPhase", () => {
  it("starts in Arrival phase", () => {
    expect(determineBootstrapPhase(0, 0, 0, 0)).toBe(BootstrapPhase.Arrival);
  });

  it("advances to SeedEnergy when collectors online", () => {
    expect(determineBootstrapPhase(0.5, 1, 0, 0)).toBe(BootstrapPhase.SeedEnergy);
  });

  it("advances to SeedMining when mining begins", () => {
    expect(determineBootstrapPhase(1, 1, 1, 0)).toBe(BootstrapPhase.SeedMining);
  });

  it("advances to FirstExpansion after year 3 with multiple collectors", () => {
    expect(determineBootstrapPhase(5, 5, 2, 0)).toBe(BootstrapPhase.FirstExpansion);
  });

  it("advances to FullScaleOperations after year 10", () => {
    expect(determineBootstrapPhase(12, 50, 10, 0.5)).toBe(BootstrapPhase.FullScaleOperations);
  });

  it("reaches ReplicationReady when readiness is 1.0", () => {
    expect(determineBootstrapPhase(25, 100, 20, 1.0)).toBe(BootstrapPhase.ReplicationReady);
  });
});

describe("validateBootstrapTimeline", () => {
  it("passes when replication ready within timeline", () => {
    const result = validateBootstrapTimeline(30, BootstrapPhase.ReplicationReady);
    expect(result.valid).toBe(true);
  });

  it("fails when timeline exceeded without replication readiness", () => {
    const result = validateBootstrapTimeline(55, BootstrapPhase.FullScaleOperations);
    expect(result.valid).toBe(false);
  });
});

// ── Seed Package ────────────────────────────────────────────────────────────

describe("validateSeedPackageFraction", () => {
  it("passes when seed is ≤ 5% of final infrastructure", () => {
    const result = validateSeedPackageFraction(500, 100000);
    expect(result.valid).toBe(true);
  });

  it("fails when seed exceeds 5%", () => {
    const result = validateSeedPackageFraction(10000, 100000);
    expect(result.valid).toBe(false);
  });
});

// ── Compositional Adaptation ────────────────────────────────────────────────

describe("adaptRefiningForComposition", () => {
  it("degrades purity when some processes unavailable", () => {
    const result = adaptRefiningForComposition(
      MaterialClass.Semiconductors,
      [RefiningProcess.CzochralskiGrowth], // missing 2 of 3 processes
      SEMICONDUCTOR_PURITY
    );
    expect(result.recipe.outputPurity).toBeLessThan(SEMICONDUCTOR_PURITY);
    expect(result.adaptation.category).toBe("refining_recipe");
    expect(result.adaptation.validated).toBe(false);
  });

  it("preserves full purity when all processes available", () => {
    const defaultRecipe = getDefaultRefiningRecipe(MaterialClass.StructuralMetals);
    const result = adaptRefiningForComposition(
      MaterialClass.StructuralMetals,
      defaultRecipe.processes,
      0.999
    );
    expect(result.recipe.outputPurity).toBeCloseTo(defaultRecipe.outputPurity);
  });
});

// ── Energy Sufficiency ──────────────────────────────────────────────────────

describe("isEnergySufficient", () => {
  it("returns true when power exceeds refining needs", () => {
    const spec: FeedstockSpec = [
      { materialClass: MaterialClass.StructuralMetals, mass_kg: 1000, purityRequired: 0.99 },
    ];
    const recipes = new Map([[
      MaterialClass.StructuralMetals,
      getDefaultRefiningRecipe(MaterialClass.StructuralMetals),
    ]]);
    // Very high power should be sufficient
    expect(isEnergySufficient(1e15, spec, recipes)).toBe(true);
  });

  it("returns false when power is too low for required throughput", () => {
    const spec: FeedstockSpec = [
      { materialClass: MaterialClass.Semiconductors, mass_kg: 1e6, purityRequired: SEMICONDUCTOR_PURITY },
    ];
    const recipes = new Map([[
      MaterialClass.Semiconductors,
      getDefaultRefiningRecipe(MaterialClass.Semiconductors),
    ]]);
    // Very low power
    expect(isEnergySufficient(1, spec, recipes)).toBe(false);
  });
});
