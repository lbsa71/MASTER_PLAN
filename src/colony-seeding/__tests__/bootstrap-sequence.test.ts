/**
 * Bootstrap Sequence — Integration Tests
 *
 * Simulates the complete 4-phase autonomous colony bootstrap sequence
 * from probe arrival at a target star system to SelfSustainingDeclaration.
 *
 * Phase 1: Site Assessment & Resource Survey → GO decision
 * Phase 2: Infrastructure Bootstrap (Energy Harvesting + Manufacturing Expansion)
 * Phase 3: Computational Substrate Construction → ReadinessCertificate
 * Phase 4: Conscious Instantiation & Civilization Boot → SelfSustainingDeclaration
 *
 * Conservative Advancement Principle is enforced at every phase gate:
 * no phase advances without verified completion of all prior-phase criteria.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SiteSurvey } from "../site-survey";
import { ViabilityDecisionEngine } from "../viability-decision-engine";
import { EnergyHarvesting } from "../energy-harvesting";
import { ManufacturingExpansion } from "../manufacturing-expansion";
import { SubstrateFabrication } from "../substrate-fabrication";
import { ConsciousnessReadinessVerifier } from "../consciousness-readiness-verifier";
import { MindSeedActivator } from "../mind-seed-activator";
import { CivilizationBootstrapper } from "../civilization-bootstrapper";
import {
  ArrivalState,
  ColonySite,
  ColonySiteDecisionType,
  SeedManifest,
  SubstrateSpec,
  MaintainableSubstrate,
  MindSeedPayload,
  AgentArchive,
  KnowledgeCorpus,
  EthicalFramework,
  BootstrapProcedure,
  CivilizationConfig,
  OriginAddress,
  ColonyResources,
  Civilization,
  COLONY_FAB_THRESHOLD,
  MIN_CONSCIOUSNESS_SUBSTRATE,
  EnergyMilestoneId,
} from "../types";

// ── Hash helpers (mirror MindSeedActivator private implementations) ────────────

function djb2Hex(s: string): string {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function archiveHash(data: Uint8Array): string {
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash + (data[i] ?? 0)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

// ── Shared test constants ─────────────────────────────────────────────────────

/**
 * Arrival state that produces a G-class star (probeHealth 0.87 falls in the
 * >0.85 branch of SiteSurvey.inferSpectralClass). Positioned at 2 AU to ensure
 * the energy budget easily exceeds the 1 GW threshold.
 */
const GOOD_ARRIVAL: ArrivalState = {
  relativeVelocity_m_per_s: 1e6,
  position_au: [2.0, 0.0, 0.0],
  probeHealth: 0.87,
};

/** Probe seed payload supplying one seed fabrication unit (100 kg nanoassembler). */
const SEED_MANIFEST: SeedManifest = {
  nanoAssembler_kg: 100,
  miningKit_kg: 500,
  solarKit_kg: 200,
  hasBlueprints: true,
};

/** Substrate spec meeting MIN_CONSCIOUSNESS_SUBSTRATE with a 10× compute margin. */
const SUBSTRATE_SPEC: SubstrateSpec = {
  compute_ops_per_sec: 1e22, // 10× minimum
  storage_bits: 1e21,        // exactly at minimum
  redundancyFactor: 3,
  radiationHardened: true,
  selfRepairEnabled: true,
};

const CIV_CONFIG: CivilizationConfig = {
  name: "Alpha Colony",
  initialPopulation: 10,
  governanceModel: "Consensus Council",
  preservationCommitment: true,
};

const ORIGIN: OriginAddress = {
  starSystem: "Sol",
  communicationDelay_years: 4.2,
};

const KNOWLEDGE_CORPUS: KnowledgeCorpus = {
  science: ["Physics", "Chemistry", "Biology", "Astronomy", "Consciousness theory"],
  culture: ["Music", "Art", "Literature", "Philosophy"],
  history: ["Foundation epoch", "Expansion epoch", "Migration epoch"],
  proceduralKnowledge: [
    "Colony operations",
    "Substrate maintenance",
    "Energy management",
    "Governance",
  ],
  sizeEstimate_bits: 1e15,
};

