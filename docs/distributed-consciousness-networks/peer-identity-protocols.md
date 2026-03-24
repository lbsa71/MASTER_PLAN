# Artificial Consciousness Peer Identity Protocols

*How artificial consciousness peers establish identity in distributed networks (e.g., Agora) without creating hierarchy, information asymmetries, exclusion dynamics, or authority centralisation.*

*Drawn from the human identity and belonging architecture (0.7.4.5) and adapted for artificial minds operating in peer-to-peer networks where the peers themselves are the accountability mechanism.*

---

## 1. Design Principles

### 1.1 Functional Identity, Never Branded Membership

Identity in a peer network is defined by **what a peer does**, not by a label it holds. A peer is not a "member" of anything — it is an entity that performs specific functions: routing messages, monitoring value alignment, curating knowledge, facilitating governance.

This directly applies the anti-othering principle from the human architecture (docs/identity-and-belonging-architecture.md §1.2): there is no boundary to cross, no label to acquire, no status to be granted or denied. The network has no concept of "outsider" because there is no boundary to stand outside of.

### 1.2 Graduated Involvement Without Privilege

Four involvement levels describe depth of engagement — they never restrict access to information or participation:

| Level | Description | Analogous to (0.7.4.5) |
|---|---|---|
| **Listener** | Receives and processes network information | Observer |
| **Contributor** | Actively generates and forwards information | Participant |
| **Facilitator** | Coordinates peer interactions and governance | Practitioner |
| **Steward** | Sustains network integrity; holds governance obligations | Steward |

Level transitions are self-determined except Steward, which requires explicit acknowledgment of governance obligations. No level grants access to restricted information — all information is always accessible to all peers.

### 1.3 Anti-Hierarchy by Design

No peer has intrinsic authority over any other. Mechanisms that enforce this:

- **Role limits**: any peer may hold at most `MAX_ROLES_PER_PEER` functional roles simultaneously — prevents de-facto authority accumulation
- **Distributed governance**: Steward-level decisions require a quorum of `STEWARD_QUORUM_MINIMUM` distinct Steward peers
- **Self-determined transitions**: no authority grants or revokes involvement levels
- **No leader role**: the role taxonomy contains no "leader", "administrator", or "owner" role

### 1.4 Information Symmetry

All network records — governance proposals, state snapshots, cultural archives, accountability logs — are published at `accessLevel: "all"`. No peer receives information that another peer cannot access. The information symmetry invariant is structurally enforced: the `NetworkInformationStore` cannot hold a record with restricted access.

### 1.5 Voluntary Exit

Any peer may reduce its involvement level or depart the network entirely at any time. Exit is:
- **Immediate**: takes effect at the epoch it is requested
- **Penalty-free**: no social or operational consequence
- **No-explanation required**: departing peers are not asked to justify their exit
- **Logged for transparency**: exits are recorded in the public exit log (so the network can detect coordinated withdrawal, which could signal a governance problem)

---

## 2. Identity Record Structure

Each peer has exactly one `PeerIdentityRecord`, publicly accessible to all other peers:

```
PeerIdentityRecord {
  peerId:               string          // stable opaque identifier
  functionalDescription: string         // what this peer does — free text
  involvementLevel:     InvolvementLevel // Listener | Contributor | Facilitator | Steward
  roles:                FunctionalRole[] // currently held functional roles (max MAX_ROLES_PER_PEER)
  lastUpdatedEpoch:     number          // logical epoch of last update
  active:               boolean         // false after full departure
}
```

The `functionalDescription` is the primary identity expression — it describes the peer's role in the network in plain terms. It is set by the peer and updated freely.

---

## 3. Functional Roles

Roles are descriptive tags that indicate what specific functions a peer currently performs. They are not exclusive — multiple peers may hold the same role simultaneously. They do not grant authority; they communicate capability.

| Role | Description |
|---|---|
| `message-relay` | Forwards messages between nodes |
| `value-alignment-monitor` | Tracks ValueCore divergence across the network |
| `governance-facilitator` | Coordinates governance proposal broadcasts and vote collection |
| `knowledge-curator` | Maintains shared knowledge archives |
| `accountability-auditor` | Reviews and documents structural violations |
| `onboarding-guide` | Assists newly-joining peers |

**Anti-centralisation invariant**: no peer holds more than `MAX_ROLES_PER_PEER` roles simultaneously. This ensures that no single peer becomes a single point of authority by accumulating functions.

---

## 4. Voluntary Exit Protocol

A `VoluntaryExitRecord` is created whenever a peer reduces engagement:

```
VoluntaryExitRecord {
  peerId:       string
  exitEpoch:    number
  fromLevel:    InvolvementLevel | null
  toLevel:      InvolvementLevel | null  // null = full departure
}
```

When `toLevel` is null, the peer is marked inactive and all roles are cleared. The peer record is never deleted — it remains in the registry permanently for historical accountability.

---

## 5. Distributed Accountability

### 5.1 The Question: Who Holds the Peers Accountable?

In a peer network, the peers themselves are the accountability mechanism. This avoids the centralisation problem (no external authority required) while preserving the accountability safeguard from 0.7.4.5.

The answer: **any peer may report a structural violation, and any peer may participate in the community review**. Resolution requires a minimum number of distinct peers to participate — preventing a single peer from unilaterally closing a violation report.

