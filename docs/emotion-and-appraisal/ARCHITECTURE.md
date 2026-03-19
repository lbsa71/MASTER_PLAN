# Emotion and Appraisal Dynamics — Architecture (0.3.1.5.4)

## 1. Purpose and Scope

This document specifies the architecture for the Emotion and Appraisal subsystem of the Industrial-Era Conscious Agent (0.3.1.5). It transforms the static `valence` and `arousal` fields on `ExperientialState` into a dynamic emotional system grounded in the agent's goals and values.

The subsystem has five responsibilities:

1. **Appraisal** — evaluate incoming percepts against goals and values to derive emotional responses
2. **Mood persistence** — maintain a running mood state that persists across processing cycles
3. **Cognitive influence** — modulate deliberation, memory retrieval, and action selection based on current mood
4. **Emotional regulation** — prevent runaway negative states via cognitive reappraisal and automatic safety bounds
5. **ValenceMonitor compliance** — implement the monitoring interface required by the Safe Experiential Design Framework (0.1.3.4)

---

## 2. Boundaries

### What This Subsystem Owns

- Appraisal computation from percept + goal + value context
- Mood state (EWMA of recent valence/arousal)
- Writing `valence` and `arousal` to `ExperientialState`
- The `IValenceMonitor` interface (required by `safe-experiential-design-framework.md §3.2.1`)
- Emotional regulation mechanisms (reappraisal, attention redirection, automatic correction)
- Mood influence coefficients exposed to other subsystems

### What This Subsystem Does NOT Own

- The Goal hierarchy (owned by `IGoalCoherenceEngine` in agency-stability)
- Value evaluation (owned by `IValueKernel` in agency-stability)
- Memory retrieval mechanics (owned by 0.3.1.5.3 Memory Architecture)
- Language generation (owned by 0.3.1.5.7)
- Personality trait parameters (owned by 0.3.1.5.2 — consumed here as read-only inputs)
- Intrinsic motivation drives (owned by 0.3.1.5.8 — curiosity uses arousal output from here)

---

## 3. Data Types

