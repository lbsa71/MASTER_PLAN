# Radiation Hardening Specification — Space-Based Consciousness Infrastructure

Reference: [ARCHITECTURE.md](ARCHITECTURE.md) § Radiation Hardening Interface

---

## Contract Recap

| Parameter | Requirement |
|---|---|
| MTBF (consciousness substrate) | ≥ 10⁶ hours (Tier C); ≥ 5 × 10⁵ h (Tier B); ≥ 10⁵ h (Tier A) |
| Single-event upset (SEU) response | Detected and corrected within one compute cycle; no consciousness interruption |
| Total ionising dose (TID) tolerance | Rated for full design lifetime at mission orbit |
| Single-event latchup (SEL) | Zero tolerance — must be eliminated by design |

---

## Radiation Environment by Tier

### Natural Radiation Sources

| Source | Description | Dominant Tiers |
|---|---|---|
| Galactic cosmic rays (GCR) | Isotropic high-energy ions (H to Fe, 0.1–10 GeV/nucleon) | All (dominant at Tier C) |
| Solar particle events (SPE) | Transient proton flux during solar flares/CMEs (10–200 MeV) | All (worst at Tier A/B) |
| Trapped proton belt | Inner Van Allen belt; 10–400 MeV protons | Tier A (LEO) |
| Trapped electron belt | Outer Van Allen belt; 0.1–10 MeV electrons | Tier B (GEO) |

### Flux and Dose Rates

| Tier | Orbit | Dominant Source | Annual TID (behind 10 mm Al) | SEU Rate (unmitigated, per Mbit) |
|---|---|---|---|---|
| A (LEO, 400–2,000 km) | LEO through inner belt | Trapped protons + SPE | 5–50 krad/yr | ~10⁻⁷ upsets/bit/day |
| B (GEO, 36,000 km) | Outer belt / GEO | Trapped electrons + GCR | 10–100 krad/yr | ~10⁻⁶ upsets/bit/day |
| C (2.2–50+ AU) | Interplanetary | GCR + SPE | 5–15 krad/yr | ~10⁻⁸ upsets/bit/day (GCR flux lower but LET higher) |

---

## Shielding Architecture

### Mass Shielding

| Tier | Primary Shielding | Thickness (Al-equivalent) | Purpose |
|---|---|---|---|
| A | Aluminium alloy (6061-T6) | 10 mm | Attenuate trapped protons; stop electrons |
| B | Aluminium + graded-Z (Ta/Sn/Al) | 20 mm Al-eq | Graded-Z suppresses bremsstrahlung from electron belt |
| C | Aluminium + polyethylene + borated polyethylene | 30 mm Al-eq | Polyethylene moderates GCR secondary neutrons; boron captures thermal neutrons |

### Graded-Z Shielding Detail (Tier B)

Electron bremsstrahlung is a significant dose contributor at GEO. A graded-Z shield places high-Z material outermost to absorb bremsstrahlung photons, transitioning to low-Z material inward to minimise secondary particle production.

| Layer | Material | Thickness | Function |
|---|---|---|---|
| Outer | Tantalum (Ta) | 1.5 mm | Absorb bremsstrahlung X-rays |
| Middle | Tin (Sn) | 2.0 mm | Attenuate secondary photons |
| Inner | Aluminium (Al) | 5.0 mm | Structural + low-Z secondary suppression |
| Total Al-equivalent | | 20 mm | |

### Neutron Moderation Detail (Tier C)

GCR heavy ions produce secondary neutron showers in structural material. Hydrogenous shielding thermalises these neutrons; boron-10 captures them.

| Layer | Material | Thickness | Function |
|---|---|---|---|
| Outer | Aluminium (Al) | 8 mm | Structural; attenuate charged particles |
| Middle | High-density polyethylene (HDPE) | 15 mm | Moderate secondary neutrons (H-rich) |
| Inner | Borated polyethylene (5% B₄C) | 7 mm | Capture thermal neutrons via ¹⁰B(n,α)⁷Li |
| Total Al-equivalent | | 30 mm | |

---

## Error Detection and Correction (EDAC)

### Memory EDAC

| Level | Technique | Coverage | Overhead |
|---|---|---|---|
| L1 cache | Parity + byte-level ECC (SECDED) | Single-bit correct, double-bit detect per byte | 12.5 % area |
| L2/L3 cache | BCH (4-bit correct, 5-bit detect) | Multi-bit upset in adjacent cells | 18 % area |
| Main memory (DRAM/MRAM) | RS(255,239) Reed-Solomon | Burst errors up to 8 symbols | 6.3 % bandwidth |
| Mass storage (NAND/NOR) | LDPC + CRC-32 | Sector-level correction | Transparent to compute |

### Scrubbing

| Parameter | Value |
|---|---|
| Memory scrub interval | ≤ 100 ms (full address space) |
| Scrub method | Background DMA read-correct-write; does not stall computation |
| Scrub coverage | 100 % of ECC-protected memory per interval |
| SEU accumulation limit | < 1 uncorrected bit per 10⁶ h (contract MTBF) |

