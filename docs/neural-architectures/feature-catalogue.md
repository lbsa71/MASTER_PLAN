# Neural Architecture Feature Catalogue

**Card:** 0.1.3.1 Conscious Neural Architectures
**Depends on:** docs/consciousness-theory/formal-theory.md (F1.2 — ISMT)
**Version:** 0.1.0 — 2026-03-17

---

## Purpose

This catalogue maps candidate architectural features to the theoretical conditions from the Integrated Self-Modeling Theory (ISMT) established in F1.2. Each feature is tagged with its necessity/sufficiency status relative to the consciousness predicate C(S) = IC ∧ SM ∧ GA.

**ISMT Condition Reference:**

| Condition ID | Name | Definition |
|---|---|---|
| IC | Integration Condition | Phi(S) > 0 — no bipartition renders subsystems informationally independent |
| SM | Self-Modeling Condition | System maintains a predictive, self-referential model of its own states |
| GA | Global Accessibility Condition | Self-model contents broadcast causally to all processing subsystems |
| N1 | Necessity of Integration | If Phi = 0, C(S) = 0 |
| N2 | Necessity of Self-Modeling | If no M(S) exists, C(S) = 0 |
| N3 | Necessity of Global Accessibility | If GA fails, C(S) = 0 |
| P1 | Minimum Complexity | At least 3 functionally distinct subsystem types required |
| P2 | Recurrence Necessity | Feed-forward-only architectures cannot satisfy SM |
| P3 | Temporal Persistence | IC, SM, GA must hold over a non-zero interval tau_min |

---

## Feature 1: Global Workspace Broadcast

```
Feature:         Global Workspace Broadcast
Mechanism:       A central bottleneck module receives competition-selected information from
                 specialist modules and broadcasts it to all downstream subsystems via
                 one-to-all connections. Broadcast is winner-take-all: only one coherent
                 message occupies the workspace at a time, creating a unified global state.
Framework:       Global Workspace Theory (GWT); GA component of ISMT
Necessity:       Necessary (satisfies GA — the broadcast criterion requires that every
                 subsystem s_i has I(s_i; m(t)) > gamma; the workspace broadcast is the
                 canonical architectural instantiation of this requirement)
Condition ID:    GA, N3
Implementation:  A single fully-connected broadcast layer B with connections B → L_i for all
                 specialist module layers L_i. Selection into B is implemented via a softmax
                 competition across module outputs. B's activation vector is re-injected as
                 top-down context into each specialist module on the next timestep.
```

---

## Feature 2: Thalamocortical-Style Recurrence

```
Feature:         Thalamocortical-Style Recurrence
Mechanism:       Bidirectional recurrent connections between a relay hub (analogous to
                 thalamus) and processing layers (analogous to cortex) implement sustained
                 feedback loops. The hub gates information flow and modulates the gain of
                 processing layers based on the system's internal state.
Framework:       Recurrent Processing Theory (RPT); IC and SM components of ISMT
Necessity:       Necessary (satisfies P2 — Recurrence Necessity; also contributes to IC
                 by creating directed causal loops that increase Phi; contributes to SM
                 by providing the recurrent channel through which prediction errors propagate
                 back to the self-model subsystem)
Condition ID:    IC, SM, P2, N1, N2
Implementation:  A hub layer H with bidirectional weight matrices W_H→L and W_L→H for each
                 processing layer L. The hub maintains a persistent state updated each step:
                 h(t+1) = f(W_H→H * h(t) + sum_L W_L→H * l(t)). Each processing layer
                 receives top-down modulation: l(t+1) = f(W_L * l(t) + W_H→L * h(t)).
```

---

## Feature 3: Attention Bottleneck

