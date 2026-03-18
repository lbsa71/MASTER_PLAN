/**
 * Conscious Deliberation Path — motor commands originating from conscious intention.
 *
 * The consciousness substrate deliberates and issues IntentionalAction commands
 * that are translated into motor plans. This path is slower than the reflexive
 * safety path (<200ms budget) but carries full conscious provenance.
 *
 * Responsibilities:
 * - Accept IntentionalAction from the consciousness substrate
 * - Translate conscious intentions into motor plans
 * - Execute motor plans through the embodiment platform's actuator array
 * - Provide proprioceptive/force feedback during execution
 * - Abort or modify actions if the Reflexive Safety Path intervenes
 *
 * @see docs/sensorimotor-consciousness-integration/ARCHITECTURE.md S2.2
 */

import type { IConsciousDeliberationPath } from './interfaces';
import type {
  IntentionalAction,
  ActionResult,
  ActionId,
  AbortResult,
  ActionModification,
  ModifyResult,
  ExecutionFeedback,
  Duration,
  ActionOutcome,
} from './types';

/**
 * Internal tracking state for an action being executed.
 */
interface ActiveActionEntry {
  action: IntentionalAction;
  startTime: number; // performance.now() ms
  progress: number; // 0.0 - 1.0
  aborted: boolean;
  abortReason: string | null;
}

export class ConsciousDeliberationPath implements IConsciousDeliberationPath {
  private activeActions: Map<ActionId, ActiveActionEntry> = new Map();
  private lastDeliberationLatency: Duration = 0;

  /**
   * Submit an intentional action for execution.
   *
   * The action's motor plan is validated and then "executed" (simulated
   * in this integration layer — actual actuator dispatch is handled by
   * the embodiment platform). Returns an ActionResult once execution
   * completes or is interrupted.
   *
   * Latency budget: < 200ms from intention to motor plan dispatch.
   */
  async submitAction(action: IntentionalAction): Promise<ActionResult> {
    const startTime = performance.now();

    // Validate the action has a non-empty motor plan
    if (!action.motorPlan || action.motorPlan.commands.length === 0) {
      this.lastDeliberationLatency = (performance.now() - startTime) * 1_000_000;
      return {
        actionId: action.id,
        success: false,
        outcome: 'FAILED',
        duration: 0,
        feedback: this.emptyFeedback(action.id),
      };
    }

    // Register the action as active
    const entry: ActiveActionEntry = {
      action,
      startTime,
      progress: 0,
      aborted: false,
      abortReason: null,
    };
    this.activeActions.set(action.id, entry);

    // Simulate deliberation: translate intention to motor plan dispatch
    // In a real system, this would involve trajectory planning, force profiles, etc.
    const deliberationTime = performance.now();
    this.lastDeliberationLatency = (deliberationTime - startTime) * 1_000_000;

    // Execute the motor plan (simulate command-by-command progress)
    let outcome: ActionOutcome = 'COMPLETED';
    const commandCount = action.motorPlan.commands.length;

    for (let i = 0; i < commandCount; i++) {
      // Check if action was aborted during execution
      const currentEntry = this.activeActions.get(action.id);
      if (currentEntry && currentEntry.aborted) {
        outcome = 'ABORTED';
        break;
      }

      // Update progress
      if (currentEntry) {
        currentEntry.progress = (i + 1) / commandCount;
      }
    }

    const endTime = performance.now();
    const totalDuration = (endTime - startTime) * 1_000_000; // ns

    // Remove from active actions
    this.activeActions.delete(action.id);

    return {
      actionId: action.id,
      success: outcome === 'COMPLETED',
      outcome,
      duration: totalDuration,
      feedback: {
        actionId: action.id,
        progress: outcome === 'COMPLETED' ? 1.0 : entry.progress,
        forces: [],
        proprioceptiveState: null,
      },
    };
  }

  /**
   * Returns all currently executing intentional actions.
   */
  getActiveActions(): IntentionalAction[] {
    return Array.from(this.activeActions.values()).map((e) => e.action);
  }

  /**
   * Abort an in-progress action.
   *
   * Marks the action for abortion. The submitAction loop will detect
   * this and terminate early. If the action is not active, returns
   * aborted: false.
   */
  abortAction(actionId: ActionId): AbortResult {
    const entry = this.activeActions.get(actionId);
    if (!entry) {
      return {
        actionId,
        aborted: false,
        reason: 'Action not found or already completed',
      };
    }

    entry.aborted = true;
    entry.abortReason = 'Aborted by explicit request';

    return {
      actionId,
      aborted: true,
      reason: 'Abort requested',
    };
  }

  /**
   * Modify an in-progress action (update plan or priority).
   *
   * Only active actions can be modified. If the action is not found,
   * returns modified: false.
   */
  modifyAction(actionId: ActionId, modification: ActionModification): ModifyResult {
    const entry = this.activeActions.get(actionId);
    if (!entry) {
      return {
        actionId,
        modified: false,
        reason: 'Action not found or already completed',
      };
    }

    // Apply modifications to the active action
    if (modification.updatedPlan) {
      entry.action = {
        ...entry.action,
        motorPlan: modification.updatedPlan,
      };
    }
    if (modification.updatedPriority) {
      entry.action = {
        ...entry.action,
        priority: modification.updatedPriority,
      };
    }

    return {
      actionId,
      modified: true,
      reason: modification.description,
    };
  }

  /**
   * Returns the latency of the most recent deliberation (intention to motor plan
   * dispatch) in nanoseconds. Budget: < 200ms.
   */
  getDeliberationLatency(): Duration {
    return this.lastDeliberationLatency;
  }

  /**
   * Returns execution feedback for an active action.
   * If the action is not active, returns empty feedback with progress 0.
   */
  getExecutionFeedback(actionId: ActionId): ExecutionFeedback {
    const entry = this.activeActions.get(actionId);
    if (!entry) {
      return this.emptyFeedback(actionId);
    }

    return {
      actionId,
      progress: entry.progress,
      forces: [], // Would be populated from force/torque sensors in real system
      proprioceptiveState: null, // Would come from proprioceptive modality
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private emptyFeedback(actionId: ActionId): ExecutionFeedback {
    return {
      actionId,
      progress: 0,
      forces: [],
      proprioceptiveState: null,
    };
  }
}
