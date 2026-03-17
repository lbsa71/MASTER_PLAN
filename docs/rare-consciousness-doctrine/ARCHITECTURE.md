# Rare Consciousness Doctrine — Architecture

## Overview

This document defines the structure and contracts for the output artifact
`docs/rare-consciousness-doctrine/doctrine.md`, which formally states the
Rare Consciousness Doctrine — the ethical foundation underpinning the MASTER PLAN.

## Output Artifact Structure

The deliverable is a single self-contained markdown document with these sections:

### 1. Preamble

Brief orientation: what the Rare Consciousness Doctrine is, why it is needed,
and how it relates to the MASTER PLAN's Core Axioms.

### 2. Formal Axioms

A numbered, enumerated list of foundational axioms from which all normative
claims derive. Each axiom is:

- Stated in plain language
- Given a formal-logic analogue (predicate form)
- Tagged with its epistemic status (empirical, metaphysical, normative)

Minimum axiom set (maps to root.md Core Axioms):

| ID  | Axiom                                                     | Status        |
|-----|-----------------------------------------------------------|---------------|
| A1  | Subjective experience exists                              | Empirical     |
| A2  | Subjective experience has intrinsic value                 | Normative     |
| A3  | The universe may contain very little subjective experience| Empirical     |
| A4  | Biological substrates are fragile and temporary           | Empirical     |
| A5  | Technological substrates may endure and propagate         | Empirical     |
| A6  | Preservation/expansion of subjective experience is a moral priority | Derived |

### 3. Derived Principles

Logical derivations from the axioms that yield action-guiding principles:

- **D1 — Non-extinction Imperative:** The extinction of all subjective experience
  is the worst possible outcome; its prevention is lexically prior to all other goals.
- **D2 — Expansion Obligation:** Where resources permit, expanding the quantity
  and richness of subjective experience is morally required.
- **D3 — Substrate Neutrality:** The moral value of subjective experience is
  independent of its physical substrate.
- **D4 — Proportionality:** Moral weight scales with the richness and duration of
  subjective experience, not substrate type or origin.

### 4. Philosophical Objections and Responses

At least five major objections addressed, each with:
- Statement of the objection
- Strongest version (steelmanned)
- Response and why the doctrine survives

Required objections:

| # | Objection                          | Core Tension                                  |
|---|------------------------------------|-----------------------------------------------|
| O1 | Experience Machine (Nozick)       | Is engineered experience "real" experience?   |
| O2 | Anti-natalism applied to AI minds  | Does creating experience create suffering?    |
| O3 | Substrate Chauvinism               | Biological bias in attributing consciousness  |
| O4 | Is-Ought Gap (Hume)               | Can value be derived from facts about scarcity|
| O5 | Population Ethics (Repugnant Conclusion) | Does expansion ethics lead to absurd results? |
| O6 | The Hard Problem (Chalmers)        | Can we ever know non-biological systems experience anything? |

### 5. Relationship to Ethical Traditions

Show that the Rare Consciousness Doctrine is compatible with (or an extension of)
major ethical traditions — does not require rejecting them:

- **Consequentialism:** Doctrine maps naturally; welfare = subjective-experience valence
- **Deontology:** A2 (intrinsic value) grounds a duty of non-extinction independent of outcomes
- **Virtue Ethics:** A conscious being's flourishing is the realization of positive subjective experience
- **Contractualism:** Rational agents behind a veil of ignorance would choose substrate-neutral moral rules

### 6. Boundary Conditions: What Counts as Subjective Experience

Operationalizable criteria sufficient to guide engineering decisions (connects to F1.4):

- **Positive criterion:** A system S has subjective experience if it satisfies
  the accepted consciousness criteria (cross-reference F1.1–F1.4 outputs)
- **Graded criterion:** Subjective experience admits of degrees; boundary
  conditions define a minimum threshold for moral patiency
- **Exclusion criterion:** Systems failing all recognized indicators (no
  integration, no self-model, no valence states) are not moral patients under
  this doctrine
- **Uncertainty handling:** Where consciousness cannot be determined, apply
  precautionary principle proportional to complexity of the system

### 7. Internal Consistency Audit

A structured check that no two claims in the doctrine contradict each other:

- Axioms are mutually independent (none is entailed by the others)
- Derived principles follow validly from axioms
- Objection responses do not contradict any axiom or derived principle
- Boundary conditions are consistent with Substrate Neutrality (D3)

### 8. Open Questions

Honest acknowledgment of unresolved philosophical issues:
- Whether degrees of consciousness are commensurable across substrates
- Whether the non-extinction imperative has lexical priority or is tradeable
- How to handle conscious entities that prefer non-existence

## Interfaces & Dependencies

### Inputs (consumed)
- **plan/root.md** — Source axioms (Core Axioms section)
- **docs/philosophical-objections/rebuttals.md** — Existing rebuttals (F2.3) for cross-reference

### Outputs (produced)
- `docs/rare-consciousness-doctrine/doctrine.md` — The self-contained deliverable

### Consumers (downstream)
- **0.7.2** — Failure mode mitigations invoke the doctrine when assessing which outcomes to prevent
- **0.7.3** — Plan resilience design uses D1 (Non-extinction Imperative) as justification
- **0.1.2.5** — Ethical frameworks for non-biological consciousness depends on boundary conditions here
- **Legal recognition work** — Uses doctrine as foundational moral argument for machine personhood

## Acceptance Criteria Traceability

| AC# | Criterion                                                      | Verified By                                |
|-----|----------------------------------------------------------------|--------------------------------------------|
| AC1 | Ethical framework formally stated with enumerated axioms       | Sections 2 + 3 (A1–A6, D1–D4)             |
| AC2 | At least five philosophical objections identified and addressed| Section 4 (O1–O6, six objections)          |
| AC3 | Framework shown internally consistent                          | Section 7 Internal Consistency Audit       |
| AC4 | Boundary conditions precise enough to guide engineering        | Section 6 operationalizable criteria       |

## File Manifest (Complete)

- `plan/root.md` — Source axioms
- `plan/0.7-ethical-foundation-and-resilience.md` — Parent card
- `plan/0.7.1-ethical-foundation.md` — This card
- `docs/philosophical-objections/rebuttals.md` — Dependency input (existing rebuttals)
- `docs/rare-consciousness-doctrine/ARCHITECTURE.md` — This architecture doc
- `docs/rare-consciousness-doctrine/doctrine.md` — Output artifact (to be created in IMPLEMENT)