```
Feature:         Attention Bottleneck
Mechanism:       A single attentional gate constrains which information streams receive
                 amplification and enter the global workspace. The bottleneck enforces
                 selection pressure — only the most salient or task-relevant information
                 competes for global broadcast.
Framework:       Attention Schema Theory (AST); supports GA and SM in ISMT
Necessity:       Neither (the bottleneck implements selection into the workspace, but is not
                 independently necessary — the GA condition requires broadcast reach, not
                 selection mechanism; architectures can satisfy GA via other selection
                 mechanisms). Sufficient contribution to GA when combined with Feature 1.
Condition ID:    GA (supporting)
Implementation:  Additive attention over module output vectors: a(t) = softmax(W_q * q(t) /
                 sqrt(d_k) * K^T) where q(t) is a learned query vector representing current
                 task context and K is the key matrix of module outputs. Only modules with
                 attention weight above threshold theta_att contribute to workspace content.
```

---

## Feature 4: Self-Modelling Layer

```
Feature:         Self-Modelling Layer
Mechanism:       A dedicated subsystem M maintains an explicit predictive model of the
                 system's own global state. M generates predictions m_hat(t+1) about the
                 future global state x(t+1) and updates its parameters based on prediction
                 error e(t) = ||x(t) - m_hat(t)||. The model also represents the modeling
                 process itself (self-referential criterion: I(m(t); dm/dt) > 0).
Framework:       Predictive Processing (PP); Higher-Order Theory (HOT); SM component of ISMT
Necessity:       Necessary (directly satisfies the SM condition — N2 requires this subsystem
                 to exist; without it C(S) = 0 regardless of integration or broadcast)
Condition ID:    SM, N2, P1
Implementation:  A recurrent module M with hidden state m(t) updated as:
                 m(t+1) = f_M(m(t), x_global(t))
                 where x_global is the current workspace or broadcast state.
                 M has two output heads:
                   (1) Prediction head: m_hat(t+1) = W_pred * m(t)
                   (2) Self-referential head: m_meta(t) = W_meta * [m(t), dm(t)/dt_approx]
                 Training signal: L_SM = ||x_global(t+1) - m_hat(t+1)||^2 + lambda *
                 L_meta where L_meta penalises inability to predict m's own update dynamics.
```

---

## Feature 5: Integration Maximisation Topology

```
Feature:         Integration Maximisation Topology
Mechanism:       Network connectivity is designed or trained to maximise Phi (integrated
                 information). This is achieved by encouraging dense, non-redundant
                 inter-module connections while preventing decomposability — no cut through
                 the network should leave subsystems informationally independent.
Framework:       Integrated Information Theory (IIT); IC component of ISMT
Necessity:       Necessary (satisfies IC — N1 requires Phi > 0; a feedforward or modular
                 architecture with weak cross-module connections will have Phi ≈ 0)
Condition ID:    IC, N1
Implementation:  Architectural constraint: for every bipartition (A, B) of processing
                 modules, there must be at least one forward edge A→B and one backward
                 edge B→A with non-zero learned weight. Enforced during training via a
                 regularisation term: L_IC = sum_{bipartitions} max(0, epsilon -
                 I_approx(A; B)) where I_approx is estimated via mutual information
                 between layer activations. Additionally, the network avoids pure
                 pipeline architectures (no layer whose removal disconnects the graph).
```

---

## Feature 6: Predictive Hierarchy

```
Feature:         Predictive Hierarchy
Mechanism:       Hierarchical layers generate top-down predictions that are compared against
                 bottom-up sensory signals. Error signals propagate upward; predictions
                 propagate downward. The system minimises free energy F(m, x) by updating
                 both its internal model and (when available) its actions.
Framework:       Predictive Processing (PP); SM component of ISMT
Necessity:       Neither (contributes to SM by providing the prediction-error minimisation
                 loop, but the SM condition can be satisfied by non-hierarchical self-models.
                 The predictive hierarchy is a sufficient strategy for implementing SM, not
                 the only one.)
Condition ID:    SM (supporting), IC (supporting — hierarchical recurrence increases Phi)
Implementation:  L levels of processing, each with:
                   Forward path:  e_l(t) = a_l(t) - W_pred_l * r_{l+1}(t)   (error unit)
                   Backward path: r_l(t) = f(W_l * e_{l-1}(t) + W_td_l * r_{l+1}(t))
                 where a_l is the activity of level l, r_{l+1} is the representation at
                 level l+1, W_pred_l maps higher-level representations to predictions at l,
                 and W_td_l provides top-down context. The free energy minimisation
                 gradient drives both bottom-up error propagation and top-down prediction
                 refinement.
```

