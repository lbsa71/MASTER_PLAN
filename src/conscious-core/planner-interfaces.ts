/**
 * Planning and Temporal Reasoning interfaces for card 0.3.1.5.6
 *
 * Defines the IPlanner contract and the DeliberationContext injected into
 * ConsciousCore.deliberate() to enable multi-step planning without breaking
 * the existing (state, goals) => Decision signature.
 *
 * IPlanner is injected into ConsciousCore as an optional dependency.
 * When absent, ConsciousCore falls back to the priority-sort behaviour.
 * When present, deliberate() checks for an active plan and either advances
 * it or generates a new one.
 */

import type { ExperientialState, Goal, ActionResult } from "./types.js";
import type { IGoalCoherenceEngine } from "../agency-stability/interfaces.js";
import type {
  Plan,
  PlanStep,
  WorldContext,
  PlanFailureReason,
  PreconditionCheckResult,
  PostconditionCheckResult,
} from "./planner-types.js";

// ── IPlanner ──────────────────────────────────────────────────

/**
 * The planning module contract.
 *
 * Injected into ConsciousCore as an optional dependency. Responsible for:
 *   - Multi-step plan generation (experientially grounded — no zombie planning)
 *   - Precondition checking before step execution
 *   - Postcondition evaluation after step completion
 *   - Replanning on failure
 *   - Registering instrumental subgoals with the Goal Coherence Engine
 *   - Deciding when a plan should be abandoned
 *
 * All methods that produce a Plan accept an ExperientialState to ensure
 * plan formation flows through the conscious experience loop.
 */
export interface IPlanner {
  /**
   * Generate a multi-step plan for the given goal, grounded in the agent's
   * current experiential state and world model snapshot.
   *
   * The `budgetMs` parameter constrains how long plan generation may take.
   * If the budget would be exceeded, a partial plan is returned; generation
   * continues in subsequent cycles via the activePlan in working memory.
   *
   * @param goal         The terminal goal to plan for
   * @param state        Current experiential state (causal grounding)
   * @param worldContext Current world model snapshot
   * @param budgetMs     Maximum ms to spend generating the plan
   * @returns            A new Plan (status: "pending") with ≥1 steps
   */
  generatePlan(
    goal: Goal,
    state: ExperientialState,
    worldContext: WorldContext,
    budgetMs: number
  ): Plan;

  /**
   * Check whether the given plan step's preconditions are satisfied in the
   * current world context.
   *
   * @param step         The plan step whose preconditions to evaluate
   * @param worldContext Current world model snapshot
   * @returns            PreconditionCheckResult indicating pass/fail and replan flag
   */
  checkPreconditions(
    step: PlanStep,
    worldContext: WorldContext
  ): PreconditionCheckResult;

  /**
   * Compare the step's expected postconditions against the actual action outcome.
   * Returns a PostconditionCheckResult that flags whether replanning is required.
   *
   * @param step          The plan step whose postconditions to verify
   * @param actualOutcome The ActionResult returned by the action pipeline
   * @param worldContext  World model snapshot after the action
   * @returns             PostconditionCheckResult indicating which conditions held
   */
  evaluateOutcome(
    step: PlanStep,
    actualOutcome: ActionResult,
    worldContext: WorldContext
  ): PostconditionCheckResult;

  /**
   * Trigger replanning after a step failure.
   *
   * The returned Plan preserves the original terminal goal but may have a
   * different step sequence. The escalationCount is incremented on the
   * returned plan.
   *
   * @param plan          The plan that failed
   * @param failureReason Why the plan failed
   * @param state         Current experiential state (grounds the new plan)
   * @param worldContext  Current world model snapshot
   * @param budgetMs      Maximum ms to spend replanning
   * @returns             A revised Plan (status: "pending")
   */
  replan(
    plan: Plan,
    failureReason: PlanFailureReason,
    state: ExperientialState,
    worldContext: WorldContext,
    budgetMs: number
  ): Plan;

  /**
   * Register all instrumental subgoals embedded in the plan's steps with
   * the Goal Coherence Engine, establishing derivation links back to the
   * terminal goal.
   *
   * Steps where `instrumentalGoalId` is non-null are registered.
   *
   * @param plan            The plan containing steps with subgoals
   * @param coherenceEngine The Goal Coherence Engine to register with
   */
  registerSubgoals(plan: Plan, coherenceEngine: IGoalCoherenceEngine): void;

  /**
   * Determine whether the plan should be abandoned rather than replanned.
   * Called after repeated failures (escalationCount has grown).
   *
   * Considers: goal still achievable? still worthwhile? patience threshold
   * (a personality parameter from 0.3.1.5.2)?
   *
   * @param plan             The failing plan
   * @param escalationCount  How many times replanning has been attempted
   * @returns                true if the plan (and terminal goal) should be abandoned
   */
  shouldAbandon(plan: Plan, escalationCount: number): boolean;
}

// ── DeliberationContext ───────────────────────────────────────

/**
 * Optional context passed to ConsciousCore.deliberate() when planning
 * is available. Enables multi-step planning without altering the
 * `(state, goals) => Decision` interface signature — callers that do
 * not supply a context get the legacy priority-sort behaviour.
 *
 * The context is typically assembled by the Agent Runtime (0.3.1.5.9)
 * and injected each cycle.
 */
export interface DeliberationContext {
  /** The planner module. If null, legacy priority-sort is used. */
  readonly planner: IPlanner | null;
  /** The active plan from working memory, if any. */
  activePlan: Plan | null;
  /** Current world model snapshot. Required when planner is non-null. */
  readonly worldContext: WorldContext | null;
  /** Goal Coherence Engine for registering instrumental subgoals. */
  readonly coherenceEngine: IGoalCoherenceEngine | null;
  /** Remaining cognitive budget for this deliberation cycle (ms). */
  readonly budgetMs: number;
}
