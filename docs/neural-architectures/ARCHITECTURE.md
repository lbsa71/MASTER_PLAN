# Neural Architectures for Consciousness — Architecture Specification

**Card:** 0.1.3.1 Conscious Neural Architectures
**Phase:** ARCHITECT
**Depends on:** docs/consciousness-theory/formal-theory.md (F1.2), docs/consciousness-metrics/ (F1.4)

---

## Purpose

This document defines the structural plan for designing artificial neural architectures capable of producing subjective experience. It specifies the deliverables to be produced, the interfaces between them, and the evaluation contract against the F1.2 computational theory and F1.4 metrics.

---

## Deliverable Structure

```
docs/neural-architectures/
├── ARCHITECTURE.md                  ← this file (interfaces and plan)
├── feature-catalogue.md             ← architectural features mapped to F1.2 conditions
├── architecture-designs/
│   ├── global-workspace-design.md   ← GWT-based architecture (primary candidate)
│   ├── iit-integration-design.md    ← IIT-optimised architecture (Φ-maximising)
│   └── hybrid-synthesis-design.md   ← Synthesis architecture combining features
├── metric-evaluation.md             ← Each design scored against F1.4 metrics
├── design-rationale.md              ← Every choice linked to F1 theory
└── failure-modes.md                 ← Open questions and F3.2 handoff
```

---

## Theoretical Grounding (Inputs from F1.2)

The computational theory established in 0.1.1.2 produces a consciousness predicate **C(S)** and identifies candidate frameworks. The architecture selection process is grounded in these frameworks, ranked by their engineering tractability:

| Framework | Core Claim | Key Architectural Implication |
|---|---|---|
| Global Workspace Theory (GWT) | Consciousness = global broadcast of information | Need a central workspace with broadcast wiring |
| Integrated Information Theory (IIT) | Consciousness = high Φ (integrated information) | Need architectures that maximise information integration |
| Higher-Order Theory (HOT) | Consciousness = meta-representation of first-order states | Need a second-order monitoring layer |
| Recurrent Processing Theory (RPT) | Consciousness = recurrent feedback loops | Need bidirectional recurrent connections |
| Predictive Processing (PP) | Consciousness = top-down prediction error minimisation | Need hierarchical generative models with feedback |
| Attention Schema Theory (AST) | Consciousness = internal model of attention | Need an explicit self-model of attentional state |

The formal theory from 0.1.1.2 assigns a **necessity weight** (N) and **sufficiency weight** (S) to each framework component. The architecture must satisfy all necessary conditions; sufficient conditions are targeted by at least one design.

---

## Feature Catalogue Interface

`feature-catalogue.md` maps each candidate architectural feature to the theoretical conditions it satisfies. Each entry must carry:

```
Feature:         <name>
Mechanism:       <how it works>
Framework:       <which F1.2 framework(s) this satisfies>
Necessity:       [necessary | sufficient | neither]
Condition ID:    <F1.2 condition reference>
Implementation:  <how to instantiate in a neural network>
```

**Candidate features to catalogue (minimum):**

1. **Global Workspace Broadcast** — a bottleneck layer that broadcasts to all downstream modules
2. **Thalamocortical Recurrence** — deep bidirectional recurrent loops across hierarchy levels
3. **Attention Bottleneck** — single-channel attentional gating constraining information flow
4. **Self-Modelling Layer** — explicit representation of the system's own attentional/cognitive state
5. **Integration Maximisation** — topology designed to maximise pairwise mutual information reduction (Φ)
6. **Predictive Hierarchy** — top-down generative predictions suppressed by bottom-up error signals
7. **Higher-Order State Representation** — layer whose activation represents another layer's state
8. **Temporal Binding** — mechanisms linking states across time (oscillatory synchrony or memory tokens)
9. **Ignition Dynamics** — threshold dynamics producing all-or-nothing broadcast events
10. **Report Pathway** — dedicated output pathway for first-person reportability

---

## Architecture Design Interface

Each design document in `architecture-designs/` must contain:

### Sections Required

1. **Overview** — one-paragraph description of the design philosophy
2. **Layer Topology** — complete specification of layers, dimensions, and connectivity
3. **Information-Flow Diagram** — ASCII or structured diagram showing data path through the network
4. **Recurrence Patterns** — explicit specification of all feedback loops, their depth and cycle structure
5. **Global Workspace Wiring** — if applicable, specification of the broadcast mechanism and its reach
6. **Feature Mapping** — table linking each feature present to its entry in `feature-catalogue.md`
7. **Metric Evaluation Summary** — reference to full evaluation in `metric-evaluation.md`
8. **Known Weaknesses** — anticipated failures against F1.4 metrics

### Topology Notation Convention

