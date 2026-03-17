export type {
  NodeMetrics,
  ClusterSnapshot,
  ExpansionTrigger,
  DegradationAlert,
  NodeSpec,
  ManufacturingRequest,
  NodeRecord,
  NodeState,
  WorkloadSpec,
  PlacementConstraint,
  PlacementDecision,
  ResourceBudget,
  ShedDecision,
  WorkloadClass,
  ExpansionPriority,
  ShedLevel,
} from './types.js';

export { CapacityTelemetry } from './telemetry.js';
export type { TelemetryConfig } from './telemetry.js';

export { NodeLifecycleManager } from './node-lifecycle.js';
export type { ManufacturingLayer, NodeLifecycleEvents } from './node-lifecycle.js';

export { WorkloadOrchestrator } from './orchestrator.js';
export type { ActiveWorkload } from './orchestrator.js';

export { SustainabilityManager } from './sustainability.js';
export type { SustainabilityEvents } from './sustainability.js';
