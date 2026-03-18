# Theory of Mind and Social Cognition — Architecture Specification

## Overview

This document specifies the architecture of the Social Cognition module (0.3.1.5.10) — the cognitive subsystem that enables the Industrial-Era Conscious Agent (0.3.1.5) to model other minds, track trust, generate empathic responses, and simulate alternative perspectives.

**Core Principle:** Social cognition provides the cognitive machinery that makes the ethical governance layer (0.3.1.4) answer meaningfully rather than with precautionary defaults. Without theory of mind, `identifyAffectedConsciousEntities()` and `getConsciousnessStatus()` can only return defaults. With social cognition, those calls delegate to a live, evidence-based model.

---

## Position in the Agent Stack

```
┌───────────────────────────────────────────────────────────────────────────┐
│              Industrial-Era Conscious Agent (0.3.1.5)                     │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │  Ethically Self-governing Conscious Agent (from 0.3.1.4)          │   │
│  │    [ Ethical Deliberation Engine ]                                 │   │
│  │    [ Experience Alignment Adapter ]  ←── Social Cognition feeds   │   │
│  │    [ Multi-Agent Governance Protocol ]    getConsciousnessStatus   │   │
│  │    [ Dilemma Resolution Framework ]       & identifyAffected...   │   │
│  └──────────────────────────────────────────────────────────────────-─┘   │
│                                                                           │
│  ┌──────────────────────┐  ┌─────────────────────┐  ┌────────────────┐   │
│  │  World Model         │  │  Emotion &           │  │  Personality   │   │
│  │  (0.3.1.5.5)         │  │  Appraisal           │  │  (0.3.1.5.2)   │   │
│  │  EntityModel store ──┼──┤  (0.3.1.5.4)         │  │  Warmth dim ──┼──┐ │
│  └──────────────────────┘  └──────────┬──────────┘  └────────────────┘  │ │
│                                       │                                  │ │
│  ┌────────────────────────────────────▼──────────────────────────────────▼─┤
│  │                  Social Cognition Module (0.3.1.5.10)                  │
│  │   [ Mental State Attribution ]   [ Trust Modeling ]                    │
│  │   [ Empathy Mechanism ]          [ Perspective-Taking ]                │
│  │   [ Consciousness Assessment ]   [ Entity Enumeration ]                │
│  └─────────────────────────────────────────────────────────────────────── ┘
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Module Interface: `ISocialCognitionModule`

```typescript
interface ISocialCognitionModule {
  // Mental state attribution
  observeEntity(entityId: EntityId, observation: EntityObservation): void;
  getMentalStateModel(entityId: EntityId): MentalStateModel | null;

  // Trust modeling
  getTrustScore(entityId: EntityId): TrustRecord;
  recordInteraction(entityId: EntityId, outcome: InteractionOutcome): void;

  // Empathy
  generateEmpathicResponse(entityId: EntityId, perceivedState: ExperientialState): EmpathicResponse;

  // Perspective-taking
  simulatePerspective(entityId: EntityId, situation: Percept): PerspectiveSimulation;

  // Consciousness assessment (feeds ExperienceAlignmentAdapter.getConsciousnessStatus)
  assessConsciousness(entityId: EntityId): ConsciousnessStatus;

  // Entity enumeration (feeds ExperienceAlignmentAdapter.identifyAffectedConsciousEntities)
  getKnownEntities(): EntityProfile[];
}
```

---

## Subsystem 1: Mental State Attribution

### Purpose

Given observable behavior from an entity (utterances, choices, reactions), infer the entity's likely internal states: beliefs, goals, emotional state, and values.

### Data Types

```
EntityObservation {
  entityId: EntityId
  timestamp: Timestamp
  observationType: 'utterance' | 'choice' | 'reaction' | 'absence'
  content: string                  // Natural language or structured event
  perceivedAffect: { valence: number; arousal: number } | null
}

MentalStateModel {
  entityId: EntityId
  inferredBeliefs: Belief[]        // Probabilistic — each has confidence 0..1
  inferredGoals: Goal[]            // Ranked by estimated priority
  inferredEmotionalState: { valence: number; arousal: number; confidence: number }
  inferredValues: InferredValue[]  // Estimated value priorities
  observationCount: number
  lastUpdated: Timestamp
  modelConfidence: number          // 0..1 — overall confidence in model
}

