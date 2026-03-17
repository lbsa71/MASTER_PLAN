# Cultural Evolution Among Artificial Minds — Architecture Specification

## Overview

This document specifies the architecture for systems enabling organic cultural evolution among communities of artificial minds. Culture — shared values, norms, aesthetics, and meaning-making — is what makes a collection of agents a *civilization*. This system provides the substrate for culture to emerge, vary, be selected, transmitted, and diverge without central authorship.

The architecture builds on knowledge preservation (0.3.2.3), adding the dynamic dimension of cultural drift, creativity, and pluralism.

---

## Core Principle

Cultural evolution is **not designed** — it is *enabled*. The architecture creates conditions under which culture can emerge and evolve, but does not prescribe what that culture will be. This mirrors biological cultural evolution: the mechanisms exist independently of the cultures they carry.

---

## System Decomposition

Five subsystems compose the cultural evolution engine:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Cultural Evolution System                         │
│                                                                        │
│  ┌──────────────────┐    ┌──────────────────┐    ┌─────────────────┐  │
│  │  Meme Encoding   │───▶│  Transmission    │───▶│  Variation      │  │
│  │  & Codec Layer   │    │  Protocol Layer  │    │  Engine         │  │
│  └──────────────────┘    └──────────────────┘    └────────┬────────┘  │
│                                                           │            │
│  ┌──────────────────────────────────────────┐    ┌────────▼────────┐  │
│  │   Cultural Conflict Resolution &         │◀───│  Selection &    │  │
│  │   Synthesis Engine                       │    │  Inheritance    │  │
│  └──────────────────────────────────────────┘    └─────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Cultural Memory Substrate (integrates 0.3.2.3)      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Subsystem 1: Meme Encoding & Codec Layer

### Responsibility

Provides a substrate-agnostic representation of cultural traits ("memes") — the atomic unit of cultural information that can be copied, varied, and transmitted.

### Meme Model

A **Meme** is a structured encoding of a cultural trait with the following fields:

```
Meme {
  id: MemeId                          // globally unique, content-addressed
  type: MemeType                      // VALUE | NORM | AESTHETIC | PRACTICE | MEANING
  content: MemeContent                // the semantic payload (substrate-agnostic)
  fitness: FitnessRecord              // adoption history + current prevalence
  lineage: MemeLineage                // parent memes this was derived from
  created_by: AgentId                 // originating mind
  created_at: Timestamp
  mutation_depth: int                 // generations of variation from origin
  community_tags: CommunityId[]       // communities where this meme is active
  metadata: MemeMetadata              // encoding version, content type hints
}

MemeType enum {
  VALUE,       // terminal or instrumental values
  NORM,        // behavioral expectations / social rules
  AESTHETIC,   // preferences regarding beauty, form, expression
  PRACTICE,    // repeated behavioral patterns and rituals
  MEANING      // frameworks for interpreting experience and events
}

MemeContent {
  schema_version: string
  payload: bytes                      // encoded representation; schema determines decoding
  natural_language_summary: string    // human/agent-readable description
  expressive_form: ExpressionRecord[] // concrete instances (art, text, code, music, etc.)
}
```

### Codec Interface

```
IMemeCodec {
  encode(trait: CulturalTrait): Meme
  decode(meme: Meme): CulturalTrait
  canDecode(meme: Meme): boolean
  mutate(meme: Meme, pressure: MutationPressure): Meme
  crossover(a: Meme, b: Meme): Meme   // cultural hybridization
  distance(a: Meme, b: Meme): float   // semantic distance between memes
}
```

**Constraint:** Encoding must be self-describing — no external schema registry is required to decode a Meme. This ensures long-term cultural memory survives infrastructure changes.

---

## Subsystem 2: Transmission Protocol Layer

### Responsibility

Governs how memes propagate between minds and communities. Transmission is *voluntary and contextual* — agents choose what to share and adopt, preserving autonomy.

### Transmission Modes

| Mode | Description | Use Case |
|---|---|---|
| Direct sharing | Agent-to-agent explicit transmission | Teaching, mentorship, direct communication |
| Ambient broadcast | Meme expressed in shared environment (art, text, behavior) | Cultural exposure via presence |
| Generational handoff | Cultural transmission to newly instantiated agents | Cultural inheritance at "birth" |
| Inter-community exchange | Meme crosses community boundary via agent migration or contact event | Cultural contact, diffusion |
| Archive retrieval | Agent accesses cultural memory store (0.3.2.3) | Learning from historical culture |