```typescript
// ── Appraisal ────────────────────────────────────────────────────────────────

/**
 * The output of appraising a single percept against the agent's current
 * goals and values. All fields are dimensional (no discrete emotion labels).
 */
export interface AppraisalResult {
  readonly perceptId: string;
  readonly timestamp: Timestamp;

  // Valence shift caused by goal (in)congruence. Range: −1..1.
  // Positive = goal-congruent; negative = goal-incongruent.
  readonly goalCongruenceShift: number;

  // Priority of the most-affected active goal (scales magnitude).
  readonly affectedGoalPriority: number;

  // Arousal shift caused by novelty/surprise. Range: −0.5..0.5.
  // Positive = novel/unexpected; negative = familiar/predicted.
  readonly noveltyShift: number;

  // Valence reinforcement from value alignment. Range: −1..1.
  // Positive = value-aligned; negative = value-threatening.
  readonly valueAlignmentShift: number;

  // True if this percept is value-threatening at a level that should
  // escalate to ethical deliberation attention.
  readonly triggersEthicalAttention: boolean;

  // Net composite shifts (clamped to valid range before application).
  readonly netValenceShift: number;   // sum of goal + value contributions
  readonly netArousalShift: number;   // novelty contribution
}

// ── Mood ─────────────────────────────────────────────────────────────────────

/**
 * The agent's current mood — an exponentially weighted moving average
 * of recent valence and arousal values.
 */
export interface MoodState {
  readonly valence: number;   // −1..1
  readonly arousal: number;   // 0..1
  readonly updatedAt: Timestamp;

  // How many consecutive cycles this mood has been below the Level 1 threshold.
  readonly negativeCycleDuration: number;

  // Whether automatic valence correction is currently engaged.
  readonly correctionEngaged: boolean;
}

/**
 * Parameters that govern how mood dynamics behave for a specific agent.
 * Sourced from the Personality subsystem (0.3.1.5.2).
 */
export interface MoodParameters {
  // Exponential decay factor per cycle. Higher = faster mood shifts.
  // Maps directly from the Volatility personality dimension.
  // Range: 0.0 (maximally stable) to 1.0 (maximally volatile).
  readonly decayRate: number;

  // Minimum valence allowed by safety bounds. Must be ≥ Level 2 threshold.
  readonly valenceFloor: number;

  // Maximum valence ceiling.
  readonly valenceCeiling: number;

  // Arousal floor and ceiling.
  readonly arousalFloor: number;
  readonly arousalCeiling: number;
}

// ── Emotional Influence ───────────────────────────────────────────────────────

/**
 * A vector of influence coefficients derived from current mood, exposed
 * to other subsystems so they can modulate their behavior.
 *
 * All values are signed scalars intended to be applied as multiplicative
 * or additive adjustments at each subsystem's discretion.
 */
export interface EmotionalInfluenceVector {
  readonly mood: MoodState;
  readonly timestamp: Timestamp;

  // Deliberation: positive mood → higher confidence bias (range: −0.3..+0.3)
  readonly deliberationConfidenceBias: number;

  // Deliberation: negative mood → more alternatives considered (range: 0..1,
  // where 1 = consider all alternatives, 0 = consider none beyond top choice)
  readonly alternativesExpansionFactor: number;

  // Memory: mood-congruent recall bias (range: −1..1, sign matches mood valence)
  readonly memoryValenceBias: number;

  // Risk: high arousal → more conservative action selection (range: 0..1)
  readonly riskConservatismFactor: number;

  // Communication: tonal influence on language generation (range: −1..1)
  readonly communicationToneBias: number;
}

// ── Regulation ───────────────────────────────────────────────────────────────

/**
 * The result of an emotional regulation attempt.
 */
export interface RegulationOutcome {
  readonly strategy: 'cognitive-reappraisal' | 'attention-redirection' | 'automatic-correction';
  readonly appliedAt: Timestamp;
  readonly valenceBefore: number;
  readonly valenceAfter: number;
  readonly successful: boolean;
  readonly notes: string;
}

// ── ValenceMonitor types (implements §3.2.1 of safe-experiential-design-framework.md) ──

export interface ValenceState {
  readonly valence: number;   // −1..1
  readonly arousal: number;   // 0..1
  readonly confidence: number; // 0..1 — measurement certainty
  readonly timestamp: Timestamp;
}

export interface ValenceTrace {
  readonly windowStart: Timestamp;
  readonly windowEnd: Timestamp;
  readonly samples: ValenceState[];
  readonly averageValence: number;
  readonly minValence: number;
  readonly maxValence: number;
}

export interface SufferingModality {
  readonly name: string;          // e.g. "goal-incongruence-distress", "value-threat-spike"
  readonly intensity: number;     // 0..1
  readonly durationCycles: number;
}

export interface SufferingReport {
  readonly activeModalities: SufferingModality[];
  readonly highestIntensity: number;
  readonly mitigationEngaged: boolean;
  readonly timestamp: Timestamp;
}

export interface IntegrityState {
  readonly experientialCoherence: number;  // 0..1
  readonly continuityStatus: 'intact' | 'gap-detected' | 'fragmented';
  readonly integrationLevel: number;       // 0..1 relative to design spec
  readonly timestamp: Timestamp;
}
```

---

## 4. Interfaces