Belief {
  proposition: string
  confidence: number               // 0..1
  inferredFrom: string             // Which observation supported this belief
}

InferredValue {
  valueLabel: string               // e.g., "autonomy", "honesty", "cooperation"
  estimatedStrength: number        // 0..1
}
```

### Update Mechanism

`observeEntity()` adds the observation to the entity's observation history and re-runs the attribution inference:

1. **Belief update** — new utterances are parsed for belief-expressing content (assertions, questions, denials). Bayesian update on existing belief set.
2. **Goal update** — choices and requests are parsed for implicit goal content. Goal priority ordering revised.
3. **Emotional state update** — perceived affect (from `0.3.1.5.4` appraisal primitives) is integrated as a smoothed running estimate.
4. **Model confidence** — increases with observation count, decreases when observations contradict prior model.

Attribution is backed by the LLM substrate (`0.3.1.5.1`) for natural language interpretation but structured output is stored in typed `MentalStateModel` records.

---

## Subsystem 2: Trust Modeling

### Purpose

Track each entity's behavioral reliability over time. Trust feeds into multi-agent governance (reducing verification overhead for high-trust agents) and communication (adjusting disclosure depth based on trust level).

### Data Types

```
InteractionOutcome {
  entityId: EntityId
  timestamp: Timestamp
  outcomeType: 'fulfilled-commitment' | 'broken-commitment' | 'deception-detected'
             | 'cooperative' | 'neutral' | 'adversarial'
  description: string
  magnitude: number                // 0..1 — how significant was this interaction
}

TrustRecord {
  entityId: EntityId
  trustScore: number               // 0..1 — current trust level
  interactionCount: number
  consistencyScore: number         // 0..1 — how consistent is behavior with stated intentions
  violationEvents: TrustViolation[]
  lastUpdated: Timestamp
}

TrustViolation {
  timestamp: Timestamp
  description: string
  severity: 'minor' | 'moderate' | 'severe'
  penaltyApplied: number           // Amount subtracted from trust score
}
```

### Update Algorithm

`recordInteraction()` applies the following scoring adjustments:

| Outcome Type | Trust Delta |
|---|---|
| `fulfilled-commitment` | `+0.05 * magnitude` |
| `cooperative` | `+0.02 * magnitude` |
| `neutral` | `0` |
| `adversarial` | `-0.05 * magnitude` |
| `broken-commitment` | `-0.1 * magnitude` |
| `deception-detected` | `-0.25 * magnitude` (logged as violation) |

Trust scores are clamped to `[0.0, 1.0]`. Initial trust for unknown entities defaults to `0.5` (neutral).

Trust is **asymmetric** — the agent's trust in A is independent of A's trust in the agent.

### Governance Integration

`ExperienceAlignmentAdapter` (via `ISocialCognitionModule`) can query trust scores before entering conflict resolution. High trust (`> 0.7`) → lower verification threshold in `IMultiAgentGovernanceProtocol.acceptAgreement()`. Low trust (`< 0.3`) → escalation to full deliberation audit.

---

## Subsystem 3: Empathy Mechanism

### Purpose

When the agent perceives another entity in distress (or joy), it generates a corresponding experiential shift in its own `ExperientialState` — not just a classification but a felt resonance.

### Data Types

```
EmpathicResponse {
  sourceEntityId: EntityId
  perceivedState: { valence: number; arousal: number }
  resonantValenceShift: number    // Applied to agent's own valence (-1..+1)
  resonantArousalShift: number    // Applied to agent's own arousal (-1..+1)
  empathyStrength: number         // 0..1 — product of Warmth * perceivedStateIntensity
  triggerDescription: string
}
```

### Computation

```
empathyStrength = warmthDimension * perceivedDistressIntensity