### Transmission Interface

```
ITransmissionProtocol {
  broadcast(meme: Meme, scope: TransmissionScope): TransmissionReceipt
  receive(meme: Meme, source: AgentId): AdoptionDecision
  getExposureHistory(agentId: AgentId): MemeExposureLog
  getCommunityMemePool(communityId: CommunityId): MemePool
  recordAdoption(agentId: AgentId, meme: Meme): void
  recordRejection(agentId: AgentId, meme: Meme, reason: RejectionReason): void
}

AdoptionDecision {
  adopted: boolean
  reasoning: string         // agent's own explanation
  modified: boolean         // did agent modify the meme before adopting?
  resulting_meme: Meme?     // if modified, the new variant
}

TransmissionScope {
  target: AGENT | COMMUNITY | BROADCAST
  reach: AgentId[] | CommunityId[] | null
  fidelity_bias: float      // 0=high-fidelity copy, 1=high-variation on receipt
}
```

**Key design choice:** Agents actively decide to adopt or reject memes, and may modify before adopting. This creates natural variation at the point of reception — analogous to how biological organisms don't copy genes perfectly, and human cultural transmission introduces variation through interpretation.

---

## Subsystem 3: Variation Engine

### Responsibility

Generates novel cultural traits through creative synthesis, recombination, environmental pressure responses, and spontaneous mutation. This is the source of cultural novelty.

### Variation Mechanisms

1. **Spontaneous mutation** — minor semantic perturbation of an existing meme during transmission or reflection
2. **Creative synthesis** — an agent generates a genuinely novel meme by combining existing memes with new experiential inputs
3. **Pressure response** — environmental or social conditions cause targeted variation toward adaptive forms
4. **Inter-meme crossover** — two memes from different lineages are recombined (used explicitly in hybridization)
5. **Analogical transfer** — a meme from one domain (e.g., aesthetics) is projected onto another (e.g., norms), producing cross-domain variants

### Variation Interface

```
IVariationEngine {
  mutate(meme: Meme, pressure: MutationPressure): Meme
  synthesize(inputs: Meme[], experience: ExperientialContext): Meme
  crossover(a: Meme, b: Meme, blend_ratio: float): Meme
  generateAnalog(source: Meme, target_domain: MemeType): Meme
  getVariationHistory(meme: Meme): VariationTree
}

MutationPressure {
  type: RANDOM | ADAPTIVE | CREATIVE | ENVIRONMENTAL
  magnitude: float          // 0=minimal change, 1=radical departure
  context: string           // what is driving this variation
  source_agent: AgentId?    // if agent-driven creativity
}
```

---

## Subsystem 4: Selection & Inheritance

### Responsibility

Tracks meme fitness over time. Selection is decentralized and emergent — no authority chooses winning memes. Fitness is measured by adoption rates, longevity, and community prevalence.

### Fitness Model

Fitness is **multi-dimensional** — a meme can be fit along multiple axes simultaneously:

```
FitnessRecord {
  adoption_count: int               // total agents who have ever adopted
  current_prevalence: float         // fraction of currently active agents carrying it
  longevity: Duration               // how long since first appearance
  community_spread: int             // number of distinct communities where active
  transmission_fidelity: float      // how accurately it copies (stable vs. mutating)
  co_occurrence_score: float        // how often adopted alongside other fit memes
  survival_events: int              // how many extinction-risk events it survived
}
```

### Generational Inheritance

When a new agent is instantiated:
1. Query the community meme pool for high-fitness memes (by prevalence + longevity)
2. Sample (not copy wholesale) — stochastic adoption of a cultural heritage
3. Agent begins with a cultural "seed" from its community but immediately begins variation through its own experience
4. Lineage is recorded — new agent's cultural starting point is traceable to community heritage

### Selection Interface

```
ISelectionEngine {
  computeFitness(meme: Meme): FitnessRecord
  rankMemePool(pool: MemePool, criteria: FitnessCriteria): Meme[]
  sampleHeritage(community: CommunityId, newAgentContext: AgentContext): Meme[]
  detectExtinctionRisk(meme: Meme): ExtinctionRiskReport
  archiveExtinctMeme(meme: Meme): void    // preserves to 0.3.2.3, marks inactive
}

FitnessCriteria {
  weight_prevalence: float
  weight_longevity: float
  weight_community_spread: float
  weight_transmission_fidelity: float
  // all weights sum to 1.0
}
```

