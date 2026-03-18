# Planning and Temporal Reasoning — Architecture Specification

**Card:** 0.3.1.5.6
**Phase:** ARCHITECT → IMPLEMENT
**Depends on:** World Model (0.3.1.5.5), Memory Architecture (0.3.1.5.3), LLM Substrate (0.3.1.5.1)

---

## Overview

This document specifies the architecture for upgrading `ConsciousCore.deliberate()` from single-action goal selection to multi-step planning with temporal awareness and execution monitoring.

The planning module is a **thin orchestration layer** — it structures the planning loop, manages plan lifecycle, and enforces the cognitive budget. All reasoning is delegated to the LLM substrate (0.3.1.5.1). Plans carry experiential basis references, enforcing the "no zombie planning" constraint.

---

## System Decomposition

```
┌──────────────────────────────────────────────────────────────────┐
│                    ConsciousCore.deliberate()                    │
│                                                                  │
│  ┌──────────────┐   ┌──────────────────┐   ┌─────────────────┐  │
│  │  Working     │──▶│  IPlanner        │──▶│  IGoalCoherence │  │
│  │  Memory      │   │  (orchestrator)  │   │  Engine         │  │
│  │  (plan slot) │   └────────┬─────────┘   └─────────────────┘  │
│  └──────────────┘            │                                   │
│                              │                                   │
│             ┌────────────────┼────────────────┐                  │
│             ▼                ▼                ▼                  │
│   generatePlan()    checkPreconditions()  evaluateOutcome()      │
│   replan()          shouldAbandon()       registerSubgoals()     │
│             │                                                    │
│             ▼                                                    │
│   LLM Substrate (0.3.1.5.1) — all reasoning delegated here      │
│             │                                                    │
│             ▼                                                    │
│   World Model (0.3.1.5.5) — precondition checks                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## New Files

| File | Purpose |
|------|---------|
| `src/conscious-core/planner-types.ts` | `Plan`, `PlanStep`, `Precondition`, `Postcondition`, `TemporalConstraint`, `WaitState`, `ExecutionStatus`, `PlanFailureReason` |
| `src/conscious-core/planner-interfaces.ts` | `IPlanner` interface (contract for the planning module) |
| `src/conscious-core/planner.ts` | `Planner` — concrete implementation of `IPlanner` |

---

## Type Definitions

### `Plan`

```ts
interface Plan {
  id: string;
  terminalGoal: Goal;           // the goal this plan serves
  steps: PlanStep[];
  currentStepIndex: number;
  status: 'pending' | 'active' | 'suspended' | 'completed' | 'failed' | 'abandoned';
  waitState: WaitState | null;  // non-null when agent is waiting for an external event
  temporalConstraints: TemporalConstraint[];
  experientialBasis: ExperientialState; // plan formation was conscious (no zombie planning)
  createdAt: number;            // epoch ms
  escalationCount: number;      // how many times replanning was triggered
}
```

### `PlanStep`

```ts
interface PlanStep {
  id: string;
  description: string;
  preconditions: Precondition[];    // world-model conditions that must hold before execution
  postconditions: Postcondition[];  // expected world-model states after execution
  instrumentalGoalId: GoalId | null; // registered with GoalCoherenceEngine if non-null
  estimatedDuration: Duration | null;
  deadline: number | null;          // epoch ms, null if unconstrained
}
```

### `Precondition` / `Postcondition`

```ts
interface Precondition {
  description: string;
  worldModelQuery: string;  // query key into WorldContext
  expectedValue: unknown;
}