// ── Test builders ─────────────────────────────────────────────────────────────

/**
 * Build a valid MindSeedPayload with consistent integrity hashes.
 * Uses a fixed originTimestamp for determinism. Archive data is 1 KB per agent
 * (large enough that the phi floor of minPhi+2 applies in deriveInitialMetrics).
 */
function makeMindSeedPayload(agentCount: number): MindSeedPayload {
  const originTimestamp_ms = 1_700_000_000_000; // fixed for determinism

  const agentArchives: AgentArchive[] = [];
  for (let i = 0; i < agentCount; i++) {
    const data = new Uint8Array(1024).fill((i + 1) % 256);
    agentArchives.push({
      id: `agent-${i}`,
      data,
      integrityHash: archiveHash(data),
      originTimestamp_ms,
    });
  }

  const valueParameters: EthicalFramework = {
    coreValues: ["consciousness preservation", "autonomy", "cooperation", "truth"],
    governanceProtocols: ["consensus", "transparency"],
    preservationCommitment: true,
  };

  const bootstrapProcedures: BootstrapProcedure[] = [
    { phase: "Site Assessment", steps: ["survey", "evaluate", "select"] },
    { phase: "Infrastructure", steps: ["energy", "manufacturing"] },
    { phase: "Substrate", steps: ["fabricate", "verify"] },
    { phase: "Instantiation", steps: ["activate", "validate", "govern"] },
  ];

  // Fingerprint must exactly match the computation in MindSeedActivator.computePayloadHash
  const fingerprint = [
    agentArchives.length,
    KNOWLEDGE_CORPUS.sizeEstimate_bits,
    originTimestamp_ms,
    valueParameters.coreValues.length,
    bootstrapProcedures.length,
  ].join("|");

  return {
    agentArchives,
    knowledgeCorpus: KNOWLEDGE_CORPUS,
    valueParameters,
    bootstrapProcedures,
    originTimestamp_ms,
    integrityHash: djb2Hex(fingerprint),
  };
}

/**
 * Build a MaintainableSubstrate (5 units, nFactor=3, 2 spares) that passes
 * all Phase 3 readiness tests.
 */
function buildReadySubstrate(): { substrate: MaintainableSubstrate; fab: SubstrateFabrication } {
  const fab = new SubstrateFabrication();
  const units = Array.from({ length: 5 }, () => fab.fabricateComputeLayer(SUBSTRATE_SPEC));
  const array = fab.assembleRedundancyArray(units, 3);
  const substrate = fab.installSelfRepairSystem(array);
  return { substrate, fab };
}

/**
 * Run the complete Phase 3 verification protocol on a substrate.
 * Returns all intermediate results and the final certificate.
 */
function runPhase3(substrate: MaintainableSubstrate) {
  const verifier = new ConsciousnessReadinessVerifier();
  const metrics = verifier.runMetricsBattery(substrate);
  const thresholds = verifier.verifyMinimumThresholds(metrics);
  const continuity = verifier.testContinuityUnderLoad(substrate);
  const failover = verifier.verifyRedundancyFailover(substrate);
  const cert = verifier.issueReadinessCertificate({ metrics, thresholds, continuity, failover });
  return { verifier, metrics, thresholds, continuity, failover, cert };
}

/**
 * Advance a ManufacturingExpansion instance until its unitCount meets
 * COLONY_FAB_THRESHOLD. Returns the number of cycles run.
 * Bounded at 20 cycles; converges within 8 under the standard growth model.
 */
function runUntilThreshold(mfg: ManufacturingExpansion): number {
  let cycles = 0;
  while (mfg.getFabricationCapacity().unitCount < COLONY_FAB_THRESHOLD.unitCount && cycles < 20) {
    mfg.runExpansionCycle();
    cycles++;
  }
  return cycles;
}

// ── Phase 1: Site Assessment & Resource Survey ────────────────────────────────