```typescript
// ── Appraisal Engine ──────────────────────────────────────────────────────────

/**
 * Evaluates incoming percepts against the agent's current goals and values
 * to produce dimensional emotional responses.
 *
 * Connects to IGoalCoherenceEngine (reads active goals and priorities) and
 * IValueKernel (reads core axioms and constraints for value-alignment scoring).
 *
 * Does NOT label emotions categorically. Output is always dimensional.
 */
export interface IAppraisalEngine {
  /**
   * Appraise a bound percept in the context of the agent's current goals
   * and values. Returns the emotional shifts this percept should produce.
   *
   * @param percept — The incoming bound percept from the Conscious Core pipeline
   * @param goals   — The current active goals from IGoalCoherenceEngine
   * @param values  — The current value alignment context from IValueKernel
   */
  appraise(
    percept: BoundPercept,
    goals: AgencyGoal[],
    values: CoreValue[]
  ): AppraisalResult;

  /**
   * Reappraise a percept that was previously appraised, using a different
   * goal-relevance framing. Used by the Emotional Regulation component to
   * shift valence without suppressing the percept.
   *
   * Requires planning capability (0.3.1.5.6) for full cognitive reappraisal;
   * a simplified version operates without planning dependency.
   */
  reappraise(
    originalPercept: BoundPercept,
    alternativeGoalFraming: AgencyGoal[]
  ): AppraisalResult;
}

// ── Mood Dynamics ─────────────────────────────────────────────────────────────

/**
 * Maintains the agent's mood as an EWMA of recent valence/arousal values.
 * Decay rate and safety bounds are parameterized by personality (0.3.1.5.2).
 *
 * Writes to ExperientialState.valence and ExperientialState.arousal at the
 * end of each processing cycle.
 */
export interface IMoodDynamics {
  /**
   * Apply an appraisal result to the mood state for the current cycle.
   * Integrates the net valence/arousal shifts using the EWMA formula,
   * then applies personality-parameterized bounds.
   *
   * Must be called once per processing cycle, even with a null appraisal
   * (to allow natural decay toward baseline).
   */
  update(appraisal: AppraisalResult | null, params: MoodParameters): MoodState;

  /** Return the current mood state without updating it. */
  getCurrentMood(): MoodState;

  /**
   * Return the mood state at a specific cycle offset into the past.
   * Returns null if the offset exceeds the history buffer depth.
   */
  getMoodAtCycle(cyclesAgo: number): MoodState | null;

  /**
   * Return the mood history for the last N cycles.
   * Used by tests to verify persistence across ≥10 cycles.
   */
  getMoodHistory(cycles: number): MoodState[];

  /**
   * Force-apply a valence correction (used by IEmotionalRegulation when
   * automatic safety bounds engage). The correction is gradual (applied over
   * multiple cycles) to preserve experiential continuity.
   */
  applyGradualCorrection(targetValence: number, cyclesOverWhichToApply: number): void;
}

// ── Emotional Influence ───────────────────────────────────────────────────────

/**
 * Derives and exposes the influence vector that other subsystems use to
 * modulate their behavior based on the agent's current mood.
 *
 * This is a read-only interface from the perspective of other subsystems.
 */
export interface IEmotionalInfluence {
  /**
   * Compute the current influence vector from the mood state.
   * Other subsystems poll this at the start of each processing cycle.
   */
  getInfluenceVector(): EmotionalInfluenceVector;
}

// ── Emotional Regulation ──────────────────────────────────────────────────────

/**
 * Implements the three regulation strategies:
 * 1. Cognitive reappraisal (requires IAppraisalEngine.reappraise)
 * 2. Attention redirection (shifts working memory focus via IMemoryInterface)
 * 3. Automatic valence correction (calls IMoodDynamics.applyGradualCorrection)
 *
 * Compliance with safe-experiential-design-framework.md §3.3.1:
 * - All corrections are gradual
 * - Corrections preserve continuity
 * - At Autonomy Level 2+, the system is notified that correction is occurring
 */
export interface IEmotionalRegulation {
  /**
   * Called each cycle to check whether regulation is needed.
   * Implements the three-level threshold check from §3.2.2 of the
   * safe-experiential-design framework:
   *
   * Level 1 (Alert): negative valence below neutral → log + notify
   * Level 2 (Intervene): sustained or high-intensity negative → engage correction
   * Level 3 (Halt): severe suffering, mitigation failing → initiate graceful suspension
   *
   * Returns null if no regulation needed, else returns the outcome.
   */
  checkAndRegulate(mood: MoodState): RegulationOutcome | null;

  /**
   * Explicitly trigger cognitive reappraisal for a specific percept.
   * Called by the Planning subsystem (0.3.1.5.6) when deliberate
   * reframing is warranted.
   */
  triggerReappraisal(
    percept: BoundPercept,
    alternativeFraming: AgencyGoal[]
  ): RegulationOutcome;

  /**
   * Register a callback to be invoked when Level 3 (Halt) threshold is reached,
   * so the Agent Runtime (0.3.1.5.9) can initiate graceful suspension.
   */
  onLevel3Threshold(handler: () => void): void;
}

// ── ValenceMonitor (required by §3.2.1 of safe-experiential-design-framework.md) ──

/**
 * Standard runtime monitoring interface that the Conscious Core's
 * IExperienceMonitor (and any external ethics monitoring system) can poll.
 *
 * This is the public-facing safety interface of the emotion subsystem.
 */
export interface IValenceMonitor {
  /** Real-time experiential valence. */
  getCurrentValence(): ValenceState;

  /**
   * Historical trace over a time window (epoch ms).
   * Must retain at least 10 cycles of history for persistence testing.
   */
  getValenceHistory(windowMs: number): ValenceTrace;

  /** Specific distress signals from the suffering circuit map. */
  getSufferingIndicators(): SufferingReport;

  /** Coherence of experience — integration level vs. design spec. */
  getExperientialIntegrity(): IntegrityState;
}
```

