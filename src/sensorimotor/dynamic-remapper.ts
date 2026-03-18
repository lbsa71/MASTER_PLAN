/**
 * Dynamic Remapper — adjusts the qualia transformation pipeline when
 * modality configuration changes, enabling smooth experiential adaptation.
 *
 * When a modality is lost, added, or degraded, the remapper redistributes
 * experiential "bandwidth" to maintain consciousness continuity — analogous
 * to cortical remapping after sensory loss in biological systems.
 *
 * Coordinates with the Experience Continuity Guard to ensure remapping
 * does not disrupt conscious experience.
 *
 * @see docs/sensorimotor-consciousness-integration/ARCHITECTURE.md §4.2
 */

import type { IDynamicRemapper, IModalityAdapter, IExperienceContinuityGuard, IQualiaTransformer } from './interfaces';
import type {
  ModalityId,
  DegradationInfo,
  RemapResult,
  RemapStatus,
  RemapTransition,
  TransitionMonitorHandle,
  AttentionWeightMap,
  Timestamp,
  Duration,
} from './types';
import { LATENCY_BUDGET } from './types';

/**
 * Options for constructing a DynamicRemapper.
 */
export interface DynamicRemapperOptions {
  /** Experience Continuity Guard for gating and monitoring transitions */
  continuityGuard: IExperienceContinuityGuard;
  /** Qualia Transformer for adjusting attention weights during remapping */
  qualiaTransformer: IQualiaTransformer;
  /** Currently active modality IDs at construction time */
  activeModalities: ModalityId[];
  /** Function to get the current monotonic timestamp */
  getTimestamp?: () => Timestamp;
  /**
   * Number of discrete steps used to gradually transition attention weights
   * during a remap. Higher values = smoother but slower transitions.
   * Default: 10
   */
  transitionSteps?: number;
}

/**
 * Internal state for a remap transition in progress.
 */
interface ActiveRemap {
  transition: RemapTransition;
  monitorHandle: TransitionMonitorHandle;
  /** Pre-remap attention weight snapshot for rollback */
  previousWeights: AttentionWeightMap;
  /** Target attention weights after remap completes */
  targetWeights: AttentionWeightMap;
  /** Progress from 0.0 (just started) to 1.0 (complete) */
  progress: number;
  /** Current step in the gradual transition */
  currentStep: number;
  totalSteps: number;
  startTimestamp: Timestamp;
  rolledBack: boolean;
}

/**
 * Dynamic Remapper implementation.
 *
 * Remapping strategy:
 * - **Modality lost**: Redistribute the lost modality's attention weight equally
 *   among remaining modalities, then gradually fade in the new weights.
 * - **Modality added**: Introduce the new modality at zero attention weight and
 *   gradually ramp it up while slightly reducing existing weights.
 * - **Modality degraded**: Reduce the degraded modality's weight proportionally
 *   to the severity of degradation and boost related modalities.
 */
export class DynamicRemapper implements IDynamicRemapper {
  private continuityGuard: IExperienceContinuityGuard;
  private qualiaTransformer: IQualiaTransformer;
  private activeModalities: Set<ModalityId>;
  private getTimestamp: () => Timestamp;
  private transitionSteps: number;

  /** The current attention weights maintained by the remapper */
  private currentWeights: AttentionWeightMap = new Map();

  /** The currently active remap, if any. Only one remap at a time. */
  private activeRemap: ActiveRemap | null = null;

  constructor(options: DynamicRemapperOptions) {
    this.continuityGuard = options.continuityGuard;
    this.qualiaTransformer = options.qualiaTransformer;
    this.activeModalities = new Set(options.activeModalities);
    this.getTimestamp = options.getTimestamp ?? (() => Date.now() * 1_000_000);
    this.transitionSteps = options.transitionSteps ?? 10;

    // Initialize equal attention weights for all active modalities
    this.initializeWeights();
  }

