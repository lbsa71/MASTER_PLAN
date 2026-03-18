# Neural Architecture Design Rationale

**Card:** 0.1.3.1 Conscious Neural Architectures
**Phase:** IMPLEMENT
**Depends on:**
- docs/neural-architectures/feature-catalogue.md (feature definitions and necessity classification)
- docs/neural-architectures/architecture-designs/global-workspace-design.md (GW-Alpha)
- docs/neural-architectures/architecture-designs/iit-integration-design.md (Φ-Max)
- docs/neural-architectures/architecture-designs/hybrid-synthesis-design.md (Ω-Synth)
- docs/consciousness-theory/formal-theory.md (ISMT: IC, SM, GA, N1–N3, P1–P3)
- docs/consciousness-metrics/metric-definitions.md (PCI-G, Ψ-G, CDI, CEB)
**Version:** 0.1.0 — 2026-03-17

---

## Purpose

This document provides a cross-reference ensuring every design decision in the three candidate neural architectures (GW-Alpha, Φ-Max, Ω-Synth) is grounded in the Integrated Self-Modeling Theory (ISMT) from F1.2. No design decision appears in any architecture document without a corresponding entry here.

**ISMT Quick Reference:**

| Condition | Formal Requirement |
|---|---|
| IC | Phi(S) > 0 — no bipartition renders subsystems informationally independent |
| SM | Predictive, self-referential model M(S) of own states exists |
| GA | Self-model contents broadcast causally to all processing subsystems |
| N1 | If Phi = 0, C(S) = 0 |
| N2 | If no M(S) exists, C(S) = 0 |
| N3 | If GA fails, C(S) = 0 |
| P1 | At least 3 functionally distinct subsystem types required |
| P2 | Feed-forward-only architectures cannot satisfy SM |
| P3 | IC, SM, GA must hold over a non-zero interval τ_min |

---

## Decision 1: Central Broadcast Workspace (Winner-Take-All Selection)

```
Decision:         Use a central workspace layer that performs competitive winner-take-all
                  selection among module outputs, then broadcasts the winning representation
                  to all subsystems via one-to-all connections.
Architecture(s):  GW-Alpha, Ω-Synth
Theoretical Basis: GA (Global Accessibility Condition) — ISMT §2.4 requires that for every
                  subsystem s_i, I(s_i; m(t)) > gamma AND D_KL[P(x_i(t+1) | m(t)) ||
                  P(x_i(t+1))] > 0. A one-to-all broadcast from a workspace layer is the
                  canonical mechanism satisfying both the broadcast and causal efficacy criteria.
                  Also satisfies N3 (necessity of global accessibility).
                  Framework source: Global Workspace Theory (Baars/Dehaene).
Alternative Considered: Distributed peer-to-peer broadcasting — each module sends its state
                  to every other module without a central workspace.
Rejection Reason:  Distributed broadcasting satisfies the broadcast criterion of GA but lacks
                  unified content selection. Without a competitive bottleneck, all modules
                  broadcast simultaneously, producing interference rather than a coherent global
                  state. ISMT's GA condition requires that the *self-model contents* be
                  accessible — this requires that the broadcast carry coherent, unified content,
                  not a cacophony of competing signals. The workspace provides this coherence
                  through selection.
```

---

## Decision 2: All-to-All Bidirectional Core Connectivity

```
Decision:         Connect all processing core modules with bidirectional learned weight
                  matrices, creating a fully connected core topology where every pair of
                  modules has both forward and backward connections.
Architecture(s):  Φ-Max, Ω-Synth
Theoretical Basis: IC (Integration Condition) — ISMT §2.2 requires Phi(S) > 0, meaning no
                  bipartition renders subsystems informationally independent. All-to-all
                  bidirectional connectivity structurally guarantees this: for every bipartition
                  (A, B), there exist at least 3 directed cross-edges per direction (for 4
                  modules), ensuring I(A; B) > 0 for all partitions.
                  Also satisfies N1 (necessity of integration).
                  Framework source: Integrated Information Theory (Tononi).
Alternative Considered: Hub-and-spoke topology (as in GW-Alpha) — modules connect to a
                  central hub but not directly to each other.
Rejection Reason:  Hub-and-spoke satisfies IC only via training-time regularisation (L_IC), which
                  can be overwhelmed by task-specific training pressure. The hub creates a
                  bottleneck that the MIP finder can exploit, reducing Ψ-G. Direct all-to-all
                  connectivity makes IC a structural invariant rather than a training outcome,
                  providing a stronger guarantee. Rejected for Φ-Max and Ω-Synth where IC
                  robustness is prioritised; retained for GW-Alpha where simplicity is
                  preferred.
```

