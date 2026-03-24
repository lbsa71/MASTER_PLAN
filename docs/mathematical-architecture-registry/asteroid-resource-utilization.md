# Mathematical Architecture Registry — Asteroid Resource Utilization

**Domain:** `0.4.1.2`
**Plan Card:** [plan/0.4.1.2-asteroid-resource-utilization.md](../../plan/0.4.1.2-asteroid-resource-utilization.md)
**Architecture Doc:** [docs/asteroid-resource-utilization/ARCHITECTURE.md](../asteroid-resource-utilization/ARCHITECTURE.md)
**Registry Status:** Complete
**Review Date:** 2026-03-24

---

## Framework Classification

| Type | Present | Description |
|------|---------|-------------|
| Optimization | ✓ | Composite scoring function for candidate ranking |
| Stochastic Simulation | ✓ | Day-resolution mining simulation with PRNG fault injection |
| Sequential Pipeline | ✓ | Five-stage ore processing with yield multiplication |
| Threshold-Bounded State | ✓ | Supply gap open/close tracking with tolerance invariant |
| Evolutionary / Selection | — | Not present |
| Graph / Network | — | Not present |

This domain implements a **four-tier mathematical framework**: selection optimization →
stochastic extraction simulation → pipeline yield calculation → supply reliability
monitoring.

---

## Core Mathematical Constructs

### 1. Resource-per-Delta-V Score (Prospecting)

**Name:** `resourcePerDeltaV`
**Formula:**
```
score(c) = (totalResourceMass(c) × c.accessibilityScore) / c.deltaVCost
```
Where:
- `totalResourceMass(c)` = sum of all resource field masses in `c.estimatedComposition` (kg)
- `c.accessibilityScore` ∈ [0, 1] — higher is easier to reach
- `c.deltaVCost` > 0 — round-trip delta-v budget in m/s

**Properties:**
- Pure function (no side effects, deterministic)
- Monotone increasing in mass and accessibility
- Monotone decreasing in delta-v cost
- Provably optimal selection criterion for independent (non-budget-constrained) candidate evaluation

**Selection Algorithm:**
```
selectTopCandidates(catalog, N=10):
  scores = map(resourcePerDeltaV, catalog)
  sorted = sortDescending(scores)
  return sorted[0..N-1]
```
Greedy sort achieves 100% of optimal for independent candidate selection (zero interaction effects between selections).

---

### 2. Mining Extraction Simulation (Stochastic)

**Name:** `simulateMining`
**Model:** Daily-tick stochastic simulation over `T` days

**Per-tick logic:**
```
for day d in [1..T]:
  if Bernoulli(FAULT_PROBABILITY):       // p = 0.02
    log(FAULT_DETECTED)
    skip extraction (autonomous recovery, 1-day pause)
  else:
    efficiency ~ Uniform(DAILY_EFFICIENCY_RANGE_LOW, DAILY_EFFICIENCY_RANGE_HIGH)
                          // [0.85, 1.00]
    extracted[d] = extractionRate × efficiency
    log(STATUS_REPORT) every 30 days
```

**Output invariants:**
```
totalExtracted = sum(extracted)
theoreticalMax = extractionRate × T
totalExtracted / theoreticalMax ≥ EXTRACTION_EFFICIENCY_THRESHOLD  // 0.80
daysAutonomous ≥ AUTONOMY_PERIOD_MIN                                // 90
```

**Reproducibility:** Seeded PRNG (`seed: number`) guarantees identical results for
identical inputs. Same seed → same `ExtractionResult`.

---

### 3. Processing Pipeline Yield (Sequential Multiplication)

**Name:** `cumulativeYield`, `totalEnergyCostPerKg`, `processOre`
**Model:** Fixed five-stage sequential pipeline

**Stages (C-type asteroid default):**
```
Stage 1: Sorting           yieldFraction, energyCostPerKg
Stage 2: Thermal           yieldFraction, energyCostPerKg
Stage 3: Chemical          yieldFraction, energyCostPerKg
Stage 4: Volatile Capture  yieldFraction, energyCostPerKg
Stage 5: QA                yieldFraction, energyCostPerKg
```

**Cumulative yield:**
```
cumulativeYield(stages) = ∏ stages[i].yieldFraction    // product of all yield fractions
cumulativeYield ∈ (0, 1]
```

**Energy balance:**
```
processingEnergyKwh   = totalEnergyCostPerKg × oreMassKg × cumulativeYield
H2EnergyKwh           = LH2massKg × H2_ENERGY_DENSITY            // 33.3 kWh/kg
solarEnergyKwh        = SOLAR_ARRAY_POWER × processingHours       // 150 kW
energyBalance         = (H2EnergyKwh + solarEnergyKwh) / processingEnergyKwh
```

**Purity invariants:**
```
metal products:    purity ≥ METAL_PURITY_MIN     // 0.95
water/LOX/LH2:     purity ≥ VOLATILE_PURITY_MIN  // 0.99
```

**Water electrolysis split:**
```
half of water → electrolysis → LOX (88.9% by mass) + LH2 (11.1% by mass)
other half    → stored as water
LH2 used entirely for fuel cell energy budget
```

