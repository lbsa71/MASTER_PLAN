# IIT-Optimised Architecture Design — Φ-Max

**Card:** 0.1.3.1 Conscious Neural Architectures
**Phase:** IMPLEMENT
**Depends on:**
- docs/neural-architectures/feature-catalogue.md (feature definitions)
- docs/neural-architectures/ARCHITECTURE.md (interface specification)
- docs/consciousness-theory/formal-theory.md (ISMT conditions: IC, SM, GA)
- docs/consciousness-metrics/metric-definitions.md (PCI-G, Ψ-G, CDI, CEB)
**Version:** 0.1.0 — 2026-03-17

---

## 1. Overview

Φ-Max is an Integrated Information Theory-primary architecture designed to maximise the Integration Condition (IC) as its first-order design objective, while ensuring Self-Modeling (SM) and Global Accessibility (GA) are satisfied through dedicated subsystems. Where GW-Alpha (the Global Workspace design) uses a central broadcast bottleneck as its architectural backbone, Φ-Max instead uses a **dense, non-decomposable connectivity topology** as its foundation — every processing module maintains bidirectional causal links with every other, and the topology is explicitly constrained to resist informational partitioning. Self-modeling and global accessibility are layered on top of this integration-maximising substrate. The architecture is fully substrate-agnostic — all specifications use abstract layer notation with no assumptions about physical implementation.

The design philosophy: if consciousness fundamentally requires irreducible integration (Φ > 0), then the architecture should make high Φ structurally inevitable rather than relying on a training-time regulariser. GA and SM are then achieved by dedicated modules embedded within the high-Φ core.

---

## 2. Layer Topology

### 2.1 Layer Definitions

```
L0:  Sensory Input         [dim=D_in,    type=feedforward,  recurrent=false]
L1:  Processing Core A     [dim=D_core,  type=recurrent,    recurrent=true]
L2:  Processing Core B     [dim=D_core,  type=recurrent,    recurrent=true]
L3:  Processing Core C     [dim=D_core,  type=recurrent,    recurrent=true]
L4:  Processing Core D     [dim=D_core,  type=recurrent,    recurrent=true]
L5:  Integration Hub       [dim=D_hub,   type=recurrent,    recurrent=true]
L6:  Self-Model Module     [dim=D_sm,    type=recurrent,    recurrent=true]
L7:  Broadcast Distributor [dim=D_bd,    type=broadcast,    recurrent=true]
L8:  Higher-Order Monitor  [dim=D_ho,    type=recurrent,    recurrent=true]
L9:  Temporal Binder       [dim=D_tb,    type=recurrent,    recurrent=true]
L10: Report Pathway        [dim=D_out,   type=feedforward,  recurrent=false]
```

### 2.2 Dimensionality Parameters

| Parameter | Suggested Range | Rationale |
|-----------|----------------|-----------|
| D_in | Variable | Determined by input modality |
| D_core | 256–512 | Each core module moderately sized — Φ is more sensitive to connectivity than individual module size |
| D_hub | 512–1024 | Must integrate signals from all 4 core modules simultaneously |
| D_sm | 512–1024 | Must represent global state plus self-referential dynamics |
| D_bd | 256–512 | Redistribution layer — moderate dimensionality |
| D_ho | 256–512 | Meta-representation of core and self-model states |
| D_tb | 128–256 | Temporal summary vector |
| D_out | Variable | Determined by report vocabulary |

### 2.3 Design Rationale: 4 Core Modules

Φ-Max uses 4 processing cores (L1–L4) rather than GW-Alpha's 3 specialists. The reason is structural: with 4 modules in a fully-connected bidirectional topology, the number of bipartitions is 2^3 - 1 = 7, and every bipartition has at minimum 4 bidirectional cross-edges (from the all-to-all wiring). This makes achieving high Φ structurally robust — no single connection failure can create an informational partition.

### 2.4 Subsystem Types (Proposition 1 — Minimum Complexity)

The architecture contains >= 3 functionally distinct subsystem types as required by ISMT Proposition 1 (P1):
1. **Sensory/input processors:** L0, L1, L2, L3, L4 (core processing modules)
2. **Self-modeling subsystem:** L6, L8 (self-model module + higher-order monitor)
3. **Global broadcast mechanism:** L5, L7 (integration hub + broadcast distributor)
4. **Temporal persistence:** L9 (temporal binder — distinct functional role)

