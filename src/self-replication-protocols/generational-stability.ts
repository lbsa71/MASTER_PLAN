/**
 * Generational Stability Protocol
 *
 * Implements drift detection and prevention from Architecture Section 7.
 * Ensures the replication protocol does not degrade across arbitrary generations.
 *
 * Key mechanisms:
 *   - DriftReport computation with threshold-based assessment (NOMINAL/WARNING/HALT)
 *   - GenerationRecord creation for immutable audit trail
 *   - Lineage integrity verification (blueprint version consistency, generation ordering)
 *   - Multi-generation stability simulation using sqrt(N) tolerance accumulation model
 *
 * Drift thresholds (Architecture §7.2):
 *   Structural: >1% WARNING, >5% HALT
 *   Compute: >2% WARNING, >10% HALT
 *   Consciousness: >1% HALT (non-negotiable)
 *   Blueprint integrity: "degraded" → HALT, "repaired" → WARNING
 */

import type {
  DriftReport,
  GenerationRecord,
  ConsciousnessMetrics,
  VerificationGateResult,
  MaterialSubstitution,
  SpectralClass,
} from "./types.js";
import {
  DriftAssessment,
  DRIFT_THRESHOLDS,
} from "./types.js";

// ── Drift Assessment (Architecture §7.2) ─────────────────────────────────────

/**
 * Evaluate drift thresholds and return the highest-severity assessment.
 *
 * Per Architecture §7.2:
 *   structural_drift > 1%: WARNING; > 5%: HALT
 *   compute_drift > 2%: WARNING; > 10%: HALT
 *   consciousness_drift >= 1%: HALT (non-negotiable)
 *   blueprint "degraded": HALT; "repaired": WARNING
 */
export function assessDrift(
  structuralDriftPercent: number,
  computeDriftPercent: number,
  consciousnessPhiDelta: number,
  blueprintIntegrity: "verified" | "repaired" | "degraded",
): DriftAssessment {
  // Check HALT conditions first (highest severity)
  if (structuralDriftPercent > DRIFT_THRESHOLDS.structural.halt) {
    return DriftAssessment.Halt;
  }
  if (computeDriftPercent > DRIFT_THRESHOLDS.compute.halt) {
    return DriftAssessment.Halt;
  }
  if (consciousnessPhiDelta >= DRIFT_THRESHOLDS.consciousness.halt) {
    return DriftAssessment.Halt;
  }
  if (blueprintIntegrity === "degraded") {
    return DriftAssessment.Halt;
  }

  // Check WARNING conditions
  if (structuralDriftPercent >= DRIFT_THRESHOLDS.structural.warning) {
    return DriftAssessment.Warning;
  }
  if (computeDriftPercent >= DRIFT_THRESHOLDS.compute.warning) {
    return DriftAssessment.Warning;
  }
  if (blueprintIntegrity === "repaired") {
    return DriftAssessment.Warning;
  }

  return DriftAssessment.Nominal;
}

// ── DriftReport Computation ──────────────────────────────────────────────────

export interface DriftReportInput {
  generationNumber: number;
  structuralDriftPercent: number;
  computeDriftPercent: number;
  consciousnessPhiDelta: number;
  blueprintIntegrity: "verified" | "repaired" | "degraded";
  cumulativeSubstitutions: number;
}

/**
 * Compute a DriftReport with automatic threshold assessment.
 * Each generation's drift is measured against the absolute Gen 0 standard,
 * not relative to the parent — preventing inheritance of drift.
 */
export function computeDriftReport(input: DriftReportInput): DriftReport {
  const assessment = assessDrift(
    input.structuralDriftPercent,
    input.computeDriftPercent,
    input.consciousnessPhiDelta,
    input.blueprintIntegrity,
  );

  return {
    generationNumber: input.generationNumber,
    structuralDriftPercent: input.structuralDriftPercent,
    computeDriftPercent: input.computeDriftPercent,
    consciousnessPhiDelta: input.consciousnessPhiDelta,
    blueprintIntegrity: input.blueprintIntegrity,
    cumulativeSubstitutions: input.cumulativeSubstitutions,
    assessment,
  };
}

// ── GenerationRecord Creation ────────────────────────────────────────────────

export interface GenerationRecordInput {
  generationNumber: number;
  probeId: string;
  parentProbeId: string;
  parentGenerationHash: string;
  blueprintVersion: string;
  blueprintHash: string;
  destinationSystem: string;
  stellarType: SpectralClass;
  substitutionsApplied: MaterialSubstitution[];
  cycleDurationYears: number;
  verificationGateResult: VerificationGateResult;
  consciousnessMetrics: ConsciousnessMetrics;
  driftReport: DriftReport;
  launchTimestampYears: number;
  targetSystem: string;
  notes: string;
}

/**
 * Create an immutable GenerationRecord for the audit trail.
 *
 * Per Architecture §7.2, every generation record includes:
 *   - generation number, probe IDs, parent hash chain
 *   - blueprint version (must match across all generations)
 *   - substitutions applied, verification results, consciousness metrics
 *   - cumulative drift report, launch timestamp
 */
