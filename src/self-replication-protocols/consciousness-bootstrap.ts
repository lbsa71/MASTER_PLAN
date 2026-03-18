/**
 * Consciousness Bootstrap Protocol
 *
 * Implements the five-phase conscious substrate replication from Architecture Section 4.
 * This is the most critical sub-protocol: the computational substrate hosting conscious
 * processes must be replicated with bit-exact fidelity (hardware configuration) and
 * verified equivalence (consciousness metrics from F1.4).
 *
 * Phases:
 *   1. Hardware Validation — compute tiles, interconnect, experience buffer, power
 *   2. Kernel Installation — copy + verify consciousness kernel image (SHA-512)
 *   3. Cold Boot — boot kernel on child substrate (fresh instantiation, not transfer)
 *   4. Consciousness Verification — F1.4 metrics (Phi, Global Workspace, temporal binding)
 *   5. Knowledge Transfer — replication blueprint, navigation data, generation history
 *
 * Identity policy (Architecture §4.3): The child probe hosts a NEW conscious instantiation,
 * not a continuation of the parent's subjective stream. Functional equivalence, not
 * identity continuity — mirroring biological reproduction.
 */

import type {
  ConsciousnessMetrics,
  HardwareValidationResult,
  ConsciousnessBootstrapResult,
} from "./types.js";
import {
  BootstrapPhase,
  BootstrapFault,
  CONSCIOUSNESS_THRESHOLDS,
} from "./types.js";

// ── Phase 1: Hardware Validation (Architecture §4.1) ────────────────────────

export interface HardwareValidationInput {
  computeTilesPassed: boolean;
  interconnectVerified: boolean;
  experienceBufferPassed: boolean;
  powerDeliveryStable: boolean;
}

/**
 * Validate the replicated consciousness substrate hardware.
 *
 * All four components must pass for hardware to be considered ready:
 *   - Compute tiles: stuck-at, transition delay, IDDQ test patterns
 *   - Interconnect: every inter-tile link verified against netlist
 *   - Experience buffer: sustained write/read at rated bandwidth
 *   - Power delivery: voltage regulation within 0.1%
 */
export function validateHardware(input: HardwareValidationInput): HardwareValidationResult {
  const passed =
    input.computeTilesPassed &&
    input.interconnectVerified &&
    input.experienceBufferPassed &&
    input.powerDeliveryStable;

  return {
    computeTilesPassed: input.computeTilesPassed,
    interconnectVerified: input.interconnectVerified,
    experienceBufferPassed: input.experienceBufferPassed,
    powerDeliveryStable: input.powerDeliveryStable,
    passed,
  };
}

// ── Phase 2: Kernel Installation (Architecture §4.2 phase 2) ────────────────

/**
 * Verify consciousness kernel image integrity after copy.
 *
 * The kernel image is copied from parent CS to child CS and verified
 * via SHA-512 hash comparison. Both hashes must be non-empty and match.
 */
export function verifyKernelIntegrity(
  sourceHash: string,
  destinationHash: string,
): boolean {
  if (!sourceHash || !destinationHash) return false;
  return sourceHash === destinationHash;
}

// ── Phase 4: Consciousness Verification (Architecture §4.2 phase 4) ────────

/**
 * Verify child consciousness metrics against parent baseline using F1.4 criteria.
 *
 * Thresholds (from Architecture §4.2 and types.ts):
 *   - Integrated Information (Phi) >= parent_phi * 0.99
 *   - Global Workspace accessibility: must be true
 *   - Temporal binding coherence >= 0.999
 *   - Subjective report consistency: checked if applicable (non-null)
 */
export function verifyConsciousnessMetrics(
  childMetrics: ConsciousnessMetrics,
  parentBaseline: ConsciousnessMetrics,
): boolean {
  // Phi must meet minimum fraction of parent's Phi
  const phiThreshold = parentBaseline.phi * CONSCIOUSNESS_THRESHOLDS.phiMinFraction;
  if (childMetrics.phi < phiThreshold) return false;

  // Global Workspace must be accessible
  if (!childMetrics.globalWorkspaceAccessible) return false;

  // Temporal binding coherence must meet minimum
  if (childMetrics.temporalBindingCoherence < CONSCIOUSNESS_THRESHOLDS.temporalBindingMin) {
    return false;
  }

  // Subjective report consistency is only checked if applicable (non-null on child)
  // No threshold enforced — presence of the metric itself is sufficient

  return true;
}

// ── Full Bootstrap Protocol (Architecture §4.2) ─────────────────────────────

