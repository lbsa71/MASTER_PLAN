# Autonomous Space Manufacturing — Architecture

**Card:** 0.4.1.3
**Phase:** ARCHITECT → IMPLEMENT
**Domain:** `docs/autonomous-space-manufacturing/`

---

## Overview

This document defines the system architecture for closed-loop, autonomous space manufacturing — the capability described in Master Plan item C1.3.

**Goal:** Given asteroid-derived feedstock (from 0.4.1.2), produce validated functional components suitable for consciousness-hosting substrates (consumed by 0.4.1.4), with zero Earth imports and no human intervention in the production loop.

---

## System Boundaries

| Boundary | Interface |
|----------|-----------|
| **Upstream (0.4.1.2)** | Raw feedstock delivery: classified bulk material streams (metals, silicates, volatiles) with assay certificates |
| **Downstream (0.4.1.4)** | Component handoff: validated parts with QA manifests signed by the Autonomous Quality Control subsystem |
| **Energy source** | Solar array bus; no hydrocarbon or Earth-supplied consumables |
| **Human interaction** | Mission-parameter upload only (production targets, design files); no real-time human control of the production loop |

---

## Subsystem Decomposition

### 1. In-Situ Resource Processing Pipeline (ISRP)

Converts raw asteroid feedstock into manufacturing-grade material stocks.

**Inputs:**
- Bulk regolith / ore streams: metallic (Fe-Ni, Al, Ti), silicate (SiO₂, MgO), volatile (H₂O, CO₂, CH₄)

**Outputs:**
- Refined metals (wire, powder, sheet) with purity ≥ specification threshold
- Dielectric feedstock for insulation and substrate layers
- Process gases for controlled-atmosphere operations

**Key interfaces:**
```
FeedstockAssay {
  materialClass: MetalClass | SilicateClass | VolatileClass
  composition: Map<Element, MassFraction>
  particleSize: SizeDistribution
  contaminantFlags: ContaminantReport[]
}

RefinedStock {
  materialId: UUID
  grade: ManufacturingGrade          // defines which fabrication ops may use it
  purity: number                     // 0–1
  quantityKg: number
  batchCertificate: SignedHash
}
```

**Process steps:** magnetic/electrostatic separation → thermal refining (solar concentrator) → chemical reduction (hydrogen reduction for oxides) → powder/wire/sheet production → batch certification.

---

### 2. Microgravity Fabrication Module (MFM)

Produces physical components in microgravity using additive, subtractive, and assembly operations.

**Inputs:**
- `RefinedStock` from ISRP
- `ComponentDesign` (design files loaded from mission-parameter store)

**Outputs:**
- `FabricatedPart` (as-manufactured, pre-QA)

**Key interfaces:**
```
ComponentDesign {
  designId: UUID
  revision: SemanticVersion
  geometrySpec: GCode | STEPFile
  materialRequirements: Map<FeatureId, ManufacturingGrade>
  tolerances: ToleranceSpec
  radiationHardeningRequirements: RadHardSpec
}

FabricatedPart {
  partId: UUID
  designId: UUID
  fabricationTimestamp: EpochSeconds
  processLog: ProcessEvent[]        // full audit trail
  asManufacturedGeometry: PointCloud | MeshFile
}
```

**Fabrication modes:**
- **Additive:** directed energy deposition (DED) for metals; binder jetting for ceramic/composite substrates
- **Subtractive:** robotic milling in micro-g fixture (part held by electrostatic clamp)
- **Assembly:** robotic pick-and-place with vision-guided alignment for multi-material components

**Microgravity adaptations:**
- All material handling via electrostatic or magnetic capture (no gravity settling)
- Closed-loop particle capture for waste management
- Vibration-isolated build platform with active damping

---

### 3. Autonomous Quality Control (AQC)

Validates fabricated parts against design specification; disposition pass/fail/rework.

**Inputs:**
- `FabricatedPart` from MFM
- `ComponentDesign` (as reference)

**Outputs:**
- `QAManifest` — signed pass/fail/rework record
- `RecalibrationOrder` — issued to CLCS when systematic errors detected

**Key interfaces:**
```
QAManifest {
  partId: UUID
  disposition: "PASS" | "FAIL" | "REWORK"
  inspectionResults: InspectionRecord[]
  validatorSignature: SignedHash
  feedsDownstream: boolean           // true iff disposition == PASS
}

InspectionRecord {
  method: "CT_SCAN" | "OPTICAL_CMM" | "ELECTRICAL_TEST" | "THERMAL_CYCLE"
  measuredValue: Measurement
  specValue: Measurement
  withinTolerance: boolean
}

RecalibrationOrder {
  subsystem: "MFM" | "ISRP"
  failureMode: FailureMode
  suggestedAdjustment: CalibrationDelta
  priority: "IMMEDIATE" | "SCHEDULED"
}
```

**Inspection methods:**
- Micro-CT scanning for internal geometry and void detection
- Optical coordinate metrology for external dimensions
- Electrical continuity and resistance testing for conductive traces
- Thermal cycling soak for radiation-hardened substrates

