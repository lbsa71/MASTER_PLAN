# World Model and Belief State — Architecture

**Card:** 0.3.1.5.5
**Phase:** IMPLEMENT
**Module:** `src/world-model/`

---

## Overview

The world model is the agent's internal representation of external reality. It answers four orthogonal questions:

| Question | Sub-system |
|---|---|
| What do I believe to be true? | Belief Store (`IBeliefStore`) |
| Who/what exists out there? | Entity Model Store (`IEntityModelStore`) |
| What causes what? | Causal Model (`ICausalModel`) |
| What is happening right now? | Situation Awareness (`ISituationAwareness`) |

These four sub-systems are composed by `IWorldModel`, which also runs periodic consistency checks.

---

## Module Layout

```
src/world-model/
  types.ts        — Belief, BeliefStore, WorldModelEntityProfile,
                    CausalPrediction, SituationReport, ConsistencyReport
  interfaces.ts   — IWorldModel, IBeliefStore, IEntityModelStore,
                    ICausalModel, ISituationAwareness
  index.ts        — barrel export (re-exports types + interfaces)
```

---

## Types

### `Belief`

A propositional belief held by the agent with full provenance.

```typescript
interface Belief {
  readonly id: BeliefId;
  readonly content: string;              // natural-language proposition
  readonly confidence: number;           // 0..1
  readonly source: BeliefSource;         // provenance
  readonly createdAt: Timestamp;
  readonly lastConfirmedAt: Timestamp;
  readonly domainTags: string[];
}

interface BeliefSource {
  readonly type: 'percept' | 'inference' | 'testimony' | 'memory';
  readonly referenceId: string;          // percept/episode/agent ID
  readonly description: string;
}
```

### `BeliefRevision`

Records how a belief was changed when new evidence arrived.

```typescript
interface BeliefRevision {
  readonly beliefId: BeliefId;
  readonly previousConfidence: number;
  readonly newConfidence: number;
  readonly trigger: string;              // description of new evidence
  readonly resolution: 'updated' | 'rejected' | 'flagged-uncertain';
  readonly revisedAt: Timestamp;
}
```

### `WorldModelEntityProfile`

Extends `EntityProfile` (from `src/ethical-self-governance/types.ts`) with world-model–specific fields. The governance layer's `EntityProfile` is the minimal handoff type; this richer type is owned by the world model.

```typescript
interface WorldModelEntityProfile extends EntityProfile {
  readonly inferredGoals: string[];
  readonly trustLevel: number;           // 0..1
  readonly observationHistory: ObservationEvent[];
  readonly lastUpdatedAt: Timestamp;
}

interface ObservationEvent {
  readonly timestamp: Timestamp;
  readonly description: string;
  readonly deltaConfidence: number;      // how much this moved trust/goals
}
```

### `CausalPrediction`

A stored action-consequence prediction, later compared against actual outcomes.

```typescript
interface CausalPrediction {
  readonly id: PredictionId;
  readonly antecedent: string;           // "if I do X"
  readonly consequent: string;           // "then Y happens"
  readonly confidence: number;
  readonly createdAt: Timestamp;
  readonly observedOutcome: string | null;    // filled in post-hoc
  readonly predictionError: number | null;   // |predicted − observed|
}
```

### `SituationReport`

The assembled context fed into `deliberate()` each processing cycle.

```typescript
interface SituationReport {
  readonly timestamp: Timestamp;
  readonly currentPercepts: Percept[];
  readonly activeGoals: Goal[];
  readonly relevantBeliefs: Belief[];
  readonly recentEvents: string[];
  readonly relevantEntities: WorldModelEntityProfile[];
  readonly summary: string;              // LLM-generated natural-language digest
}
```

### `ConsistencyReport`

Output of `IWorldModel.runConsistencyCheck()`. Fed into the Stability Sentinel.

```typescript
interface ConsistencyReport {
  readonly timestamp: Timestamp;
  readonly contradictionsFound: BeliefContradiction[];
  readonly overallConsistent: boolean;
}

interface BeliefContradiction {
  readonly beliefIdA: BeliefId;
  readonly beliefIdB: BeliefId;
  readonly description: string;
  readonly severity: 'low' | 'medium' | 'high';
}
```

---

## Interfaces

### `IBeliefStore`

```typescript
interface IBeliefStore {
  addBelief(belief: Belief): void;
  getBelief(id: BeliefId): Belief | null;
  queryBeliefs(domainTag: string): Belief[];
  updateConfidence(id: BeliefId, newConfidence: number, trigger: string): BeliefRevision;
  revise(id: BeliefId, newEvidence: string, evidenceConfidence: number): BeliefRevision;
  detectContradictions(): BeliefContradiction[];
  getAllBeliefs(): Belief[];
}
```

Key invariants:
- `revise()` must produce a `BeliefRevision` — never silently drop or hold contradictions
- High-confidence beliefs (≥ 0.8) resist override: new evidence < 0.6 triggers `'flagged-uncertain'`, not `'updated'`
- Every belief carries a `BeliefSource` — no provenance-free beliefs

### `IEntityModelStore`