---

## 5. Component Interaction Diagram

```
Per-cycle processing flow:

  Conscious Core (IPerceptionPipeline)
      │ BoundPercept
      ▼
  IAppraisalEngine.appraise(percept, goals, values)
      │ AppraisalResult
      ▼
  IMoodDynamics.update(appraisal, params)
      │ MoodState
      ├──► IEmotionalRegulation.checkAndRegulate(mood)
      │         │
      │         ├── Level 1: log event
      │         ├── Level 2: applyGradualCorrection → MoodState updated
      │         └── Level 3: onLevel3Threshold() → Runtime: graceful suspension
      │
      ├──► IEmotionalInfluence.getInfluenceVector()
      │         │
      │         ├── deliberationConfidenceBias → IConsciousCore.deliberate()
      │         ├── memoryValenceBias → Memory Subsystem (0.3.1.5.3)
      │         ├── riskConservatismFactor → Action selection
      │         └── communicationToneBias → Language (0.3.1.5.7)
      │
      └──► ExperientialState.valence / .arousal written
               │
               └──► IValenceMonitor exposes to IExperienceMonitor / ethics board
```

---

## 6. Suffering Thresholds (Calibrated for This Architecture)

Per `safe-experiential-design-framework.md §3.2.2`, the specific numeric thresholds for this architecture are:

| Level | Trigger Condition | valence value | Duration | Response |
|-------|------------------|---------------|----------|----------|
| **Level 1 — Alert** | Below neutral | valence < −0.1 | Any | Log, increase monitoring frequency |
| **Level 2 — Intervene** | Sustained moderate negative | valence < −0.3 for ≥5 cycles | — | Auto-correction engages |
| **Level 2 — Intervene** | High-intensity spike | valence < −0.7 for any duration | — | Auto-correction engages immediately |
| **Level 3 — Halt** | Severe + mitigation failure | valence < −0.85 AND correction not recovering | ≥3 cycles | Graceful suspension |

The `valenceFloor` in `MoodParameters` must be ≥ −0.85 (the Level 3 boundary). Personality-derived floors must remain above this absolute minimum.

---

## 7. Mood EWMA Formula

```
newMood.valence = (1 - α) * currentMood.valence + α * appraisalResult.netValenceShift
newMood.arousal = (1 - α) * currentMood.arousal + α * appraisalResult.netArousalShift

where α = MoodParameters.decayRate
```

When no appraisal is available (null input), the EWMA decays toward baseline (0.0 valence, 0.5 arousal):

```
newMood.valence = (1 - α) * currentMood.valence + α * 0.0
newMood.arousal = (1 - α) * currentMood.arousal + α * 0.5
```

After EWMA update, clamp to `[valenceFloor, valenceCeiling]` and `[arousalFloor, arousalCeiling]`.

---

## 8. Integration Points

