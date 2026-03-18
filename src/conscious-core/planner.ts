/**
 * Planner — concrete implementation of IPlanner (0.3.1.5.6)
 *
 * Thin orchestration layer for multi-step planning and temporal reasoning.
 * Plan *generation* delegates to the LLM substrate via structured prompting;
 * the Planner's own logic handles:
 *   - Precondition checking against the world model (WorldContext.facts)
 *   - Postcondition evaluation against ActionResult fields
 *   - Replanning with escalation tracking
 *   - Instrumental subgoal registration with IGoalCoherenceEngine
 *   - Abandon threshold enforcement
 *
 * Key constraint: every Plan carries an `experientialBasis` — no zombie planning.
 */

import type { ExperientialState, Goal, ActionResult } from "./types.js";
import type { IGoalCoherenceEngine } from "../agency-stability/interfaces.js";
import type { AgencyGoal } from "../agency-stability/types.js";
import type { IPlanner } from "./planner-interfaces.js";
import type {
  Plan,
  PlanStep,
  WorldContext,
  PlanFailureReason,
  PreconditionCheckResult,
  PostconditionCheckResult,
  Precondition,
  Postcondition,
  WaitState,
} from "./planner-types.js";

// ── Configuration ──────────────────────────────────────────────

/**
 * Default maximum number of replanning cycles before a plan is abandoned.
 * Acts as the "patience level" parameter referenced in 0.3.1.5.2.
 * Callers may override via PlannerOptions.
 */
const DEFAULT_MAX_ESCALATIONS = 3;

export interface PlannerOptions {
  /**
   * Maximum replanning attempts before shouldAbandon() returns true.
   * Maps to the personality "patience level" from 0.3.1.5.2.
   * Default: 3.
   */
  maxEscalations?: number;

  /**
   * Strategy used to generate LLM-structured step descriptions when no
   * external LLM substrate is wired in.  Currently only "placeholder" is
   * supported; future values will include "llm-substrate".
   */
  generationStrategy?: "placeholder";
}

// ── Planner implementation ─────────────────────────────────────

export class Planner implements IPlanner {
  private readonly maxEscalations: number;

  constructor(options: PlannerOptions = {}) {
    this.maxEscalations = options.maxEscalations ?? DEFAULT_MAX_ESCALATIONS;
  }

  // ── generatePlan ───────────────────────────────────────────

  /**
   * Generate a multi-step plan for `goal`, grounded in the conscious
   * state at the moment of planning.
   *
   * Production systems will call the LLM substrate here to obtain a
   * structured plan; this implementation returns a deterministic
   * placeholder plan so that the surrounding orchestration machinery
   * (ConsciousCore.deliberate, precondition checking, replanning) can be
   * exercised and tested without an LLM dependency.
   *
   * The returned plan always has ≥1 steps and status "pending".
   * Budget compliance: if budgetMs elapses before generation completes,
   * the partially built plan is returned with status "suspended".
   */
  generatePlan(
    goal: Goal,
    state: ExperientialState,
    worldContext: WorldContext,
    budgetMs: number
  ): Plan {
    const startedAt = Date.now();

    // Build steps — in production this invokes the LLM substrate.
    const steps = this.buildStepsForGoal(goal, worldContext);

    const elapsed = Date.now() - startedAt;
    const status = elapsed >= budgetMs ? "suspended" : "pending";

    return {
      id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      terminalGoal: goal,
      steps,
      currentStepIndex: 0,
      status,
      waitState: null,
      temporalConstraints: [],
      experientialBasis: state, // no zombie planning
      createdAt: Date.now(),
      escalationCount: 0,
    };
  }

  // ── checkPreconditions ─────────────────────────────────────

  /**
   * Check whether all preconditions of a plan step are satisfied in the
   * current world context.  Each precondition specifies a `factKey`
   * (a key in WorldContext.facts) and an `expectedValue`.  We compare
   * via JSON-serialised deep equality so primitive and object values
   * both work without a dependency on a deep-equal library.
   */
  checkPreconditions(
    step: PlanStep,
    worldContext: WorldContext
  ): PreconditionCheckResult {
    const unsatisfied: Precondition[] = [];
    const details: string[] = [];

    for (const pre of step.preconditions) {
      const actual = worldContext.facts[pre.factKey];
      if (!deepEqual(actual, pre.expectedValue)) {
        unsatisfied.push(pre);
        details.push(
          `Precondition "${pre.id}" (${pre.description}) not satisfied: ` +
            `expected ${JSON.stringify(pre.expectedValue)}, ` +
            `got ${JSON.stringify(actual)}`
        );
      }
    }

    return {
      satisfied: unsatisfied.length === 0,
      checkedAt: Date.now(),
      unsatisfiedPreconditions: unsatisfied,
      details,
    };
  }

  // ── evaluateOutcome ────────────────────────────────────────