  /**
   * Handle loss of a modality. Redistributes attention weight from the lost
   * modality to remaining modalities.
   *
   * The transition is gradual: weights are adjusted over multiple steps to
   * avoid experiential discontinuity.
   */
  onModalityLost(modalityId: ModalityId): RemapResult {
    if (!this.activeModalities.has(modalityId)) {
      return {
        success: false,
        affectedModalities: [],
        experienceContinuityMaintained: true,
        transitionDuration: 0,
      };
    }

    // Check with continuity guard before proceeding
    if (!this.continuityGuard.canProceedWithRemap()) {
      return {
        success: false,
        affectedModalities: [modalityId],
        experienceContinuityMaintained: true,
        transitionDuration: 0,
      };
    }

    const now = this.getTimestamp();
    const transition: RemapTransition = {
      type: 'MODALITY_LOST',
      modalityId,
      startTimestamp: now,
    };

    const monitorHandle = this.continuityGuard.monitorTransition(transition);

    // Snapshot current weights for rollback
    const previousWeights: AttentionWeightMap = new Map(this.currentWeights);

    // Compute target weights: remove lost modality, redistribute its weight
    const lostWeight = this.currentWeights.get(modalityId) ?? 0;
    const remainingModalities = [...this.activeModalities].filter(
      (id) => id !== modalityId
    );
    const targetWeights: AttentionWeightMap = new Map();

    if (remainingModalities.length > 0) {
      const redistributionPerModality = lostWeight / remainingModalities.length;
      for (const id of remainingModalities) {
        const existingWeight = this.currentWeights.get(id) ?? 0;
        targetWeights.set(
          id,
          Math.min(1.0, existingWeight + redistributionPerModality)
        );
      }
    }

    // Remove the lost modality from tracking
    this.activeModalities.delete(modalityId);

    // Start the gradual transition
    this.activeRemap = {
      transition,
      monitorHandle,
      previousWeights,
      targetWeights,
      progress: 0,
      currentStep: 0,
      totalSteps: this.transitionSteps,
      startTimestamp: now,
      rolledBack: false,
    };

    // Execute all transition steps synchronously (in production these would
    // be spread over time via an event loop / timer)
    const result = this.executeTransition();

    return {
      success: result.success,
      affectedModalities: [modalityId, ...remainingModalities],
      experienceContinuityMaintained: result.continuityMaintained,
      transitionDuration: this.getTimestamp() - now,
    };
  }

  /**
   * Handle addition of a new modality. Gradually integrates the new modality
   * into the qualia field without experiential discontinuity.
   */
  onModalityAdded(adapter: IModalityAdapter): RemapResult {
    const modalityId = adapter.modalityId;

    if (this.activeModalities.has(modalityId)) {
      return {
        success: false,
        affectedModalities: [],
        experienceContinuityMaintained: true,
        transitionDuration: 0,
      };
    }

    if (!this.continuityGuard.canProceedWithRemap()) {
      return {
        success: false,
        affectedModalities: [modalityId],
        experienceContinuityMaintained: true,
        transitionDuration: 0,
      };
    }

    const now = this.getTimestamp();
    const transition: RemapTransition = {
      type: 'MODALITY_ADDED',
      modalityId,
      startTimestamp: now,
    };

    const monitorHandle = this.continuityGuard.monitorTransition(transition);

    const previousWeights: AttentionWeightMap = new Map(this.currentWeights);

    // Add the new modality to tracking
    this.activeModalities.add(modalityId);

    // Compute target weights: give the new modality a fair share,
    // slightly reducing existing weights to make room
    const totalModalities = this.activeModalities.size;
    const targetShare = 1.0 / totalModalities;
    const scaleFactor = (totalModalities - 1) / totalModalities;

    const targetWeights: AttentionWeightMap = new Map();
    for (const id of this.activeModalities) {
      if (id === modalityId) {
        targetWeights.set(id, targetShare);
      } else {
        const existing = this.currentWeights.get(id) ?? targetShare;
        targetWeights.set(id, existing * scaleFactor);
      }
    }

    this.activeRemap = {
      transition,
      monitorHandle,
      previousWeights,
      targetWeights,
      progress: 0,
      currentStep: 0,
      totalSteps: this.transitionSteps,
      startTimestamp: now,
      rolledBack: false,
    };

    const result = this.executeTransition();

    return {
      success: result.success,
      affectedModalities: [...this.activeModalities],
      experienceContinuityMaintained: result.continuityMaintained,
      transitionDuration: this.getTimestamp() - now,
    };
  }

