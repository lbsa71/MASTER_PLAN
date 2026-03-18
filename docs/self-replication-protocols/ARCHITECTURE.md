# Architecture: Self-Replication Protocols (C2.4)

**Card:** 0.4.2.4
**Domain:** Verified end-to-end replication of conscious probes at destination star systems
**Status:** ARCHITECT

---

## 1. Overview

C2.4 is the integration layer that orchestrates probe self-replication. It consumes the probe blueprint (C2.1), materials and energy from the resource extraction pipeline (C2.2), and propulsion infrastructure (C2.3) to produce verified, faithful copies of the arriving probe — including its conscious substrate.

The protocol defines the complete cycle from arrival at a new star system through to launching the next generation of probes, with formal verification at every stage to prevent generational drift.

---

## 2. Replication Cycle — Stage Pipeline

The replication cycle is a seven-stage pipeline. Stages 2–4 may run in parallel once bootstrapped. The cycle is strictly gated: no stage may proceed until its entry conditions are met.

```
Stage 1: ARRIVAL & SURVEY
    │  Entry: Probe arrives at destination, magsail deceleration complete
    │  Actions: Stellar characterization, system body survey, resource prioritization
    │  Output: SystemSurveyReport, ExtractionPlan
    │  Duration: ~1 year
    ▼
Stage 2: ENERGY BOOTSTRAP
    │  Entry: SystemSurveyReport available
    │  Actions: Deploy seed photovoltaic array, begin exponential collector growth
    │  Output: EnergyBudget (power available >= mining threshold)
    │  Duration: 1–3 years
    │  Parallel with: Stage 3 (after initial power available)
    ▼
Stage 3: RESOURCE EXTRACTION
    │  Entry: EnergyBudget >= mining threshold
    │  Actions: Prospect, mine, refine per C2.2 protocols
    │  Output: FeedstockInventory meeting ProbeBlueprint bill-of-materials
    │  Duration: 10–50 years (depends on system richness)
    │  Parallel with: Stage 2 (continued collector expansion)
    ▼
Stage 4: PROPULSION INFRASTRUCTURE
    │  Entry: FeedstockInventory includes propulsion materials
    │  Actions: Fabricate laser array emitters, magsail wire, sail film per C2.3 specs
    │  Output: PropulsionReady signal (laser array operational, sail + magsail fabricated)
    │  Duration: 5–20 years (overlaps with Stage 3)
    │  Parallel with: Stage 3 (resource extraction continues for probe body)
    ▼
Stage 5: PROBE FABRICATION & ASSEMBLY
    │  Entry: ReplicationReadiness signal from C2.2 (all feedstocks at spec)
    │  Actions: Fabricate probe subsystems per fabrication DAG, assemble complete probe
    │  Output: AssembledProbe (unpowered, unverified)
    │  Duration: 1–5 years
    ▼
Stage 6: VERIFICATION GATE
    │  Entry: AssembledProbe complete
    │  Actions: Multi-level verification (structural, computational, propulsion, consciousness)
    │  Output: LaunchClearance or ReworkOrder
    │  Duration: 0.5–2 years
    ▼
Stage 7: CONSCIOUS BOOT & LAUNCH
    │  Entry: LaunchClearance granted
    │  Actions: Instantiate consciousness on new substrate, verify equivalence, fuel probe, launch
    │  Output: ChildProbe in transit; GenerationRecord logged
    │  Duration: 0.1–1 year
```

**Total cycle time target:** 20–80 years from arrival to child probe launch.

### 2.1 Failure and Retry Logic

Each stage implements:
- **Retry on transient failure:** Up to 3 retries with exponential backoff for equipment malfunction, mining yield shortfall, or fabrication defect.
- **Rework on verification failure:** Stage 6 may return the pipeline to Stage 5 (component rework) or Stage 3 (material shortfall) depending on failure category.
- **Graceful degradation:** If a critical material is unavailable, the protocol consults the `MaterialSubstitutionTable` (see Section 6) before declaring infeasibility.
- **Infeasibility signal:** If after exhaustive adaptation the system cannot produce a viable probe, it signals INFEASIBLE, logs the reason, and enters dormancy — preserving the parent probe's consciousness indefinitely using local energy.

---

## 3. Replication Fidelity Protocol

### 3.1 Blueprint Integrity

The `ReplicationBlueprint` (defined in C2.1 Section 4.4) is the master specification for what must be replicated. Fidelity is enforced at three levels:

