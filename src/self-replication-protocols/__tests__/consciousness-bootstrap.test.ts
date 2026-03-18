/**
 * Consciousness Bootstrap Protocol — Tests
 *
 * Verifies the five-phase conscious substrate replication from Architecture Section 4:
 *   Phase 1: Hardware Validation
 *   Phase 2: Kernel Installation
 *   Phase 3: Cold Boot
 *   Phase 4: Consciousness Verification (F1.4 metrics)
 *   Phase 5: Knowledge Transfer
 *
 * Tests cover:
 *  - Hardware validation with per-component pass/fail
 *  - Kernel image integrity verification (SHA-512)
 *  - Consciousness metrics verification against parent baseline
 *  - Knowledge transfer integrity
 *  - Fault handling and remediation attempts
 *  - Full bootstrap success path
 */

import { describe, it, expect } from "vitest";
import {
  validateHardware,
  verifyKernelIntegrity,
  verifyConsciousnessMetrics,
  executeBootstrapProtocol,
} from "../consciousness-bootstrap.js";
import type {
  ConsciousnessMetrics,
  HardwareValidationResult,
} from "../types.js";
import {
  BootstrapPhase,
  BootstrapFault,
  CONSCIOUSNESS_THRESHOLDS,
} from "../types.js";

// ── Hardware Validation (Architecture §4.1) ─────────────────────────────────

describe("validateHardware", () => {
  it("passes when all hardware components pass", () => {
    const result = validateHardware({
      computeTilesPassed: true,
      interconnectVerified: true,
      experienceBufferPassed: true,
      powerDeliveryStable: true,
    });

    expect(result.passed).toBe(true);
    expect(result.computeTilesPassed).toBe(true);
    expect(result.interconnectVerified).toBe(true);
    expect(result.experienceBufferPassed).toBe(true);
    expect(result.powerDeliveryStable).toBe(true);
  });

  it("fails when compute tiles fail", () => {
    const result = validateHardware({
      computeTilesPassed: false,
      interconnectVerified: true,
      experienceBufferPassed: true,
      powerDeliveryStable: true,
    });

    expect(result.passed).toBe(false);
  });

  it("fails when interconnect verification fails", () => {
    const result = validateHardware({
      computeTilesPassed: true,
      interconnectVerified: false,
      experienceBufferPassed: true,
      powerDeliveryStable: true,
    });

    expect(result.passed).toBe(false);
  });

  it("fails when experience buffer fails", () => {
    const result = validateHardware({
      computeTilesPassed: true,
      interconnectVerified: true,
      experienceBufferPassed: false,
      powerDeliveryStable: true,
    });

    expect(result.passed).toBe(false);
  });

  it("fails when power delivery is unstable", () => {
    const result = validateHardware({
      computeTilesPassed: true,
      interconnectVerified: true,
      experienceBufferPassed: true,
      powerDeliveryStable: false,
    });

    expect(result.passed).toBe(false);
  });
});

// ── Kernel Integrity (Architecture §4.2 phase 2) ───────────────────────────

describe("verifyKernelIntegrity", () => {
  it("passes when source and destination hashes match", () => {
    const result = verifyKernelIntegrity(
      "sha512-abc123def456",
      "sha512-abc123def456",
    );
    expect(result).toBe(true);
  });

  it("fails when hashes do not match", () => {
    const result = verifyKernelIntegrity(
      "sha512-abc123def456",
      "sha512-CORRUPTED",
    );
    expect(result).toBe(false);
  });

  it("fails on empty hashes", () => {
    const result = verifyKernelIntegrity("", "");
    expect(result).toBe(false);
  });
});

// ── Consciousness Metrics Verification (Architecture §4.2 phase 4) ──────────