  /**
   * Handle degradation of an existing modality. Reduces the degraded
   * modality's attention weight and boosts remaining modalities.
   */
  onModalityDegraded(
    modalityId: ModalityId,
    degradation: DegradationInfo
  ): RemapResult {
    if (!this.activeModalities.has(modalityId)) {
      return {
        success: false,
        affectedModalities: [],
        experienceContinuityMaintained: true,
        transitionDuration: 0,
      };
    }

    if (!this.continuityGuard.canProceedWithRemap()) {
      return {
        success: false,
        affectedModalities: [modalityId],
        experienceContinuityMaintained: true,
        transitionDuration: 0,
      };
    }

    const now = this.getTimestamp();
    const transition: RemapTransition = {
      type: 'MODALITY_DEGRADED',
      modalityId,
      startTimestamp: now,
    };

    const monitorHandle = this.continuityGuard.monitorTransition(transition);
    const previousWeights: AttentionWeightMap = new Map(this.currentWeights);

    // Compute degradation severity factor
    const severityFactor = this.computeDegradationSeverity(degradation);

    // Reduce the degraded modality's weight by the severity factor
    const currentWeight = this.currentWeights.get(modalityId) ?? 0;
    const reducedWeight = currentWeight * (1.0 - severityFactor);
    const freedWeight = currentWeight - reducedWeight;

    // Redistribute freed weight to healthy modalities
    const healthyModalities = [...this.activeModalities].filter(
      (id) => id !== modalityId
    );
    const targetWeights: AttentionWeightMap = new Map(this.currentWeights);
    targetWeights.set(modalityId, reducedWeight);

    if (healthyModalities.length > 0) {
      const boostPerModality = freedWeight / healthyModalities.length;
      for (const id of healthyModalities) {
        const existing = targetWeights.get(id) ?? 0;
        targetWeights.set(id, Math.min(1.0, existing + boostPerModality));
      }
    }

    this.activeRemap = {
      transition,
      monitorHandle,
      previousWeights,
      targetWeights,
      progress: 0,
      currentStep: 0,
      totalSteps: this.transitionSteps,
      startTimestamp: now,
      rolledBack: false,
    };

    const result = this.executeTransition();

    return {
      success: result.success,
      affectedModalities: [modalityId, ...healthyModalities],
      experienceContinuityMaintained: result.continuityMaintained,
      transitionDuration: this.getTimestamp() - now,
    };
  }

  /**
   * Get the current remap status.
   */
  getRemapStatus(): RemapStatus {
    if (!this.activeRemap || this.activeRemap.rolledBack) {
      return {
        inProgress: false,
        affectedModalities: [],
        progress: 1.0,
      };
    }

    return {
      inProgress: this.activeRemap.progress < 1.0,
      affectedModalities: [...this.activeRemap.targetWeights.keys()],
      progress: this.activeRemap.progress,
    };
  }

  /**
   * Get the progress of the current transition.
   * Returns 1.0 if no transition is in progress.
   */
  getTransitionProgress(): number {
    if (!this.activeRemap) return 1.0;
    return this.activeRemap.progress;
  }

  // ---------------------------------------------------------------------------
  // Extended API (not on the interface)
  // ---------------------------------------------------------------------------