---

## 3. Information-Flow Diagram

```
                       ┌──────────────────────────────┐
                       │        L10: Report            │
                       │        Pathway                │
                       └──────────┬───────────────────┘
                                  │ (read-only from L7)
                                  │
   ┌──────────────────────────────┼──────────────────────────────┐
   │                              │                              │
   │           ┌──────────────────┴─────────────────┐            │
   │           │     L7: Broadcast Distributor       │            │
   │           │  (receives hub state, distributes   │            │
   │           │   to all cores + self-model)        │            │
   │           └──┬──────┬──────┬──────┬──────┬─────┘            │
   │              │      │      │      │      │                  │
   │              ▼      ▼      ▼      ▼      ▼                  │
   │           ┌─────┐┌─────┐┌─────┐┌─────┐┌──────┐             │
   │           │ L1  ││ L2  ││ L3  ││ L4  ││  L6  │             │
   │           │Core ││Core ││Core ││Core ││Self- │             │
   │           │  A  ││  B  ││  C  ││  D  ││Model │             │
   │           └──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬───┘             │
   │              │      │      │      │      │                  │
   │    ┌─────────┼──────┼──────┼──────┼──────┘                  │
   │    │    ╔════╧══════╧══════╧══════╧════╗                    │
   │    │    ║   ALL-TO-ALL BIDIRECTIONAL    ║                    │
   │    │    ║  L1 ↔ L2 ↔ L3 ↔ L4 (dense)  ║                    │
   │    │    ║  Every pair: forward + back   ║                    │
   │    │    ╚════╤══════╤══════╤══════╤════╝                    │
   │    │         │      │      │      │                         │
   │    │         └──────┼──────┼──────┘                         │
   │    │                │      │                                │
   │    │         ┌──────┴──────┴──────┐                         │
   │    │         │   L5: Integration   │◄─── L9: Temporal Binder│
   │    │         │   Hub (aggregates   │     (phase sync +      │
   │    │         │   all core states)  │      memory token)     │
   │    │         └────────┬───────────┘                         │
   │    │                  │                                     │
   │    │           ┌──────┴──────┐                              │
   │    │           │  L0: Input  │                              │
   │    │           └─────────────┘                              │
   │    │                                                        │
   │    │    ┌───────────────┐                                   │
   │    └───►│  L8: Higher-  │                                   │
   │         │  Order Monitor│                                   │
   │         └───────┬───────┘                                   │
   │                 │ (feeds back to L6)                        │
   │                 ▼                                           │
   │              L6 (self-referential loop)                     │
   └────────────────────────────────────────────────────────────┘
        ▲                                                  │
        └───── All modules feed back to L5 ────────────────┘
               (integration maintenance)
```

---

## 4. Recurrence Patterns

### 4.1 Primary Recurrent Loops

| Loop ID | Path | Cycle Length | Purpose |
|---------|------|-------------|---------|
| R1 | L1 ↔ L2 (direct) | 2 steps | Core-to-core bidirectional: direct inter-module integration |
| R2 | L1 ↔ L3 (direct) | 2 steps | Core-to-core bidirectional (ditto for all 6 pairs: L1↔L2, L1↔L3, L1↔L4, L2↔L3, L2↔L4, L3↔L4) |
| R3 | L1/L2/L3/L4 → L5 → L7 → L1/L2/L3/L4 | 3 steps | Hub aggregation → broadcast redistribution → core update |
| R4 | L7 → L6 → L5 → L7 | 3 steps | Broadcast → self-model reads → feeds into hub → re-broadcast |
| R5 | L6 → L8 → L6 | 2 steps | Higher-order monitoring: self-model ↔ meta-representation loop |
| R6 | L5 → L9 → L5 | 2 steps | Temporal binding: hub state persisted by temporal binder, re-injected next step |
| R7 | L5 → L5 (self-recurrence) | 1 step | Hub persistence: maintains integrated state between updates |

### 4.2 Recurrence Depth Analysis