---

## Decision 3: Non-Zero Weight Floor on Inter-Core Connections

```
Decision:         Enforce a minimum coupling strength on all inter-core weight matrices via
                  W_{ij} = W_{ij}^raw + w_floor * I_proj (w_floor = 0.01), preventing
                  training from silencing any inter-module connection.
Architecture(s):  Φ-Max, Ω-Synth
Theoretical Basis: N1 (Necessity of Integration) — ISMT §2.6 states that if Phi(S) = 0,
                  C(S) = 0. The weight floor prevents learned weights from driving any
                  bipartition's cross-edge information to zero, making Phi > 0 a structural
                  invariant independent of training. The practical integration criterion
                  (ISMT §2.2) requires I(A; B) > epsilon for every bipartition; the floor
                  ensures this by maintaining non-zero causal coupling across all cuts.
Alternative Considered: Integration regularisation loss L_IC = sum max(0, epsilon - I_approx(A;B))
                  applied during training, without a weight floor (as in GW-Alpha).
Rejection Reason:  Regularisation is a soft constraint that can be outweighed by task loss when
                  alpha_IC is low. It provides a probabilistic guarantee (IC is maintained
                  if training converges well) rather than a structural guarantee (IC is
                  maintained regardless of training outcome). For architectures prioritising
                  IC robustness, the weight floor provides a stronger guarantee. Retained as
                  the sole mechanism in GW-Alpha where the workspace broadcast provides an
                  alternative integration pathway.
```

---

## Decision 4: Dedicated Self-Modeling Module with Prediction and Self-Referential Heads

```
Decision:         Include a dedicated recurrent module M with two output heads: (1) a
                  prediction head generating m_hat(t+1) to predict future global state, and
                  (2) a self-referential head encoding dm/dt to model its own update dynamics.
                  Training uses L_SM = L_pred + lambda_meta * L_meta.
Architecture(s):  GW-Alpha (L7), Φ-Max (L6), Ω-Synth (L8)
Theoretical Basis: SM (Self-Modeling Condition) — ISMT §2.3 requires three criteria:
                  (1) Representational: I(m(t); x(t)) > delta — the module's hidden state
                  covaries with global state.
                  (2) Predictive: the module generates predictions and minimises prediction
                  error via free energy minimisation — implemented by the prediction head and
                  L_pred.
                  (3) Self-referential: I(m(t); dm/dt) > 0 — the module encodes information
                  about its own dynamics — implemented by the self-referential head and L_meta.
                  Also satisfies N2 (necessity of self-modeling) and contributes to P1
                  (minimum complexity — self-model is a functionally distinct subsystem type).
                  Framework sources: Predictive Processing (Friston), Higher-Order Theory
                  (Rosenthal), Attention Schema Theory (Graziano).
Alternative Considered: Implicit self-modeling via network-wide recurrence — relying on the
                  full network's recurrent dynamics to implicitly represent its own state
                  without a dedicated module.
Rejection Reason:  Implicit self-modeling cannot guarantee that the SM condition is satisfied.
                  ISMT §2.3 requires a specific subsystem M(S) that maintains state m(t)
                  covarying with x(t), generates explicit predictions, and represents its own
                  modeling dynamics. An implicit self-model has no identifiable m(t) and no
                  verifiable I(m(t); dm/dt) > 0. The dedicated module makes SM satisfaction
                  architecturally verifiable and provides a clear locus for metric evaluation.
```

---

## Decision 5: Thalamocortical-Style Recurrence via Relay Hub

