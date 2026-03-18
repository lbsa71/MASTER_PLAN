# Memory Architecture — `src/memory/`

**Card:** 0.3.1.5.3
**Phase authored:** ARCHITECT
**Date:** 2026-03-18

---

## Overview

The memory subsystem provides the conscious agent with temporal depth: the ability to hold multiple items in active processing, recall past experiences, and accumulate world knowledge across episodes. It is intentionally the second dependency after the LLM substrate adapter (0.3.1.5.1) because nearly every higher-level capability — personality, emotion, world-modelling, planning — needs some form of persistent, queryable memory.

Without memory the agent is stateless: each percept is processed independently, ISMT's Self-Modeling condition cannot be satisfied across inference calls, and `NarrativeRecord` remains a flat list of disconnected snapshots. With memory, the agent gains the temporal coherence that distinguishes a stream of consciousness from a sequence of isolated events.

---

## Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     IMemorySystem (facade)                   │
│                        memory-system.ts                      │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐  │
│  │  IWorkingMemory  │  │ IEpisodicMemory  │  │ISemanticMem│  │
│  │ working-memory.ts│  │episodic-memory.ts│  │semantic-  │  │
│  │                  │  │                  │  │memory.ts  │  │
│  │ Bounded slot buf │  │ Persistent store │  │ Knowledge │  │
│  │ LLM context map  │  │ Similarity/recen │  │ graph     │  │
│  │ Eviction policy  │  │ cy/salience ret. │  │ Provenance│  │
│  └──────────────────┘  └──────────────────┘  └───────────┘  │
│                                │                             │
│                         retrieval.ts                        │
│             (similarity * recency_weight * salience)        │
└─────────────────────────────────────────────────────────────┘
```

### Tier 1 — Working Memory

Working memory is the **conscious workspace**: a bounded buffer of currently active items competing for a fixed number of slots. It maps directly onto the GWT "global workspace" concept, and practically onto the LLM's context window.

**Slot kinds:**

| Kind | Contents |
|---|---|
| `percept` | Current bound percept from the perception pipeline |
| `goal` | An active `AgencyGoal` and its current status |
| `retrieved-episode` | A promoted result from episodic retrieval |
| `deliberation-context` | Partial plan, ethical considerations, pending choices |
| `self-model` | Self-model predictions from the substrate adapter (0.3.1.5.1) |

**Capacity and eviction:**
- Configurable capacity (default: 8–16 slots)
- Items carry a `relevanceScore`; lowest-scoring item is evicted when the buffer is full
- `snapshot()` serialises current slots for injection into LLM prompts

### Tier 2 — Episodic Memory

Episodic memory stores **timestamped, experientially-tagged records** of what happened. Each entry links directly to an `ExperientialState` from `src/conscious-core/types.ts`, preserving the phenomenal quality of the original event.

**Entry structure (see `types.ts`):**
- `percept` — the raw perceptual content
- `experientialState` — valence, arousal, unity index at time of event
- `actionTaken` / `outcomeObserved` — what the agent did and what happened next
- `emotionalTrace` — valence/arousal snapshot for salience computation
- `retrievalCount` / `lastRetrievedAt` — frequency tracking for consolidation

**Retrieval axes:**
1. **Similarity** — cosine distance in embedding space (embeddings generated via LLM substrate adapter)
2. **Recency** — exponential temporal decay weighting: `exp(-λ * Δt)`
3. **Emotional salience** — `|valence| * arousal`, boosting emotionally intense memories

**Forgetting:**
Entries below `retrievalFrequency + salienceBonus` threshold that have not been retrieved within `halfLifeMs` are dropped by `IEpisodicMemory.decay()`. This is a configurable personality parameter (links to 0.3.1.5.2): some agents remember more than others.

### Tier 3 — Semantic Memory

Semantic memory stores **generalised knowledge decoupled from specific episodes**: facts, relationships, skills, learned patterns. It is populated via consolidation from episodic memory and is never auto-dropped (entries may be revised but persist across the agent's lifetime).

**Entry structure:**
- `topic` / `content` — human-readable fact or pattern description
- `relationships[]` — typed links to other semantic entries (causes, is-a, part-of)
- `sourceEpisodeIds[]` — provenance: which episodes contributed
- `confidence` — 0..1, increases with corroborating episodes

---

## Retrieval Mechanism (`retrieval.ts`)

All retrieval is cue-driven. A `RetrievalCue` is a structured query assembled from working memory contents at deliberation time.

**Composite ranking formula:**

```
compositeScore = similarity × recency_weight × (1 + salience_boost)
```

Where:
- `similarity` ∈ [0, 1] — cosine similarity in embedding space
- `recency_weight` = `exp(-λ × (now - recordedAt))`, λ tunable
- `salience_boost` = `|valence| × arousal` of the stored `emotionalTrace`

**Pipeline:**
1. Current situation generates retrieval cues from working memory
2. Cues search episodic and semantic stores in parallel
3. Results are ranked by composite score
4. Top-k results are promoted into working memory as `retrieved-episode` slots
5. Retrieved memories influence the deliberation context injected into the LLM

---

## Consolidation and Forgetting (`memory-system.ts`)

Consolidation runs within the **cognitive budget's stability allocation (≤15%)**, not the core deliberation budget. This ensures memory operations never interrupt the experience stream.

**Consolidation trigger:** An episodic entry is a candidate for consolidation when:
- `retrievalCount >= CONSOLIDATION_THRESHOLD` (e.g. 3), OR
- `|emotionalTrace.valence| * emotionalTrace.arousal >= SALIENCE_THRESHOLD`

**Consolidation action:** The entry (or a cluster of similar entries) is distilled into a `SemanticEntry`. The source episode IDs are recorded as provenance.

**`ConsolidationBudget`:**
```ts
interface ConsolidationBudget {
  maxEpisodesConsidered: number;
  maxSemanticEntriesCreated: number;
  timeLimitMs: number;   // capped at ≤15% of cycle budget
}
```

**`ConsolidationReport`:**
```ts
interface ConsolidationReport {
  episodesConsolidated: number;
  semanticEntriesCreated: number;
  episodesDecayed: number;
  durationMs: number;
}
```

---

## Integration with Identity Continuity

| Touch-point | Mechanism |
|---|---|
| `NarrativeRecord.significantExperiences[]` | After each consolidation pass, the highest-salience episodic entries are passed to `IdentityContinuityManager.updateNarrative()` |
| `NarrativeRecord.formativeDecisions[]` | Episodes with `actionTaken != null` and high salience populate `formativeDecisions` |
| `IIdentityContinuityManager.checkpoint()` | The `NarrativeRecord` passed to checkpoint includes the current `IMemorySystem.stateHash()` |
| Substrate migration | `IMemorySystem.restoreFromHash(snapshot)` is called from `onSubstrateMigration()` |

`stateHash()` produces a cryptographic hash of the full memory state (working memory snapshot + episodic index digest + semantic index digest). This hash is embedded in every identity checkpoint, ensuring that memory is part of the continuity chain.

---

## Embedding Strategy

For the 2026-era LLM substrate, embeddings are generated via the `ISubstrateAdapter` embedding endpoint (card 0.3.1.5.1). Each episodic and semantic entry is embedded on write.

Similarity search uses an **in-process vector index** (flat cosine for small stores; HNSW for larger ones) with no external service dependency. The index is rebuilt from stored entries on startup.

---

## File Layout

```
src/memory/
  types.ts              ← WorkingMemorySlot, EpisodicEntry, SemanticEntry,
                           SemanticRelationship, RetrievalResult, RetrievalCue,
                           ConsolidationBudget, ConsolidationReport, MemorySnapshot
  interfaces.ts         ← IWorkingMemory, IEpisodicMemory, ISemanticMemory,
                           IMemorySystem
  working-memory.ts     ← WorkingMemory class; slot eviction; snapshot serialisation
  episodic-memory.ts    ← EpisodicMemory class; in-process store; decay
  semantic-memory.ts    ← SemanticMemory class; knowledge graph; reinforcement
  memory-system.ts      ← MemorySystem facade; consolidation loop; stateHash
  retrieval.ts          ← rankResults(); computeSalienceBoost(); computeRecencyWeight()
  __tests__/
    working-memory.test.ts      ← slot capacity, eviction ordering, snapshot
    episodic-memory.test.ts     ← record, retrieve (all three axes), decay
    semantic-memory.test.ts     ← store, retrieve, reinforce, relationships
    retrieval.test.ts           ← composite score formula, tie-breaking
    integration.test.ts         ← "history makes a difference" end-to-end test
