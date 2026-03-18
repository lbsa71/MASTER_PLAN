/**
 * Autonomous Colony Seeding — Core Type Definitions
 *
 * Types and interfaces for autonomous establishment of self-sustaining conscious
 * civilizations at destination star systems (E1.2).
 *
 * Architecture reference: docs/autonomous-colony-seeding/ARCHITECTURE.md
 *
 * Four-phase bootstrap sequence:
 *   Phase 1 — Site Assessment & Resource Survey
 *   Phase 2 — Infrastructure Bootstrap (Energy + Manufacturing)
 *   Phase 3 — Computational Substrate Construction
 *   Phase 4 — Conscious Instantiation & Civilization Boot
 */

// ── Phase 1: Site Assessment ─────────────────────────────────────────────────

export enum SpectralClass {
  O = "O",
  B = "B",
  A = "A",
  F = "F",
  G = "G",
  K = "K",
  M = "M",
  /** Stellar remnants (white dwarf, neutron star) */
  Remnant = "REMNANT",
}

export interface CelestialBody {
  id: string;
  type: "asteroid" | "moon" | "planet" | "gas_giant" | "dwarf_planet";
  mass_kg: number;
  /** Distance from star in AU */
  orbitalRadius_au: number;
  /** Estimated composition */
  composition: ResourceInventory;
}

export interface ResourceInventory {
  /** Structural metals (Fe, Al, Ti) in kg */
  structuralMetals_kg: number;
  /** Semiconductor feedstock (Si, Ge) in kg */
  semiconductors_kg: number;
  /** Volatile organics / carbonaceous material in kg */
  organics_kg: number;
  /** Water ice in kg (for fusion fuel deuterium extraction) */
  waterIce_kg: number;
}

export const MIN_RESOURCE_REQUIREMENTS: ResourceInventory = {
  structuralMetals_kg: 1e18,
  semiconductors_kg: 1e12,
  organics_kg: 0,
  waterIce_kg: 0,
};

export interface RadiationProfile {
  /** Stellar luminosity in solar luminosities */
  stellarLuminosity_Lsun: number;
  /** Sustained particle flux at colony site in particles/cm²/s */
  particleFlux_per_cm2_s: number;
  /** Peak radiation events per century */
  peakEventsPerCentury: number;
  /** Whether within hardened substrate tolerance */
  withinHardenedTolerance: boolean;
}

export interface EnergyBudget {
  /** Available solar power at selected orbit in watts */
  solarPower_w: number;
  /** Whether sustained >1 GW solar equivalent is achievable */
  meetsMinimumThreshold: boolean;
}

export const MIN_ENERGY_GW = 1e9; // 1 GW in watts

export interface OrbitalPosition {
  /** Distance from star in AU */
  radius_au: number;
  /** Orbital stability: projected stable duration in megayears */
  stabilityDuration_Myr: number;
}

export const MIN_ORBITAL_STABILITY_MYR = 100;

export interface SystemMap {
  starType: SpectralClass;
  bodies: CelestialBody[];
  radiationProfile: RadiationProfile;
  resourceInventory: ResourceInventory;
  energyBudget: EnergyBudget;
}

export interface ArrivalState {
  /** Probe velocity relative to star at arrival (m/s) */
  relativeVelocity_m_per_s: number;
  /** Position vector from star (AU) */
  position_au: [number, number, number];
  /** Probe health on arrival (0–1) */
  probeHealth: number;
}

// ── Phase 1: Viability Decision ───────────────────────────────────────────────

export enum ColonySiteDecisionType {
  GO = "GO",
  ABORT = "ABORT",
  /** Insufficient data; enter dormancy and retry */
  DORMANCY = "DORMANCY",
}

export interface ColonySite {
  id: string;
  orbitalPosition: OrbitalPosition;
  projectedEnergyBudget: EnergyBudget;
  accessibleResources: ResourceInventory;
  /** Risk profile description */
  riskProfile: string;
}

export interface AbortDecision {
  reason: string;
  /** Recommended next target system, if known */
  alternativeSystem?: string;
  /** Years until next survey retry, for DORMANCY */
  retryAfter_years?: number;
}

export interface BootstrapPlan {
  selectedSite: ColonySite;
  energyMilestones: EnergyMilestone[];
  manufacturingSchedule: ExpansionSchedule;
  substrateSpec: SubstrateSpec;
  mindSeedActivationTime: EstimatedTime;
  totalDuration: EstimatedTime;
}

export interface DecisionRecord {
  decision: ColonySiteDecisionType;
  rationale: string;
  viabilityScore: number;
  projectedBootstrapDuration: EstimatedTime;
  alternativeRecommendation: string | null;
  timestamp_ms: number;
}

export interface ViabilityAssessment {
  meetsEnergyRequirement: boolean;
  meetsResourceRequirement: boolean;
  withinRadiationTolerance: boolean;
  hasStableOrbit: boolean;
  overallViable: boolean;
  viabilityScore: number;
}

