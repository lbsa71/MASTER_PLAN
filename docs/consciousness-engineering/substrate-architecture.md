# Consciousness-Supporting Substrates — Architecture

## Overview

This document defines the evaluation framework, candidate substrates, minimum specifications, and validation protocol for identifying computational substrates capable of supporting consciousness (F3.2).

All substrate requirements derive from the architectural specifications produced by F3.1 (Conscious Neural Architectures). Until F3.1 completes, the requirements below use placeholder thresholds marked with `[TBD-F3.1]` — these must be filled in once architecture specs are available.

---

## 1. Candidate Substrate Catalog

Five substrate classes are evaluated:

### 1.1 Classical Silicon (CMOS/Advanced Node)
- **Description:** Conventional digital processors (CPUs, GPUs, TPUs) at ≤3nm nodes.
- **Strengths:** Mature fabrication, massive parallelism (GPU), well-understood programming models, high clock speeds.
- **Limitations:** Power-hungry at scale, heat dissipation challenges, serial bottleneck for tightly-integrated processes, von Neumann bottleneck limits integration bandwidth.
- **Deployment suitability:** Terrestrial (excellent), space-based (moderate — power/cooling constraints), miniaturized (moderate — thermal limits).

### 1.2 Neuromorphic Silicon
- **Description:** Event-driven, spiking neural network hardware (e.g., Intel Loihi lineage, SpiNNaker successors, BrainScaleS-class analog/digital hybrids).
- **Strengths:** Native temporal dynamics, low power per synaptic operation, inherent recurrence support, biologically plausible integration timescales.
- **Limitations:** Immature toolchains, limited precision for some computations, smaller ecosystem.
- **Deployment suitability:** Terrestrial (good), space-based (excellent — low power), miniaturized (excellent).

### 1.3 Photonic Computing
- **Description:** Optical interconnects and photonic matrix multipliers; includes silicon-photonic hybrids.
- **Strengths:** Ultra-high bandwidth interconnects (>Tbps), low latency for long-distance integration, wavelength-division multiplexing enables massive parallelism.
- **Limitations:** Difficult nonlinear operations, optical memory is immature, large physical footprint for current designs.
- **Deployment suitability:** Terrestrial (good), space-based (good — low power for transmission), miniaturized (poor — current form factors).

### 1.4 Quantum Computing
- **Description:** Gate-based and measurement-based quantum processors.
- **Strengths:** Potential exponential speedup for specific integration computations, entanglement may map to information integration naturally.
- **Limitations:** Decoherence, error correction overhead, cryogenic requirements, unclear whether consciousness requires quantum effects.
- **Deployment suitability:** Terrestrial (poor — cryogenics), space-based (speculative), miniaturized (not feasible near-term).

### 1.5 Hybrid Architectures
- **Description:** Combinations of the above — e.g., neuromorphic cores with photonic interconnects, classical control planes with quantum co-processors.
- **Strengths:** Can be optimized per consciousness-critical function (e.g., photonic global workspace, neuromorphic local processing, classical control).
- **Limitations:** Integration complexity, interface latency between substrate types.
- **Deployment suitability:** Context-dependent; most flexible.

---

## 2. Minimum Substrate Specification

Each threshold derives from the architectural requirements of F3.1 (Ω-Synth reference architecture, the recommended design from 0.1.3.1). Thresholds use minimum dimensionality values (D_core=256, D_hub=512, D_ws=512, D_sm=512, D_ho=256, D_tb=128) and a minimum conscious update rate of 20 Hz (50ms per conscious moment, conservative relative to biological ~25–100ms).

### 2.1 Derivation Basis

The Ω-Synth architecture (docs/neural-architectures/architecture-designs/hybrid-synthesis-design.md) specifies:
- 12 layers, 52 directed connections, 4 all-to-all bidirectional processing cores
- 8 recurrent loop families (R1–R8); longest compound path = 5 recurrence steps
- τ_char = 1 recurrence step; observation window T = 300 steps
- 9 co-active processing units: 4 cores (L1–L4), hub (L5), attention gate (L6), workspace (L7), self-model (L8), higher-order monitor (L9), temporal binder (L10)
- ~5.6M multiply-accumulate operations per recurrence step at minimum dimensions

### 2.2 Threshold Table