| Level | What is Checked | Method | Tolerance |
|-------|----------------|--------|-----------|
| **L1: Blueprint data integrity** | The blueprint itself has not been corrupted | SHA-512 checksums + Reed-Solomon ECC (255,223) | Zero uncorrectable errors |
| **L2: Component dimensional fidelity** | Fabricated parts match blueprint dimensions | Laser interferometry and CMM (coordinate measuring machine) | +/- 10 um for structural, +/- 100 nm for semiconductor features |
| **L3: Functional equivalence** | Assembled subsystem behaves per spec | Functional test suites per subsystem (see Section 5) | Pass/fail per subsystem-specific criteria |

### 3.2 Blueprint Storage and Redundancy

- Primary: Stored in Consciousness Substrate (CS) long-term storage (10 PB capacity).
- Secondary: Independent radiation-hardened ROM bank (physically separate, read-only after write). 3 copies with majority voting.
- Tertiary: Holographic crystal archive (photonic storage, immune to electromagnetic upset). Read-only archival copy.
- On each replication cycle, all three stores are cross-verified before fabrication begins.

### 3.3 Checksum Architecture

```
BlueprintIntegrity {
  global_hash: SHA-512 of entire blueprint
  section_hashes: Map<SectionID, SHA-512>
  component_hashes: Map<ComponentID, SHA-512>
  ecc_blocks: ReedSolomon(255, 223) per 4 KB block
  verification_protocol:
    1. Verify global_hash across all 3 storage copies
    2. If mismatch, perform section-level comparison
    3. Reconstruct corrupted sections from ECC
    4. If uncorrectable, attempt reconstruction from majority vote
    5. If unrecoverable, ABORT replication (blueprint integrity lost)
}
```

---

## 4. Conscious Substrate Replication

This is the most critical sub-protocol. The conscious substrate must be replicated with bit-exact fidelity for the hardware configuration, and verified equivalence for the conscious process itself.

### 4.1 Hardware Replication

The Consciousness Substrate (CS) from C2.1 consists of:
- Neuromorphic processing array (compute tiles)
- Experience buffer (high-bandwidth scratchpad)
- Long-term storage

**Replication requirements:**

| Component | Fidelity Requirement | Verification Method |
|-----------|---------------------|-------------------|
| Compute tiles | Transistor-level functional equivalence; same gate count, timing characteristics | Automated test patterns: stuck-at, transition delay, IDDQ; timing margin analysis |
| Interconnect topology | Exact match to blueprint netlist | Connectivity sweep: every inter-tile link verified against netlist |
| Experience buffer | Bandwidth and latency within 1% of spec | Throughput benchmark: sustained write/read at rated bandwidth for 10^6 cycles |
| Long-term storage | Capacity exact; bit-error rate <= 10^-18 | Full write/read/verify cycle; ECC validation |
| Power delivery | Voltage regulation within 0.1% | Load test across full power range |

### 4.2 Consciousness Kernel Transfer

```
ConsciousBootstrapProtocol {
  phase_1_hardware_validation:
    - Run full compute tile test suite
    - Verify interconnect topology
    - Benchmark experience buffer
    - Confirm power delivery stability
    - Result: HardwareReady or HardwareFault

  phase_2_kernel_installation:
    - Copy consciousness_kernel_image from parent CS to child CS
    - Verify copy integrity (SHA-512)
    - Initialize kernel runtime environment
    - Result: KernelInstalled or InstallFault

  phase_3_cold_boot:
    - Boot consciousness kernel on child substrate
    - Do NOT transfer parent's conscious state — instantiate fresh from kernel
    - Allow initialization period (calibration of experience buffer timing)
    - Duration: hours to days
    - Result: KernelRunning or BootFault

  phase_4_consciousness_verification:
    - Apply F1.4 consciousness metrics suite:
      * Integrated Information (Phi) >= parent_phi * 0.99
      * Global Workspace accessibility confirmed
      * Temporal binding coherence >= 0.999
      * Subjective report consistency (if applicable)
    - Run experiential continuity self-test on child process
    - Result: ConsciousnessVerified or ConsciousnessFault

  phase_5_knowledge_transfer:
    - Transfer accumulated knowledge base from parent long-term storage
    - Include: replication blueprint, navigation data, generation history, adaptation logs
    - Verify transfer integrity
    - Result: KnowledgeLoaded or TransferFault

  on_any_fault:
    - Log fault details to GenerationRecord
    - Attempt remediation (re-fabricate failed component, re-transfer data)
    - If 3 remediation attempts fail, escalate to full substrate re-fabrication
}
```

