/**
 * Asteroid Resource Utilization — Shared Types
 * Domain: 0.4.1.2
 */

// --- Spectral Classification ---

export type SpectralClass = 'C' | 'S' | 'M' | 'D' | 'V' | 'X';

// --- Resource Map ---

export interface MetalComposition {
  iron: number;           // kg
  nickel: number;         // kg
  platinum_group: number; // kg
}

export interface VolatileComposition {
  water_ice: number; // kg
  co2: number;       // kg
  ammonia: number;   // kg
}

export interface ResourceMap {
  metals: MetalComposition;
  volatiles: VolatileComposition;
  silicates: number;     // kg
  carbonaceous: number;  // kg
}

// --- Orbital Mechanics ---

export interface OrbitalElements {
  semiMajorAxis: number;    // AU
  eccentricity: number;     // 0-1
  inclination: number;      // degrees
  argOfPerihelion: number;  // degrees
  longOfAscNode: number;    // degrees
  meanAnomaly: number;      // degrees
}

export interface OrbitalPosition {
  x: number; // AU
  y: number;
  z: number;
}

// --- Prospecting ---

export interface AsteroidCandidate {
  designation: string;
  spectralType: SpectralClass;
  estimatedComposition: ResourceMap;
  deltaVCost: number;         // m/s round-trip
  accessibilityScore: number; // 0-1
  orbitEphemeris: OrbitalElements;
}

export interface ProspectingResult {
  rankedCandidates: AsteroidCandidate[];
  selectionMetric: 'resource_per_delta_v';
}

// --- Mining / Extraction ---

export type AnchorageType = 'surface-anchor' | 'tether' | 'halo-orbit';
export type ExtractionMethod = 'drill' | 'ablation' | 'mass-driver' | 'scoop';
export type AutonomyLevel = 'supervised' | 'semi-autonomous' | 'fully-autonomous';

export interface LogEntry {
  timestamp: number;  // simulation day
  event: string;
  details?: string;
}

export interface MiningOperation {
  targetId: string;
  anchorageSystem: AnchorageType;
  extractionMethod: ExtractionMethod;
  extractionRate: number;      // kg/day
  autonomyLevel: AutonomyLevel;
  operationalLifetime: number; // days
}

export interface ExtractionResult {
  bulkOreMass: number;          // kg
  capturedVolatileMass: number; // kg
  energyConsumed: number;       // kWh
  operationLog: LogEntry[];
  daysAutonomous: number;
  theoreticalMaxMass: number;   // kg (theoretical max at 100% rate)
}

// --- Processing ---

export type MaterialType =
  | 'iron' | 'nickel' | 'platinum_group'
  | 'water' | 'lox' | 'lh2' | 'ammonia'
  | 'carbon_feedstock'
  | 'slag';

export type EnergySource = 'solar' | 'nuclear' | 'stored';

export interface ProcessingStage {
  name: string;
  type: 'sorting' | 'thermal' | 'chemical' | 'volatile_capture' | 'quality_assurance';
  energyCostPerKg: number;  // kWh/kg
  yieldFraction: number;    // 0-1, fraction of input that becomes output
}

export interface ProcessedProduct {
  material: MaterialType;
  purity: number;      // 0-1
  massKg: number;
  destinationDepot: string;
}

export interface ProcessingPipelineConfig {
  stages: ProcessingStage[];
  energySource: EnergySource;
  processingRate: number;  // kg/day input capacity
}

export interface ProcessingOutput {
  products: ProcessedProduct[];
  totalEnergyConsumed: number;   // kWh
  totalEnergyProduced: number;   // kWh (from hydrogen/oxygen fuel cells)
  energyBalance: number;         // ratio: produced/consumed
  wasteSlagMass: number;         // kg
}

// --- Depot & Distribution ---

export type ConsumerType = 'consciousness-platform' | 'manufacturing' | 'propellant-depot';

export type Priority = 'critical' | 'high' | 'normal' | 'low';

export interface DemandForecast {
  material: MaterialType;
  dailyRateKg: number;
}

export interface ConsumerEndpoint {
  id: string;
  type: ConsumerType;
  planCard: string;
  demandForecast: DemandForecast[];
}

export interface DistributionRequest {
  consumerId: string;
  material: MaterialType;
  massKg: number;
  deliveryDeadline: number; // simulation day
  priority: Priority;
}

export interface ResourceDepot {
  depotId: string;
  location: OrbitalPosition;
  inventory: Map<MaterialType, number>;
  capacity: Map<MaterialType, number>;
  consumers: ConsumerEndpoint[];
}

export interface DepotSimulationResult {
  totalDaysSimulated: number;
  supplyGaps: SupplyGap[];
  maxGapDays: number;
  allConsumersServed: boolean;
  finalInventory: Map<MaterialType, number>;
}

export interface SupplyGap {
  consumerId: string;
  material: MaterialType;
  startDay: number;
  endDay: number;
  durationDays: number;
}