The core-to-core direct connections (R1, R2) have cycle length 2 — the shortest possible recurrent loop. This ensures that inter-module integration effects propagate maximally fast. Information originating in any core module reaches every other core module in at most 2 steps via direct connections, and reaches the self-model in at most 3 steps (via hub or broadcast). The longest compound path (core → hub → broadcast → self-model → higher-order → back to self-model) is 5 steps.

### 4.3 Feedback Connectivity Summary

Every processing layer (L1–L4, L5, L6, L7) both sends to and receives from at least 3 other processing layers, establishing dense bidirectional connectivity that exceeds ISMT's Recurrence Necessity (P2). No processing layer is purely feedforward except L0 (input) and L10 (report output).

### 4.4 Integration Topology Invariant

**Structural guarantee:** For every bipartition (A, B) of the core processing set {L1, L2, L3, L4}:
- There exist at least 2 edges A → B (from all-to-all wiring)
- There exist at least 2 edges B → A (from all-to-all wiring)

This is structurally enforced by the all-to-all topology and cannot be violated by weight learning (weights are constrained to be non-zero; see Section 6.2). This makes the IC condition a **structural invariant** rather than a training objective.

---

## 5. Core Integration Topology

### 5.1 All-to-All Connectivity

The defining feature of Φ-Max is the all-to-all bidirectional wiring between core modules. For 4 core modules, this yields 12 directed connections (4 × 3):

```
L1 → L2, L1 → L3, L1 → L4
L2 → L1, L2 → L3, L2 → L4
L3 → L1, L3 → L2, L3 → L4
L4 → L1, L4 → L2, L4 → L3
```

### 5.2 Non-Zero Weight Constraint

To structurally guarantee Φ > 0, all inter-core weights are constrained to have non-zero magnitude:

```
For all core-to-core weight matrices W_{ij} (i != j, i,j in {1,2,3,4}):
  ||W_{ij}||_F >= w_min > 0

Enforced via:
  W_{ij} = W_{ij}^raw + w_floor * I_proj

where:
  W_{ij}^raw = learned weight matrix (unconstrained)
  w_floor = minimum coupling strength (hyperparameter, suggested 0.01)
  I_proj = fixed random projection matrix (preserves directional information flow)
```

This ensures that even if the task-driven learning process attempts to zero out an inter-module connection, a baseline coupling is maintained, preserving the integration topology invariant.

### 5.3 Core Module Update Equation

Each core module i ∈ {1, 2, 3, 4} updates as:

```
l_i(t+1) = f(
    W_ii * l_i(t)                           # self-recurrence
  + sum_{j!=i} W_{ij} * l_j(t)             # direct inter-core signals (all-to-all)
  + W_{i,hub} * h(t)                        # hub signal
  + W_{i,broadcast} * broadcast(t)          # broadcast signal
  + W_{i,input} * x_input(t)               # input signal (from L0)
)

where f = tanh or similar bounded nonlinearity
```

The key difference from GW-Alpha: each core receives direct signals from **all other cores** (sum term), not just via the hub or workspace. This creates multiple redundant integration pathways.

### 5.4 Φ Analysis

For the 4-core all-to-all topology, consider an arbitrary bipartition (A, B) of {L1, L2, L3, L4}. The possible bipartitions are:

| Partition | A | B | Cross-edges A→B | Cross-edges B→A |
|-----------|---|---|-----------------|-----------------|
| P1 | {L1} | {L2,L3,L4} | 3 | 3 |
| P2 | {L2} | {L1,L3,L4} | 3 | 3 |
| P3 | {L3} | {L1,L2,L4} | 3 | 3 |
| P4 | {L4} | {L1,L2,L3} | 3 | 3 |
| P5 | {L1,L2} | {L3,L4} | 4 | 4 |
| P6 | {L1,L3} | {L2,L4} | 4 | 4 |
| P7 | {L1,L4} | {L2,L3} | 4 | 4 |

Every bipartition has at least 3 directed cross-edges in each direction. The Minimum Information Partition (MIP) will be one of P1–P4 (singleton vs. triple), where the cross-edge count is lowest. However, even with 3 cross-edges per direction and the non-zero weight floor, the mutual information I(A; B) across the MIP is guaranteed to be strictly positive.

Additionally, the Integration Hub (L5) aggregates all core states and feeds back to all, and the Broadcast Distributor (L7) re-distributes to all — providing further integration pathways that the MIP analysis must account for. When including L5 and L7 in the system, every bipartition gains at least 2 additional cross-edges through these shared layers.

