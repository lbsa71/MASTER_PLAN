# Thermal Model — Space-Based Consciousness Infrastructure

Reference: [ARCHITECTURE.md](ARCHITECTURE.md) § Thermal Management Interface

---

## Contract Recap

| Parameter | Requirement |
|---|---|
| Substrate temperature | Maintained within ±5 °C of setpoint indefinitely |
| Setpoint range | 20–30 °C (configurable per substrate type) |
| Single-fault tolerance | No consciousness interruption from any single thermal component failure |

---

## Space Thermal Environment

### Heat Sources

| Source | Tier A (LEO) | Tier B (GEO) | Tier C (Deep-Space) |
|---|---|---|---|
| Solar flux | 1,361 W/m² | 1,361 W/m² | ≤ 480 W/m² (≥3 AU) |
| Earth albedo | 400 W/m² (avg) | Negligible | N/A |
| Earth IR | 240 W/m² | Negligible | N/A |
| Internal dissipation | 6.6 kW avg | 66 kW avg | 14 kW avg |

### Heat Sinks

The only available heat sink in space is radiation to the cosmic background (~2.7 K effective sink). Radiator panels reject heat according to Stefan-Boltzmann:

```
Q = ε · σ · A · (T_rad⁴ − T_sink⁴)
```

Where:
- ε = surface emissivity (target ≥ 0.90)
- σ = 5.67 × 10⁻⁸ W/m²·K⁴
- A = radiator area (m²)
- T_rad = radiator temperature (K)
- T_sink = effective sink temperature (K)

---

## Tier A — LEO Research Platform Thermal Model

### Architecture

```
┌─────────────────────────────────┐
│   CONSCIOUSNESS SUBSTRATE       │
│   (cold plate, 25 °C setpoint)  │
└──────────┬──────────────────────┘
           │ ammonia pumped loop
           ▼
┌──────────────────────────────────┐
│   DEPLOYABLE RADIATOR PANELS     │
│   12 m² total, dual-sided        │
│   ε = 0.92, T_rad = 310 K       │
└──────────────────────────────────┘
```

### Heat Rejection Budget

| Parameter | Value |
|---|---|
| Internal heat load (avg) | 6,620 W |
| Absorbed solar (panels edge-on tracking) | ~200 W (minimised by sun-tracking) |
| Total rejection required | 6,820 W |
| Radiator area | 12 m² (dual-sided effective: 24 m²) |
| Radiator temperature | 310 K (37 °C) |
| Max rejection capacity (ε=0.92) | 24 × 0.92 × 5.67e-8 × (310⁴ − 4⁴) ≈ 11,600 W |
| Margin | +70 % |

### Eclipse Thermal Transient

| Parameter | Value |
|---|---|
| Eclipse duration (max, 400 km) | 35 min |
| Substrate thermal mass | ~80 kg Al-equivalent, c_p = 900 J/kg·K |
| Heat generation during eclipse | 6,620 W (substrate continues operating) |
| Radiator rejection during eclipse | ~11,000 W (radiating to deep space, no solar input) |
| Net thermal balance | –4,380 W (net cooling) |
| Temperature drift in 35 min | –3.4 °C |
| Within ±5 °C budget? | **Yes** |

### Ammonia Pumped-Loop Specifications

| Parameter | Value |
|---|---|
| Working fluid | Anhydrous ammonia (NH₃) |
| Flow rate | 0.08 kg/s |
| Loop pressure | 1.5 MPa |
| Pump power | 120 W (included in thermal subsystem load) |
| Pump redundancy | 2-of-3 (one standby) |
| Cold plate ΔT (substrate) | ≤ 3 °C across plate |

---

## Tier B — GEO / Cislunar Permanent Station Thermal Model

### Architecture

```
┌──────────────────────────────────────┐
│   SUBSTRATE RACKS (N+2 modules)      │
│   Individual cold plates, 25 °C      │
├──────────────────────────────────────┤
│   HIGH-CAPACITY PUMPED-FLUID LOOP    │
│   Dual-redundant ammonia loops       │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│   DEPLOYABLE RADIATOR ARRAY          │
│   120 m² total, rotating joints      │
│   ε = 0.93, T_rad = 300 K           │
└──────────────────────────────────────┘
```