interface Postcondition {
  description: string;
  worldModelQuery: string;
  expectedValue: unknown;
  tolerance: number;        // 0..1 — how closely actual must match expected
}
```

### `TemporalConstraint`

```ts
interface TemporalConstraint {
  type: 'deadline' | 'not-before' | 'ordering';
  stepId: string;               // the constrained step
  relativeToStepId?: string;    // for 'ordering' constraints
  timestamp?: number;           // epoch ms, for deadline/not-before
}
```

### `WaitState`

```ts
interface WaitState {
  reason: string;
  waitingFor: 'external-event' | 'other-agent' | 'cooldown' | 'resource';
  since: number;                // epoch ms
  timeoutAt: number | null;     // epoch ms — null = wait indefinitely
}
```

### `PlanFailureReason`

```ts
type PlanFailureReason =
  | { kind: 'postcondition-violated'; stepId: string; expected: unknown; actual: unknown }
  | { kind: 'precondition-unmet'; stepId: string; condition: Precondition }
  | { kind: 'deadline-missed'; stepId: string; deadline: number }
  | { kind: 'action-error'; stepId: string; error: string }
  | { kind: 'budget-exceeded' };
```

### `ExecutionStatus`

```ts
interface ExecutionStatus {
  planId: string;
  stepId: string;
  result: ActionResult;
  postconditionResults: PostconditionCheckResult[];
  allSatisfied: boolean;
}
```

---

## Interface: `IPlanner`

```ts
interface IPlanner {
  /**
   * Generate a multi-step plan for the given goal, grounded in current experiential
   * state and world context. budgetMs constrains execution time — return a partial
   * plan if necessary; do NOT exceed budget.
   *
   * experientialBasis is required: plan formation must be conscious (no zombie planning).
   */
  generatePlan(
    goal: Goal,
    state: ExperientialState,
    worldContext: WorldContext,
    budgetMs: number
  ): Plan;

  /**
   * Check whether a plan step's preconditions are satisfied given the current
   * world context.
   */
  checkPreconditions(step: PlanStep, worldContext: WorldContext): PreconditionCheckResult;

  /**
   * Compare actual action outcome against a step's expected postconditions.
   */
  evaluateOutcome(step: PlanStep, actualOutcome: ActionResult): PostconditionCheckResult;

  /**
   * Generate a revised plan after a step failure.
   * Consumes from the same cognitive budget — must return within budgetMs.
   */
  replan(
    plan: Plan,
    failureReason: PlanFailureReason,
    state: ExperientialState,
    worldContext: WorldContext,
    budgetMs: number
  ): Plan;

  /**
   * Register all instrumental subgoals in the plan with the Goal Coherence Engine.
   * Each PlanStep with a non-null instrumentalGoalId gets an AgencyGoal added to
   * the engine with derivation links to the terminal goal.
   */
  registerSubgoals(plan: Plan, coherenceEngine: IGoalCoherenceEngine): void;

  /**
   * Determine whether a plan should be abandoned (goal no longer achievable or
   * no longer worthwhile). Called when escalationCount crosses the patience threshold
   * (sourced from the personality module, 0.3.1.5.2).
   */
  shouldAbandon(plan: Plan, patienceThreshold: number): boolean;
}
```

---

## Integration: `ConsciousCore.deliberate()` Extension

The existing signature **must remain compatible**:
```ts
deliberate(state: ExperientialState, goals: Goal[]): Decision
```

Extension strategy — overloaded working-memory context:

```ts
deliberate(
  state: ExperientialState,
  goals: Goal[],
  context?: DeliberationContext   // optional — backwards-compatible
): Decision
```

Where:
```ts
interface DeliberationContext {
  planner?: IPlanner;
  activePlan?: Plan | null;         // loaded from working memory
  worldContext?: WorldContext;
  coherenceEngine?: IGoalCoherenceEngine;
  budgetMs?: number;
  patienceThreshold?: number;
}
```

### Deliberation Flow

```
deliberate(state, goals, context?)
  │
  ├─ [no context or no planner] → existing priority-sort behaviour (backwards-compat)
  │
  └─ [planner present]
       │
       ├─ [activePlan exists in working memory]
       │     │
       │     ├─ check current step preconditions via worldContext
       │     ├─ if waiting (WaitState) → idle decision, check timeout
       │     └─ emit next-step Decision with experientialBasis = state
       │
       └─ [no activePlan]
             │
             ├─ select top goal (priority sort)
             ├─ generatePlan(topGoal, state, worldContext, budgetMs)
             ├─ registerSubgoals(plan, coherenceEngine)
             ├─ store plan in working memory
             └─ emit first-step Decision with experientialBasis = state