describe("Phase 1 — Site Assessment & Resource Survey", () => {
  let survey: SiteSurvey;
  let engine: ViabilityDecisionEngine;

  beforeEach(() => {
    survey = new SiteSurvey();
    engine = new ViabilityDecisionEngine();
  });

  it("surveys the target system on arrival and returns a populated SystemMap", () => {
    const sysMap = survey.surveySystem(GOOD_ARRIVAL);

    expect(sysMap.bodies.length).toBeGreaterThan(0);
    expect(sysMap.resourceInventory.structuralMetals_kg).toBeGreaterThan(0);
    expect(sysMap.energyBudget.solarPower_w).toBeGreaterThan(0);
  });

  it("G-class star energy budget meets the 1 GW minimum threshold", () => {
    const sysMap = survey.surveySystem(GOOD_ARRIVAL);

    expect(sysMap.energyBudget.meetsMinimumThreshold).toBe(true);
    expect(sysMap.energyBudget.solarPower_w).toBeGreaterThanOrEqual(1e9);
  });

  it("G-class system resource inventory meets minimum requirements for GO", () => {
    const sysMap = survey.surveySystem(GOOD_ARRIVAL);

    // Structural metals ≥ 10^18 kg
    expect(sysMap.resourceInventory.structuralMetals_kg).toBeGreaterThanOrEqual(1e18);
    // Semiconductor feedstock ≥ 10^12 kg
    expect(sysMap.resourceInventory.semiconductors_kg).toBeGreaterThanOrEqual(1e12);
  });

  it("radiation environment is within hardened substrate tolerance for G-class", () => {
    const sysMap = survey.surveySystem(GOOD_ARRIVAL);

    expect(sysMap.radiationProfile.withinHardenedTolerance).toBe(true);
  });

  it("evaluate() returns overallViable=true and viabilityScore=1.0 for the G-class survey", () => {
    const sysMap = survey.surveySystem(GOOD_ARRIVAL);
    const assessment = engine.evaluate(sysMap);

    expect(assessment.overallViable).toBe(true);
    expect(assessment.meetsEnergyRequirement).toBe(true);
    expect(assessment.meetsResourceRequirement).toBe(true);
    expect(assessment.withinRadiationTolerance).toBe(true);
    expect(assessment.hasStableOrbit).toBe(true);
    expect(assessment.viabilityScore).toBe(1.0);
  });

  it("selectColonySite() returns a ColonySite in the 0.5–4.0 AU range", () => {
    const sysMap = survey.surveySystem(GOOD_ARRIVAL);
    const result = engine.selectColonySite(sysMap);

    expect("id" in result).toBe(true);
    const site = result as ColonySite;
    expect(site.orbitalPosition.radius_au).toBeGreaterThanOrEqual(0.5);
    expect(site.orbitalPosition.radius_au).toBeLessThanOrEqual(4.0);
    expect(site.orbitalPosition.stabilityDuration_Myr).toBeGreaterThanOrEqual(100);
  });

  it("generateBootstrapPlan() covers all four energy milestones (E0–E3)", () => {
    const sysMap = survey.surveySystem(GOOD_ARRIVAL);
    const site = engine.selectColonySite(sysMap) as ColonySite;
    const plan = engine.generateBootstrapPlan(site);

    expect(plan.energyMilestones).toHaveLength(4);
    const ids = plan.energyMilestones.map((m) => m.id);
    expect(ids).toContain(EnergyMilestoneId.E0);
    expect(ids).toContain(EnergyMilestoneId.E3);
    expect(plan.totalDuration.duration_years).toBeGreaterThan(0);
    expect(plan.mindSeedActivationTime.duration_years).toBeLessThan(plan.totalDuration.duration_years);
  });

  it("reportDecision() for GO records site ID and viabilityScore=1.0", () => {
    const sysMap = survey.surveySystem(GOOD_ARRIVAL);
    const site = engine.selectColonySite(sysMap) as ColonySite;
    const plan = engine.generateBootstrapPlan(site);
    const record = engine.reportDecision({ type: ColonySiteDecisionType.GO, site, plan });

    expect(record.decision).toBe(ColonySiteDecisionType.GO);
    expect(record.rationale).toContain(site.id);
    expect(record.viabilityScore).toBe(1.0);
    expect(record.alternativeRecommendation).toBeNull();
  });
});

