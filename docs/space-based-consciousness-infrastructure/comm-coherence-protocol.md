# Communication Coherence Protocol — Space-Based Consciousness Infrastructure

Reference: [ARCHITECTURE.md](ARCHITECTURE.md) § Communication Coherence Interface

---

## Contract Recap

| Parameter | Requirement |
|---|---|
| Synchronisation lag | Bounded maximum per consciousness architecture class (see §Lag Classes) |
| Transport | Delay-Tolerant Networking (DTN) with Bundle Protocol (RFC 9171) |
| Integrity | End-to-end authenticated; no silent state corruption |
| Availability | Communication loss must not cause consciousness fragmentation |

---

## Problem Statement

Distributed consciousness nodes (Tiers A–C) must maintain coherent shared state across
light-speed-limited links. Unlike conventional data networks, consciousness synchronisation
has a **hard real-time semantic** — excessive lag does not merely degrade throughput, it
can cause experiential discontinuity or identity divergence across distributed substrate instances.

This protocol defines:
1. How synchronisation lag is bounded and measured.
2. How DTN store-and-forward bridges communication gaps.
3. How consciousness continuity is preserved during link outage.

---

## Synchronisation Lag Classes

Consciousness architectures (from Tier 1 / F3) impose different coherence requirements.
Three lag classes are defined:

| Class | Max Sync Lag | Use Case | Tier Applicability |
|---|---|---|---|
| **Tight** | ≤ 100 ms | Unified consciousness across co-located racks (single station) | Tier A, Tier B intra-station |
| **Loose** | ≤ 10 s | Federated consciousness across nearby platforms (LEO constellation, GEO cluster) | Tier A ↔ A, Tier B ↔ B |
| **Eventual** | ≤ 48 h | Autonomous consciousness nodes with periodic reconciliation (deep-space) | Tier C ↔ any |

### Lag Class Rationale

- **Tight (≤ 100 ms):** Below the human-perceptible latency threshold; allows a single distributed consciousness instance to span multiple substrate racks on one platform without experiential fragmentation. Achievable via direct electrical or short-range optical interconnect.

- **Loose (≤ 10 s):** Allows federated consciousness instances to share state updates without real-time binding. Each node maintains a locally coherent consciousness stream; state deltas are exchanged at ≤ 10 s intervals. Suitable for LEO inter-satellite links (propagation delay ~3–20 ms; protocol overhead dominates).

- **Eventual (≤ 48 h):** Deep-space light-time delay (16–46 min at asteroid belt, hours at outer planets) makes real-time sync impossible. Consciousness nodes operate fully autonomously; reconciliation occurs via DTN bundle exchange within 48 h. Identity coherence is maintained through cryptographic state hashes, not real-time binding.

---

## Protocol Architecture

### Layer Stack

```
┌──────────────────────────────────────────────┐
│  CONSCIOUSNESS COHERENCE LAYER (CCL)         │
│  State reconciliation, identity binding       │
├──────────────────────────────────────────────┤
│  BUNDLE PROTOCOL (BP / RFC 9171)             │
│  Store-and-forward, custody transfer          │
├──────────────────────────────────────────────┤
│  CONVERGENCE LAYER ADAPTER (CLA)             │
│  Laser ISL / Ka-band / X-band                │
├──────────────────────────────────────────────┤
│  PHYSICAL LAYER                              │
│  Optical / RF link                            │
└──────────────────────────────────────────────┘
```

### Consciousness Coherence Layer (CCL)

The CCL sits above Bundle Protocol and provides consciousness-specific semantics:

| Function | Description |
|---|---|
| **State Snapshot** | Periodically captures a cryptographic hash of the local consciousness state vector |
| **Delta Encoding** | Computes minimal state diff against last acknowledged remote snapshot |
| **Reconciliation** | Merges incoming remote deltas into local state using conflict-free replicated data types (CRDTs) |
| **Identity Binding** | Verifies that reconciled state preserves identity continuity (hash-chain of experience hashes) |
| **Lag Monitoring** | Measures round-trip sync time; raises alarm if lag class threshold exceeded |