---

### 4. Depot Supply Gap Tracking (Threshold-Bounded State)

**Name:** `simulateDepot`
**Model:** Day-resolution state machine over `T` days per consumer-material pair

**Per-tick logic:**
```
for day d in [1..T]:
  supply = dailySupplyFn(d)
  addToInventory(depot, supply)          // capped at DEPOT_CAPACITY_DEFAULT (1,000,000 kg)
  for each consumer c, material m:
    dispensed = dispenseMaterial(depot, m, c.dailyDemand[m])
    demandFraction = dispensed / c.dailyDemand[m]
    if demandFraction < DEMAND_MET_THRESHOLD:  // 0.99
      if gap(c,m) not open: openGap(c, m, d)
    else:
      if gap(c,m) open: closeGap(c, m, d)
closeAllOpenGaps(T)
```

**Outcome invariants:**
```
allConsumersServed = (maxGapDays ≤ SUPPLY_GAP_TOLERANCE)  // 30 days
inventory[m] ≥ 0  for all materials m  (never negative)
inventory[m] ≤ DEPOT_CAPACITY_DEFAULT  for all m
gap.durationDays = gap.endDay - gap.startDay  (contiguous gap)
```

---

## Threshold Registry

| Constant | Value | Unit | Valid Range | Sensitivity |
|----------|-------|------|-------------|-------------|
| `TOP_N_CANDIDATES` | 10 | count | 1–100 | Low |
| `SELECTION_OPTIMALITY_TOLERANCE` | 5 | % | 1–20 | N/A (greedy is exact) |
| `EXTRACTION_EFFICIENCY_THRESHOLD` | 80 | % | 50–95 | Medium |
| `AUTONOMY_PERIOD_MIN` | 90 | days | 30–365 | High |
| `DAILY_EFFICIENCY_RANGE_LOW` | 0.85 | fraction | 0.5–0.99 | Medium |
| `DAILY_EFFICIENCY_RANGE_HIGH` | 1.00 | fraction | 0.85–1.0 | Low |
| `FAULT_PROBABILITY` | 0.02 | per-day | 0.001–0.10 | High |
| `ENERGY_PER_KG_EXTRACTION` | 0.5 | kWh/kg | 0.1–2.0 | Medium |
| `METAL_PURITY_MIN` | 0.95 | fraction | 0.90–0.99 | Medium |
| `VOLATILE_PURITY_MIN` | 0.99 | fraction | 0.95–0.999 | High |
| `ENERGY_SURPLUS_MIN` | 1.2 | ratio | 1.0–2.0 | High |
| `SUPPLY_GAP_TOLERANCE` | 30 | days | 7–90 | High |
| `DEPOT_CAPACITY_DEFAULT` | 1,000,000 | kg | 10,000–10,000,000 | Low |
| `SOLAR_ARRAY_POWER` | 150 | kW | 50–500 | Medium |
| `H2_ENERGY_DENSITY` | 33.3 | kWh/kg | 30–39 | Low |
| `BASE_EXTRACTION_RATE_FRACTION` | 0.001 | per-day | 0.0001–0.01 | High |
| `VOLATILE_RATIO_THRESHOLD` | 0.3 | fraction | 0.1–0.5 | Medium |
| `DEMAND_MET_THRESHOLD` | 0.99 | fraction | 0.90–1.0 | Low |

---

## Formal Invariants

1. **Prospecting purity:** `resourcePerDeltaV` is a pure function — same input, same output always.
2. **Extraction determinism:** Same `seed` → identical `ExtractionResult` across all runs.
3. **Extraction bound:** `(bulkOreMass + capturedVolatileMass) / theoreticalMaxMass ≥ 0.80`.
4. **Autonomy:** `daysAutonomous ≥ 90` for any simulation ≥ 90 days — no Earth commands issued.
5. **Yield product:** `cumulativeYield ∈ (0, 1]` — always the product of stage yield fractions.
6. **Processing purity:** Metals ≥ 95%, water/LOX/LH2 ≥ 99% purity.
7. **Energy balance:** `energyBalance ≥ 1.2` for C-type compositions — always net-positive.
8. **Inventory non-negativity:** `inventory[m] ≥ 0` for all materials, all time.
9. **Gap contiguity:** `gap.durationDays = gap.endDay - gap.startDay`.
10. **Consumer service:** `allConsumersServed = true` iff `maxGapDays ≤ 30`.

---

## Cross-Domain Connections

**Upstream (feeds this domain):**
- `0.3 Autonomous Entities` — autonomous agents operate the mining and processing systems.
  The mining simulation's `autonomyLevel: 'fully-autonomous'` requirement is sourced here.

**Downstream (this domain feeds):**
- `0.4.1.1 Space-Based Consciousness Infrastructure` — receives metals and volatiles for
  structural construction and life support.
- `0.4.1.3 Autonomous Space Manufacturing` — receives refined metals as raw material input.
- `0.4.1.4 Self-Replicating Industrial Systems` — receives feedstocks for replication.
- Propellant depots (in-space logistics) — receive LOX/LH2 for propulsion.
