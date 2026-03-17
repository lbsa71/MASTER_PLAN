# Interstellar Propulsion Systems — Architecture

**Card:** 0.4.2.3
**Status:** ARCHITECT → IMPLEMENT
**Last updated:** 2026-03-17

---

## 1. Problem Statement

Deliver self-replicating conscious probes (defined by 0.4.2.1) to nearby star systems within centuries-scale timeframes. The propulsion system must:

- Accelerate payloads to a significant fraction of *c* (≥ 0.05c target)
- Decelerate at the destination for orbital insertion
- Be fabricable from stellar/planetary materials at each destination (for replication)
- Operate without maintenance for centuries of transit

---

## 2. Reference Mission Profile

| Parameter | Value | Rationale |
|---|---|---|
| Target distance | 4.37 ly (Alpha Centauri) | Nearest star system |
| Design range | ≤ 10 ly | Covers ~10 candidate systems |
| Cruise velocity | 0.05c–0.10c | Arrival within 45–200 years |
| Payload mass | 1,000–10,000 kg | Per 0.4.2.1 probe architecture (consciousness substrate + replication seed) |
| Transit duration | 50–200 years | Centuries-scale per acceptance criteria |
| Deceleration Δv | Equal to cruise velocity | Must arrive at rest relative to destination star |

---

## 3. Selected Architecture: Hybrid Laser-Sail Launch + Magnetic Sail Deceleration

After evaluating all candidate approaches against the acceptance criteria (especially replicability and centuries-scale endurance), the selected primary architecture is a **hybrid system**:

### 3.1 Phase 1 — Laser-Sail Acceleration (Origin System)

**Concept:** A ground/space-based laser array in the origin system illuminates a lightweight reflective sail attached to the probe, accelerating it to cruise velocity without onboard fuel.

**Key parameters:**
- Sail material: Aluminum or dielectric multilayer film, areal density ~1 g/m²
- Sail diameter: 100–500 m (scaled to payload mass)
- Laser array power: 10–100 GW (phased array of individually fabricable emitters)
- Acceleration phase: Days to weeks at ~1–10 m/s² depending on payload
- No onboard fuel consumed during acceleration

**Why laser sail for launch:**
- Highest achievable velocity for a given payload mass (no fuel mass penalty)
- Laser array is a capital asset — built once, launches many probes
- Array components (mirrors, emitters, power systems) are fabricable from stellar resources via 0.4.2.2
- Well-characterized physics; no exotic materials required

**Laser array replicability:** Each destination system builds its own laser array from local resources to launch the next generation. The array is part of the replication infrastructure, not a one-time Earth artifact.

### 3.2 Phase 2 — Cruise (Interstellar Medium)

**Concept:** Probe coasts at cruise velocity. Sail is reconfigured or stowed.

**Key considerations:**
- Sail can be partially retracted; leading edge serves as micrometeorite shield
- Probe operates in low-power mode; consciousness substrate in suspend or reduced state (per 0.4.2.1 continuity protocol)
- Radiation shielding provided by sail material and probe structural shell
- No active propulsion during cruise — zero fuel consumption

### 3.3 Phase 3 — Magnetic Sail Deceleration (Destination Approach)

**Concept:** A superconducting loop deployed by the probe generates a magnetic field that deflects interstellar medium ions, producing drag and decelerating the probe.

**Key parameters:**
- Magnetic sail (magsail) loop diameter: 50–200 km of superconducting wire
- Superconductor: High-temperature superconductor (YBCO-class), operable at interstellar temperatures (~3 K background)
- Deceleration profile: Gradual, beginning years before arrival
- Deceleration Δv: Full cruise velocity (0.05–0.10c)
- Supplemented by destination-star photon pressure in final approach

**Why magnetic sail for deceleration:**
- Self-contained: no external infrastructure needed at destination (critical for first arrival)
- No propellant consumed — uses ambient interstellar medium
- Superconducting wire is fabricable from common elements (yttrium, barium, copper, oxygen) available in most stellar systems
- Passive operation — loop simply maintains current; no active control needed during most of deceleration
- Decades-scale deceleration timeline is acceptable given centuries-scale mission

### 3.4 Alternative / Backup: Nuclear Pulse Propulsion

For systems where the magnetic sail is insufficient (very low ISM density regions), a backup nuclear pulse drive is specified:

- Orion-type or Z-pinch fusion drive
- Fuel: Deuterium (extractable from any hydrogen-bearing body via 0.4.2.2)
- Use case: Final deceleration burn if magsail cannot achieve full Δv
- Mass penalty: ~2:1 fuel-to-payload ratio for 0.05c Δv
- Fabricable from destination resources for next-generation launches