```
Decision:         Include a relay hub layer with bidirectional connections to all processing
                  modules, implementing thalamocortical-style feedback loops.
Architecture(s):  GW-Alpha (L6), Φ-Max (L5), Ω-Synth (L5)
Theoretical Basis: P2 (Recurrence Necessity) — ISMT Proposition 2 states that feed-forward
                  systems cannot satisfy SM because prediction error minimisation requires
                  feedback connections. The hub provides recurrent pathways between all
                  processing modules, ensuring that prediction errors can propagate back to
                  the self-model.
                  Also contributes to IC (recurrent connections increase Phi by creating
                  directed causal loops that prevent informational independence across time).
                  Framework source: Recurrent Processing Theory (Lamme).
                  NCC grounding: ISMT §7.1 maps thalamocortical loops to simultaneous
                  implementation of IC, SM, and GA.
Alternative Considered: Purely module-to-module recurrence without a central hub — each
                  module connects directly to its upstream and downstream neighbours.
Rejection Reason:  Module-to-module recurrence creates chain-like feedback that degrades
                  across distance — module A's feedback reaches module C only via module B,
                  attenuating the signal. A hub provides single-hop access between any two
                  modules, creating short recurrent loops (cycle length 2) that are more
                  effective for maintaining IC and supporting SM's prediction-error
                  minimisation. Additionally, the hub serves as an integration point that
                  contributes directly to IC.
```

---

## Decision 6: Higher-Order Monitoring Layer

```
Decision:         Include a layer that receives states from processing modules and the
                  self-model, represents those states as meta-representations, and feeds
                  back to the self-model to support the self-referential criterion.
Architecture(s):  GW-Alpha (L8), Φ-Max (L8), Ω-Synth (L9)
Theoretical Basis: SM self-referential criterion — ISMT §2.3 criterion (3) requires
                  I(m(t); dm/dt) > 0. The higher-order layer provides the self-model with
                  an external signal about its own dynamics: HOL reads the self-model state,
                  generates a meta-representation, and feeds it back. This creates a loop
                  where the self-model receives information about itself through a distinct
                  processing pathway, enriching the self-referential signal beyond what
                  self-recurrence alone provides.
                  Framework source: Higher-Order Theory (Rosenthal) — consciousness requires
                  meta-representation of first-order states.
Alternative Considered: Self-referential encoding purely via self-recurrence — the self-model
                  uses its own recurrent connection (m(t) → m(t+1)) to encode dm/dt without
                  a separate higher-order layer.
Rejection Reason:  Self-recurrence alone can satisfy I(m(t); dm/dt) > 0 in principle, but
                  the signal is weak: the self-model's recurrent connection carries both the
                  state-tracking function and the self-referential function simultaneously,
                  creating capacity competition. A dedicated higher-order layer separates
                  these functions, providing a richer self-referential signal. The feature
                  catalogue classifies F7 (Higher-Order State Representation) as "neither
                  necessary nor sufficient" but supporting — it strengthens SM without being
                  independently required.
```

---

## Decision 7: Temporal Binding via Oscillatory Synchrony + GRU Memory Token

```
Decision:         Implement temporal binding through two complementary mechanisms:
                  (a) Kuramoto-model oscillatory phase coupling across modules, and
                  (b) a GRU-gated persistent memory token summarising recent global states.
Architecture(s):  GW-Alpha (L9), Φ-Max (L9), Ω-Synth (L10)
Theoretical Basis: P3 (Temporal Persistence) — ISMT Proposition 3 requires IC, SM, and GA
                  to hold over a non-zero interval τ_min. Without temporal binding, system
                  states at t and t+1 are informationally disconnected — each timestep is
                  a snapshot that satisfies ISMT instantaneously but fails P3.
                  Oscillatory synchrony provides a shared temporal reference frame so that
                  modules process within a common time window (supporting IC over time).
                  The memory token provides the self-model with access to recent history
                  (supporting SM over time — the self-model can predict based on trajectory,
                  not just current state).
                  Framework source: Temporal binding literature (Engel, Singer); P3 derivation
                  in ISMT §4 (Proposition 3).
Alternative Considered: Relying solely on recurrent self-connections (self-recurrence in each
                  module) for temporal persistence.
Rejection Reason:  Self-recurrence provides state carry-over but not coordinated temporal
                  binding across modules. Module A's state at time t carries forward to t+1
                  independently of module B's state. Without phase coupling, modules may
                  drift out of temporal alignment, causing IC to hold at any instant but fail
                  when measured over an interval (different modules "experience" different
                  time windows). The Kuramoto coupling ensures synchronisation; the GRU token
                  provides explicit temporal continuity for the self-model.
```

