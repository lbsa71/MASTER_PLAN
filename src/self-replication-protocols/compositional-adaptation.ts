/**
 * Compositional Adaptation Engine
 *
 * Implements the compositional variance adaptation from Architecture Section 6.
 * Handles destination systems with different stellar types (F-M) and planetary
 * mineralogies without compromising replication fidelity.
 *
 * Four-step adaptation pipeline:
 *   1. Gap Analysis — compare available elements against bill-of-materials
 *   2. Substitution Lookup — find viable material substitutes from table
 *   3. Process Adaptation — generate modified refining recipes
 *   4. Blueprint Annotation — record substitutions, recalculate tolerances
 *
 * Fidelity constraint: substitutions may NOT alter computational architecture,
 * consciousness substrate spec, consciousness kernel, or blueprint data format.
 * Substitutions MAY alter structural materials, shielding, thermal management,
 * and propellant chemistry. Max degradation per substitution: 10%.
 */

import type {
  MaterialGapReport,
  MaterialSubstitution,
  MaterialSubstitutionEntry,
  SubstitutionPlan,
  AdaptationEntry,
  StellarTypeAdaptation,
  MaterialClass,
  SpectralClass,
  FeedstockInventory,
} from "./types.js";
import {
  MAX_SUBSTITUTION_DEGRADATION_PERCENT,
  STELLAR_TYPE_ADAPTATIONS,
} from "./types.js";

// ── Material Substitution Table (Architecture §6.3) ─────────────────────────

/**
 * The canonical material substitution table.
 * Maps (required_material, application) -> allowed substitutes with performance impacts.
 */
export const MATERIAL_SUBSTITUTION_TABLE: MaterialSubstitutionEntry[] = [
  {
    requiredMaterial: "tungsten",
    application: "radiation_shielding",
    allowedSubstitute: "molybdenum",
    performanceImpact: "+5% mass",
    maxDegradationPercent: 5,
  },
  {
    requiredMaterial: "tungsten",
    application: "radiation_shielding",
    allowedSubstitute: "lead",
    performanceImpact: "-8% stopping power",
    maxDegradationPercent: 8,
  },
  {
    requiredMaterial: "aluminum",
    application: "structural",
    allowedSubstitute: "magnesium_alloy",
    performanceImpact: "Minor mass trade",
    maxDegradationPercent: 3,
  },
  {
    requiredMaterial: "aluminum",
    application: "structural",
    allowedSubstitute: "titanium",
    performanceImpact: "Minor strength trade",
    maxDegradationPercent: 2,
  },
  {
    requiredMaterial: "aluminum",
    application: "reflective",
    allowedSubstitute: "magnesium_alloy",
    performanceImpact: "Minor reflectivity trade",
    maxDegradationPercent: 4,
  },
  {
    requiredMaterial: "silicon",
    application: "semiconductors",
    allowedSubstitute: "germanium",
    performanceImpact: "Different fab process; equivalent function",
    maxDegradationPercent: 5,
  },
  {
    requiredMaterial: "silicon",
    application: "semiconductors",
    allowedSubstitute: "silicon_carbide",
    performanceImpact: "Different fab process; equivalent function",
    maxDegradationPercent: 3,
  },
  {
    requiredMaterial: "copper",
    application: "thermal_electrical",
    allowedSubstitute: "silver",
    performanceImpact: "Conductivity within 10%",
    maxDegradationPercent: 2,
  },
  {
    requiredMaterial: "copper",
    application: "thermal_electrical",
    allowedSubstitute: "aluminum",
    performanceImpact: "Conductivity within 10%",
    maxDegradationPercent: 8,
  },
  {
    requiredMaterial: "ybco_superconductor",
    application: "magsail",
    allowedSubstitute: "mgb2",
    performanceImpact: "Lower Tc but sufficient at 3K; slightly higher critical current margin needed",
    maxDegradationPercent: 7,
  },
  {
    requiredMaterial: "deuterium",
    application: "nuclear_backup_fuel",
    allowedSubstitute: "helium_3",
    performanceImpact: "Different fusion reaction; comparable Isp",
    maxDegradationPercent: 5,
  },
];

