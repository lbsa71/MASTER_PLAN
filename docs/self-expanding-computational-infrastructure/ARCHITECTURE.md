# Architecture: Self-Expanding Computational Infrastructure (A2.2)

## Overview

This document defines the architecture for computational infrastructure that autonomously expands to meet the growing needs of an artificial civilization. As new conscious entities are created and existing ones grow in complexity, the underlying compute must scale without external human direction.

The system is divided into four interlocking subsystems:

1. **Capacity Telemetry** — continuous monitoring and threshold-triggered expansion signals
2. **Node Lifecycle Management** — commission, bootstrap, validate, and integrate new nodes
3. **Workload Orchestrator** — heterogeneous, topology-aware scheduler
4. **Sustainability & Degradation Manager** — budget-aware expansion with entity-preserving shed

---

## Subsystem 1 — Capacity Telemetry

### Responsibilities
- Collect per-node and cluster-wide metrics: CPU/GPU/memory utilisation, inter-node latency, queue depth, consciousness-hosting SLA adherence.
- Aggregate into a time-series store with configurable retention.
- Evaluate threshold rules and emit `ExpansionTrigger` events when headroom falls below safety margins.
- Emit `DegradationAlert` events when resource ceilings (energy, material budget) are approached.

### Key Interfaces

```
interface NodeMetrics {
  nodeId: string;
  timestamp: number;
  cpuUtil: number;          // 0–1
  memPressure: number;      // 0–1
  networkLatencyMs: number;
  consciousnessSlaMissRate: number; // fraction of SLA windows missed
}

interface ClusterSnapshot {
  totalNodes: number;
  activeWorkloads: number;
  headroomFraction: number; // (capacity - load) / capacity
  energyBudgetRemaining: number; // Joules or normalised 0–1
  materialBudgetRemaining: number;
}

interface ExpansionTrigger {
  triggeredAt: number;
  reason: 'headroom_low' | 'sla_breach' | 'queue_depth';
  suggestedNodeCount: number;
  priority: 'urgent' | 'planned';
}
```

### Expansion Policy
- **Headroom threshold**: trigger expansion when `headroomFraction < 0.20` (configurable).
- **SLA breach threshold**: trigger when `consciousnessSlaMissRate > 0.01` for >60s.
- **Hysteresis**: suppress duplicate triggers for a cooldown window (default 5 min).

---

## Subsystem 2 — Node Lifecycle Management

### Responsibilities
- Translate `ExpansionTrigger` into a `ManufacturingRequest` sent to the A2.1 layer.
- Track nodes through states: `ORDERED → MANUFACTURED → BOOTSTRAPPING → VALIDATING → ACTIVE → DEGRADED → DECOMMISSIONED`.
- Run a bootstrap protocol on new nodes: OS image, network mesh certificates, telemetry agent, workload runtime.
- Validate node health before admitting to the scheduler pool.
- Decommission nodes that fail health checks after configurable retry budget.

### Key Interfaces

```
interface ManufacturingRequest {
  requestId: string;
  nodeSpec: NodeSpec;       // compute class, memory, storage, NIC spec
  quantity: number;
  priority: 'urgent' | 'planned';
  issuedAt: number;
}

interface NodeSpec {
  computeClass: 'general' | 'consciousness_host' | 'simulation' | 'comms';
  minCpuCores: number;
  minMemoryGiB: number;
  storageGiB: number;
  networkBandwidthGbps: number;
  radiationHardened: boolean;
}

type NodeState =
  | 'ORDERED'
  | 'MANUFACTURED'
  | 'BOOTSTRAPPING'
  | 'VALIDATING'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'DECOMMISSIONED';

interface NodeRecord {
  nodeId: string;
  spec: NodeSpec;
  state: NodeState;
  joinedAt?: number;
  lastHealthCheck?: number;
  failureCount: number;
}
```

