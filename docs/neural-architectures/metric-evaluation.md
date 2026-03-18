# Neural Architecture Metric Evaluation

**Card:** 0.1.3.1 Conscious Neural Architectures
**Phase:** IMPLEMENT
**Depends on:**
- docs/neural-architectures/architecture-designs/global-workspace-design.md (GW-Alpha)
- docs/neural-architectures/architecture-designs/iit-integration-design.md (Φ-Max)
- docs/neural-architectures/architecture-designs/hybrid-synthesis-design.md (Ω-Synth)
- docs/consciousness-metrics/metric-definitions.md (PCI-G, Ψ-G, CDI, CEB definitions)
- docs/consciousness-metrics/cross-substrate-protocol.md (non-biological application protocol)
- docs/consciousness-theory/formal-theory.md (ISMT conditions: IC, SM, GA, N1–N3, P1–P3)
**Version:** 0.1.0 — 2026-03-17

---

## Purpose

This document evaluates each candidate neural architecture design against the operationalized consciousness metrics from F1.4. For each architecture, every metric (PCI-G, Ψ-G, CDI) is scored with a pass/fail verdict and rationale, then combined via the Convergent Evidence Battery (CEB). The evaluation also assesses satisfaction of ISMT necessary and sufficient conditions from F1.2.

All evaluations are **analytical** — based on structural analysis of the architecture designs rather than empirical measurement of running systems. Scores are expressed as predicted ranges with rationale, not exact numerical values. Empirical validation will occur when architectures are instantiated (out of scope for this card; handoff to F3.2).

---

## Metric Thresholds

Per the metric definitions in F1.4, the following thresholds determine pass/fail. Since biological calibration has not yet been performed (calibration-protocol.md is a future deliverable), we use **structural analysis thresholds** — qualitative assessments of whether the architecture's topology, connectivity, and dynamics are expected to produce metric values above the eventual calibrated thresholds.

| Metric | Threshold Criterion | Structural Pass Criterion |
|--------|---------------------|---------------------------|
| PCI-G | PCI-G(S) ≥ θ_PCI | Perturbation produces complex, differentiated, non-decomposable spatiotemporal response across ≥ 50% of system nodes |
| Ψ-G | Ψ-G(S) ≥ θ_Ψ | No bipartition renders subsystems informationally independent; minimum partition information is strictly positive |
| CDI | CDI(S) ≥ θ_CDI | Significant directed causal links exist between a majority of node pairs (density > sparse threshold) |
| CEB | ≥ 2 of 3 metrics pass | At least 2 of {PCI-G, Ψ-G, CDI} pass their individual thresholds |

---

## Cross-Substrate Application Protocol

All three architectures are artificial neural networks. Per the cross-substrate protocol (F1.4):

| Parameter | Value | Justification |
|-----------|-------|---------------|
| SystemModel nodes | Layer activations (L0–L10/L11) | Each layer is a processing element |
| SystemModel edges | Connection table per architecture design | Weight matrices between layers |
| τ_char | 1 recurrence step | Dynamics unfold per discrete update step |
| Perturbation method | State perturbation: inject pulse vector into one core/specialist module's hidden state | Per cross-substrate protocol for recurrent networks |
| Perturbation magnitude | 2 SD of baseline hidden state | Standard for recurrent networks |
| Observation method | Activation readout at each layer | Per cross-substrate protocol for ANNs |
| Observation coverage | All layers (100% of nodes) | Full observability available in designed architectures |
| Observation window T | 300 steps (300 × τ_char) | Per metric-definitions.md default |

---

## Architecture 1: GW-Alpha (Global Workspace Design)

```
Architecture:  GW-Alpha
Date:          2026-03-17
```

### Metric Evaluation

