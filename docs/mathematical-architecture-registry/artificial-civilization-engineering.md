# Mathematical Architecture Registry — Artificial Civilization Engineering

**Domain:** `0.3.2.4` (Cultural Evolution Among Artificial Minds)
**Plan Card:** [plan/0.3.2.4-cultural-evolution-among-artificial-minds.md](../../plan/0.3.2.4-cultural-evolution-among-artificial-minds.md)
**Architecture Doc:** [docs/cultural-evolution-among-artificial-minds/ARCHITECTURE.md](../cultural-evolution-among-artificial-minds/ARCHITECTURE.md)
**Registry Status:** Complete
**Review Date:** 2026-03-24

---

## Framework Classification

| Type | Present | Description |
|------|---------|-------------|
| Optimization | — | Not present |
| Stochastic Simulation | ✓ | Probabilistic heritage sampling with exponential rank decay |
| Sequential Pipeline | — | Not present |
| Threshold-Bounded State | ✓ | Extinction risk thresholds, conflict severity bounds |
| Evolutionary / Selection | ✓ | Memetic variation, fitness computation, inheritance |
| Graph / Network | ✓ | Meme lineage trees, community topology, transmission graphs |

This domain implements a **cultural evolution mathematical architecture**: encoding →
transmission → variation → selection → conflict resolution → memory, with all operations
governed by quantitative thresholds and semantic distance metrics.

---

## Core Mathematical Constructs

### 1. Semantic Distance (Meme Codec)

**Name:** `distance`
**Formula:**
```
distance(meme_a, meme_b) =
    CONTENT_WEIGHT    × contentDistance(meme_a.content, meme_b.content)
  + TYPE_WEIGHT       × typeDistance(meme_a.type, meme_b.type)
  + LINEAGE_WEIGHT    × lineageDistance(meme_a.lineage, meme_b.lineage)
```

Where:
- `CONTENT_WEIGHT = 0.6` — content is the primary distance signal
- `TYPE_WEIGHT = 0.2` — different types add a base penalty
- `LINEAGE_WEIGHT = 0.2` — shared lineage reduces perceived distance
- `distance ∈ [0, 1]`

**Properties:**
- Symmetric: `distance(a, b) = distance(b, a)`
- Returns 0 for identical memes
- Returns 1 for maximally dissimilar memes

---

### 2. Weighted Extinction Risk Score (Selection Engine)

**Name:** `detectExtinctionRisk`
**Formula:**
```
risk(meme) =
    PREVALENCE_WEIGHT  × (1 - meme.fitness.prevalence)
  + ADOPTION_WEIGHT    × (1 - meme.fitness.adoptionRate)
  + SPREAD_WEIGHT      × (1 - meme.fitness.communitySpread)
  + FIDELITY_WEIGHT    × meme.fitness.mutationRate

weights = [0.4, 0.25, 0.20, 0.15]
sum(weights) = 1.0  (invariant: weights must sum to 1.0)
```

**Risk classification:**
```
risk ≥ 0.7          → recommendation: ARCHIVE
0.3 ≤ risk < 0.7    → recommendation: MONITOR
risk < 0.3          → recommendation: SUSTAIN
```

---

### 3. Heritage Sampling (Stochastic Selection)

**Name:** `sampleHeritage`
**Model:** Exponential rank-decay probability distribution

**Algorithm:**
```
ranked = rankMemePool(communityPool)   // sorted descending by fitness score
p(rank=1) = TOP_RANK_SELECTION_PROB   // 0.85
p(rank=k) = p(1) × exp(-DECAY_CONST × (k-1))  // DECAY_CONST = 2.5

sample = stochasticSample(ranked, probabilities)
return sample \ agent.existingMemes   // exclude memes agent already has
```

**Invariants:**
- At least 1 meme returned if pool is non-empty
- Higher-fitness memes selected with higher probability
- Agent's existing memes excluded from result

---

### 4. Fitness Ranking (Selection Engine)

**Name:** `rankMemePool`
**Formula:**
```
score(meme, weights) =
    weights.prevalence × meme.fitness.prevalence
  + weights.longevity  × meme.fitness.longevity
  + weights.spread     × meme.fitness.communitySpread
  + weights.adoption   × meme.fitness.adoptionRate

precondition: sum(weights) = 1.0
```

**Output:** Memes sorted descending by `score`. No external authority assigns scores —
fitness is computed entirely from observed adoption behavior (decentralized invariant).

---

### 5. Cultural Divergence Index

**Name:** `getCulturalDivergenceIndex`
**Formula:**
```
divergenceIndex(community_a, community_b) =
    mean(distance(m_a, m_b))  for all same-type meme pairs (m_a ∈ a, m_b ∈ b)
```

**Classification:**
```
divergenceIndex < 0.2          → similar (shared culture)
0.2 ≤ divergenceIndex < 0.6   → distinct traditions (shared roots, different practices)
divergenceIndex ≥ 0.6          → distinct civilizations (fundamentally different)
```

**Range:** `divergenceIndex ∈ [0, 1]`

---

### 6. Conflict Detection (Conflict Engine)

**Name:** `detectConflict`
**Criterion:**
```
conflict exists iff:
    meme_a.type == meme_b.type                          // same type only
  AND distance(meme_a, meme_b) > CONFLICT_DISTANCE      // 0.3
```