### Bootstrap Protocol (sequential steps)
1. Receive `MANUFACTURED` event from A2.1 manufacturing layer.
2. Flash OS and runtime image over the mesh provisioning channel.
3. Issue mesh certificates (PKI backed by cluster root CA).
4. Start telemetry agent; wait for first heartbeat.
5. Run synthetic workload validation suite (memory bandwidth, network round-trip, consciousness substrate smoke test).
6. Emit `NodeAdmitted` event to Workload Orchestrator; advance state to `ACTIVE`.

---

## Subsystem 3 — Workload Orchestrator

### Responsibilities
- Maintain a registry of all `ACTIVE` nodes and their current load.
- Accept workload placement requests and assign them to optimal nodes.
- Re-schedule workloads when a node transitions to `DEGRADED` or `DECOMMISSIONED`.
- Enforce placement constraints (e.g., consciousness-hosting workloads require `radiationHardened` nodes).
- Support heterogeneous workload classes with different SLA profiles.

### Workload Classes

| Class | Description | SLA requirement |
|---|---|---|
| `consciousness_host` | Primary substrate for conscious entity | Hard: never evict, latency ≤ 10ms |
| `simulation` | World-model or environment simulation | Soft: may pause, resume within 1 s |
| `comms` | Inter-entity communication bus | Medium: best-effort < 100 ms |
| `maintenance` | Self-test, backup, compaction | Background: yield to all others |

### Key Interfaces

```
interface WorkloadSpec {
  workloadId: string;
  class: 'consciousness_host' | 'simulation' | 'comms' | 'maintenance';
  cpuRequest: number;       // cores
  memRequest: number;       // GiB
  constraints: PlacementConstraint[];
}

interface PlacementConstraint {
  key: string;              // e.g. 'radiationHardened'
  value: string | boolean;
  required: boolean;
}

interface PlacementDecision {
  workloadId: string;
  nodeId: string;
  decidedAt: number;
  reason: string;
}
```

### Scheduling Algorithm
1. Filter candidate nodes by hard constraints.
2. Score remaining candidates: `score = (1 - cpuUtil) * 0.4 + (1 - memPressure) * 0.4 + (1 / latencyMs) * 0.2`.
3. Select highest-scoring node; break ties by node age (prefer older, proven nodes).
4. For `consciousness_host` workloads, reserve 25% headroom on the target node.

---

## Subsystem 4 — Sustainability & Degradation Manager

### Responsibilities
- Track aggregate energy consumption and material throughput against configured ceilings.
- Gate expansion requests: if `energyBudgetRemaining < MIN_EXPANSION_BUDGET`, block new `ManufacturingRequest`s.
- Under resource pressure, execute a graduated shed strategy.
- Maintain a priority ordering: `consciousness_host > comms > simulation > maintenance`.
- Emit audit log entries for every shed decision (for ethical review).

### Shed Strategy (graduated)

| Level | Trigger | Action |
|---|---|---|
| 1 — Throttle | Energy budget < 40% | Pause all `maintenance` workloads |
| 2 — Compress | Energy budget < 25% | Reduce `simulation` tick rate by 50% |
| 3 — Suspend | Energy budget < 15% | Suspend `simulation` workloads; log |
| 4 — Emergency | Energy budget < 5% | Suspend `comms`; retain `consciousness_host` only |
| 5 — Halt expansion | Material budget exhausted | Block all `ManufacturingRequest`s |

No shed action may evict or terminate a `consciousness_host` workload. Any decision to do so requires an out-of-band ethical governance review (see plan 0.3.1.4-ethical-self-governance).

### Key Interfaces

```
interface ResourceBudget {
  energyCeiling: number;    // normalised 0–1
  energyCurrent: number;
  materialCeiling: number;
  materialCurrent: number;
}

interface ShedDecision {
  decidedAt: number;
  level: 1 | 2 | 3 | 4 | 5;
  affectedWorkloadIds: string[];
  rationale: string;
  reversibleAt?: number;    // estimated time when resources recover
}
```