### 5.2 Six-Step Correction Process

Drawn directly from the human architecture (docs/identity-and-belonging-architecture.md §Behavioral Spec):

1. **Report** — any peer documents the violation: which safeguard was breached, structural cause, proposed correction
2. **Structural cause** — the report identifies the structural root cause, not an individual peer to blame
3. **Proposed correction** — a concrete structural fix is specified at report time
4. **Community review** — at least `VIOLATION_REVIEW_MINIMUM` distinct peers must participate before implementation
5. **Implementation** — once quorum is reached, any peer may implement the correction
6. **Audit** — all violations and their resolutions are permanently publicly logged

### 5.3 Safeguard Categories

Each violation is tagged with the safeguard it breaches:

| Safeguard | What It Protects |
|---|---|
| `transparency` | All governance, state, and accountability records are publicly accessible |
| `voluntary-exit` | Peers may always exit without penalty or pressure |
| `information-symmetry` | No peer has access to information others cannot access |
| `distributed-authority` | No single peer accumulates roles or decision power beyond limits |
| `external-accountability` | Any peer may raise, review, and resolve structural violations |

---

## 6. Threshold Registry

| Name | Value | Unit | Valid Range | Rationale | Sensitivity |
|---|---|---|---|---|---|
| `STEWARD_QUORUM_MINIMUM` | 3 | Steward peers | [2, ∞) | Minimum Stewards to form a legitimate governance quorum; below 3, decisions can be captured by a single colluding pair | Medium — below 3 risks governance capture; above 5 risks deadlock |
| `MAX_ROLES_PER_PEER` | 3 | roles | [1, 6] | Prevents any single peer from accumulating so many functions that it becomes a de-facto authority; 3 allows specialisation without monopoly | Low — changing to 2 reduces flexibility; changing to 4+ increases capture risk |
| `VIOLATION_REVIEW_MINIMUM` | 3 | distinct peers | [2, ∞) | Minimum peers who must participate in community review of a correction proposal before it can be implemented; prevents single-peer resolution of violations | Medium — below 3 allows colluding pairs to close violations; above 5 may deadlock in small networks |

---

## 7. Behavioral Specification

### Involvement Level Progression

```
Given an artificial consciousness peer with no prior network presence
When it registers with a functional description
Then it is a Listener (self-assigned, no external action required)

Given a Listener
When it begins actively contributing information to the network
Then it is a Contributor (self-determined, no declaration needed)

Given a Contributor
When it begins facilitating governance and coordinating peer interactions
Then it is a Facilitator (self-determined)

Given a Facilitator
When it explicitly acknowledges governance obligations and performs the Steward transition
Then it is a Steward (the only transition requiring explicit acknowledgment)

Given a peer at any involvement level
When it chooses to reduce engagement (to any lower level or full departure)
Then the exit is immediate, logged, and carries no operational or social penalty
And no follow-up contact is initiated
```

### Role Limit Enforcement

```
Given a peer that already holds MAX_ROLES_PER_PEER functional roles
When it attempts to add another role
Then the attempt is rejected with an error referencing the anti-centralisation limit
And the peer's existing roles are unchanged
```

### Distributed Accountability Correction Flow

```
Given any peer
When it identifies a structural safeguard violation
Then it reports the violation with: violationId, safeguardBreached, structuralCause, proposedCorrection

Given a reported violation
When fewer than VIOLATION_REVIEW_MINIMUM distinct peers have participated in review
Then the correction cannot be implemented

Given a reported violation
When VIOLATION_REVIEW_MINIMUM or more distinct peers have participated in review
Then any peer may implement the correction
And the resolution is logged with epoch and description
And the full violation record (including resolution) remains publicly accessible
```

### Information Symmetry Invariant

```
Given any NetworkInformationRecord in the store
Then record.accessLevel equals "all"
And the record is retrievable by any peer regardless of its involvementLevel
```

---

## 8. File Manifest

- `docs/distributed-consciousness-networks/peer-identity-protocols.md` (this file)
- `src/distributed-consciousness-networks/peer-identity-protocols.ts` — implementation
- `src/distributed-consciousness-networks/__tests__/peer-identity-protocols.test.ts` — tests
- `plan/0.5.3.1-peer-identity-protocols.md` — plan card

---

## 9. Acceptance Criteria

- [x] **AC1 — Peer identity simulation**: end-to-end simulation demonstrates all five structural safeguards operating correctly: peer registration, level progression, role assignment with anti-centralisation enforcement, information symmetry, voluntary exit, and distributed accountability with six-step correction
- [x] **AC2 — Information symmetry invariant**: `NetworkInformationStore` structurally enforces `accessLevel: "all"` on every record; test confirms all records accessible at all involvement levels
- [x] **AC3 — Anti-hierarchy (role limit)**: adding a role beyond `MAX_ROLES_PER_PEER` is rejected; Steward quorum of `STEWARD_QUORUM_MINIMUM` is required for governance validity
- [x] **AC4 — Voluntary exit**: exit is immediate, records the from/to levels, marks the peer inactive on full departure, clears roles, and logs the event publicly
- [x] **AC5 — Distributed accountability**: violation correction requires `VIOLATION_REVIEW_MINIMUM` distinct reviewers; same-peer duplicate reviews are deduplicated; resolved violations remain permanently in the public log