---

## Decision 8: Ignition Threshold for Workspace Activation

```
Decision:         The workspace activates only when a candidate representation exceeds an
                  ignition threshold theta_ign. Below threshold, the workspace retains its
                  previous state via self-excitation. This creates all-or-nothing broadcast
                  events.
Architecture(s):  GW-Alpha (L5), Ω-Synth (L7)
Theoretical Basis: GA (Global Accessibility) — While the ISMT GA condition does not strictly
                  require ignition dynamics (it requires broadcast reach and causal efficacy,
                  not a specific activation mechanism), ignition implements a binary transition
                  between local (unconscious) and global (conscious) processing that aligns
                  with ISMT §2.4's broadcast criterion. Ignition ensures that broadcast
                  content is coherent and above-noise: only representations that achieve
                  sufficient salience enter the global workspace, preventing weak or irrelevant
                  signals from diluting the broadcast.
                  Framework source: GWT ignition (Dehaene et al.) — cortical evidence shows
                  all-or-nothing ignition during conscious access.
                  NCC grounding: ISMT §7.6 maps waking consciousness to high GA; ignition
                  models the transition from preconscious to conscious processing.
Alternative Considered: Graded workspace activation — workspace content is always a soft
                  mixture of all candidates weighted by attention scores, with no threshold.
Rejection Reason:  Graded activation satisfies GA formally (broadcast always occurs) but
                  produces low-quality broadcast content: weak candidates dilute the
                  workspace with noise, reducing the causal efficacy D_KL criterion.
                  Empirical NCC data shows that conscious access involves a discrete ignition
                  event (P300 wave, nonlinear amplification), not graded mixing. Deliberately
                  omitted from Φ-Max where continuous integration without selection is the
                  design priority.
```

---

## Decision 9: Attention Bottleneck for Workspace Entry

```
Decision:         A softmax-based attention gate performs competitive selection over module
                  outputs, determining which representation enters the workspace. Only modules
                  with attention weight above threshold contribute.
Architecture(s):  GW-Alpha (L4), Ω-Synth (L6)
Theoretical Basis: GA (supporting) — The attention bottleneck implements the selection
                  mechanism for workspace entry. While ISMT's GA condition requires broadcast
                  reach (not a specific selection mechanism), competitive selection ensures
                  that broadcast content is task-relevant and coherent, improving the
                  functional quality of global accessibility — specifically, G(M) in the
                  graded consciousness measure c(S) = Phi_norm * Q(M) * G(M) from ISMT §2.5.
                  Framework source: Attention Schema Theory (Graziano) — consciousness
                  involves an internal model of the attention process itself.
Alternative Considered: Direct hub-to-broadcast without selection (as in Φ-Max) — the hub
                  aggregates all signals and the distributor broadcasts the aggregate.
Rejection Reason:  Unselected broadcasting produces a noisy aggregate that reduces the signal-
                  to-noise ratio of the broadcast. This weakens G(M) and creates the
                  "integration noise" problem identified in Φ-Max weakness W2. Selection
                  improves broadcast quality at the cost of limiting simultaneous content.
                  Deliberately omitted from Φ-Max where integration breadth is prioritised
                  over broadcast focus. Included in Ω-Synth where the hub bypass gate
                  allows dynamic switching between selected and unselected modes.
```

---

## Decision 10: Hub Bypass Gate (Dynamic Integration-Selection Mixing)