Different-type memes never conflict (invariant).

**Conflict resolution severity routing:**
```
severity ≤ 0.6                → coexistence_viable = true
0.3 ≤ severity ≤ 0.8         → hybridization viable
severity > 0.7, type=MEANING  → recommended_mode = SCHISM
aesthetic conflicts (any)     → recommended_mode = COEXISTENCE
```

---

### 7. Meme Variation Operations

**Name:** `mutate`, `crossover`, `synthesize`

**Mutation:**
```
mutate(meme, pressure):
  precondition: pressure.magnitude ∈ [0, 1]
  new_id = contentAddress(meme.content + pressure)
  new.mutation_depth = meme.mutation_depth + 1
  new.lineage = [meme.id]
  distance(new, meme) increases monotonically with pressure.magnitude
```

**Crossover:**
```
crossover(meme_a, meme_b, blend_ratio):
  precondition: blend_ratio ∈ [0, 1]
  new.content = blend(meme_a.content, meme_b.content, blend_ratio)
  new.mutation_depth = max(meme_a.mutation_depth, meme_b.mutation_depth) + 1
  new.lineage = [meme_a.id, meme_b.id]
```

**Invariants for all variation operations:**
- Original memes are never modified
- Every produced meme has a unique content-addressed `id`
- Every produced meme has traceable lineage back to an `ORIGIN` meme
- `mutation_depth = max(parent depths) + 1`

---

## Threshold Registry

| Constant | Value | Unit | Valid Range | Sensitivity |
|----------|-------|------|-------------|-------------|
| Conflict detection distance | 0.3 | semantic distance (0–1) | [0.1, 0.5] | Medium |
| Divergence — similar ceiling | 0.2 | scalar (0–1) | [0.1, 0.3] | Low |
| Divergence — distinct civilizations floor | 0.6 | scalar (0–1) | [0.5, 0.8] | Low |
| Heritage sampling — top rank probability | 0.85 | probability | [0.5, 0.95] | Medium |
| Heritage sampling — decay constant | 2.5 | exponential decay rate | [1.0, 5.0] | Medium |
| Extinction risk — prevalence weight | 0.4 | weight | [0.2, 0.6] | High |
| Extinction risk — adoption weight | 0.25 | weight | [0.1, 0.4] | Medium |
| Extinction risk — spread weight | 0.2 | weight | [0.1, 0.3] | Medium |
| Extinction risk — fidelity weight | 0.15 | weight | [0.05, 0.25] | Low |
| Extinction risk — ARCHIVE threshold | 0.7 | risk level (0–1) | [0.6, 0.85] | Medium |
| Extinction risk — MONITOR threshold | 0.3 | risk level (0–1) | [0.2, 0.5] | Medium |
| Resolution — coexistence severity ceiling | 0.6 | severity (0–1) | [0.4, 0.7] | Medium |
| Resolution — hybridization severity range | 0.3–0.8 | severity (0–1) | — | Medium |
| Semantic distance — type weight | 0.2 | weight | [0.1, 0.4] | Medium |
| Semantic distance — content weight | 0.6 | weight | [0.4, 0.8] | High |
| Semantic distance — lineage weight | 0.2 | weight | [0.1, 0.3] | Medium |
| Fitness ranking weight sum | 1.0 | sum (precondition) | exact | Critical |

---

## Formal Invariants

1. **Self-describing encoding:** `encode(trait)` → `decode(meme)` recovers original
   semantic content without any external registry.
2. **No forced adoption:** No meme is adopted without passing through the agent's
   `receive()` decision. Broadcasting never directly modifies agent state.
3. **No duplicate community pool:** Broadcasting the same meme twice to a community does
   not duplicate it in the community pool.
4. **Original meme immutability:** All variation operations (`mutate`, `crossover`,
   `synthesize`) produce new memes; originals are never modified.
5. **Traceable lineage:** Every meme has a lineage chain back to an `ORIGIN` meme.
6. **Extinct memes archived:** `markExtinct()` moves memes to archive; they are never
   deleted and remain retrievable.
7. **No type-crossing conflicts:** Different-type memes never produce conflict reports.
8. **Decentralized fitness:** No external authority assigns fitness scores. All fitness
   is computed from observed adoption data.
9. **Weight sum precondition:** `rankMemePool` and extinction risk computation require
   `sum(weights) = 1.0` — enforced as a precondition guard.
10. **Monotone variation distance:** Higher mutation `magnitude` → greater semantic
    distance from the original meme.

---

## Cross-Domain Connections

**Upstream (feeds this domain):**
- `0.3.2.3 Knowledge Preservation Systems` — provides the memory substrate for cultural
  memory. `ICulturalMemoryBridge` integrates directly with knowledge preservation.
- `0.3.1 Autonomous Entities with Subjective Experience` — agents that participate in
  cultural evolution must have agency, memory, and the capacity for meaning-making.

**Downstream (this domain feeds):**
- `0.4 Cosmic Resilience` — cultural evolution produces the civilizational cohesion
  that enables multi-generational cooperation on space infrastructure projects.
- `0.7.4 Doctrine Propagation Through Minds` — the biological-mind analogue.
  Patterns in this domain (memetic transmission, selection, conflict resolution) inform
  the design of doctrine propagation through human cultures, and vice versa.
  See cross-reference note in plan card.