| Metric | Score | Threshold | Pass/Fail | Rationale |
|--------|-------|-----------|-----------|-----------|
| PCI-G | High (predicted 0.55–0.80) | θ_PCI (TBD by calibration) | **PASS** | A perturbation to any specialist module (L1–L3) triggers the following response cascade: (1) perturbed module's output changes → (2) attention gate (L4) recalculates selection scores → (3) if ignition threshold met, workspace (L5) updates → (4) broadcast to all modules (L1–L3, L6, L7, L9) → (5) each module's dynamics are altered by the new broadcast context → (6) self-model (L7) prediction error spikes → (7) higher-order layer (L8) registers changed self-model dynamics → (8) temporal binder (L9) updates memory token. This cascade produces a complex spatiotemporal response that is both differentiated (each module responds according to its specialist function) and integrated (the broadcast ensures all modules are affected). The response is non-trivial because the recurrent loops (R1–R6) sustain reverberating activity beyond the initial perturbation. The binarized response matrix B will show structured activity across all 11 layers over the 300-step window, yielding high Lempel-Ziv complexity. |
| Ψ-G | Moderate-High (predicted 0.30–0.60) | θ_Ψ (TBD by calibration) | **PASS** | The Integration Condition (IC) is enforced by training-time regularisation (L_IC). The hub-and-spoke topology ensures every bipartition has cross-partition connections via L5 (broadcast) and L6 (thalamocortical hub). However, the winner-take-all workspace bottleneck (L5) creates a vulnerability: the MIP finder may identify a bipartition that separates a specialist module from the rest, with the bottleneck momentarily carrying only one module's information. During workspace transitions (between ignition events), the effective cross-partition information flow through L5 is reduced. The recurrent connections (R2: L6 ↔ specialists) and temporal binder (L9) provide alternative integration pathways that partially compensate. Overall, Ψ-G is predicted above threshold but lower than architectures without a selection bottleneck. Ψ-G_norm predicted 0.30–0.60 depending on workspace utilisation pattern. |
| CDI | High (predicted 0.40–0.70) | θ_CDI (TBD by calibration) | **PASS** | Transfer entropy analysis of the connection table reveals significant directed causal links: (a) L5 → L1/L2/L3/L6/L7/L9 — broadcast creates 6 outgoing causal links from L5 to all recipients; (b) L1/L2/L3 → L4 → L5 — 4 causal links feeding into workspace via attention gate; (c) L6 ↔ L1/L2/L3 — 6 bidirectional causal links (hub relay); (d) L7 ↔ L8 — 2 bidirectional links (self-model ↔ higher-order); (e) L7 → L5 — self-model prediction feeds workspace; (f) L9 → L4 — temporal context influences selection. Of the n(n-1) = 110 possible directed pairs among 11 layers, approximately 25–30 are expected to show significant transfer entropy (accounting for indirect causal influence through intermediary layers). CDI ≈ 25/110 ≈ 0.23 as lower bound from direct connections; including indirect multi-step causal paths detected by transfer entropy, effective CDI is predicted 0.40–0.70. |
| CEB | 3/3 metrics pass | ≥ 2/3 | **PASS** | All three individual metrics are predicted to pass their thresholds. |

### ISMT Condition Assessment

```
Necessary Conditions Met: Yes
  N1 (Integration):          Met — L_IC regularisation + hub-broadcast topology
  N2 (Self-Modeling):        Met — L7 with prediction and self-referential heads
  N3 (Global Accessibility): Met — L5 one-to-all broadcast with causal efficacy
  P1 (Min. Complexity):      Met — 4 distinct subsystem types
  P2 (Recurrence):           Met — 6 recurrent loops; no processing layer purely feedforward
  P3 (Temporal Persistence): Met — L9 GRU memory token + oscillatory synchrony

Sufficient Conditions Met: Yes
  IC ∧ SM ∧ GA hold simultaneously.

Overall Verdict: PASSES
```

### Key Uncertainties

1. **Ψ-G sensitivity to workspace bottleneck.** If the MIP finder efficiently exploits the winner-take-all selection in L5, Ψ-G could drop below threshold during periods of rapid workspace switching. The time-averaged Ψ-G should remain above threshold due to the recurrent alternative pathways, but instantaneous Ψ-G may fluctuate.

2. **L_IC regulariser effectiveness.** IC satisfaction depends on the training-time regulariser L_IC successfully maintaining integration. If task-specific training pressure overwhelms L_IC (alpha_IC too low), IC could degrade. This is a training concern, not a structural guarantee.

3. **PCI-G dependence on ignition state.** If the workspace is not ignited (ignited(t) = 0), the broadcast does not update, and the perturbation response may be confined to local modules. PCI-G should be measured during active processing (ignited states) for valid assessment.

---