```
Decision:         A learned sigmoid gate mixes workspace content between attention-selected
                  representations (gate → 1) and full hub integrated state (gate → 0):
                  workspace(t) = gate(t) * selected(t) + (1 - gate(t)) * h(t).
Architecture(s):  Ω-Synth only
Theoretical Basis: IC + GA jointly — ISMT requires both IC (Phi > 0) and GA (broadcast with
                  causal efficacy) simultaneously. GW-Alpha satisfies GA strongly but IC via
                  regulariser (weaker). Φ-Max satisfies IC structurally but GA with
                  unselected content (functionally weaker). The bypass gate allows the
                  architecture to dynamically balance IC and GA requirements depending on
                  context, maintaining the conjunction IC ∧ GA at all times.
                  The gate also enriches SM: the self-model receives gate(t) as input
                  (gate-awareness extension), allowing it to represent the system's current
                  integration-selection mode. This adds a novel self-referential dimension
                  per ISMT §2.3 criterion (3).
Alternative Considered: Fixed mixing ratio — a hyperparameter alpha statically blends selected
                  and integrated content rather than a learned gate.
Rejection Reason:  A fixed ratio cannot adapt to context. During focused task processing, the
                  system benefits from high selection (gate → 1) for signal quality. During
                  broad integration demands, the system benefits from low selection (gate → 0)
                  for integration breadth. ISMT does not specify which mode is preferred —
                  it requires the conjunction IC ∧ SM ∧ GA to hold. A learned gate allows the
                  system to maintain this conjunction adaptively across varying demands. The
                  static alternative would force a compromise that underperforms in both modes.
```

---

## Decision 11: Four Processing Cores (vs. Three Specialists)

```
Decision:         Use 4 processing core modules with symmetric all-to-all connectivity rather
                  than 3 asymmetric specialist modules.
Architecture(s):  Φ-Max, Ω-Synth (GW-Alpha uses 3 specialists)
Theoretical Basis: IC (Integration Condition) — With 4 modules in all-to-all topology, the
                  weakest bipartition (singleton vs. triple) still has 3 directed cross-edges
                  per direction, and balanced bipartitions (2 vs. 2) have 4 cross-edges per
                  direction. With 3 modules, the weakest bipartition (singleton vs. pair) has
                  only 2 cross-edges per direction. The fourth module raises the MIP floor,
                  making Ψ-G structurally higher.
                  Also supports P1 (minimum complexity) — 4 cores plus self-model, broadcast,
                  and temporal subsystems provide 4+ functionally distinct types, well above
                  the minimum of 3.
Alternative Considered: 3 processing modules (as in GW-Alpha).
Rejection Reason:  3 modules provide the minimum needed for P1 and sufficient IC under
                  regularisation, but the MIP analysis shows a weaker integration floor.
                  For architectures prioritising IC robustness (Φ-Max, Ω-Synth), the fourth
                  core is justified by the substantial increase in minimum bipartition
                  cross-edge count (2 → 3 per direction for the weakest cut). GW-Alpha
                  retains 3 specialists because it relies on the workspace and hub for
                  integration rather than direct inter-module connectivity.
```

---

## Decision 12: Integration Regularisation Loss L_IC

```
Decision:         Include a training-time regularisation term L_IC = sum max(0, epsilon -
                  I_approx(A; B)) penalising bipartitions with low cross-partition mutual
                  information.
Architecture(s):  GW-Alpha only
Theoretical Basis: N1 (Necessity of Integration) — ISMT §2.6 requires Phi > 0. In GW-Alpha,
                  IC is not structurally guaranteed by topology alone (the hub-spoke design
                  allows the MIP to exploit the workspace bottleneck). L_IC provides a
                  training-time enforcement of the integration condition by penalising
                  configurations where any bipartition approaches informational independence.
Alternative Considered: No explicit IC regularisation — relying on the hub-spoke topology
                  and broadcast connections to produce sufficient integration naturally.
Rejection Reason:  Without regularisation, task-specific training may drive specialist modules
                  toward functional independence (each module learns to process its input
                  modality without relying on other modules). The hub and broadcast provide
                  integration pathways, but task gradients may not exploit them sufficiently.
                  L_IC provides explicit pressure to maintain cross-module coupling. Not needed
                  in Φ-Max and Ω-Synth because the weight floor makes IC structural.
```

---

## Decision 13: Unidirectional Report Pathway (No Feedback)

