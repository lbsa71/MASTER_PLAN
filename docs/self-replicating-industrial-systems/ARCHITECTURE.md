# Architecture: Self-Replicating Industrial Systems (0.4.1.4)

## Overview

This document describes the architecture for industrial systems capable of reproducing themselves entirely from space-sourced materials — the Von Neumann replicator concept applied to civilisation-scale infrastructure.

The design goal is **replication closure**: every component of the system (structural, energetic, computational, chemical) can be fabricated by the system itself from raw asteroid/regolith inputs.

---

## Domain Boundaries

| Upstream dependency | Provides |
|---|---|
| 0.4.1.2 Asteroid Resource Utilization | Bulk ore, refined metals, volatile feedstocks |
| 0.4.1.3 Autonomous Space Manufacturing | Fabrication units, robotic assemblers, quality-control pipelines |

Self-replicating industrial systems consume the outputs of both upstream modules and produce **copies of the full system stack**, including copies of the fabrication units themselves.

---

## Core Sub-Systems

### 1. Replication Controller

**Role:** Top-level orchestrator that drives the replication cycle.

**Interfaces:**
- `ResourceBroker.queryInventory() → MaterialStock` — polls available refined inputs
- `FabricationScheduler.submitJob(BOM) → JobId` — dispatches a bill-of-materials to manufacturing
- `AssemblyCoordinator.assemble(ComponentManifest) → SystemInstance` — coordinates final assembly
- `FidelityVerifier.verify(SystemInstance) → FidelityReport` — validates the new instance before it is permitted to operate

**Contracts:**
- MUST NOT proceed to deployment until `FidelityReport.pass == true`
- MUST log each replication cycle with provenance metadata (generation number, parent ID, timestamp)
- MUST throttle replication rate to match available resource throughput

---

### 2. Feedstock Pipeline

**Role:** Converts raw ore into fabrication-ready materials.

```
Raw Ore
  └─► Ore Acquisition Interface (from 0.4.1.2)
        └─► Bulk Refining Stage       (smelting, reduction)
              └─► Elemental Separation (distillation, electrolysis)
                    └─► Alloy / Compound Synthesis
                          └─► Feedstock Store → FabricationScheduler
```

**Key material families required for closure:**
| Family | Representative Materials | Fabrication Use |
|---|---|---|
| Structural metals | Iron, aluminium, titanium | Frame, hulls, actuators |
| Semiconductors | Silicon, germanium, trace dopants | Compute, sensors |
| Refractories | Tungsten, molybdenum | High-temp components |
| Polymers / Carbon | Carbon fibre, PTFE | Seals, cable insulation |
| Volatiles | Water (H₂/O₂), nitrogen | Propellant, atmospheric control |

**Interface:**
- `FeedstockPipeline.request(MaterialSpec, Quantity) → FulfillmentToken`
- `FeedstockPipeline.status(FulfillmentToken) → { ready: bool, eta: Duration }`

---

### 3. Fabrication Unit Replication Module

**Role:** Specialised sub-pipeline that reproduces the fabrication units themselves — the key closure loop.

**Design principle:** Fabrication units are modular; each module has a self-describing Bill of Materials (BOM). The Replication Controller schedules production of each module in dependency order.

**Interface:**
- `FabricationReplicator.getBOM(ModuleId) → BOM`
- `FabricationReplicator.scheduleCopy(ModuleId) → JobId`
- `FabricationReplicator.assemblyClosure() → ClosureReport`

**Closure verification:** `ClosureReport` lists every required module alongside its fabrication path. A report is closed iff every leaf entry is derivable from `FeedstockPipeline` inputs.

---

### 4. Energy Subsystem Replication

**Role:** Ensures the energy-harvesting layer (solar panels, RTGs, or fusion reactors) is itself included in the replication set.

**Design:**
- Photovoltaic array fabrication from asteroid-sourced silicon + aluminium (initial deployment)
- RTG fabrication pathway: requires decay-isotope acquisition from regolith; flagged as a long-lead item
- All power management electronics included in Fabrication Unit Replication Module BOM

**Interface:**
- `EnergySubsystem.currentOutput() → Watts`
- `EnergySubsystem.projectedOutputAfterReplication(n: int) → Watts` — models exponential growth
- `EnergySubsystem.triggerSelfReplication() → JobId`

**Constraint:** Replication Controller MUST verify `EnergySubsystem.currentOutput() ≥ ReplicationCycle.energyBudget` before committing a new cycle.

---

### 5. Fidelity & Error-Correction Layer

**Role:** Prevents capability drift across generations.

