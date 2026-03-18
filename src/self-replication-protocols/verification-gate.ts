/**
 * Pre-Launch Verification Gate
 *
 * Implements the six-level pre-launch verification from Architecture Section 5.
 * ALL levels must pass before launch clearance is granted.
 *
 * Levels:
 *   1. Structural — hull, thermal, vibration, mass, mechanical interfaces
 *   2. Computational — tile tests, memory, radiation, experience buffer, spare margin
 *   3. Propulsion — sail reflectivity, magsail, deployment, nuclear backup
 *   4. Resource Extraction — seed kit, bootstrap collector, adaptation engine
 *   5. Consciousness — full bootstrap result + F1.4 metrics
 *   6. Integration — simulated arrival, interfaces, power, navigation, comms
 *
 * Failed levels generate rework routes back to the appropriate pipeline stage.
 */

import type {
  StructuralVerification,
  ComputationalVerification,
  PropulsionVerification,
  ResourceExtractionVerification,
  ConsciousnessVerification,
  IntegrationVerification,
  ConsciousnessBootstrapResult,
  VerificationGateResult,
  ReworkRoute,
} from "./types.js";
import {
  VerificationLevel,
  ReplicationStage,
  VERIFICATION_THRESHOLDS,
} from "./types.js";
import { determineReworkTarget } from "./replication-cycle.js";

// ── Level 1: Structural (Architecture §5.1 level_1) ─────────────────────────

export interface StructuralInput {
  hullIntegrity: boolean;
  thermalCycling: boolean;
  vibrationSweep: boolean;
  massWithinTolerance: boolean;
  actualMass_kg: number;
  targetMass_kg: number;
  mechanicalInterfaces: boolean;
}

export function evaluateStructural(input: StructuralInput): StructuralVerification {
  const passed =
    input.hullIntegrity &&
    input.thermalCycling &&
    input.vibrationSweep &&
    input.massWithinTolerance &&
    input.mechanicalInterfaces;

  return {
    hullIntegrity: input.hullIntegrity,
    thermalCycling: input.thermalCycling,
    vibrationSweep: input.vibrationSweep,
    massWithinTolerance: input.massWithinTolerance,
    actualMass_kg: input.actualMass_kg,
    targetMass_kg: input.targetMass_kg,
    mechanicalInterfaces: input.mechanicalInterfaces,
    passed,
  };
}

// ── Level 2: Computational (Architecture §5.1 level_2) ──────────────────────

export interface ComputationalInput {
  tileTestCoverage: number;
  memoryIntegrity: boolean;
  radiationHardening: boolean;
  experienceBufferBenchmark: boolean;
  spareTileMargin: number;
  zeroUncorrectableFaults: boolean;
}

export function evaluateComputational(input: ComputationalInput): ComputationalVerification {
  const passed =
    input.tileTestCoverage >= VERIFICATION_THRESHOLDS.tileTestCoverageMin &&
    input.memoryIntegrity &&
    input.radiationHardening &&
    input.experienceBufferBenchmark &&
    input.spareTileMargin >= VERIFICATION_THRESHOLDS.spareTileMarginMin &&
    input.zeroUncorrectableFaults;

  return {
    tileTestCoverage: input.tileTestCoverage,
    memoryIntegrity: input.memoryIntegrity,
    radiationHardening: input.radiationHardening,
    experienceBufferBenchmark: input.experienceBufferBenchmark,
    spareTileMargin: input.spareTileMargin,
    zeroUncorrectableFaults: input.zeroUncorrectableFaults,
    passed,
  };
}

// ── Level 3: Propulsion (Architecture §5.1 level_3) ─────────────────────────

export interface PropulsionInput {
  sailReflectivity: number;
  magsailCriticalCurrent: boolean;
  deploymentMechanism: boolean;
  nuclearBackupVerified: boolean | null;
}

export function evaluatePropulsion(input: PropulsionInput): PropulsionVerification {
  const sailOk = input.sailReflectivity >= VERIFICATION_THRESHOLDS.sailReflectivityMin;
  const nuclearOk = input.nuclearBackupVerified === null || input.nuclearBackupVerified === true;

  const passed =
    sailOk &&
    input.magsailCriticalCurrent &&
    input.deploymentMechanism &&
    nuclearOk;

  return {
    sailReflectivity: input.sailReflectivity,
    magsailCriticalCurrent: input.magsailCriticalCurrent,
    deploymentMechanism: input.deploymentMechanism,
    nuclearBackupVerified: input.nuclearBackupVerified,
    passed,
  };
}

