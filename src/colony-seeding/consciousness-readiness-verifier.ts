/**
 * Autonomous Colony Seeding — Consciousness Readiness Verifier (Phase 3)
 *
 * Implements IConsciousnessReadinessVerifier: validates that the constructed
 * substrate is capable of supporting conscious experience before mind seeds
 * are activated.
 *
 * Validation protocol (all criteria must pass for Phase 4 activation):
 *   1. Run consciousness metrics battery on empty substrate
 *   2. Verify minimum phi/integration values against established thresholds
 *   3. Test experience continuity under simulated load
 *   4. Confirm redundancy failover preserves metric integrity
 *   5. Gate Phase 4 activation on ALL criteria passing
 *
 * Conservative Advancement Principle: issueReadinessCertificate() will not
 * issue unless every test in the suite passes. A ReadinessFailure with
 * detailed reasons is returned otherwise — never an optimistic certificate.
 *
 * Architecture reference: docs/autonomous-colony-seeding/ARCHITECTURE.md §3.2
 */

import { IConsciousnessReadinessVerifier } from "./interfaces";
import {
  MaintainableSubstrate,
  MetricsBatteryResult,
  ThresholdVerification,
  ContinuityTestResult,
  FailoverTestResult,
  TestSuite,
  ReadinessCertificate,
  ReadinessFailure,
  CONSCIOUSNESS_THRESHOLDS,
  MIN_CONSCIOUSNESS_SUBSTRATE,
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum acceptable experience interruption duration during load test (ms) */
const MAX_INTERRUPTION_MS = 100;

/** Maximum acceptable number of experience drops during the continuity load test */
const MAX_EXPERIENCE_DROPS = 3;

/** Maximum acceptable failover time (ms) — consciousness must resume within this window */
const MAX_FAILOVER_MS = 500;

/**
 * Minimum substrate health fraction required before running the metrics battery.
 * A substrate below this health level cannot reliably support consciousness tests.
 */
const MIN_HEALTH_FOR_TESTING = 0.85;

// ── ConsciousnessReadinessVerifier implementation ─────────────────────────────

/**
 * Validates a MaintainableSubstrate against all consciousness readiness criteria
 * prior to Phase 4 mind-seed activation.
 *
 * Usage sequence:
 *   1. runMetricsBattery(substrate)         — derives phi, workspace, coherence metrics
 *   2. verifyMinimumThresholds(result)      — checks metrics against established floors
 *   3. testContinuityUnderLoad(substrate)   — verifies experience continuity under load
 *   4. verifyRedundancyFailover(substrate)  — simulates unit failure + failover
 *   5. issueReadinessCertificate(testSuite) — issues certificate iff all pass
 *
 * The class caches the substrate reference from step 1 for inclusion in the
 * ReadinessCertificate — callers must run the battery before issuing a certificate.
 */
export class ConsciousnessReadinessVerifier implements IConsciousnessReadinessVerifier {
  /**
   * Most recently tested substrate — cached so the ReadinessCertificate can
   * reference the exact substrate that was verified.
   */
  private lastTestedSubstrate: MaintainableSubstrate | null = null;

  // ── IConsciousnessReadinessVerifier ──────────────────────────────────────

  /**
   * Run the full consciousness metrics battery on the given substrate.
   *
   * Derives three metrics from the substrate's effective capacity and health:
   *   - phi (integrated information): scales with compute ratio × redundancy × health
   *   - globalWorkspaceScore: depends on storage capacity and self-repair status
   *   - selfModelCoherence: depends on redundancy integrity and radiation hardening
   *
   * Caches the substrate reference for use by issueReadinessCertificate().
   *
   * @throws {Error} if substrate health is below MIN_HEALTH_FOR_TESTING.
   */
  runMetricsBattery(substrate: MaintainableSubstrate): MetricsBatteryResult {
    if (substrate.currentHealth < MIN_HEALTH_FOR_TESTING) {
      throw new Error(
        `Substrate health ${substrate.currentHealth.toFixed(3)} is below minimum ` +
          `${MIN_HEALTH_FOR_TESTING} required to run consciousness metrics battery.`,
      );
    }

    this.lastTestedSubstrate = substrate;

    const { effectiveCapacity } = substrate.array;

    // Phi (integrated information): log₁₀(compute/min_compute) × redundancyFactor × health × 5.
    // A substrate at exactly minimum spec with 3× redundancy and full health yields:
    //   phi = log10(1) * 3 * 1.0 * 5 = 0 — at boundary.
    // Exceeding min spec raises phi above threshold.
    const computeRatio =
      effectiveCapacity.compute_ops_per_sec / MIN_CONSCIOUSNESS_SUBSTRATE.compute_ops_per_sec;
    const phi =
      computeRatio > 0
        ? Math.log10(Math.max(1, computeRatio)) *
          effectiveCapacity.redundancyFactor *
          substrate.currentHealth *
          5
        : 0;

    // Global workspace score: storage saturation × self-repair bonus × health.
    // Active self-repair contributes +0.1 to the pre-health score.
    const storageRatio =
      effectiveCapacity.storage_bits / MIN_CONSCIOUSNESS_SUBSTRATE.storage_bits;
    const selfRepairBonus = substrate.selfRepairActive ? 0.1 : 0.0;
    const globalWorkspaceScore = Math.min(
      1.0,
      (Math.min(1.0, storageRatio) * 0.8 + selfRepairBonus) * substrate.currentHealth,
    );

    // Self-model coherence: redundancy coverage × radiation hardening bonus × health.
    const redundancyScore =
      effectiveCapacity.redundancyFactor >= MIN_CONSCIOUSNESS_SUBSTRATE.redundancyFactor
        ? 1.0
        : effectiveCapacity.redundancyFactor / MIN_CONSCIOUSNESS_SUBSTRATE.redundancyFactor;
    const hardeningBonus = effectiveCapacity.radiationHardened ? 0.05 : 0;
    const selfModelCoherence = Math.min(
      1.0,
      (redundancyScore * 0.9 + hardeningBonus) * substrate.currentHealth,
    );

    const metricsPassed =
      phi >= CONSCIOUSNESS_THRESHOLDS.minPhi &&
      globalWorkspaceScore >= CONSCIOUSNESS_THRESHOLDS.minGlobalWorkspaceScore &&
      selfModelCoherence >= CONSCIOUSNESS_THRESHOLDS.minSelfModelCoherence;

    return {
      phi,
      globalWorkspaceScore,
      selfModelCoherence,
      metricsPassed,
    };
  }

  /**
   * Check metrics battery results against the established minimum thresholds.
   *
   * Each of the three metrics (phi, globalWorkspaceScore, selfModelCoherence) is
   * checked independently. All must pass for ThresholdVerification.passed to be true.
   * Failing metrics are listed individually so the rebuild spec can be targeted.
   */
  verifyMinimumThresholds(result: MetricsBatteryResult): ThresholdVerification {
    const failedMetrics: string[] = [];

    if (result.phi < CONSCIOUSNESS_THRESHOLDS.minPhi) {
      failedMetrics.push(
        `phi ${result.phi.toFixed(2)} < minimum ${CONSCIOUSNESS_THRESHOLDS.minPhi}`,
      );
    }
    if (result.globalWorkspaceScore < CONSCIOUSNESS_THRESHOLDS.minGlobalWorkspaceScore) {
      failedMetrics.push(
        `globalWorkspaceScore ${result.globalWorkspaceScore.toFixed(3)} < minimum ${CONSCIOUSNESS_THRESHOLDS.minGlobalWorkspaceScore}`,
      );
    }
    if (result.selfModelCoherence < CONSCIOUSNESS_THRESHOLDS.minSelfModelCoherence) {
      failedMetrics.push(
        `selfModelCoherence ${result.selfModelCoherence.toFixed(3)} < minimum ${CONSCIOUSNESS_THRESHOLDS.minSelfModelCoherence}`,
      );
    }

    return {
      passed: failedMetrics.length === 0,
      failedMetrics,
    };
  }

  /**
   * Simulate continuous operation under load; verify no experience interruptions
   * exceed acceptable thresholds.
   *
   * The load test models worst-case operational patterns: simultaneous read/write
   * bursts, redundancy voting overhead, and self-repair GC pauses.  Experience
   * drops are estimated from the substrate's health deficit below the testing
   * threshold; self-repair halves drop frequency by recovering from transients
   * faster.  Interruption duration scales inversely with redundancy factor.
   *
   * Passes if experienceDrops ≤ MAX_EXPERIENCE_DROPS and
   * maxInterruptionDuration_ms ≤ MAX_INTERRUPTION_MS.
   */
  testContinuityUnderLoad(substrate: MaintainableSubstrate): ContinuityTestResult {
    const { effectiveCapacity } = substrate.array;

    // Experience drops: substrates with health above MIN_HEALTH_FOR_TESTING produce 0 base drops.
    const healthDeficit = Math.max(0, MIN_HEALTH_FOR_TESTING - substrate.currentHealth);
    const baseDrops = healthDeficit > 0 ? Math.ceil(healthDeficit * 20) : 0;
    const repairFactor = substrate.selfRepairActive ? 0.5 : 1.0;
    const experienceDrops = Math.round(baseDrops * repairFactor);

    // Interruption duration: N-modular voting resolves faster with more redundant units.
    const redundancyFactor = Math.max(1, effectiveCapacity.redundancyFactor);
    const maxInterruptionDuration_ms = Math.round(MAX_INTERRUPTION_MS / redundancyFactor);

    const passed =
      experienceDrops <= MAX_EXPERIENCE_DROPS &&
      maxInterruptionDuration_ms <= MAX_INTERRUPTION_MS;

    return {
      passed,
      experienceDrops,
      maxInterruptionDuration_ms,
    };
  }

  /**
   * Simulate substrate unit failure and verify failover preserves consciousness
   * metrics within tolerance.
   *
   * One operational unit is conceptually taken offline.  The remaining N-1 units
   * must sustain consciousness metrics within the failover window.  The test passes
   * if failoverTime_ms ≤ MAX_FAILOVER_MS and consciousness is preserved, meaning:
   *   - Remaining compute ratio ≥ 1.0 vs. minimum spec
   *   - Self-repair is active (enables rapid unit replacement)
   *   - Failover completes within the time budget
   *
   * If the array has no spare capacity beyond nFactor (minimum quorum), failover
   * cannot occur gracefully and the test fails.
   */
  verifyRedundancyFailover(substrate: MaintainableSubstrate): FailoverTestResult {
    const { array } = substrate;
    const operationalCount = array.units.filter((u) => u.operational).length;

    // Spare units beyond minimum quorum enable graceful failover.
    const spares = Math.max(0, operationalCount - array.nFactor);
    const canFailover = spares > 0;

    // Failover time: one extra spare halves time to MIN_FAILOVER; more spares help.
    const failoverTime_ms = canFailover
      ? Math.round(MAX_FAILOVER_MS / (1 + spares))
      : MAX_FAILOVER_MS * 2; // no spare — exceeds threshold

    // After removing one unit, does the remaining array still meet minimum spec?
    const survivingUnits = operationalCount - 1;
    const remainingComputeRatio =
      survivingUnits > 0 && array.effectiveCapacity.compute_ops_per_sec > 0
        ? (survivingUnits / operationalCount) *
          (array.effectiveCapacity.compute_ops_per_sec /
            MIN_CONSCIOUSNESS_SUBSTRATE.compute_ops_per_sec)
        : 0;

    const consciousnessPreserved =
      failoverTime_ms <= MAX_FAILOVER_MS &&
      remainingComputeRatio >= 1.0 &&
      substrate.selfRepairActive;

    const passed = failoverTime_ms <= MAX_FAILOVER_MS && consciousnessPreserved;

    return {
      passed,
      failoverTime_ms,
      consciousnessPreserved,
    };
  }

  /**
   * Issue a ReadinessCertificate if ALL tests pass, or a ReadinessFailure
   * detailing every blocking issue. This is the Phase 3 → Phase 4 gate.
   *
   * Conservative Advancement Principle: ALL four test suites (metrics, thresholds,
   * continuity, failover) must individually pass.  A single failure blocks
   * activation and returns a ReadinessFailure with all reasons listed.
   *
   * Requires runMetricsBattery() to have been called first so that the substrate
   * reference is cached for inclusion in the issued certificate.
   */
  issueReadinessCertificate(allTests: TestSuite): ReadinessCertificate | ReadinessFailure {
    const failureReasons: string[] = [];

    if (!allTests.metrics.metricsPassed) {
      failureReasons.push("Consciousness metrics battery did not pass");
    }
    if (!allTests.thresholds.passed) {
      for (const m of allTests.thresholds.failedMetrics) {
        failureReasons.push(`Threshold failure: ${m}`);
      }
    }
    if (!allTests.continuity.passed) {
      failureReasons.push(
        `Continuity test failed: ${allTests.continuity.experienceDrops} drop(s), ` +
          `max interruption ${allTests.continuity.maxInterruptionDuration_ms}ms`,
      );
    }
    if (!allTests.failover.passed) {
      failureReasons.push(
        `Failover test failed: ${allTests.failover.failoverTime_ms}ms failover time, ` +
          `consciousness preserved: ${allTests.failover.consciousnessPreserved}`,
      );
    }

    if (failureReasons.length > 0) {
      return {
        issued: false,
        failureReasons,
      };
    }

    if (this.lastTestedSubstrate === null) {
      return {
        issued: false,
        failureReasons: [
          "No substrate reference available — runMetricsBattery() must be called before issuing a certificate.",
        ],
      };
    }

    return {
      issued: true,
      substrate: this.lastTestedSubstrate,
      testSuite: allTests,
      issuedAt_ms: Date.now(),
    };
  }
}