export function createGenerationRecord(input: GenerationRecordInput): GenerationRecord {
  return {
    generationNumber: input.generationNumber,
    probeId: input.probeId,
    parentProbeId: input.parentProbeId,
    parentGenerationHash: input.parentGenerationHash,
    blueprintVersion: input.blueprintVersion,
    blueprintHash: input.blueprintHash,
    destinationSystem: input.destinationSystem,
    stellarType: input.stellarType,
    substitutionsApplied: [...input.substitutionsApplied],
    cycleDurationYears: input.cycleDurationYears,
    verificationGateResult: input.verificationGateResult,
    consciousnessMetrics: { ...input.consciousnessMetrics },
    driftReport: { ...input.driftReport },
    launchTimestampYears: input.launchTimestampYears,
    targetSystem: input.targetSystem,
    notes: input.notes,
  };
}

// ── Lineage Integrity Verification ───────────────────────────────────────────

export interface LineageVerificationResult {
  /** Whether the full lineage is valid */
  valid: boolean;
  /** Number of generations checked */
  generationsChecked: number;
  /** Errors found (empty if valid) */
  errors: string[];
}

/**
 * Verify the integrity of a generation lineage.
 *
 * Checks:
 *   1. Non-empty lineage
 *   2. Generation numbers are sequential (0, 1, 2, ...)
 *   3. Blueprint version is consistent across all generations
 *   4. Each child's parentProbeId matches the previous generation's probeId
 */
export function verifyLineageIntegrity(
  lineage: GenerationRecord[],
): LineageVerificationResult {
  const errors: string[] = [];

  if (lineage.length === 0) {
    return { valid: false, generationsChecked: 0, errors: ["Empty lineage"] };
  }

  const baseVersion = lineage[0].blueprintVersion;

  for (let i = 0; i < lineage.length; i++) {
    const record = lineage[i];

    // Check generation number ordering
    if (record.generationNumber !== i) {
      errors.push(
        `Generation ${i}: expected generation_number ${i}, got ${record.generationNumber}`,
      );
    }

    // Check blueprint version consistency
    if (record.blueprintVersion !== baseVersion) {
      errors.push(
        `Generation ${i}: blueprint version mismatch — expected "${baseVersion}", got "${record.blueprintVersion}"`,
      );
    }

    // Check parent linkage (skip gen 0)
    if (i > 0) {
      const parent = lineage[i - 1];
      if (record.parentProbeId !== parent.probeId) {
        errors.push(
          `Generation ${i}: parentProbeId "${record.parentProbeId}" does not match parent's probeId "${parent.probeId}"`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    generationsChecked: lineage.length,
    errors,
  };
}

// ── Multi-Generation Stability Simulation (Architecture §7.3) ────────────────

export interface StabilitySimulationInput {
  /** Number of generations to simulate */
  generations: number;
  /** Base structural drift per generation (accumulates as sqrt(N)) */
  baseStructuralDrift: number;
  /** Base compute drift per generation (accumulates as sqrt(N)) */
  baseComputeDrift: number;
  /** Base Phi delta per generation (accumulates as sqrt(N)) */
  basePhiDelta: number;
  /** Blueprint integrity assumption for all generations */
  blueprintIntegrity: "verified" | "repaired" | "degraded";
  /** Number of material substitutions per generation */
  substitutionsPerGeneration: number;
}

export interface StabilitySimulationResult {
  /** Number of generations actually simulated */
  generationsSimulated: number;
  /** Whether the protocol remained stable across all generations */
  stable: boolean;
  /** Final drift assessment */
  finalAssessment: DriftAssessment;
  /** Per-generation drift reports */
  driftReports: DriftReport[];
  /** Generation at which HALT was triggered (undefined if stable) */
  haltedAtGeneration?: number;
}

/**
 * Simulate generational stability across N generations.
 *
 * Manufacturing tolerance accumulation model (Architecture §7.1):
 *   Standard deviation grows as sqrt(N) over N generations.
 *   Each generation is independently verified against Gen 0 original spec.
 *
 * The simulation runs until all generations complete or a HALT is triggered.
 */
export function simulateGenerationalStability(
  input: StabilitySimulationInput,
): StabilitySimulationResult {
  const driftReports: DriftReport[] = [];
  let haltedAtGeneration: number | undefined;

  for (let gen = 1; gen <= input.generations; gen++) {
    // Tolerance accumulation: sqrt(N) model
    const sqrtGen = Math.sqrt(gen);

    const structuralDrift = sqrtGen * input.baseStructuralDrift;
    const computeDrift = sqrtGen * input.baseComputeDrift;
    const phiDelta = sqrtGen * input.basePhiDelta;
    const cumulativeSubs = gen * input.substitutionsPerGeneration;

    const report = computeDriftReport({
      generationNumber: gen,
      structuralDriftPercent: structuralDrift,
      computeDriftPercent: computeDrift,
      consciousnessPhiDelta: phiDelta,
      blueprintIntegrity: input.blueprintIntegrity,
      cumulativeSubstitutions: cumulativeSubs,
    });

    driftReports.push(report);

    if (report.assessment === DriftAssessment.Halt) {
      haltedAtGeneration = gen;
      break;
    }
  }

  const lastReport = driftReports[driftReports.length - 1];
  const stable = haltedAtGeneration === undefined;

  return {
    generationsSimulated: driftReports.length,
    stable,
    finalAssessment: lastReport.assessment,
    driftReports,
    haltedAtGeneration,
  };
}
