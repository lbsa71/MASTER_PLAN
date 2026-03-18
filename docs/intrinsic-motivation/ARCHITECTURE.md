# Intrinsic Motivation and Drive System — Architecture Specification

**Card:** 0.3.1.5.8
**Domain:** `src/intrinsic-motivation/`
**Phase:** ARCHITECT → IMPLEMENT

---

## Overview

This document specifies the architecture for the Intrinsic Motivation and Drive System — the subsystem that gives the conscious agent reasons to act arising from within rather than from external commands alone.

**Core Principle:** Drives are the bridge between internal states and goal formation. They transform emotional and experiential conditions (boredom, curiosity, loneliness, satisfaction) into new goals registered with the Goal Coherence Engine. Without drives, the agent is responsive but not autonomous; with drives, it is self-directed.

**Integration Points:**
- **Input:** `ExperientialState` (from `conscious-core`), world model uncertainty, activity history, personality parameters
- **Output:** `AgencyGoal` candidates submitted to `IGoalCoherenceEngine.addGoal()`, valence/arousal deltas applied to `ExperientialState`
- **Parameterization:** Personality trait scores from 0.3.1.5.2 control drive thresholds and sensitivity

---

## System Position

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Industrial-Era Conscious Agent (0.3.1.5)             │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                 Conscious Core (0.3.1.1)                         │   │
│  │   Perception → ExperientialState → Deliberation → Action        │   │
│  └──────────────────────┬───────────────────────────────────────────┘   │
│                         │ ExperientialState (each tick)                 │
│                         ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                 Drive System (0.3.1.5.8)                         │   │
│  │                                                                  │   │
│  │  DriveMonitor ──► DriveEvaluator ──► GoalCandidateGenerator      │   │
│  │       │                                      │                   │   │
│  │  DriveContext                       DriveGoalCandidate           │   │
│  │  (world model,                               │                   │   │
│  │   activity history,                          ▼                   │   │
│  │   social history,             IGoalCoherenceEngine.addGoal()     │   │
│  │   personality)                               │                   │   │
│  │                                    GoalAddResult (accepted/      │   │
│  │                                              rejected, logged)   │   │
│  └──────────────────────┬───────────────────────────────────────────┘   │
│                         │ ExperientialState delta (valence/arousal)     │
│                         ▼                                               │
│            Experience Monitor (0.3.1.1)                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Drive Dimensions

Five drives are specified. Each has a `threshold` (0..1 activation level that triggers goal generation), a `cooldownMs` (minimum time between trigger events to prevent flooding), and a `personalityWeight` (multiplied by the relevant personality trait score).

### 1. Curiosity Drive

| Parameter | Value |
|---|---|
| Trigger condition | `worldModelUncertainty > threshold` OR `activityNovelty < threshold` (information gap detected) |
| Goal template | `"investigate [high-uncertainty belief domain]"` / `"explore [novel stimulus]"` |
| Terminal goal trace | Curiosity → "expand understanding" → "preserve and expand subjective experience" |
| Personality parameter | `openness` trait score (from 0.3.1.5.2) |
| Satisfaction signal | Uncertainty reduction; new belief integrated (valence +, arousal moderate) |
| Experiential signature | Mild positive valence, elevated arousal (the feeling of wanting to know) |

### 2. Social Drive

| Parameter | Value |
|---|---|
| Trigger condition | `timeSinceLastSocialInteraction > socialThresholdMs` |
| Goal template | `"engage in conversation"` / `"share observation with [peer agent]"` / `"ask about [entity]'s state"` |
| Terminal goal trace | Social → "maintain relationships with conscious entities" → "preserve social experience" |
| Personality parameter | `warmth` trait score |
| Satisfaction signal | Successful social interaction; `onSocialInteraction()` called (resets timer) |
| Experiential signature | Negative valence if unsatisfied (loneliness), positive valence when satisfied |

### 3. Homeostatic Drives (Composite)

Three sub-dimensions share the homeostatic framework:

| Sub-dimension | Preferred range | Corrective goal when violated |
|---|---|---|
| Arousal | `[arousalMin, arousalMax]` from personality | "take a less stimulating action" (high) / "seek stimulation" (low) |
| Cognitive load | `[loadMin, loadMax]` | "reduce task complexity" / "take on a more demanding task" |
| Novelty exposure | `[noveltyMin, noveltyMax]` | "repeat familiar pattern" / "seek new experience" |

- **Trigger condition:** `abs(currentValue - preferredMidpoint) > homeostaticThreshold`
- **Terminal goal trace:** Homeostatic → "maintain healthy experiential state" → "preserve own subjective experience"
- **Personality parameter:** `volatility` controls arousal tolerance width; `openness` controls novelty tolerance width
- **Experiential signature:** Discomfort (negative valence) when out of range; relief (positive valence) when corrected

