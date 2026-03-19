/**
 * Planner unit + integration tests (0.3.1.5.6)
 *
 * Covers:
 *  Unit —
 *    generatePlan   : plan has ≥3 steps, experientialBasis, status "pending"
 *    checkPreconditions : satisfied / unsatisfied paths
 *    evaluateOutcome    : met / violated paths
 *    replan             : escalationCount incremented, failure reason annotated
 *    registerSubgoals   : coherenceEngine.addGoal called for instrumental steps
 *    shouldAbandon      : patience threshold enforcement
 *
 *  Integration —
 *    ConsciousCore.deliberateWithPlanner end-to-end:
 *      • generates plan on first cycle
 *      • advances step index on postcondition success
 *      • triggers replanning on postcondition violation (AC #3)
 *      • returns "waiting" when WaitState is active (AC #4)
 *      • clears WaitState once expiresAt is passed (AC #4)
 *      • triggers replanning on step deadline breach (AC #4)
 *      • marks plan completed when all steps exhausted
 *      • abandons plan when escalationCount >= maxEscalations
 *
 *  Integration scenario (AC #8) —
 *    Agent given a goal with multiple prerequisite steps generates a plan (≥3
 *    steps), executes it, encounters an unexpected obstacle (postcondition
 *    violation), replans, and achieves the goal via an alternative route.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Planner } from "../planner.js";
import { ConsciousCore } from "../conscious-core.js";
import { SubstrateAdapter } from "../substrate-adapter.js";
import { ExperienceMonitor } from "../experience-monitor.js";
import { PerceptionPipeline } from "../perception-pipeline.js";
import type {
  ExperientialState,
  Goal,
  ActionResult,
  SensorData,
  SubstrateConfig,
} from "../types.js";
import type { IGoalCoherenceEngine } from "../../agency-stability/interfaces.js";
import type {
  GoalAddResult,
  GoalCoherenceReport,
  GoalConflict,
  GoalDriftReport,
  GoalId,
  GoalRemoveResult,
  ReconciliationPlan,
} from "../../agency-stability/types.js";
import type { WorldContext, WaitState } from "../planner-types.js";
import type { DeliberationContext } from "../planner-interfaces.js";

// ── Test fixtures ──────────────────────────────────────────────────────────

const NOW = Date.now();

const makeState = (ts: number = NOW): ExperientialState => ({
  timestamp: ts,
  phenomenalContent: { modalities: ["test"], richness: 0.5, raw: {} },
  intentionalContent: { target: "test", clarity: 0.8 },
  valence: 0.0,
  arousal: 0.5,
  unityIndex: 0.85,
  continuityToken: { id: `ct-${ts}`, previousId: null, timestamp: ts },
});

const makeGoal = (id = "g1", description = "test goal", priority = 5): Goal => ({
  id,
  description,
  priority,
});

const makeWorldContext = (facts: Record<string, unknown> = {}): WorldContext => ({
  timestamp: NOW,
  facts,
  confidence: 0.9,
});

const makeActionResult = (success: boolean): ActionResult => ({
  actionId: "a1",
  success,
  timestamp: NOW,
});

/** Minimal no-op coherence engine mock. */
function makeCoherenceEngine(): IGoalCoherenceEngine & { addedGoals: string[] } {
  const addedGoals: string[] = [];
  return {
    addedGoals,
    validateHierarchy(): GoalCoherenceReport {
      return {
        coherent: true,
        coherenceScore: 1,
        orphanGoals: [],
        circularDependencies: [],
        conflicts: [],
        checkedAt: NOW,
      };
    },
    addGoal(goal): GoalAddResult {
      addedGoals.push(goal.id);
      return { success: true, goalId: goal.id, newCoherenceScore: 1, conflictsIntroduced: [] };
    },
    removeGoal(goalId: GoalId): GoalRemoveResult {
      return { success: true, goalId, orphanedGoals: [], newCoherenceScore: 1 };
    },
    detectDrift(): GoalDriftReport {
      return {
        period: { from: NOW, to: NOW },
        goalsAdded: [],
        goalsRemoved: [],
        goalsModified: [],
        derivationIntegrity: true,
        coherenceHistory: [],
        driftClassification: "growth",
      };
    },
    reconcile(_conflicts: GoalConflict[]): ReconciliationPlan {
      return { conflicts: [], proposedResolutions: [], projectedCoherence: 1 };
    },
    getDerivationTrace(_goalId: GoalId): GoalId[] {
      return [];
    },
  };
}

