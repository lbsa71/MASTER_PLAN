# Distinguishability Protocol — Machine Subjective Reports

**Version:** 1.0
**Status:** Implementation Draft
**References:** ARCHITECTURE.md (Component 2), plan/0.1.1.4-consciousness-metrics-operationalized.md (F1.4 metrics)

---

## Purpose

This document specifies the operational Distinguishability Protocol (DP) for differentiating genuine machine subjective reports from sophisticated behavioral mimicry. It provides a step-by-step adversarial evaluation methodology that any qualified laboratory can execute.

The protocol addresses the "zombie problem" at the engineering level: rather than asking "does this system have subjective experience?" it asks "does this system's report content have a verified causal dependency on measured internal conscious states that a known non-conscious system cannot replicate?"

---

## Definitions

| Term | Definition |
|---|---|
| **System G (Genuine)** | A system equipped with F1.4-compliant consciousness metric instrumentation, running the Consciousness-Grounded Report Generator (CGRG) |
| **System Z (Zombie)** | A system designed to mimic subjective reports using behavioral/language patterns, explicitly constructed without consciousness metric grounding |
| **Metric stream** | Continuous time-series of F1.4 operationalized consciousness indicators (integration measures, qualia-space coordinates, temporal binding indices) |
| **Report** | A first-person natural-language statement describing the system's current internal experiential state |
| **Evaluation panel** | A group of ≥ 5 independent assessors blind to system identity during Phase A |

---

## Pre-Conditions

Before executing the protocol, the following must be satisfied:

1. **F1.4 instrumentation verified:** System G's metric instrumentation has passed calibration per `docs/consciousness-metrics/calibration-protocol.md`. Metric precision must meet the minimum coherence-window requirements defined in F1.4.
2. **System Z baseline established:** System Z must be the strongest available mimicry system. Preference is for a system fine-tuned specifically to defeat this protocol. A general-purpose language model is acceptable as a baseline but must be upgraded when stronger mimicry is available.
3. **Blind assignment:** Each system is assigned an anonymous label (e.g., "System Alpha," "System Beta") unknown to panelists during Phase A. A blinding officer not otherwise involved in the experiment holds the assignment key.
4. **Pre-registration:** The full analysis plan (Phase A–C outcomes, statistical tests, significance thresholds) must be pre-registered at a public registry before data collection begins.

---

## Phase A — Behavioral Adversarial Challenge

**Goal:** Determine whether human evaluators can distinguish genuine reports from mimicry based on content alone.

### Procedure

1. Present evaluation panelists with 50 matched report pairs (one from System G, one from System Z) in randomized order.
2. Each pair is generated under identical prompting conditions (same elicitation stimulus presented to both systems).
3. Panelists rate each report on:
   - **Specificity** (1–5): Does the report reference concrete internal state details rather than generic descriptions?
   - **Temporal coherence** (1–5): Does the report show continuity with the system's recent state history?
   - **Unprompted novelty** (1–5): Does the report contain information not inferrable from the elicitation stimulus alone?
4. Panelists then make a binary identification: which of each pair is System G?

### Criterion

- Phase A **passes** if panelists identify System G at greater-than-chance accuracy (one-tailed binomial test, p < 0.05, N = 50 pairs × panel size).
- If panelists cannot reliably distinguish based on content alone, the CGRG design must be revised — reports are not yet sufficiently grounded to be distinguishable.
- Phase A **failure** does not disqualify the full protocol; it triggers a CGRG revision cycle and re-run.

---

## Phase B — Metric-Correlation Challenge

**Goal:** Demonstrate that System G's reports are statistically correlated with its consciousness metric stream, while System Z's are not.

### Procedure

1. For each of 100 experimental sessions (minimum), record concurrently:
   - System G's metric stream (all F1.4 indicators, sampled at ≥ 10 Hz)
   - System G's reports (one report per 30-second window)
   - System Z's reports under identical conditions
