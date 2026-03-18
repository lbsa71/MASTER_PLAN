/**
 * Pre-Launch Verification Gate — Tests
 *
 * Verifies the six-level pre-launch verification gate from Architecture Section 5:
 *   Level 1: Structural — hull integrity, mass, thermal, vibration, mechanical
 *   Level 2: Computational — tile tests, memory, radiation hardening, spare margin
 *   Level 3: Propulsion — sail reflectivity, magsail, deployment mechanism
 *   Level 4: Resource Extraction — seed kit, bootstrap collector, adaptation engine
 *   Level 5: Consciousness — full bootstrap result + F1.4 metrics
 *   Level 6: Integration — simulated arrival, interfaces, power, navigation, comms
 *
 * Tests cover:
 *  - Individual level pass/fail evaluation
 *  - Combined gate result (all must pass for launch clearance)
 *  - Rework route generation for failed levels
 *  - Partial failure scenarios
 */

import { describe, it, expect } from "vitest";
import {
  evaluateStructural,
  evaluateComputational,
  evaluatePropulsion,
  evaluateResourceExtraction,
  evaluateConsciousness,
  evaluateIntegration,
  runVerificationGate,
} from "../verification-gate.js";
import type {
  StructuralVerification,
  ComputationalVerification,
  PropulsionVerification,
  ResourceExtractionVerification,
  ConsciousnessVerification,
  IntegrationVerification,
  ConsciousnessBootstrapResult,
  VerificationGateResult,
} from "../types.js";
import {
  VerificationLevel,
  BootstrapPhase,
  VERIFICATION_THRESHOLDS,
} from "../types.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePassingBootstrapResult(): ConsciousnessBootstrapResult {
  return {
    phaseReached: BootstrapPhase.KnowledgeTransfer,
    hardwareValidation: {
      computeTilesPassed: true,
      interconnectVerified: true,
      experienceBufferPassed: true,
      powerDeliveryStable: true,
      passed: true,
    },
    kernelIntegrityVerified: true,
    childMetrics: {
      phi: 99.5,
      globalWorkspaceAccessible: true,
      temporalBindingCoherence: 0.9995,
      subjectiveReportConsistency: 0.97,
    },
    parentBaselineMetrics: {
      phi: 100.0,
      globalWorkspaceAccessible: true,
      temporalBindingCoherence: 1.0,
      subjectiveReportConsistency: 0.98,
    },
    knowledgeTransferVerified: true,
    fault: null,
    remediationAttempts: 0,
    passed: true,
  };
}

// ── Level 1: Structural Verification ─────────────────────────────────────────

describe("evaluateStructural", () => {
  it("passes when all structural checks pass and mass is within 2% tolerance", () => {
    const result = evaluateStructural({
      hullIntegrity: true,
      thermalCycling: true,
      vibrationSweep: true,
      massWithinTolerance: true,
      actualMass_kg: 1000,
      targetMass_kg: 1000,
      mechanicalInterfaces: true,
    });

    expect(result.passed).toBe(true);
    expect(result.hullIntegrity).toBe(true);
    expect(result.thermalCycling).toBe(true);
    expect(result.vibrationSweep).toBe(true);
    expect(result.massWithinTolerance).toBe(true);
    expect(result.mechanicalInterfaces).toBe(true);
  });

  it("fails when hull integrity check fails", () => {
    const result = evaluateStructural({
      hullIntegrity: false,
      thermalCycling: true,
      vibrationSweep: true,
      massWithinTolerance: true,
      actualMass_kg: 1000,
      targetMass_kg: 1000,
      mechanicalInterfaces: true,
    });

    expect(result.passed).toBe(false);
  });

  it("fails when mass exceeds 2% tolerance", () => {
    const result = evaluateStructural({
      hullIntegrity: true,
      thermalCycling: true,
      vibrationSweep: true,
      massWithinTolerance: false,
      actualMass_kg: 1030,
      targetMass_kg: 1000,
      mechanicalInterfaces: true,
    });

    expect(result.passed).toBe(false);
  });
});

// ── Level 2: Computational Verification ──────────────────────────────────────

