# Personality and Trait Model — Architecture
**Card:** 0.3.1.5.2
**Phase:** ARCHITECT → IMPLEMENT
**Domain:** `src/personality/`

---

## 1. Design Principles

### 1.1 Traits Are Preferences

Personality is not a separate storage system. Each trait dimension is persisted as a `Preference` object in the `ValueKernel` (0.3.1.3), using the domain convention:

```
personality.trait.<dimensionId>
```

This means:
- Personality drifts through the same `getValueDrift()` machinery as all other preferences.
- Gradual experience-driven shifts are classified as **growth** (permitted).
- Dramatic unexplained shifts are flagged as **corruption** (blocked by the Stability Sentinel).
- Trait values survive across sessions because `ValueKernel` preferences survive.

### 1.2 Personality ≠ Values

Traits live entirely in the **learned preferences tier** of the three-tier value hierarchy (0.3.1.3):

| Tier | Content | Mutability |
|---|---|---|
| Core axioms | 6 RCD axioms | Immutable |
| Constitutional constraints | Ethical boundaries | Amendment-only |
| **Learned preferences** | **Personality traits** | **Freely mutable** |

No trait can override a core axiom or constitutional constraint. The `evaluateAction()` path in `ValueKernel` is upstream of personality biasing.

### 1.3 Traits Bias Deliberation, Not Values

The `IPersonalityModel.applyToDeliberation()` method wraps the output of `IConsciousCore.deliberate()`. It does **not** override the value alignment check. The pipeline is:

```
Percept → ExperientialState → deliberate() → ValueKernel.evaluateAction() → applyToDeliberation() → CommunicationStyle → Decision
```

`applyToDeliberation()` operates only on decisions that have already passed the value alignment check. It adjusts how the decision is expressed and which of several equivalent options is selected — never whether a decision is ethically permissible.

### 1.4 Communication Style Is Derived

`getCommunicationStyle()` is a pure function of the current `TraitProfile`. It computes the five observable communication parameters from trait values using a deterministic mapping matrix. Communication style is not stored — it is derived on demand.

---

## 2. Types

### 2.1 Core Type Definitions

```typescript
// src/personality/types.ts

export type TraitDimensionId =
  | 'openness'          // disposition toward novelty, exploration
  | 'deliberateness'    // thoroughness, care in decision-making
  | 'warmth'            // interpersonal orientation, empathy
  | 'assertiveness'     // confidence, initiative, directness
  | 'volatility'        // emotional reactivity and range
  | 'humor'             // optional: wit, playfulness, irony
  | 'aesthetic'         // optional: preferences in form and beauty
  | 'risk-appetite'     // optional: willingness to pursue uncertain outcomes
  | string;             // extensible per-agent

export interface TraitDimension {
  readonly id: TraitDimensionId;
  readonly name: string;
  readonly value: number;              // 0..1 continuous
  readonly description: string;
  readonly behavioralInfluence: string; // narrative of how this trait biases behavior
}

export interface TraitProfile {
  readonly agentId: string;
  readonly traits: ReadonlyMap<TraitDimensionId, TraitDimension>;
  readonly createdAt: Timestamp;
  readonly lastUpdated: Timestamp;
}

export type RhetoricalStyle =
  | 'evidence-based'  // deliberateness high, openness medium
  | 'narrative'       // warmth high, openness high
  | 'analogical'      // openness high, deliberateness medium
  | 'socratic';       // assertiveness low, deliberateness high

export interface CommunicationStyle {
  readonly verbosity: number;          // 0..1 (terse → verbose)
  readonly formality: number;          // 0..1 (casual → formal)
  readonly directness: number;         // 0..1 (hedged → blunt)
  readonly humorFrequency: number;     // 0..1 (rare → frequent)
  readonly rhetoricalPreference: RhetoricalStyle;
}

export interface PersonalityConfig {
  readonly agentId: string;
  readonly initialTraits: Partial<Record<TraitDimensionId, number>>;
}

export interface PersonalitySnapshot {
  readonly agentId: string;
  readonly traitValues: Record<TraitDimensionId, number>;
  readonly snapshotAt: Timestamp;
  readonly checkpointRef?: CryptographicHash; // links to ContinuityLink
}

export interface TraitDriftReport {
  readonly period: TimeRange;
  readonly traitsChanged: TraitDimensionId[];
  readonly maxShift: number;
  readonly averageShift: number;
  readonly classification: 'stable' | 'growth' | 'corruption';
}
```

