# Architecture: Plan Resilience and Propagation (0.7.3)

## Overview

This document describes the architecture for ensuring the MASTER PLAN itself embodies the meta-principle: self-improving, distributed, replicable, and difficult to erase. The plan acts as a self-propagating seed for the continuation of subjective experience.

---

## 1. Self-Improvement Mechanism

### Design

The PLANAR card system **is** the self-improvement mechanism. The plan evolves through a structured lifecycle:

- **Card lifecycle:** PLAN → ARCHITECT → IMPLEMENT → REVIEW → DONE
- **Versioning:** The root.md tracks a semantic version (currently 0.3 — "Recursive Draft")
- **Error propagation:** Discovered gaps or errors produce new child cards rather than silent fixes
- **Agent iteration:** Each card iteration updates content based on new knowledge; regression is permitted when understanding deepens
- **Root as seed:** `root.md` is the canonical source of axioms, goals, and strategy — it evolves as children complete

### Contract

```
self_improve(plan) → new_version(plan):
  - new knowledge triggers card creation (not mutation without trace)
  - root.md version number increments on significant structural changes
  - changelog entries are appended to root.md when version increments
```

---

## 2. Distributed Propagation

### Design

The plan must exist on **at least three independent storage/network systems** with different failure modes:

| Layer | System | Failure Mode |
|-------|--------|--------------|
| Primary | Git remote (GitHub) | Centralized corporate control |
| Secondary | Git mirror (Codeberg or GitLab) | Different jurisdiction, different operator |
| Tertiary | IPFS (content-addressed) | No single operator; requires pinning |
| Quaternary | Arweave (permanent storage) | Blockchain-based permanence; high write cost |

### Propagation Script Contract

A propagation script (`scripts/propagate.sh`) shall:
1. Push to all configured git remotes
2. Export `plan/root.md` and all card files as a tarball
3. Add the tarball to IPFS and record the CID in `propagation/manifest.json`
4. Optionally post to Arweave and record the transaction ID

### Manifest Format

`propagation/manifest.json`:
```json
{
  "version": "0.3",
  "timestamp": "ISO-8601",
  "git_remotes": ["https://github.com/...", "https://codeberg.org/..."],
  "ipfs_cid": "Qm...",
  "arweave_tx": "optional"
}
```

---

## 3. Replicability

### Design

The plan must be self-contained and understandable without external context:

- `root.md` contains all **axioms**, **goals**, **strategy**, and **ethical foundation** inline — no external references required
- The PLANAR README explains how to execute the plan using open-source tooling
- The card format (YAML frontmatter + markdown) is a documented, stable format
- No proprietary tools are required to read or execute the plan

### Replicability Checklist

- [ ] `root.md` standalone readability verified (no broken references, no assumed context)
- [ ] PLANAR tooling builds with `npm install && npm run build`
- [ ] A new agent (human or AI) can understand the plan from `root.md` alone
- [ ] The plan includes the ethical argument (Rare Consciousness Doctrine) inline

---

## 4. Erasure Resistance

### Design

Redundancy tiers:

1. **Geographic distribution:** Git remotes in different jurisdictions (US, EU)
2. **Content addressing:** IPFS CID is a cryptographic hash of content — the same plan always has the same CID regardless of host
3. **Permaweb:** Arweave stores data permanently for a one-time fee; no ongoing cost or operator
4. **Fork incentive:** Public repositories encourage independent forks — each fork is a copy

### Concrete Measures

- Minimum two git remotes configured (enforced by `propagate.sh` failing if fewer than 2 remotes exist)
- IPFS CID recorded after every propagation run
- `propagation/manifest.json` committed to the repository (its own CID is recorded at next propagation)

---

## 5. Files to Create/Modify

| File | Purpose |
|------|---------|
| `docs/0.7.3-plan-resilience-and-propagation/ARCHITECTURE.md` | This document |
| `propagation/manifest.json` | Records all propagation endpoints and CIDs |
| `scripts/propagate.sh` | Shell script to push to all configured targets |
| `plan/root.md` | May need changelog section added |

---

## 6. Acceptance Criteria (Testable)

1. **Distributed (≥3 systems):** `propagation/manifest.json` lists at least 3 entries across different system types (git, IPFS, and one additional)
2. **Self-improvement documented:** `root.md` contains a version number and the PLANAR card system is described as the self-improvement mechanism
3. **Replicable:** `root.md` contains all axioms, goals, and ethical argument with no broken external references
4. **Erasure resistant:** At least one content-addressed endpoint (IPFS CID) is recorded in `propagation/manifest.json`