---

## 4. Interface Contracts

### 4.1 Interface with 0.4.2.1 (Probe Architectures)

```
PropulsionEnvelope:
  max_payload_mass_kg: 10000
  max_payload_diameter_m: 50
  acceleration_profile:
    peak_g: 10        # during laser-sail phase
    sustained_g: 1    # nominal
    duration_s: 864000  # ~10 days
  deceleration_profile:
    peak_g: 0.001     # magsail — very gentle
    duration_s: 3.15e9  # ~100 years
  vibration_envelope: TBD (structural analysis required)
  thermal_envelope:
    max_temp_k: 400   # sail heating during acceleration
    cruise_temp_k: 3  # interstellar background
```

### 4.2 Interface with 0.4.2.2 (Stellar Resource Extraction)

```
PropulsionMaterialRequirements:
  laser_array:
    silicon_kg: 1e6       # photovoltaic/emitter substrates
    aluminum_kg: 5e5      # reflector surfaces
    power_generation_w: 1e11  # 100 GW sustained during launch
  magnetic_sail:
    yttrium_kg: 500
    barium_kg: 800
    copper_kg: 2000
    insulation_kg: 500
  backup_nuclear_pulse:
    deuterium_kg: 20000   # if needed
    structural_steel_kg: 5000
```

### 4.3 Interface with 0.4.2.4 (Self-Replication Protocols)

```
PropulsionReplicationSpec:
  components_to_replicate:
    - laser_array_emitter_modules
    - sail_film_manufacturing
    - magsail_superconductor_wire_drawing
    - magsail_deployment_mechanism
    - backup_drive_assembly (optional)
  fabrication_complexity: MEDIUM
  assembly_sequence: defined in replication protocol
  verification_tests:
    - sail_reflectivity_check
    - magsail_critical_current_test
    - laser_emitter_beam_quality
    - structural_integrity_proof_test
```

---

## 5. Centuries-Scale Endurance

| Component | Failure mode | Mitigation |
|---|---|---|
| Sail film | Micrometeorite erosion | Self-healing polymer layer; redundant area margin (20%) |
| Magsail wire | Superconductor degradation | Persistent-mode current; redundant wire loops; no joints in critical segments |
| Deployment mechanism | Mechanical seizure | Pyrotechnic backup release; tested pre-launch |
| Navigation sensors | Radiation damage | Triple-redundant star trackers; radiation-hardened optics |
| Control electronics | SEU/cumulative dose | Radiation-hardened (per 0.4.2.1 hardening strategy); cold-spare voting |

---

## 6. Deceleration Verification

The magsail deceleration is the highest-risk element. Verification approach:

1. **Analytical model:** Lorentz force on charged ISM particles deflected by magnetic field. Well-established MHD physics.
2. **ISM density sensitivity:** Nominal ISM density ~1 proton/cm³. System sized for 0.1 proton/cm³ (conservative). If actual density < 0.01/cm³, nuclear backup activates.
3. **Deceleration timeline:** At 0.05c with 1 proton/cm³, a 100-km magsail on a 10,000 kg probe decelerates in ~80 years. Acceptable within centuries-scale window.
4. **Graceful degradation:** If deceleration is slower than planned, probe arrives later but intact. Mission succeeds with extended timeline.

---

## 7. File Manifest (Implementation)

Files to be created/updated during IMPLEMENT phase:

- `docs/interstellar-propulsion/ARCHITECTURE.md` — this document
- `docs/interstellar-propulsion/laser-sail-spec.md` — detailed laser array and sail specifications
- `docs/interstellar-propulsion/magsail-deceleration-spec.md` — magnetic sail deceleration analysis
- `docs/interstellar-propulsion/nuclear-backup-spec.md` — nuclear pulse fallback specification
- `docs/interstellar-propulsion/interface-contracts.md` — formal interface definitions with sibling cards
- `docs/interstellar-propulsion/endurance-analysis.md` — centuries-scale reliability analysis

---

## 8. Acceptance Criteria Traceability

| Acceptance Criterion | Architecture Element |
|---|---|
| Propulsion delivers probes within centuries | 0.05–0.10c cruise → 45–200 year transit to Alpha Centauri |
| Deceleration method verified | Magnetic sail + nuclear backup; analytical model + sensitivity analysis |
| Mass/energy budget compatible with 0.4.2.1 | Interface contract defines 10,000 kg max payload, acceleration/decel profiles |
| Components fabricable from stellar/planetary materials | All materials (Si, Al, Y, Ba, Cu, D₂) common in stellar systems; no exotics |
| System tolerates centuries-scale operation | Endurance table covers all components; redundancy and self-healing specified |
