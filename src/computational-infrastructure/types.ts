// Shared type definitions for the Self-Expanding Computational Infrastructure

export type WorkloadClass = 'consciousness_host' | 'simulation' | 'comms' | 'maintenance';
export type NodeState = 'ORDERED' | 'MANUFACTURED' | 'BOOTSTRAPPING' | 'VALIDATING' | 'ACTIVE' | 'DEGRADED' | 'DECOMMISSIONED';
export type ExpansionPriority = 'urgent' | 'planned';
export type ShedLevel = 1 | 2 | 3 | 4 | 5;

export interface NodeMetrics {
  nodeId: string;
  timestamp: number;
  cpuUtil: number;          // 0–1
  memPressure: number;      // 0–1
  networkLatencyMs: number;
  consciousnessSlaMissRate: number; // fraction of SLA windows missed
}

export interface ClusterSnapshot {
  totalNodes: number;
  activeWorkloads: number;
  headroomFraction: number; // (capacity - load) / capacity
  energyBudgetRemaining: number; // normalised 0–1
  materialBudgetRemaining: number;
}

export interface ExpansionTrigger {
  triggeredAt: number;
  reason: 'headroom_low' | 'sla_breach' | 'queue_depth';
  suggestedNodeCount: number;
  priority: ExpansionPriority;
}

export interface DegradationAlert {
  alertedAt: number;
  reason: 'energy_low' | 'material_low';
  budgetRemaining: number;
}

export interface NodeSpec {
  computeClass: 'general' | 'consciousness_host' | 'simulation' | 'comms';
  minCpuCores: number;
  minMemoryGiB: number;
  storageGiB: number;
  networkBandwidthGbps: number;
  radiationHardened: boolean;
}

export interface ManufacturingRequest {
  requestId: string;
  nodeSpec: NodeSpec;
  quantity: number;
  priority: ExpansionPriority;
  issuedAt: number;
}

export interface NodeRecord {
  nodeId: string;
  spec: NodeSpec;
  state: NodeState;
  joinedAt?: number;
  lastHealthCheck?: number;
  failureCount: number;
}

export interface WorkloadSpec {
  workloadId: string;
  class: WorkloadClass;
  cpuRequest: number;   // cores
  memRequest: number;   // GiB
  constraints: PlacementConstraint[];
}

export interface PlacementConstraint {
  key: string;              // e.g. 'radiationHardened'
  value: string | boolean;
  required: boolean;
}

export interface PlacementDecision {
  workloadId: string;
  nodeId: string;
  decidedAt: number;
  reason: string;
}

export interface ResourceBudget {
  energyCeiling: number;    // normalised 0–1
  energyCurrent: number;
  materialCeiling: number;
  materialCurrent: number;
}

export interface ShedDecision {
  decidedAt: number;
  level: ShedLevel;
  affectedWorkloadIds: string[];
  rationale: string;
  reversibleAt?: number;
}