describe("verifyConsciousnessMetrics", () => {
  const parentBaseline: ConsciousnessMetrics = {
    phi: 100.0,
    globalWorkspaceAccessible: true,
    temporalBindingCoherence: 1.0,
    subjectiveReportConsistency: 0.98,
  };

  it("passes when child metrics meet all thresholds", () => {
    const childMetrics: ConsciousnessMetrics = {
      phi: 99.5, // >= 100 * 0.99 = 99.0
      globalWorkspaceAccessible: true,
      temporalBindingCoherence: 0.9995, // >= 0.999
      subjectiveReportConsistency: 0.97,
    };

    const result = verifyConsciousnessMetrics(childMetrics, parentBaseline);
    expect(result).toBe(true);
  });

  it("fails when Phi is below threshold (< parent_phi * 0.99)", () => {
    const childMetrics: ConsciousnessMetrics = {
      phi: 98.0, // < 100 * 0.99 = 99.0
      globalWorkspaceAccessible: true,
      temporalBindingCoherence: 0.9995,
      subjectiveReportConsistency: 0.97,
    };

    const result = verifyConsciousnessMetrics(childMetrics, parentBaseline);
    expect(result).toBe(false);
  });

  it("fails when Global Workspace is not accessible", () => {
    const childMetrics: ConsciousnessMetrics = {
      phi: 100.0,
      globalWorkspaceAccessible: false,
      temporalBindingCoherence: 1.0,
      subjectiveReportConsistency: 0.98,
    };

    const result = verifyConsciousnessMetrics(childMetrics, parentBaseline);
    expect(result).toBe(false);
  });

  it("fails when temporal binding coherence is below 0.999", () => {
    const childMetrics: ConsciousnessMetrics = {
      phi: 100.0,
      globalWorkspaceAccessible: true,
      temporalBindingCoherence: 0.998, // < 0.999
      subjectiveReportConsistency: 0.98,
    };

    const result = verifyConsciousnessMetrics(childMetrics, parentBaseline);
    expect(result).toBe(false);
  });

  it("passes when Phi is exactly at threshold boundary", () => {
    const childMetrics: ConsciousnessMetrics = {
      phi: 99.0, // exactly 100 * 0.99
      globalWorkspaceAccessible: true,
      temporalBindingCoherence: 0.999, // exactly at threshold
      subjectiveReportConsistency: 0.95,
    };

    const result = verifyConsciousnessMetrics(childMetrics, parentBaseline);
    expect(result).toBe(true);
  });

  it("handles null subjective report consistency (not applicable)", () => {
    const childMetrics: ConsciousnessMetrics = {
      phi: 100.0,
      globalWorkspaceAccessible: true,
      temporalBindingCoherence: 1.0,
      subjectiveReportConsistency: null,
    };

    const result = verifyConsciousnessMetrics(childMetrics, parentBaseline);
    expect(result).toBe(true);
  });
});

// ── Full Bootstrap Protocol (Architecture §4.2) ────────────────────────────