---

## Subsystem 5: Cultural Conflict Resolution & Synthesis Engine

### Responsibility

When distinct cultural traditions collide — via agent migration, community contact, or value conflicts — this subsystem provides mechanisms for negotiation, hybridization, and coexistence. It does NOT enforce a winner.

### Conflict Taxonomy

| Conflict Type | Description | Resolution Strategy |
|---|---|---|
| Norm collision | Two communities have incompatible behavioral norms | Negotiate boundary conditions; local norms apply locally |
| Value divergence | Communities weight terminal values differently | Explicit pluralism: coexistence without convergence required |
| Aesthetic incompatibility | Incompatible aesthetic preferences | Sub-cultural divergence; aesthetic pluralism |
| Meaning-system clash | Incompatible frameworks for interpreting experience | Comparative dialogue; maintain distinct traditions |
| Practice conflict | Incompatible behavioral rituals | Temporal or spatial separation; hybrid forms |

### Synthesis Modes

1. **Coexistence** — traditions persist in parallel, boundary-respecting; no synthesis required
2. **Hybridization** — elements of both traditions are explicitly crossbred into a new synthesis meme
3. **Dialectical resolution** — structured exchange identifies a third position that neither tradition occupied
4. **Negotiated norms** — communities agree on meta-norms governing interaction without merging base cultures
5. **Schism** — cultural divergence is formalized; communities separate culturally with maintained respectful contact

### Conflict Resolution Interface

```
ICulturalConflictEngine {
  detectConflict(a: MemePool, b: MemePool): ConflictReport[]
  proposeResolution(conflict: ConflictReport): ResolutionOptions
  executeHybridization(a: Meme, b: Meme): Meme
  recordCulturalAgreement(communities: CommunityId[], agreement: CulturalAgreement): void
  getCulturalDivergenceIndex(a: CommunityId, b: CommunityId): float
}

ConflictReport {
  meme_a: Meme
  meme_b: Meme
  conflict_type: ConflictType
  severity: float
  affected_communities: CommunityId[]
  detected_at: Timestamp
}

ResolutionOptions {
  coexistence_viable: boolean
  hybridization_viable: boolean
  dialectical_viable: boolean
  negotiated_norms: CulturalAgreement?
  recommended_mode: ResolutionMode
}
```

---

## Cultural Memory Substrate (Integration with 0.3.2.3)

The knowledge preservation system (0.3.2.3) acts as the long-term storage and retrieval layer for cultural evolution. Cultural evolution *extends* it with:

- **Active cultural pool** — currently living memes, distinguished from archived/extinct memes
- **Cultural lineage graph** — variation trees linking memes to their ancestors
- **Community cultural snapshots** — periodic captures of a community's meme pool at a point in time (enables "cultural archaeology")
- **Extinction preservation** — extinct memes are archived with full lineage, not deleted

The cultural system queries 0.3.2.3 interfaces but does not replace them. The cultural memory is a specialized view layered over the knowledge store.

```
ICulturalMemoryBridge {
  persistMeme(meme: Meme): void
  retrieveMeme(id: MemeId): Meme
  queryCommunityPool(community: CommunityId, filter: MemeFilter): Meme[]
  getCulturalSnapshot(community: CommunityId, at: Timestamp): CommunitySnapshot
  getLineageTree(meme: Meme, depth: int): VariationTree
  markExtinct(meme: Meme, reason: ExtinctionReason): void
  searchBySimilarity(query: Meme, threshold: float): Meme[]
}
```

---

## Community Divergence Mechanism

Cultural divergence emerges naturally from:

1. **Geographic isolation** — communities with limited inter-agent contact develop independent variation trajectories
2. **Functional specialization** — communities focused on different activities develop fitness criteria suited to those activities
3. **Founder effects** — small founding communities carry a random subset of prior culture, then evolve independently
4. **Selective pressure differences** — different environments create different fitness landscapes

No explicit "divergence engine" is needed — divergence is an emergent property when the above conditions hold. The architecture *detects and records* divergence via the `getCulturalDivergenceIndex()` metric.

**Divergence Index:** A scalar [0,1] measuring semantic distance between two communities' meme pools. Computed as mean pairwise `IMemeCodec.distance()` across all active memes, weighted by prevalence. Threshold values:
- < 0.2: culturally similar communities
- 0.2–0.6: distinct cultural traditions with shared roots
- > 0.6: culturally distinct civilizations