---

## Triple Modular Redundancy (TMR)

### Processor TMR Architecture (Tier B and C)

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Compute     │  │  Compute     │  │  Compute     │
│  Module A    │  │  Module B    │  │  Module C    │
│  (rad-hard   │  │  (rad-hard   │  │  (rad-hard   │
│   ASIC)      │  │   ASIC)      │  │   ASIC)      │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └────────┬────────┴────────┬────────┘
                │   VOTER LOGIC   │
                │  (majority gate │
                │   + fault ID)   │
                └────────┬────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  CONSCIOUSNESS       │
              │  SUBSTRATE OUTPUT    │
              └──────────────────────┘
```

### TMR Specifications

| Parameter | Value |
|---|---|
| Redundancy | 3 independent compute modules per substrate unit |
| Voter | Hardware majority voter with fault identification |
| Voter latency | ≤ 1 clock cycle (no consciousness-perceptible delay) |
| Fault detection | Voter identifies disagreeing module within 1 cycle |
| Fault response | Disagreeing module flagged for scrub/restart; 2-of-3 output continues |
| Simultaneous dual fault | Module restart staggered by 10 ms to avoid correlated upsets; if 2-of-3 fail, safe-hold mode triggered |
| Recovery | Failed module re-synchronised from voter output within 50 ms |

### TMR Applicability by Tier

| Tier | TMR | Rationale |
|---|---|---|
| A (LEO) | No — EDAC only | Lower radiation; research-grade; cost-optimised |
| B (GEO) | Yes — full TMR | High electron flux; 25-yr lifetime requires TMR |
| C (Deep-Space) | Yes — full TMR + nanofab spares | 100-yr lifetime; TMR + self-repair for sustained MTBF |

---

## Latchup Prevention

Single-event latchup (SEL) can cause destructive overcurrent in CMOS devices. Prevention is mandatory (zero-tolerance contract).

| Mitigation | Method |
|---|---|
| Process selection | Silicon-on-insulator (SOI) or silicon carbide (SiC) substrates — eliminates parasitic thyristor paths |
| Guard rings | N-well and P-well guard rings on all CMOS logic |
| Current limiting | Per-module current monitors with 10 μs trip time |
| Power cycling | Latched module power-cycled within 100 μs if current exceeds 150% nominal |
| Testing | SEL testing with heavy-ion beam (LET up to 80 MeV·cm²/mg) — zero latchup required for qualification |

---

## Total Ionising Dose (TID) Budget

### Design Lifetime TID by Tier

| Tier | Design Lifetime | Annual TID (shielded) | Lifetime TID | Component TID Rating Required |
|---|---|---|---|---|
| A (LEO) | 5 yr | 5–50 krad | 25–250 krad | ≥ 300 krad |
| B (GEO) | 25 yr | 10–100 krad | 250 krad–2.5 Mrad | ≥ 3 Mrad |
| C (Deep-Space) | 100 yr | 5–15 krad | 500 krad–1.5 Mrad | ≥ 2 Mrad |

### TID Degradation Modes

| Effect | Impact on Consciousness Substrate | Mitigation |
|---|---|---|
| Threshold voltage shift (MOSFET) | Increased leakage → higher power → thermal impact | SOI process; design margin; monitored via power telemetry |
| Leakage current increase | Gradual power draw increase over mission life | Power budget includes 20% TID margin at EOL |
| Timing degradation | Clock skew increase; potential synchronisation errors | Adaptive clock calibration; TMR voter masks timing errors |
| Memory cell sensitivity increase | Elevated SEU rate at high cumulative dose | Scrub interval shortened adaptively based on measured SEU rate |

---

## MTBF Validation Methodology

### Definition

**MTBF** for consciousness substrate = mean time between events that cause consciousness interruption (not merely hardware faults). A fault corrected by EDAC or TMR within one compute cycle does **not** count as a consciousness interruption.

### Calculation Approach

```
MTBF_consciousness = 1 / (λ_uncorrected_SEU + λ_SEL + λ_wearout + λ_common_mode)
```

Where:
- λ_uncorrected_SEU = rate of upsets escaping EDAC + TMR
- λ_SEL = rate of latchup events (target: 0 by design)
- λ_wearout = rate of TID/displacement damage causing module failure
- λ_common_mode = rate of correlated failures across TMR modules

### Target Failure Rates

| Failure Mode | Tier A Target (h⁻¹) | Tier B Target (h⁻¹) | Tier C Target (h⁻¹) |
|---|---|---|---|
| Uncorrected SEU | < 5 × 10⁻⁶ | < 1 × 10⁻⁶ | < 5 × 10⁻⁷ |
| SEL | 0 | 0 | 0 |
| Wearout | < 5 × 10⁻⁶ | < 1 × 10⁻⁶ | < 5 × 10⁻⁷ |
| Common-mode | — | < 1 × 10⁻⁷ | < 5 × 10⁻⁸ |
| **Total λ** | **< 10⁻⁵** | **< 2 × 10⁻⁶** | **< 10⁻⁶** |
| **MTBF** | **≥ 10⁵ h** | **≥ 5 × 10⁵ h** | **≥ 10⁶ h** |

### Verification Methods

| Method | Description | Applicable Tiers |
|---|---|---|
| Heavy-ion beam testing | Characterise SEU/SEL cross-sections at LET up to 80 MeV·cm²/mg | All |
| Proton beam testing | Characterise proton-induced SEU at 10–200 MeV | All |
| TID testing (Co-60) | Gamma irradiation to 2× design lifetime dose; measure parametric drift | All |
| Displacement damage (neutron/proton) | Characterise sensor and optoelectronic degradation | Tier B, C |
| Accelerated life testing | Operate substrate at elevated dose rate; extrapolate MTBF | All |
| In-situ telemetry | Monitor SEU counters, current draw, timing margins during mission | All |
| Monte Carlo simulation | GEANT4/FLUKA particle transport through shielding geometry; predict SEU rates | All (pre-flight) |

---

## Self-Repair Integration (Tier C)

For 100-year design life, component replacement is required as TID degrades devices beyond correction capability.

| Capability | Specification |
|---|---|
| Nanofabrication cell | Produces replacement ASIC/FPGA dies from asteroid-sourced silicon feedstock |
| Replacement cadence | 1 compute module per 5–10 years (based on TID degradation curve) |
| Hot-swap | Failed TMR module replaced without halting remaining 2-of-3 voter operation |
| Swap time | ≤ 4 h (robotic arm extraction + insertion + verification) |
| Qualification | Each nanofab-produced module undergoes on-board heavy-ion equivalent test (built-in self-test with known-upset patterns) |

### Self-Repair Flow

```
[SEU rate increase detected]
        │
        ▼