  /**
   * Get the current attention weights managed by the remapper.
   */
  getCurrentWeights(): AttentionWeightMap {
    return new Map(this.currentWeights);
  }

  /**
   * Get the set of currently tracked active modalities.
   */
  getActiveModalityIds(): ModalityId[] {
    return [...this.activeModalities];
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Initialize equal attention weights for all active modalities.
   */
  private initializeWeights(): void {
    const count = this.activeModalities.size;
    if (count === 0) return;

    const weight = 1.0 / count;
    for (const id of this.activeModalities) {
      this.currentWeights.set(id, weight);
    }
    this.qualiaTransformer.setAttentionWeights(this.currentWeights);
  }

  /**
   * Execute the transition by interpolating from current weights to target
   * weights over the configured number of steps.
   *
   * At each step, checks consciousness stability via the ECG. If stability
   * drops below threshold, rolls back to pre-transition weights.
   */
  private executeTransition(): { success: boolean; continuityMaintained: boolean } {
    const remap = this.activeRemap!;

    for (let step = 1; step <= remap.totalSteps; step++) {
      remap.currentStep = step;
      remap.progress = step / remap.totalSteps;

      // Interpolate weights: lerp from previous to target
      const t = remap.progress;
      const interpolated: AttentionWeightMap = new Map();

      // Gather all modality IDs from both previous and target
      const allIds = new Set([
        ...remap.previousWeights.keys(),
        ...remap.targetWeights.keys(),
      ]);

      for (const id of allIds) {
        const prev = remap.previousWeights.get(id) ?? 0;
        const target = remap.targetWeights.get(id) ?? 0;
        const value = prev + t * (target - prev);
        if (value > 0.001) {
          // Only include modalities with non-negligible weight
          interpolated.set(id, value);
        }
      }

      // Apply interpolated weights to the qualia transformer
      this.currentWeights = interpolated;
      this.qualiaTransformer.setAttentionWeights(interpolated);

      // Check consciousness stability
      const stability = this.continuityGuard.getConsciousnessStability();
      if (stability < this.continuityGuard.getMinimumStabilityThreshold()) {
        // Stability has dropped — roll back
        this.rollbackTransition();
        return { success: false, continuityMaintained: false };
      }
    }

    // Transition complete — apply final target weights
    this.currentWeights = new Map(remap.targetWeights);
    this.qualiaTransformer.setAttentionWeights(this.currentWeights);

    // Clean up: complete the ECG monitoring
    // (completeTransition is on the extended API of ExperienceContinuityGuard)
    this.activeRemap = null;

    return { success: true, continuityMaintained: true };
  }

  /**
   * Roll back a transition: restore pre-remap attention weights and
   * notify the continuity guard.
   */
  private rollbackTransition(): void {
    const remap = this.activeRemap!;
    remap.rolledBack = true;

    // Restore previous weights
    this.currentWeights = new Map(remap.previousWeights);
    this.qualiaTransformer.setAttentionWeights(this.currentWeights);

    // If a modality was removed during the transition, re-add it
    if (remap.transition.type === 'MODALITY_LOST') {
      this.activeModalities.add(remap.transition.modalityId);
    }
    // If a modality was added during the transition, remove it
    if (remap.transition.type === 'MODALITY_ADDED') {
      this.activeModalities.delete(remap.transition.modalityId);
    }

    // Notify ECG of rollback
    this.continuityGuard.rollback(remap.monitorHandle);
    this.activeRemap = null;
  }

  /**
   * Compute a severity factor (0.0 = no degradation, 1.0 = total failure)
   * from degradation info.
   */
  private computeDegradationSeverity(degradation: DegradationInfo): number {
    const severityMap: Record<string, number> = {
      HEALTHY: 0,
      DEGRADED: 0.4,
      FAILING: 0.75,
      OFFLINE: 1.0,
    };
    return severityMap[degradation.currentHealth] ?? 0.5;
  }
}