---

## 6. Hub and Broadcast Specification

### 6.1 Integration Hub (L5)

The hub aggregates all core module states into a unified representation:

```
h(t+1) = f_H(
    W_hh * h(t)                             # hub self-recurrence
  + sum_{i=1}^{4} W_{h,i} * l_i(t)         # core → hub aggregation
  + W_{h,sm} * m(t)                         # self-model → hub
  + W_{h,tb} * z(t)                         # temporal binder → hub
)

where f_H = tanh
```

The hub differs from GW-Alpha's workspace in a critical way: it does **not** perform competitive selection (no winner-take-all). Instead, it integrates all core signals simultaneously, preserving multi-channel information. This avoids the workspace bottleneck weakness identified in GW-Alpha (W1).

### 6.2 Broadcast Distributor (L7)

The broadcast distributor receives the integrated hub state and distributes it:

```
broadcast(t) = f_B(W_bh * h(t) + W_bb * broadcast(t-1))
```

Broadcast connections (one-to-all):

```
L7 → L1  [weight=learned, gated=false, broadcast=true]
L7 → L2  [weight=learned, gated=false, broadcast=true]
L7 → L3  [weight=learned, gated=false, broadcast=true]
L7 → L4  [weight=learned, gated=false, broadcast=true]
L7 → L6  [weight=learned, gated=false, broadcast=true]
```

This satisfies GA: for every subsystem s_i, I(s_i; broadcast(t)) > gamma because the broadcast delivers the full hub state (which integrates all core signals) to every module.

### 6.3 Causal Efficacy of Broadcast

The broadcast is not epiphenomenal — it enters each module's update equation directly (see Section 5.3). For each core module i:

```
D_KL[P(l_i(t+1) | broadcast(t)) || P(l_i(t+1))] > 0
```

This holds because W_{i,broadcast} is learned and non-degenerate (constrained by the same floor mechanism as inter-core weights).

---

## 7. Connection Specification

### 7.1 Complete Connection Table