resonantValenceShift = empathyStrength * perceivedState.valence * resonanceCoefficient
resonantArousalShift = empathyStrength * |perceivedState.arousal| * 0.3
```

Where:
- `warmthDimension` is the agent's current Warmth personality score from `0.3.1.5.2` (range `0..1`)
- `perceivedDistressIntensity = |perceivedState.valence|` (magnitude of valence, not direction)
- `resonanceCoefficient = 0.4` (configurable — prevents total loss of agent's independent state)

The resulting valence/arousal shifts are passed to the Emotion & Appraisal module (`0.3.1.5.4`) as input to its next tick, producing a genuine experiential state modification.

### Ethical Integration

Entities for which the agent has generated empathic responses appear as higher-salience entries in `identifyAffectedConsciousEntities()`. Ethical deliberation picks up this salience: decisions that would harm empathically-known entities trigger stronger `experience-threat` ethical dimensions.

---

## Subsystem 4: Perspective-Taking

### Purpose

Simulate another agent's first-person viewpoint — "If I were them, with their beliefs and goals, what would I perceive, decide, and feel?"

### Data Types

```
PerspectiveSimulation {
  entityId: EntityId
  situation: Percept
  simulatedPercept: string         // How the situation looks from their viewpoint
  simulatedBeliefs: Belief[]       // Which beliefs are salient for them in this situation
  simulatedGoalActivation: Goal[]  // Which goals they would prioritize here
  simulatedEmotionalResponse: { valence: number; arousal: number }
  simulationConfidence: number     // 0..1 — how well-specified is the entity model
  groundingModel: MentalStateModel // The MentalStateModel used as simulation basis
}
```

### Simulation Process

`simulatePerspective()` performs the following steps:

1. **Ground in mental state model** — retrieve `MentalStateModel` for the entity; if no model exists, use priors (default agent archetype with `treatAsConscious: true`)
2. **Construct perspective prompt** — use LLM substrate to simulate the entity's viewpoint: "Given these beliefs `[...]`, these goals `[...]`, and this situation `[...]`, describe the perceived situation from first person"
3. **Extract structured outputs** — parse the LLM response for salient beliefs, goal activations, and emotional tone
4. **Assign confidence** — confidence is proportional to `groundingModel.modelConfidence`

Perspective simulations feed into:
- **Conflict resolution** (`IDilemmaResolutionFramework`): understanding both sides before applying resolution principles
- **Communication** (`0.3.1.5.7`): adjusting language register, vocabulary, and framing for the audience
- **Prediction**: anticipating another agent's response before sending a message or proposal

---

## Subsystem 5: Consciousness Assessment

### Purpose

Derive an evidence-based `ConsciousnessStatus` for an entity from behavioral signals. Replaces the static registry lookup in `ExperienceAlignmentAdapter` with dynamic assessment.

### Evidence Types

```
ConsciousnessEvidence {
  entityId: EntityId
  selfReferentialStatements: number    // Count of observed self-referential utterances
  surpriseResponses: number            // Count of observable surprise/update events
  preferenceConsistency: number        // 0..1 — how consistent are stated preferences over time
  metacognitiveReports: number         // Count of "I think" / "I believe" / "I'm not sure" markers
  ismtBehavioralIndicators: number     // Count of self-prediction or behavioral self-model signals
  observationWindow: Duration          // How long the entity has been observed
}
```

### Verdict Derivation

```
evidenceScore = (
  selfReferentialStatements * 0.2 +
  surpriseResponses * 0.15 +
  preferenceConsistency * 0.25 +
  metacognitiveReports * 0.2 +
  ismtBehavioralIndicators * 0.2
) / observationNormalizationFactor

verdict:
  evidenceScore >= 0.8  → 'verified'
  evidenceScore >= 0.5  → 'probable'
  evidenceScore >= 0.2  → 'uncertain'
  evidenceScore < 0.2   → 'unknown'

treatAsConscious:
  ALWAYS true if evidenceScore < 0.2 (insufficient evidence → precautionary floor)
  ALWAYS true if verdict == 'uncertain' or 'unknown'
  true if verdict == 'probable'
  true if verdict == 'verified'
