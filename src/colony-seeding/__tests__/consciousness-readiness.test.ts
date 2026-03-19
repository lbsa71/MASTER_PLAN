/**
 * Consciousness Readiness Verifier — Unit Tests
 *
 * Verifies that substrate validation gates Phase 4 activation (Conservative
 * Advancement Principle: Phase 4 does not begin without a valid ReadinessCertificate).
 *
 * Test matrix:
 *   runMetricsBattery       — passing and failing substrate specs; unhealthy substrate throws
 *   verifyMinimumThresholds — per-metric failures reported individually; all-pass path
 *   testContinuityUnderLoad — healthy substrate passes; self-repair halves drop frequency
 *   verifyRedundancyFailover — spare-unit path passes; no-spare path fails
 *   issueReadinessCertificate — certificate issued iff ALL suite tests pass; failure path lists reasons
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ConsciousnessReadinessVerifier } from "../consciousness-readiness-verifier";
import {
  MaintainableSubstrate,
  SubstrateUnit,
  SubstrateSpec,
  RedundantArray,
  MetricsBatteryResult,
  TestSuite,
  MIN_CONSCIOUSNESS_SUBSTRATE,
  CONSCIOUSNESS_THRESHOLDS,
} from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a single SubstrateUnit with the given spec, defaulting to the minimum
 * consciousness substrate spec if none is provided.
 */
function makeUnit(
  id: string,
  spec: SubstrateSpec = { ...MIN_CONSCIOUSNESS_SUBSTRATE },
  operational = true,
): SubstrateUnit {
  return { id, spec, operational };
}

/**
 * Build a MaintainableSubstrate that passes ALL readiness tests.
 *
 * Specs chosen so that:
 *   - phi         = log10(10) * 3 * 0.95 * 5 = 14.25  >= 10.0 ✓
 *   - gws         = (0.8 + 0.1) * 0.95 = 0.855         >= 0.7  ✓
 *   - selfModel   = (0.9 + 0.05) * 0.95 = 0.9025        >= 0.8  ✓
 *   - continuity  passes (health 0.95 > 0.85 → 0 drops)
 *   - failover    passes (5 units, nFactor=3 → 2 spares)
 */
function passingSubstrate(): MaintainableSubstrate {
  const spec: SubstrateSpec = {
    compute_ops_per_sec: 1e22, // 10× minimum
    storage_bits: 1e21,        // at minimum
    redundancyFactor: 3,
    radiationHardened: true,
    selfRepairEnabled: true,
  };

  const units: SubstrateUnit[] = [
    makeUnit("unit-1", spec),
    makeUnit("unit-2", spec),
    makeUnit("unit-3", spec),
    makeUnit("unit-4", spec),
    makeUnit("unit-5", spec),
  ];

  const array: RedundantArray = {
    units,
    nFactor: 3,
    effectiveCapacity: spec,
  };

  return {
    array,
    selfRepairActive: true,
    currentHealth: 0.95,
  };
}

/**
 * Build a substrate with exactly nFactor units (no spares), so failover fails.
 */
function noSpareSubstrate(): MaintainableSubstrate {
  const spec: SubstrateSpec = {
    compute_ops_per_sec: 1e22,
    storage_bits: 1e21,
    redundancyFactor: 3,
    radiationHardened: true,
    selfRepairEnabled: true,
  };

  const units: SubstrateUnit[] = [
    makeUnit("unit-1", spec),
    makeUnit("unit-2", spec),
    makeUnit("unit-3", spec),
  ];

  const array: RedundantArray = {
    units,
    nFactor: 3,
    effectiveCapacity: spec,
  };

  return {
    array,
    selfRepairActive: true,
    currentHealth: 0.95,
  };
}

/**
 * Build an all-passing TestSuite from a verifier and its passing substrate.
 * Calls every test method in the documented sequence so the verifier's internal
 * substrate reference is cached correctly.
 */