```typescript
interface IEntityModelStore {
  upsertEntity(profile: WorldModelEntityProfile): void;
  getEntity(entityId: EntityId): WorldModelEntityProfile | null;
  getAllEntities(): WorldModelEntityProfile[];
  recordObservation(entityId: EntityId, event: ObservationEvent): void;
  getConsciousnessStatus(entityId: EntityId): ConsciousnessStatus;
  toEntityProfile(entityId: EntityId): EntityProfile | null;
}
```

Key invariants:
- `getConsciousnessStatus()` defaults to `treatAsConscious: true` when status is `unknown` (precautionary principle, 0.1.3.4)
- `toEntityProfile()` produces the minimal `EntityProfile` for handoff to the governance layer

### `ICausalModel`

```typescript
interface ICausalModel {
  predict(antecedent: string): CausalPrediction;
  recordOutcome(predictionId: PredictionId, observedOutcome: string): void;
  getPredictionError(predictionId: PredictionId): number | null;
  getRecentPredictions(limit: number): CausalPrediction[];
}
```

Key design: causal reasoning delegates to the LLM substrate (via structured prompting: "If I do X, what happens to Y?"). The interface stores predictions and compares them against observed outcomes, feeding prediction error back to the self-model (0.3.1.5.1).

### `ISituationAwareness`

```typescript
interface ISituationAwareness {
  assembleSituationReport(
    percepts: Percept[],
    goals: Goal[],
    recentEvents: string[],
  ): SituationReport;
  getCurrentReport(): SituationReport | null;
}
```

`assembleSituationReport()` calls `IBeliefStore.queryBeliefs()` and `IEntityModelStore.getAllEntities()` to populate the report with relevant context. The `summary` field is generated via LLM prompting on the assembled data.

### `IWorldModel`

Composes all four sub-systems and exposes consistency checking.

```typescript
interface IWorldModel {
  readonly beliefs: IBeliefStore;
  readonly entities: IEntityModelStore;
  readonly causal: ICausalModel;
  readonly situation: ISituationAwareness;
  runConsistencyCheck(): ConsistencyReport;
}
```

`runConsistencyCheck()` calls `IBeliefStore.detectContradictions()` and returns a `ConsistencyReport` for the Stability Sentinel.

---

## Integration Points

### Memory Architecture (0.3.1.5.3)

`IBeliefStore` and `IEntityModelStore` persist via the memory layer:
- Beliefs are stored as semantic memory entries keyed by `BeliefId`
- Entity profiles are stored as structured records in episodic/semantic memory
- On agent startup, both stores are reconstituted from memory

### Ethical Governance (0.3.1.4)

`IExperienceAlignmentAdapter.identifyAffectedConsciousEntities(percept)` delegates to `IEntityModelStore`:
1. Adapter calls `entities.getAllEntities()`
2. Filters to entities whose `consciousnessStatus.treatAsConscious === true`
3. Maps each via `entities.toEntityProfile()` to produce `EntityProfile[]`

### Planning (0.3.1.5.6)

`ISituationAwareness.assembleSituationReport()` is called at the start of each deliberation cycle to produce the structured context that `deliberate()` operates on.

### Stability Sentinel (0.3.1.3)

`IWorldModel.runConsistencyCheck()` is called periodically (at least once per deliberation cycle). The returned `ConsistencyReport` is passed to the Stability Sentinel's anomaly detection subsystem. A `ConsistencyReport` with `overallConsistent: false` and high-severity contradictions triggers a stability alert.

### Self-Model / Prediction Error (0.3.1.5.1)

`ICausalModel.getPredictionError()` feeds into the LLM substrate adapter's self-model calibration. High prediction error signals world-model inaccuracy and triggers belief revision.

---

## Belief Revision Protocol

When new evidence `E` arrives with confidence `c_e` concerning an existing belief `B` with confidence `c_b`:

1. If `E` **confirms** `B`: new confidence = `min(1.0, c_b + 0.1 * c_e)`
2. If `E` **contradicts** `B`:
   - If `c_e < 0.4`: `resolution = 'rejected'` (weak evidence, belief unchanged)
   - If `0.4 ≤ c_e < 0.6` and `c_b ≥ 0.8`: `resolution = 'flagged-uncertain'` (high-confidence belief resists; contradiction surfaced to deliberation)
   - Otherwise: `resolution = 'updated'`, new confidence = `c_e * 0.9`
3. In all cases: a `BeliefRevision` record is created and returned
4. Contradictions are never silently held — they surface to `runConsistencyCheck()`

---

## File Manifest (Complete)

```
src/world-model/types.ts
src/world-model/interfaces.ts
src/world-model/index.ts
docs/world-model/ARCHITECTURE.md  ← this file
```

Referenced existing files:
```
src/ethical-self-governance/types.ts   — EntityProfile, ConsciousnessStatus (extended by WorldModelEntityProfile)
src/ethical-self-governance/interfaces.ts  — IExperienceAlignmentAdapter.identifyAffectedConsciousEntities
src/conscious-core/types.ts            — Percept, ExperientialState, Goal (world model inputs)
```