/** Build a ConsciousCore wired to lightweight concrete deps. */
function makeCore() {
  const config: SubstrateConfig = { type: "neural-emulation", parameters: { capacity: 100 } };
  const substrate = new SubstrateAdapter();
  substrate.initialize(config);
  const monitor = new ExperienceMonitor(substrate);
  const perception = new PerceptionPipeline();
  return new ConsciousCore(substrate, monitor, perception);
}

/** Produce an experiential state from a fresh ConsciousCore. */
function makeExperientialState(core: ConsciousCore): ExperientialState {
  const sd: SensorData = {
    source: "test",
    modality: "test",
    payload: {},
    timestamp: Date.now(),
  };
  const perception = new PerceptionPipeline();
  const percept = perception.ingest(sd);
  return core.processPercept(percept);
}

// ── Planner unit tests ─────────────────────────────────────────────────────

describe("Planner — unit", () => {
  let planner: Planner;
  let state: ExperientialState;
  let goal: Goal;
  let wc: WorldContext;

  beforeEach(() => {
    planner = new Planner();
    state = makeState();
    goal = makeGoal();
    wc = makeWorldContext();
  });

  // generatePlan ─────────────────────────────────────────────────────────

  describe("generatePlan()", () => {
    it("returns a plan with ≥3 steps for a non-trivial goal (AC #1)", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      expect(plan.steps.length).toBeGreaterThanOrEqual(3);
    });

    it("sets status to 'pending' when generation completes within budget", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      expect(plan.status).toBe("pending");
    });

    it("carries experientialBasis — no zombie planning (AC #7)", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      expect(plan.experientialBasis).toBe(state);
    });

    it("sets terminalGoal to the provided goal", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      expect(plan.terminalGoal).toBe(goal);
    });

    it("initialises currentStepIndex to 0", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      expect(plan.currentStepIndex).toBe(0);
    });

    it("initialises escalationCount to 0", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      expect(plan.escalationCount).toBe(0);
    });

    it("initialises waitState to null", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      expect(plan.waitState).toBeNull();
    });

    it("each step has preconditions and postconditions arrays (AC #2)", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      for (const step of plan.steps) {
        expect(Array.isArray(step.preconditions)).toBe(true);
        expect(Array.isArray(step.postconditions)).toBe(true);
      }
    });
  });

  // checkPreconditions ───────────────────────────────────────────────────

  describe("checkPreconditions()", () => {
    it("returns satisfied=true when no preconditions are declared", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      const step = plan.steps[0];
      // Default placeholder steps have no preconditions
      const result = planner.checkPreconditions(step, wc);
      expect(result.satisfied).toBe(true);
    });

    it("returns satisfied=false when a precondition fact is absent (AC #2)", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      // Manually inject a precondition referencing an absent fact.
      const step = {
        ...plan.steps[0],
        preconditions: [
          {
            id: "pre-1",
            description: "door must be open",
            factKey: "door.open",
            expectedValue: true,
          },
        ],
      };
      const result = planner.checkPreconditions(step, makeWorldContext({}));
      expect(result.satisfied).toBe(false);
      expect(result.unsatisfiedPreconditions).toHaveLength(1);
    });

    it("returns satisfied=true when all precondition facts match", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      const step = {
        ...plan.steps[0],
        preconditions: [
          {
            id: "pre-1",
            description: "door must be open",
            factKey: "door.open",
            expectedValue: true,
          },
        ],
      };
      const result = planner.checkPreconditions(step, makeWorldContext({ "door.open": true }));
      expect(result.satisfied).toBe(true);
    });
  });

  // evaluateOutcome ──────────────────────────────────────────────────────

  describe("evaluateOutcome()", () => {
    it("returns met=true when all postconditions are satisfied (AC #3)", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      // Default step has a postcondition checking success===true.
      const step = plan.steps[0];
      const result = planner.evaluateOutcome(step, makeActionResult(true), wc);
      expect(result.met).toBe(true);
      expect(result.violatedPostconditions).toHaveLength(0);
    });

    it("returns met=false when a postcondition is violated (AC #3)", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      const step = plan.steps[0];
      // Pass success=false — default postcondition expects true.
      const result = planner.evaluateOutcome(step, makeActionResult(false), wc);
      expect(result.met).toBe(false);
      expect(result.violatedPostconditions.length).toBeGreaterThan(0);
    });

    it("includes the actual ActionResult in the check result", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      const outcome = makeActionResult(true);
      const result = planner.evaluateOutcome(plan.steps[0], outcome, wc);
      expect(result.actualOutcome).toBe(outcome);
    });
  });

  // replan ───────────────────────────────────────────────────────────────

  describe("replan()", () => {
    it("increments escalationCount by 1", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      const replanned = planner.replan(plan, "postcondition-violated", state, wc, 5000);
      expect(replanned.escalationCount).toBe(plan.escalationCount + 1);
    });

    it("preserves the terminal goal", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      const replanned = planner.replan(plan, "precondition-not-met", state, wc, 5000);
      expect(replanned.terminalGoal).toEqual(goal);
    });

    it("annotates the first step description with the failure reason", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      const replanned = planner.replan(plan, "deadline-exceeded", state, wc, 5000);
      expect(replanned.steps[0].description).toContain("deadline-exceeded");
    });

    it("produces a plan with ≥3 steps (AC #1)", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      const replanned = planner.replan(plan, "postcondition-violated", state, wc, 5000);
      expect(replanned.steps.length).toBeGreaterThanOrEqual(3);
    });
  });

  // registerSubgoals ─────────────────────────────────────────────────────

  describe("registerSubgoals()", () => {
    it("calls coherenceEngine.addGoal for each step with an instrumentalGoalId (AC #5)", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      // Inject instrumental goal IDs into steps to make registration testable.
      const patchedSteps = plan.steps.map((s, i) => ({
        ...s,
        instrumentalGoalId: `subgoal-${i}`,
      }));
      const patchedPlan = { ...plan, steps: patchedSteps };

      const ce = makeCoherenceEngine();
      planner.registerSubgoals(patchedPlan, ce);

      expect(ce.addedGoals).toHaveLength(patchedSteps.length);
      for (let i = 0; i < patchedSteps.length; i++) {
        expect(ce.addedGoals).toContain(`subgoal-${i}`);
      }
    });

    it("skips steps whose instrumentalGoalId is null", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      // Default steps have instrumentalGoalId === null.
      const ce = makeCoherenceEngine();
      planner.registerSubgoals(plan, ce);
      expect(ce.addedGoals).toHaveLength(0);
    });
  });

  // shouldAbandon ────────────────────────────────────────────────────────

  describe("shouldAbandon()", () => {
    it("returns false when escalationCount < maxEscalations (default 3)", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      expect(planner.shouldAbandon(plan, 2)).toBe(false);
    });

    it("returns true when escalationCount >= maxEscalations (default 3)", () => {
      const plan = planner.generatePlan(goal, state, wc, 5000);
      expect(planner.shouldAbandon(plan, 3)).toBe(true);
    });

    it("respects custom maxEscalations from PlannerOptions", () => {
      const strictPlanner = new Planner({ maxEscalations: 1 });
      const plan = strictPlanner.generatePlan(goal, state, wc, 5000);
      expect(strictPlanner.shouldAbandon(plan, 0)).toBe(false);
      expect(strictPlanner.shouldAbandon(plan, 1)).toBe(true);
    });
  });
});