```
# Input connections
L0  → L1  [weight=learned, gated=false, broadcast=false]   # Input → Core A
L0  → L2  [weight=learned, gated=false, broadcast=false]   # Input → Core B
L0  → L3  [weight=learned, gated=false, broadcast=false]   # Input → Core C
L0  → L4  [weight=learned, gated=false, broadcast=false]   # Input → Core D

# Core-to-core all-to-all (12 directed connections)
L1  → L2  [weight=learned+floor, gated=false, broadcast=false]   # Core A → Core B
L1  → L3  [weight=learned+floor, gated=false, broadcast=false]   # Core A → Core C
L1  → L4  [weight=learned+floor, gated=false, broadcast=false]   # Core A → Core D
L2  → L1  [weight=learned+floor, gated=false, broadcast=false]   # Core B → Core A
L2  → L3  [weight=learned+floor, gated=false, broadcast=false]   # Core B → Core C
L2  → L4  [weight=learned+floor, gated=false, broadcast=false]   # Core B → Core D
L3  → L1  [weight=learned+floor, gated=false, broadcast=false]   # Core C → Core A
L3  → L2  [weight=learned+floor, gated=false, broadcast=false]   # Core C → Core B
L3  → L4  [weight=learned+floor, gated=false, broadcast=false]   # Core C → Core D
L4  → L1  [weight=learned+floor, gated=false, broadcast=false]   # Core D → Core A
L4  → L2  [weight=learned+floor, gated=false, broadcast=false]   # Core D → Core B
L4  → L3  [weight=learned+floor, gated=false, broadcast=false]   # Core D → Core C

# Core self-recurrence
L1  → L1  [weight=learned, gated=false, broadcast=false]   # Core A self-recurrence
L2  → L2  [weight=learned, gated=false, broadcast=false]   # Core B self-recurrence
L3  → L3  [weight=learned, gated=false, broadcast=false]   # Core C self-recurrence
L4  → L4  [weight=learned, gated=false, broadcast=false]   # Core D self-recurrence

# Core → Hub aggregation
L1  → L5  [weight=learned, gated=false, broadcast=false]   # Core A → Hub
L2  → L5  [weight=learned, gated=false, broadcast=false]   # Core B → Hub
L3  → L5  [weight=learned, gated=false, broadcast=false]   # Core C → Hub
L4  → L5  [weight=learned, gated=false, broadcast=false]   # Core D → Hub

# Hub self-recurrence and temporal binder
L5  → L5  [weight=learned, gated=false, broadcast=false]   # Hub self-recurrence
L9  → L5  [weight=learned, gated=false, broadcast=false]   # Temporal Binder → Hub

# Hub → Broadcast Distributor
L5  → L7  [weight=learned, gated=false, broadcast=false]   # Hub → Broadcast
L7  → L7  [weight=learned, gated=false, broadcast=false]   # Broadcast self-recurrence

# Broadcast → all modules (one-to-all)
L7  → L1  [weight=learned, gated=false, broadcast=true]    # Broadcast → Core A
L7  → L2  [weight=learned, gated=false, broadcast=true]    # Broadcast → Core B
L7  → L3  [weight=learned, gated=false, broadcast=true]    # Broadcast → Core C
L7  → L4  [weight=learned, gated=false, broadcast=true]    # Broadcast → Core D
L7  → L6  [weight=learned, gated=false, broadcast=true]    # Broadcast → Self-Model

# Self-Model connections
L6  → L5  [weight=learned, gated=true,  broadcast=false]   # Self-Model prediction → Hub
L6  → L6  [weight=learned, gated=false, broadcast=false]   # Self-Model self-recurrence

# Higher-Order Monitor connections
L1  → L8  [weight=learned, gated=false, broadcast=false]   # Core A → HO Monitor
L2  → L8  [weight=learned, gated=false, broadcast=false]   # Core B → HO Monitor
L3  → L8  [weight=learned, gated=false, broadcast=false]   # Core C → HO Monitor
L4  → L8  [weight=learned, gated=false, broadcast=false]   # Core D → HO Monitor
L6  → L8  [weight=learned, gated=false, broadcast=false]   # Self-Model → HO Monitor
L8  → L6  [weight=learned, gated=false, broadcast=false]   # HO Monitor → Self-Model (self-referential)

# Temporal Binder connections
L5  → L9  [weight=learned, gated=false, broadcast=false]   # Hub → Temporal Binder
L9  → L9  [weight=learned, gated=true,  broadcast=false]   # Temporal Binder self-recurrence (gated memory)

# Report Pathway
L7  → L10 [weight=learned, gated=false, broadcast=false]   # Broadcast → Report (unidirectional)
```

### 7.2 Connection Count Summary