---

### 4. Closed-Loop Control System (CLCS)

Orchestrates all subsystems; handles fault detection, recalibration, and job re-queuing without human intervention.

**Inputs:**
- `QAManifest` from AQC
- `RecalibrationOrder` from AQC
- Sensor telemetry from ISRP, MFM, PMS

**Outputs:**
- `ProductionOrder` dispatched to ISRP and MFM
- `CalibrationCommand` to MFM/ISRP actuators
- Production status telemetry (uplinked; no downlink required for operation)

**Control loop:**
```
loop:
  state = collectSystemState(ISRP, MFM, AQC, PMS)
  if anomaly detected:
    issue RecalibrationOrder
    await CalibrationAck
  next_job = scheduler.select(productionQueue, state)
  dispatch ProductionOrder(next_job)
  monitor to completion
  process QAManifest
  if FAIL or REWORK:
    re-queue with updated parameters
  update productionQueue
```

**Fault taxonomy:**
- `MATERIAL_OFF_SPEC` → re-route to ISRP for reprocessing
- `GEOMETRY_DRIFT` → issue toolpath recalibration to MFM
- `POWER_BUDGET_EXCEEDED` → throttle production rate via PMS
- `REPEATED_FAILURE` (>3 consecutive) → quarantine design, flag for mission-parameter review

---

### 5. Power Management System (PMS)

Ensures manufacturing operations remain within the solar-powered energy budget.

**Key interfaces:**
```
PowerBudget {
  availableWatts: number              // real-time solar generation
  allocations: Map<Subsystem, Watts>
  storageKwh: number                  // battery / flywheel reserve
  projectedDeficitHours: number       // hours until reserve depleted at current draw
}
```

**Strategy:**
- Solar array sized for peak production rate + 20% margin
- Operations scheduled to solar illumination window; battery bridges eclipse
- CLCS throttles production if `projectedDeficitHours < 2`
- ISRP thermal refining (highest draw) priority-scheduled at peak solar

---

## Data Flow Diagram

```
[Asteroid Feedstock]
       |
       v
  [ISRP Pipeline] ──── FeedstockAssay / RefinedStock ────>
       |                                                   |
       |                                               [CLCS Orchestrator]
       v                                                   |
  [MFM Fabrication] <──── ProductionOrder ────────────────+
       |                                                   |
       |──── FabricatedPart ────> [AQC] ──── QAManifest ──+
                                     |
                                     |── RecalibrationOrder ──> [CLCS]
                                     |
                              [PASS] v
                    [Validated Component Store]
                               |
                               v
                  [0.4.1.4 Self-Replicating Systems]
```

---

## Acceptance Criteria — Test Approach

| Acceptance Criterion | Test Method |
|---------------------|-------------|
| ISRP converts feedstock without Earth consumables | Mass-balance audit over a 30-day simulated run; verify all reagents sourced from asteroid volatiles |
| MFM produces radiation-hardened components to spec | AQC CT scan + electrical test pass rate ≥ 99% on sample lot |
| Autonomous control loop recovers from fabrication errors | Inject 10 synthetic fault conditions; verify re-queue and recovery without human intervention in each case |
| Solar energy budget is self-sustaining | 90-day power telemetry: `projectedDeficitHours` never reaches 0; no production stoppages due to power |
| Output components pass QA for 0.4.1.4 integration | Component handoff QA manifest accepted by 0.4.1.4 intake interface; zero Earth-imported materials in BOM |
| End-to-end demonstration | Full traceability chain: asteroid sample ID → refined stock batch → fabricated part → QA pass → downstream intake |

---

## Dependencies

- **0.4.1.2** (Asteroid Resource Utilization): provides `FeedstockAssay`-compliant material streams
- **0.4.1.1** (Space-Based Consciousness Infrastructure): provides orbital platform, solar array bus, and communications link for mission-parameter upload
- **Radiation-Hardened Computation** (docs/radiation-hardened-computation/): defines `RadHardSpec` used in `ComponentDesign`
- **Self-Repairing Nanofabrication** (docs/self-repairing-nanofabrication/): informs tolerances for consciousness-hosting substrates

---

## Files To Produce (IMPLEMENT phase)

- `docs/autonomous-space-manufacturing/ARCHITECTURE.md` ← this document
- `docs/autonomous-space-manufacturing/isrp-process-spec.md` — detailed ISRP chemistry and thermal process specs
- `docs/autonomous-space-manufacturing/mfm-fabrication-modes.md` — microgravity fabrication techniques and equipment specs
- `docs/autonomous-space-manufacturing/clcs-fault-taxonomy.md` — complete fault taxonomy and recovery procedures
- `docs/autonomous-space-manufacturing/qa-inspection-protocol.md` — AQC inspection procedure and pass/fail thresholds
- `docs/autonomous-space-manufacturing/power-budget-model.md` — solar energy budget calculations and margin analysis