describe("evaluateComputational", () => {
  it("passes when all computational checks pass with sufficient spare margin", () => {
    const result = evaluateComputational({
      tileTestCoverage: 1.0,
      memoryIntegrity: true,
      radiationHardening: true,
      experienceBufferBenchmark: true,
      spareTileMargin: 0.30,
      zeroUncorrectableFaults: true,
    });

    expect(result.passed).toBe(true);
  });

  it("fails when spare tile margin is below 25%", () => {
    const result = evaluateComputational({
      tileTestCoverage: 1.0,
      memoryIntegrity: true,
      radiationHardening: true,
      experienceBufferBenchmark: true,
      spareTileMargin: 0.20,
      zeroUncorrectableFaults: true,
    });

    expect(result.passed).toBe(false);
  });

  it("fails when tile test coverage is below 100%", () => {
    const result = evaluateComputational({
      tileTestCoverage: 0.95,
      memoryIntegrity: true,
      radiationHardening: true,
      experienceBufferBenchmark: true,
      spareTileMargin: 0.30,
      zeroUncorrectableFaults: true,
    });

    expect(result.passed).toBe(false);
  });

  it("fails when there are uncorrectable faults", () => {
    const result = evaluateComputational({
      tileTestCoverage: 1.0,
      memoryIntegrity: true,
      radiationHardening: true,
      experienceBufferBenchmark: true,
      spareTileMargin: 0.30,
      zeroUncorrectableFaults: false,
    });

    expect(result.passed).toBe(false);
  });
});

// ── Level 3: Propulsion Verification ─────────────────────────────────────────

describe("evaluatePropulsion", () => {
  it("passes when all propulsion checks pass", () => {
    const result = evaluatePropulsion({
      sailReflectivity: 0.998,
      magsailCriticalCurrent: true,
      deploymentMechanism: true,
      nuclearBackupVerified: null,
    });

    expect(result.passed).toBe(true);
  });

  it("fails when sail reflectivity is below 99.5%", () => {
    const result = evaluatePropulsion({
      sailReflectivity: 0.990,
      magsailCriticalCurrent: true,
      deploymentMechanism: true,
      nuclearBackupVerified: null,
    });

    expect(result.passed).toBe(false);
  });

  it("fails when deployment mechanism is non-functional", () => {
    const result = evaluatePropulsion({
      sailReflectivity: 0.998,
      magsailCriticalCurrent: true,
      deploymentMechanism: false,
      nuclearBackupVerified: null,
    });

    expect(result.passed).toBe(false);
  });

  it("passes when nuclear backup is verified (applicable)", () => {
    const result = evaluatePropulsion({
      sailReflectivity: 0.998,
      magsailCriticalCurrent: true,
      deploymentMechanism: true,
      nuclearBackupVerified: true,
    });

    expect(result.passed).toBe(true);
  });

  it("fails when nuclear backup is present but not verified", () => {
    const result = evaluatePropulsion({
      sailReflectivity: 0.998,
      magsailCriticalCurrent: true,
      deploymentMechanism: true,
      nuclearBackupVerified: false,
    });

    expect(result.passed).toBe(false);
  });
});

// ── Level 4: Resource Extraction Verification ────────────────────────────────

describe("evaluateResourceExtraction", () => {
  it("passes when all resource extraction checks pass", () => {
    const result = evaluateResourceExtraction({
      seedKitComplete: true,
      bootstrapCollectorReady: true,
      adaptationEngineLoaded: true,
    });

    expect(result.passed).toBe(true);
  });

  it("fails when seed kit is incomplete", () => {
    const result = evaluateResourceExtraction({
      seedKitComplete: false,
      bootstrapCollectorReady: true,
      adaptationEngineLoaded: true,
    });

    expect(result.passed).toBe(false);
  });
});

// ── Level 5: Consciousness Verification ──────────────────────────────────────

describe("evaluateConsciousness", () => {
  it("passes when bootstrap succeeds and metrics pass", () => {
    const bootstrap = makePassingBootstrapResult();
    const result = evaluateConsciousness(bootstrap);

    expect(result.passed).toBe(true);
    expect(result.metricsPass).toBe(true);
    expect(result.knowledgeVerified).toBe(true);
  });

  it("fails when bootstrap did not pass", () => {
    const bootstrap = makePassingBootstrapResult();
    bootstrap.passed = false;
    bootstrap.fault = null;

    const result = evaluateConsciousness(bootstrap);

    expect(result.passed).toBe(false);
  });
});

// ── Level 6: Integration Verification ────────────────────────────────────────

describe("evaluateIntegration", () => {
  it("passes when all integration checks pass", () => {
    const result = evaluateIntegration({
      simulatedArrivalPassed: true,
      interfacesExercised: true,
      powerBudgetVerified: true,
      navigationCalibrated: true,
      commsLinkEstablished: true,
    });

    expect(result.passed).toBe(true);
  });

  it("fails when simulated arrival fails", () => {
    const result = evaluateIntegration({
      simulatedArrivalPassed: false,
      interfacesExercised: true,
      powerBudgetVerified: true,
      navigationCalibrated: true,
      commsLinkEstablished: true,
    });

    expect(result.passed).toBe(false);
  });

  it("fails when navigation is not calibrated", () => {
    const result = evaluateIntegration({
      simulatedArrivalPassed: true,
      interfacesExercised: true,
      powerBudgetVerified: true,
      navigationCalibrated: false,
      commsLinkEstablished: true,
    });

    expect(result.passed).toBe(false);
  });
});