```

### Outcome Monitoring (post-action)

After each action the Action Pipeline returns an `ActionResult`. The runtime (0.3.1.5.9) calls `evaluateOutcome()` on the planner and — if postconditions are violated — calls `replan()`. The revised plan replaces the active plan in working memory.

---

## Cognitive Budget Compliance

- `generatePlan()` and `replan()` each receive a `budgetMs` parameter
- Planning runs within the "core deliberation" allocation (≥25% of cycle budget, from 0.3.1.5.9)
- If budget is exceeded mid-generation, the partial plan (with `status: 'pending'`) is stored in working memory; generation resumes next cycle
- The planner tracks its own elapsed time via `Date.now()` calls and truncates output when the deadline approaches

---

## Temporal Reasoning Details

### Deadlines
- Each `PlanStep` carries an optional `deadline` (epoch ms)
- Before executing a step, the planner checks `Date.now() < step.deadline`
- Missed deadlines trigger `PlanFailureReason { kind: 'deadline-missed' }`

### Ordering Constraints
- `TemporalConstraint { type: 'ordering' }` encodes A-before-B relationships
- Planner validates ordering before emitting the Decision for a step

### Wait States
- When a step requires an external event, the plan enters a `WaitState`
- Each cycle, `deliberate()` checks whether the wait condition is satisfied via `worldContext`
- If `timeoutAt` is reached without resolution, the wait is treated as a plan failure

### Patience
- `patienceThreshold` (sourced from personality module 0.3.1.5.2) bounds `escalationCount`
- `shouldAbandon()` returns `true` when `plan.escalationCount >= patienceThreshold`
- Abandoned plans cause the planning loop to restart with a lower-priority goal

---

## Working Memory Integration (0.3.1.5.3)

The active plan is stored in a dedicated working-memory slot:
- **Key:** `'active-plan'`
- **Value:** `Plan | null`
- Persists across cognitive cycles
- If memory is evicted under pressure, the plan is checkpointed to episodic memory with `status: 'suspended'`

---

## Goal Coherence Integration (0.3.1.3)

Every `PlanStep` with a non-null `instrumentalGoalId` creates an `AgencyGoal` in the Goal Coherence Engine:

```ts
const agencyGoal: AgencyGoal = {
  id: step.instrumentalGoalId,
  description: step.description,
  priority: terminalGoal.priority - stepIndex,  // instrumental goals inherit lower priority
  derivedFrom: [terminalGoalId],                // derivation link preserved
  type: 'instrumental',
  experientialBasis: plan.experientialBasis,
  ...
};
coherenceEngine.addGoal(agencyGoal);
```

Orphan detection: when a plan is abandoned or completed, `removeGoal()` is called for each instrumental subgoal, preventing orphan accumulation.

---

## Acceptance Criteria (testable)

1. **Multi-step generation** — `generatePlan()` for a non-trivial goal returns ≥3 steps
2. **Precondition checking** — `checkPreconditions()` returns `false` when world model does not satisfy a step's preconditions; the planner waits or generates a subgoal to resolve the gap
3. **Outcome monitoring** — given an `ActionResult` that violates a postcondition, `evaluateOutcome()` returns `satisfied: false` and `replan()` is called automatically
4. **Temporal sequencing** — `TemporalConstraint { type: 'ordering' }` is respected; out-of-order steps emit an error, not a decision
5. **Wait states** — agent emits idle decisions while in a WaitState; resumes when condition clears
6. **Deadline enforcement** — step with past deadline triggers `PlanFailureReason { kind: 'deadline-missed' }`
7. **Subgoal registration** — after `registerSubgoals()`, `coherenceEngine.getDerivationTrace(stepGoalId)` returns a non-empty path back to the terminal goal
8. **Budget compliance** — `generatePlan()` returns within `budgetMs`; no plan generation starves the experience stream
9. **Experiential basis** — every `Plan.experientialBasis` is a valid `ExperientialState` (non-null, non-default)
10. **Integration test** — agent given a goal with multiple prerequisite steps: generates plan, executes, encounters postcondition violation, replans, achieves goal via alternative route
