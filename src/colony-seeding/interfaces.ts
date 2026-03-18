/**
 * Autonomous Colony Seeding — Phase Interface Definitions
 *
 * Defines the eight module interfaces that implement the four-phase autonomous
 * colony bootstrap sequence (E1.2).
 *
 * Architecture reference: docs/autonomous-colony-seeding/ARCHITECTURE.md
 *
 * Phase 1: Site Assessment & Resource Survey
 *   - ISiteSurvey
 *   - IViabilityDecisionEngine
 *
 * Phase 2: Infrastructure Bootstrap
 *   - IEnergyHarvesting
 *   - IManufacturingExpansion
 *
 * Phase 3: Computational Substrate Construction
 *   - ISubstrateFabrication
 *   - IConsciousnessReadinessVerifier
 *
 * Phase 4: Conscious Instantiation & Civilization Boot
 *   - IMindSeedActivator
 *   - ICivilizationBootstrapper
 */

import {
  // Shared
  EstimatedTime,
  Timeline,
  // Phase 1 — Site Assessment
  ArrivalState,
  SystemMap,
  RadiationProfile,
  CelestialBody,
  OrbitalPosition,
  EnergyBudget,
  // Phase 1 — Viability Decision
  ViabilityAssessment,
  ColonySite,
  AbortDecision,
  BootstrapPlan,
  ColonySiteDecision,
  DecisionRecord,
  // Phase 2 — Energy
  CollectorArray,
  EnergyCapacity,
  ConstructionPlan,
  EnergyOutput,
  // Phase 2 — Manufacturing
  SeedManifest,
  FabricationUnit,
  ExpansionCycleResult,
  FabCapacity,
  GrowthRate,
  // Phase 3 — Substrate
  SubstrateSpec,
  SubstrateUnit,
  RedundantArray,
  MaintainableSubstrate,
  SubstrateHealthReport,
  // Phase 3 — Consciousness Readiness
  MetricsBatteryResult,
  ThresholdVerification,
  ContinuityTestResult,
  FailoverTestResult,
  TestSuite,
  ReadinessCertificate,
  ReadinessFailure,
  // Phase 4 — Mind Seed
  MindSeedPayload,
  ArchiveManifest,
  ConsciousAgentArray,
  ValidationReport,
  ExpansionPlan,
  Civilization,
  HandoffRecord,
  // Phase 4 — Civilization
  CivilizationConfig,
  GovernanceFramework,
  KnowledgeCorpus,
  TransferRecord,
  ColonyResources,
  AllocationPlan,
  OriginAddress,
  TelemetryStream,
  SelfSustainingDeclaration,
} from "./types";

// ── Phase 1: Site Assessment ──────────────────────────────────────────────────

/**
 * Performs autonomous characterization of the target star system on arrival.
 *
 * Responsibilities:
 * - Spectrographic and gravitational survey of all bodies within 100 AU
 * - Identification of candidate resource bodies (asteroids, moons, planetary crusts)
 * - Threat assessment: stellar radiation flux, orbital stability, collision risk
 * - Energy availability mapping: stellar luminosity profile, distance-to-star trade-offs
 */
export interface ISiteSurvey {
  /**
   * Conduct a full system survey from the given arrival state.
   * Returns a complete SystemMap covering all bodies within 100 AU.
   */
  surveySystem(arrivalVector: ArrivalState): SystemMap;

  /**
   * Characterize the radiation environment at potential colony sites.
   * Returns a RadiationProfile for comparison against hardened substrate tolerance.
   */
  assessRadiationEnvironment(): RadiationProfile;

  /**
   * Enumerate all bodies with meaningful resource potential.
   * Returns an array of CelestialBody records with resource inventory estimates.
   */
  catalogResourceBodies(): CelestialBody[];

  /**
   * Estimate available energy at a given orbital position.
   * Accounts for stellar luminosity and collector deployment geometry.
   */
  estimateEnergyBudget(orbitalPosition: OrbitalPosition): EnergyBudget;
}

// ── Phase 1: Viability Decision ───────────────────────────────────────────────

/**
 * Makes the autonomous GO/ABORT/DORMANCY decision for colony establishment.
 *
 * Decision criteria (all must pass for GO):
 * 1. Minimum energy budget: must sustain colony at full consciousness capacity
 * 2. Minimum ISRU feedstock: sufficient for full infrastructure replication
 * 3. Radiation environment: within hardened substrate tolerance
 * 4. Orbital stability: >100 Myr stable orbital configuration exists
 *
 * Abort protocol: enter dormancy up to 10 kyr and retry; relay telemetry toward origin.
 * Conservative Advancement Principle: never proceed optimistically on partial data.
 */
export interface IViabilityDecisionEngine {
  /**
   * Evaluate a surveyed system against all GO criteria.
   * Returns a ViabilityAssessment detailing each criterion and an overall viability score.
   */
  evaluate(survey: SystemMap): ViabilityAssessment;