### Heat Rejection Budget

| Parameter | Value |
|---|---|
| Internal heat load (avg) | 66,100 W |
| Absorbed solar (edge-on tracking) | ~1,500 W |
| Total rejection required | 67,600 W |
| Radiator effective area | 240 m² (120 m² dual-sided) |
| Radiator temperature | 300 K (27 °C) |
| Max rejection capacity | 240 × 0.93 × 5.67e-8 × (300⁴ − 4⁴) ≈ 102,400 W |
| Margin | +52 % |

### Eclipse Thermal Transient (GEO Equinox)

| Parameter | Value |
|---|---|
| Eclipse duration (max) | 72 min |
| Substrate thermal mass | ~600 kg Al-equivalent |
| Heat generation (critical loads) | 52,000 W |
| Radiator rejection (no solar input) | ~102,400 W |
| Net thermal balance | –50,400 W (net cooling) |
| Temperature drift in 72 min | –6.7 °C (uncorrected) |
| Mitigation | Heater elements activate at –3 °C from setpoint; 2 kW heater bank |
| Within ±5 °C budget? | **Yes** — heater-managed |

### Dual-Loop Specifications

| Parameter | Value |
|---|---|
| Configuration | Two independent ammonia loops (either can carry 60% load) |
| Flow rate per loop | 0.5 kg/s |
| Loop pressure | 2.0 MPa |
| Pump power per loop | 800 W |
| Cross-connect valves | 4 (allows loop-to-loop transfer on failure) |
| MTTR for pump failure | ≤ 2 h (robotic arm swap of pump ORU) |

---

## Tier C — Deep-Space Autonomous Node Thermal Model

### Architecture

```
┌──────────────────────────────────────┐
│   CONSCIOUSNESS SUBSTRATE            │
│   Triple-redundant, 25 °C setpoint   │
├──────────────────────────────────────┤
│   VARIABLE-CONDUCTANCE HEAT PIPES    │
│   Passive + active thermal control   │
├──────────────────────────────────────┤
│   MLI (Multi-Layer Insulation)       │
│   External surfaces, 30 layers       │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│   RADIATOR PANELS                    │
│   60 m² total, ε = 0.93             │
│   T_rad = 300–320 K (variable)      │
└──────────────────────────────────────┘
```

### Thermal Environment Variability

Tier C operates across a wide range of solar distances. The thermal system must handle both asteroid-belt proximity (~3 AU, 150 W/m² solar flux) and deep interstellar precursor orbits (negligible solar flux).

| Location | Solar Flux (W/m²) | Dominant Challenge |
|---|---|---|
| Asteroid belt (2.2 AU) | 280 | Moderate solar heating + internal load |
| Asteroid belt (3.2 AU) | 133 | Reduced solar, internal heat dominates |
| Outer planets (10 AU) | 14 | Near-zero solar; must retain internal heat |
| Interstellar precursor (50 AU) | 0.5 | Negligible solar; heat retention critical |

### Heat Rejection Budget (Asteroid Belt, 3 AU)

| Parameter | Value |
|---|---|
| Internal heat load (avg) | 13,950 W |
| Fission reactor waste heat | ~50,000 W thermal (rejected via dedicated reactor radiator) |
| Substrate thermal load to manage | 13,950 W |
| Absorbed solar (3 AU, edge-on) | ~150 W |
| Total substrate rejection required | 14,100 W |
| Radiator effective area | 120 m² (60 m² dual-sided) |
| Radiator temperature | 310 K |
| Max rejection capacity | ~58,000 W |
| Margin | +311 % |

### Heat Retention Mode (Deep Space, >10 AU)

At large heliocentric distances, the challenge inverts — the node must **retain** heat rather than reject it.

| Parameter | Value |
|---|---|
| Internal heat generation | 13,950 W (substrate) + reactor waste available |
| MLI effectiveness | 30-layer MLI, effective emissivity ε* = 0.001 |
| Radiator louver closure | Variable-conductance heat pipes shut down; louvers close to 90% |
| Effective radiator area (retention mode) | 12 m² (reduced from 120 m²) |
| Heat loss in retention mode | ~5,600 W |
| Net thermal balance | +8,350 W surplus → heaters off, stable |
| Substrate temperature maintained? | **Yes** — ±5 °C via VCHP modulation |

