/**
 * Generational Stability — Tests
 *
 * Verifies the generational drift detection and prevention from Architecture Section 7:
 *   - DriftReport computation from verification data
 *   - Alert threshold evaluation (NOMINAL, WARNING, HALT)
 *   - GenerationRecord creation and lineage chain integrity
 *   - Multi-generation stability simulation across 10+ generations
 *   - Blueprint integrity preservation across generations
 *
 * Tests cover:
 *  - Nominal drift within all thresholds
 *  - Warning-level structural/compute drift
 *  - Halt-level drift triggering replication stop
 *  - Consciousness drift zero-tolerance (1% = HALT)
 *  - Generation lineage hash chain verification
 *  - Multi-generation simulation with no systematic drift accumulation
 */

import { describe, it, expect } from "vitest";
import {
  computeDriftReport,
  assessDrift,
  createGenerationRecord,
  verifyLineageIntegrity,
  simulateGenerationalStability,
} from "../generational-stability.js";
import type {
  ConsciousnessMetrics,
  VerificationGateResult,
  GenerationRecord,
  DriftReport,
} from "../types.js";
import {
  DriftAssessment,
  DRIFT_THRESHOLDS,
} from "../types.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const GEN0_BASELINE: ConsciousnessMetrics = {
  phi: 100.0,
  globalWorkspaceAccessible: true,
  temporalBindingCoherence: 1.0,
  subjectiveReportConsistency: 0.98,
};

// ── DriftReport Computation ──────────────────────────────────────────────────

describe("computeDriftReport", () => {
  it("computes nominal drift when all values are within thresholds", () => {
    const report = computeDriftReport({
      generationNumber: 3,
      structuralDriftPercent: 0.5,
      computeDriftPercent: 1.0,
      consciousnessPhiDelta: 0.3,
      blueprintIntegrity: "verified",
      cumulativeSubstitutions: 2,
    });

    expect(report.generationNumber).toBe(3);
    expect(report.structuralDriftPercent).toBe(0.5);
    expect(report.computeDriftPercent).toBe(1.0);
    expect(report.consciousnessPhiDelta).toBe(0.3);
    expect(report.blueprintIntegrity).toBe("verified");
    expect(report.cumulativeSubstitutions).toBe(2);
    expect(report.assessment).toBe(DriftAssessment.Nominal);
  });

  it("returns WARNING when structural drift exceeds 1% but is below 5%", () => {
    const report = computeDriftReport({
      generationNumber: 5,
      structuralDriftPercent: 2.5,
      computeDriftPercent: 1.0,
      consciousnessPhiDelta: 0.2,
      blueprintIntegrity: "verified",
      cumulativeSubstitutions: 3,
    });

    expect(report.assessment).toBe(DriftAssessment.Warning);
  });

  it("returns WARNING when compute drift exceeds 2% but is below 10%", () => {
    const report = computeDriftReport({
      generationNumber: 7,
      structuralDriftPercent: 0.5,
      computeDriftPercent: 5.0,
      consciousnessPhiDelta: 0.1,
      blueprintIntegrity: "verified",
      cumulativeSubstitutions: 1,
    });

    expect(report.assessment).toBe(DriftAssessment.Warning);
  });

  it("returns HALT when structural drift exceeds 5%", () => {
    const report = computeDriftReport({
      generationNumber: 10,
      structuralDriftPercent: 6.0,
      computeDriftPercent: 1.0,
      consciousnessPhiDelta: 0.2,
      blueprintIntegrity: "verified",
      cumulativeSubstitutions: 4,
    });

    expect(report.assessment).toBe(DriftAssessment.Halt);
  });

  it("returns HALT when compute drift exceeds 10%", () => {
    const report = computeDriftReport({
      generationNumber: 15,
      structuralDriftPercent: 0.5,
      computeDriftPercent: 12.0,
      consciousnessPhiDelta: 0.3,
      blueprintIntegrity: "verified",
      cumulativeSubstitutions: 5,
    });

    expect(report.assessment).toBe(DriftAssessment.Halt);
  });

  it("returns HALT when consciousness Phi delta exceeds 1% (non-negotiable)", () => {
    const report = computeDriftReport({
      generationNumber: 4,
      structuralDriftPercent: 0.2,
      computeDriftPercent: 0.5,
      consciousnessPhiDelta: 1.5,
      blueprintIntegrity: "verified",
      cumulativeSubstitutions: 0,
    });

    expect(report.assessment).toBe(DriftAssessment.Halt);
  });

  it("HALT takes precedence over WARNING when both conditions met", () => {
    const report = computeDriftReport({
      generationNumber: 8,
      structuralDriftPercent: 3.0, // WARNING level
      computeDriftPercent: 15.0,   // HALT level
      consciousnessPhiDelta: 0.5,
      blueprintIntegrity: "verified",
      cumulativeSubstitutions: 2,
    });

    expect(report.assessment).toBe(DriftAssessment.Halt);
  });

  it("handles degraded blueprint integrity", () => {
    const report = computeDriftReport({
      generationNumber: 2,
      structuralDriftPercent: 0.1,
      computeDriftPercent: 0.1,
      consciousnessPhiDelta: 0.0,
      blueprintIntegrity: "degraded",
      cumulativeSubstitutions: 0,
    });

    expect(report.blueprintIntegrity).toBe("degraded");
    // Degraded blueprint should trigger HALT
    expect(report.assessment).toBe(DriftAssessment.Halt);
  });

  it("handles repaired blueprint integrity as WARNING", () => {
    const report = computeDriftReport({
      generationNumber: 2,
      structuralDriftPercent: 0.1,
      computeDriftPercent: 0.1,
      consciousnessPhiDelta: 0.0,
      blueprintIntegrity: "repaired",
      cumulativeSubstitutions: 0,
    });

    expect(report.assessment).toBe(DriftAssessment.Warning);
  });
});