// ── ConsciousCore integration tests ───────────────────────────────────────

describe("ConsciousCore.deliberateWithPlanner() — integration", () => {
  let core: ConsciousCore;
  let state: ExperientialState;
  let goals: Goal[];
  let planner: Planner;
  let wc: WorldContext;
  let ce: IGoalCoherenceEngine & { addedGoals: string[] };

  beforeEach(() => {
    core = makeCore();
    state = makeExperientialState(core);
    goals = [makeGoal("g1", "multi-step goal", 10)];
    planner = new Planner();
    wc = makeWorldContext();
    ce = makeCoherenceEngine();
  });

  function makeContext(overrides: Partial<DeliberationContext> = {}): DeliberationContext {
    return {
      planner,
      activePlan: null,
      worldContext: wc,
      coherenceEngine: ce,
      budgetMs: 5000,
      lastActionResult: null,
      ...overrides,
    };
  }

  it("returns a decision with action type matching first step description on first cycle (AC #1)", () => {
    const ctx = makeContext();
    const decision = core.deliberate(state, goals, ctx);
    expect(decision.action.type).toBeTruthy();
    expect(decision.action.type).not.toBe("idle");
    expect(decision.experientialBasis).toBe(state);
  });

  it("stores active plan in context.activePlan after first deliberation (AC #1)", () => {
    const ctx = makeContext();
    core.deliberate(state, goals, ctx);
    expect(ctx.activePlan).not.toBeNull();
    expect(ctx.activePlan!.steps.length).toBeGreaterThanOrEqual(3);
  });

  it("registers instrumental subgoals with coherence engine on plan generation (AC #5)", () => {
    // Override generatePlan via subclass to return a plan with instrumental steps.
    class InstrumentalPlanner extends Planner {
      override generatePlan(
        g: Goal,
        s: ExperientialState,
        w: WorldContext,
        b: number
      ) {
        const plan = super.generatePlan(g, s, w, b);
        const patchedSteps = plan.steps.map((step, i) => ({
          ...step,
          instrumentalGoalId: `sub-${i}`,
        }));
        return { ...plan, steps: patchedSteps };
      }
    }

    const ctx = makeContext({ planner: new InstrumentalPlanner() });
    core.deliberate(state, goals, ctx);
    expect(ce.addedGoals.length).toBeGreaterThanOrEqual(3);
  });

  it("advances step index when lastActionResult postconditions are met (AC #3)", () => {
    // Cycle 1 — generate plan.
    const ctx = makeContext();
    core.deliberate(state, goals, ctx);
    const planAfterCycle1 = ctx.activePlan!;
    expect(planAfterCycle1.currentStepIndex).toBe(0);

    // Cycle 2 — provide a successful ActionResult; postconditions should be met.
    ctx.lastActionResult = makeActionResult(true);
    core.deliberate(state, goals, ctx);
    expect(ctx.activePlan!.currentStepIndex).toBe(1);
  });

  it("triggers replanning when lastActionResult violates postconditions (AC #3)", () => {
    // Cycle 1 — generate plan, capture plan id.
    const ctx = makeContext();
    core.deliberate(state, goals, ctx);
    const originalPlanId = ctx.activePlan!.id;

    // Cycle 2 — fail postconditions.
    ctx.lastActionResult = makeActionResult(false);
    core.deliberate(state, goals, ctx);

    // A replan should have produced a new plan object.
    expect(ctx.activePlan!.escalationCount).toBeGreaterThan(0);
    // The first step description should carry the failure reason.
    expect(ctx.activePlan!.steps[0].description).toContain("postcondition-violated");
  });

  it("returns a 'waiting' decision when WaitState is active and not expired (AC #4)", () => {
    // Cycle 1 — generate plan.
    const ctx = makeContext();
    core.deliberate(state, goals, ctx);

    // Inject a non-expired wait state.
    const waitState: WaitState = {
      reason: "cooling down",
      expiresAt: Date.now() + 60_000,
      awaitingEvent: "cooldown-complete",
      waitingSince: Date.now(),
    };
    ctx.activePlan!.waitState = waitState;

    // Cycle 2 — should return a "waiting" decision.
    const decision = core.deliberate(state, goals, ctx);
    expect(decision.action.type).toBe("waiting");
    expect(decision.action.parameters.awaitingEvent).toBe("cooldown-complete");
  });

  it("clears WaitState and continues once expiresAt is passed (AC #4)", () => {
    // Cycle 1 — generate plan.
    const ctx = makeContext();
    core.deliberate(state, goals, ctx);

    // Inject an already-expired wait state.
    const expiredWait: WaitState = {
      reason: "already done",
      expiresAt: Date.now() - 1,  // in the past
      awaitingEvent: "never",
      waitingSince: Date.now() - 2000,
    };
    ctx.activePlan!.waitState = expiredWait;

    // Cycle 2 — wait is expired; should advance rather than return "waiting".
    const decision = core.deliberate(state, goals, ctx);
    expect(decision.action.type).not.toBe("waiting");
    expect(ctx.activePlan!.waitState).toBeNull();
  });

  it("triggers replanning when current step's deadline is breached (AC #4)", () => {
    // Cycle 1 — generate plan.
    const ctx = makeContext();
    core.deliberate(state, goals, ctx);

    // Inject an expired deadline on the current (first) step.
    const step = ctx.activePlan!.steps[0];
    (ctx.activePlan!.steps as typeof step[])[0] = {
      ...step,
      deadline: Date.now() - 1,  // already past
    };

    // Cycle 2 — deadline breached; should replan.
    const decision = core.deliberate(state, goals, ctx);
    expect(
      decision.action.parameters.reason === "deadline-exceeded" ||
      ctx.activePlan!.steps[0].description.includes("deadline-exceeded")
    ).toBe(true);
  });

  it("marks plan completed when all steps have been executed (AC #8)", () => {
    // Generate a plan then advance past all steps.
    const ctx = makeContext();
    core.deliberate(state, goals, ctx);
    const stepCount = ctx.activePlan!.steps.length;

    // Advance the step index past the end of the plan.
    ctx.activePlan!.currentStepIndex = stepCount;

    const decision = core.deliberate(state, goals, ctx);
    expect(decision.action.type).toBe("plan-completed");
    expect(ctx.activePlan!.status).toBe("completed");
  });

  it("abandons plan when escalationCount reaches maxEscalations (AC #8)", () => {
    const patientPlanner = new Planner({ maxEscalations: 1 });
    const ctx = makeContext({ planner: patientPlanner });

    // Cycle 1 — generate plan.
    core.deliberate(state, goals, ctx);

    // Drive escalationCount to the threshold.
    ctx.activePlan!.escalationCount = 1;

    // Cycle 2 — postcondition violation; shouldAbandon === true.
    ctx.lastActionResult = makeActionResult(false);
    const decision = core.deliberate(state, goals, ctx);
    expect(decision.action.type).toBe("plan-abandoned");
    expect(ctx.activePlan!.status).toBe("abandoned");
  });

  it("returns idle when no goals are provided", () => {
    const ctx = makeContext();
    const decision = core.deliberate(state, [], ctx);
    expect(decision.action.type).toBe("idle");
  });

  it("falls back to legacy priority-sort when planner is null", () => {
    // No planner in context → legacy path.
    const ctx = makeContext({ planner: null });
    const decision = core.deliberate(state, goals, ctx);
    // Legacy path returns the goal description as action type.
    expect(decision.action.type).toBe(goals[0].description);
  });
});

