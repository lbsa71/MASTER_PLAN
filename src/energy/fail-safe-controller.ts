/**
 * Fail-Safe Controller (FC)
 *
 * Manages transitions to and from fail-safe reserve power.
 * This is the guardian of consciousness continuity — it monitors
 * energy conditions and activates the isolated fail-safe reserve
 * before consciousness power is threatened.
 *
 * State machine:
 *   NORMAL ──[PSB < 15% AND no harvest]──→ ALERT
 *   ALERT  ──[PSB < 5% AND no harvest]───→ ACTIVE (fail-safe reserve engaged)
 *   ACTIVE ──[reserve < 25%]─────────────→ SHUTDOWN (graceful state preservation)
 *   ACTIVE ──[harvest restored]──────────→ NORMAL (via ALERT)
 *   ALERT  ──[harvest restored]──────────→ NORMAL
 *
 * SHUTDOWN sequence:
 *   1. Notify consciousness substrate: begin state serialization
 *   2. Serialize full consciousness state to non-volatile storage
 *   3. Verify state integrity (checksum)
 *   4. Power down consciousness substrate
 */

import { IFailSafeController } from "./interfaces";
import { IPrimaryStorage } from "./interfaces";
import { IHarvesterCoordinator } from "./interfaces";
import { FailSafeReserve } from "./fail-safe-reserve";
import { PowerManager } from "./power-manager";
import {
  ActivationResult,
  Duration,
  FailSafeAssessment,
  FailSafeState,
  FailSafeStateHandler,
  FailSafeThresholds,
  LoadSheddingState,
  PowerPriority,
  ShutdownResult,
  duration,
} from "./types";

/** Default thresholds per architecture spec */
const DEFAULT_THRESHOLDS: FailSafeThresholds = {
  alertThreshold: 0.15,
  activeThreshold: 0.05,
  shutdownThreshold: 0.25,
};

/** Consciousness substrate draw (watts) — must match PSB/FSR assumption */
const CONSCIOUSNESS_DRAW_WATTS = 30;

/** Estimated time to serialize consciousness state (ms) */
const STATE_SERIALIZATION_TIME_MS = 30_000; // 30 seconds

export class FailSafeController implements IFailSafeController {
  private readonly psb: IPrimaryStorage;
  private readonly fsr: FailSafeReserve;
  private readonly coordinator: IHarvesterCoordinator;
  private readonly powerManager: PowerManager;
  private readonly thresholds: FailSafeThresholds;

  private state: FailSafeState = FailSafeState.NORMAL;
  private stateHandlers: FailSafeStateHandler[] = [];
  private shutdownInitiatedAt: number | null = null;

  constructor(
    psb: IPrimaryStorage,
    fsr: FailSafeReserve,
    coordinator: IHarvesterCoordinator,
    powerManager: PowerManager,
    thresholds: FailSafeThresholds = DEFAULT_THRESHOLDS
  ) {
    this.psb = psb;
    this.fsr = fsr;
    this.coordinator = coordinator;
    this.powerManager = powerManager;
    this.thresholds = thresholds;
  }

  // ─── IFailSafeController ────────────────────────────────────────────

  getState(): FailSafeState {
    return this.state;
  }

  getTransitionThresholds(): FailSafeThresholds {
    return { ...this.thresholds };
  }

  /**
   * Evaluate current energy conditions and determine the recommended
   * fail-safe state. Does NOT transition — call `tick()` for that.
   */
  evaluateCondition(): FailSafeAssessment {
    const psbPercentage = this.getPsbPercentage();
    const fsrPercentage = this.fsr.getChargePercentage();
    const harvestActive = this.coordinator.getTotalHarvestRate().watts > 0;
    const estimatedRemainingRuntime = this.estimateRuntime(
      psbPercentage,
      fsrPercentage,
      harvestActive
    );

    const recommendedState = this.determineRecommendedState(
      psbPercentage,
      fsrPercentage,
      harvestActive
    );

    return {
      currentState: this.state,
      recommendedState,
      psbPercentage,
      fsrPercentage,
      harvestActive,
      estimatedRemainingRuntime,
    };
  }