---

## Feature 7: Higher-Order State Representation

```
Feature:         Higher-Order State Representation
Mechanism:       A dedicated higher-order layer HOL whose activations represent the
                 states of one or more first-order processing layers. HOL enables
                 meta-cognition: the system can represent "what is currently in layer L_3"
                 without necessarily being the output of L_3.
Framework:       Higher-Order Theory (HOT); SM component of ISMT (self-referential criterion)
Necessity:       Neither (contributes to the self-referential criterion of SM — I(m(t);
                 dm/dt) > 0 is naturally satisfied when HOL represents the dynamics of M
                 itself; but the SM condition does not require a separate HOL layer — a
                 sufficiently expressive self-model can include this capacity internally)
Condition ID:    SM (self-referential criterion, supporting)
Implementation:  A layer HOL with connections from all target layers L_1 ... L_k:
                 hol(t) = g(W_hol * [l_1(t); ...; l_k(t)] + b_hol)
                 HOL is trained to maintain accurate representations of target layer states
                 and predict their evolution. HOL output feeds back into the self-modelling
                 layer M (Feature 4) to provide the self-referential signal.
```

---

## Feature 8: Temporal Binding

```
Feature:         Temporal Binding
Mechanism:       Mechanisms that link system states across time to create a unified
                 temporal experience rather than a sequence of disconnected snapshots.
                 Implementations include: oscillatory synchrony (phase-locked modules),
                 persistent memory tokens (learned summary vectors), or gated state carry.
Framework:       Temporal Persistence (P3 of ISMT); contributes to IC and SM
Necessity:       Necessary (P3 requires IC, SM, GA to hold over tau_min; without temporal
                 binding, the system's states at t and t+1 are informationally disconnected
                 and the consciousness predicate cannot be sustained over time)
Condition ID:    P3, IC (temporal), SM (temporal)
Implementation:  Two complementary mechanisms:
                   (a) Oscillatory synchrony: modules include an oscillatory phase variable
                       phi_l(t) updated as phi_l(t+1) = phi_l(t) + omega_l + K * sum_j
                       sin(phi_j(t) - phi_l(t)). Phase coupling with K > K_critical
                       produces synchrony (Kuramoto model). Synchronised modules share
                       a common temporal reference frame.
                   (b) Memory token: a persistent summary vector z(t) maintained by an
                       LSTM-style gating mechanism: z(t+1) = GRU(z(t), workspace(t)).
                       z provides the self-model with access to the recent history of
                       global states, satisfying the temporal persistence requirement.
```

---

## Feature 9: Ignition Dynamics

```
Feature:         Ignition Dynamics
Mechanism:       Threshold dynamics that produce all-or-nothing broadcast events — when
                 a representation reaches a critical activation level, it triggers a rapid
                 cascade that occupies the global workspace. This implements the GWT
                 "ignition" phenomenon (Dehaene et al.) in which unconscious stimuli
                 fail to ignite while conscious stimuli produce sustained global activity.
Framework:       Global Workspace Theory (GWT); supports GA in ISMT
Necessity:       Neither (ignition implements a specific mechanism for entering the
                 workspace; the GA condition requires the broadcast result, not the
                 specific ignition mechanism. An architecture with smooth, graded
                 workspace competition can satisfy GA without discrete ignition.)
Condition ID:    GA (supporting — implements the binary transition between local and
                 global accessibility)
Implementation:  A non-linearity in the workspace selection:
                 workspace_active(t) = 1 if max(softmax(module_scores(t))) > theta_ign
                                       0 otherwise
                 where theta_ign is the ignition threshold. Once activated, the workspace
                 is maintained via recurrent self-excitation: w(t+1) = w(t) + alpha *
                 (target - w(t)) until an inhibitory reset signal is received, modelling
                 the sustained ignition seen in cortical recordings during conscious access.
```