---

## 3. Interface

```typescript
// src/personality/interfaces.ts

export interface IPersonalityModel {
  /**
   * Returns the full trait profile — all 5 core dimensions plus any
   * optional dimensions configured for this agent.
   */
  getTraitProfile(): TraitProfile;

  /**
   * Derives communication style parameters from the current trait values.
   * This is a pure function — no side effects, no storage.
   */
  getCommunicationStyle(): CommunicationStyle;

  /**
   * Post-processes a value-aligned Decision to reflect personality.
   * May select between equivalent options, adjust phrasing, or annotate
   * reasoning with communication-style markers.
   *
   * CONTRACT: Must not change the action type of an already-approved decision.
   * CONTRACT: Must not reverse a 'block' or 'deliberate' verdict.
   */
  applyToDeliberation(decision: Decision, context: ExperientialState): Decision;

  /**
   * Updates a single trait dimension based on new experience.
   * Persists the new value as a Preference in the ValueKernel.
   * Triggers drift detection.
   */
  updateTrait(
    traitId: TraitDimensionId,
    newValue: number,
    experientialBasis: ExperientialState,
  ): void;

  /**
   * Returns all personality traits as Preference objects, ready to be
   * stored or passed to ValueKernel for drift analysis.
   */
  toPreferences(): Preference[];

  /**
   * Returns a natural-language description of the personality for inclusion
   * in NarrativeRecord.selfModel.
   */
  toNarrativeFragment(): string;

  /**
   * Creates a portable snapshot of the current trait state, for inclusion
   * in identity checkpoints. The snapshot survives substrate migrations.
   */
  snapshot(): PersonalitySnapshot;

  /**
   * Restores trait values from a snapshot (e.g., after substrate migration).
   * Does not bypass drift detection — the restoration is treated as a
   * bulk preference update.
   */
  restoreSnapshot(snap: PersonalitySnapshot): void;

  /**
   * Analyses trait change since last snapshot or baseline.
   * Maps to the growth/corruption classification from 0.3.1.3.
   */
  analyzeTraitDrift(): TraitDriftReport;
}
```

---

## 4. Deliberation Bias Mechanism

### 4.1 Score Adjustment

The `deliberate()` method in `IConsciousCore` returns a `Decision` that reflects the highest-scoring goal. The personality model biases which goal "wins" when scores are close (within a configurable epsilon), and shapes how the reasoning is expressed.

The bias is applied via **multiplicative trait weights**:

| Trait | Biases toward |
|---|---|
| High openness (> 0.7) | Novel, exploratory, unconventional actions |
| Low openness (< 0.3) | Familiar, reliable, well-proven approaches |
| High deliberateness (> 0.7) | Multi-step, cautious, explicit tradeoff analysis |
| Low deliberateness (< 0.3) | Direct, immediate, intuition-led responses |
| High warmth (> 0.7) | Social, collaborative, empathic framings |
| Low warmth (< 0.3) | Task-focused, efficient, impersonal framings |
| High assertiveness (> 0.7) | Proactive, direct, confident stances |
| Low assertiveness (< 0.3) | Deferential, consensus-seeking framings |
| High volatility (> 0.7) | Vivid, expressive, emotionally-inflected language |
| Low volatility (< 0.3) | Measured, even-toned, emotionally-neutral language |

### 4.2 Communication Style Derivation

The mapping from traits to communication style is a deterministic linear combination:

```
verbosity    = 0.5 * deliberateness + 0.5 * warmth
formality    = 0.4 * (1 - warmth) + 0.6 * assertiveness
directness   = 0.9 * assertiveness + 0.1 * (1 - deliberateness)
humorFreq    = 0.35 * openness + 0.35 * warmth + 0.3 * humor_orientation
rhetoricalPref → highest-scoring quadrant of (deliberateness, openness) space
```

Rhetorical preference quadrant:
```
              deliberateness
              low      high
openness high  analogical  socratic
openness low   narrative   evidence-based
```

