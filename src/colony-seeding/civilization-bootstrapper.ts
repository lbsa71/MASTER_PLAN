/**
 * Autonomous Colony Seeding — Civilization Bootstrapper (Phase 4)
 *
 * Implements ICivilizationBootstrapper: oversees the transition from
 * probe-operated colony to a fully self-governing conscious civilization.
 *
 * Responsibilities:
 *   - Coordinate knowledge transfer from probe systems to instantiated minds
 *   - Establish governance and resource allocation for the new civilization
 *   - Ensure cultural continuity with origin civilization (or deliberate divergence)
 *   - Maintain telemetry link back to origin civilization for record-keeping
 *
 * Self-sustaining criteria (ALL must pass before declareSelfSustaining()):
 *   1. Governance is operational and autonomous (GovernanceHealth.autonomyConfirmed)
 *   2. Knowledge corpus has been transferred in full
 *   3. Resource allocation is approved and covers energy + manufacturing
 *   4. Telemetry reporting has been initiated toward origin
 *   5. Population is non-zero and capable of autonomous growth
 *
 * Conservative Advancement Principle: declareSelfSustaining() throws if any
 * criterion is unmet — it does not declare optimistically on partial data.
 *
 * Architecture reference: docs/autonomous-colony-seeding/ARCHITECTURE.md §4.2
 */