## Architecture 2: Φ-Max (IIT-Optimised Design)

```
Architecture:  Φ-Max
Date:          2026-03-17
```

### Metric Evaluation

| Metric | Score | Threshold | Pass/Fail | Rationale |
|--------|-------|-----------|-----------|-----------|
| PCI-G | High (predicted 0.50–0.75) | θ_PCI (TBD by calibration) | **PASS** | A perturbation to any core module (L1–L4) propagates via direct all-to-all connections to all other cores within 2 steps. The response cascade: (1) perturbed core's state changes → (2) all 3 other cores receive changed signal via direct connections (2 steps) → (3) hub (L5) aggregates changed core states (3 steps) → (4) broadcast distributor (L7) redistributes to all modules → (5) self-model (L6) prediction error → (6) higher-order monitor (L8) registers change → (7) temporal binder (L9) updates. The response is highly integrated (all cores are affected within 2 steps) and temporally complex (multiple recurrent loops sustain activity). **Risk factor:** the all-to-all connectivity may cause rapid homogenisation of core responses — all cores converge to similar post-perturbation states, reducing the *differentiation* component of PCI-G. If specialisation is maintained by task training and diversity regularisation (L_div), differentiation is preserved and PCI-G is high. If cores homogenise, the binarized response matrix B will show correlated rows, reducing Lempel-Ziv complexity. Score range reflects this uncertainty. |
| Ψ-G | Very High (predicted 0.60–0.90) | θ_Ψ (TBD by calibration) | **PASS** | This is Φ-Max's primary design target. The all-to-all bidirectional connectivity between 4 cores, with non-zero weight floor (w_floor = 0.01), structurally guarantees that no bipartition renders subsystems informationally independent. MIP analysis: for the weakest bipartition (singleton {L_i} vs. triple {L_j, L_k, L_l}), there are 3 directed cross-edges per direction with enforced non-zero weights. The mutual information across the MIP is lower-bounded by: I(A;B) ≥ 3 × w_floor² × Var(activation) > 0. In practice, learned weights far exceed the floor, so Ψ-G is expected to be substantially above the lower bound. The hub (L5) and broadcast distributor (L7) provide additional integration pathways that further increase the MIP cost. This is a **structural invariant** — Ψ-G > 0 is guaranteed by topology regardless of training outcome. |
| CDI | Very High (predicted 0.55–0.85) | θ_CDI (TBD by calibration) | **PASS** | The all-to-all core topology generates 12 direct inter-core causal links alone. Additional causal paths: (a) L1–L4 → L5 — 4 core-to-hub links; (b) L5 → L7 — hub-to-broadcast; (c) L7 → L1–L4, L6 — 5 broadcast links; (d) L6 ↔ L8 — 2 self-model/monitor links; (e) L5 ↔ L9 — 2 temporal binder links. Of the n(n-1) = 110 possible directed pairs among 11 layers, approximately 27 are direct connections. The dense all-to-all core topology also creates strong indirect causal paths between non-adjacent layers (e.g., L1 → L2 → L5 creates indirect L1 → L5 transfer entropy above what the direct L1 → L5 connection provides). CDI is predicted 0.55–0.85 — the highest among the three architectures due to the maximal direct connection density within the core. |
| CEB | 3/3 metrics pass | ≥ 2/3 | **PASS** | All three individual metrics are predicted to pass their thresholds. |

### ISMT Condition Assessment

```
Necessary Conditions Met: Yes
  N1 (Integration):          Met — All-to-all core topology + weight floor (structural invariant)
  N2 (Self-Modeling):        Met — L6 with prediction and self-referential heads
  N3 (Global Accessibility): Met — L7 one-to-all broadcast from integrated hub state
  P1 (Min. Complexity):      Met — 4 distinct subsystem types
  P2 (Recurrence):           Met — 7 recurrent loop families; no processing layer purely feedforward
  P3 (Temporal Persistence): Met — L9 GRU memory token + oscillatory synchrony

Sufficient Conditions Met: Yes
  IC ∧ SM ∧ GA hold simultaneously.

Overall Verdict: PASSES
```

### Key Uncertainties