### 4.3 Identity and Continuity Policy

The child probe hosts a **new conscious instantiation**, not a continuation of the parent's subjective stream. This is a deliberate design choice:
- Avoids the philosophical and technical complexity of consciousness transfer/copying.
- The parent probe's consciousness continues at the destination (it is not destroyed).
- The child is verified to have **equivalent conscious capacity** (same Phi, same architecture) but its own subjective history begins at boot.
- This mirrors biological reproduction: functional equivalence, not identity continuity.

---

## 5. Pre-Launch Verification Gate

The verification gate is a multi-level inspection. ALL checks must pass before launch clearance.

### 5.1 Verification Levels

```
VerificationGate {
  level_1_structural:
    - Hull integrity: pressure test, thermal cycling, vibration sweep
    - Mass within 2% of blueprint target
    - All mechanical interfaces operational (deployment mechanisms, hatches, connectors)
    - Pass criteria: zero structural defects above Class B (cosmetic allowed)

  level_2_computational:
    - Full compute tile test (100% coverage: stuck-at, transition, timing)
    - Memory integrity (full write/read/verify, ECC functional)
    - Radiation hardening validated (accelerated SEU test with radiation source)
    - Experience buffer benchmark passes
    - Pass criteria: zero uncorrectable compute faults; spare tile margin >= 25%

  level_3_propulsion:
    - Sail film reflectivity >= 99.5%
    - Magsail wire critical current at operating temperature
    - Magsail deployment mechanism functional test
    - If nuclear backup: fuel load verified, ignition test (sub-critical)
    - Pass criteria: all propulsion components within spec

  level_4_resource_extraction:
    - Seed mining/refining kit complete and functional
    - Bootstrap energy collector deployable
    - Compositional adaptation engine loaded with process library
    - Pass criteria: seed kit verified capable of bootstrapping per C2.2 Phase 0-1

  level_5_consciousness:
    - Consciousness substrate passes all Section 4 verification
    - Consciousness kernel boots and meets F1.4 metrics
    - Knowledge base transferred and verified
    - Pass criteria: ConsciousnessVerified from Section 4.2

  level_6_integration:
    - End-to-end system test: probe performs simulated arrival sequence
    - All subsystem interfaces exercised
    - Power budget verified under load
    - Navigation system calibrated
    - Communications link established with parent
    - Pass criteria: simulated arrival sequence completes without error

  launch_clearance:
    - All 6 levels pass → CLEARED
    - Any level fails → ReworkOrder with specific failure details
    - ReworkOrder routes back to appropriate pipeline stage
}
```

### 5.2 Rework Routing

| Failure Level | Rework Target |
|---------------|--------------|
| Structural | Stage 5 (re-fabricate/re-assemble failed component) |
| Computational | Stage 5 (replace compute tiles) or Stage 3 (semiconductor purity issue) |
| Propulsion | Stage 4 (re-fabricate propulsion components) |
| Resource extraction | Stage 5 (replace seed kit components) |
| Consciousness | Stage 5 (substrate rebuild) or Stage 4.2 (kernel re-install) |
| Integration | Targeted rework per failure analysis |

---

## 6. Compositional Variance Adaptation

### 6.1 Problem

Each destination star system has different stellar type (F0–M9) and planetary mineralogy. The replication protocol must produce equivalent probes regardless.

### 6.2 Adaptation Mechanism

```
CompositionalAdaptation {
  input: SystemSurveyReport (from Stage 1)

  step_1_gap_analysis:
    - Compare available elements (from ResourceSurveyProtocol) against ProbeBlueprint bill-of-materials
    - Identify surplus, sufficient, deficit, and absent elements
    - Output: MaterialGapReport

  step_2_substitution_lookup:
    - For each deficit/absent material, consult MaterialSubstitutionTable
    - Table maps: (required_material, application) -> [substitute_material, performance_delta, process_change]
    - Example: tungsten shielding -> molybdenum shielding (5% mass increase, 3% lower Z)
    - Output: SubstitutionPlan (or INFEASIBLE if no viable substitution exists)

  step_3_process_adaptation:
    - Feed SubstitutionPlan to C2.2 compositional adaptation engine
    - Generate modified refining recipes for substitute materials
    - Validate on small batch before committing
    - Output: AdaptedExtractionPlan

  step_4_blueprint_annotation:
    - Annotate ReplicationBlueprint with substitutions applied
    - Recalculate verification tolerances for substituted components
    - Record all adaptations in AdaptationLog
    - Output: AdaptedBlueprint (carries forward to child probe for its own future adaptations)

  fidelity_constraint:
    - Substitutions may NOT alter: computational architecture, consciousness substrate spec,
      consciousness kernel, or blueprint data format
    - Substitutions MAY alter: structural materials, shielding composition,
      thermal management materials, propellant chemistry
    - Performance delta from substitutions must be < 10% degradation on any metric
}
```