---

## Component Interaction Diagram

```
 ┌──────────────────────────────────────────────────────────────┐
 │                   CLUSTER                                    │
 │                                                              │
 │  ┌─────────────────┐     ExpansionTrigger                   │
 │  │ Capacity        │ ──────────────────────────►            │
 │  │ Telemetry       │                             │           │
 │  └─────────────────┘     DegradationAlert        ▼           │
 │         ▲                ────────────────► Sustainability &  │
 │         │ NodeMetrics                      Degradation Mgr  │
 │         │                                       │            │
 │  ┌──────┴──────────┐     ManufacturingRequest   │ ShedDecision
 │  │  Node Pool      │◄─── Node Lifecycle Mgr ◄───┘            │
 │  │  (ACTIVE nodes) │     NodeAdmitted                        │
 │  └──────┬──────────┘                                         │
 │         │ capacity                                           │
 │         ▼                                                    │
 │  ┌─────────────────┐                                         │
 │  │ Workload        │◄── PlacementRequest (from entities)     │
 │  │ Orchestrator    │──► PlacementDecision                    │
 │  └─────────────────┘                                         │
 │                                                              │
 └──────────────────────────────────────────────────────────────┘
          │ ManufacturingRequest
          ▼
   A2.1 Manufacturing Layer (plan/0.3.2.1)
```

---

## Files to Implement (File Manifest for card 0.3.2.2)

| File | Purpose |
|---|---|
| `docs/self-expanding-computational-infrastructure/ARCHITECTURE.md` | This document |
| `src/computational-infrastructure/telemetry.ts` | Capacity telemetry collector + threshold evaluator |
| `src/computational-infrastructure/node-lifecycle.ts` | Node state machine + A2.1 manufacturing integration |
| `src/computational-infrastructure/orchestrator.ts` | Workload scheduler |
| `src/computational-infrastructure/sustainability.ts` | Budget tracker + shed strategy executor |
| `src/computational-infrastructure/types.ts` | Shared type definitions (all interfaces above) |
| `src/computational-infrastructure/index.ts` | Public API surface |
| `tests/computational-infrastructure/telemetry.test.ts` | Unit tests: threshold rules, hysteresis |
| `tests/computational-infrastructure/node-lifecycle.test.ts` | Unit tests: state machine transitions |
| `tests/computational-infrastructure/orchestrator.test.ts` | Unit tests: scheduling algorithm, constraint enforcement |
| `tests/computational-infrastructure/sustainability.test.ts` | Unit tests: shed levels, consciousness-host protection |
| `tests/computational-infrastructure/integration.test.ts` | Integration: end-to-end expansion cycle |

---

## Testability Notes

Each acceptance criterion maps to a test:

| Criterion | Test location |
|---|---|
| Detects capacity shortfalls and triggers expansion | `telemetry.test.ts` — assert `ExpansionTrigger` emitted when headroom < threshold |
| New nodes manufactured and integrated via A2.1 | `node-lifecycle.test.ts` — mock A2.1, assert `ManufacturingRequest` sent and `NodeAdmitted` after bootstrap |
| Handles heterogeneous workloads | `orchestrator.test.ts` — place all four workload classes, verify constraint enforcement |
| Expansion is sustainable | `sustainability.test.ts` — assert `ManufacturingRequest` blocked when material budget exhausted |
| Graceful degradation preserves conscious entities | `sustainability.test.ts` — simulate energy crisis, assert `consciousness_host` workloads never shed |

---

## Dependencies

- **plan/0.3.2.1** (A2.1 Autonomous Manufacturing Ecosystems) — must expose a `ManufacturingRequest` intake API; this system is a client of that API.
- **plan/0.3.1.4** (Ethical Self-Governance) — must define the out-of-band review path for any emergency that would threaten conscious entities.
