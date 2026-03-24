# Mathematical Architecture Registry

## Purpose

This registry catalogs the mathematical frameworks discovered within MASTER_PLAN domains.
Each plan domain contains a mathematical substrate — optimization algorithms, quantitative
models, formal contracts, and threshold constants — that forms the computational foundation
of its implementation. The registry makes these architectures visible, comparable, and
subject to cross-domain integration analysis.

---

## Why This Exists

Initial exploration of plan cards revealed that domain summaries underrepresent the
mathematical depth of their implementations. The card summaries describe *what* systems do;
the registry documents *how* — the formal models, decision criteria, invariants, and
threshold constants that govern system behavior.

The distinction matters because:
- Cross-domain **unifying patterns** (optimization, simulation, selection, invariant
  preservation) can only be identified when frameworks are documented in a common format.
- **Integration assessments** — how the mathematical substrate of one domain feeds into
  another — require a registry as a reference base.
- **Review completeness** criteria depend on knowing what a complete mathematical
  specification looks like, which requires cross-domain comparison.

---

## Registry Format

Each entry documents a domain's mathematical architecture in the following sections:

### 1. Domain Identity
- Plan reference (e.g., `0.4.1.2`)
- Source plan card
- Source architecture document

### 2. Framework Classification
Classify the type(s) of mathematical framework present:
- **Optimization** — scoring functions, selection algorithms, objective maximization
- **Stochastic Simulation** — probabilistic models, random processes, Monte Carlo
- **Sequential Pipeline** — staged transformation with yield/cost parameters
- **Threshold-Bounded State** — gap tracking, supply monitoring, invariant enforcement
- **Evolutionary / Selection** — fitness computation, variation, inheritance
- **Graph / Network** — lineage trees, transmission graphs, community topology

### 3. Core Mathematical Constructs
Document each construct:
- Name and symbol
- Formula or definition
- Domain (input types and ranges)
- Key properties (e.g., monotonicity, purity, determinism)

### 4. Threshold Registry
List all numerical constants with values, units, valid ranges, and sensitivity classification.

### 5. Formal Invariants
Enumerate the invariants the system guarantees — properties that hold regardless of input,
time, or external state.

### 6. Cross-Domain Connections
Identify upstream inputs and downstream consumers within the broader MASTER_PLAN.

---

## Registry Entries

| Entry | Domain | Plan Card | Status |
|-------|--------|-----------|--------|
| [Asteroid Resource Utilization](./asteroid-resource-utilization.md) | `0.4.1.2` | [plan/0.4.1.2](../../plan/0.4.1.2-asteroid-resource-utilization.md) | Complete |
| [Artificial Civilization Engineering](./artificial-civilization-engineering.md) | `0.3.2.4` | [plan/0.3.2.4](../../plan/0.3.2.4-cultural-evolution-among-artificial-minds.md) | Complete |

---

## Review Criteria for Domain Completeness

A domain's mathematical architecture is considered **complete** when:

1. **All core constructs documented** — every exported function or interface with a
   mathematical specification has an entry in the registry.
2. **Threshold registry complete** — all numerical constants are listed with values, units,
   valid ranges, rationale, and sensitivity classification.
3. **Invariants enumerated** — at least one formal invariant per major module.
4. **Framework classified** — the domain's mathematical type(s) are identified from the
   classification taxonomy above.
5. **Cross-domain connections mapped** — upstream and downstream relationships identified.

A domain's architecture is **incomplete** when any of the above are missing, or when the
plan card's Decision section omits a quantitative model that the implementation contains.

---

## Integration Assessment

### Shared Mathematical Patterns

The following patterns appear across multiple domains and represent candidates for
shared infrastructure or cross-domain unification:

| Pattern | Domains | Notes |
|---------|---------|-------|
| Scoring / ranking by composite ratio | Asteroid Resource Utilization | `(mass × accessibility) / deltaV` |
| Weighted fitness from multi-factor signals | Artificial Civilization Engineering | Extinction risk weighted sum |
| Stochastic simulation with daily ticks | Asteroid Resource Utilization | Mining and depot simulations |
| Invariant: original objects never mutated | Artificial Civilization Engineering | Meme variation engine |
| Stateful gap / anomaly tracking | Asteroid Resource Utilization | Depot supply gap open/close |
| Content-addressed identity | Artificial Civilization Engineering | Meme `id` is content-addressed |

### Open Integration Questions

1. **Resource ↔ Culture feedback:** Can asteroid-derived resource availability modulate
   cultural evolution dynamics (e.g., abundance affects value system formation)?
2. **Fitness ↔ Optimization unification:** Could the asteroid prospecting score and cultural
   meme fitness score be instances of a single generalized selection function?
3. **Simulation tick model:** Both domains use day-resolution simulation ticks. Is there a
   shared simulation kernel that both should consume?

---

## Remaining Domains for Review

The following plan domains have not yet been assessed for mathematical architecture:

- `0.1.1.4` — Consciousness Metrics Operationalized (ISMT: Consciousness Verification)
- `0.3.1.5` — Industrial-Era Conscious Agent (multi-module cognitive architecture)
- `0.3.2.1` — Autonomous Manufacturing Ecosystems
- `0.4.2` — Self-Replicating Conscious Infrastructure
- `0.5.1` — Interstellar Probe Swarms
- `0.7.4` — Doctrine Propagation Through Minds (conversion funnel dynamics)

Each will produce a registry entry when reviewed. See `plan/2.1.md` and `plan/2.2.md`
for review process cards.