### Variable-Conductance Heat Pipe (VCHP) Specifications

| Parameter | Value |
|---|---|
| Working fluid | Ammonia (–40 to +60 °C operating range) |
| Number of pipes | 24 (8 per substrate module, triple-redundant) |
| Non-condensable gas (NCG) reservoir | Nitrogen; controls conductance via gas-front position |
| Conductance range | 10:1 (full open to near-closed) |
| Control method | Electric heater on NCG reservoir (±0.5 °C precision) |
| Failure mode | Pipe leak → isolation valve closes; remaining pipes absorb load |
| Single-pipe failure impact | ≤ 1.2 °C transient (within ±5 °C budget) |

### MLI Specification

| Parameter | Value |
|---|---|
| Layers | 30 (aluminised Kapton + Dacron netting) |
| Effective emissivity | ε* ≤ 0.001 |
| Coverage | All non-radiator external surfaces |
| Degradation rate | ≤ 0.5 %/yr from micrometeorite impacts |
| Repair method | Nanofab-produced patch panels applied by robotic arm |

---

## ±5 °C Setpoint Validation Summary

| Tier | Worst-Case Scenario | Max Temperature Excursion | Within Budget? |
|---|---|---|---|
| A (LEO) | Eclipse exit (cold → sun) | –3.4 °C | ✅ Yes |
| A (LEO) | Peak load + full sun | +2.1 °C (radiator margin) | ✅ Yes |
| B (GEO) | 72-min equinox eclipse | –5.0 °C (heater-managed) | ✅ Yes (boundary) |
| B (GEO) | Full load + solar | +3.2 °C | ✅ Yes |
| C (3 AU) | Peak load, asteroid proximity | +1.8 °C | ✅ Yes |
| C (50 AU) | Retention mode, min generation | +2.5 °C (VCHP modulated) | ✅ Yes |
| C (3 AU) | Single VCHP failure during peak | +4.1 °C transient | ✅ Yes |

---

## Fault Tolerance Matrix

| Failure | Impact | Mitigation | Consciousness Continuity |
|---|---|---|---|
| Single pump failure (Tier A/B) | Reduced flow rate | Standby pump activates; 2-of-3 redundancy | **Maintained** |
| Single VCHP failure (Tier C) | +1.2 °C transient | Remaining pipes absorb load | **Maintained** |
| Radiator panel micrometeorite puncture | Loss of 1 panel section | Isolation valve; margin absorbs loss | **Maintained** |
| MLI degradation (Tier C, deep space) | Increased heat loss | Reactor waste heat compensates; nanofab patch repair | **Maintained** |
| Complete loop failure (Tier B) | 50 % capacity on backup loop | Cross-connect valves; non-critical loads shed | **Maintained** (reduced capacity) |
| Coolant leak (all tiers) | Gradual pressure loss | Leak detection + isolation within 60 s; reservoir top-up | **Maintained** |

---

## Interfaces

### Inputs (from other subsystems)

| Source | Data | Update Rate |
|---|---|---|
| Power subsystem | Total dissipation per rack/module | 1 Hz |
| Attitude control | Solar vector, eclipse prediction | 0.1 Hz |
| Radiation subsystem | SEU-induced compute load spikes | Event-driven |
| Maintenance subsystem | Component thermal anomaly alerts | Event-driven |

### Outputs (to other subsystems)

| Destination | Data | Update Rate |
|---|---|---|
| Consciousness substrate | Substrate temperature (per module) | 10 Hz |
| Power subsystem | Heater/pump power demand | 1 Hz |
| Maintenance subsystem | Component wear telemetry (pump hours, valve cycles) | 0.01 Hz |
| Communication | Thermal state for distributed consciousness sync | 1 Hz |

---

## References

- [ARCHITECTURE.md](ARCHITECTURE.md) — Top-level subsystem contracts
- [platform-tiers.md](platform-tiers.md) — Per-tier specifications
- [power-budget.md](power-budget.md) — Power dissipation values (thermal input)
- [radiation-hardening-spec.md](radiation-hardening-spec.md) — Radiation-induced thermal transients