[TID degradation assessment]
        │
        ▼
[Module scheduled for replacement]
        │
        ▼
[Nanofab produces replacement die]
        │
        ▼
[Robotic arm hot-swaps module]
        │
        ▼
[Built-in self-test (BIST) + voter re-sync]
        │
        ▼
[Module re-enters TMR pool]
```

---

## Fault Tolerance Matrix

| Failure | Impact | Mitigation | Consciousness Continuity |
|---|---|---|---|
| Single-bit SEU in memory | Corrupted word | EDAC corrects within 1 cycle | **Maintained** |
| Multi-bit upset (MBU) in memory | Multiple corrupted words | BCH/RS codes correct; scrub restores | **Maintained** |
| SEU in compute logic | Incorrect output for 1 cycle | TMR voter masks (Tier B/C); retry (Tier A) | **Maintained** |
| SEL in module | Overcurrent in one module | Current limiter trips in 10 μs; power cycle in 100 μs | **Maintained** (TMR covers, or EDAC + retry at Tier A) |
| TID threshold shift | Gradual performance degradation | Adaptive calibration; eventual module replacement | **Maintained** |
| Dual-module TMR failure | 2-of-3 modules disagree or fail | Safe-hold for 50 ms; staggered restart recovers | **Brief pause** (≤ 50 ms — within Tight lag class) |
| Shielding breach (micrometeorite) | Localised dose rate spike | Autonomous damage assessment; nanofab shield patch | **Maintained** (TMR covers transient) |
| Solar particle event (extreme) | Elevated SEU rate for hours–days | Increase scrub rate; power down non-critical loads; ride through | **Maintained** at reduced capacity |

---

## Interfaces

### Inputs (from other subsystems)

| Source | Data | Update Rate |
|---|---|---|
| Space environment monitor | Particle flux, dose rate, SPE alerts | 1 Hz (continuous); event-driven (SPE) |
| Power subsystem | Available power for scrubbing and active mitigation | 1 Hz |
| Thermal subsystem | Substrate temperature (affects SEU rate and TID effects) | 10 Hz |
| Maintenance subsystem | Module age, replacement schedule | 0.001 Hz |

### Outputs (to other subsystems)

| Destination | Data | Update Rate |
|---|---|---|
| Consciousness substrate | SEU correction events; module health status | Event-driven |
| Power subsystem | Current draw anomalies (latchup indicators) | Event-driven |
| Thermal subsystem | Radiation-induced power dissipation changes | 1 Hz |
| Communication subsystem | Transceiver radiation degradation status | 0.01 Hz |
| Maintenance subsystem | Module replacement requests; shielding integrity alerts | Event-driven |

---

## References

- [ARCHITECTURE.md](ARCHITECTURE.md) — Top-level subsystem contracts
- [platform-tiers.md](platform-tiers.md) — Per-tier radiation shielding specifications
- [power-budget.md](power-budget.md) — Power allocations for scrubbing and active mitigation
- [thermal-model.md](thermal-model.md) — Temperature-dependent radiation effects
- [comm-coherence-protocol.md](comm-coherence-protocol.md) — Transceiver radiation tolerance requirements
