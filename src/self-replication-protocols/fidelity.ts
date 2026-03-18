/**
 * Replication Fidelity Protocol
 *
 * Implements the three-level fidelity verification from Architecture Section 3:
 *   L1: Blueprint data integrity — SHA-512 checksums + Reed-Solomon ECC
 *        across triple-redundant storage (primary CS, secondary ROM, tertiary crystal)
 *   L2: Component dimensional fidelity — laser interferometry / CMM verification
 *        against blueprint tolerances (+/- 10um structural, +/- 100nm semiconductor)
 *   L3: Functional equivalence — per-subsystem test suite pass/fail
 *
 * Combined into a FidelityReport that gates the replication pipeline.
 */

import type {
  BlueprintIntegrityResult,
  DimensionalFidelityResult,
  FunctionalEquivalenceResult,
  FidelityReport,
  ComponentId,
} from "./types.js";

// ── L1: Blueprint Data Integrity (Architecture §3.1–3.3) ────────────────────

export interface BlueprintIntegrityInput {
  /** SHA-512 hash from primary storage (Consciousness Substrate long-term) */
  primaryHash: string;
  /** SHA-512 hash from secondary storage (radiation-hardened ROM, 3-copy majority) */
  secondaryHash: string;
  /** SHA-512 hash from tertiary storage (holographic crystal archive) */
  tertiaryHash: string;
  /** Number of sections that required ECC reconstruction */
  corruptedSections: number;
  /** Number of sections that could not be recovered */
  unrecoverableSections: number;
}

/**
 * Verify blueprint integrity across triple-redundant storage.
 *
 * Protocol (Architecture §3.3):
 *   1. Verify global hash across all 3 storage copies
 *   2. If mismatch, perform section-level comparison
 *   3. Reconstruct corrupted sections from ECC
 *   4. If uncorrectable, attempt reconstruction from majority vote
 *   5. If unrecoverable, ABORT (blueprint integrity lost)
 */
export function verifyBlueprintIntegrity(input: BlueprintIntegrityInput): BlueprintIntegrityResult {
  const { primaryHash, secondaryHash, tertiaryHash, corruptedSections, unrecoverableSections } = input;

  const globalHashMatch = primaryHash === secondaryHash && secondaryHash === tertiaryHash;

  // Determine per-copy status
  // Use majority vote: if 2+ copies agree, the odd one out is corrupted
  const hashes = [primaryHash, secondaryHash, tertiaryHash];
  const majority = findMajorityHash(hashes);

  const copyStatus = (hash: string): "verified" | "corrupted" | "reconstructed" => {
    if (majority && hash === majority) return "verified";
    if (majority && hash !== majority && unrecoverableSections === 0) return "reconstructed";
    if (!majority || unrecoverableSections > 0) return "corrupted";
    return "corrupted";
  };

  const passed = unrecoverableSections === 0;

  return {
    globalHashMatch,
    sectionsReconstructed: corruptedSections,
    unrecoverableSections,
    storageCopies: {
      primary: copyStatus(primaryHash),
      secondary: copyStatus(secondaryHash),
      tertiary: copyStatus(tertiaryHash),
    },
    passed,
  };
}

/** Find the hash that appears in at least 2 of 3 copies (majority vote) */
function findMajorityHash(hashes: string[]): string | null {
  const [a, b, c] = hashes;
  if (a === b || a === c) return a;
  if (b === c) return b;
  return null; // all three differ — no majority
}

// ── L2: Component Dimensional Fidelity (Architecture §3.1 L2) ───────────────

/**
 * Verify that fabricated components are within blueprint dimensional tolerances.
 *
 * Each component's deviation is expressed as a fraction of tolerance:
 *   0.0 = perfect match, 1.0 = at tolerance limit, >1.0 = out of spec
 *
 * Tolerances per Architecture §3.1:
 *   Structural: +/- 10 μm
 *   Semiconductor features: +/- 100 nm
 */
export function verifyDimensionalFidelity(
  measurements: Map<ComponentId, number>,
): DimensionalFidelityResult {
  let componentsWithinTolerance = 0;
  const maxDeviations = new Map<ComponentId, number>();

  for (const [componentId, deviation] of measurements) {
    maxDeviations.set(componentId, deviation);
    if (deviation <= 1.0) {
      componentsWithinTolerance++;
    }
  }

  const componentsMeasured = measurements.size;
  const passed = componentsWithinTolerance === componentsMeasured;

  return {
    componentsMeasured,
    componentsWithinTolerance,
    maxDeviations,
    passed,
  };
}

// ── L3: Functional Equivalence (Architecture §3.1 L3) ───────────────────────

/**
 * Verify functional equivalence via per-subsystem test suites.
 *
 * Each subsystem is tested against its specification; this function
 * aggregates pass/fail results across all subsystems.
 */
export function verifyFunctionalEquivalence(
  testResults: Map<string, boolean>,
): FunctionalEquivalenceResult {
  let subsystemsPassed = 0;
  const failures = new Map<string, string>();

  for (const [subsystemId, passed] of testResults) {
    if (passed) {
      subsystemsPassed++;
    } else {
      failures.set(subsystemId, `Subsystem ${subsystemId} failed functional test`);
    }
  }

  const subsystemsTested = testResults.size;
  const passed = subsystemsPassed === subsystemsTested;

  return {
    subsystemsTested,
    subsystemsPassed,
    failures,
    passed,
  };
}

// ── Combined Fidelity Report ────────────────────────────────────────────────

/**
 * Generate a combined fidelity report from all three verification levels.
 * All three levels must pass for the overall report to pass.
 */
export function generateFidelityReport(
  blueprintIntegrity: BlueprintIntegrityResult,
  dimensionalFidelity: DimensionalFidelityResult,
  functionalEquivalence: FunctionalEquivalenceResult,
): FidelityReport {
  return {
    blueprintIntegrity,
    dimensionalFidelity,
    functionalEquivalence,
    allPassed:
      blueprintIntegrity.passed &&
      dimensionalFidelity.passed &&
      functionalEquivalence.passed,
  };
}