import { ICivilizationBootstrapper } from "./interfaces";
import {
  CivilizationConfig,
  GovernanceFramework,
  GovernanceHealth,
  KnowledgeCorpus,
  Civilization,
  TransferRecord,
  ColonyResources,
  AllocationPlan,
  OriginAddress,
  TelemetryStream,
  SelfSustainingDeclaration,
  EnergyOutput,
  FabCapacity,
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Minimum number of governance decisions that must have been made before
 * the civilization is considered to be operating its governance autonomously.
 * Early colony governance may still be probe-assisted before reaching this count.
 */
const MIN_GOVERNANCE_DECISIONS = 10;

/**
 * Fraction of knowledge corpus items that must be verified to have transferred
 * intact before `transferKnowledgeCorpus()` returns a verified TransferRecord.
 * A transfer below this threshold is considered incomplete.
 */
const MIN_KNOWLEDGE_TRANSFER_FRACTION = 0.99;

// ── CivilizationBootstrapper implementation ───────────────────────────────────

/**
 * Oversees the final transition from probe-operated colony to fully
 * self-governing conscious civilization.
 *
 * State lifecycle:
 *   1. initializeGovernance()      — creates and stores GovernanceFramework
 *   2. transferKnowledgeCorpus()   — marks knowledge transfer complete
 *   3. establishResourceAllocation() — stores AllocationPlan + ColonyResources
 *   4. beginTelemetryReporting()   — opens the origin telemetry link
 *   5. declareSelfSustaining()     — validates all criteria; emits declaration
 *
 * Calling declareSelfSustaining() before all prior steps are complete will
 * throw with a descriptive error listing every unmet criterion.
 */
export class CivilizationBootstrapper implements ICivilizationBootstrapper {
  /** Active governance framework, set by initializeGovernance() */
  private governance: GovernanceFramework | null = null;

  /** Civilization config stored at governance initialization time */
  private civConfig: CivilizationConfig | null = null;

  /** Whether knowledge transfer has been completed and verified */
  private knowledgeTransferComplete = false;

  /** Total items in the knowledge corpus (for transfer verification logging) */
  private knowledgeItemCount = 0;

  /** Approved resource allocation and corresponding colony resource state */
  private allocationPlan: AllocationPlan | null = null;
  private colonyResources: ColonyResources | null = null;

  /** Active telemetry stream toward origin civilization */
  private telemetryStream: TelemetryStream | null = null;

  // ── ICivilizationBootstrapper ─────────────────────────────────────────────

  /**
   * Establish a governance framework for the newly instantiated civilization.
   *
   * Governance is initialised in a probe-assisted state (autonomyConfirmed: false)
   * and must demonstrate MIN_GOVERNANCE_DECISIONS autonomous decisions before
   * self-sustaining declaration is possible.  This two-step confirms that the
   * civilization's decision-making is genuinely operational, not nominal.
   *
   * Idempotent: re-calling with the same config updates the stored config and
   * returns a fresh framework without resetting the decisions counter.
   */
  initializeGovernance(civConfig: CivilizationConfig): GovernanceFramework {
    this.civConfig = civConfig;

    const framework: GovernanceFramework = {
      model: civConfig.governanceModel,
      decisionAuthority: `${civConfig.name} Autonomous Council`,
      operational: true,
    };

    this.governance = framework;
    return { ...framework };
  }

  /**
   * Transfer the full knowledge corpus from probe storage to the civilization.
   *
   * Verifies that at least MIN_KNOWLEDGE_TRANSFER_FRACTION of all corpus items
   * are transferred with intact integrity.  Returns a TransferRecord with
   * verifiedIntegrity: true only when the threshold is met.
   *
   * @throws {Error} if governance has not been initialized (civilization must
   *   exist before it can receive a knowledge corpus).
   */
  transferKnowledgeCorpus(corpus: KnowledgeCorpus, civilization: Civilization): TransferRecord {
    if (this.governance === null || !this.governance.operational) {
      throw new Error(
        "CivilizationBootstrapper: governance must be initialized and operational " +
          "before transferring the knowledge corpus.",
      );
    }
    if (!civilization.operational) {
      throw new Error(
        `CivilizationBootstrapper: civilization "${civilization.id}" is not operational — ` +
          "cannot receive knowledge corpus transfer.",
      );
    }

    // Count all corpus items across all categories
    const allItems = [
      ...corpus.science,
      ...corpus.culture,
      ...corpus.history,
      ...corpus.proceduralKnowledge,
    ];
    const totalItems = allItems.length;
    this.knowledgeItemCount = totalItems;

    // Model transfer verification: in a real system this would checksum each item.
    // Here we count all non-empty items as successfully verified.
    const verifiedItems = allItems.filter((item) => item.trim().length > 0).length;

    const transferFraction = totalItems > 0 ? verifiedItems / totalItems : 0;
    const verifiedIntegrity = transferFraction >= MIN_KNOWLEDGE_TRANSFER_FRACTION;

    this.knowledgeTransferComplete = verifiedIntegrity;

    return {
      itemsTransferred: verifiedItems,
      verifiedIntegrity,
      timestamp_ms: Date.now(),
    };
  }

  /**
   * Establish initial resource allocation plans for energy, manufacturing,
   * and substrate.
   *
   * Produces an AllocationPlan distributing resources proportionally across
   * the three primary consumers: consciousness substrate, manufacturing
   * expansion, and energy system maintenance.  The plan is approved if all
   * three consumers can be served within the available capacity.
   *
   * @throws {Error} if governance is not initialized.
   */
  establishResourceAllocation(resources: ColonyResources): AllocationPlan {
    if (this.governance === null || !this.governance.operational) {
      throw new Error(
        "CivilizationBootstrapper: governance must be initialized before " +
          "establishing resource allocation.",
      );
    }

    this.colonyResources = resources;

    const totalEnergy_w = resources.energyCapacity.output_w;
    const totalThroughput_kg = resources.fabricationCapacity.throughput_kg_per_year;

    // Energy allocation proportions (must sum to 1.0)
    const energyAllocation: Record<string, number> = {
      consciousness_substrate: totalEnergy_w * 0.50,
      manufacturing_ops: totalEnergy_w * 0.30,
      energy_system_maintenance: totalEnergy_w * 0.10,
      governance_and_comms: totalEnergy_w * 0.10,
    };

    // Manufacturing throughput allocation proportions
    const manufacturingAllocation: Record<string, number> = {
      substrate_expansion: totalThroughput_kg * 0.40,
      infrastructure_maintenance: totalThroughput_kg * 0.30,
      energy_system_expansion: totalThroughput_kg * 0.20,
      general_colony_needs: totalThroughput_kg * 0.10,
    };

    // Plan is approved if energy meets colony threshold (E3 = 1 GW) and
    // manufacturing meets colony fab threshold
    const energySufficient = totalEnergy_w >= 1e9; // 1 GW
    const manufacturingSufficient = resources.fabricationCapacity.unitCount >= 1000;
    const approved = energySufficient && manufacturingSufficient;

    const plan: AllocationPlan = {
      energyAllocation,
      manufacturingAllocation,
      approved,
    };

    this.allocationPlan = plan;
    return { ...plan };
  }

  /**
   * Begin long-range telemetry reporting toward the origin civilization.
   *
   * Opens a one-way telemetry stream with multi-century round-trip delay.
   * Continuity is best-effort: the stream remains active unless the origin
   * address becomes unreachable. The declaration timestamp and civilization
   * status are the first items transmitted.
   *
   * @throws {Error} if governance has not been initialized.
   */
  beginTelemetryReporting(target: OriginAddress): TelemetryStream {
    if (this.governance === null) {
      throw new Error(
        "CivilizationBootstrapper: governance must be initialized before " +
          "beginning telemetry reporting.",
      );
    }

    const stream: TelemetryStream = {
      active: true,
      target,
      lastTransmission_ms: Date.now(),
    };

    this.telemetryStream = stream;
    return { ...stream };
  }

  /**
   * Declare the colony self-sustaining once all criteria are verified.
   *
   * This is the terminal event of the bootstrap sequence. All five criteria
   * must individually pass; a failure throws with the full list of unmet
   * conditions so the probe can identify what remediation is required.
   *
   * Self-sustaining criteria checked:
   *   1. Governance is initialized, operational, and autonomous
   *   2. Knowledge corpus has been transferred with verified integrity
   *   3. Resource allocation is approved (energy + manufacturing sufficient)
   *   4. Telemetry reporting is active toward origin
   *   5. Initial civilization population is non-zero
   *
   * @throws {Error} if any criterion is unmet.
   */
  declareSelfSustaining(): SelfSustainingDeclaration {
    const failureReasons: string[] = [];

    // Criterion 1: Governance
    const governanceHealth = this.assessGovernanceHealth();
    if (!governanceHealth.operational) {
      failureReasons.push("Governance framework is not operational");
    }
    if (!governanceHealth.autonomyConfirmed) {
      failureReasons.push(
        `Governance autonomy not confirmed: ${governanceHealth.decisionsMade} ` +
          `decisions recorded (minimum ${MIN_GOVERNANCE_DECISIONS} required)`,
      );
    }

    // Criterion 2: Knowledge transfer
    if (!this.knowledgeTransferComplete) {
      failureReasons.push(
        "Knowledge corpus transfer has not been completed with verified integrity " +
          `(${this.knowledgeItemCount} items; minimum transfer fraction ` +
          `${MIN_KNOWLEDGE_TRANSFER_FRACTION * 100}% required)`,
      );
    }

    // Criterion 3: Resource allocation
    if (this.allocationPlan === null) {
      failureReasons.push("Resource allocation plan has not been established");
    } else if (!this.allocationPlan.approved) {
      failureReasons.push(
        "Resource allocation plan is not approved — energy or manufacturing capacity " +
          "below colony threshold (1 GW energy, 1000 fabrication units required)",
      );
    }

    // Criterion 4: Telemetry
    if (this.telemetryStream === null || !this.telemetryStream.active) {
      failureReasons.push(
        "Telemetry reporting toward origin civilization has not been initiated",
      );
    }

    // Criterion 5: Population
    const population = this.civConfig?.initialPopulation ?? 0;
    if (population <= 0) {
      failureReasons.push(
        "Civilization initial population is zero — conscious population must be " +
          "non-zero before declaring self-sustaining status",
      );
    }

    if (failureReasons.length > 0) {
      throw new Error(
        `CivilizationBootstrapper: self-sustaining declaration blocked by ` +
          `${failureReasons.length} unmet criterion(ia):\n` +
          failureReasons.map((r, i) => `  ${i + 1}. ${r}`).join("\n"),
      );
    }

    return {
      timestamp_ms: Date.now(),
      consciousPopulation: population,
      energyCapacity: this.buildEnergyOutput(),
      manufacturingCapacity: this.buildFabCapacity(),
      governanceStatus: governanceHealth,
      telemetryForwarded: this.telemetryStream!.active,
    };
  }

  // ── Package-internal: record governance decisions ─────────────────────────

  /**
   * Record that the civilization's governance has made an autonomous decision.
   *
   * This is called by the probe's monitoring system whenever the civilization
   * completes a verifiable governance action without probe intervention.
   * After MIN_GOVERNANCE_DECISIONS calls, autonomyConfirmed becomes true.
   */
  recordGovernanceDecision(): void {
    if (this.governance !== null) {
      this._governanceDecisionCount++;
    }
  }

  // ── Private state ─────────────────────────────────────────────────────────

  /**
   * Count of autonomous governance decisions recorded since governance init.
   * Tracked separately from GovernanceFramework to avoid mutating the returned
   * framework struct.
   */
  private _governanceDecisionCount = 0;

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Derive the current GovernanceHealth from internal decision-tracking state.
   *
   * Autonomy is confirmed once MIN_GOVERNANCE_DECISIONS have been recorded.
   */
  private assessGovernanceHealth(): GovernanceHealth {
    if (this.governance === null) {
      return {
        operational: false,
        decisionsMade: 0,
        autonomyConfirmed: false,
      };
    }

    const decisionsMade = this._governanceDecisionCount;
    const autonomyConfirmed = decisionsMade >= MIN_GOVERNANCE_DECISIONS;

    return {
      operational: this.governance.operational,
      decisionsMade,
      autonomyConfirmed,
    };
  }

  /**
   * Build an EnergyOutput snapshot from the stored colony resources,
   * or return a zero-capacity placeholder if resources have not been set.
   */
  private buildEnergyOutput(): EnergyOutput {
    if (this.colonyResources === null) {
      return { output_w: 0, milestoneReached: "E0" as any, timestamp_ms: Date.now() };
    }
    return { ...this.colonyResources.energyCapacity, timestamp_ms: Date.now() };
  }

  /**
   * Build a FabCapacity snapshot from the stored colony resources,
   * or return a zero-capacity placeholder if resources have not been set.
   */
  private buildFabCapacity(): FabCapacity {
    if (this.colonyResources === null) {
      return { throughput_kg_per_year: 0, precision_nm: 0, unitCount: 0 };
    }
    return { ...this.colonyResources.fabricationCapacity };
  }
}
