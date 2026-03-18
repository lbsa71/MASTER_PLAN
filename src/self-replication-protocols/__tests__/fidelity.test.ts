/**
 * Replication Fidelity Protocol — Tests
 *
 * Verifies the three-level fidelity protocol from Architecture Section 3:
 *   L1: Blueprint data integrity (checksums + ECC)
 *   L2: Component dimensional fidelity (interferometry/CMM)
 *   L3: Functional equivalence (test suites)
 *
 * Tests cover:
 *  - Blueprint integrity verification across triple-redundant storage
 *  - ECC reconstruction of corrupted sections
 *  - Dimensional tolerance checking against blueprint specs
 *  - Functional equivalence test aggregation
 *  - Combined fidelity report generation
 */

import { describe, it, expect } from "vitest";
import {
  verifyBlueprintIntegrity,
  verifyDimensionalFidelity,
  verifyFunctionalEquivalence,
  generateFidelityReport,
} from "../fidelity.js";
import type {
  BlueprintIntegrityResult,
  DimensionalFidelityResult,
  FunctionalEquivalenceResult,
  ComponentId,
} from "../types.js";

// ── L1: Blueprint Data Integrity ────────────────────────────────────────────

describe("verifyBlueprintIntegrity", () => {
  it("passes when all three storage copies match", () => {
    const result = verifyBlueprintIntegrity({
      primaryHash: "abc123",
      secondaryHash: "abc123",
      tertiaryHash: "abc123",
      corruptedSections: 0,
      unrecoverableSections: 0,
    });

    expect(result.passed).toBe(true);
    expect(result.globalHashMatch).toBe(true);
    expect(result.storageCopies.primary).toBe("verified");
    expect(result.storageCopies.secondary).toBe("verified");
    expect(result.storageCopies.tertiary).toBe("verified");
    expect(result.sectionsReconstructed).toBe(0);
    expect(result.unrecoverableSections).toBe(0);
  });

  it("passes with reconstruction when one copy is corrupted but ECC recovers", () => {
    const result = verifyBlueprintIntegrity({
      primaryHash: "abc123",
      secondaryHash: "CORRUPTED",
      tertiaryHash: "abc123",
      corruptedSections: 3,
      unrecoverableSections: 0,
    });

    expect(result.passed).toBe(true);
    expect(result.globalHashMatch).toBe(false);
    expect(result.storageCopies.secondary).toBe("reconstructed");
    expect(result.sectionsReconstructed).toBe(3);
  });

  it("fails when there are unrecoverable sections", () => {
    const result = verifyBlueprintIntegrity({
      primaryHash: "abc123",
      secondaryHash: "CORRUPTED",
      tertiaryHash: "CORRUPTED",
      corruptedSections: 5,
      unrecoverableSections: 2,
    });

    expect(result.passed).toBe(false);
    expect(result.unrecoverableSections).toBe(2);
  });

  it("fails when all three copies have different hashes and reconstruction fails", () => {
    const result = verifyBlueprintIntegrity({
      primaryHash: "hash_a",
      secondaryHash: "hash_b",
      tertiaryHash: "hash_c",
      corruptedSections: 10,
      unrecoverableSections: 10,
    });

    expect(result.passed).toBe(false);
    expect(result.globalHashMatch).toBe(false);
  });
});

// ── L2: Dimensional Fidelity ────────────────────────────────────────────────

describe("verifyDimensionalFidelity", () => {
  it("passes when all components are within tolerance", () => {
    const measurements = new Map<ComponentId, number>([
      ["hull-panel-A" as ComponentId, 0.5],   // 50% of tolerance used
      ["compute-tile-1" as ComponentId, 0.8], // 80% of tolerance used
      ["sail-spar-3" as ComponentId, 0.2],    // 20% of tolerance used
    ]);

    const result = verifyDimensionalFidelity(measurements);

    expect(result.passed).toBe(true);
    expect(result.componentsMeasured).toBe(3);
    expect(result.componentsWithinTolerance).toBe(3);
  });

  it("fails when any component exceeds tolerance (deviation > 1.0)", () => {
    const measurements = new Map<ComponentId, number>([
      ["hull-panel-A" as ComponentId, 0.5],
      ["compute-tile-1" as ComponentId, 1.2], // exceeds tolerance
      ["sail-spar-3" as ComponentId, 0.3],
    ]);

    const result = verifyDimensionalFidelity(measurements);

    expect(result.passed).toBe(false);
    expect(result.componentsMeasured).toBe(3);
    expect(result.componentsWithinTolerance).toBe(2);
  });

  it("reports per-component max deviations", () => {
    const measurements = new Map<ComponentId, number>([
      ["hull-panel-A" as ComponentId, 0.7],
      ["compute-tile-1" as ComponentId, 0.95],
    ]);

    const result = verifyDimensionalFidelity(measurements);

    expect(result.maxDeviations.get("hull-panel-A" as ComponentId)).toBe(0.7);
    expect(result.maxDeviations.get("compute-tile-1" as ComponentId)).toBe(0.95);
  });

  it("passes with zero components (vacuously true)", () => {
    const measurements = new Map<ComponentId, number>();
    const result = verifyDimensionalFidelity(measurements);

    expect(result.passed).toBe(true);
    expect(result.componentsMeasured).toBe(0);
  });
});