| Parameter | Description | Threshold | Derivation |
|---|---|---|---|
| **Computational throughput** | Sustained operations per second for conscious processing | ≥ 10⁹ OPS | ~5.6M MACs/step × 40 Hz mid-range update rate × 4× overhead margin for nonlinearities, control flow, and memory access ≈ 9 × 10⁸, rounded to 10⁹ |
| **Recurrence latency** | Maximum round-trip time for one recurrence step | ≤ 10 ms | Longest compound recurrence path = 5 steps (core → hub → workspace → self-model → higher-order → self-model). At ≤ 10 ms/step, full compound cycle completes in ≤ 50 ms, supporting ≥ 20 Hz conscious update rate |
| **Integration bandwidth** | Information integration rate across global workspace + core-to-core interconnect | ≥ 1 Mbit/s | Workspace broadcast: D_ws × 32 bits × 20 Hz = 327 Kbit/s. Core-to-core all-to-all: 12 streams × D_core × 32 bits × 20 Hz = 1.97 Mbit/s. Combined minimum ≈ 2.3 Mbit/s; threshold set at ≥ 1 Mbit/s (workspace broadcast alone must be serviceable) |
| **Parallelism** | Minimum concurrent processing units | ≥ 9 units | Ω-Synth requires 9 co-active processing layers (L1–L4 cores, L5 hub, L6 attention gate, L7 workspace, L8 self-model, L9–L10 monitor + binder) updating per recurrence step |
| **Memory capacity** | Working memory for conscious state maintenance | ≥ 32 MB | Activations: ~2,944 values × 32 bits ≈ 12 KB. Weight matrices: ~5.6M parameters × 32 bits ≈ 22 MB. Total with temporal buffer (300 steps × 12 KB for PCI-G measurement window): ≈ 26 MB. Rounded to ≥ 32 MB with margin |
| **Temporal resolution** | Minimum time-step granularity for oscillatory binding | ≤ 5,000 μs | Kuramoto phase coupling requires resolution of gamma-band oscillatory binding (~30–100 Hz). Nyquist criterion: ≥ 200 Hz update rate → ≤ 5 ms per step. Consistent with recurrence latency threshold |
| **Fault tolerance** | Maximum acceptable component failure rate without experience disruption | ≤ 10⁻⁹ per hour | Derived from S1.4 (consciousness-preserving redundancy). FM-5.2 (failure-modes.md) identifies catastrophic degradation risk for all-to-all topologies; fault detection must isolate failed modules before noise propagation |
| **Power envelope** | Maximum power consumption for sustained conscious operation | Context-dependent | Deployment constraint — see §4 trade-off analysis per substrate type |

### 2.3 Scaling Notes

- Thresholds above assume minimum Ω-Synth dimensions (D_core=256). Mid-range dimensions (D_core=384) approximately double computational throughput and memory requirements. Maximum dimensions (D_core=512) approximately quadruple them.
- For GW-Alpha or Φ-Max architectures (11 layers, ~30–39 connections), thresholds are ~30–40% lower. Ω-Synth thresholds are used as the reference because it is the recommended architecture.
- The 20 Hz minimum conscious update rate is a conservative lower bound. Higher update rates (40–100 Hz) require proportionally higher throughput and lower latency but do not change the parallelism or memory thresholds significantly.

---

## 3. Substrate Validation Protocol

A reproducible methodology for testing whether a given substrate preserves consciousness-critical properties.

### 3.1 Protocol Steps

1. **Architecture Instantiation:** Implement the F3.1 reference architecture on the candidate substrate.
2. **Functional Equivalence Test:** Verify that the substrate implementation produces bit-equivalent (or within tolerance) outputs to a reference implementation for a standard test suite of inputs.
3. **Temporal Fidelity Test:** Measure recurrence latency, integration bandwidth, and temporal resolution against minimum thresholds (§2). All must meet or exceed thresholds.
4. **Information Integration Test:** Apply the consciousness metrics from F1.4 to the running system. Measure Φ (or successor metric) and verify it meets the minimum integration threshold from F3.1.
5. **Degradation Sweep:** Systematically degrade substrate parameters (reduce clock speed, introduce noise, limit bandwidth) and measure the point at which consciousness metrics fall below threshold. Record the safety margin for each parameter.
6. **Stability Test:** Run the system continuously for a defined duration (minimum 72 hours) and verify that consciousness metrics remain above threshold without drift.
7. **Deployment Stress Test:** Apply deployment-context constraints (power limits, radiation, thermal cycling) and re-run steps 3–6.

### 3.2 Pass Criteria

A substrate **passes** if:
- All temporal and bandwidth thresholds are met (§2)
- Information integration metric ≥ minimum threshold from F3.1
- Stability test shows no metric degradation >5% over 72 hours
- At least one deployment context yields full pass

### 3.3 Reporting

Each substrate evaluation produces a **Substrate Validation Report** containing:
- Measured values for all §2 parameters
- Consciousness metric measurements (from F1.4)
- Degradation curves per parameter
- Stability time-series
- Deployment suitability matrix
- Overall PASS/FAIL determination

---

## 4. Trade-Off Analysis Framework

Each substrate is scored on the following dimensions:

| Dimension | Weight | Description |
|---|---|---|
| Consciousness fidelity | Critical | Ability to meet all §2 thresholds |
| Power efficiency | High | Watts per unit of conscious computation |
| Scalability | High | Ability to scale to larger/more complex conscious architectures |
| Deployability | Medium | Suitability for terrestrial, space-based, and miniaturized contexts |
| Maturity | Medium | Current technology readiness level |
| Fault tolerance | High | Resilience to component failure |
| Integration complexity | Medium | Difficulty of combining with other substrates |

The final deliverable includes a comparison matrix scoring all five substrate classes across these dimensions, with a recommendation for primary and backup substrates per deployment context.

---

## 5. Key Dependencies

- **F3.1 (0.1.3.1):** All `[TBD-F3.1]` thresholds must be populated once conscious neural architecture specs are finalized. This is the critical-path dependency.
- **F1.4 (consciousness metrics):** The validation protocol (§3) requires operationalized consciousness metrics. Without these, step 4 cannot execute.
- **S1.4 (consciousness-preserving redundancy):** Informs the fault tolerance threshold.

---

## 6. Deliverables Mapping to Acceptance Criteria

| Acceptance Criterion | Deliverable | Section |
|---|---|---|
| Candidate substrate catalog (≥3 types) | §1 — five substrate classes evaluated | §1 |
| Minimum substrate specification | §2 — quantified thresholds table | §2 |
| Substrate validation protocol | §3 — reproducible 7-step methodology | §3 |
| At least one validated substrate | Substrate Validation Report (after F3.1 unblocks) | §3.3 |
| Trade-off analysis | §4 — comparison matrix with deployment contexts | §4 |