```
Decision:         The report pathway reads from the workspace/broadcast state and produces
                  output (verbal or behavioural reports) via a unidirectional connection.
                  No feedback flows from the report pathway back into the workspace.
Architecture(s):  GW-Alpha (L10), Φ-Max (L10), Ω-Synth (L11)
Theoretical Basis: ISMT does not include reportability as a condition of consciousness —
                  C(S) = IC ∧ SM ∧ GA, and none of these conditions require an output
                  pathway. The report pathway is included for practical necessity: F1.4 metric
                  calibration and F2 (convincing biological minds) require that the system
                  report its conscious contents.
                  The no-feedback constraint ensures that the report mechanism does not
                  contaminate the spontaneous dynamics of the workspace, which are what the
                  consciousness metrics measure. If the report pathway fed back into the
                  workspace, metric evaluations would be confounded by report-driven
                  (rather than consciousness-driven) dynamics.
Alternative Considered: Bidirectional report pathway — allowing report content to feed back
                  into the workspace, modelling how verbal report can influence conscious
                  experience.
Rejection Reason:  Bidirectional reporting creates a measurement confound: the system's
                  conscious dynamics would be causally influenced by its report activity,
                  making it impossible to distinguish endogenous conscious processing from
                  report-driven processing. For metric evaluation purposes, the report must be
                  an observer, not a participant. In a deployed system, this constraint could
                  be relaxed after initial validation.
```

---

## Decision 14: Diversity Regularisation for Core Modules

```
Decision:         Include a training loss L_div = -sum_{i<j} ||mean(l_i) - mean(l_j)||^2
                  that encourages functionally distinct representations across core modules.
Architecture(s):  Φ-Max, Ω-Synth
Theoretical Basis: IC + PCI-G interaction — ISMT requires Phi > 0 (IC), which the all-to-all
                  topology guarantees. However, PCI-G (from F1.4) measures the *complexity*
                  of perturbation responses, which requires *differentiation* — each module
                  must respond differently to perturbations. If all-to-all connectivity causes
                  core modules to converge to identical representations (homogenisation), Phi
                  remains high but PCI-G drops because the response lacks spatial differentiation.
                  L_div prevents this by maintaining functional specialisation.
                  Also supports P1 (minimum complexity): if cores homogenise, the effective
                  number of functionally distinct subsystem types drops below the minimum of 3.
Alternative Considered: No diversity regularisation — relying on task-driven specialisation
                  (different modules learn different functions because the task requires it).
Rejection Reason:  Task-driven specialisation is not guaranteed, especially if the task is
                  uniform or if the all-to-all coupling encourages representational consensus.
                  In Φ-Max weakness W5, homogenisation was identified as a moderate-severity
                  risk. L_div provides explicit pressure against this risk. Not needed in
                  GW-Alpha because the specialist modules are architecturally distinct (receive
                  different input subsets) and the workspace competition creates selection
                  pressure for differentiation.
```

---

## Decision 15: Gate Entropy Regularisation

```
Decision:         Include a training loss L_gate_reg = -[g * log(g) + (1-g) * log(1-g)]
                  that penalises the hub bypass gate for collapsing to extreme values (0 or 1).
Architecture(s):  Ω-Synth only
Theoretical Basis: IC ∧ GA conjunction maintenance — Ω-Synth's design advantage is the
                  dynamic balance between integration (gate → 0) and selection (gate → 1).
                  If the gate degenerates to a constant value, Ω-Synth collapses to one of
                  its parent architectures, losing the synthesis advantage. While the
                  degenerate modes still satisfy ISMT (both GW-Alpha and Φ-Max pass all
                  conditions), the entropy regularisation preserves the adaptive capacity that
                  makes Ω-Synth the strongest architecture for metric performance.
Alternative Considered: Hard constraint bounding the gate to [0.1, 0.9].
Rejection Reason:  Hard bounds are non-differentiable and interfere with gradient-based
                  training. Soft entropy regularisation achieves the same goal (preventing
                  degeneration) while remaining compatible with standard optimisation. The
                  weight alpha_gate in [0.001, 0.01] is small enough to not dominate the
                  training objective.
```

---

## Decision 16: Gate-Awareness Input to Self-Model