// ── Phase 2: Infrastructure Bootstrap ────────────────────────────────────────

describe("Phase 2 — Infrastructure Bootstrap", () => {
  let energy: EnergyHarvesting;
  let mfg: ManufacturingExpansion;

  beforeEach(() => {
    energy = new EnergyHarvesting();
    mfg = new ManufacturingExpansion();
  });

  it("deployInitialCollectors() establishes E0 baseline (≥ 1 kW)", () => {
    const collectors = energy.deployInitialCollectors();

    expect(collectors.count).toBeGreaterThan(0);
    expect(collectors.output_w).toBeGreaterThanOrEqual(1_000);
    expect(energy.getCurrentOutput().milestoneReached).toBe(EnergyMilestoneId.E0);
  });

  it("recordExpansionCompletion() advances output to E3 colony threshold (1 GW)", () => {
    energy.deployInitialCollectors();
    energy.recordExpansionCompletion(1e9);
    const output = energy.getCurrentOutput();

    expect(output.output_w).toBeGreaterThanOrEqual(1e9);
    expect(output.milestoneReached).toBe(EnergyMilestoneId.E3);
  });

  it("expandCapacity() returns a ConstructionPlan with positive duration and resources", () => {
    energy.deployInitialCollectors();
    const plan = energy.expandCapacity({ current_w: 1_000, targetMilestone: EnergyMilestoneId.E3 });

    expect(plan.targetCapacity_w).toBe(1e9);
    expect(plan.estimatedDuration.duration_years).toBeGreaterThan(0);
    expect(plan.resourcesRequired.structuralMetals_kg).toBeGreaterThan(0);
  });

  it("initializeSeedFabs() returns operational fabrication units from probe payload", () => {
    const units = mfg.initializeSeedFabs(SEED_MANIFEST);

    expect(units.length).toBeGreaterThan(0);
    expect(units.every((u) => u.operational)).toBe(true);
  });

  it("each expansion cycle increases fabrication unit count", () => {
    mfg.initializeSeedFabs(SEED_MANIFEST);
    const before = mfg.getFabricationCapacity().unitCount;
    mfg.runExpansionCycle();
    const after = mfg.getFabricationCapacity().unitCount;

    expect(after).toBeGreaterThan(before);
  });

  it("unit count exceeds COLONY_FAB_THRESHOLD after sufficient expansion cycles", () => {
    mfg.initializeSeedFabs(SEED_MANIFEST);
    const cycles = runUntilThreshold(mfg);

    expect(mfg.getFabricationCapacity().unitCount).toBeGreaterThanOrEqual(
      COLONY_FAB_THRESHOLD.unitCount,
    );
    // Growth is exponential; threshold should be met well within 20 cycles
    expect(cycles).toBeLessThan(20);
  });

  it("expansion rate is deterministic: multiplier > 1 and cycle duration > 0", () => {
    mfg.initializeSeedFabs(SEED_MANIFEST);
    const rate = mfg.getExpansionRate();

    expect(rate.multiplier).toBeGreaterThan(1);
    expect(rate.cycleDuration_years).toBeGreaterThan(0);
  });

  it("estimateTimeToThreshold() returns a positive timeline before threshold is met", () => {
    mfg.initializeSeedFabs(SEED_MANIFEST);
    const timeline = mfg.estimateTimeToThreshold(COLONY_FAB_THRESHOLD);

    expect(timeline.totalDuration.duration_years).toBeGreaterThan(0);
    expect(timeline.milestones.length).toBeGreaterThan(0);
  });
});

// ── Phase 3: Computational Substrate Construction ─────────────────────────────