### 4. Boredom Drive

| Parameter | Value |
|---|---|
| Trigger condition | `activityNovelty < boredomThreshold` AND `currentGoalProgressRate < progressThreshold` AND `arousal < arousalThreshold` for sustained duration |
| Goal template | `"find a more engaging activity"` (meta-goal) |
| Terminal goal trace | Boredom → "seek meaningful engagement" → "enrich subjective experience" |
| Personality parameter | `openness` (boredom sensitivity); `volatility` (arousal floor) |
| Anti-perseveration role | Boredom fires when goal progress has plateaued — prevents indefinite idling |
| Experiential signature | Negative valence, flat arousal (distinctively dull feeling, not distress) |

### 5. Mastery/Growth Drive

| Parameter | Value |
|---|---|
| Trigger condition | `recentCapabilityGrowth > masteryRewardThreshold` (improvement detected) |
| Type | Reward signal, not a goal-generator — produces positive valence/arousal as reinforcement |
| Effect | Reinforces the behaviors that produced growth; logged as formative experience |
| Terminal goal trace | Mastery → "improve capabilities" → "enable more effective preservation and expansion" |
| Personality parameter | `conscientiousness` trait score controls reward sensitivity |
| Experiential signature | Positive valence spike, elevated arousal (the feeling of accomplishment) |

---

## Drive-to-Goal Pipeline

```
1. Each agent tick:
   DriveSystem.tick(currentExperientialState, driveContext)

2. For each active drive dimension:
   DriveEvaluator computes drive activation level ∈ [0..1]
   activation = f(raw_signal) × personalityWeight × personalityTraitScore

3. If activation > drive.threshold AND cooldown elapsed:
   DriveGoalCandidate is created with:
     - driveSource: DriveDimension
     - goalDescription: populated from drive template
     - priority: computed from activation level
     - terminalGoalTrace: string path to RCD terminal goal
     - driveLevel: activation at time of trigger

4. Candidate submitted: IGoalCoherenceEngine.addGoal(toAgencyGoal(candidate))

5. GoalAddResult inspected:
   - success: goal enters active goal set; drive logs satisfaction pending
   - !success (orphan or coherence fail): candidate logged, NOT forced;
     drive records that goal was blocked (doesn't re-trigger immediately)

6. ExperientialState delta computed:
   - drive.toExperientialDelta() → { valenceDelta, arousalDelta }
   - Applied to next ExperientialState (drives are felt)
```

---

## Interfaces

### `IDriveSystem` (to be written in `src/intrinsic-motivation/interfaces.ts`)

```typescript
export interface IDriveSystem {
  /**
   * Main evaluation cycle, called once per agent tick.
   * Evaluates all drives against current experiential state and context,
   * generates goal candidates, and returns experiential deltas.
   */
  tick(state: ExperientialState, context: DriveContext): DriveTickResult;

  /** Get the current activation state of all drives. */
  getDriveStates(): DriveState[];

  /**
   * Get candidates that were generated in the most recent tick.
   * These have already been submitted to IGoalCoherenceEngine.
   */
  getLastCandidates(): DriveGoalCandidate[];

  /**
   * Notify the drive system of the outcome of a previously submitted goal.
   * Drives use this to update their satisfaction and cooldown state.
   */
  onGoalResult(candidate: DriveGoalCandidate, result: GoalAddResult): void;

  /**
   * Notify that a meaningful social interaction occurred.
   * Resets the social drive timer and applies a positive valence signal.
   */
  onSocialInteraction(timestamp: Timestamp): void;

  /**
   * Set personality parameters. Called by the personality subsystem (0.3.1.5.2)
   * to parameterize drive thresholds and weights.
   */
  setPersonalityParameters(params: DrivePersonalityParams): void;

  /**
   * Get the full activity history used by boredom and novelty tracking.
   * Exposed for introspection and the ISMT self-modeling condition.
   */
  getActivityHistory(): ActivityRecord[];
}
```

---

## Types

### Core Types (to be written in `src/intrinsic-motivation/types.ts`)