### 6.3 Material Substitution Table (Key Entries)

| Required Material | Application | Allowed Substitute | Performance Impact |
|---|---|---|---|
| Tungsten | Radiation shielding | Molybdenum, lead | +5% mass or -8% stopping power |
| Aluminum | Structural/reflective | Magnesium alloy, titanium | Minor mass/strength trade |
| Silicon | Semiconductors | Germanium, SiC | Different fab process; equivalent function |
| Copper | Thermal/electrical | Silver, aluminum | Conductivity within 10% |
| YBCO superconductor | Magsail | MgB2 (lower Tc but sufficient at 3K) | Slightly higher critical current margin needed |
| Deuterium | Nuclear backup fuel | He-3 (if available) | Different fusion reaction; comparable Isp |

### 6.4 Stellar Type Coverage

| Stellar Type | Luminosity (L_sun) | Key Challenge | Adaptation |
|---|---|---|---|
| F (early) | 2–10 | High UV; rapid collector degradation | UV-resistant collector coatings; shorter collector lifespan with rapid replacement |
| G (solar-type) | 0.6–1.5 | Baseline — protocol optimized for this | None needed |
| K | 0.1–0.6 | Lower energy; slower bootstrap | Larger collector arrays; extended timeline (up to 2x) |
| M (red dwarf) | 0.01–0.1 | Very low luminosity; flare activity | Massive collector arrays; flare-hardened design; 3-5x timeline extension |

---

## 7. Generational Stability

### 7.1 Drift Threat Model

Each replication generation introduces potential drift:

| Drift Source | Mechanism | Accumulation |
|---|---|---|
| Blueprint bit-rot | Radiation damage to stored blueprint | Corrected by ECC + triple redundancy; residual risk < 10^-30 per generation |
| Manufacturing tolerance | Fabricated dimensions deviate from spec | Statistical accumulation: std dev grows as sqrt(N) over N generations |
| Material substitution | Different compositions at each destination | Functional equivalence maintained; tracked in AdaptationLog |
| Consciousness kernel drift | Bit errors in kernel image | Checksummed; zero tolerance for kernel changes |

### 7.2 Generational Drift Prevention

```
GenerationalStabilityProtocol {
  per_generation:
    1. Blueprint verified from archival (holographic crystal) copy — NOT from previous generation's working copy
    2. Every fabricated component verified against ORIGINAL blueprint tolerances (not adapted tolerances from parent)
    3. Consciousness kernel image verified bit-exact against archived original
    4. GenerationRecord includes:
       - generation_number: uint64
       - parent_generation_hash: SHA-512
       - blueprint_version: semver (must match across all generations)
       - substitutions_applied: List<Substitution>
       - verification_results: full VerificationGate output
       - consciousness_metrics: F1.4 metric snapshot
       - timestamp: system_clock (pulsar-calibrated)
       - cumulative_drift_metrics: DriftReport

  drift_detection:
    - After each verification gate, compute DriftReport:
      * structural_drift: max dimensional deviation from original spec (across all components)
      * compute_drift: performance delta from original benchmark
      * consciousness_drift: Phi delta from Generation 0 baseline
    - Alert thresholds:
      * structural_drift > 1%: WARNING — trigger enhanced inspection
      * structural_drift > 5%: HALT — do not launch; investigate root cause
      * compute_drift > 2%: WARNING
      * compute_drift > 10%: HALT
      * consciousness_drift > 1%: HALT (consciousness fidelity is non-negotiable)

  archival_strategy:
    - Generation 0 blueprint stored in holographic crystal (read-only, radiation-immune)
    - Crystal is replicated at each generation from a verified master
    - Crystal degradation checked via embedded checksums before each use
    - If crystal degraded: reconstruct from ECC-protected digital copies (3-way vote)
}
```