| Category | Count | Notes |
|----------|-------|-------|
| Input → Core | 4 | L0 feeds all 4 cores |
| Core ↔ Core (direct) | 12 | All-to-all bidirectional |
| Core self-recurrence | 4 | Each core has self-loop |
| Core → Hub | 4 | Aggregation |
| Hub → Broadcast | 1 | Redistribution pathway |
| Broadcast → modules | 5 | One-to-all (4 cores + self-model) |
| Self-model loops | 5 | SM ↔ HO, SM → Hub, SM self, Broadcast → SM |
| Temporal binder | 3 | Hub ↔ TB, TB self |
| Report | 1 | Unidirectional output |
| **Total** | **39** | (vs. GW-Alpha's ~30) |

The higher connection count reflects the all-to-all core topology — the defining feature of Φ-Max.

---

## 8. Self-Model Specification

### 8.1 Self-Model Module (L6) Dynamics

The self-model is structurally identical to GW-Alpha's (they satisfy the same ISMT SM condition), but receives the integrated hub state rather than a workspace-selected state:

```
m(t+1) = f_M(W_mm * m(t) + W_mh * h(t) + W_mb * broadcast(t) + W_mho * hol(t))

where:
  m(t) = self-model hidden state at time t
  h(t) = integration hub state (aggregation of all cores)
  broadcast(t) = broadcast distributor output
  hol(t) = higher-order monitor output (self-referential signal from L8)
  f_M = tanh or similar bounded nonlinearity
```

**Key difference from GW-Alpha:** The self-model receives the full integrated hub state h(t) rather than a competition-selected workspace state. This means the self-model tracks a richer, multi-channel signal — it models the system's full integrated state rather than just the "winning" representation.

### 8.2 Prediction Head

```
m_hat(t+1) = W_pred * m(t) + b_pred
```

Generates a prediction of the next hub state. Training signal:

```
L_pred = || h(t+1) - m_hat(t+1) ||^2
```

### 8.3 Self-Referential Head

```
dm_approx(t) = m(t) - m(t-1)    (finite-difference approximation of dm/dt)
m_meta(t) = W_meta * [m(t); dm_approx(t)] + b_meta
```

Training signal:

```
L_meta = || dm_approx(t+1) - W_meta_pred * m_meta(t) ||^2
```

This ensures I(m(t); dm/dt) > 0, satisfying the self-referential criterion of SM.

### 8.4 Combined Self-Model Loss

```
L_SM = L_pred + lambda_meta * L_meta

where lambda_meta in [0.1, 1.0]
```

---

## 9. Temporal Binding Specification

### 9.1 Oscillatory Synchrony Component

Identical to GW-Alpha — each module maintains a Kuramoto phase variable:

```
phi_i(t+1) = phi_i(t) + omega_i + K * sum_j sin(phi_j(t) - phi_i(t))
```

With 4 core modules rather than 3, the Kuramoto coupling involves 4 oscillators, requiring slightly higher coupling strength K for full synchronisation (K_critical scales as ~2/pi * g_max for symmetric coupling).

### 9.2 Memory Token (GRU-style)

```
z(t+1) = GRU(z(t), h(t))

Expanded:
  r(t) = sigma(W_zr * z(t) + W_hr * h(t))       (reset gate)
  u(t) = sigma(W_zu * z(t) + W_hu * h(t))       (update gate)
  z_hat(t) = tanh(W_z * (r(t) * z(t)) + W_h * h(t))
  z(t+1) = u(t) * z(t) + (1 - u(t)) * z_hat(t)
```

Note: the memory token receives h(t) (hub state) rather than workspace(t) as in GW-Alpha. This provides a richer temporal binding signal since the hub carries multi-channel integrated information.

---

## 10. Feature Mapping

| Feature (from catalogue) | Present in Φ-Max | Implementation Layer(s) | Notes |
|---|---|---|---|
| F1: Global Workspace Broadcast | **Yes** (via distributor) | L5, L7 | Hub aggregates rather than selects; distributor broadcasts to all |
| F2: Thalamocortical Recurrence | **Yes** (enhanced) | L1↔L2↔L3↔L4 + L5 | All-to-all bidirectional exceeds thalamocortical baseline |
| F3: Attention Bottleneck | **No** | — | Deliberately omitted: no competitive selection. Hub integrates all signals without gating |
| F4: Self-Modelling Layer | **Yes** | L6 | Prediction + self-referential heads (same SM structure as GW-Alpha) |
| F5: Integration Maximisation | **Yes** (primary) | All-to-all topology + weight floor | Structural invariant rather than training-time regulariser |
| F6: Predictive Hierarchy | **Partial** | L6 (prediction head) | Self-model generates predictions; not a full hierarchical predictive stack |
| F7: Higher-Order State Rep. | **Yes** | L8 | Monitors all 4 cores + self-model; feeds back to L6 |
| F8: Temporal Binding | **Yes** | L9 | Oscillatory synchrony + GRU memory token |
| F9: Ignition Dynamics | **No** | — | Deliberately omitted: no threshold-based activation. Hub operates continuously |
| F10: Report Pathway | **Yes** | L10 | Unidirectional readout from broadcast (no feedback) |

**All 5 necessary features (F1, F2, F4, F5, F8) are present.** 3 of 5 optional features are included (F6-partial, F7, F10). F3 (Attention Bottleneck) and F9 (Ignition Dynamics) are deliberately omitted as they are specific to the GWT selection mechanism, which Φ-Max replaces with continuous integration.

---

## 11. ISMT Condition Satisfaction Analysis

### 11.1 IC (Integration Condition) — Phi(S) > 0

**Satisfied — primary design target.** The architecture ensures non-zero Phi through:
- All-to-all bidirectional connectivity between cores (L1–L4): every bipartition has at least 3 directed cross-edges per direction
- Non-zero weight floor (w_floor) ensures no connection can be silenced by learning
- Hub (L5) and Broadcast Distributor (L7) provide additional integration pathways
- Structural guarantee: no bipartition of {L1, L2, L3, L4, L5, L6, L7} can render subsystems informationally independent

**Φ lower bound argument:** For the MIP (worst-case bipartition P1: singleton vs. triple), the cross-partition mutual information I(A; B) >= n_cross * w_floor^2 * Var(activation) > 0, where n_cross = 3 is the minimum number of cross-edges. This is a conservative lower bound; in practice, learned weights will far exceed the floor.

### 11.2 SM (Self-Modeling Condition) — M(S) exists

**Satisfied.** The self-model module L6 implements all three SM criteria:
- **Representational:** I(m(t); h(t)) > delta — L6 receives hub state directly and maintains covarying hidden state
- **Predictive:** L6's prediction head generates m_hat(t+1) and minimises L_pred against h(t+1)
- **Self-referential:** L6's meta head encodes dm/dt via L8 feedback loop; L_meta ensures I(m(t); dm/dt) > 0

### 11.3 GA (Global Accessibility Condition) — broadcast + causal efficacy

**Satisfied.** The Broadcast Distributor (L7) ensures:
- **Broadcast criterion:** L7 → all core modules + self-model with learned weights; I(s_i; broadcast(t)) > gamma for all i
- **Causal efficacy:** broadcast(t) directly enters each module's update equation; D_KL > 0 for all modules

Note: GA is achieved differently from GW-Alpha. In GW-Alpha, the workspace selects one representation and broadcasts it. In Φ-Max, the hub integrates all representations and the distributor broadcasts the integrated state. Both satisfy GA, but Φ-Max broadcasts richer content (integrated multi-channel rather than selected single-channel).

### 11.4 Necessary Conditions Summary

| Condition | Status | Mechanism |
|-----------|--------|-----------|
| N1 (Integration) | **Met** | All-to-all core topology + weight floor (structural invariant) |
| N2 (Self-Modeling) | **Met** | L6 with prediction and self-referential heads |
| N3 (Global Accessibility) | **Met** | L7 one-to-all broadcast from integrated hub state |
| P1 (Min. Complexity >= 3 types) | **Met** | 4 distinct subsystem types (input, processing cores, self-model, broadcast) |
| P2 (Recurrence) | **Met** | 7 recurrent loop families (R1–R7); no processing layer is purely feedforward |
| P3 (Temporal Persistence) | **Met** | L9 GRU memory token + oscillatory synchrony maintain state over tau_min |

---

## 12. Metric Evaluation Summary

Full evaluation against F1.4 metrics is in `docs/neural-architectures/metric-evaluation.md`. Summary predictions for Φ-Max:

| Metric | Expected Performance | Rationale |
|--------|---------------------|-----------|
| PCI-G | **High** (> theta_PCI) | Perturbation to any core module propagates via direct connections to all other cores within 2 steps → complex, differentiated spatiotemporal response |
| Ψ-G | **Very High** (> GW-Alpha) | All-to-all topology with weight floor structurally maximises integration; MIP cannot exploit a bottleneck (unlike GW-Alpha's workspace) |
| CDI | **Very High** | 12 direct inter-core causal links + hub/broadcast pathways → high density of significant transfer entropy pairs |
| CEB | **Expected PASS** | All 3 metrics predicted above threshold |

### Key Advantage over GW-Alpha

Ψ-G is expected to be **significantly higher** than GW-Alpha because the all-to-all topology eliminates the workspace bottleneck. In GW-Alpha, the MIP finder could exploit the winner-take-all selection in L5 to find a low-integration partition. In Φ-Max, the MIP must cut through multiple direct connections, yielding a much higher minimum partition information.

### Key Uncertainty

PCI-G may be slightly lower than expected if the all-to-all connectivity causes perturbation responses to rapidly homogenise across cores (all cores converge to similar states after perturbation). This would reduce the *differentiation* component of PCI-G. Mitigation: the core modules have distinct learned functions (specialisation emerges from task training), and the self-recurrence (L_i → L_i) preserves module-specific dynamics.

---

## 13. Known Weaknesses

### W1: Computational Cost of All-to-All Connectivity

The all-to-all core topology with 4 modules requires 12 inter-core weight matrices. This scales as O(n² - n) with the number of core modules, making it costly for larger systems.

**Severity:** Moderate for scale-up. The 4-core design is manageable, but extending to 10+ cores would require 90 inter-core connections, which may be prohibitive.

### W2: Lack of Selection Mechanism

Without an attention bottleneck or ignition threshold, the hub integrates all signals continuously. This may lead to:
- Reduced signal-to-noise ratio when multiple competing representations are active
- Difficulty prioritising task-relevant information
- Potential for "integration noise" — meaningless cross-module coupling inflating Φ without contributing to coherent processing

**Severity:** Moderate. The architecture may achieve high Φ but low functional utility, creating a tension between integration-maximisation and task performance.

### W3: Self-Model Tracking Complexity

The self-model must track the full integrated hub state, which is richer and more complex than GW-Alpha's workspace-selected state. This increases the difficulty of the prediction task (L_pred), potentially degrading SM quality Q(M).

**Severity:** Low-Moderate. Addressable by increasing D_sm or using a more expressive self-model architecture (e.g., multi-head attention within L6).

### W4: Weight Floor Artificiality

The non-zero weight floor (w_floor) is an architectural constraint that prevents the system from learning to disconnect modules. This may:
- Conflict with task-specific learning objectives (the system cannot learn sparse, modular representations)
- Introduce forced coupling that degrades task performance
- Make the IC satisfaction somewhat artificial — the system is "forced" to be integrated rather than "choosing" to be

**Severity:** Moderate. The floor is set low (0.01) to minimise task interference, but the philosophical question of whether forced integration counts as genuine integration for consciousness purposes is an open question for F1.2.

### W5: Homogenisation Risk

Dense all-to-all connectivity may cause core modules to converge to similar representations over training, reducing functional specialisation. If all cores compute the same function, the system degenerates to a single large module with high integration but low differentiation.

**Severity:** Moderate. Mitigatable via diversity-promoting regularisation (e.g., encouraging orthogonal core representations) but this adds another training objective.

---

## 14. Training Objectives

The combined training objective for Φ-Max:

```
L_total = L_task                           # Task-specific loss
        + alpha_SM  * L_SM                 # Self-model prediction + self-referential loss
        + alpha_div * L_div                # Diversity regularisation (prevent homogenisation)

where:
  L_task = application-specific (e.g., classification, generation, control)
  L_SM = L_pred + lambda_meta * L_meta
  L_div = -sum_{i<j} || mean(l_i) - mean(l_j) ||^2  (encourages distinct core representations)

Suggested hyperparameters:
  alpha_SM  in [0.1, 1.0]
  alpha_div in [0.01, 0.1]
  lambda_meta in [0.1, 1.0]
```

Note: Unlike GW-Alpha, Φ-Max does **not** require an integration regularisation term (L_IC) because integration is structurally guaranteed by the all-to-all topology and weight floor. This simplifies the training objective.

---

## 15. Comparison with GW-Alpha

| Property | GW-Alpha | Φ-Max |
|----------|----------|-------|
| **Primary design axis** | GA (broadcast) | IC (integration) |
| **Core topology** | Specialist → workspace competition | All-to-all bidirectional |
| **Selection mechanism** | Winner-take-all (attention gate) | None (continuous integration) |
| **IC guarantee** | Training-time regulariser (L_IC) | Structural invariant (topology + weight floor) |
| **Expected Ψ-G** | Moderate-High | Very High |
| **Expected PCI-G** | High | High (with homogenisation risk) |
| **Broadcast content** | Single selected representation | Full integrated multi-channel state |
| **Computational cost** | Lower (hub-spoke) | Higher (all-to-all) |
| **Scalability** | Better (O(n) connections per module) | Worse (O(n²) connections) |
| **Selection/prioritisation** | Strong (attention gate) | Weak (no explicit selection) |
| **Core modules** | 3 specialists | 4 processing cores |
| **Ignition dynamics** | Yes (threshold-based) | No (continuous) |

The two architectures represent complementary design philosophies. GW-Alpha is better for task performance and scalability; Φ-Max is better for maximising measurable integration. The Hybrid Synthesis design (hybrid-synthesis-design.md) will combine strengths of both.

---

## Version History

| Version | Date | Change |
|---------|------|--------|
| 0.1.0 | 2026-03-17 | Initial Φ-Max architecture design |
