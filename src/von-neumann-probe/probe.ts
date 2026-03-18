/**
 * Von Neumann Probe — Core Implementation
 *
 * Pure functions implementing probe construction, validation, and
 * decision logic for the subsystems defined in types.ts.
 */

import {
  type ConsciousnessSubstrateSpec,
  type NeuromorphicTile,
  type MassBudget,
  type RadiationHardeningConfig,
  type PropulsionContract,
  REFERENCE_MASS_BUDGET,
  DecelerationMethod,
  DegradationResponse,
} from "./types.js";

// ── Validation Result ───────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ── Consciousness Substrate ─────────────────────────────────────────────────

/** Minimum thresholds from architecture spec §3.2 */
const MIN_COMPUTE_OPS = 1e18;        // 1 exaFLOP
const MIN_WORKING_MEMORY = 1e15;     // 1 PB
const MIN_LONG_TERM_STORAGE = 10e15; // 10 PB
const MAX_POWER_WATTS = 100_000;     // 100 kW

export function createDefaultSubstrateSpec(): ConsciousnessSubstrateSpec {
  return {
    compute_ops_per_sec: 1e18,
    working_memory_bytes: 1e15,
    long_term_storage_bytes: 10e15,
    max_power_watts: 100_000,
  };
}

export function validateSubstrateSpec(spec: ConsciousnessSubstrateSpec): ValidationResult {
  const errors: string[] = [];

  if (spec.compute_ops_per_sec < MIN_COMPUTE_OPS) {
    errors.push(
      `Compute ${spec.compute_ops_per_sec} ops/s below minimum ${MIN_COMPUTE_OPS}`
    );
  }
  if (spec.working_memory_bytes < MIN_WORKING_MEMORY) {
    errors.push(
      `Working memory ${spec.working_memory_bytes} bytes below minimum ${MIN_WORKING_MEMORY}`
    );
  }
  if (spec.long_term_storage_bytes < MIN_LONG_TERM_STORAGE) {
    errors.push(
      `Long-term storage ${spec.long_term_storage_bytes} bytes below minimum ${MIN_LONG_TERM_STORAGE}`
    );
  }
  if (spec.max_power_watts > MAX_POWER_WATTS) {
    errors.push(
      `Power draw ${spec.max_power_watts} W exceeds maximum ${MAX_POWER_WATTS} W`
    );
  }

  return { valid: errors.length === 0, errors };
}

// ── Neuromorphic Tiles ──────────────────────────────────────────────────────

export function createNeuromorphicTiles(
  totalCount: number,
  spareFraction: number
): NeuromorphicTile[] {
  const spareCount = Math.round(totalCount * spareFraction);
  const tiles: NeuromorphicTile[] = [];

  for (let i = 0; i < totalCount; i++) {
    tiles.push({
      tileId: `tile-${i.toString().padStart(4, "0")}`,
      health: 1.0,
      isSpare: i >= totalCount - spareCount,
      utilization: 0.0,
    });
  }

  return tiles;
}

export function computeActiveTileCount(tiles: NeuromorphicTile[]): number {
  return tiles.filter((t) => !t.isSpare && t.health > 0).length;
}

export function computeSpareTileCount(tiles: NeuromorphicTile[]): number {
  return tiles.filter((t) => t.isSpare && t.health > 0).length;
}

/**
 * Compute current aggregate ops/s from active tiles.
 * Each active tile contributes (totalSpecCompute / expectedActiveTiles) * health.
 */
export function computeCurrentCompute(
  tiles: NeuromorphicTile[],
  totalSpecCompute: number,
  expectedActiveTiles: number
): number {
  const perTileCompute = totalSpecCompute / expectedActiveTiles;
  return tiles
    .filter((t) => !t.isSpare && t.health > 0)
    .reduce((sum, t) => sum + t.health * perTileCompute, 0);
}

// ── Mass Budget ─────────────────────────────────────────────────────────────

export function createDefaultMassBudget(): MassBudget {
  return { ...REFERENCE_MASS_BUDGET };
}

export function computeTotalMass(budget: MassBudget): number {
  return (
    budget.consciousnessSubstrate_kg +
    budget.replicationEngine_kg +
    budget.radiationHardening_kg +
    budget.energySubsystem_kg +
    budget.navigationComms_kg +
    budget.propulsionInterface_kg
  );
}

export function validateMassBudget(
  budget: MassBudget,
  maxPayloadMass_kg: number
): ValidationResult {
  const errors: string[] = [];
  const actual = computeTotalMass(budget);

  if (actual > maxPayloadMass_kg) {
    errors.push(
      `Total mass ${actual} kg exceeds max payload ${maxPayloadMass_kg} kg`
    );
  }

  return { valid: errors.length === 0, errors };
}

// ── Radiation Hardening Config ──────────────────────────────────────────────

export function createDefaultRadiationConfig(): RadiationHardeningConfig {
  return {
    shieldThickness_cm: 20,
    shieldingEfficiency: 0.6,
    scrubPassesPerHour: 1,
    hotSpareFraction: 0.3,
    uncorrectableBitFlipTarget: 1e-20,
    tmrEffectiveErrorRate: 1e-30,
  };
}

// ── Propulsion Contract ─────────────────────────────────────────────────────

export function createDefaultPropulsionContract(): PropulsionContract {
  return {
    maxPayloadMass_kg: 10_000,
    maxAcceleration_m_per_s2: 10,
    cruiseVelocity_c: 0.05,
    decelerationMethod: DecelerationMethod.Magsail,
    missionDuration_years: 86, // ~4.3 ly at 0.05c
  };
}

// ── Power Sufficiency ───────────────────────────────────────────────────────

export function isConsciousnessPowerSufficient(
  availablePower_watts: number,
  requiredPower_watts: number
): boolean {
  return availablePower_watts >= requiredPower_watts;
}

// ── Degradation Response ────────────────────────────────────────────────────

/**
 * Determine response to substrate degradation.
 * Severity: 0.0 = nominal, 1.0 = total failure.
 * Thresholds from architecture spec §9.2.
 */
export function determineDegradationResponse(
  severity: number
): DegradationResponse {
  if (severity < 0.5) {
    return DegradationResponse.ReduceFidelity;
  }
  if (severity < 0.8) {
    return DegradationResponse.ActivateSuspendRestore;
  }
  return DegradationResponse.SeedMode;
}