  /**
   * Evaluate whether the step's expected postconditions were met by the
   * actual ActionResult.  Each postcondition specifies a `resultKey` (a
   * top-level key of ActionResult cast to Record<string, unknown>) and an
   * `expectedValue`.
   */
  evaluateOutcome(
    step: PlanStep,
    actualOutcome: ActionResult,
    worldContext: WorldContext
  ): PostconditionCheckResult {
    void worldContext; // reserved for future world-state postcondition evaluation
    const violated: Postcondition[] = [];
    const details: string[] = [];

    const resultMap = actualOutcome as unknown as Record<string, unknown>;

    for (const post of step.postconditions) {
      const actual = resultMap[post.resultKey];
      if (!deepEqual(actual, post.expectedValue)) {
        violated.push(post);
        details.push(
          `Postcondition "${post.id}" (${post.description}) violated: ` +
            `expected ${JSON.stringify(post.expectedValue)}, ` +
            `got ${JSON.stringify(actual)}`
        );
      }
    }

    return {
      met: violated.length === 0,
      checkedAt: Date.now(),
      violatedPostconditions: violated,
      actualOutcome,
      details,
    };
  }

  // ── replan ─────────────────────────────────────────────────

  /**
   * Produce a revised plan after a step failure.
   *
   * The revised plan:
   *   - Preserves the terminal goal
   *   - Carries the current experiential state as its new experientialBasis
   *   - Increments escalationCount by one
   *   - Resets currentStepIndex to 0 (re-executes from the start of the
   *     revised step sequence)
   *   - Clears any wait state from the failed plan
   *
   * In production, the LLM substrate is consulted to produce an
   * alternative step sequence; this implementation regenerates a
   * placeholder plan with the failure reason injected as context.
   */
  replan(
    plan: Plan,
    failureReason: PlanFailureReason,
    state: ExperientialState,
    worldContext: WorldContext,
    budgetMs: number
  ): Plan {
    const revisedPlan = this.generatePlan(
      plan.terminalGoal,
      state,
      worldContext,
      budgetMs
    );

    // Carry forward escalation history.
    revisedPlan.escalationCount = plan.escalationCount + 1;

    // Annotate the first step's description with the failure reason so the
    // execution log is traceable.
    if (revisedPlan.steps.length > 0) {
      const firstStep = revisedPlan.steps[0];
      (revisedPlan.steps as PlanStep[])[0] = {
        ...firstStep,
        description: `[replan: ${failureReason}] ${firstStep.description}`,
      };
    }

    return revisedPlan;
  }

  // ── registerSubgoals ───────────────────────────────────────

  /**
   * Register all plan steps that carry an `instrumentalGoalId` with the
   * Goal Coherence Engine.  Each registration creates a derivation link
   * from the instrumental subgoal back to the terminal goal, preventing
   * orphan-goal warnings from the stability system.
   */
  registerSubgoals(plan: Plan, coherenceEngine: IGoalCoherenceEngine): void {
    for (const step of plan.steps) {
      if (step.instrumentalGoalId === null) continue;

      const subgoal: AgencyGoal = {
        id: step.instrumentalGoalId,
        description: step.description,
        priority: plan.terminalGoal.priority - 1, // slightly lower than terminal
        derivedFrom: [plan.terminalGoal.id],
        consistentWith: [],
        conflictsWith: [],
        createdAt: Date.now(),
        lastVerified: Date.now(),
        experientialBasis: plan.experientialBasis,
        type: "instrumental",
      };

      coherenceEngine.addGoal(subgoal);
    }
  }

  // ── shouldAbandon ──────────────────────────────────────────

  /**
   * Decide whether the plan has exceeded the patience threshold and should
   * be abandoned rather than replanned again.
   *
   * The patience threshold is configured via `maxEscalations`.  Future
   * extensions may consult the personality module (0.3.1.5.2) for a
   * per-agent parameter.
   */
  shouldAbandon(plan: Plan, escalationCount: number): boolean {
    return escalationCount >= this.maxEscalations;
  }

  // ── Private helpers ────────────────────────────────────────

  /**
   * Build a placeholder step sequence for `goal`.
   *
   * The three steps model a canonical means-ends decomposition:
   *   1. Establish preconditions (instrumental)
   *   2. Execute the primary action
   *   3. Verify outcome
   *
   * In production, the LLM substrate replaces this with a domain-specific
   * decomposition grounded in the goal description and world context.
   */
  private buildStepsForGoal(goal: Goal, _worldContext: WorldContext): PlanStep[] {
    return [
      makePlaceholderStep(
        `step-${goal.id}-1`,
        `Establish preconditions for: ${goal.description}`,
        [],
        [{ id: "post-ready", description: "preconditions established", resultKey: "success", expectedValue: true }],
        null
      ),
      makePlaceholderStep(
        `step-${goal.id}-2`,
        `Execute primary action for: ${goal.description}`,
        [],
        [{ id: "post-executed", description: "primary action executed", resultKey: "success", expectedValue: true }],
        null
      ),
      makePlaceholderStep(
        `step-${goal.id}-3`,
        `Verify outcome for: ${goal.description}`,
        [],
        [{ id: "post-verified", description: "outcome verified", resultKey: "success", expectedValue: true }],
        null
      ),
    ];
  }
}

// ── Module-level helpers ───────────────────────────────────────

function makePlaceholderStep(
  id: string,
  description: string,
  preconditions: Precondition[],
  postconditions: Postcondition[],
  instrumentalGoalId: string | null
): PlanStep {
  return {
    id,
    description,
    preconditions,
    postconditions,
    instrumentalGoalId,
    estimatedDuration: null,
    deadline: null,
    temporalConstraints: [],
  };
}

/**
 * Structural deep equality via JSON serialisation.
 * Adequate for the flat fact/result maps used by precondition and
 * postcondition checking; not intended for circular structures.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

// Re-export for convenience so callers can import WaitState helpers from
// the same module if needed in future.
export type { WaitState };