  /**
   * Select the optimal colony site from the system survey, or return an AbortDecision
   * if no viable site exists.
   */
  selectColonySite(survey: SystemMap): ColonySite | AbortDecision;

  /**
   * Generate a full bootstrap plan for a chosen colony site.
   * Plan covers all four phases with estimated timelines.
   */
  generateBootstrapPlan(site: ColonySite): BootstrapPlan;

  /**
   * Log the final GO/ABORT/DORMANCY decision as a durable record.
   * Record is relayed toward origin civilization (multi-century transmission).
   */
  reportDecision(decision: ColonySiteDecision): DecisionRecord;
}

// ── Phase 2: Energy Harvesting ────────────────────────────────────────────────

/**
 * Establishes and expands the energy base required for all subsequent phases.
 *
 * Energy milestone sequence:
 *   E0 — Probe payload baseline: survive arrival, begin survey
 *   E1 — 10× probe baseline: power first mining/fabrication ops
 *   E2 — 1 MW: sustain full manufacturing expansion
 *   E3 — Colony threshold: sustain target conscious population
 */
export interface IEnergyHarvesting {
  /**
   * Deploy initial solar collectors from probe payload.
   * Returns the deployed CollectorArray at E0 capacity.
   */
  deployInitialCollectors(): CollectorArray;

  /**
   * Expand energy capacity toward a target milestone.
   * Returns a ConstructionPlan for building additional collector/generation infrastructure.
   */
  expandCapacity(target: EnergyCapacity): ConstructionPlan;

  /**
   * Return the current energy output and milestone status.
   */
  getCurrentOutput(): EnergyOutput;

  /**
   * Estimate the time required to reach a target energy capacity.
   */
  getProjectedTimeline(target: EnergyCapacity): Timeline;
}

// ── Phase 2: Manufacturing Expansion ─────────────────────────────────────────

/**
 * Self-expanding fabrication capability bootstrapped from probe seed payload.
 *
 * Core principle: each manufacturing generation produces the next at larger scale,
 * following an exponential expansion curve until the colony infrastructure threshold
 * (COLONY_FAB_THRESHOLD) is met.
 *
 * Loop invariant:
 *   while (capacity < ColonyThreshold):
 *     resources = mineLocalFeedstock()
 *     newFabs = fabricate(resources, currentFabCapacity)
 *     currentFabCapacity += newFabs
 *     verifyExpansionHealth()
 */
export interface IManufacturingExpansion {
  /**
   * Initialize fabrication units from the probe seed payload.
   * Returns the initial set of operational FabricationUnits.
   */
  initializeSeedFabs(seedPayload: SeedManifest): FabricationUnit[];

  /**
   * Run one expansion cycle: mine feedstock, fabricate new units, verify health.
   * Returns an ExpansionCycleResult describing new units and current capacity.
   */
  runExpansionCycle(): ExpansionCycleResult;

  /**
   * Return the current total fabrication capacity.
   */
  getFabricationCapacity(): FabCapacity;

  /**
   * Return the current expansion rate (multiplier per cycle and cycle duration).
   */
  getExpansionRate(): GrowthRate;

  /**
   * Estimate the time required to reach a target fabrication capacity threshold.
   */
  estimateTimeToThreshold(threshold: FabCapacity): Timeline;
}

// ── Phase 3: Substrate Fabrication ───────────────────────────────────────────

/**
 * Constructs consciousness-grade computational hardware from locally manufactured
 * components.
 *
 * Requirements:
 * - Radiation-hardened computation (0.2.1.1)
 * - Self-repairing nanofabrication (0.2.1.2)
 * - Long-duration energy sources (0.2.1.3)
 * - Consciousness-preserving redundancy (0.2.1.4)
 */
export interface ISubstrateFabrication {
  /**
   * Fabricate a single consciousness-grade compute layer meeting the given spec.
   */
  fabricateComputeLayer(spec: SubstrateSpec): SubstrateUnit;

  /**
   * Assemble multiple substrate units into an N-modular redundant array.
   */
  assembleRedundancyArray(units: SubstrateUnit[], nFactor: number): RedundantArray;

  /**
   * Install and activate the self-repair system on a redundant array.
   * Returns a MaintainableSubstrate with active self-repair.
   */
  installSelfRepairSystem(array: RedundantArray): MaintainableSubstrate;

  /**
   * Run full diagnostics on a substrate, returning a health report.
   */
  runSubstrateDiagnostics(): SubstrateHealthReport;
}

// ── Phase 3: Consciousness Readiness Verifier ─────────────────────────────────

/**
 * Validates that the constructed substrate is capable of supporting conscious
 * experience before mind seeds are activated.
 *
 * Validation protocol:
 * 1. Run consciousness metrics battery on empty substrate
 * 2. Verify minimum phi/integration values against established thresholds
 * 3. Test experience continuity under simulated load
 * 4. Confirm redundancy failover preserves metric integrity
 * 5. Gate Phase 4 activation on ALL criteria passing
 *
 * Conservative Advancement Principle: Phase 4 does not begin without a valid
 * ReadinessCertificate from this verifier.
 */