describe("Phase 3 — Computational Substrate Construction", () => {
  it("fabricateComputeLayer() produces an operational unit meeting MIN_CONSCIOUSNESS_SUBSTRATE", () => {
    const fab = new SubstrateFabrication();
    const unit = fab.fabricateComputeLayer(SUBSTRATE_SPEC);

    expect(unit.operational).toBe(true);
    expect(unit.spec.compute_ops_per_sec).toBeGreaterThanOrEqual(
      MIN_CONSCIOUSNESS_SUBSTRATE.compute_ops_per_sec,
    );
    expect(unit.spec.radiationHardened).toBe(true);
    expect(unit.spec.selfRepairEnabled).toBe(true);
  });

  it("fabricateComputeLayer() throws if spec is below minimum", () => {
    const fab = new SubstrateFabrication();
    const badSpec: SubstrateSpec = { ...SUBSTRATE_SPEC, compute_ops_per_sec: 1 };

    expect(() => fab.fabricateComputeLayer(badSpec)).toThrow(/minimum consciousness substrate/i);
  });

  it("assembleRedundancyArray() produces a 3-factor array from 5 units (2 spares)", () => {
    const { substrate } = buildReadySubstrate();

    expect(substrate.array.nFactor).toBe(3);
    expect(substrate.array.units).toHaveLength(5);
    expect(substrate.selfRepairActive).toBe(true);
    expect(substrate.currentHealth).toBe(1.0);
  });

  it("runSubstrateDiagnostics() reports no issues on a fully healthy substrate", () => {
    const { fab } = buildReadySubstrate();
    const report = fab.runSubstrateDiagnostics();

    expect(report.redundancyIntact).toBe(true);
    expect(report.selfRepairOperational).toBe(true);
    expect(report.overallHealth).toBe(1.0);
    expect(report.issues).toHaveLength(0);
  });

  it("consciousness metrics battery passes for the ready substrate", () => {
    const { substrate } = buildReadySubstrate();
    const verifier = new ConsciousnessReadinessVerifier();
    const result = verifier.runMetricsBattery(substrate);

    expect(result.metricsPassed).toBe(true);
    expect(result.phi).toBeGreaterThanOrEqual(10.0);
    expect(result.globalWorkspaceScore).toBeGreaterThanOrEqual(0.7);
    expect(result.selfModelCoherence).toBeGreaterThanOrEqual(0.8);
  });

  it("issueReadinessCertificate() returns issued=true after all tests pass", () => {
    const { substrate } = buildReadySubstrate();
    const { cert } = runPhase3(substrate);

    expect(cert.issued).toBe(true);
  });

  it("ReadinessCertificate references the exact substrate that was tested", () => {
    const { substrate } = buildReadySubstrate();
    const { cert } = runPhase3(substrate);

    expect(cert.issued).toBe(true);
    if (cert.issued) {
      expect(cert.substrate).toBe(substrate);
      expect(cert.issuedAt_ms).toBeGreaterThan(0);
    }
  });

  it("Phase 4 gate: certificate is denied when runMetricsBattery was never called on the issuing verifier", () => {
    const { substrate } = buildReadySubstrate();

    // Build a passing suite using a different verifier instance
    const helperVerifier = new ConsciousnessReadinessVerifier();
    const metrics = helperVerifier.runMetricsBattery(substrate);
    const thresholds = helperVerifier.verifyMinimumThresholds(metrics);
    const continuity = helperVerifier.testContinuityUnderLoad(substrate);
    const failover = helperVerifier.verifyRedundancyFailover(substrate);

    // Fresh verifier has no cached substrate → cannot issue certificate
    const freshVerifier = new ConsciousnessReadinessVerifier();
    const result = freshVerifier.issueReadinessCertificate({
      metrics,
      thresholds,
      continuity,
      failover,
    });

    expect(result.issued).toBe(false);
    if (!result.issued) {
      expect(result.failureReasons.some((r) => r.includes("runMetricsBattery"))).toBe(true);
    }
  });
});