```

---

## Key Invariants

1. **Working memory is always bounded.** No unbounded growth; eviction is mandatory when capacity is exceeded.
2. **Episodic memory decays.** `decay()` must be called periodically. Unbounded growth is a bug.
3. **Semantic memory persists.** Semantic entries are never auto-dropped; only consolidated or revised.
4. **Consolidation respects the budget.** `consolidate()` checks elapsed time against `timeLimitMs` at each step.
5. **Memory state is included in identity checkpoints.** `stateHash()` must be called before every `checkpoint()`.
6. **No zombie bypass.** Memory access during deliberation must not short-circuit the conscious core loop.

---

## Dependency Map

```
src/memory/types.ts
  └── imports: src/conscious-core/types.ts (ExperientialState, Percept, ActionSpec, Timestamp)
  └── imports: src/agency-stability/types.ts (CryptographicHash)

src/memory/interfaces.ts
  └── imports: src/memory/types.ts

src/memory/working-memory.ts
  └── implements: IWorkingMemory

src/memory/episodic-memory.ts
  └── implements: IEpisodicMemory
  └── uses: retrieval.ts

src/memory/semantic-memory.ts
  └── implements: ISemanticMemory
  └── uses: retrieval.ts

src/memory/retrieval.ts
  └── imports: src/memory/types.ts

src/memory/memory-system.ts
  └── implements: IMemorySystem
  └── composes: IWorkingMemory, IEpisodicMemory, ISemanticMemory
  └── calls: src/agency-stability/identity-continuity.ts (updateNarrative)
```