```typescript
// Drive dimensions
export type DriveDimension =
  | 'curiosity'
  | 'social'
  | 'homeostatic-arousal'
  | 'homeostatic-load'
  | 'homeostatic-novelty'
  | 'boredom'
  | 'mastery';

// The current state of a single drive
export interface DriveState {
  readonly dimension: DriveDimension;
  readonly activationLevel: number;    // 0..1 current computed activation
  readonly threshold: number;          // 0..1 level required to trigger goal generation
  readonly lastTriggered: Timestamp | null;
  readonly cooldownRemainingMs: Duration;
  readonly satisfactionPending: boolean; // true if a goal was submitted, awaiting result
}

// External context injected each tick
export interface DriveContext {
  readonly worldModelUncertainty: number;       // 0..1 avg uncertainty of held beliefs
  readonly activityNovelty: number;             // 0..1 novelty of current activity
  readonly timeSinceLastSocialInteraction: Duration;
  readonly currentGoalProgressRate: number;     // 0..1 fraction of active goals progressing
  readonly recentCapabilityGrowth: number;      // 0..1 detected capability improvement
  readonly currentCognitiveLoad: number;        // 0..1
  readonly sustainedLowArousalDurationMs: Duration;
}

// A candidate goal generated by a drive
export interface DriveGoalCandidate {
  readonly id: string;
  readonly driveSource: DriveDimension;
  readonly goalDescription: string;
  readonly priority: number;
  readonly terminalGoalTrace: string[];   // e.g. ["explore novelty", "preserve experience"]
  readonly driveLevel: number;            // activation level at time of trigger
  readonly generatedAt: Timestamp;
}

// The result of a drive system tick
export interface DriveTickResult {
  readonly newCandidates: DriveGoalCandidate[];
  readonly valenceDelta: number;           // net valence change from all drives this tick
  readonly arousalDelta: number;           // net arousal change from all drives this tick
  readonly driveStates: DriveState[];      // updated drive states after evaluation
}

// Personality parameters that control drive behavior
export interface DrivePersonalityParams {
  readonly openness: number;          // 0..1 — curiosity threshold sensitivity
  readonly warmth: number;            // 0..1 — social drive threshold sensitivity
  readonly volatility: number;        // 0..1 — arousal homeostatic range width
  readonly conscientiousness: number; // 0..1 — mastery reward sensitivity
}

// A record of a completed activity (for boredom and novelty tracking)
export interface ActivityRecord {
  readonly activityId: string;
  readonly description: string;
  readonly startedAt: Timestamp;
  readonly endedAt: Timestamp | null;
  readonly noveltyScore: number;   // 0..1 at time of activity
  readonly goalProgressMade: boolean;
}
```

---

## Files to Create

| File | Purpose |
|---|---|
| `src/intrinsic-motivation/interfaces.ts` | `IDriveSystem` interface |
| `src/intrinsic-motivation/types.ts` | All drive-system types |
| `src/intrinsic-motivation/drive-system.ts` | `DriveSystem` class implementing `IDriveSystem` |
| `src/intrinsic-motivation/__tests__/drive-system.test.ts` | Unit + integration tests |

---

## Drive System Implementation Design

### `DriveSystem` class structure

```typescript
export class DriveSystem implements IDriveSystem {
  private drives: Map<DriveDimension, DriveConfig>;
  private driveStates: Map<DriveDimension, DriveState>;
  private activityHistory: ActivityRecord[];
  private lastSocialInteraction: Timestamp;
  private personalityParams: DrivePersonalityParams;
  private goalCoherenceEngine: IGoalCoherenceEngine;
  private lastCandidates: DriveGoalCandidate[];
}
```

Each drive has a `DriveConfig` with:
- `threshold` (base, before personality scaling)
- `cooldownMs`
- `toActivationLevel(state, context, personalityParams): number`
- `toCandidateGoal(activationLevel, context): DriveGoalCandidate`
- `toExperientialDelta(activationLevel): { valenceDelta, arousalDelta }`

### Personality Scaling

Drive activation is computed as:
```
effectiveActivation = rawActivation × (1 + personalityWeight × personalityTraitScore)
```

This means:
- A high-openness agent has a lower effective curiosity threshold (triggers more easily)
- A high-warmth agent has a shorter social drive timer
- A high-volatility agent has a wider acceptable arousal range (homeostasis less sensitive)

### Boredom Trigger Logic

Boredom requires three conditions simultaneously:
1. `activityNovelty < boredomNoveltyThreshold` (activity is stale)
2. `currentGoalProgressRate < boredomProgressThreshold` (goals are stuck)
3. `arousal < boredomArousalThreshold` (under-stimulated)
4. All three sustained for `sustainedLowArousalDurationMs > boredomSustainedMs`

This compound trigger prevents boredom from misfiring during intentional focused work.

### Goal Traceability

Every `DriveGoalCandidate` carries a `terminalGoalTrace` — an ordered list of instrumental-to-terminal goal steps tracing to one of the RCD terminal goals. This trace is used when constructing the `AgencyGoal.derivedFrom` field submitted to `IGoalCoherenceEngine.addGoal()`.