export type ColonySiteDecision =
  | { type: ColonySiteDecisionType.GO; site: ColonySite; plan: BootstrapPlan }
  | { type: ColonySiteDecisionType.ABORT; abort: AbortDecision }
  | { type: ColonySiteDecisionType.DORMANCY; abort: AbortDecision };

// ── Phase 2: Infrastructure ───────────────────────────────────────────────────

export enum EnergyMilestoneId {
  /** Probe payload baseline — survive arrival, begin survey */
  E0 = "E0",
  /** 10× probe baseline — power first mining/fabrication ops */
  E1 = "E1",
  /** 1 MW — sustain full manufacturing expansion */
  E2 = "E2",
  /** Colony threshold — sustain target conscious population */
  E3 = "E3",
}

export interface EnergyMilestone {
  id: EnergyMilestoneId;
  requiredCapacity_w: number;
  purpose: string;
}

export const ENERGY_MILESTONES: EnergyMilestone[] = [
  { id: EnergyMilestoneId.E0, requiredCapacity_w: 1_000, purpose: "Survive arrival, begin survey" },
  { id: EnergyMilestoneId.E1, requiredCapacity_w: 10_000, purpose: "Power first mining/fabrication ops" },
  { id: EnergyMilestoneId.E2, requiredCapacity_w: 1_000_000, purpose: "Sustain full manufacturing expansion" },
  { id: EnergyMilestoneId.E3, requiredCapacity_w: 1e9, purpose: "Sustain target conscious population" },
];

export interface EnergyCapacity {
  current_w: number;
  targetMilestone: EnergyMilestoneId;
}

export interface EnergyOutput {
  output_w: number;
  milestoneReached: EnergyMilestoneId;
  timestamp_ms: number;
}

export interface CollectorArray {
  count: number;
  totalArea_m2: number;
  efficiency: number;
  output_w: number;
}

export interface ConstructionPlan {
  targetCapacity_w: number;
  estimatedDuration: EstimatedTime;
  resourcesRequired: ResourceInventory;
  phases: string[];
}

// ── Phase 2: Manufacturing ────────────────────────────────────────────────────

export interface ExpansionSchedule {
  cycleCount: number;
  estimatedCycleDuration_years: number;
  targetCapacity: FabCapacity;
}

export interface FabCapacity {
  /** Manufacturing throughput in kg/year of processed material */
  throughput_kg_per_year: number;
  /** Fabrication precision: minimum feature size in nm */
  precision_nm: number;
  /** Number of independent fabrication units */
  unitCount: number;
}

export const COLONY_FAB_THRESHOLD: FabCapacity = {
  throughput_kg_per_year: 1e9,
  precision_nm: 10,
  unitCount: 1000,
};

export interface SeedManifest {
  /** Nanofabrication assembler mass in kg */
  nanoAssembler_kg: number;
  /** Starter mining/refining kit mass in kg */
  miningKit_kg: number;
  /** Solar collector deployment kit */
  solarKit_kg: number;
  /** Replication blueprints present */
  hasBlueprints: boolean;
}

export interface FabricationUnit {
  id: string;
  capacity: FabCapacity;
  operational: boolean;
}

export interface ExpansionCycleResult {
  cycleNumber: number;
  newUnitsProduced: number;
  currentCapacity: FabCapacity;
  healthCheck: "OK" | "DEGRADED" | "FAILED";
}

export interface GrowthRate {
  /** Expansion multiplier per cycle */
  multiplier: number;
  /** Cycle duration in years */
  cycleDuration_years: number;
}

// ── Phase 3: Substrate ────────────────────────────────────────────────────────

export interface SubstrateSpec {
  /** Compute capacity in ops/s */
  compute_ops_per_sec: number;
  /** Storage in bits */
  storage_bits: number;
  /** N-modular redundancy factor */
  redundancyFactor: number;
  /** Radiation hardening level */
  radiationHardened: boolean;
  /** Self-repair enabled */
  selfRepairEnabled: boolean;
}

export const MIN_CONSCIOUSNESS_SUBSTRATE: SubstrateSpec = {
  compute_ops_per_sec: 1e21,
  storage_bits: 1e21,
  redundancyFactor: 3,
  radiationHardened: true,
  selfRepairEnabled: true,
};

export interface SubstrateUnit {
  id: string;
  spec: SubstrateSpec;
  operational: boolean;
}

export interface RedundantArray {
  units: SubstrateUnit[];
  nFactor: number;
  effectiveCapacity: SubstrateSpec;
}

export interface MaintainableSubstrate {
  array: RedundantArray;
  selfRepairActive: boolean;
  currentHealth: number; // 0–1
}

export interface SubstrateHealthReport {
  overallHealth: number;
  computeCapacity_ops_per_sec: number;
  storageCapacity_bits: number;
  redundancyIntact: boolean;
  selfRepairOperational: boolean;
  issues: string[];
}

// ── Phase 3: Consciousness Readiness ─────────────────────────────────────────

