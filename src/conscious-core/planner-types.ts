/**
 * Planning and Temporal Reasoning types for the Conscious Core (0.3.1.5.6)
 *
 * These types support multi-step planning with temporal awareness:
 *   - Plan / PlanStep model goal decomposition with preconditions and postconditions
 *   - TemporalConstraint models deadlines and sequencing
 *   - WaitState models deliberate pauses pending external events
 *   - ExecutionStatus / PlanFailureReason model plan lifecycle
 *   - WorldContext is the world-model snapshot used for precondition checking
 *   - PreconditionCheckResult / PostconditionCheckResult model check outcomes
 *
 * Key constraint: all plans carry an `experientialBasis` (no zombie planning).
 */

import type { ExperientialState, Goal, Duration, Timestamp, ActionResult } from './types.js';
import type { GoalId } from '../agency-stability/types.js';

// ── Primitives ──────────────────────────────────────────────

export type PlanId = string;
export type PlanStepId = string;

// ── Execution Status ────────────────────────────────────────

export type ExecutionStatus =
  | 'pending'     // not yet started
  | 'active'      // currently executing
  | 'suspended'   // paused (e.g. in a wait state or budget exceeded)
  | 'completed'   // all steps succeeded
  | 'failed'      // a step failed beyond escalation threshold
  | 'abandoned';  // goal no longer achievable or worthwhile

// ── Plan Failure ────────────────────────────────────────────

export type PlanFailureReason =
  | 'precondition-not-met'        // preconditions could not be satisfied
  | 'postcondition-violated'      // outcome did not match expectation
  | 'deadline-exceeded'           // time constraint was breached
  | 'goal-no-longer-achievable'   // world state makes goal impossible
  | 'goal-no-longer-worthwhile'   // cost/benefit analysis changed
  | 'budget-exhausted'            // cognitive budget fully consumed
  | 'external-event'              // unexpected external change
  | 'max-escalations-reached';    // replanning failed too many times

// ── Temporal Constraints ────────────────────────────────────

/**
 * Models time-based constraints on plan steps or entire plans.
 */
export interface TemporalConstraint {
  readonly type: 'deadline' | 'not-before' | 'sequence';
  /** Epoch ms for deadline / not-before; undefined for sequence constraints. */
  readonly timestamp?: Timestamp;
  /**
   * For sequence constraints: the step ID that must precede this one.
   * For deadline / not-before: undefined.
   */
  readonly afterStepId?: PlanStepId;
}

// ── Wait State ──────────────────────────────────────────────

/**
 * Describes a deliberate pause in plan execution pending an external event.
 * Persists in working memory across cycles.
 */
export interface WaitState {
  readonly reason: string;
  /** Epoch ms after which the wait expires; null = indefinite. */
  readonly expiresAt: Timestamp | null;
  /** Human-readable description of the awaited event. */
  readonly awaitingEvent: string;
  readonly waitingSince: Timestamp;
}

// ── Preconditions and Postconditions ───────────────────────

/**
 * A claim about the world that must be true before a step may execute.
 */
export interface Precondition {
  readonly id: string;
  readonly description: string;
  /** A query key / expression evaluated against WorldContext.facts. */
  readonly factKey: string;
  /** The expected value; compared via deep equality. */
  readonly expectedValue: unknown;
}

/**
 * A claim about the world that should be true after a step completes.
 */
export interface Postcondition {
  readonly id: string;
  readonly description: string;
  /** A key in ActionResult that should match expectedValue. */
  readonly resultKey: string;
  readonly expectedValue: unknown;
}

// ── Plan Step ───────────────────────────────────────────────

/**
 * A single step within a Plan.  Each step has explicit preconditions and
 * postconditions so the planner can detect failure and trigger replanning.
 *
 * `instrumentalGoalId` is non-null when the step creates an instrumental
 * subgoal that was registered with the Goal Coherence Engine.
 */
export interface PlanStep {
  readonly id: PlanStepId;
  readonly description: string;
  readonly preconditions: Precondition[];
  readonly postconditions: Postcondition[];
  /** Registered with GoalCoherenceEngine if non-null. */
  readonly instrumentalGoalId: GoalId | null;
  readonly estimatedDuration: Duration | null;
  /** Epoch ms deadline; null if unconstrained. */
  readonly deadline: Timestamp | null;
  readonly temporalConstraints: TemporalConstraint[];
}

// ── Plan ────────────────────────────────────────────────────

/**
 * A multi-step plan generated for a terminal goal.
 *
 * Key invariant: `experientialBasis` is always set — plan formation is a
 * conscious act, never a zombie process.
 */
export interface Plan {
  readonly id: PlanId;
  readonly terminalGoal: Goal;
  readonly steps: PlanStep[];
  currentStepIndex: number;
  status: ExecutionStatus;
  /** Non-null when the agent is deliberately waiting for an external event. */
  waitState: WaitState | null;
  readonly temporalConstraints: TemporalConstraint[];
  /** The experiential state at plan formation — enforces conscious planning. */
  readonly experientialBasis: ExperientialState;
  readonly createdAt: Timestamp;
  /** How many times this plan has been replanned. Used for abandon threshold. */
  escalationCount: number;
}

// ── World Context ────────────────────────────────────────────

/**
 * A snapshot of the agent's world model at a point in time, used for
 * precondition checking.  Provided by the World Model subsystem (0.3.1.5.5).
 *
 * `facts` is a flat key→value map; preconditions reference keys here.
 */
export interface WorldContext {
  readonly timestamp: Timestamp;
  readonly facts: Record<string, unknown>;
  /** Confidence in the world model snapshot; 0..1. */
  readonly confidence: number;
}

// ── Check Results ────────────────────────────────────────────

/**
 * Result of checking whether a PlanStep's preconditions are satisfied.
 */
export interface PreconditionCheckResult {
  readonly satisfied: boolean;
  readonly checkedAt: Timestamp;
  readonly unsatisfiedPreconditions: Precondition[];
  /** Explanations for any unsatisfied preconditions. */
  readonly details: string[];
}

/**
 * Result of evaluating whether a PlanStep's postconditions were met.
 */
export interface PostconditionCheckResult {
  readonly met: boolean;
  readonly checkedAt: Timestamp;
  readonly violatedPostconditions: Postcondition[];
  readonly actualOutcome: ActionResult;
  readonly details: string[];
}