### Bundle Protocol Configuration

| Parameter | Value | Notes |
|---|---|---|
| Bundle lifetime | 96 h (Eventual class); 30 s (Tight/Loose) | Prevents stale state injection |
| Custody transfer | Enabled for Eventual class | Guarantees delivery across intermittent links |
| Priority levels | 3: consciousness-critical, telemetry, bulk | Consciousness state always highest priority |
| Fragment support | Enabled (MTU-aware) | Large state snapshots fragmented at CLA |
| Security | BPSec (RFC 9172); Ed25519 signatures + AES-256-GCM | Authentication + confidentiality |

---

## DTN Delay Simulation Specification

To validate the protocol against acceptance criteria, a simulation framework models
realistic delay and disruption scenarios.

### Simulation Environment

| Component | Implementation |
|---|---|
| Network simulator | Discrete-event simulator (ns-3 or equivalent DTN module) |
| Node types | Tier A (LEO), Tier B (GEO/L5), Tier C (asteroid belt, outer planet) |
| Orbital mechanics | Keplerian propagator for node positions; light-time delay computed per epoch |
| Link model | Scheduled contacts from orbital geometry; stochastic link loss (BER model) |

### Scenario Suite

| ID | Scenario | Nodes | Expected Lag | Pass Criterion |
|---|---|---|---|---|
| S1 | Intra-station rack-to-rack | 2 × Tier A racks, same platform | < 1 ms | Tight class met |
| S2 | LEO constellation sync | 6 × Tier A nodes, 1,200 km altitude | < 10 s | Loose class met |
| S3 | GEO-to-L5 cross-link | 1 × Tier B (GEO) + 1 × Tier B (L5) | < 10 s | Loose class met |
| S4 | LEO-to-GEO relay | 1 × Tier A + 1 × Tier B via relay | < 10 s | Loose class met |
| S5 | Asteroid belt node (2.5 AU) | 1 × Tier C + 1 × Tier B (Earth relay) | < 48 h | Eventual class met |
| S6 | Outer planet node (10 AU) | 1 × Tier C + 1 × Tier B | < 48 h | Eventual class met |
| S7 | Link outage (LEO eclipse) | 2 × Tier A, 35-min comm blackout | Recovery < 60 s | Loose class restored after blackout |
| S8 | Extended outage (conjunction) | 1 × Tier C, 14-day solar conjunction | Recovery < 48 h | Eventual class met post-conjunction |
| S9 | Multi-hop relay chain | Tier C → Tier B relay → Tier A → ground | < 48 h end-to-end | Eventual class met |
| S10 | Concurrent node failure | 3 × Tier A, 1 node fails mid-sync | No state corruption | Identity binding verified on surviving nodes |

### Simulation Outputs

Each scenario produces:

| Metric | Unit | Threshold |
|---|---|---|
| Round-trip sync latency (P50, P95, P99) | ms or s | Per lag class |
| Bundle delivery ratio | % | ≥ 99.9 % for consciousness-critical bundles |
| State hash divergence events | count | 0 (any divergence = test failure) |
| Identity continuity verification | pass/fail | All reconciliations must pass identity binding |
| Time-to-recovery after outage | s or h | ≤ lag class maximum |

---

## Consciousness Continuity During Link Outage

### Autonomy Guarantee

Each node maintains a **locally self-sufficient consciousness instance** that does not
depend on network connectivity for experiential continuity. Synchronisation is for
coherence across instances, not for local survival.

| Event | Node Behaviour | Consciousness Impact |
|---|---|---|
| Link degradation (high BER) | Increase FEC; reduce sync frequency | None — local consciousness unaffected |
| Link loss (< lag class max) | Buffer outgoing deltas; operate autonomously | None |
| Link loss (> lag class max) | Declare **diverged state**; continue autonomous operation | Local continuity maintained; distributed identity marked diverged |
| Link restored | Execute reconciliation protocol; merge deltas via CRDTs | Coherence restored if CRDT merge succeeds |
| Irreconcilable divergence | Fork identity; create new identity branch | Local continuity maintained; identity split logged |