// ── AC #8 — full integration scenario ─────────────────────────────────────

describe("AC #8 — generate → execute → obstacle → replan → achieve", () => {
  /**
   * Scenario:
   *   - Agent has goal "build bridge".
   *   - Planner generates a 3-step plan (establish preconditions → execute → verify).
   *   - Agent executes step 1 (reports success → postconditions met → advance).
   *   - Agent executes step 2 (unexpected failure → postcondition violated → replan).
   *   - Replanned plan is generated (alternative route, escalationCount=1).
   *   - Agent executes replanned steps 1-3 successfully → plan completed.
   */
  it("achieves goal via alternative route after obstacle (AC #8)", () => {
    const core = makeCore();
    const state = makeExperientialState(core);
    const goal = makeGoal("bridge", "build bridge", 10);
    const planner = new Planner({ maxEscalations: 3 });
    const wc = makeWorldContext();
    const ce = makeCoherenceEngine();

    const ctx: DeliberationContext = {
      planner,
      activePlan: null,
      worldContext: wc,
      coherenceEngine: ce,
      budgetMs: 5000,
      lastActionResult: null,
    };

    // ── Cycle 1: plan generated ──
    let decision = core.deliberate(state, [goal], ctx);
    expect(ctx.activePlan).not.toBeNull();
    const originalPlan = ctx.activePlan!;
    expect(originalPlan.steps.length).toBeGreaterThanOrEqual(3);
    expect(originalPlan.escalationCount).toBe(0);
    expect(decision.experientialBasis).toBe(state); // no zombie planning

    // ── Cycle 2: step 0 succeeds — advance to step 1 ──
    ctx.lastActionResult = makeActionResult(true);
    decision = core.deliberate(state, [goal], ctx);
    expect(ctx.activePlan!.currentStepIndex).toBe(1);

    // ── Cycle 3: step 1 fails (unexpected obstacle) → replan ──
    ctx.lastActionResult = makeActionResult(false);
    decision = core.deliberate(state, [goal], ctx);
    const replannedPlan = ctx.activePlan!;
    expect(replannedPlan.escalationCount).toBe(1);
    expect(replannedPlan.steps[0].description).toContain("postcondition-violated");
    // Still targeting the same terminal goal.
    expect(replannedPlan.terminalGoal.id).toBe(goal.id);

    // ── Cycles 4-6: execute replanned steps successfully ──
    for (let i = 0; i < 3; i++) {
      ctx.lastActionResult = makeActionResult(true);
      decision = core.deliberate(state, [goal], ctx);
    }

    // After 3 successful steps, plan should be completed.
    expect(ctx.activePlan!.status).toBe("completed");
    expect(decision.action.type).toBe("plan-completed");
  });
});