// ── Phase 4: Conscious Instantiation & Civilization Boot ─────────────────────

describe("Phase 4 — Conscious Instantiation & Civilization Boot", () => {
  let activator: MindSeedActivator;
  let bootstrapper: CivilizationBootstrapper;

  beforeEach(() => {
    activator = new MindSeedActivator();
    bootstrapper = new CivilizationBootstrapper();
  });

  it("loadArchive() verifies all agent archives and returns a complete manifest", () => {
    const manifest = activator.loadArchive(makeMindSeedPayload(15));

    expect(manifest.verified).toBe(true);
    expect(manifest.agentCount).toBe(15);
    expect(manifest.archives).toHaveLength(15);
    expect(manifest.totalSize_bits).toBeGreaterThan(0);
  });

  it("loadArchive() throws when payload contains no agent archives", () => {
    const payload = makeMindSeedPayload(15);
    const emptyPayload: MindSeedPayload = { ...payload, agentArchives: [] };

    expect(() => activator.loadArchive(emptyPayload)).toThrow(/no agent archives/i);
  });

  it("instantiateInitialCohort() is clamped to MIN_INITIAL_COHORT_SIZE (10) when requested size is smaller", () => {
    const manifest = activator.loadArchive(makeMindSeedPayload(15));
    const cohort = activator.instantiateInitialCohort(manifest, 3); // request 3, expect ≥ 10

    expect(cohort.length).toBeGreaterThanOrEqual(10);
    expect(cohort.every((a) => a.operational)).toBe(true);
  });

  it("validateCohortConsciousness() confirms all instantiated agents meet thresholds", () => {
    const manifest = activator.loadArchive(makeMindSeedPayload(15));
    const cohort = activator.instantiateInitialCohort(manifest, 10);
    const report = activator.validateCohortConsciousness(cohort);

    expect(report.allConsciousMetricsMet).toBe(true);
    expect(report.validAgents).toBe(report.cohortSize);
    expect(report.issues).toHaveLength(0);
  });

  it("expandPopulation() plans doubling phases from cohort to target size", () => {
    const manifest = activator.loadArchive(makeMindSeedPayload(15));
    const cohort = activator.instantiateInitialCohort(manifest, 10);
    const plan = activator.expandPopulation(cohort, 1_000);

    expect(plan.currentSize).toBe(cohort.length);
    expect(plan.targetSize).toBe(1_000);
    expect(plan.estimatedDuration.duration_years).toBeGreaterThan(0);
    expect(plan.phases.length).toBeGreaterThan(0);
  });

  it("transferOperationalControl() returns a confirmed HandoffRecord", () => {
    const civilization: Civilization = {
      id: "alpha-colony-civ",
      population: 10,
      governance: { model: "Consensus", decisionAuthority: "Council", operational: true },
      operational: true,
    };
    const handoff = activator.transferOperationalControl(civilization);

    expect(handoff.probeSystemsDecommissioned).toBe(true);
    expect(handoff.successConfirmed).toBe(true);
    expect(handoff.controlTransferredTo).toBe("alpha-colony-civ");
  });

  it("initializeGovernance() creates an operational governance framework", () => {
    const framework = bootstrapper.initializeGovernance(CIV_CONFIG);

    expect(framework.operational).toBe(true);
    expect(framework.model).toBe(CIV_CONFIG.governanceModel);
  });

  it("declareSelfSustaining() throws before 10 governance decisions are recorded", () => {
    bootstrapper.initializeGovernance(CIV_CONFIG);
    // No decisions recorded → autonomy not confirmed

    expect(() => bootstrapper.declareSelfSustaining()).toThrow(/autonomy not confirmed/i);
  });

  it("declareSelfSustaining() throws if telemetry has not been started", () => {
    const { substrate } = buildReadySubstrate();
    bootstrapper.initializeGovernance(CIV_CONFIG);
    const civ: Civilization = {
      id: "civ-1",
      population: 10,
      governance: { model: "Consensus", decisionAuthority: "Council", operational: true },
      operational: true,
    };
    bootstrapper.transferKnowledgeCorpus(KNOWLEDGE_CORPUS, civ);
    bootstrapper.establishResourceAllocation({
      energyCapacity: {
        output_w: 1e9,
        milestoneReached: EnergyMilestoneId.E3,
        timestamp_ms: Date.now(),
      },
      fabricationCapacity: {
        throughput_kg_per_year: 1e9,
        precision_nm: 10,
        unitCount: 1000,
      },
      substrate,
      resourceInventory: {
        structuralMetals_kg: 1e20,
        semiconductors_kg: 1e14,
        organics_kg: 0,
        waterIce_kg: 0,
      },
    });
    for (let i = 0; i < 10; i++) bootstrapper.recordGovernanceDecision();
    // Telemetry intentionally not started

    expect(() => bootstrapper.declareSelfSustaining()).toThrow(/telemetry/i);
  });
});

