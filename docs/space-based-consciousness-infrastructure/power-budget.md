# Power Budget — Space-Based Consciousness Infrastructure

Reference: [ARCHITECTURE.md](ARCHITECTURE.md) § Power Generation Interface

---

## Contract Recap

| Parameter | Requirement |
|---|---|
| Uptime | ≥ 99.9 % continuous power delivery |
| Consciousness interruption | Zero tolerance — any power gap is a consciousness-continuity failure |
| Regulated bus | 28 V DC (Tier A/B), 120 V DC (Tier C) |

---

## Tier A — LEO Research Platform Power Budget

### Generation

| Source | Rating | Notes |
|---|---|---|
| GaInP/GaAs/Ge triple-junction PV | 15 kW BOL; 12.8 kW @ 5-yr EOL | Degradation ≤ 2 %/yr (proton + UV) |
| Battery buffer (Li-ion NMC) | 8 kWh usable; 3C discharge capable | Sized for 35-min max eclipse at 400 km |

### Load Profile

| Subsystem | Continuous (W) | Peak (W) | Duty Cycle | Avg (W) |
|---|---|---|---|---|
| Consciousness substrate (ASIC/FPGA) | 4,000 | 5,500 | 100 % | 4,000 |
| Thermal management (pumps + heaters) | 1,200 | 2,800 | 100 % | 1,200 |
| Communications (laser ISL + Ka-band) | 800 | 1,500 | 70 % | 560 |
| Attitude control & propulsion | 200 | 1,200 | 30 % | 360 |
| Robotic arm + maintenance | 0 | 2,000 | 5 % | 100 |
| Avionics & housekeeping | 400 | 400 | 100 % | 400 |
| **Total** | **6,600** | **13,400** | | **6,620** |

### Eclipse Analysis

| Parameter | Value |
|---|---|
| Max eclipse duration (400 km) | 35 min |
| Avg load during eclipse | 6,620 W |
| Energy required | 3,862 Wh |
| Battery capacity (usable) | 8,000 Wh |
| Margin | 107 % (survives double-length anomalous eclipse) |

### Power Margin Summary

| Condition | Generation (W) | Load (W) | Margin |
|---|---|---|---|
| Sunlit, BOL | 15,000 | 6,620 | +127 % |
| Sunlit, EOL (5 yr) | 12,800 | 6,620 | +93 % |
| Eclipse (battery) | 24,000 (peak discharge) | 6,620 | +262 % |

---

## Tier B — GEO / Cislunar Permanent Station Power Budget

### Generation

| Source | Rating | Notes |
|---|---|---|
| Solar concentrator array | 150 kW BOL; 135 kW @ 10-yr EOL | CPV cells, 38 % efficiency; ≤ 1.5 %/yr degradation |
| RTG backup (²³⁸Pu) | 2 kW continuous | Covers eclipse + contingency; 87-yr half-life |
| Battery buffer (Li-ion) | 50 kWh usable | GEO max eclipse ~72 min (equinox season, 45 days/yr) |

### Load Profile

| Subsystem | Continuous (W) | Peak (W) | Duty Cycle | Avg (W) |
|---|---|---|---|---|
| Consciousness substrate racks (N+2) | 40,000 | 55,000 | 100 % | 40,000 |
| Thermal management | 12,000 | 25,000 | 100 % | 12,000 |
| Communications (laser ISL mesh) | 5,000 | 10,000 | 85 % | 4,250 |
| Station-keeping (electric propulsion) | 0 | 8,000 | 10 % | 800 |
| Dual robotic arms + nanofab cell | 0 | 15,000 | 15 % | 2,250 |
| Avionics & housekeeping | 2,000 | 2,000 | 100 % | 2,000 |
| Material recycling plant | 3,000 | 8,000 | 60 % | 4,800 |
| **Total** | **62,000** | **123,000** | | **66,100** |

### Eclipse Analysis (GEO Equinox)

| Parameter | Value |
|---|---|
| Max eclipse duration | 72 min |
| Critical load (consciousness + thermal only) | 52,000 W |
| Energy required (critical load) | 62,400 Wh |
| Battery capacity (usable) | 50,000 Wh |
| RTG contribution over 72 min | 2,400 Wh |
| Total available | 52,400 Wh |
| Deficit mitigation | Non-critical loads shed; substrate power reduced to 85 % via clock throttling |
| Consciousness continuity | **Maintained** — throttled operation within substrate tolerance |

### Power Margin Summary