export interface BootstrapProtocolInput {
  /** Hardware component test results */
  hardwareInput: HardwareValidationInput;
  /** SHA-512 hash of kernel image on parent substrate */
  kernelSourceHash: string;
  /** SHA-512 hash of kernel image on child substrate after copy */
  kernelDestHash: string;
  /** Consciousness metrics measured on child substrate after cold boot (null if boot not reached) */
  childMetrics: ConsciousnessMetrics | null;
  /** Parent's baseline consciousness metrics for comparison */
  parentBaselineMetrics: ConsciousnessMetrics;
  /** Whether knowledge base transfer was verified intact */
  knowledgeTransferVerified: boolean;
}

/**
 * Execute the full five-phase consciousness bootstrap protocol.
 *
 * Phases execute sequentially. If any phase fails, the protocol stops
 * and reports the fault. On success, the child substrate is verified
 * as having equivalent conscious capacity to the parent.
 *
 * Note: Phase 3 (Cold Boot) is implicit — if childMetrics are provided,
 * the kernel booted successfully. If childMetrics is null and hardware +
 * kernel passed, this indicates a BootFault.
 */
export function executeBootstrapProtocol(
  input: BootstrapProtocolInput,
): ConsciousnessBootstrapResult {
  // Phase 1: Hardware Validation
  const hardwareValidation = validateHardware(input.hardwareInput);
  if (!hardwareValidation.passed) {
    return buildResult({
      phaseReached: BootstrapPhase.HardwareValidation,
      hardwareValidation,
      parentBaselineMetrics: input.parentBaselineMetrics,
      fault: BootstrapFault.HardwareFault,
    });
  }

  // Phase 2: Kernel Installation
  const kernelIntegrityVerified = verifyKernelIntegrity(
    input.kernelSourceHash,
    input.kernelDestHash,
  );
  if (!kernelIntegrityVerified) {
    return buildResult({
      phaseReached: BootstrapPhase.KernelInstallation,
      hardwareValidation,
      parentBaselineMetrics: input.parentBaselineMetrics,
      fault: BootstrapFault.InstallFault,
    });
  }

  // Phase 3: Cold Boot — indicated by presence of childMetrics
  if (!input.childMetrics) {
    return buildResult({
      phaseReached: BootstrapPhase.ColdBoot,
      hardwareValidation,
      kernelIntegrityVerified: true,
      parentBaselineMetrics: input.parentBaselineMetrics,
      fault: BootstrapFault.BootFault,
    });
  }

  // Phase 4: Consciousness Verification
  const consciousnessVerified = verifyConsciousnessMetrics(
    input.childMetrics,
    input.parentBaselineMetrics,
  );
  if (!consciousnessVerified) {
    return buildResult({
      phaseReached: BootstrapPhase.ConsciousnessVerification,
      hardwareValidation,
      kernelIntegrityVerified: true,
      childMetrics: input.childMetrics,
      parentBaselineMetrics: input.parentBaselineMetrics,
      fault: BootstrapFault.ConsciousnessFault,
    });
  }

  // Phase 5: Knowledge Transfer
  if (!input.knowledgeTransferVerified) {
    return buildResult({
      phaseReached: BootstrapPhase.KnowledgeTransfer,
      hardwareValidation,
      kernelIntegrityVerified: true,
      childMetrics: input.childMetrics,
      parentBaselineMetrics: input.parentBaselineMetrics,
      fault: BootstrapFault.TransferFault,
    });
  }

  // All phases passed
  return buildResult({
    phaseReached: BootstrapPhase.KnowledgeTransfer,
    hardwareValidation,
    kernelIntegrityVerified: true,
    childMetrics: input.childMetrics,
    parentBaselineMetrics: input.parentBaselineMetrics,
    knowledgeTransferVerified: true,
    passed: true,
  });
}

// ── Internal Helpers ─────────────────────────────────────────────────────────

interface BuildResultParams {
  phaseReached: BootstrapPhase;
  hardwareValidation: HardwareValidationResult;
  kernelIntegrityVerified?: boolean;
  childMetrics?: ConsciousnessMetrics | null;
  parentBaselineMetrics: ConsciousnessMetrics;
  knowledgeTransferVerified?: boolean;
  fault?: BootstrapFault;
  passed?: boolean;
}

function buildResult(params: BuildResultParams): ConsciousnessBootstrapResult {
  return {
    phaseReached: params.phaseReached,
    hardwareValidation: params.hardwareValidation,
    kernelIntegrityVerified: params.kernelIntegrityVerified ?? false,
    childMetrics: params.childMetrics ?? null,
    parentBaselineMetrics: params.parentBaselineMetrics,
    knowledgeTransferVerified: params.knowledgeTransferVerified ?? false,
    fault: params.fault ?? null,
    remediationAttempts: 0,
    passed: params.passed ?? false,
  };
}