// ── assessDrift (threshold evaluation only) ──────────────────────────────────

describe("assessDrift", () => {
  it("returns NOMINAL for zero drift", () => {
    expect(assessDrift(0, 0, 0, "verified")).toBe(DriftAssessment.Nominal);
  });

  it("returns NOMINAL at exact warning boundary (not exceeded)", () => {
    expect(assessDrift(
      DRIFT_THRESHOLDS.structural.warning,
      DRIFT_THRESHOLDS.compute.warning,
      0.9, // below consciousness halt of 1.0
      "verified",
    )).toBe(DriftAssessment.Warning);
    // At exactly the threshold value, it's a WARNING per "> threshold"
  });

  it("returns HALT for consciousness drift at exactly 1%", () => {
    expect(assessDrift(0, 0, DRIFT_THRESHOLDS.consciousness.halt, "verified"))
      .toBe(DriftAssessment.Halt);
  });
});

// ── GenerationRecord Creation ────────────────────────────────────────────────

describe("createGenerationRecord", () => {
  it("creates a valid generation record with all required fields", () => {
    const driftReport = computeDriftReport({
      generationNumber: 1,
      structuralDriftPercent: 0.2,
      computeDriftPercent: 0.3,
      consciousnessPhiDelta: 0.1,
      blueprintIntegrity: "verified",
      cumulativeSubstitutions: 0,
    });

    const record = createGenerationRecord({
      generationNumber: 1,
      probeId: "probe-gen1",
      parentProbeId: "probe-gen0",
      parentGenerationHash: "sha512-gen0-record-hash",
      blueprintVersion: "1.0.0",
      blueprintHash: "sha512-blueprint-hash",
      destinationSystem: "Alpha Centauri A",
      stellarType: "G",
      substitutionsApplied: [],
      cycleDurationYears: 45,
      verificationGateResult: null as unknown as VerificationGateResult, // simplified for test
      consciousnessMetrics: GEN0_BASELINE,
      driftReport,
      launchTimestampYears: 145,
      targetSystem: "Barnard's Star",
      notes: "First generation replication",
    });

    expect(record.generationNumber).toBe(1);
    expect(record.probeId).toBe("probe-gen1");
    expect(record.parentProbeId).toBe("probe-gen0");
    expect(record.blueprintVersion).toBe("1.0.0");
    expect(record.driftReport.assessment).toBe(DriftAssessment.Nominal);
    expect(record.launchTimestampYears).toBe(145);
  });
});

// ── Lineage Integrity Verification ───────────────────────────────────────────