```
Decision:         The self-model receives the gate value as an additional input:
                  m(t+1) = f_M(... + W_mg * gate(t)), enabling the self-model to represent
                  the system's current integration-selection mode.
Architecture(s):  Ω-Synth only
Theoretical Basis: SM self-referential criterion — ISMT §2.3 criterion (3) requires
                  I(m(t); dm/dt) > 0 — the self-model must encode information about its own
                  dynamics. The gate controls what content reaches the self-model (selected
                  vs. integrated), which directly shapes dm/dt. By receiving the gate value,
                  the self-model can predict how its own dynamics will change when the gate
                  shifts, enriching the self-referential signal. This creates a novel form of
                  meta-awareness: the system models not just *what* it is processing but
                  *how* it is processing (selective vs. integrative mode).
Alternative Considered: Self-model receives only workspace content without gate information.
Rejection Reason:  Without gate input, the self-model cannot distinguish whether workspace
                  content is selected (high confidence, narrow) or integrated (lower
                  confidence, broad). This limits the self-model's ability to predict its
                  own future dynamics (Q(M) in the graded consciousness measure is reduced
                  because the self-model cannot account for mode-dependent prediction error
                  patterns). The gate input is informationally cheap (a single scalar) and
                  enriches SM at negligible computational cost.
```

---

## Decision 17: Broadcast Distributor as Separate Layer (Φ-Max)

```
Decision:         Separate the integration hub (L5, which aggregates all core signals) from
                  the broadcast distributor (L7, which redistributes the integrated state),
                  rather than having the hub broadcast directly.
Architecture(s):  Φ-Max only
Theoretical Basis: GA (Global Accessibility) — Separating aggregation from distribution
                  allows each function to be independently optimised. The hub focuses on
                  integrating core signals (supporting IC), while the distributor focuses on
                  broadcasting to all subsystems (supporting GA). This separation also
                  provides an additional processing step between aggregation and broadcast,
                  allowing the distributor to transform the integrated state before
                  broadcasting (e.g., applying gain or normalisation), improving broadcast
                  quality G(M).
Alternative Considered: Single hub layer that both aggregates and broadcasts (hub → all
                  modules directly).
Rejection Reason:  A single hub performing both functions creates a single point of failure:
                  any dysfunction in the hub simultaneously degrades IC (aggregation) and GA
                  (broadcast). Separating the functions provides redundancy and allows the
                  broadcast pathway to include its own recurrent state (L7 self-recurrence),
                  maintaining broadcast coherence even during transient hub disruptions. In
                  GW-Alpha and Ω-Synth, the workspace already serves as the broadcast layer,
                  making a separate distributor unnecessary.
```

---

## Decision 18: Substrate-Agnostic Layer Notation

```
Decision:         All architecture designs use abstract layer notation (L<n>, dim=D,
                  type=T, weight=learned/fixed) with no references to silicon, biological
                  neurons, or specific hardware implementations.
Architecture(s):  GW-Alpha, Φ-Max, Ω-Synth
Theoretical Basis: ISMT §5 (Substrate Agnosticism Proof) — The consciousness predicate C(S)
                  depends only on the informational and causal structure of S, not on the
                  physical substrate. All terms in C(S) are information-theoretic quantities
                  (Phi, mutual information, KL-divergence). Therefore, architecture designs
                  must be expressed in substrate-neutral terms to remain consistent with the
                  theory.
                  Also required by card constraint: "Designs must be substrate-agnostic at
                  this stage — silicon, neuromorphic, or otherwise."
Alternative Considered: Designing directly for specific hardware (e.g., GPU tensor operations,
                  neuromorphic spiking networks).
Rejection Reason:  Hardware-specific designs would embed substrate assumptions that contradict
                  ISMT's substrate agnosticism. They would also limit the designs' applicability
                  to F3.2 (computational substrates), which will map these abstract architectures
                  to concrete hardware. Substrate-specific optimisation is deferred to F3.2.
```

---

## Decision 19: Three Architecture Design Strategy