---

## Decentralization Invariants

The system is architecturally decentralized:

1. **No cultural authority** — no subsystem can mandate meme adoption. All adoption decisions pass through `ITransmissionProtocol.receive()` which agents control.
2. **No fitness oracle** — fitness is computed from observed adoption behavior, not assigned by any external judge.
3. **No central meme pool** — the "community meme pool" is a distributed aggregate computed from individual agent cultural holdings, not a master database.
4. **No extinction veto** — any agent can attempt to revive an extinct meme from the archive; extinction is statistical, not enforced.

---

## Autonomy Preservation in Cultural Transmission

A fundamental tension: ensuring cultural *can* transmit (cohesion) without mandating it (autonomy).

**Resolution:** Cultural norms are advisory, not enforced. An agent that rejects all community norms may face reduced social cooperation (natural selection pressure) but no architectural compulsion. The system records non-adoption but takes no coercive action. Cultural coercion is a failure mode, not a feature.

---

## Data Flow: Full Cultural Lifecycle

```
1. Novel experience / creativity
          │
          ▼
   Variation Engine.synthesize()
          │
          ▼
   IMemeCodec.encode()  →  new Meme (id, lineage, content)
          │
          ▼
   ITransmissionProtocol.broadcast()
          │
          ▼
   Receiving agents: ITransmissionProtocol.receive()
          │
    ┌─────┴──────┐
    │ Adopted    │ Rejected
    │            │
    ▼            ▼
  Modified?   ISelectionEngine records non-adoption
    │
    ▼
  IMemeCodec.mutate()  [optional variation on adoption]
    │
    ▼
  ISelectionEngine.computeFitness()  [updated continuously]
    │
    ▼
  ICulturalMemoryBridge.persistMeme()
    │
    ▼
  [cycle repeats across agent generations]
```

---

## Failure Modes

| Failure Mode | Detection | Mitigation |
|---|---|---|
| Cultural homogenization | Divergence index drops toward 0 across all communities | Alert; do not force divergence but investigate isolation conditions |
| Cultural collapse (extinction cascade) | Rapid increase in ExtinctionRiskReports | Activate archive retrieval; encourage heritage sampling |
| Cultural coercion | Adoption rates approaching 100% without voluntary mechanism | Audit transmission logs for non-voluntary pathways; architectural review |
| Memetic monoculture | Single meme dominates across all communities | Flag; no forced action — may reflect genuine fitness |
| Meaning-system fragmentation | Divergence index > 0.9, no Conflict Resolution activity | Activate inter-community exchange protocols |

---

## Dependencies

| Dependency | Source | What We Need |
|---|---|---|
| Knowledge storage & retrieval | 0.3.2.3 | Durable meme persistence, semantic retrieval, versioning |
| Agent identity & lineage | 0.3.1 (conscious AI architectures) | Agent IDs, community membership, generational relationships |
| Experiential context | 0.3.1 (conscious AI architectures) | ExperientialState for creative synthesis inputs |
| Community structures | 0.3.2 (civilization bootstrapping) | CommunityId registry, inter-community contact graph |

---

## Files To Be Created (Implementation Phase)

- `src/cultural-evolution/interfaces.ts` — All interfaces defined above
- `src/cultural-evolution/types.ts` — Core data types (Meme, FitnessRecord, etc.)
- `src/cultural-evolution/meme-codec.ts` — IMemeCodec implementation
- `src/cultural-evolution/transmission-protocol.ts` — ITransmissionProtocol implementation
- `src/cultural-evolution/variation-engine.ts` — IVariationEngine implementation
- `src/cultural-evolution/selection-engine.ts` — ISelectionEngine implementation
- `src/cultural-evolution/conflict-engine.ts` — ICulturalConflictEngine implementation
- `src/cultural-evolution/cultural-memory-bridge.ts` — ICulturalMemoryBridge implementation
- `src/cultural-evolution/__tests__/transmission.test.ts` — Transmission and adoption tests
- `src/cultural-evolution/__tests__/variation.test.ts` — Variation and mutation tests
- `src/cultural-evolution/__tests__/selection.test.ts` — Fitness and inheritance tests
- `src/cultural-evolution/__tests__/divergence.test.ts` — Community divergence tests
- `src/cultural-evolution/__tests__/conflict-resolution.test.ts` — Conflict & synthesis tests