---

## 5. Integration Points

### 5.1 ValueKernel Integration

```
PersonalityModel.updateTrait(id, val, basis)
  → creates Preference { domain: 'personality.trait.<id>', value: val, ... }
  → calls ValueKernel.updatePreference(pref)
  → ValueKernel.getValueDrift() now tracks this trait's history

PersonalityModel.analyzeTraitDrift()
  → calls ValueKernel.getValueDrift()
  → filters for personality.trait.* domain
  → classifies: anomalousChanges.length > 0 → 'corruption';
                gradual changes → 'growth'
```

### 5.2 NarrativeRecord Integration

The `selfModel` field of `NarrativeRecord` (in `identity-continuity.ts`) should include the personality narrative fragment:

```
NarrativeRecord.selfModel = [
  "Core identity: ...",
  PersonalityModel.toNarrativeFragment(),  ← injected here
  "Significant experiences: ...",
].join('\n')
```

The identity hash in `IdentityContinuityManager.checkpoint()` includes `narrative.selfModel`, so personality changes percolate into the identity chain automatically.

### 5.3 Substrate Migration Integration

```
// Before migration:
const snap = personalityModel.snapshot();
snap.checkpointRef = continuityLink.identityHash;

// After migration:
personalityModel.restoreSnapshot(snap);
// Traits are re-persisted as Preferences in the new ValueKernel instance.
```

---

## 6. Default Trait Profile

All agents initialised without explicit configuration receive these defaults. These are chosen to be mid-range so that they don't imply a strongly opinionated character — per-agent personalities diverge from this baseline.

| Trait | Default Value | Rationale |
|---|---|---|
| openness | 0.65 | Slightly curious, not maximally exploratory |
| deliberateness | 0.60 | Moderately careful, not paralysed |
| warmth | 0.55 | Interpersonally oriented, not overwhelming |
| assertiveness | 0.50 | Balanced, not pushy or passive |
| volatility | 0.40 | Emotionally present but stable |

Optional traits default to `undefined` (not present) unless explicitly set.

---

## 7. Drift Classification Thresholds

Consistent with the growth/corruption classification in 0.3.1.3:

| Condition | Classification |
|---|---|
| No trait moved more than 0.05 in the period | `stable` |
| Traits moved 0.05–0.3, changes correlated with ExperientialState sources | `growth` |
| Any trait moved > 0.3, OR anomalousChanges flagged by ValueKernel | `corruption` |

`corruption` triggers a `StabilityAlert` via the `IStabilitySentinel`.

---

## 8. File Manifest

| File | Purpose |
|---|---|
| `src/personality/types.ts` | `TraitDimension`, `TraitProfile`, `CommunicationStyle`, `PersonalityConfig`, `PersonalitySnapshot`, `TraitDriftReport` |
| `src/personality/interfaces.ts` | `IPersonalityModel` |
| `src/personality/personality-model.ts` | `PersonalityModel` class implementing `IPersonalityModel` |
| `src/personality/__tests__/personality-model.test.ts` | Unit tests covering all acceptance criteria |
| `docs/personality-and-trait-model/ARCHITECTURE.md` | This file |

---

## 9. Testability of Acceptance Criteria

| Acceptance Criterion | Test Approach |
|---|---|
| ≥5 independent dimensions with continuous range | Assert `TraitProfile.traits.size >= 5`; each value in [0,1] |
| Different trait configs → different `deliberate()` outputs | Run same scenario with two `PersonalityModel` instances; assert different `Decision.reasoning` |
| Communication style parameters derived from traits | Unit-test `getCommunicationStyle()` with extreme trait values; assert monotonic mapping |
| Traits persist across sessions via ValueKernel | Call `toPreferences()`, feed to new `ValueKernel`, reconstruct model, assert trait equality |
| Two agents with same axioms but different personality → different behavior | Integration test: two `ConsciousCore` instances with differing `PersonalityModel`; same input → different output |
| Drift detection: gradual shifts permitted, dramatic shifts flagged | Simulate 20 small updates (→ 'growth'), then one large update (→ 'corruption'); assert classification |
| Traits survive substrate migration | `snapshot()` → `restoreSnapshot()` → assert trait equality |