// ── Step 1: Gap Analysis (Architecture §6.2 step 1) ─────────────────────────

export interface GapAnalysisInput {
  /** Bill of materials: required material -> required quantity */
  requiredMaterials: Map<string, number>;
  /** Available materials from system survey: material -> available quantity */
  availableMaterials: Map<string, number>;
}

/**
 * Compare available elements against the probe blueprint bill-of-materials.
 * Categorizes each required material as surplus, sufficient, deficit, or absent.
 */
export function analyzeGaps(input: GapAnalysisInput): MaterialGapReport {
  const surplus: MaterialClass[] = [];
  const sufficient: MaterialClass[] = [];
  const deficit: MaterialClass[] = [];
  const absent: MaterialClass[] = [];

  for (const [material, requiredQty] of input.requiredMaterials) {
    const availableQty = input.availableMaterials.get(material) ?? 0;

    if (availableQty === 0) {
      absent.push(material as MaterialClass);
    } else if (availableQty < requiredQty) {
      deficit.push(material as MaterialClass);
    } else if (availableQty > requiredQty * 1.5) {
      surplus.push(material as MaterialClass);
    } else {
      sufficient.push(material as MaterialClass);
    }
  }

  return { surplus, sufficient, deficit, absent };
}

// ── Step 2: Substitution Lookup (Architecture §6.2 step 2) ──────────────────

/**
 * Look up viable substitutions for deficit or absent materials.
 * Consults the MaterialSubstitutionTable and ensures no single substitution
 * exceeds MAX_SUBSTITUTION_DEGRADATION_PERCENT.
 *
 * Returns a SubstitutionPlan indicating feasibility and required substitutions.
 */
export function lookupSubstitutions(
  gapReport: MaterialGapReport,
  availableMaterials: Map<string, number>,
  table: MaterialSubstitutionEntry[] = MATERIAL_SUBSTITUTION_TABLE,
): SubstitutionPlan {
  const substitutions: MaterialSubstitution[] = [];
  const unresolved: string[] = [];

  const materialsNeedingSubstitution = [
    ...gapReport.deficit,
    ...gapReport.absent,
  ];

  for (const material of materialsNeedingSubstitution) {
    // Find all candidate substitutions for this material
    const candidates = table.filter(
      (entry) => entry.requiredMaterial === material,
    );

    // Pick the first candidate whose substitute is available and within degradation limits
    const viable = candidates.find((candidate) => {
      const substituteAvailable =
        (availableMaterials.get(candidate.allowedSubstitute) ?? 0) > 0;
      const withinDegradation =
        candidate.maxDegradationPercent <= MAX_SUBSTITUTION_DEGRADATION_PERCENT;
      return substituteAvailable && withinDegradation;
    });

    if (viable) {
      substitutions.push({
        originalMaterial: material,
        substituteMaterial: viable.allowedSubstitute,
        application: viable.application,
        performanceDeltaPercent: -viable.maxDegradationPercent,
        reason: `${material} unavailable or insufficient; substituting ${viable.allowedSubstitute}`,
      });
    } else {
      unresolved.push(material);
    }
  }

  const feasible = unresolved.length === 0;
  const infeasibilityReason = feasible
    ? null
    : `No viable substitutions found for: ${unresolved.join(", ")}`;

  return { substitutions, feasible, infeasibilityReason };
}

// ── Step 3: Process Adaptation (Architecture §6.2 step 3) ───────────────────

/**
 * Validate a substitution plan by checking that no individual substitution
 * exceeds the maximum allowed performance degradation.
 *
 * In a full implementation, this would generate modified refining recipes
 * and validate them on a small batch. Here we verify the plan's constraints.
 */
export function validateSubstitutionPlan(plan: SubstitutionPlan): boolean {
  if (!plan.feasible) return false;

  for (const sub of plan.substitutions) {
    if (Math.abs(sub.performanceDeltaPercent) > MAX_SUBSTITUTION_DEGRADATION_PERCENT) {
      return false;
    }
  }

  return true;
}