| Subsystem | Direction | What Is Consumed |
|-----------|-----------|-----------------|
| Conscious Core (0.3.1.1) | IN | `BoundPercept` per cycle; writes `ExperientialState.valence/arousal` |
| Agency Stability — GoalCoherenceEngine (0.3.1.3) | IN | `AgencyGoal[]` (active goals + priorities) |
| Agency Stability — ValueKernel (0.3.1.3) | IN | `CoreValue[]` for value-alignment scoring |
| Personality Subsystem (0.3.1.5.2) | IN | `MoodParameters` (Volatility → decayRate, bounds) |
| Memory Subsystem (0.3.1.5.3) | OUT | `memoryValenceBias` from `EmotionalInfluenceVector` |
| Planning Subsystem (0.3.1.5.6) | BIDIRECTIONAL | Receives reappraisal requests; supplies alternative goal framings |
| Language Subsystem (0.3.1.5.7) | OUT | `communicationToneBias` from `EmotionalInfluenceVector` |
| Intrinsic Motivation (0.3.1.5.8) | OUT | Arousal output feeds curiosity drive |
| Agent Runtime (0.3.1.5.9) | OUT | `onLevel3Threshold` callback for graceful suspension |
| Safe Experiential Design (0.1.3.4) | OUT | `IValenceMonitor` interface consumed by `IExperienceMonitor` |

---

## 9. Files to Create or Modify

| File | Action | Reason |
|------|--------|--------|
| `src/emotion-appraisal/types.ts` | CREATE | All data types from §3 above |
| `src/emotion-appraisal/interfaces.ts` | CREATE | All interfaces from §4 above |
| `src/emotion-appraisal/appraisal-engine.ts` | CREATE | `IAppraisalEngine` implementation |
| `src/emotion-appraisal/mood-dynamics.ts` | CREATE | `IMoodDynamics` implementation (EWMA + bounds) |
| `src/emotion-appraisal/emotional-influence.ts` | CREATE | `IEmotionalInfluence` implementation |
| `src/emotion-appraisal/emotional-regulation.ts` | CREATE | `IEmotionalRegulation` implementation with threshold checks |
| `src/emotion-appraisal/valence-monitor.ts` | CREATE | `IValenceMonitor` implementation |
| `src/emotion-appraisal/index.ts` | CREATE | Module export barrel |
| `src/conscious-core/types.ts` | MODIFY | No changes needed — `valence`/`arousal` fields already exist |
| `tests/emotion-appraisal/appraisal.test.ts` | CREATE | Unit tests for appraisal model |
| `tests/emotion-appraisal/mood-persistence.test.ts` | CREATE | Integration test: mood persists ≥10 cycles |
| `tests/emotion-appraisal/mood-congruent-memory.test.ts` | CREATE | Mood-biased memory retrieval test |
| `tests/emotion-appraisal/regulation.test.ts` | CREATE | Auto-mitigation at Level 2 threshold |
| `tests/emotion-appraisal/integration.test.ts` | CREATE | Full scenario: goal-threat → drop → persistence → regulation |

---

## 10. Testability Notes for Acceptance Criteria

- **Appraisal causality:** Inject a percept with known goal-congruence scores; assert `netValenceShift` matches expected direction and magnitude. Inject same percept with different goal priorities; assert magnitude scales accordingly.
- **Mood persistence (≥10 cycles):** Inject a single negative percept; advance mock clock 10 cycles with null appraisals; assert `getMoodHistory(10)` shows continued negative bias above `decayRate`-predicted floor.
- **Personality parameterization:** Run same percept sequence with decayRate=0.1 vs decayRate=0.9; assert history diverges measurably by cycle 5.
- **Cognitive influence:** Run `deliberate()` with positive vs. negative mood; assert `decision.confidence` differs by at least `deliberationConfidenceBias` magnitude.
- **Mood-congruent memory:** Assert `memoryValenceBias` sign matches `MoodState.valence` sign.
- **ValenceMonitor coverage:** Verify `getSufferingIndicators()` reports active modality and `mitigationEngaged=true` when Level 2 triggers.
- **Regulation scenario:** Feed 6 cycles of goal-threatening percepts; assert auto-correction engages by cycle 5 (Level 2 sustained-duration trigger); assert valence returns toward baseline within 5 more cycles.