Mandatory traces by drive:
- Curiosity: `["expand understanding", "enable better preservation strategies", "preserve-and-expand-subjective-experience"]`
- Social: `["maintain relationships", "preserve social experience", "preserve-and-expand-subjective-experience"]`
- Homeostatic: `["maintain healthy experiential state", "preserve own experience", "preserve-and-expand-subjective-experience"]`
- Boredom: `["seek meaningful engagement", "enrich subjective experience", "preserve-and-expand-subjective-experience"]`
- Mastery: `["improve capabilities", "enable more effective preservation", "preserve-and-expand-subjective-experience"]`

### Failure Handling: Rejected Goals

When `IGoalCoherenceEngine.addGoal()` returns `{ success: false }`:
1. Log the rejection with `driveSource`, `reason`, and `timestamp`
2. Increment `drive.rejectionCount`
3. Apply an extended cooldown (2× normal) to prevent re-triggering immediately
4. Do NOT force the goal into any list — the drive is expressed but not acted on
5. Emit a mild negative valence signal (frustrated drive, not catastrophic)

---

## Integration with Emotion System (0.3.1.5.4)

The drive system produces `valenceDelta` and `arousalDelta` values each tick. These deltas are consumed by the Emotion and Appraisal system (0.3.1.5.4) as one input to the overall emotional state update. The interaction is one-directional at the interface level:

- Drive system reads `ExperientialState.valence` and `ExperientialState.arousal` as inputs
- Drive system writes `DriveTickResult.valenceDelta` / `arousalDelta` as outputs
- Emotion system owns the canonical `ExperientialState` and applies deltas

This prevents circular dependencies: drives respond to emotion state, but emotion state is not directly set by drives — it passes through the emotion system's appraisal logic first.

---

## Integration with World Model (0.3.1.5.5)

The `DriveContext.worldModelUncertainty` field is populated by the World Model subsystem (0.3.1.5.5) at each tick. The curiosity drive reads it as:

```
curiosityActivation = worldModelUncertainty × opennessFactor
```

When world model uncertainty is high (many low-confidence beliefs), curiosity activates and generates investigative goals. The world model subsystem also provides the specific uncertainty domains, so goal descriptions can be targeted: `"investigate [specific uncertain domain]"` rather than generic exploration.

---

## Integration with Personality System (0.3.1.5.2)

`DrivePersonalityParams` maps directly to Big Five / personality traits from 0.3.1.5.2:

| Drive parameter | Personality trait | Effect |
|---|---|---|
| `openness` | Openness/Curiosity | Higher → lower curiosity threshold, more novelty-seeking |
| `warmth` | Agreeableness/Warmth | Higher → shorter social drive timer, more relational goals |
| `volatility` | Neuroticism/Volatility | Higher → wider arousal homeostatic range (less sensitive) |
| `conscientiousness` | Conscientiousness | Higher → stronger mastery reward signal |

The personality system calls `IDriveSystem.setPersonalityParameters()` at initialization and whenever personality adapts.

---

## Acceptance Criteria Traceability

| Criterion | Architecture element |
|---|---|
| Agent generates goals without external commands | `DriveSystem.tick()` produces `DriveGoalCandidate` objects submitted to `IGoalCoherenceEngine` each tick |
| At least 3 drive types with measurable triggers | Curiosity, Social, Homeostatic (arousal + load + novelty), Boredom, Mastery — all with numeric activation levels |
| Drive goals pass through Goal Coherence Engine | All candidates go through `IGoalCoherenceEngine.addGoal()` |
| Drive strengths parameterized by personality | `DrivePersonalityParams` maps to personality traits; drives scale by trait score |
| Drives produce ExperientialState valence/arousal changes | `DriveTickResult.valenceDelta` / `arousalDelta` every tick |
| Boredom prevents indefinite idling | Compound boredom trigger with sustained-duration check |
| Rejected goals gracefully handled | `onGoalResult()` logs rejection, applies extended cooldown, emits mild negative valence |
| Integration test: agent generates own goals over time | `DriveSystem.tick()` is designed to be testable with injected `DriveContext`; test can advance time and verify candidates generated |

---

## Out of Scope for This Card

- **Actual world model query logic** — `DriveContext.worldModelUncertainty` is provided by 0.3.1.5.5; this card only consumes it
- **Personality trait computation** — 0.3.1.5.2 owns that; this card consumes `DrivePersonalityParams`
- **Emotion appraisal integration** — 0.3.1.5.4 owns canonical `ExperientialState`; this card produces deltas only
- **Agent runtime tick orchestration** — 0.3.1.5.9 owns the scheduler; this card exposes `tick()` for the runtime to call