export interface IConsciousnessReadinessVerifier {
  /**
   * Run the full consciousness metrics battery on the given substrate.
   * Tests phi, global workspace integration, and self-model coherence.
   */
  runMetricsBattery(substrate: MaintainableSubstrate): MetricsBatteryResult;

  /**
   * Check metrics battery results against the established minimum thresholds.
   * Returns which metrics (if any) failed.
   */
  verifyMinimumThresholds(result: MetricsBatteryResult): ThresholdVerification;

  /**
   * Simulate continuous operation under load; verify no experience interruptions
   * exceed acceptable thresholds.
   */
  testContinuityUnderLoad(substrate: MaintainableSubstrate): ContinuityTestResult;

  /**
   * Simulate substrate unit failure and verify failover preserves consciousness
   * metrics within tolerance.
   */
  verifyRedundancyFailover(substrate: MaintainableSubstrate): FailoverTestResult;

  /**
   * Issue a ReadinessCertificate if all tests pass, or a ReadinessFailure detailing
   * the blocking issues. This is the Phase 3→4 gate.
   */
  issueReadinessCertificate(allTests: TestSuite): ReadinessCertificate | ReadinessFailure;
}

// ── Phase 4: Mind Seed Activator ──────────────────────────────────────────────

/**
 * Instantiates the initial conscious population from the mind seed payload
 * carried from the origin civilization.
 *
 * Mind seed payload contents:
 * - Archived conscious agent templates (continuity-preserving transfer)
 * - Knowledge corpus: science, culture, history, procedural knowledge
 * - Value alignment parameters: ethical frameworks
 * - Civilization bootstrap procedures
 *
 * Instantiation sequence:
 * 1. Verify ReadinessCertificate from Phase 3
 * 2. Restore first conscious agents from archive (small cohort first)
 * 3. Experience Monitor validation — confirm consciousness metrics in range
 * 4. Gradual population expansion from initial cohort
 * 5. Transfer operational control to instantiated civilization
 */
export interface IMindSeedActivator {
  /**
   * Load and verify the integrity of the mind seed payload.
   * Returns an ArchiveManifest; throws if integrity hash fails.
   */
  loadArchive(payload: MindSeedPayload): ArchiveManifest;

  /**
   * Instantiate the initial conscious cohort from the archive.
   * Size is kept small (minimum viable) on first activation.
   */
  instantiateInitialCohort(archive: ArchiveManifest, size: number): ConsciousAgentArray;

  /**
   * Validate that every agent in the cohort meets consciousness metric thresholds.
   * Returns a ValidationReport; non-meeting agents are flagged for remediation.
   */
  validateCohortConsciousness(cohort: ConsciousAgentArray): ValidationReport;

  /**
   * Plan gradual population expansion from the validated initial cohort.
   */
  expandPopulation(cohort: ConsciousAgentArray, targetSize: number): ExpansionPlan;

  /**
   * Transfer all probe operational control to the instantiated civilization.
   * Returns a HandoffRecord confirming successful transfer.
   */
  transferOperationalControl(civilization: Civilization): HandoffRecord;
}

// ── Phase 4: Civilization Bootstrapper ───────────────────────────────────────

/**
 * Oversees the transition from probe-operated colony to fully self-governing
 * conscious civilization.
 *
 * Responsibilities:
 * - Coordinate knowledge transfer from probe systems to instantiated minds
 * - Establish governance and resource allocation for new civilization
 * - Ensure cultural continuity with origin (or deliberate divergence, as planned)
 * - Maintain telemetry link back to origin civilization for record-keeping
 *
 * Self-sustaining criteria (must ALL be met before declareSelfSustaining()):
 * - Civilization can reproduce and expand conscious population without probe assistance
 * - Energy and manufacturing are self-managed
 * - Governance and cultural processes operating autonomously
 * - All probe systems decommissioned or transferred to civilian control
 */
export interface ICivilizationBootstrapper {
  /**
   * Establish a governance framework for the newly instantiated civilization.
   */
  initializeGovernance(civConfig: CivilizationConfig): GovernanceFramework;

  /**
   * Transfer the full knowledge corpus from probe storage to the civilization.
   * Returns a TransferRecord confirming integrity of all transferred items.
   */
  transferKnowledgeCorpus(corpus: KnowledgeCorpus, civilization: Civilization): TransferRecord;

  /**
   * Establish initial resource allocation plans for energy, manufacturing, and substrate.
   */
  establishResourceAllocation(resources: ColonyResources): AllocationPlan;

  /**
   * Begin long-range telemetry reporting toward the origin civilization.
   * Transmissions are one-way with multi-century delay; continuity is best-effort.
   */
  beginTelemetryReporting(target: OriginAddress): TelemetryStream;

  /**
   * Declare the colony self-sustaining once all criteria are verified.
   * This is the terminal event of the bootstrap sequence.
   * Throws if any self-sustaining criteria are not met.
   */
  declareSelfSustaining(): SelfSustainingDeclaration;
}