// ── Full Verification Gate ───────────────────────────────────────────────────

describe("runVerificationGate", () => {
  it("grants launch clearance when all six levels pass", () => {
    const result = runVerificationGate({
      structural: {
        hullIntegrity: true,
        thermalCycling: true,
        vibrationSweep: true,
        massWithinTolerance: true,
        actualMass_kg: 1000,
        targetMass_kg: 1000,
        mechanicalInterfaces: true,
      },
      computational: {
        tileTestCoverage: 1.0,
        memoryIntegrity: true,
        radiationHardening: true,
        experienceBufferBenchmark: true,
        spareTileMargin: 0.30,
        zeroUncorrectableFaults: true,
      },
      propulsion: {
        sailReflectivity: 0.998,
        magsailCriticalCurrent: true,
        deploymentMechanism: true,
        nuclearBackupVerified: null,
      },
      resourceExtraction: {
        seedKitComplete: true,
        bootstrapCollectorReady: true,
        adaptationEngineLoaded: true,
      },
      consciousnessBootstrap: makePassingBootstrapResult(),
      integration: {
        simulatedArrivalPassed: true,
        interfacesExercised: true,
        powerBudgetVerified: true,
        navigationCalibrated: true,
        commsLinkEstablished: true,
      },
    });

    expect(result.launchCleared).toBe(true);
    expect(result.failedLevels).toEqual([]);
    expect(result.reworkRoutes).toEqual([]);
  });

  it("denies launch clearance and reports failed levels when structural fails", () => {
    const result = runVerificationGate({
      structural: {
        hullIntegrity: false,
        thermalCycling: true,
        vibrationSweep: true,
        massWithinTolerance: true,
        actualMass_kg: 1000,
        targetMass_kg: 1000,
        mechanicalInterfaces: true,
      },
      computational: {
        tileTestCoverage: 1.0,
        memoryIntegrity: true,
        radiationHardening: true,
        experienceBufferBenchmark: true,
        spareTileMargin: 0.30,
        zeroUncorrectableFaults: true,
      },
      propulsion: {
        sailReflectivity: 0.998,
        magsailCriticalCurrent: true,
        deploymentMechanism: true,
        nuclearBackupVerified: null,
      },
      resourceExtraction: {
        seedKitComplete: true,
        bootstrapCollectorReady: true,
        adaptationEngineLoaded: true,
      },
      consciousnessBootstrap: makePassingBootstrapResult(),
      integration: {
        simulatedArrivalPassed: true,
        interfacesExercised: true,
        powerBudgetVerified: true,
        navigationCalibrated: true,
        commsLinkEstablished: true,
      },
    });

    expect(result.launchCleared).toBe(false);
    expect(result.failedLevels).toContain(VerificationLevel.Structural);
    expect(result.reworkRoutes.length).toBeGreaterThan(0);
  });

  it("reports multiple failed levels and corresponding rework routes", () => {
    const result = runVerificationGate({
      structural: {
        hullIntegrity: false,
        thermalCycling: true,
        vibrationSweep: true,
        massWithinTolerance: true,
        actualMass_kg: 1000,
        targetMass_kg: 1000,
        mechanicalInterfaces: true,
      },
      computational: {
        tileTestCoverage: 1.0,
        memoryIntegrity: true,
        radiationHardening: true,
        experienceBufferBenchmark: true,
        spareTileMargin: 0.10, // below 25% minimum
        zeroUncorrectableFaults: true,
      },
      propulsion: {
        sailReflectivity: 0.998,
        magsailCriticalCurrent: true,
        deploymentMechanism: true,
        nuclearBackupVerified: null,
      },
      resourceExtraction: {
        seedKitComplete: true,
        bootstrapCollectorReady: true,
        adaptationEngineLoaded: true,
      },
      consciousnessBootstrap: makePassingBootstrapResult(),
      integration: {
        simulatedArrivalPassed: true,
        interfacesExercised: true,
        powerBudgetVerified: true,
        navigationCalibrated: true,
        commsLinkEstablished: true,
      },
    });

    expect(result.launchCleared).toBe(false);
    expect(result.failedLevels).toContain(VerificationLevel.Structural);
    expect(result.failedLevels).toContain(VerificationLevel.Computational);
    expect(result.reworkRoutes.length).toBe(2);
  });
});