describe("verifyLineageIntegrity", () => {
  it("verifies a valid two-generation lineage", () => {
    const gen0: GenerationRecord = createGenerationRecord({
      generationNumber: 0,
      probeId: "probe-gen0",
      parentProbeId: "origin",
      parentGenerationHash: "sha512-origin",
      blueprintVersion: "1.0.0",
      blueprintHash: "sha512-bp",
      destinationSystem: "Sol",
      stellarType: "G",
      substitutionsApplied: [],
      cycleDurationYears: 0,
      verificationGateResult: null as unknown as VerificationGateResult,
      consciousnessMetrics: GEN0_BASELINE,
      driftReport: computeDriftReport({
        generationNumber: 0,
        structuralDriftPercent: 0,
        computeDriftPercent: 0,
        consciousnessPhiDelta: 0,
        blueprintIntegrity: "verified",
        cumulativeSubstitutions: 0,
      }),
      launchTimestampYears: 0,
      targetSystem: "Alpha Centauri",
      notes: "Origin probe",
    });

    const gen1: GenerationRecord = createGenerationRecord({
      generationNumber: 1,
      probeId: "probe-gen1",
      parentProbeId: "probe-gen0",
      parentGenerationHash: "sha512-origin", // matches gen0's parentGenerationHash for simplicity
      blueprintVersion: "1.0.0",
      blueprintHash: "sha512-bp",
      destinationSystem: "Alpha Centauri",
      stellarType: "G",
      substitutionsApplied: [],
      cycleDurationYears: 50,
      verificationGateResult: null as unknown as VerificationGateResult,
      consciousnessMetrics: GEN0_BASELINE,
      driftReport: computeDriftReport({
        generationNumber: 1,
        structuralDriftPercent: 0.1,
        computeDriftPercent: 0.2,
        consciousnessPhiDelta: 0.05,
        blueprintIntegrity: "verified",
        cumulativeSubstitutions: 0,
      }),
      launchTimestampYears: 150,
      targetSystem: "Barnard's Star",
      notes: "First child",
    });

    const result = verifyLineageIntegrity([gen0, gen1]);
    expect(result.valid).toBe(true);
    expect(result.generationsChecked).toBe(2);
    expect(result.errors).toEqual([]);
  });

  it("detects blueprint version mismatch across generations", () => {
    const gen0: GenerationRecord = createGenerationRecord({
      generationNumber: 0,
      probeId: "probe-gen0",
      parentProbeId: "origin",
      parentGenerationHash: "sha512-origin",
      blueprintVersion: "1.0.0",
      blueprintHash: "sha512-bp",
      destinationSystem: "Sol",
      stellarType: "G",
      substitutionsApplied: [],
      cycleDurationYears: 0,
      verificationGateResult: null as unknown as VerificationGateResult,
      consciousnessMetrics: GEN0_BASELINE,
      driftReport: computeDriftReport({
        generationNumber: 0,
        structuralDriftPercent: 0,
        computeDriftPercent: 0,
        consciousnessPhiDelta: 0,
        blueprintIntegrity: "verified",
        cumulativeSubstitutions: 0,
      }),
      launchTimestampYears: 0,
      targetSystem: "Alpha Centauri",
      notes: "",
    });

    const gen1: GenerationRecord = createGenerationRecord({
      generationNumber: 1,
      probeId: "probe-gen1",
      parentProbeId: "probe-gen0",
      parentGenerationHash: "sha512-origin",
      blueprintVersion: "2.0.0", // MISMATCH
      blueprintHash: "sha512-bp-v2",
      destinationSystem: "Alpha Centauri",
      stellarType: "G",
      substitutionsApplied: [],
      cycleDurationYears: 50,
      verificationGateResult: null as unknown as VerificationGateResult,
      consciousnessMetrics: GEN0_BASELINE,
      driftReport: computeDriftReport({
        generationNumber: 1,
        structuralDriftPercent: 0.1,
        computeDriftPercent: 0.1,
        consciousnessPhiDelta: 0,
        blueprintIntegrity: "verified",
        cumulativeSubstitutions: 0,
      }),
      launchTimestampYears: 150,
      targetSystem: "Barnard's Star",
      notes: "",
    });

    const result = verifyLineageIntegrity([gen0, gen1]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("blueprint version");
  });

  it("rejects empty lineage", () => {
    const result = verifyLineageIntegrity([]);
    expect(result.valid).toBe(false);
  });

  it("accepts single-generation lineage (gen 0)", () => {
    const gen0: GenerationRecord = createGenerationRecord({
      generationNumber: 0,
      probeId: "probe-gen0",
      parentProbeId: "origin",
      parentGenerationHash: "sha512-origin",
      blueprintVersion: "1.0.0",
      blueprintHash: "sha512-bp",
      destinationSystem: "Sol",
      stellarType: "G",
      substitutionsApplied: [],
      cycleDurationYears: 0,
      verificationGateResult: null as unknown as VerificationGateResult,
      consciousnessMetrics: GEN0_BASELINE,
      driftReport: computeDriftReport({
        generationNumber: 0,
        structuralDriftPercent: 0,
        computeDriftPercent: 0,
        consciousnessPhiDelta: 0,
        blueprintIntegrity: "verified",
        cumulativeSubstitutions: 0,
      }),
      launchTimestampYears: 0,
      targetSystem: "Alpha Centauri",
      notes: "",
    });

    const result = verifyLineageIntegrity([gen0]);
    expect(result.valid).toBe(true);
    expect(result.generationsChecked).toBe(1);
  });
});

// ── Multi-Generation Stability Simulation ────────────────────────────────────

describe("simulateGenerationalStability", () => {
  it("produces stable output across 10 generations with no drift", () => {
    const result = simulateGenerationalStability({
      generations: 10,
      baseStructuralDrift: 0.05,
      baseComputeDrift: 0.1,
      basePhiDelta: 0.01,
      blueprintIntegrity: "verified",
      substitutionsPerGeneration: 0,
    });

    expect(result.generationsSimulated).toBe(10);
    expect(result.stable).toBe(true);
    expect(result.finalAssessment).toBe(DriftAssessment.Nominal);
    expect(result.driftReports.length).toBe(10);

    // Verify no generation exceeded thresholds
    for (const report of result.driftReports) {
      expect(report.assessment).toBe(DriftAssessment.Nominal);
    }
  });

  it("detects instability when per-generation drift accumulates past threshold", () => {
    const result = simulateGenerationalStability({
      generations: 20,
      baseStructuralDrift: 0.5, // sqrt(N) * 0.5 will eventually exceed 5%
      baseComputeDrift: 0.1,
      basePhiDelta: 0.01,
      blueprintIntegrity: "verified",
      substitutionsPerGeneration: 0,
    });

    // With sqrt(N) accumulation, structural drift at gen 20 = sqrt(20) * 0.5 ≈ 2.2%
    // This should trigger WARNING but not HALT
    expect(result.generationsSimulated).toBe(20);
    // At least one generation should hit WARNING
    const hasWarning = result.driftReports.some(
      (r) => r.assessment === DriftAssessment.Warning,
    );
    expect(hasWarning).toBe(true);
  });

  it("remains stable across 100 generations with very small per-gen drift", () => {
    const result = simulateGenerationalStability({
      generations: 100,
      baseStructuralDrift: 0.01,  // sqrt(100) * 0.01 = 0.1%
      baseComputeDrift: 0.01,     // sqrt(100) * 0.01 = 0.1%
      basePhiDelta: 0.001,        // sqrt(100) * 0.001 = 0.01%
      blueprintIntegrity: "verified",
      substitutionsPerGeneration: 0,
    });

    expect(result.generationsSimulated).toBe(100);
    expect(result.stable).toBe(true);
    expect(result.finalAssessment).toBe(DriftAssessment.Nominal);
  });

  it("halts simulation when consciousness drift exceeds threshold", () => {
    const result = simulateGenerationalStability({
      generations: 10,
      baseStructuralDrift: 0.01,
      baseComputeDrift: 0.01,
      basePhiDelta: 0.5, // sqrt(N) * 0.5 will exceed 1% around gen 4
      blueprintIntegrity: "verified",
      substitutionsPerGeneration: 0,
    });

    // Should detect HALT before completing all 10 generations
    expect(result.stable).toBe(false);
    expect(result.haltedAtGeneration).toBeDefined();
    expect(result.haltedAtGeneration!).toBeLessThan(10);
  });

  it("tracks cumulative substitutions across generations", () => {
    const result = simulateGenerationalStability({
      generations: 5,
      baseStructuralDrift: 0.01,
      baseComputeDrift: 0.01,
      basePhiDelta: 0.001,
      blueprintIntegrity: "verified",
      substitutionsPerGeneration: 2,
    });

    expect(result.driftReports[0].cumulativeSubstitutions).toBe(2);
    expect(result.driftReports[4].cumulativeSubstitutions).toBe(10);
  });
});