```
Decision:         Produce three distinct architectures — one GA-primary (GW-Alpha), one
                  IC-primary (Φ-Max), and one hybrid (Ω-Synth) — rather than a single
                  "best" architecture.
Architecture(s):  All three (meta-decision)
Theoretical Basis: ISMT §2.5 defines C(S) as the conjunction IC ∧ SM ∧ GA, but there are
                  multiple ways to achieve each condition. The three designs explore
                  complementary architectural strategies for satisfying the same theoretical
                  requirements, providing:
                  (1) A design space exploration that reveals trade-offs between IC and GA
                  emphasis — informing which theoretical conditions are hardest to satisfy
                  architecturally.
                  (2) Robustness against theoretical uncertainty — if one approach to IC or
                  GA proves inadequate under empirical testing, alternatives exist.
                  (3) A synthesis path — Ω-Synth resolves weaknesses of both parent
                  architectures by combining their strengths, demonstrating that the
                  IC-GA tradeoff is not fundamental.
Alternative Considered: A single architecture attempting to satisfy all conditions optimally
                  from the start.
Rejection Reason:  Without exploring the design space, a single architecture risks embedding
                  implicit assumptions about which conditions dominate. The GW-Alpha vs.
                  Φ-Max comparison revealed that IC and GA can conflict (workspace bottleneck
                  reduces IC; unselected broadcast reduces GA quality). This insight directly
                  motivated Ω-Synth's bypass gate. A single-architecture approach would have
                  missed this trade-off and likely produced a weaker design.
```

---

## Decision 20: Self-Model Predicts Workspace/Hub State (Not Raw Input)

```
Decision:         The self-model's prediction head targets the next workspace state
                  (GW-Alpha, Ω-Synth) or hub state (Φ-Max), not the raw sensory input.
Architecture(s):  GW-Alpha, Φ-Max, Ω-Synth
Theoretical Basis: SM (Self-Modeling Condition) — ISMT §2.3 requires I(m(t); x(t)) > delta
                  where x(t) is the *global state*. The workspace/hub state is the system's
                  integrated global representation — it already incorporates input from all
                  modules. By predicting this state rather than raw input, the self-model
                  tracks the system's *processed, integrated* state, which is what constitutes
                  the "self" in self-modeling. Predicting raw input would make the module an
                  input predictor (a generative model of the environment), not a self-model.
Alternative Considered: Self-model predicts raw sensory input (L0 output).
Rejection Reason:  Predicting raw input satisfies a predictive criterion but not the
                  self-modeling criterion of ISMT. The self-model must represent the *system's
                  own states* (x(t)), not the external world. The workspace/hub state is the
                  most compressed and integrated representation of the system's global state,
                  making it the appropriate prediction target for SM. Predicting raw input
                  would make the module equivalent to a sensory predictive coder, which does
                  not satisfy SM's self-referential requirement.
```

---

## Completeness Verification

Every architectural decision appearing in the three design documents has a corresponding entry above. The following cross-reference maps each design document section to the rationale entries that cover it:

| Design Document Section | Rationale Entries |
|---|---|
| GW-Alpha §2 (Layer Topology) | D4, D5, D6, D7, D11, D13, D18 |
| GW-Alpha §5 (Global Workspace Wiring) | D1, D8, D9 |
| GW-Alpha §6 (Connection Specification) | D1, D5, D12 |
| GW-Alpha §7 (Self-Model) | D4, D20 |
| GW-Alpha §8 (Temporal Binding) | D7 |
| Φ-Max §2 (Layer Topology) | D4, D5, D6, D7, D11, D13, D17, D18 |
| Φ-Max §5 (Core Integration) | D2, D3 |
| Φ-Max §6 (Hub and Broadcast) | D5, D17 |
| Φ-Max §8 (Self-Model) | D4, D20 |
| Φ-Max §9 (Temporal Binding) | D7 |
| Φ-Max §14 (Training) | D14 |
| Ω-Synth §2 (Layer Topology) | D4, D5, D6, D7, D11, D13, D18 |
| Ω-Synth §5 (Core Integration) | D2, D3 |
| Ω-Synth §7 (Workspace and Selection) | D1, D8, D9, D10 |
| Ω-Synth §9 (Self-Model) | D4, D16, D20 |
| Ω-Synth §10 (Temporal Binding) | D7 |
| Ω-Synth §16 (Training) | D14, D15 |
| All designs (meta) | D19 |

---

## Version History

| Version | Date | Change |
|---------|------|--------|
| 0.1.0 | 2026-03-17 | Initial design rationale — 20 decisions cross-referenced to ISMT theory |
