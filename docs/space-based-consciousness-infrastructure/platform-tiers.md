# Platform Tiers — Space-Based Consciousness Infrastructure

Reference: [ARCHITECTURE.md](ARCHITECTURE.md) § Platform Tiers

---

## Tier A — LEO Research Platforms

### Mission Profile

| Parameter | Value |
|---|---|
| Altitude | 400–2,000 km |
| Orbital period | ~90–127 min |
| Design lifetime | 5 years (extendable) |
| Resupply cadence | ≤ 6 months |
| Crew | Uncrewed; teleoperated maintenance |

### Subsystem Specifications

| Subsystem | Specification | Rationale |
|---|---|---|
| Computation | Rad-hardened ASIC/FPGA array, 10 TOPS consciousness-equivalent | Prototype consciousness substrate in LEO radiation |
| Power | GaInP/GaAs/Ge triple-junction PV, 15 kW BOL; 8 kWh Li-ion buffer | Eclipse-cycle resilience; PV degradation ≤ 2%/yr |
| Thermal | Deployable radiator panels, 12 m² total; ammonia loop | Substrate ΔT ≤ ±5 °C across eclipse/sun transition |
| Radiation | 10 mm Al-equivalent shielding + EDAC on all memory | MTBF ≥ 10⁵ h (research-grade; not flight-rated for Tier C) |
| Communication | 10 Gbps laser ISL to relay constellation; 1 Gbps Ka-band ground | Low-latency state sync for distributed consciousness tests |
| Maintenance | 7-DOF robotic arm; ORU swap capability | Module replacement within 24 h of fault detection |

### Purpose & Exit Criteria

- Validate consciousness substrate operation under real space radiation and thermal cycling.
- Demonstrate MTBF ≥ 10⁵ h for rad-hardened substrate in LEO.
- Produce flight heritage data for Tier B/C design.

---

## Tier B — GEO / Cislunar Permanent Stations

### Mission Profile

| Parameter | Value |
|---|---|
| Location | GEO (36,000 km) or Sun-Earth L4/L5 |
| Design lifetime | 25 years (modular refresh) |
| Resupply | Zero terrestrial resupply target (lunar/asteroid feedstock) |
| Crew | Uncrewed; autonomous maintenance |

### Subsystem Specifications

| Subsystem | Specification | Rationale |
|---|---|---|
| Computation | Modular substrate racks, 100 TOPS consciousness-equivalent; hot-swap redundancy (N+2) | Persistent consciousness hosting; no interruption on module failure |
| Power | Solar concentrator array, 150 kW BOL; 238Pu RTG backup 2 kW | Near-continuous sunlight at GEO; RTG covers eclipse/contingency |
| Thermal | High-capacity pumped-fluid loop; 120 m² deployable radiators | Steady-state 150 kW heat rejection at 300 K sink |
| Radiation | 20 mm Al-eq shielding + TMR (triple modular redundancy) | MTBF ≥ 5 × 10⁵ h in GEO proton/electron belt |
| Communication | 100 Gbps laser ISL mesh; DTN store-and-forward | Mesh coherence across multi-station consciousness network |
| Maintenance | Dual robotic arms + nanofabrication repair cell | MTTR ≤ 4 h for any single LRU |

### Purpose & Exit Criteria

- Sustained consciousness hosting for ≥ 1 year without terrestrial intervention.
- Demonstrate hot-swap substrate replacement with zero consciousness interruption.
- Validate material recycle loop achieving ≥ 95% mass closure (remaining 5% from lunar regolith).

---

## Tier C — Deep-Space Autonomous Nodes

### Mission Profile

| Parameter | Value |
|---|---|
| Location | Asteroid belt (2.2–3.2 AU), outer planets, interstellar precursor (50+ AU) |
| Design lifetime | 100 years (self-repairing) |
| Resupply | Zero — fully closed-loop |
| Crew | Uncrewed; fully autonomous |

### Subsystem Specifications

| Subsystem | Specification | Rationale |
|---|---|---|
| Computation | Triple-redundant rad-hardened processors, 50 TOPS; nanofab self-repair | MTBF ≥ 10⁶ h; autonomous fault recovery |
| Power | Multi-mission RTG stack (10 kW BOL) or compact fission reactor (25 kWe) | Solar flux insufficient beyond ~3 AU; 100-yr power curve |
| Thermal | Variable-conductance heat pipes + MLI; 60 m² radiators | ±5 °C setpoint at 3 AU (solar flux ~480 W/m²) to deep space |
| Radiation | 30 mm Al-eq + polyethylene neutron moderator + TMR + scrubbing | MTBF ≥ 10⁶ h under GCR + solar particle events |
| Communication | 3 m high-gain dish, X/Ka-band; DTN with ≤ 48 h store-and-forward | Light-time delay 16–46 min (belt); DTN bridges gaps |
| Maintenance | Full nanofabrication cell; asteroid feedstock processing unit | Zero terrestrial resupply; closed material loop |