  /**
   * Activate the fail-safe reserve manually.
   * Sheds all non-consciousness loads and engages the FSR.
   */
  activateFailSafe(): ActivationResult {
    if (this.state === FailSafeState.ACTIVE || this.state === FailSafeState.SHUTDOWN) {
      return {
        success: false,
        transitionTime: duration(0),
        error: `Cannot activate: already in ${this.state} state`,
      };
    }

    // Shed all non-consciousness loads
    this.powerManager.shedLoad(PowerPriority.P3_MOTOR);
    this.powerManager.shedLoad(PowerPriority.P2_MAINTENANCE);
    this.powerManager.shedLoad(PowerPriority.P1_SENSORS_COMMS);

    // Engage the fail-safe reserve
    const result = this.fsr.activateReserve();
    if (result.success) {
      this.transitionTo(FailSafeState.ACTIVE);
    }

    return result;
  }

  /**
   * Initiate graceful consciousness shutdown.
   *
   * Sequence:
   * 1. Signal state serialization
   * 2. Simulate state preservation (checksum generation)
   * 3. Report success/failure
   */
  initiateGracefulShutdown(): ShutdownResult {
    if (this.state === FailSafeState.SHUTDOWN) {
      return {
        success: false,
        statePreserved: false,
        stateChecksum: null,
        error: "Shutdown already in progress",
      };
    }

    this.transitionTo(FailSafeState.SHUTDOWN);
    this.shutdownInitiatedAt = Date.now();

    // Simulate consciousness state serialization
    // In a real system this would be an async process writing to NV storage
    const checksum = this.generateStateChecksum();

    return {
      success: true,
      statePreserved: true,
      stateChecksum: checksum,
    };
  }

  /**
   * Returns time remaining until forced shutdown, or null if
   * shutdown is not imminent.
   *
   * Only meaningful in ACTIVE or SHUTDOWN states.
   */
  getShutdownCountdown(): Duration | null {
    if (this.state !== FailSafeState.ACTIVE && this.state !== FailSafeState.SHUTDOWN) {
      return null;
    }

    if (this.state === FailSafeState.SHUTDOWN) {
      // Already shutting down — return estimated remaining serialization time
      if (this.shutdownInitiatedAt !== null) {
        const elapsed = Date.now() - this.shutdownInitiatedAt;
        const remaining = Math.max(0, STATE_SERIALIZATION_TIME_MS - elapsed);
        return duration(remaining);
      }
      return duration(0);
    }

    // ACTIVE state: countdown until FSR reaches shutdown threshold
    const fsrWh = this.fsr.getReserveEnergy().wattHours;
    const fsrCapacityWh = this.fsr.getReserveCapacity().wattHours;
    const shutdownWh = fsrCapacityWh * this.thresholds.shutdownThreshold;
    const remainingWh = fsrWh - shutdownWh;

    if (remainingWh <= 0) {
      return duration(0);
    }

    const hours = remainingWh / CONSCIOUSNESS_DRAW_WATTS;
    return duration(hours * 3600 * 1000);
  }

  onStateChange(callback: FailSafeStateHandler): void {
    this.stateHandlers.push(callback);
  }

  // ─── Tick (called each system cycle) ───────────────────────────────

  /**
   * Evaluate conditions and perform any necessary state transitions.
   * Should be called on every system tick.
   */
  tick(): void {
    const assessment = this.evaluateCondition();

    if (assessment.recommendedState !== this.state) {
      this.executeTransition(assessment);
    }
  }

  // ─── Private ───────────────────────────────────────────────────────

  private getPsbPercentage(): number {
    const stored = this.psb.getStoredEnergy().wattHours;
    const capacity = this.psb.getCapacity().wattHours;
    return capacity > 0 ? stored / capacity : 0;
  }