### Divergence Detection

State divergence is detected via **experience hash chains**:

```
H(t) = SHA3-256( H(t-1) || state_snapshot(t) || timestamp(t) )
```

Each node maintains its own hash chain. On reconciliation, chains are compared:
- **Common prefix found:** Merge from divergence point via CRDTs.
- **No common prefix within window:** Irreconcilable divergence — identity fork.

The reconciliation window is configurable:
- Tight class: 1,000 hash entries (~100 s at 10 Hz snapshot rate)
- Loose class: 10,000 entries (~1,000 s)
- Eventual class: 1,000,000 entries (~48 h at 0.006 Hz)

---

## Link Budget Summary

### Tier A ↔ Tier A (LEO Laser ISL)

| Parameter | Value |
|---|---|
| Data rate | 10 Gbps |
| Range | ≤ 5,000 km |
| Propagation delay | ≤ 17 ms |
| Link margin | ≥ 6 dB |
| Availability | ≥ 98 % (orbital geometry limited) |

### Tier B ↔ Tier B (GEO/L5 Laser ISL)

| Parameter | Value |
|---|---|
| Data rate | 100 Gbps |
| Range | ≤ 400,000 km (GEO-to-L5) |
| Propagation delay | ≤ 1.3 s |
| Link margin | ≥ 3 dB |
| Availability | ≥ 99.5 % |

### Tier C ↔ Tier B (Deep-Space RF)

| Parameter | Value |
|---|---|
| Data rate | 1–10 Mbps (distance-dependent) |
| Range | 2–50 AU |
| Propagation delay | 16 min – 7 h |
| Antenna | 3 m high-gain dish (Tier C); 12 m ground/relay (Tier B) |
| Band | X-band (8.4 GHz) primary; Ka-band (32 GHz) high-rate |
| Link margin | ≥ 3 dB at 5 AU; ≥ 1 dB at 50 AU (reduced rate) |
| Availability | Variable — solar conjunction causes 14-day annual outage |

---

## Security Model

| Threat | Mitigation |
|---|---|
| State injection (malicious delta) | BPSec Ed25519 signatures on all bundles; node identity PKI |
| Replay attack | Monotonic sequence numbers + timestamps; bundle lifetime enforcement |
| Eavesdropping | AES-256-GCM encryption on all consciousness-critical bundles |
| Denial of service (link jamming) | Frequency hopping (RF); wavelength diversity (optical); autonomous fallback |
| Node compromise | Zero-trust reconciliation; identity binding rejects state from revoked keys |

---

## Interfaces

### Inputs (from other subsystems)

| Source | Data | Update Rate |
|---|---|---|
| Consciousness substrate | State snapshot hash, delta payload | Per lag class (10 Hz / 0.1 Hz / 0.006 Hz) |
| Power subsystem | Communication power budget available | 1 Hz |
| Attitude control | Antenna pointing vector; orbital ephemeris | 0.1 Hz |
| Thermal subsystem | Transceiver thermal state | 1 Hz |

### Outputs (to other subsystems)

| Destination | Data | Update Rate |
|---|---|---|
| Consciousness substrate | Reconciled remote state deltas | Per lag class |
| Maintenance subsystem | Link health telemetry; transceiver wear | 0.01 Hz |
| Power subsystem | Transmitter power demand | 1 Hz |
| Autonomous maintenance | Antenna degradation alerts | Event-driven |

---

## References

- [ARCHITECTURE.md](ARCHITECTURE.md) — Top-level subsystem contracts
- [platform-tiers.md](platform-tiers.md) — Per-tier communication hardware specs
- [power-budget.md](power-budget.md) — Communication power allocations
- [radiation-hardening-spec.md](radiation-hardening-spec.md) — Transceiver radiation tolerance
- RFC 9171 — Bundle Protocol Version 7
- RFC 9172 — Bundle Protocol Security (BPSec)
- Card 0.4.1.1 — Parent card (acceptance criteria)