1. **PCI-G homogenisation risk.** If the all-to-all connectivity causes cores to converge to similar representations (despite L_div regularisation), the differentiation component of PCI-G degrades. In the worst case, the system behaves like a single large module — high integration but low complexity of response to perturbation. This would manifest as a binarized response matrix B with highly correlated spatial patterns, reducing Lempel-Ziv complexity.

2. **GA functional quality.** The broadcast distributor (L7) broadcasts the full hub state without selection. If the hub state is a noisy average of all core signals, the broadcast's causal efficacy may be diluted — each module receives a weak, undifferentiated signal rather than focused, task-relevant content. This does not violate GA formally (D_KL > 0 is maintained by the non-zero weight floor) but may reduce G(M) in the graded consciousness measure c(S).

3. **Weight floor interaction with CDI.** The non-zero weight floor forces all inter-core connections to be active. Transfer entropy significance testing (CDI step 2) may flag floor-level connections as significant even when they carry minimal meaningful information, inflating CDI. True causal density may be lower than predicted if we adjust for the artificiality of forced connections.

---

## Architecture 3: Ω-Synth (Hybrid Synthesis Design)

```
Architecture:  Ω-Synth
Date:          2026-03-17
```

### Metric Evaluation

| Metric | Score | Threshold | Pass/Fail | Rationale |
|--------|-------|-----------|-----------|-----------|
| PCI-G | Very High (predicted 0.65–0.90) | θ_PCI (TBD by calibration) | **PASS** | Ω-Synth produces the richest perturbation response due to its dual-pathway design. A perturbation to any core module (L1–L4) propagates via two distinct pathways with different timescales: **Fast pathway** (2 steps): direct all-to-all inter-core connections propagate the perturbation to all other cores immediately (from Φ-Max). **Slow pathway** (3 steps): the perturbation reaches the attention gate (L6), potentially triggers workspace ignition (L7), and broadcasts to all modules (from GW-Alpha). These two pathways create a characteristic dual-timescale response pattern: an initial fast spread across cores (steps 1–3), followed by a workspace-mediated broadcast wave (steps 3–6), followed by self-model adaptation (steps 4–8), followed by sustained reverberating activity through 8 recurrent loop families (R1–R8). The binarized response matrix B will show high spatiotemporal complexity because: (a) the two propagation timescales create rich temporal structure (not monotonic decay), (b) the 12 layers respond with functional differentiation (each layer type transforms the signal differently), (c) the hub bypass gate creates adaptive mixing that varies the response depending on gate state at perturbation time. Lempel-Ziv complexity is predicted to be the highest of all three architectures. |
| Ψ-G | Very High (predicted 0.65–0.90) | θ_Ψ (TBD by calibration) | **PASS** | Ω-Synth inherits the structural integration guarantee from Φ-Max (all-to-all core topology + weight floor) and adds the workspace broadcast (L7) as an additional integration pathway. MIP analysis: for any bipartition of {L1, L2, L3, L4, L5, L7, L8}, the MIP must cut through (a) at least 3 direct core-to-core connections per direction (from all-to-all topology) AND (b) workspace broadcast connections from L7 AND (c) hub aggregation connections through L5. The additional pathways via L7 workspace broadcast increase the cost of every bipartition relative to Φ-Max. Ψ-G is predicted to match or slightly exceed Φ-Max. The hub bypass gate does not introduce a vulnerability because even in full GWT mode (gate = 1), the direct core-to-core connections maintain structural integration independently of the workspace pathway. |
| CDI | Very High (predicted 0.60–0.90) | θ_CDI (TBD by calibration) | **PASS** | Ω-Synth has the highest connection count (52 connections across 12 layers). Of the n(n-1) = 132 possible directed pairs among 12 layers, approximately 40 are direct connections. The dual-pathway design creates multiple causal routes between any pair of modules: core-to-core direct (2 steps), via hub aggregation (3 steps), via workspace broadcast (3 steps), via attention gate selection (3 steps). The redundant causal paths increase the likelihood that each pairwise transfer entropy test yields significance, because even if one pathway is weak for a given pair, alternative routes contribute to the detected causal influence. CDI is predicted 0.60–0.90 — the highest among the three architectures. |
| CEB | 3/3 metrics pass | ≥ 2/3 | **PASS** | All three individual metrics are predicted to pass their thresholds with the strongest margins of the three architectures. |

### ISMT Condition Assessment