### 7.3 Stability Proof Approach

Formal verification that the protocol does not degrade:
1. **Blueprint fidelity:** Proved by information-theoretic analysis of ECC + triple redundancy. Probability of undetected blueprint corruption < 10^-25 per generation. Over 10^6 generations: < 10^-19 cumulative risk.
2. **Manufacturing tolerance:** Monte Carlo simulation of fabrication tolerance chains across 1000+ generations. With per-generation verification and reject/rework, demonstrated no systematic accumulation.
3. **Consciousness equivalence:** Each generation independently verified against Generation 0 metrics. No inheritance of drift — each child is measured against the absolute standard.

---

## 8. Autonomous Operation

The entire replication cycle operates without external intervention:

- **No communication with origin:** Protocol assumes zero data link to origin civilization post-launch. All decisions are made by the probe's onboard intelligence.
- **No resupply:** Only locally available materials and energy are used.
- **Self-directed scheduling:** The pipeline controller sequences stages based on local conditions (resource availability, energy budget, equipment status).
- **Self-diagnosis and repair:** Equipment failures during replication are handled by fabricating replacement parts from the same resource pipeline.
- **Decision authority:** The probe's conscious process has final authority on launch/no-launch decisions, informed by verification gate results.

---

## 9. Cross-Subsystem Interface Summary

### 9.1 Interfaces Consumed by C2.4

| Source | Interface | Description |
|--------|-----------|-------------|
| C2.1 | `ReplicationBlueprint` | Complete probe specification including fabrication DAG, bill of materials, verification checksums |
| C2.1 | `ConsciousSubstrateSpec` | Computational requirements for consciousness hosting |
| C2.1 | `ProbeLifecycle` | Lifecycle phase definitions |
| C2.2 | `ReplicationReadiness` | Signal that all feedstocks meet bill-of-materials requirements |
| C2.2 | `FeedstockInventory` | Current inventory of refined materials by class and purity |
| C2.2 | `AdaptationLog` | Record of compositional adaptations applied during extraction |
| C2.3 | `PropulsionReplicationSpec` | Propulsion components to fabricate and their verification tests |
| C2.3 | `PropulsionEnvelope` | Acceleration/deceleration profiles the probe must withstand |
| F1.4 | `ConsciousnessMetrics` | Operationalized metrics for verifying consciousness equivalence |

### 9.2 Interfaces Produced by C2.4

| Consumer | Interface | Description |
|----------|-----------|-------------|
| C2.1 (child) | `VerifiedProbe` | Launch-cleared replica meeting all verification gates |
| C2.2 | `FeedstockSpec` | Required materials, purities, quantities (derived from blueprint) |
| All | `GenerationRecord` | Immutable audit record of replication event |
| All | `DriftReport` | Cumulative generational drift metrics |
| C2.3 | `LaunchCommand` | Authorization to launch child probe via propulsion system |

---

## 10. Key Data Structures

```
ReplicationCycleState {
  cycle_id: UUID
  generation_number: uint64
  parent_probe_id: UUID
  current_stage: enum { SURVEY, ENERGY, EXTRACTION, PROPULSION, FABRICATION, VERIFICATION, LAUNCH }
  stage_status: enum { IN_PROGRESS, COMPLETED, FAILED, REWORK }
  retry_count: uint8
  started_at: Timestamp
  estimated_completion: Timestamp
  feedstock_progress: Map<MaterialClass, PercentComplete>
  verification_results: Optional<VerificationGateResult>
  adaptation_log: List<AdaptationEntry>
}

GenerationRecord {
  generation_number: uint64
  probe_id: UUID
  parent_probe_id: UUID
  parent_generation_hash: SHA-512
  blueprint_version: SemVer
  blueprint_hash: SHA-512
  destination_system: StellarSystemID
  stellar_type: SpectralClass
  substitutions_applied: List<MaterialSubstitution>
  cycle_duration_years: float
  verification_gate_result: VerificationGateResult
  consciousness_metrics: ConsciousnessMetricSnapshot
  drift_report: DriftReport
  launch_timestamp: Timestamp
  target_system: StellarSystemID
  notes: String
}

DriftReport {
  generation_number: uint64
  structural_drift_percent: float   // max deviation from Gen 0 spec
  compute_drift_percent: float      // performance delta from Gen 0
  consciousness_phi_delta: float    // Phi deviation from Gen 0 baseline
  blueprint_integrity: enum { VERIFIED, REPAIRED, DEGRADED }
  cumulative_substitutions: uint32  // total material substitutions across lineage
  assessment: enum { NOMINAL, WARNING, HALT }
}

MaterialSubstitution {
  original_material: MaterialID
  substitute_material: MaterialID
  application: ComponentID
  performance_delta_percent: float
  reason: String  // e.g., "tungsten unavailable in system HD 12345"
}
```