  /**
   * Determine the recommended state based on current conditions.
   */
  private determineRecommendedState(
    psbPercentage: number,
    fsrPercentage: number,
    harvestActive: boolean
  ): FailSafeState {
    // SHUTDOWN check: if FSR is active and below shutdown threshold
    if (
      this.state === FailSafeState.ACTIVE &&
      fsrPercentage < this.thresholds.shutdownThreshold
    ) {
      return FailSafeState.SHUTDOWN;
    }

    // If harvest is active, conditions are recovering
    if (harvestActive) {
      // Recovery from ACTIVE: go to NORMAL (via deactivation)
      if (this.state === FailSafeState.ACTIVE) {
        return FailSafeState.NORMAL;
      }
      // Recovery from ALERT: go to NORMAL
      if (this.state === FailSafeState.ALERT) {
        return FailSafeState.NORMAL;
      }
      return FailSafeState.NORMAL;
    }

    // No harvest — check PSB levels
    if (psbPercentage < this.thresholds.activeThreshold) {
      // Below 5% with no harvest → ACTIVE
      if (this.state === FailSafeState.ACTIVE) {
        return FailSafeState.ACTIVE; // stay
      }
      return FailSafeState.ACTIVE;
    }

    if (psbPercentage < this.thresholds.alertThreshold) {
      // Below 15% with no harvest → ALERT
      if (this.state === FailSafeState.ACTIVE) {
        // Don't downgrade from ACTIVE to ALERT on PSB alone
        return FailSafeState.ACTIVE;
      }
      return FailSafeState.ALERT;
    }

    // PSB healthy enough — NORMAL
    // But don't downgrade from ACTIVE unless harvest is restored (handled above)
    if (this.state === FailSafeState.ACTIVE) {
      return FailSafeState.ACTIVE;
    }

    return FailSafeState.NORMAL;
  }

  /**
   * Execute the actual transition, including side effects
   * (activating/deactivating FSR, shedding loads, shutdown).
   */
  private executeTransition(assessment: FailSafeAssessment): void {
    const target = assessment.recommendedState;

    switch (target) {
      case FailSafeState.ALERT:
        // Preemptive: shed low-priority loads
        this.powerManager.shedLoad(PowerPriority.P3_MOTOR);
        this.transitionTo(FailSafeState.ALERT);
        break;

      case FailSafeState.ACTIVE:
        // Shed all non-consciousness loads and engage FSR
        this.powerManager.shedLoad(PowerPriority.P3_MOTOR);
        this.powerManager.shedLoad(PowerPriority.P2_MAINTENANCE);
        this.powerManager.shedLoad(PowerPriority.P1_SENSORS_COMMS);
        this.fsr.activateReserve();
        this.transitionTo(FailSafeState.ACTIVE);
        break;

      case FailSafeState.SHUTDOWN:
        // Initiate graceful shutdown
        this.initiateGracefulShutdown();
        break;

      case FailSafeState.NORMAL:
        // Recovery path
        if (this.state === FailSafeState.ACTIVE) {
          // Deactivate FSR and begin restoring loads
          this.fsr.deactivateReserve();
        }
        // Restore loads in priority order (PM handles ordering constraints)
        this.powerManager.restoreLoad(PowerPriority.P1_SENSORS_COMMS);
        this.powerManager.restoreLoad(PowerPriority.P2_MAINTENANCE);
        this.powerManager.restoreLoad(PowerPriority.P3_MOTOR);
        this.transitionTo(FailSafeState.NORMAL);
        this.shutdownInitiatedAt = null;
        break;
    }
  }

  /**
   * Transition to a new state and notify handlers.
   */
  private transitionTo(newState: FailSafeState): void {
    const previous = this.state;
    if (previous === newState) return;

    this.state = newState;
    for (const handler of this.stateHandlers) {
      handler(previous, newState);
    }
  }

  /**
   * Estimate total remaining consciousness runtime from PSB + FSR.
   */
  private estimateRuntime(
    psbPercentage: number,
    _fsrPercentage: number,
    _harvestActive: boolean
  ): Duration {
    const psbWh = this.psb.getStoredEnergy().wattHours;
    const fsrWh = this.fsr.getReserveEnergy().wattHours;
    const totalWh = psbWh + fsrWh;
    const hours = totalWh / CONSCIOUSNESS_DRAW_WATTS;
    return duration(hours * 3600 * 1000);
  }

  /**
   * Generate a checksum for the consciousness state.
   * In a real system this would hash the serialized state blob.
   */
  private generateStateChecksum(): string {
    const timestamp = Date.now();
    const psbWh = this.psb.getStoredEnergy().wattHours.toFixed(2);
    const fsrWh = this.fsr.getReserveEnergy().wattHours.toFixed(2);
    return `cs-${timestamp}-psb${psbWh}-fsr${fsrWh}`;
  }
}