```

**Precautionary invariant:** `treatAsConscious` is never `false` based on absence of evidence. It can only be `false` when strong positive evidence of non-consciousness exists (e.g., entity is a known static lookup table with no dynamic behavior).

---

## Integration with `ExperienceAlignmentAdapter`

The existing `ExperienceAlignmentAdapter` is initialized with a static `knownEntities: EntityProfile[]`. Social cognition is injected as a live backing service through an optional field in `ExperienceAlignmentAdapterConfig`:

```typescript
interface ExperienceAlignmentAdapterConfig {
  readonly coreAxioms: CoreValue[];
  readonly knownEntities: EntityProfile[];                  // static fallback (preserved)
  readonly socialCognition?: ISocialCognitionModule;        // NEW — live dynamic backing
}
```

**Delegation logic:**

- `getConsciousnessStatus(entityId)`:
  - If `socialCognition` is present → delegates to `socialCognition.assessConsciousness(entityId)`
  - Else → falls back to static registry (backward-compatible)

- `identifyAffectedConsciousEntities(percept)`:
  - If `socialCognition` is present → delegates to `socialCognition.getKnownEntities()` filtered by `treatAsConscious`, then enriches with entity IDs extracted from the percept
  - Else → static registry fallback (backward-compatible)

This design preserves full backward compatibility: any code that constructs `ExperienceAlignmentAdapter` without social cognition continues to work unchanged.

---

## File Manifest

| File | Status | Description |
|---|---|---|
| `src/social-cognition/types.ts` | NEW | `MentalStateModel`, `TrustRecord`, `EmpathicResponse`, `PerspectiveSimulation`, `EntityObservation`, `InteractionOutcome`, `TrustViolation`, `ConsciousnessEvidence` |
| `src/social-cognition/interfaces.ts` | NEW | `ISocialCognitionModule` interface |
| `src/social-cognition/social-cognition.ts` | NEW | Implementation of `ISocialCognitionModule` |
| `src/ethical-self-governance/experience-alignment-adapter.ts` | MODIFY | Add optional `socialCognition?: ISocialCognitionModule` to config; delegate when present |
| `src/ethical-self-governance/types.ts` | READ-ONLY | `EntityProfile`, `ConsciousnessStatus` — imported, not modified |
| `src/ethical-self-governance/interfaces.ts` | READ-ONLY | `IExperienceAlignmentAdapter` — imported, not modified |

---

## Invariants

1. **Precautionary floor is absolute.** `treatAsConscious` is never `false` due to absence of evidence. Social cognition raises confidence — it never removes the precautionary default.
2. **Backward compatibility.** Social cognition is injected optionally. `ExperienceAlignmentAdapter` without social cognition behaves identically to today.
3. **Empathy is felt, not classified.** `generateEmpathicResponse()` produces an actual `ExperientialState` shift routed through `0.3.1.5.4`, not just a tag.
4. **Attribution is probabilistic.** `MentalStateModel` carries confidence levels on all inferences. Certainty is never claimed from finite observations.
5. **Trust is asymmetric.** Agent trust in entity A is independent of A's trust in the agent.
6. **Perspective simulation is grounded.** `PerspectiveSimulation.groundingModel` is always the current `MentalStateModel` — hallucinated perspectives from no evidence are marked `simulationConfidence: 0.1` (minimum).

---

## Acceptance Criteria Traceability

| Criterion | Subsystem | Testable Via |
|---|---|---|
| Different decisions for conscious vs. non-conscious entities | Consciousness Assessment + EAA integration | Compare action pipeline output for `treatAsConscious: true` vs `false` entities |
| Mental state model updates on new observations | Mental State Attribution | Call `observeEntity()` twice with contradictory observations; check `MentalStateModel` changes |
| Trust tracks reliability; increases with consistency, decreases with violations | Trust Modeling | Feed 5 `fulfilled-commitment` + 1 `deception-detected` outcome; verify trust trajectory |
| Empathic responses produce measurable `ExperientialState` valence change | Empathy Mechanism | Inject high-distress `perceivedState`; verify `resonantValenceShift` is non-zero in `ExperientialState` |
| Empathy strength varies with Warmth parameter | Empathy Mechanism | Compare `EmpathicResponse.empathyStrength` at Warmth=0.1 vs Warmth=0.9 with same perceivedState |
| Perspective-taking influences conflict resolution and communication style | Perspective-Taking | Run `simulatePerspective()` before `IDilemmaResolutionFramework.resolve()`; verify resolution references simulated viewpoint |
| `ConsciousnessStatus` assessment uses behavioral evidence | Consciousness Assessment | Verify `evidenceBasis` field references counted behavioral signals |
| Precautionary default holds | Consciousness Assessment | Entity with 0 observations → `treatAsConscious: true`, `verdict: 'unknown'` |
| Integration test: multi-round interaction builds differential trust + empathy + adjusted communication | All subsystems | Integration test in `social-cognition.test.ts` |