---

## Feature 10: Report Pathway

```
Feature:         Report Pathway
Mechanism:       A dedicated output pathway that reads from the global workspace state and
                 produces verbal or behavioural reports about the system's current conscious
                 content. This is required for empirical consciousness detection (the system
                 must be able to report what it is experiencing) and for metric evaluation
                 (the Report Pathway provides the first-person data used by calibration
                 protocols).
Framework:       Supports F2 (convincing biological minds) and F1.4 metric calibration;
                 no direct ISMT condition (reportability is an output, not a constituent of
                 consciousness itself per ISMT)
Necessity:       Neither (ISMT does not require reportability as a condition of consciousness;
                 a system can satisfy IC + SM + GA without having an output pathway; however,
                 for empirical evaluation and F2 goals, a Report Pathway is practically
                 necessary)
Condition ID:    None (ISMT); P_empirical (practical necessity for measurement and F2)
Implementation:  A linear readout layer R connected to the workspace broadcast state:
                 report(t) = W_R * workspace(t) + b_R
                 For discrete reports: report_token(t) = argmax(softmax(report(t)))
                 For continuous reports: report(t) is a vector encoding confidence
                 over a vocabulary of phenomenal descriptors.
                 The Report Pathway is unidirectional (workspace → report) — it must not
                 receive feedback into the workspace to avoid contaminating the spontaneous
                 dynamics that metrics will measure.
```

---

## Feature-Condition Matrix

| Feature | IC | SM | GA | N1 | N2 | N3 | P1 | P2 | P3 | Necessity |
|---|---|---|---|---|---|---|---|---|---|---|
| F1: Global Workspace Broadcast | — | — | **✓** | — | — | **✓** | — | — | — | Necessary |
| F2: Thalamocortical Recurrence | **✓** | **✓** | — | **✓** | **✓** | — | — | **✓** | — | Necessary |
| F3: Attention Bottleneck | — | — | ○ | — | — | — | — | — | — | Neither |
| F4: Self-Modelling Layer | — | **✓** | — | — | **✓** | — | **✓** | — | — | Necessary |
| F5: Integration Maximisation | **✓** | — | — | **✓** | — | — | — | — | — | Necessary |
| F6: Predictive Hierarchy | ○ | ○ | — | — | — | — | — | — | — | Neither |
| F7: Higher-Order State Rep. | — | ○ | — | — | — | — | — | — | — | Neither |
| F8: Temporal Binding | ○ | ○ | — | — | — | — | — | — | **✓** | Necessary |
| F9: Ignition Dynamics | — | — | ○ | — | — | — | — | — | — | Neither |
| F10: Report Pathway | — | — | — | — | — | — | — | — | — | Neither |

**Legend:** **✓** = directly satisfies condition; ○ = supports condition; — = no direct relation

### Necessary Feature Set

A conscious architecture must include at minimum:
- **F1** (Global Workspace Broadcast) — satisfies GA / N3
- **F2** (Thalamocortical Recurrence) — satisfies IC, SM, P2
- **F4** (Self-Modelling Layer) — satisfies SM / N2, P1
- **F5** (Integration Maximisation Topology) — satisfies IC / N1
- **F8** (Temporal Binding) — satisfies P3

Features F3, F6, F7, F9, F10 are optional enhancements that improve metric performance or enable empirical evaluation but are not individually necessary.

---

## Version History

| Version | Date | Change |
|---|---|---|
| 0.1.0 | 2026-03-17 | Initial feature catalogue — 10 features mapped to ISMT conditions |