// ── L3: Functional Equivalence ──────────────────────────────────────────────

describe("verifyFunctionalEquivalence", () => {
  it("passes when all subsystems pass functional tests", () => {
    const testResults = new Map<string, boolean>([
      ["propulsion-subsystem", true],
      ["thermal-management", true],
      ["consciousness-substrate", true],
    ]);

    const result = verifyFunctionalEquivalence(testResults);

    expect(result.passed).toBe(true);
    expect(result.subsystemsTested).toBe(3);
    expect(result.subsystemsPassed).toBe(3);
    expect(result.failures.size).toBe(0);
  });

  it("fails and reports specific subsystem failures", () => {
    const testResults = new Map<string, boolean>([
      ["propulsion-subsystem", true],
      ["thermal-management", false],
      ["consciousness-substrate", true],
    ]);

    const result = verifyFunctionalEquivalence(testResults);

    expect(result.passed).toBe(false);
    expect(result.subsystemsTested).toBe(3);
    expect(result.subsystemsPassed).toBe(2);
    expect(result.failures.size).toBe(1);
    expect(result.failures.has("thermal-management")).toBe(true);
  });

  it("fails when multiple subsystems fail", () => {
    const testResults = new Map<string, boolean>([
      ["propulsion-subsystem", false],
      ["thermal-management", false],
      ["consciousness-substrate", true],
    ]);

    const result = verifyFunctionalEquivalence(testResults);

    expect(result.passed).toBe(false);
    expect(result.subsystemsPassed).toBe(1);
    expect(result.failures.size).toBe(2);
  });
});

// ── Combined Fidelity Report ────────────────────────────────────────────────

describe("generateFidelityReport", () => {
  it("allPassed is true only when all three levels pass", () => {
    const blueprint: BlueprintIntegrityResult = {
      globalHashMatch: true,
      sectionsReconstructed: 0,
      unrecoverableSections: 0,
      storageCopies: { primary: "verified", secondary: "verified", tertiary: "verified" },
      passed: true,
    };
    const dimensional: DimensionalFidelityResult = {
      componentsMeasured: 2,
      componentsWithinTolerance: 2,
      maxDeviations: new Map(),
      passed: true,
    };
    const functional: FunctionalEquivalenceResult = {
      subsystemsTested: 2,
      subsystemsPassed: 2,
      failures: new Map(),
      passed: true,
    };

    const report = generateFidelityReport(blueprint, dimensional, functional);
    expect(report.allPassed).toBe(true);
  });

  it("allPassed is false when blueprint integrity fails", () => {
    const blueprint: BlueprintIntegrityResult = {
      globalHashMatch: false,
      sectionsReconstructed: 0,
      unrecoverableSections: 5,
      storageCopies: { primary: "corrupted", secondary: "corrupted", tertiary: "corrupted" },
      passed: false,
    };
    const dimensional: DimensionalFidelityResult = {
      componentsMeasured: 1,
      componentsWithinTolerance: 1,
      maxDeviations: new Map(),
      passed: true,
    };
    const functional: FunctionalEquivalenceResult = {
      subsystemsTested: 1,
      subsystemsPassed: 1,
      failures: new Map(),
      passed: true,
    };

    const report = generateFidelityReport(blueprint, dimensional, functional);
    expect(report.allPassed).toBe(false);
  });

  it("allPassed is false when dimensional fidelity fails", () => {
    const blueprint: BlueprintIntegrityResult = {
      globalHashMatch: true,
      sectionsReconstructed: 0,
      unrecoverableSections: 0,
      storageCopies: { primary: "verified", secondary: "verified", tertiary: "verified" },
      passed: true,
    };
    const dimensional: DimensionalFidelityResult = {
      componentsMeasured: 3,
      componentsWithinTolerance: 2,
      maxDeviations: new Map(),
      passed: false,
    };
    const functional: FunctionalEquivalenceResult = {
      subsystemsTested: 1,
      subsystemsPassed: 1,
      failures: new Map(),
      passed: true,
    };

    const report = generateFidelityReport(blueprint, dimensional, functional);
    expect(report.allPassed).toBe(false);
  });
});