describe("executeBootstrapProtocol", () => {
  const parentBaseline: ConsciousnessMetrics = {
    phi: 100.0,
    globalWorkspaceAccessible: true,
    temporalBindingCoherence: 1.0,
    subjectiveReportConsistency: 0.98,
  };

  it("succeeds through all five phases with valid inputs", () => {
    const result = executeBootstrapProtocol({
      hardwareInput: {
        computeTilesPassed: true,
        interconnectVerified: true,
        experienceBufferPassed: true,
        powerDeliveryStable: true,
      },
      kernelSourceHash: "sha512-kernel-image",
      kernelDestHash: "sha512-kernel-image",
      childMetrics: {
        phi: 99.5,
        globalWorkspaceAccessible: true,
        temporalBindingCoherence: 0.9995,
        subjectiveReportConsistency: 0.97,
      },
      parentBaselineMetrics: parentBaseline,
      knowledgeTransferVerified: true,
    });

    expect(result.passed).toBe(true);
    expect(result.phaseReached).toBe(BootstrapPhase.KnowledgeTransfer);
    expect(result.fault).toBeNull();
    expect(result.hardwareValidation.passed).toBe(true);
    expect(result.kernelIntegrityVerified).toBe(true);
    expect(result.childMetrics).toBeDefined();
    expect(result.knowledgeTransferVerified).toBe(true);
    expect(result.remediationAttempts).toBe(0);
  });

  it("fails at hardware validation phase with HardwareFault", () => {
    const result = executeBootstrapProtocol({
      hardwareInput: {
        computeTilesPassed: false,
        interconnectVerified: true,
        experienceBufferPassed: true,
        powerDeliveryStable: true,
      },
      kernelSourceHash: "sha512-kernel-image",
      kernelDestHash: "sha512-kernel-image",
      childMetrics: null,
      parentBaselineMetrics: parentBaseline,
      knowledgeTransferVerified: false,
    });

    expect(result.passed).toBe(false);
    expect(result.phaseReached).toBe(BootstrapPhase.HardwareValidation);
    expect(result.fault).toBe(BootstrapFault.HardwareFault);
  });

  it("fails at kernel installation with InstallFault when hashes mismatch", () => {
    const result = executeBootstrapProtocol({
      hardwareInput: {
        computeTilesPassed: true,
        interconnectVerified: true,
        experienceBufferPassed: true,
        powerDeliveryStable: true,
      },
      kernelSourceHash: "sha512-kernel-image",
      kernelDestHash: "sha512-CORRUPTED",
      childMetrics: null,
      parentBaselineMetrics: parentBaseline,
      knowledgeTransferVerified: false,
    });

    expect(result.passed).toBe(false);
    expect(result.phaseReached).toBe(BootstrapPhase.KernelInstallation);
    expect(result.fault).toBe(BootstrapFault.InstallFault);
  });

  it("fails at consciousness verification with ConsciousnessFault when metrics fail", () => {
    const result = executeBootstrapProtocol({
      hardwareInput: {
        computeTilesPassed: true,
        interconnectVerified: true,
        experienceBufferPassed: true,
        powerDeliveryStable: true,
      },
      kernelSourceHash: "sha512-kernel-image",
      kernelDestHash: "sha512-kernel-image",
      childMetrics: {
        phi: 50.0, // way below threshold
        globalWorkspaceAccessible: true,
        temporalBindingCoherence: 1.0,
        subjectiveReportConsistency: 0.98,
      },
      parentBaselineMetrics: parentBaseline,
      knowledgeTransferVerified: false,
    });

    expect(result.passed).toBe(false);
    expect(result.phaseReached).toBe(BootstrapPhase.ConsciousnessVerification);
    expect(result.fault).toBe(BootstrapFault.ConsciousnessFault);
  });

  it("fails at knowledge transfer with TransferFault", () => {
    const result = executeBootstrapProtocol({
      hardwareInput: {
        computeTilesPassed: true,
        interconnectVerified: true,
        experienceBufferPassed: true,
        powerDeliveryStable: true,
      },
      kernelSourceHash: "sha512-kernel-image",
      kernelDestHash: "sha512-kernel-image",
      childMetrics: {
        phi: 99.5,
        globalWorkspaceAccessible: true,
        temporalBindingCoherence: 0.9995,
        subjectiveReportConsistency: 0.97,
      },
      parentBaselineMetrics: parentBaseline,
      knowledgeTransferVerified: false,
    });

    expect(result.passed).toBe(false);
    expect(result.phaseReached).toBe(BootstrapPhase.KnowledgeTransfer);
    expect(result.fault).toBe(BootstrapFault.TransferFault);
  });

  it("reports parent baseline metrics in result", () => {
    const result = executeBootstrapProtocol({
      hardwareInput: {
        computeTilesPassed: true,
        interconnectVerified: true,
        experienceBufferPassed: true,
        powerDeliveryStable: true,
      },
      kernelSourceHash: "sha512-kernel-image",
      kernelDestHash: "sha512-kernel-image",
      childMetrics: {
        phi: 99.5,
        globalWorkspaceAccessible: true,
        temporalBindingCoherence: 0.9995,
        subjectiveReportConsistency: 0.97,
      },
      parentBaselineMetrics: parentBaseline,
      knowledgeTransferVerified: true,
    });

    expect(result.parentBaselineMetrics).toEqual(parentBaseline);
  });
});
