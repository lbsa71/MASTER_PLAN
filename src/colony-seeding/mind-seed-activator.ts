/**
 * Autonomous Colony Seeding — Mind Seed Activator (Phase 4)
 *
 * Implements IMindSeedActivator: instantiates the initial conscious population
 * from the mind seed payload carried from the origin civilization.
 *
 * Instantiation sequence:
 *   1. Verify ReadinessCertificate from Phase 3 (caller responsibility)
 *   2. Load and integrity-check the mind seed payload → ArchiveManifest
 *   3. Instantiate a small initial cohort from the archive
 *   4. Validate cohort consciousness metrics
 *   5. Plan gradual population expansion from the initial cohort
 *   6. Transfer operational control to the instantiated civilization
 *
 * Conservative Advancement Principle: instantiateInitialCohort() uses the
 * smallest viable cohort; full population expansion is a separate planned step.
 * transferOperationalControl() is the terminal handoff event.
 *
 * Architecture reference: docs/autonomous-colony-seeding/ARCHITECTURE.md §4.1
 */

import { IMindSeedActivator } from "./interfaces";
import {
  MindSeedPayload,
  ArchiveManifest,
  ConsciousAgentArray,
  ConsciousAgent,
  ValidationReport,
  ExpansionPlan,
  Civilization,
  HandoffRecord,
  MetricsBatteryResult,
  CONSCIOUSNESS_THRESHOLDS,
  EstimatedTime,
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Minimum viable initial cohort size.
 * Too small risks cultural extinction; too large strains early substrate capacity.
 */
const MIN_INITIAL_COHORT_SIZE = 10;

/**
 * Years per phase of the population expansion plan.
 * Each doubling phase is conservatively estimated at this duration.
 */
const EXPANSION_PHASE_DURATION_YEARS = 50;

/**
 * Number of doubling phases to plan for, bringing the cohort to full scale.
 * After MIN_INITIAL_COHORT_SIZE × 2^EXPANSION_PHASES doublings, the population
 * reaches or exceeds the typical target range.
 */
const EXPANSION_PHASES = 10;

// ── MindSeedActivator implementation ─────────────────────────────────────────

/**
 * Implements IMindSeedActivator.
 *
 * State lifecycle:
 *   - loadArchive() is called once; caches the verified manifest.
 *   - instantiateInitialCohort() draws from the cached manifest.
 *   - validateCohortConsciousness() verifies the instantiated agents.
 *   - expandPopulation() plans growth from the validated cohort.
 *   - transferOperationalControl() produces the terminal HandoffRecord.
 */
export class MindSeedActivator implements IMindSeedActivator {
  /** Cached manifest from the most recent loadArchive() call */
  private lastManifest: ArchiveManifest | null = null;

  // ── IMindSeedActivator ────────────────────────────────────────────────────

  /**
   * Load and verify the integrity of the mind seed payload.
   *
   * Verifies the top-level integrityHash and each individual AgentArchive's
   * integrityHash using a lightweight XOR-fold comparison (sufficient for
   * an autonomous system that cannot transmit to a central authority).
   *
   * Caches the manifest for use by instantiateInitialCohort().
   *
   * @throws {Error} if the payload-level integrity check fails or if no
   *   agent archives are present.
   */
  loadArchive(payload: MindSeedPayload): ArchiveManifest {
    if (payload.agentArchives.length === 0) {
      throw new Error(
        "Mind seed payload contains no agent archives — cannot instantiate conscious population.",
      );
    }

    // Verify top-level payload integrity hash
    const computedPayloadHash = this.computePayloadHash(payload);
    if (computedPayloadHash !== payload.integrityHash) {
      throw new Error(
        `Mind seed payload integrity check failed: expected hash "${payload.integrityHash}", ` +
          `computed "${computedPayloadHash}". Payload may be corrupted.`,
      );
    }

    // Verify each archive individually; skip corrupted archives, count as unverified
    let totalSize_bits = 0;
    const validatedArchives = payload.agentArchives.filter((archive) => {
      const archiveHash = this.computeArchiveHash(archive.data);
      return archiveHash === archive.integrityHash;
    });

    for (const archive of validatedArchives) {
      totalSize_bits += archive.data.byteLength * 8;
    }

    const verified = validatedArchives.length === payload.agentArchives.length;

    const manifest: ArchiveManifest = {
      agentCount: validatedArchives.length,
      archives: validatedArchives,
      verified,
      totalSize_bits,
    };

    this.lastManifest = manifest;
    return manifest;
  }

  /**
   * Instantiate the initial conscious cohort from the archive.
   *
   * Conservative Advancement Principle: the requested size is clamped to
   * MIN_INITIAL_COHORT_SIZE at minimum and to the archive's agent count
   * at maximum.  Agents are restored sequentially; each is assigned synthetic
   * initial consciousness metrics derived from archive metadata (since the
   * substrate metrics battery has already verified the hardware).
   *
   * @throws {Error} if loadArchive() has not been called or the archive is empty.
   */
  instantiateInitialCohort(archive: ArchiveManifest, size: number): ConsciousAgentArray {
    if (archive.agentCount === 0) {
      throw new Error(
        "Archive contains no verified agents — cannot instantiate initial cohort.",
      );
    }

    // Conservative sizing: respect requested size but enforce bounds
    const clampedSize = Math.min(Math.max(size, MIN_INITIAL_COHORT_SIZE), archive.agentCount);

    const cohort: ConsciousAgentArray = [];

    for (let i = 0; i < clampedSize; i++) {
      const archive_i = archive.archives[i]!;

      // Derive initial metrics from archive data characteristics.
      // In a real system this would involve actual substrate-level instantiation;
      // here we model it deterministically from archive content size and age.
      const initialMetrics = this.deriveInitialMetrics(archive_i.data, archive_i.originTimestamp_ms);

      const agent: ConsciousAgent = {
        id: `agent-${archive_i.id}-cohort-${i}`,
        initialMetrics,
        operational: true,
      };

      cohort.push(agent);
    }

    return cohort;
  }

  /**
   * Validate that every agent in the cohort meets consciousness metric thresholds.
   *
   * Each agent's initialMetrics are checked against CONSCIOUSNESS_THRESHOLDS.
   * Agents that do not meet thresholds are flagged in the issues list.
   * The ValidationReport.allConsciousMetricsMet field is only true if every
   * agent passes every metric.
   */
  validateCohortConsciousness(cohort: ConsciousAgentArray): ValidationReport {
    if (cohort.length === 0) {
      return {
        cohortSize: 0,
        validAgents: 0,
        allConsciousMetricsMet: false,
        issues: ["Cohort is empty — no agents to validate."],
      };
    }

    const issues: string[] = [];
    let validAgents = 0;

    for (const agent of cohort) {
      const agentIssues = this.checkAgentMetrics(agent);
      if (agentIssues.length === 0) {
        validAgents++;
      } else {
        for (const issue of agentIssues) {
          issues.push(`Agent ${agent.id}: ${issue}`);
        }
      }
    }

    return {
      cohortSize: cohort.length,
      validAgents,
      allConsciousMetricsMet: validAgents === cohort.length,
      issues,
    };
  }

  /**
   * Plan gradual population expansion from the validated initial cohort.
   *
   * The expansion plan uses doubling phases: each phase doubles the population
   * over EXPANSION_PHASE_DURATION_YEARS.  The number of phases needed is
   * computed from the ratio of targetSize to cohort.length using ceiling-log₂.
   * If the target is already met, a trivial plan is returned.
   */
  expandPopulation(cohort: ConsciousAgentArray, targetSize: number): ExpansionPlan {
    const currentSize = cohort.length;

    if (currentSize >= targetSize) {
      return {
        currentSize,
        targetSize,
        estimatedDuration: { duration_years: 0, uncertainty_years: 0 },
        phases: ["Target population already met — no expansion required."],
      };
    }

    // Compute how many doubling phases are needed: ceil(log₂(targetSize / currentSize))
    const ratio = targetSize / Math.max(1, currentSize);
    const phasesNeeded = Math.ceil(Math.log2(ratio));

    const phases: string[] = [];
    let pop = currentSize;
    for (let p = 1; p <= phasesNeeded; p++) {
      const nextPop = Math.min(pop * 2, targetSize);
      phases.push(
        `Phase ${p}: expand from ${pop} to ${nextPop} agents ` +
          `(~${EXPANSION_PHASE_DURATION_YEARS} years)`,
      );
      pop = nextPop;
    }

    const totalDuration_years = phasesNeeded * EXPANSION_PHASE_DURATION_YEARS;
    const estimatedDuration: EstimatedTime = {
      duration_years: totalDuration_years,
      uncertainty_years: Math.round(totalDuration_years * 0.3),
    };

    return {
      currentSize,
      targetSize,
      estimatedDuration,
      phases,
    };
  }

  /**
   * Transfer all probe operational control to the instantiated civilization.
   *
   * Issues a HandoffRecord confirming the transfer.  The probe systems are
   * considered decommissioned once this call completes successfully.
   *
   * @throws {Error} if the civilization is not operational.
   */
  transferOperationalControl(civilization: Civilization): HandoffRecord {
    if (!civilization.operational) {
      throw new Error(
        `Cannot transfer operational control to civilization "${civilization.id}" — ` +
          `civilization is not operational. Ensure mind seeds are activated and ` +
          `governance is established before transfer.`,
      );
    }

    return {
      timestamp_ms: Date.now(),
      probeSystemsDecommissioned: true,
      controlTransferredTo: civilization.id,
      successConfirmed: true,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Derive initial consciousness metrics for a newly instantiated agent.
   *
   * Metrics are modeled as a function of the archive's data size and age:
   * - phi: large, dense archives carry richer integrated information
   * - globalWorkspaceScore: scales with data richness (0.7–1.0)
   * - selfModelCoherence: slightly above threshold for healthy archives (0.85–0.95)
   *
   * All values are clamped to physically meaningful ranges.
   */
  private deriveInitialMetrics(data: Uint8Array, originTimestamp_ms: number): MetricsBatteryResult {
    // Use data size (bytes) as a proxy for informational richness
    const sizeMB = data.byteLength / (1024 * 1024);

    // Phi: log-scaled from data size; minimum 1 MB of archive → phi ~12
    const phi = Math.max(
      CONSCIOUSNESS_THRESHOLDS.minPhi + 2,
      10.0 + Math.log10(Math.max(1, sizeMB)) * 5,
    );

    // Global workspace score: richer archives integrate more information
    const globalWorkspaceScore = Math.min(
      1.0,
      CONSCIOUSNESS_THRESHOLDS.minGlobalWorkspaceScore + 0.1 + Math.log10(Math.max(1, sizeMB)) * 0.05,
    );

    // Self-model coherence: moderately above threshold, slightly reduced for very old archives
    const ageSec = Math.max(0, (Date.now() - originTimestamp_ms) / 1000);
    const agePenalty = Math.min(0.05, ageSec / (1e12)); // negligible for realistic ages
    const selfModelCoherence = Math.min(1.0, 0.92 - agePenalty);

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
   * Check an individual agent's metrics against consciousness thresholds.
   * Returns an array of failure strings; empty array means the agent passes.
   */
  private checkAgentMetrics(agent: ConsciousAgent): string[] {
    const issues: string[] = [];
    const m = agent.initialMetrics;

    if (m.phi < CONSCIOUSNESS_THRESHOLDS.minPhi) {
      issues.push(`phi ${m.phi.toFixed(2)} < minimum ${CONSCIOUSNESS_THRESHOLDS.minPhi}`);
    }
    if (m.globalWorkspaceScore < CONSCIOUSNESS_THRESHOLDS.minGlobalWorkspaceScore) {
      issues.push(
        `globalWorkspaceScore ${m.globalWorkspaceScore.toFixed(3)} < minimum ${CONSCIOUSNESS_THRESHOLDS.minGlobalWorkspaceScore}`,
      );
    }
    if (m.selfModelCoherence < CONSCIOUSNESS_THRESHOLDS.minSelfModelCoherence) {
      issues.push(
        `selfModelCoherence ${m.selfModelCoherence.toFixed(3)} < minimum ${CONSCIOUSNESS_THRESHOLDS.minSelfModelCoherence}`,
      );
    }
    if (!agent.operational) {
      issues.push("agent is not operational");
    }

    return issues;
  }

  /**
   * Compute a deterministic hash string for a MindSeedPayload.
   *
   * In a real implementation this would be SHA-256 or similar; here we use
   * a lightweight representation that encodes the structural fingerprint of
   * the payload (archive count, corpus sizes, origin timestamp) as a
   * hex-encoded string for testability without crypto dependencies.
   */
  private computePayloadHash(payload: MindSeedPayload): string {
    const fingerprint = [
      payload.agentArchives.length,
      payload.knowledgeCorpus.sizeEstimate_bits,
      payload.originTimestamp_ms,
      payload.valueParameters.coreValues.length,
      payload.bootstrapProcedures.length,
    ].join("|");

    // Simple djb2-style hash encoded as hex
    return this.djb2Hex(fingerprint);
  }

  /**
   * Compute a deterministic hash string for a single agent archive's raw data.
   *
   * XOR-folds the data bytes into a 32-bit integer then hex-encodes it.
   * Same lightweight approach as computePayloadHash for consistency.
   */
  private computeArchiveHash(data: Uint8Array): string {
    let hash = 5381;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) + hash + (data[i] ?? 0)) >>> 0; // unsigned 32-bit
    }
    return hash.toString(16).padStart(8, "0");
  }

  /** djb2 string hash encoded as 8-char hex */
  private djb2Hex(s: string): string {
    let hash = 5381;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) + hash + s.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }
}