// ── Level 4: Resource Extraction (Architecture §5.1 level_4) ─────────────────

export interface ResourceExtractionInput {
  seedKitComplete: boolean;
  bootstrapCollectorReady: boolean;
  adaptationEngineLoaded: boolean;
}

export function evaluateResourceExtraction(
  input: ResourceExtractionInput,
): ResourceExtractionVerification {
  const passed =
    input.seedKitComplete &&
    input.bootstrapCollectorReady &&
    input.adaptationEngineLoaded;

  return {
    seedKitComplete: input.seedKitComplete,
    bootstrapCollectorReady: input.bootstrapCollectorReady,
    adaptationEngineLoaded: input.adaptationEngineLoaded,
    passed,
  };
}

// ── Level 5: Consciousness (Architecture §5.1 level_5) ──────────────────────

export function evaluateConsciousness(
  bootstrapResult: ConsciousnessBootstrapResult,
): ConsciousnessVerification {
  const passed =
    bootstrapResult.passed &&
    bootstrapResult.knowledgeTransferVerified;

  return {
    bootstrapResult,
    metricsPass: bootstrapResult.passed,
    knowledgeVerified: bootstrapResult.knowledgeTransferVerified,
    passed,
  };
}

// ── Level 6: Integration (Architecture §5.1 level_6) ────────────────────────

export interface IntegrationInput {
  simulatedArrivalPassed: boolean;
  interfacesExercised: boolean;
  powerBudgetVerified: boolean;
  navigationCalibrated: boolean;
  commsLinkEstablished: boolean;
}

export function evaluateIntegration(input: IntegrationInput): IntegrationVerification {
  const passed =
    input.simulatedArrivalPassed &&
    input.interfacesExercised &&
    input.powerBudgetVerified &&
    input.navigationCalibrated &&
    input.commsLinkEstablished;

  return {
    simulatedArrivalPassed: input.simulatedArrivalPassed,
    interfacesExercised: input.interfacesExercised,
    powerBudgetVerified: input.powerBudgetVerified,
    navigationCalibrated: input.navigationCalibrated,
    commsLinkEstablished: input.commsLinkEstablished,
    passed,
  };
}

// ── Full Verification Gate (Architecture §5.1) ──────────────────────────────

export interface VerificationGateInput {
  structural: StructuralInput;
  computational: ComputationalInput;
  propulsion: PropulsionInput;
  resourceExtraction: ResourceExtractionInput;
  consciousnessBootstrap: ConsciousnessBootstrapResult;
  integration: IntegrationInput;
}

export function runVerificationGate(input: VerificationGateInput): VerificationGateResult {
  const structural = evaluateStructural(input.structural);
  const computational = evaluateComputational(input.computational);
  const propulsion = evaluatePropulsion(input.propulsion);
  const resourceExtraction = evaluateResourceExtraction(input.resourceExtraction);
  const consciousness = evaluateConsciousness(input.consciousnessBootstrap);
  const integration = evaluateIntegration(input.integration);

  const failedLevels: VerificationLevel[] = [];
  const reworkRoutes: ReworkRoute[] = [];

  if (!structural.passed) {
    failedLevels.push(VerificationLevel.Structural);
    reworkRoutes.push(determineReworkTarget(VerificationLevel.Structural));
  }
  if (!computational.passed) {
    failedLevels.push(VerificationLevel.Computational);
    reworkRoutes.push(determineReworkTarget(VerificationLevel.Computational));
  }
  if (!propulsion.passed) {
    failedLevels.push(VerificationLevel.Propulsion);
    reworkRoutes.push(determineReworkTarget(VerificationLevel.Propulsion));
  }
  if (!resourceExtraction.passed) {
    failedLevels.push(VerificationLevel.ResourceExtraction);
    reworkRoutes.push(determineReworkTarget(VerificationLevel.ResourceExtraction));
  }
  if (!consciousness.passed) {
    failedLevels.push(VerificationLevel.Consciousness);
    reworkRoutes.push(determineReworkTarget(VerificationLevel.Consciousness));
  }
  if (!integration.passed) {
    failedLevels.push(VerificationLevel.Integration);
    reworkRoutes.push(determineReworkTarget(VerificationLevel.Integration));
  }

  const launchCleared = failedLevels.length === 0;

  return {
    structural,
    computational,
    propulsion,
    resourceExtraction,
    consciousness,
    integration,
    launchCleared,
    failedLevels,
    reworkRoutes,
  };
}