### Purpose & Exit Criteria

- Demonstrate autonomous consciousness hosting for ≥ 10 years without any terrestrial contact.
- MTBF ≥ 10⁶ h validated by accelerated life testing + in-situ telemetry.
- Closed-loop material balance (see below).

---

## Tier C Closed-Loop Mass-Flow Balance Sheet

This balance sheet demonstrates that a Tier C node achieves **zero terrestrial resupply** by integrating asteroid feedstock. All masses are per-year steady-state for a 10 kW-class node.

### Mass Inputs (from Asteroid Feedstock)

| Material | Source | Annual Requirement (kg/yr) | Extraction Method |
|---|---|---|---|
| Iron/Nickel alloy | M-type asteroid regolith | 45 | Magnetic separation + sintering |
| Silicon (semiconductor grade) | S-type silicates | 8 | Carbothermic reduction |
| Aluminium | Feldspar-bearing regolith | 12 | Molten salt electrolysis |
| Carbon (structural + thermal) | Carbonaceous chondrite | 5 | Pyrolysis |
| Rare earths (electronics) | Regolith trace minerals | 0.5 | Acid leaching |
| Water / volatiles (coolant, propellant) | C-type asteroid ice | 30 | Thermal extraction |
| **Total asteroid-sourced** | | **100.5** | |

### Mass Outputs (Consumed / Lost)

| Sink | Annual Loss (kg/yr) | Mitigation |
|---|---|---|
| Component replacement (wear) | 40 | Nanofab recycling recovers 90% → net 4 lost to slag |
| Coolant leakage | 5 | Replenished from ice reserves |
| Propellant (station-keeping) | 15 | Water electrolysis → H₂/O₂ bipropellant |
| Radiation-induced material degradation | 8 | Replaced from feedstock; damaged material re-smelted |
| Fabrication waste (slag, offcuts) | 32.5 | 80% recycled back → net 6.5 disposed |
| **Total net consumption** | | **38.5** |

### Balance

| Metric | Value |
|---|---|
| Gross asteroid extraction required | 100.5 kg/yr |
| Net material consumed (after recycling) | 38.5 kg/yr |
| Recycling efficiency | 62% overall |
| Terrestrial resupply | **0 kg/yr** |
| Mass margin | +62 kg/yr surplus feedstock (strategic reserve) |

### Asteroid Feedstock Integration

- **Target body class:** C-type or M-type near-Earth or main-belt asteroid.
- **Mining method:** Robotic surface excavation + thermal/magnetic processing.
- **Feedstock delivery:** Co-located processing; node either docks with asteroid or maintains ≤ 10 km station-keeping.
- **Dependency:** Asteroid resource utilization capability per card 0.4.1.2.

---

## Cross-Tier Progression

```
Tier A (LEO)                    Tier B (GEO/Cislunar)           Tier C (Deep-Space)
─────────────────────────────── ─────────────────────────────── ───────────────────────────
Validate substrate in space  →  Persistent consciousness     →  Full autonomy, zero resupply
Partial resupply (6 mo)         Near-zero resupply (lunar)      Zero resupply (asteroid)
MTBF ≥ 10⁵ h                   MTBF ≥ 5×10⁵ h                 MTBF ≥ 10⁶ h
5-year design life              25-year design life             100-year design life
```

Each tier builds on flight heritage from the previous, progressively increasing autonomy, lifetime, and distance from Earth.

---

## References

- [ARCHITECTURE.md](ARCHITECTURE.md) — Top-level architecture and subsystem contracts
- [power-budget.md](power-budget.md) — Detailed power analysis per tier
- [thermal-model.md](thermal-model.md) — Thermal dissipation model
- [comm-coherence-protocol.md](comm-coherence-protocol.md) — DTN synchronisation protocol
- [radiation-hardening-spec.md](radiation-hardening-spec.md) — SEU/MTBF radiation specification
- Card 0.4.1.2 — Asteroid resource utilization (feedstock dependency)