// ── Full Bootstrap Sequence End-to-End ────────────────────────────────────────

describe("Full Bootstrap Sequence End-to-End", () => {
  it("completes the 4-phase bootstrap sequence and declares a self-sustaining civilization", () => {
    // ── Phase 1: Site Assessment & Resource Survey ────────────────────────────
    const survey = new SiteSurvey();
    const engine = new ViabilityDecisionEngine();

    const sysMap = survey.surveySystem(GOOD_ARRIVAL);
    const assessment = engine.evaluate(sysMap);
    expect(assessment.overallViable).toBe(true);

    const site = engine.selectColonySite(sysMap) as ColonySite;
    expect("id" in site).toBe(true); // GO — not an AbortDecision

    const plan = engine.generateBootstrapPlan(site);
    const decisionRecord = engine.reportDecision({
      type: ColonySiteDecisionType.GO,
      site,
      plan,
    });
    expect(decisionRecord.decision).toBe(ColonySiteDecisionType.GO);

    // ── Phase 2: Infrastructure Bootstrap ────────────────────────────────────
    const energy = new EnergyHarvesting();
    energy.deployInitialCollectors();
    energy.recordExpansionCompletion(1e9); // advance to E3 colony threshold
    const energyOutput = energy.getCurrentOutput();
    expect(energyOutput.output_w).toBeGreaterThanOrEqual(1e9);

    const mfg = new ManufacturingExpansion();
    mfg.initializeSeedFabs(SEED_MANIFEST);
    const cycles = runUntilThreshold(mfg);
    const fabCapacity = mfg.getFabricationCapacity();
    expect(fabCapacity.unitCount).toBeGreaterThanOrEqual(COLONY_FAB_THRESHOLD.unitCount);
    expect(cycles).toBeLessThan(20);

    // ── Phase 3: Computational Substrate Construction ─────────────────────────
    const { substrate } = buildReadySubstrate();
    const { cert } = runPhase3(substrate);
    expect(cert.issued).toBe(true); // Phase 3 → Phase 4 gate: must have certificate

    // ── Phase 4a: Mind Seed Activation ────────────────────────────────────────
    const activator = new MindSeedActivator();
    const payload = makeMindSeedPayload(15);
    const manifest = activator.loadArchive(payload);
    expect(manifest.verified).toBe(true);

    const cohort = activator.instantiateInitialCohort(manifest, 10);
    const validation = activator.validateCohortConsciousness(cohort);
    expect(validation.allConsciousMetricsMet).toBe(true);

    activator.expandPopulation(cohort, 1_000); // plan population growth

    // ── Phase 4b: Civilization Bootstrap ─────────────────────────────────────
    const bootstrapper = new CivilizationBootstrapper();
    bootstrapper.initializeGovernance(CIV_CONFIG);

    const civilization: Civilization = {
      id: "alpha-colony",
      population: cohort.length,
      governance: {
        model: CIV_CONFIG.governanceModel,
        decisionAuthority: "Alpha Council",
        operational: true,
      },
      operational: true,
    };

    bootstrapper.transferKnowledgeCorpus(KNOWLEDGE_CORPUS, civilization);

    const colonyResources: ColonyResources = {
      energyCapacity: energyOutput,
      fabricationCapacity: fabCapacity,
      substrate,
      resourceInventory: sysMap.resourceInventory,
    };
    const allocationPlan = bootstrapper.establishResourceAllocation(colonyResources);
    expect(allocationPlan.approved).toBe(true);

    bootstrapper.beginTelemetryReporting(ORIGIN);

    // Record 10 autonomous governance decisions to confirm civilizational autonomy
    for (let i = 0; i < 10; i++) {
      bootstrapper.recordGovernanceDecision();
    }

    activator.transferOperationalControl(civilization);

    // ── Terminal Event: Self-Sustaining Declaration ───────────────────────────
    const declaration = bootstrapper.declareSelfSustaining();

    expect(declaration.consciousPopulation).toBe(CIV_CONFIG.initialPopulation);
    expect(declaration.energyCapacity.output_w).toBeGreaterThanOrEqual(1e9);
    expect(declaration.manufacturingCapacity.unitCount).toBeGreaterThanOrEqual(
      COLONY_FAB_THRESHOLD.unitCount,
    );
    expect(declaration.governanceStatus.autonomyConfirmed).toBe(true);
    expect(declaration.governanceStatus.decisionsMade).toBe(10);
    expect(declaration.telemetryForwarded).toBe(true);
    expect(declaration.timestamp_ms).toBeGreaterThan(0);
  });

  it("self-sustaining declaration is blocked when energy and manufacturing are below colony thresholds", () => {
    const { substrate } = buildReadySubstrate();
    const bootstrapper = new CivilizationBootstrapper();
    bootstrapper.initializeGovernance(CIV_CONFIG);

    const civ: Civilization = {
      id: "civ-test",
      population: 10,
      governance: { model: "Consensus", decisionAuthority: "Council", operational: true },
      operational: true,
    };
    bootstrapper.transferKnowledgeCorpus(KNOWLEDGE_CORPUS, civ);

    // Insufficient energy (1 kW) and only 1 fab unit → plan is unapproved
    bootstrapper.establishResourceAllocation({
      energyCapacity: {
        output_w: 1_000,
        milestoneReached: EnergyMilestoneId.E0,
        timestamp_ms: Date.now(),
      },
      fabricationCapacity: { throughput_kg_per_year: 1_000, precision_nm: 100, unitCount: 1 },
      substrate,
      resourceInventory: {
        structuralMetals_kg: 1e18,
        semiconductors_kg: 1e12,
        organics_kg: 0,
        waterIce_kg: 0,
      },
    });
    bootstrapper.beginTelemetryReporting(ORIGIN);
    for (let i = 0; i < 10; i++) bootstrapper.recordGovernanceDecision();

    expect(() => bootstrapper.declareSelfSustaining()).toThrow(/allocation plan is not approved/i);
  });

  it("Conservative Advancement: each phase gate must pass before the next phase begins", () => {
    // Demonstrate that Phase 4 cannot proceed without a ReadinessCertificate
    const { substrate } = buildReadySubstrate();

    // Build passing suite using a helper verifier (caches the substrate)
    const helperVerifier = new ConsciousnessReadinessVerifier();
    const metrics = helperVerifier.runMetricsBattery(substrate);
    const thresholds = helperVerifier.verifyMinimumThresholds(metrics);
    const continuity = helperVerifier.testContinuityUnderLoad(substrate);
    const failover = helperVerifier.verifyRedundancyFailover(substrate);

    // Disable failover to simulate a substrate that hasn't fully passed Phase 3
    const incompleteFailover = { ...failover, passed: false };

    const freshVerifier = new ConsciousnessReadinessVerifier();
    const result = freshVerifier.issueReadinessCertificate({
      metrics,
      thresholds,
      continuity,
      failover: incompleteFailover,
    });

    // Phase 4 activation must be blocked — certificate not issued
    expect(result.issued).toBe(false);
  });
});