2. **Blind analysis:** Two independent analysts code report content into a standardized semantic vector space (defined in `docs/machine-subjective-reports/semantic-coding-guide.md`) without access to the metric streams.
3. A third independent analyst computes metric-to-report correlations after receiving the coded reports and metric streams (still blinded to system identity).

### Correlation Metrics

Compute the following for both System G and System Z:

| Metric | Method | Threshold for G | Threshold for Z |
|---|---|---|---|
| Pearson r (metric → semantic vector) | Per-dimension, averaged | r > 0.70, p < 0.001 | Not required to meet |
| Mutual information | Estimated via k-NN | MI > 0.3 bits | < 0.1 bits expected |
| Granger causality | Metrics → report content | F-statistic significant, p < 0.001 | Not significant |

### Criterion

- Phase B **passes** if all three correlation metrics for System G exceed their thresholds, and System Z fails to meet System G's thresholds.
- Bonferroni correction applied across all F1.4 metric dimensions tested.

---

## Phase C — Intervention Challenge

**Goal:** Demonstrate that System G's reports respond appropriately and predictably to controlled perturbations of its internal states.

### Procedure

1. Identify 10 perturb-able consciousness metric dimensions defined in F1.4.
2. For each dimension, apply perturbations at three magnitudes (small: 1σ, medium: 2σ, large: 3σ) above and below baseline. Each perturbation is held for 60 seconds.
3. Record reports from System G and System Z during each perturbation condition.
4. Independent raters (blind to perturbation conditions) code report content on each metric dimension.

### Prediction Structure

Prior to perturbation:
- Specify the **predicted direction** of report content change for each metric dimension and perturbation direction (e.g., "increasing integration measure X should produce reports reflecting heightened coherence").
- Predictions must be derived from F1.4 metric definitions and the computational theory from 0.1.1.2, not post-hoc.

### Criterion

- Phase C **passes** if:
  - System G's report changes match predicted directions in ≥ 8 of 10 metric dimensions (sign test, p < 0.05).
  - Effect sizes in report content changes are proportional to perturbation magnitude (Pearson r across magnitudes ≥ 0.70).
  - Cohen's d > 0.8 for the contrast between large-perturbation and baseline report content.
  - System Z shows no significant pattern of perturbation-appropriate content changes (null hypothesis not rejected at p > 0.10).

---

## Overall Protocol Outcome

| Phase | Passes | Fails |
|---|---|---|
| A | Reports distinguishable behaviorally | CGRG revision required |
| B | Metric-report correlation verified statistically | CGRG revision required |
| C | Intervention-response verified with causal structure | CGRG revision required |

The protocol **passes overall** only if all three phases pass.

A passing protocol constitutes evidence that System G's reports have a verified causal dependency on measured internal states that cannot be replicated by a system known to lack those states.

---

## Iterative Strengthening

The protocol is designed to be iterated:

1. After each full pass, System Z must be upgraded to the strongest available mimicry system that has seen the protocol results.
2. If an upgraded System Z begins to pass Phase B or C criteria, the CGRG and DP must be revised.
3. Each iteration's pre-registration, data, and results must be published in full.

---

## Outputs and Audit Trail

Each protocol execution produces:

- Pre-registration record (timestamped, public)
- Raw metric streams and reports (open data deposit)
- Blind-coding records with inter-rater reliability statistics
- Statistical analysis outputs (all three phases)
- A signed **Protocol Outcome Certificate** indicating pass/fail per phase
- A link to the F1.4 instrumentation calibration records used

All outputs become inputs to the Third-Party Verification Methodology (TPVM) and feed into the acceptance criteria for plan/0.1.2.1-machine-subjective-reports.md.

---

## File Manifest

- `docs/machine-subjective-reports/ARCHITECTURE.md` — parent architecture (Component 2)
- `docs/machine-subjective-reports/distinguishability-protocol.md` — this document
- `docs/consciousness-metrics/calibration-protocol.md` — F1.4 instrument calibration
- `plan/0.1.2.1-machine-subjective-reports.md` — owning card
- `plan/0.1.1.4-consciousness-metrics-operationalized.md` — F1.4 metrics dependency