export interface MetricsBatteryResult {
  /** Phi (integrated information) value */
  phi: number;
  /** Global workspace integration score 0–1 */
  globalWorkspaceScore: number;
  /** Self-model coherence 0–1 */
  selfModelCoherence: number;
  /** All individual metric results */
  metricsPassed: boolean;
}

export const CONSCIOUSNESS_THRESHOLDS = {
  minPhi: 10.0,
  minGlobalWorkspaceScore: 0.7,
  minSelfModelCoherence: 0.8,
};

export interface ThresholdVerification {
  passed: boolean;
  failedMetrics: string[];
}

export interface ContinuityTestResult {
  passed: boolean;
  experienceDrops: number;
  maxInterruptionDuration_ms: number;
}

export interface FailoverTestResult {
  passed: boolean;
  failoverTime_ms: number;
  consciousnessPreserved: boolean;
}

export type TestSuite = {
  metrics: MetricsBatteryResult;
  thresholds: ThresholdVerification;
  continuity: ContinuityTestResult;
  failover: FailoverTestResult;
};

export type ReadinessCertificate = {
  issued: true;
  substrate: MaintainableSubstrate;
  testSuite: TestSuite;
  issuedAt_ms: number;
};

export type ReadinessFailure = {
  issued: false;
  failureReasons: string[];
};

// ── Phase 4: Mind Seed ────────────────────────────────────────────────────────

export interface AgentArchive {
  id: string;
  /** Compressed conscious agent snapshot */
  data: Uint8Array;
  integrityHash: string;
  originTimestamp_ms: number;
}

export interface KnowledgeCorpus {
  science: string[];
  culture: string[];
  history: string[];
  proceduralKnowledge: string[];
  sizeEstimate_bits: number;
}

export interface EthicalFramework {
  coreValues: string[];
  governanceProtocols: string[];
  preservationCommitment: boolean;
}

export interface BootstrapProcedure {
  phase: string;
  steps: string[];
}

export interface MindSeedPayload {
  agentArchives: AgentArchive[];
  knowledgeCorpus: KnowledgeCorpus;
  valueParameters: EthicalFramework;
  bootstrapProcedures: BootstrapProcedure[];
  originTimestamp_ms: number;
  integrityHash: string;
}

export interface ArchiveManifest {
  agentCount: number;
  archives: AgentArchive[];
  verified: boolean;
  totalSize_bits: number;
}

export interface ConsciousAgent {
  id: string;
  /** Consciousness metrics at initialization */
  initialMetrics: MetricsBatteryResult;
  operational: boolean;
}

export type ConsciousAgentArray = ConsciousAgent[];

export interface ValidationReport {
  cohortSize: number;
  validAgents: number;
  allConsciousMetricsMet: boolean;
  issues: string[];
}

export interface ExpansionPlan {
  currentSize: number;
  targetSize: number;
  estimatedDuration: EstimatedTime;
  phases: string[];
}

export interface HandoffRecord {
  timestamp_ms: number;
  probeSystemsDecommissioned: boolean;
  controlTransferredTo: string;
  successConfirmed: boolean;
}

// ── Phase 4: Civilization ─────────────────────────────────────────────────────

export interface CivilizationConfig {
  name: string;
  initialPopulation: number;
  governanceModel: string;
  preservationCommitment: boolean;
}

export interface GovernanceFramework {
  model: string;
  decisionAuthority: string;
  operational: boolean;
}

export interface GovernanceHealth {
  operational: boolean;
  decisionsMade: number;
  autonomyConfirmed: boolean;
}

export interface TransferRecord {
  itemsTransferred: number;
  verifiedIntegrity: boolean;
  timestamp_ms: number;
}

export interface ColonyResources {
  energyCapacity: EnergyOutput;
  fabricationCapacity: FabCapacity;
  substrate: MaintainableSubstrate;
  resourceInventory: ResourceInventory;
}

export interface AllocationPlan {
  energyAllocation: Record<string, number>;
  manufacturingAllocation: Record<string, number>;
  approved: boolean;
}

export interface Civilization {
  id: string;
  population: number;
  governance: GovernanceFramework;
  operational: boolean;
}

export interface OriginAddress {
  starSystem: string;
  /** One-way communication delay in years */
  communicationDelay_years: number;
}

export interface TelemetryStream {
  active: boolean;
  target: OriginAddress;
  lastTransmission_ms: number;
}

export interface SelfSustainingDeclaration {
  timestamp_ms: number;
  consciousPopulation: number;
  energyCapacity: EnergyOutput;
  manufacturingCapacity: FabCapacity;
  governanceStatus: GovernanceHealth;
  telemetryForwarded: boolean;
}

// ── Shared Utility Types ──────────────────────────────────────────────────────

export interface EstimatedTime {
  /** Estimated duration in years */
  duration_years: number;
  /** Uncertainty range in years (±) */
  uncertainty_years: number;
}

export interface Timeline {
  milestones: Array<{ name: string; estimatedTime: EstimatedTime }>;
  totalDuration: EstimatedTime;
}