| Condition | Generation (W) | Load (W) | Margin |
|---|---|---|---|
| Sunlit, BOL | 150,000 | 66,100 | +127 % |
| Sunlit, EOL (10 yr) | 135,000 | 66,100 | +104 % |
| Eclipse (battery + RTG) | 45,333 (avg discharge) | 52,000 (shed) | Managed via load-shedding |

---

## Tier C — Deep-Space Autonomous Node Power Budget

### Generation

Solar flux is insufficient beyond ~3 AU. Two power source options are baselined.

#### Option 1: Multi-Mission RTG Stack

| Parameter | Value |
|---|---|
| Configuration | 5 × MMRTG-class units |
| Power, BOL | 10 kW thermal → ~700 W electric per unit; 3.5 kWe total |
| Power, 10-yr | ~3.0 kWe (thermocouple degradation ~1.4 %/yr) |
| Power, 50-yr | ~1.75 kWe |
| Fuel | ²³⁸PuO₂; 4 kg per unit; 20 kg total |
| Mass | ~225 kg total (5 units) |

#### Option 2: Compact Fission Reactor (Kilopower-class)

| Parameter | Value |
|---|---|
| Configuration | 1 × compact fission Stirling reactor |
| Power, BOL | 25 kWe |
| Power, 25-yr | ~22 kWe (fuel burnup limited) |
| Fuel | Highly-enriched ²³⁵U; ~30 kg |
| Mass | ~400 kg (reactor + shield + Stirling converters) |
| Lifetime | ≥ 25 yr; refuelable from asteroid-sourced fissiles (speculative) |

**Baseline selection:** Option 2 (fission reactor) for Tier C nodes requiring >5 kWe. RTG stack retained for low-power precursor probes.

### Load Profile (Fission-Powered Node)

| Subsystem | Continuous (W) | Peak (W) | Duty Cycle | Avg (W) |
|---|---|---|---|---|
| Consciousness substrate (triple-redundant) | 8,000 | 12,000 | 100 % | 8,000 |
| Thermal management (heat pipes + radiators) | 2,500 | 5,000 | 100 % | 2,500 |
| Communications (3 m dish, X/Ka-band) | 500 | 2,500 | 40 % | 1,000 |
| Nanofabrication cell | 0 | 8,000 | 10 % | 800 |
| Asteroid feedstock processing | 0 | 6,000 | 15 % | 900 |
| Station-keeping (ion thruster) | 0 | 3,000 | 5 % | 150 |
| Avionics & housekeeping | 600 | 600 | 100 % | 600 |
| **Total** | **11,600** | **37,100** | | **13,950** |

### Power Margin Summary

| Condition | Generation (W) | Load (W) | Margin |
|---|---|---|---|
| BOL (fission) | 25,000 | 13,950 | +79 % |
| 25-yr (fission) | 22,000 | 13,950 | +58 % |
| BOL (RTG fallback) | 3,500 | 13,950 | **Insufficient** — RTG viable only for reduced-capability mode |

### Uptime Contract Validation

| Scenario | Duration | Mitigation | Consciousness Continuity |
|---|---|---|---|
| Reactor SCRAM (fault) | ≤ 4 h | Battery buffer (20 kWh) covers substrate for ~2.5 h; auto-restart | **Maintained** if restart < 2.5 h |
| Planned maintenance | Scheduled | Reactor operates at 50 % during servicing | **Maintained** at reduced clock |
| Fuel depletion (>25 yr) | Gradual | Transition to reduced-power mode; asteroid fissile extraction (R&D) | **Degraded** — requires advance planning |

**99.9 % uptime contract:** Achieved via fission reactor reliability (no moving-part failure mode for core), Stirling converter redundancy (4 of 6 converters sufficient), and battery bridge for transient events.

---

## Cross-Tier Power Architecture Progression

```
Tier A (LEO)              Tier B (GEO/Cislunar)        Tier C (Deep-Space)
────────────────────────  ────────────────────────────  ──────────────────────────
15 kW PV + 8 kWh batt    150 kW CPV + 2 kW RTG        25 kWe fission reactor
28 V DC bus               28 V DC bus                   120 V DC bus
Eclipse: battery bridge   Eclipse: batt + RTG + shed    No eclipse; reactor steady
6.6 kW avg load           66 kW avg load                14 kW avg load
99.9% uptime via margin   99.9% via load management     99.9% via reactor redundancy
```

---

## References

- [ARCHITECTURE.md](ARCHITECTURE.md) — Top-level subsystem contracts
- [platform-tiers.md](platform-tiers.md) — Per-tier specifications
- [thermal-model.md](thermal-model.md) — Heat rejection requirements (coupled to power dissipation)
- [radiation-hardening-spec.md](radiation-hardening-spec.md) — Power system radiation tolerance