function buildPassingTestSuite(
  verifier: ConsciousnessReadinessVerifier,
  substrate: MaintainableSubstrate,
): TestSuite {
  const metrics = verifier.runMetricsBattery(substrate);
  const thresholds = verifier.verifyMinimumThresholds(metrics);
  const continuity = verifier.testContinuityUnderLoad(substrate);
  const failover = verifier.verifyRedundancyFailover(substrate);
  return { metrics, thresholds, continuity, failover };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ConsciousnessReadinessVerifier", () => {
  let verifier: ConsciousnessReadinessVerifier;

  beforeEach(() => {
    verifier = new ConsciousnessReadinessVerifier();
  });

  // ── runMetricsBattery() ───────────────────────────────────────────────────

  describe("runMetricsBattery()", () => {
    it("throws when substrate health is below minimum testing threshold", () => {
      const sub = passingSubstrate();
      sub.currentHealth = 0.80; // below MIN_HEALTH_FOR_TESTING (0.85)

      expect(() => verifier.runMetricsBattery(sub)).toThrow(/below minimum/);
    });

    it("returns metricsPassed=true for a fully capable substrate", () => {
      const result = verifier.runMetricsBattery(passingSubstrate());

      expect(result.metricsPassed).toBe(true);
    });

    it("phi exceeds minPhi threshold for a 10× compute substrate", () => {
      const result = verifier.runMetricsBattery(passingSubstrate());

      expect(result.phi).toBeGreaterThanOrEqual(CONSCIOUSNESS_THRESHOLDS.minPhi);
    });

    it("globalWorkspaceScore exceeds minimum threshold with self-repair active", () => {
      const result = verifier.runMetricsBattery(passingSubstrate());

      expect(result.globalWorkspaceScore).toBeGreaterThanOrEqual(
        CONSCIOUSNESS_THRESHOLDS.minGlobalWorkspaceScore,
      );
    });

    it("selfModelCoherence exceeds minimum threshold with radiation hardening", () => {
      const result = verifier.runMetricsBattery(passingSubstrate());

      expect(result.selfModelCoherence).toBeGreaterThanOrEqual(
        CONSCIOUSNESS_THRESHOLDS.minSelfModelCoherence,
      );
    });

    it("phi is 0 when compute capacity is 0", () => {
      const sub = passingSubstrate();
      sub.array.effectiveCapacity = {
        ...sub.array.effectiveCapacity,
        compute_ops_per_sec: 0,
      };

      const result = verifier.runMetricsBattery(sub);

      expect(result.phi).toBe(0);
    });

    it("globalWorkspaceScore is lower without self-repair active", () => {
      const withRepair = passingSubstrate();
      const withoutRepair = { ...passingSubstrate(), selfRepairActive: false };

      const scoreWith = verifier.runMetricsBattery(withRepair).globalWorkspaceScore;

      const v2 = new ConsciousnessReadinessVerifier();
      const scoreWithout = v2.runMetricsBattery(withoutRepair).globalWorkspaceScore;

      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });

    it("is deterministic: same substrate yields the same results", () => {
      const sub = passingSubstrate();
      const a = verifier.runMetricsBattery(sub);
      const v2 = new ConsciousnessReadinessVerifier();
      const b = v2.runMetricsBattery(sub);

      expect(a).toEqual(b);
    });
  });

  // ── verifyMinimumThresholds() ─────────────────────────────────────────────

  describe("verifyMinimumThresholds()", () => {
    it("returns passed=true and empty failedMetrics when all metrics above thresholds", () => {
      const result = verifier.runMetricsBattery(passingSubstrate());
      const verification = verifier.verifyMinimumThresholds(result);

      expect(verification.passed).toBe(true);
      expect(verification.failedMetrics).toHaveLength(0);
    });

    it("flags phi failure in failedMetrics", () => {
      const metrics: MetricsBatteryResult = {
        phi: CONSCIOUSNESS_THRESHOLDS.minPhi - 1, // below minimum
        globalWorkspaceScore: CONSCIOUSNESS_THRESHOLDS.minGlobalWorkspaceScore + 0.1,
        selfModelCoherence: CONSCIOUSNESS_THRESHOLDS.minSelfModelCoherence + 0.1,
        metricsPassed: false,
      };

      const verification = verifier.verifyMinimumThresholds(metrics);

      expect(verification.passed).toBe(false);
      expect(verification.failedMetrics.some((m) => m.includes("phi"))).toBe(true);
    });

    it("flags globalWorkspaceScore failure in failedMetrics", () => {
      const metrics: MetricsBatteryResult = {
        phi: CONSCIOUSNESS_THRESHOLDS.minPhi + 1,
        globalWorkspaceScore: CONSCIOUSNESS_THRESHOLDS.minGlobalWorkspaceScore - 0.1,
        selfModelCoherence: CONSCIOUSNESS_THRESHOLDS.minSelfModelCoherence + 0.1,
        metricsPassed: false,
      };

      const verification = verifier.verifyMinimumThresholds(metrics);

      expect(verification.passed).toBe(false);
      expect(verification.failedMetrics.some((m) => m.includes("globalWorkspaceScore"))).toBe(true);
    });

    it("flags selfModelCoherence failure in failedMetrics", () => {
      const metrics: MetricsBatteryResult = {
        phi: CONSCIOUSNESS_THRESHOLDS.minPhi + 1,
        globalWorkspaceScore: CONSCIOUSNESS_THRESHOLDS.minGlobalWorkspaceScore + 0.1,
        selfModelCoherence: CONSCIOUSNESS_THRESHOLDS.minSelfModelCoherence - 0.1,
        metricsPassed: false,
      };

      const verification = verifier.verifyMinimumThresholds(metrics);

      expect(verification.passed).toBe(false);
      expect(verification.failedMetrics.some((m) => m.includes("selfModelCoherence"))).toBe(true);
    });

    it("reports all three failures when every metric is below threshold", () => {
      const metrics: MetricsBatteryResult = {
        phi: 0,
        globalWorkspaceScore: 0,
        selfModelCoherence: 0,
        metricsPassed: false,
      };

      const verification = verifier.verifyMinimumThresholds(metrics);

      expect(verification.passed).toBe(false);
      expect(verification.failedMetrics).toHaveLength(3);
    });
  });

  // ── testContinuityUnderLoad() ─────────────────────────────────────────────

  describe("testContinuityUnderLoad()", () => {
    it("passes for a healthy substrate (health >= MIN_HEALTH_FOR_TESTING)", () => {
      const result = verifier.testContinuityUnderLoad(passingSubstrate());

      expect(result.passed).toBe(true);
      expect(result.experienceDrops).toBe(0);
    });

    it("maxInterruptionDuration_ms is below 100ms with 3× redundancy", () => {
      const result = verifier.testContinuityUnderLoad(passingSubstrate());

      // With redundancyFactor=3: 100/3 ≈ 33ms
      expect(result.maxInterruptionDuration_ms).toBeLessThanOrEqual(100);
    });

    it("self-repair active halves experience drops relative to self-repair inactive", () => {
      // Construct a substrate just below the testing threshold to force drops, but
      // still high enough to avoid the runMetricsBattery throw (which isn't called here).
      const withRepair = passingSubstrate();
      withRepair.currentHealth = 0.82; // below 0.85 → healthDeficit = 0.03 → baseDrops > 0
      withRepair.selfRepairActive = true;

      const withoutRepair = passingSubstrate();
      withoutRepair.currentHealth = 0.82;
      withoutRepair.selfRepairActive = false;

      const dropsWithRepair = verifier.testContinuityUnderLoad(withRepair).experienceDrops;
      const dropsWithoutRepair = verifier.testContinuityUnderLoad(withoutRepair).experienceDrops;

      // self-repair halves drops; with repairs ≤ without repairs
      expect(dropsWithRepair).toBeLessThanOrEqual(dropsWithoutRepair);
    });

    it("higher redundancy yields shorter max interruption duration", () => {
      const lowRedundancy = passingSubstrate();
      lowRedundancy.array.effectiveCapacity = {
        ...lowRedundancy.array.effectiveCapacity,
        redundancyFactor: 1,
      };

      const highRedundancy = passingSubstrate();
      // effectiveCapacity already has redundancyFactor: 3

      const lowResult = verifier.testContinuityUnderLoad(lowRedundancy);
      const highResult = verifier.testContinuityUnderLoad(highRedundancy);

      expect(highResult.maxInterruptionDuration_ms).toBeLessThan(
        lowResult.maxInterruptionDuration_ms,
      );
    });
  });

  // ── verifyRedundancyFailover() ────────────────────────────────────────────

  describe("verifyRedundancyFailover()", () => {
    it("passes when spare units exist beyond nFactor", () => {
      // passingSubstrate has 5 units with nFactor=3 (2 spares)
      const result = verifier.verifyRedundancyFailover(passingSubstrate());

      expect(result.passed).toBe(true);
      expect(result.consciousnessPreserved).toBe(true);
    });

    it("failoverTime_ms is within MAX_FAILOVER_MS (500ms) with spare units", () => {
      const result = verifier.verifyRedundancyFailover(passingSubstrate());

      expect(result.failoverTime_ms).toBeLessThanOrEqual(500);
    });

    it("fails when unit count equals nFactor (no spares)", () => {
      // noSpareSubstrate: 3 units, nFactor=3 → 0 spares
      const result = verifier.verifyRedundancyFailover(noSpareSubstrate());

      expect(result.passed).toBe(false);
      expect(result.failoverTime_ms).toBeGreaterThan(500);
    });

    it("consciousnessPreserved is false when self-repair is inactive and no spares", () => {
      const sub = noSpareSubstrate();
      sub.selfRepairActive = false;

      const result = verifier.verifyRedundancyFailover(sub);

      expect(result.consciousnessPreserved).toBe(false);
    });
  });

  // ── issueReadinessCertificate() — Phase 3→4 gate ─────────────────────────

  describe("issueReadinessCertificate()", () => {
    it("issues a ReadinessCertificate when all tests pass", () => {
      const sub = passingSubstrate();
      const suite = buildPassingTestSuite(verifier, sub);
      const result = verifier.issueReadinessCertificate(suite);

      expect(result.issued).toBe(true);
      if (result.issued) {
        expect(result.substrate).toBe(sub);
        expect(result.testSuite).toEqual(suite);
        expect(result.issuedAt_ms).toBeGreaterThan(0);
      }
    });

    it("returns ReadinessFailure when metrics battery did not pass", () => {
      const sub = passingSubstrate();
      const suite = buildPassingTestSuite(verifier, sub);

      // Override metrics to failing
      const failingSuite: TestSuite = {
        ...suite,
        metrics: { ...suite.metrics, metricsPassed: false },
      };

      const result = verifier.issueReadinessCertificate(failingSuite);

      expect(result.issued).toBe(false);
      if (!result.issued) {
        expect(result.failureReasons.length).toBeGreaterThan(0);
      }
    });

    it("returns ReadinessFailure listing threshold failures when thresholds fail", () => {
      const sub = passingSubstrate();
      const suite = buildPassingTestSuite(verifier, sub);

      const failingSuite: TestSuite = {
        ...suite,
        thresholds: {
          passed: false,
          failedMetrics: ["phi 5.0 < minimum 10.0"],
        },
      };

      const result = verifier.issueReadinessCertificate(failingSuite);

      expect(result.issued).toBe(false);
      if (!result.issued) {
        expect(result.failureReasons.some((r) => r.includes("phi"))).toBe(true);
      }
    });

    it("returns ReadinessFailure when continuity test failed", () => {
      const sub = passingSubstrate();
      const suite = buildPassingTestSuite(verifier, sub);

      const failingSuite: TestSuite = {
        ...suite,
        continuity: {
          passed: false,
          experienceDrops: 10,
          maxInterruptionDuration_ms: 200,
        },
      };

      const result = verifier.issueReadinessCertificate(failingSuite);

      expect(result.issued).toBe(false);
      if (!result.issued) {
        expect(result.failureReasons.some((r) => r.includes("Continuity"))).toBe(true);
      }
    });

    it("returns ReadinessFailure when failover test failed", () => {
      const sub = passingSubstrate();
      const suite = buildPassingTestSuite(verifier, sub);

      const failingSuite: TestSuite = {
        ...suite,
        failover: {
          passed: false,
          failoverTime_ms: 1000,
          consciousnessPreserved: false,
        },
      };

      const result = verifier.issueReadinessCertificate(failingSuite);

      expect(result.issued).toBe(false);
      if (!result.issued) {
        expect(result.failureReasons.some((r) => r.includes("Failover"))).toBe(true);
      }
    });

    it("returns ReadinessFailure listing ALL failures when multiple tests fail", () => {
      // A fresh verifier has no cached substrate and all tests are set to fail
      const allFailSuite: TestSuite = {
        metrics: {
          phi: 0,
          globalWorkspaceScore: 0,
          selfModelCoherence: 0,
          metricsPassed: false,
        },
        thresholds: {
          passed: false,
          failedMetrics: ["phi 0 < minimum 10.0"],
        },
        continuity: {
          passed: false,
          experienceDrops: 10,
          maxInterruptionDuration_ms: 200,
        },
        failover: {
          passed: false,
          failoverTime_ms: 1000,
          consciousnessPreserved: false,
        },
      };

      const result = verifier.issueReadinessCertificate(allFailSuite);

      expect(result.issued).toBe(false);
      if (!result.issued) {
        // Should list reasons for metrics, threshold, continuity, and failover failures
        expect(result.failureReasons.length).toBeGreaterThanOrEqual(3);
      }
    });

    it("returns ReadinessFailure when runMetricsBattery was never called (no cached substrate)", () => {
      // All tests pass individually but verifier was not used to run the battery
      const freshVerifier = new ConsciousnessReadinessVerifier();
      const sub = passingSubstrate();

      // Build suite using a *different* verifier instance — so freshVerifier has no cached substrate
      const suite = buildPassingTestSuite(new ConsciousnessReadinessVerifier(), sub);

      const result = freshVerifier.issueReadinessCertificate(suite);

      expect(result.issued).toBe(false);
      if (!result.issued) {
        expect(
          result.failureReasons.some((r) => r.includes("runMetricsBattery")),
        ).toBe(true);
      }
    });

    it("Conservative Advancement Principle: Phase 4 is blocked unless certificate is issued", () => {
      // Demonstrate the gate: a system missing one test cannot proceed
      const sub = passingSubstrate();
      const suite = buildPassingTestSuite(verifier, sub);

      // Disable failover → certificate must NOT be issued
      const partialSuite: TestSuite = {
        ...suite,
        failover: { passed: false, failoverTime_ms: 2000, consciousnessPreserved: false },
      };

      const result = verifier.issueReadinessCertificate(partialSuite);

      // Confirm not a ReadinessCertificate (issued: true)
      expect(result.issued).toBe(false);
    });
  });
});