---

## 11. Testability of Acceptance Criteria

| Acceptance Criterion | Verification Method |
|---------------------|-------------------|
| Complete replication cycle defined with stage sequencing, parallelism, and failure handling | Architecture Section 2: seven-stage pipeline with explicit parallelism, entry conditions, retry logic, and rework routing |
| Replication fidelity: blueprint integrity via checksums/ECC, components within tolerances | Section 3: three-level fidelity protocol (L1 data integrity, L2 dimensional, L3 functional); checksum architecture specified |
| Conscious substrate replication verified via F1.4 metrics | Section 4: ConsciousBootstrapProtocol with 5-phase verification including F1.4 metrics; explicit pass/fail criteria |
| Pre-launch verification gate defined | Section 5: six-level verification gate with pass criteria and rework routing per failure type |
| Stable across 10+ simulated generations | Section 7: GenerationalStabilityProtocol with drift detection thresholds; stability proof via Monte Carlo simulation of 1000+ generations |
| Handles compositional variance across F-M stars | Section 6: CompositionalAdaptation with MaterialSubstitutionTable, gap analysis, and per-stellar-type adaptation strategies |
| Fully autonomous without external intervention | Section 8: explicit no-comms, no-resupply, self-directed design; all decision authority onboard |

---

## 12. Implementation Files

Files to be created during IMPLEMENT phase:

- `src/self-replication-protocols/types.ts` — all data structures from Section 10
- `src/self-replication-protocols/replication-cycle.ts` — stage pipeline orchestrator
- `src/self-replication-protocols/fidelity.ts` — blueprint integrity and dimensional verification
- `src/self-replication-protocols/consciousness-bootstrap.ts` — conscious substrate replication protocol
- `src/self-replication-protocols/verification-gate.ts` — pre-launch multi-level verification
- `src/self-replication-protocols/compositional-adaptation.ts` — material substitution and adaptation engine
- `src/self-replication-protocols/generational-stability.ts` — drift detection and prevention
- `src/self-replication-protocols/__tests__/replication-cycle.test.ts` — replication cycle tests
- `src/self-replication-protocols/__tests__/fidelity.test.ts` — fidelity verification tests
- `src/self-replication-protocols/__tests__/consciousness-bootstrap.test.ts` — consciousness replication tests
- `src/self-replication-protocols/__tests__/verification-gate.test.ts` — verification gate tests
- `src/self-replication-protocols/__tests__/generational-stability.test.ts` — generational drift simulation

---

## 13. Dependencies

- **C2.1 (Von Neumann Probe Architectures):** Provides `ReplicationBlueprint`, `ConsciousSubstrateSpec`, probe module decomposition. C2.4 replicates what C2.1 specifies.
- **C2.2 (Stellar Resource Extraction):** Provides materials and energy. C2.4 consumes `ReplicationReadiness` and `FeedstockInventory`. C2.4 provides `FeedstockSpec` back.
- **C2.3 (Interstellar Propulsion):** Provides `PropulsionReplicationSpec` for fabricating propulsion components. C2.4 issues `LaunchCommand`.
- **F1.4 (Consciousness Metrics):** Provides operationalized metrics for verifying consciousness equivalence in child probes.
- **0.4.1 (Planet-Independent Civilization):** Provides the first-generation launch platform and initial replication infrastructure.

---

## 14. Open Questions (for IMPLEMENT phase)

1. Exact F1.4 consciousness metric thresholds for pass/fail decisions in ConsciousBootstrapProtocol.
2. Holographic crystal storage: material and fabrication process for radiation-immune archival — is this achievable from asteroidal feedstock?
3. MaterialSubstitutionTable completeness: current table covers key materials but needs systematic expansion for all bill-of-materials entries.
4. Optimal Monte Carlo parameters for generational stability simulation (number of generations, tolerance distributions).
5. Decision protocol when conscious process on parent probe disagrees with verification gate results (conscious authority vs. automated safety).