// ── Step 4: Blueprint Annotation (Architecture §6.2 step 4) ─────────────────

/**
 * Create adaptation log entries from a validated substitution plan.
 * Records each substitution as an auditable adaptation entry.
 */
export function createAdaptationEntries(
  plan: SubstitutionPlan,
  timestampYears: number,
): AdaptationEntry[] {
  return plan.substitutions.map((sub) => ({
    timestampYears,
    category: "material_substitution" as const,
    description: `Substituted ${sub.originalMaterial} with ${sub.substituteMaterial} for ${sub.application}`,
    substitution: sub,
    validated: true,
  }));
}

// ── Stellar Type Adaptation (Architecture §6.4) ─────────────────────────────

/**
 * Get the adaptation configuration for a given stellar spectral class.
 * Returns the matching entry from the stellar type adaptation table,
 * or null if no configuration exists for the given type.
 */
export function getStellarTypeAdaptation(
  spectralClass: SpectralClass,
): StellarTypeAdaptation | null {
  return (
    STELLAR_TYPE_ADAPTATIONS.find(
      (entry) => entry.spectralClass === spectralClass,
    ) ?? null
  );
}

/**
 * Compute the adjusted replication cycle timeline for a given stellar type.
 * Applies the timeline multiplier from the stellar type adaptation table
 * to the baseline cycle duration.
 */
export function computeAdjustedTimeline(
  baselineDurationYears: number,
  spectralClass: SpectralClass,
): number {
  const adaptation = getStellarTypeAdaptation(spectralClass);
  if (!adaptation) return baselineDurationYears;
  return baselineDurationYears * adaptation.timelineMultiplier;
}

// ── Full Adaptation Pipeline (Architecture §6.2) ────────────────────────────

export interface AdaptationPipelineInput {
  /** Required materials from blueprint bill-of-materials */
  requiredMaterials: Map<string, number>;
  /** Available materials from system survey */
  availableMaterials: Map<string, number>;
  /** Stellar spectral class at destination */
  spectralClass: SpectralClass;
  /** Current mission time in years */
  timestampYears: number;
  /** Baseline replication cycle duration in years */
  baselineDurationYears: number;
}

export interface AdaptationPipelineResult {
  /** Gap analysis report */
  gapReport: MaterialGapReport;
  /** Substitution plan */
  substitutionPlan: SubstitutionPlan;
  /** Whether the plan is viable */
  feasible: boolean;
  /** Adaptation log entries */
  adaptationEntries: AdaptationEntry[];
  /** Adjusted cycle duration for this stellar type */
  adjustedDurationYears: number;
  /** Infeasibility reason if not feasible */
  infeasibilityReason: string | null;
}

/**
 * Execute the full four-step compositional adaptation pipeline.
 *
 * 1. Analyze gaps between required and available materials
 * 2. Look up viable substitutions for deficit/absent materials
 * 3. Validate the substitution plan
 * 4. Create adaptation log entries and compute adjusted timeline
 */
export function runAdaptationPipeline(
  input: AdaptationPipelineInput,
): AdaptationPipelineResult {
  // Step 1: Gap Analysis
  const gapReport = analyzeGaps({
    requiredMaterials: input.requiredMaterials,
    availableMaterials: input.availableMaterials,
  });

  // Step 2: Substitution Lookup
  const substitutionPlan = lookupSubstitutions(
    gapReport,
    input.availableMaterials,
  );

  // Step 3: Validate
  const feasible = validateSubstitutionPlan(substitutionPlan);

  // Step 4: Create adaptation entries and compute timeline
  const adaptationEntries = feasible
    ? createAdaptationEntries(substitutionPlan, input.timestampYears)
    : [];

  const adjustedDurationYears = computeAdjustedTimeline(
    input.baselineDurationYears,
    input.spectralClass,
  );

  return {
    gapReport,
    substitutionPlan,
    feasible,
    adaptationEntries,
    adjustedDurationYears,
    infeasibilityReason: substitutionPlan.infeasibilityReason,
  };
}