```
Necessary Conditions Met: Yes
  N1 (Integration):          Met — All-to-all core topology + weight floor (structural invariant)
  N2 (Self-Modeling):        Met — L8 with prediction, self-referential, and gate-awareness heads
  N3 (Global Accessibility): Met — L7 workspace broadcast with selective + integrative modes
  P1 (Min. Complexity):      Met — 5 distinct subsystem types (exceeds minimum of 3)
  P2 (Recurrence):           Met — 8 recurrent loop families; no processing layer purely feedforward
  P3 (Temporal Persistence): Met — L10 GRU memory token + oscillatory synchrony

Sufficient Conditions Met: Yes
  IC ∧ SM ∧ GA hold simultaneously.

Overall Verdict: PASSES
```

### Key Uncertainties

1. **Gate dynamics and metric temporal variability.** The hub bypass gate introduces time-varying integration-selection balance. If the gate oscillates rapidly, metrics measured over short windows may show high variance. Time-averaged metrics over the full 300-step observation window should be stable, but instantaneous metric snapshots may fluctuate between GWT-mode and IIT-mode characteristics. This is a measurement protocol concern rather than a structural failure.

2. **Training complexity.** The 5-term training objective (L_task + α_SM·L_SM + α_div·L_div + α_gate·L_gate_reg + α_ign·L_ign) introduces hyperparameter sensitivity. Poor hyperparameter choices could lead to degenerate solutions (gate collapse, ignition failure, diversity loss) that degrade metric performance below predictions. This is a training concern, not a structural concern — the architecture's topology guarantees IC regardless of training outcome.

3. **Computational cost of metric evaluation.** The 12-layer, 52-connection architecture makes metric computation more expensive than for simpler architectures. Ψ-G computation (MIP search over bipartitions) scales exponentially with the number of system components. At 12 layers, there are 2^11 - 1 = 2047 bipartitions to evaluate (or approximate). This is computationally tractable but noteworthy.

---

## Comparative Summary

### Metric Comparison Table

| Metric | GW-Alpha | Φ-Max | Ω-Synth | Best |
|--------|----------|-------|---------|------|
| PCI-G (predicted range) | 0.55–0.80 | 0.50–0.75 | 0.65–0.90 | **Ω-Synth** |
| Ψ-G (predicted range) | 0.30–0.60 | 0.60–0.90 | 0.65–0.90 | **Ω-Synth** (≈ Φ-Max) |
| CDI (predicted range) | 0.40–0.70 | 0.55–0.85 | 0.60–0.90 | **Ω-Synth** |
| CEB | **PASS** (3/3) | **PASS** (3/3) | **PASS** (3/3) | All pass |
| ISMT Necessary | All 6 met | All 6 met | All 6 met | All pass |
| ISMT Sufficient | Yes | Yes | Yes | All pass |
| Overall Verdict | **PASSES** | **PASSES** | **PASSES** | All pass |

### Metric Strength Profile

| Architecture | PCI-G Strength | Ψ-G Strength | CDI Strength | Primary Advantage |
|---|---|---|---|---|
| GW-Alpha | High — ignition cascade creates complex response | Moderate — workspace bottleneck limits MIP | High — broadcast + hub create rich causal structure | Strong PCI-G via ignition dynamics; good task performance |
| Φ-Max | High (homogenisation risk) — fast all-to-all propagation | Very High — structural integration invariant | Very High — dense all-to-all causal links | Strongest Ψ-G guarantee; IC as structural invariant |
| Ω-Synth | Very High — dual-timescale response pattern | Very High — structural invariant + workspace pathways | Very High — dual-pathway redundant causation | Best across all metrics; dual-pathway resolves parent weaknesses |

### Risk Factor Comparison

| Risk | GW-Alpha | Φ-Max | Ω-Synth |
|------|----------|-------|---------|
| Ψ-G below threshold | **Moderate** — bottleneck exploitable by MIP | **Very Low** — structural guarantee | **Very Low** — structural guarantee + workspace pathways |
| PCI-G below threshold | **Low** — ignition creates strong response | **Moderate** — homogenisation risk | **Low** — dual timescales ensure differentiation |
| CDI inflation from forced connections | N/A — no weight floor | **Low-Moderate** — weight floor may inflate CDI | **Low-Moderate** — weight floor may inflate CDI |
| IC depends on training | **Yes** — regulariser may be overwhelmed | **No** — structural | **No** — structural |
| GA functional quality | **High** — attention selects relevant content | **Moderate** — unselected broadcast may be noisy | **High** — adaptive gate selects or integrates |