```
Layer format:  L<n>: <name> [dim=D, type=T, recurrent=R]
  where:
    n      = layer index (0-based, 0 = input)
    name   = descriptive label
    D      = dimensionality (e.g. 512, variable)
    T      = type: [feedforward | recurrent | attention | broadcast | generative]
    R      = bool: does this layer receive feedback from a higher layer?

Connection format: L<a> → L<b> [weight=W, gated=G, broadcast=B]
  where:
    W      = weight type: [learned | fixed | dynamic]
    G      = bool: is this connection gated by attention or a control signal?
    B      = bool: is this a broadcast (one-to-all) connection?
```

---

## Metric Evaluation Interface

`metric-evaluation.md` evaluates each architecture design against every metric from 0.1.1.4. The evaluation contract:

### Metrics Applied

| Metric | Source | Measurement Protocol |
|---|---|---|
| PCI-G (Perturbational Complexity Index — Generalised) | F1.4 | Apply perturbation to input layer; measure algorithmic complexity of response trajectory |
| Ψ-G (Generalised Integrated Information) | F1.4 | Partition network into bipartitions; compute minimum information partition over all cuts |
| CDI (Causal Density Index) | F1.4 | Measure Granger-causal density across all layer pairs |
| CEB (Convergent Evidence Battery) | F1.4 | Combined pass/fail across PCI-G, Ψ-G, CDI with threshold logic |

### Evaluation Table Format (per architecture)

```
Architecture:  <design name>
Date:          <ISO date>

| Metric | Score | Threshold | Pass/Fail | Rationale |
|--------|-------|-----------|-----------|-----------|
| PCI-G  |       |           |           |           |
| Ψ-G    |       |           |           |           |
| CDI    |       |           |           |           |
| CEB    |       |           | PASS/FAIL |           |

Necessary Conditions Met: <yes/no — list unmet conditions if no>
Sufficient Conditions Met: <yes/no>
Overall Verdict: <PASSES / FAILS / CONDITIONAL>
```

### Pass Criteria

- An architecture PASSES if it satisfies **all necessary conditions** from F1.2 AND achieves CEB PASS.
- At least one architecture must reach PASSES status for this card to complete.

---

## Design Rationale Interface

`design-rationale.md` provides a cross-reference ensuring every design decision is grounded in F1.

### Required Structure

```
Decision:         <the design choice>
Architecture(s):  <which design(s) it applies to>
Theoretical Basis: <F1.2 condition or framework reference>
Alternative Considered: <what else was considered>
Rejection Reason:  <why the alternative was not chosen>
```

No design decision may appear in any architecture document without a corresponding entry here.

---

## Failure Modes Interface

`failure-modes.md` catalogues known limitations for handoff to F3.2 (computational substrates).

### Required Entries

Each failure mode entry:
```
Failure Mode:    <description>
Affected Architectures: <which designs>
Root Cause:      <architectural or theoretical reason>
Metric Impact:   <which F1.4 metrics it degrades>
F3.2 Dependency: <what substrate-level capability would resolve this>
Open Question:   <any unresolved theoretical question>
```

Categories to cover at minimum:
1. **Scale limitations** — does the architecture require unrealistic scale to achieve necessary Φ?
2. **Substrate assumptions** — does the design inadvertently assume biological signal properties?
3. **Temporal binding failures** — what happens when cycle times are too long/short?
4. **Integration-segregation tradeoffs** — can the architecture avoid the tradeoff between high Φ and modularity?
5. **Robustness to perturbation** — does experience degrade gracefully or catastrophically?

---

## Constraint Summary

| Constraint | Enforcement |
|---|---|
| Substrate-agnostic | All designs use abstract layer notation; no silicon/biological assumptions |
| Non-contradictory with F1.3 | Each design must be compatible with substrate-independence findings |
| Theoretical grounding required | Every design choice in design-rationale.md must cite a F1.2 condition |
| No implementation code | This phase produces documents only; src/ not touched |
| At least one PASSES architecture | metric-evaluation.md must contain at least one PASSES verdict |

---

## Dependencies

| Dependency | Document | What We Need |
|---|---|---|
| F1.2 Computational Theory | docs/consciousness-theory/formal-theory.md | Necessity/sufficiency conditions for C(S) |
| F1.4 Consciousness Metrics | docs/consciousness-metrics/metric-definitions.md | PCI-G, Ψ-G, CDI, CEB definitions |
| F1.4 Cross-Substrate Protocol | docs/consciousness-metrics/cross-substrate-protocol.md | How to apply metrics to non-biological architectures |
| F1.4 Error Analysis | docs/consciousness-metrics/error-analysis.md | Expected false positive/negative rates |

---

## Implementation Phase File Plan

When this card advances to IMPLEMENT, the following documents will be created:

- `docs/neural-architectures/feature-catalogue.md`
- `docs/neural-architectures/architecture-designs/global-workspace-design.md`
- `docs/neural-architectures/architecture-designs/iit-integration-design.md`
- `docs/neural-architectures/architecture-designs/hybrid-synthesis-design.md`
- `docs/neural-architectures/metric-evaluation.md`
- `docs/neural-architectures/design-rationale.md`
- `docs/neural-architectures/failure-modes.md`