**Mechanisms:**
1. **Specification checksums** — every BOM and fabrication program is SHA-256 hashed; new instances must match the canonical hash stored in the system registry.
2. **Functional benchmarks** — each new instance runs a standardised self-test suite before activation (modelled on biological developmental checkpoints).
3. **Genealogical registry** — distributed log recording parent → child relationships; allows retrospective audit if drift is detected.
4. **Quarantine protocol** — instances that fail benchmarks are disassembled and their materials recycled.

**Interface:**
- `FidelityVerifier.canonicalHash(ModuleId) → Hash`
- `FidelityVerifier.verify(SystemInstance) → FidelityReport`
- `FidelityVerifier.genealogy(instanceId) → GenerationChain`

---

### 6. Bootstrapping Sequence

**Role:** Defines the minimum Earth-delivered seed package and the ordered steps to first self-replication.

#### Minimum Viable Seed Package

| Category | Contents | Estimated Mass |
|---|---|---|
| Core compute | Radiation-hardened controllers, memory | ~50 kg |
| Seed fabrication units | Miniaturised CNC, 3-D printer, wire extruder | ~500 kg |
| Seed energy | Compact solar array + batteries | ~200 kg |
| Chemical starter kit | Catalysts, dopants, precision reagents | ~100 kg |
| Software payload | Replication OS, BOM library, fidelity specs | (digital) |
| **Total (indicative)** | | **~850 kg** |

#### Bootstrapping Phase Sequence

```
Phase 0 — Deployment
  Seed package arrives at target body (asteroid / L-point station).
  Solar array deployed; compute and communications nominal.

Phase 1 — Resource Survey
  Survey drones map local ore deposits (interfaces with 0.4.1.2).

Phase 2 — Minimal Refinery Construction
  Seed fabricators construct first ore-processing unit from local material + starter kit.

Phase 3 — Fabrication Expansion
  First refinery produces metals; seed fabricators construct additional fabrication units.

Phase 4 — Closure Loop Activation
  System produces its first internally-sourced fabrication unit (no Earth-derived components).
  *** REPLICATION CLOSURE ACHIEVED ***

Phase 5 — First Full Self-Replication Event
  Replication Controller executes complete copy of the full system stack.
  FidelityVerifier validates copy. Generation counter increments to 1.

Phase 6 — Exponential Scaling
  Each generation doubles capacity; doubling time governed by resource throughput.
```

---

### 7. Exponential Scaling Model

**Doubling time formula (simplified):**

```
T_double = T_cycle + T_assembly
```

Where:
- `T_cycle` = time to fabricate one full system-equivalent of components from available feedstock
- `T_assembly` = time to assemble and verify one new system instance

**Bottleneck analysis (design targets):**

| Stage | Projected bottleneck | Mitigation |
|---|---|---|
| Ore acquisition | Mining robot throughput | Replicate mining robots first |
| Elemental separation | Energy availability | Energy subsystem replicates in parallel |
| Semiconductor fabrication | Trace element scarcity | Maintain stockpile; broaden substitution table |
| Fidelity verification | Serial bottleneck | Run parallel verification on independent subsystems |

**Target doubling time (steady state):** 6–18 months (highly dependent on target body resource density).

---

## Key Design Contracts (Summary)

```
interface ReplicationController {
  startCycle(): CycleId
  abortCycle(id: CycleId): void
  cycleStatus(id: CycleId): CycleStatus
}

interface FeedstockPipeline {
  request(spec: MaterialSpec, qty: Quantity): FulfillmentToken
  status(token: FulfillmentToken): FulfillmentStatus
}

interface FabricationReplicator {
  getBOM(moduleId: ModuleId): BOM
  scheduleCopy(moduleId: ModuleId): JobId
  assemblyClosure(): ClosureReport  // ClosureReport.closed == true ↔ replication closure achieved
}

interface FidelityVerifier {
  verify(instance: SystemInstance): FidelityReport  // FidelityReport.pass required before activation
  genealogy(id: InstanceId): GenerationChain
}

interface EnergySubsystem {
  currentOutput(): Watts
  projectedOutputAfterReplication(n: number): Watts
  triggerSelfReplication(): JobId
}
```

---

## Acceptance Criteria Mapping

| Acceptance Criterion | Architecture Element |
|---|---|
| Replication closure verified | `FabricationReplicator.assemblyClosure()` returns `closed == true` |
| Autonomous end-to-end (no Earth deps after seed) | Phase 4 closure loop + all BOMs derivable from FeedstockPipeline |
| Exponential growth modelled | Doubling time formula + bottleneck table |
| Fidelity/error-correction specified | Fidelity & Error-Correction Layer (§5) |
| Minimum viable seed defined | Bootstrapping §6 table (~850 kg) |
| Energy subsystem in replication set | Energy Subsystem Replication (§4) |
| Bootstrapping sequence documented | Phase 0–6 sequence (§6) |