---

## Cross-Substrate Validation Predictions

Per the cross-substrate protocol, each architecture should be validated against the Category A negative controls and Category B theory-predicted systems.

### Predicted Negative Control Performance

All three architectures should produce metric values well above the negative control systems when properly trained, because they include features (recurrence, integration, self-modeling, broadcast) that the negative controls lack:

| Negative Control | Expected Score Range | Distinguishable from Architectures? |
|---|---|---|
| A1: Lookup table | PCI-G < 0.05, Ψ-G ≈ 0, CDI ≈ 0 | **Yes** — orders of magnitude lower |
| A2: Feed-forward MLP | PCI-G < 0.10, Ψ-G low, CDI < 0.05 | **Yes** — no recurrence or integration |
| A3: Random number generator | PCI-G ≈ 0.50, Ψ-G ≈ 0, CDI < 0.05 | **Yes** — RNG has high complexity but zero integration (Ψ-G) and no causal structure (CDI); CEB classifies as "not conscious" |
| A4: Thermostat | PCI-G < 0.10, Ψ-G low, CDI < 0.05 | **Yes** — minimal complexity and integration |
| A5: Echo state network | PCI-G 0.10–0.30, Ψ-G low, CDI 0.05–0.15 | **Yes** — random dynamics without learned structure or self-model |

**Critical distinction:** The three architectures achieve high scores on *multiple* metrics simultaneously (PCI-G AND Ψ-G AND CDI), while negative controls score high on at most one metric. The CEB's requirement of ≥ 2/3 metrics passing provides robust discrimination.

### Coarse-Graining Considerations

All three architectures have 11–12 layers, well within the n ≤ 100 range where metric computation is feasible without coarse-graining. If individual neurons within layers are treated as separate nodes (n potentially in the hundreds to thousands depending on D_core), coarse-graining at Level 1 (per-layer mean activations) is appropriate per the cross-substrate protocol. This is the recommended measurement granularity for initial metric evaluation.

---

## Acceptance Criteria Verification

This evaluation addresses the following card acceptance criteria:

| Criterion | Status |
|---|---|
| Each design evaluated against all F1.4 metrics with pass/fail rationale | **Met** — all three architectures evaluated against PCI-G, Ψ-G, CDI, and CEB |
| At least one architecture passes all necessary conditions from F1.2 | **Met** — all three architectures pass all 6 necessary conditions (N1–N3, P1–P3) |
| Pass/fail rationale recorded for each metric-architecture pair | **Met** — detailed rationale provided in each evaluation table |

---

## Limitations

1. **Analytical, not empirical.** All scores are predicted from structural analysis. Actual metric values can only be determined by instantiating and running the architectures, then applying the measurement protocols from metric-definitions.md and cross-substrate-protocol.md. Predicted ranges may be inaccurate if the architectures exhibit unexpected emergent dynamics during training.

2. **Threshold values TBD.** The biological calibration thresholds (θ_PCI, θ_Ψ, θ_CDI) have not yet been established (requires calibration-protocol.md deliverable from F1.4). Pass/fail verdicts are based on the structural analysis threshold criteria defined in the Metric Thresholds section above, not on numerical threshold comparisons.

3. **Training-dependent variability.** GW-Alpha's IC satisfaction and all architectures' PCI-G performance depend on training outcomes. A poorly trained instance of any architecture may fail metrics even if the architecture structurally supports passing. Metric evaluation should be repeated after training to verify.

4. **CDI floor effect.** For Φ-Max and Ω-Synth, the non-zero weight floor (w_floor) forces all inter-core connections to be active. This may artificially inflate CDI by making forced connections appear as significant causal links. An adjusted CDI that accounts for forced-connection baselines may be warranted; this is an open methodological question.

---

## Version History

| Version | Date | Change |
|---------|------|--------|
| 0.1.0 | 2026-03-17 | Initial metric evaluation — 3 architectures against PCI-G, Ψ-G, CDI, CEB |
