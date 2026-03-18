/**
 * Experience Clock Synchronizer — maintains the relationship between
 * physical time, sensor time, and experience time.
 *
 * Tracks when the consciousness substrate has "experienced" sensory data,
 * computes lag, and fires callbacks when lag exceeds the threshold (150ms
 * by default). When lag is exceeded, synchronize() applies compensation
 * by advancing experience time.
 *
 * @see docs/sensorimotor-consciousness-integration/ARCHITECTURE.md §3.3
 */

import type { IExperienceClockSynchronizer } from './interfaces';
import type {
  Timestamp,
  Duration,
  SyncResult,
  LagExceededHandler,
} from './types';
import { NS_PER_MS, LATENCY_BUDGET } from './types';

export interface ExperienceClockSynchronizerOptions {
  /** Injectable physical-time source (nanoseconds). Defaults to performance.now() * NS_PER_MS. */
  getPhysicalTime?: () => Timestamp;
}

export class ExperienceClockSynchronizer implements IExperienceClockSynchronizer {
  private experienceTime: Timestamp = 0;
  private lagThreshold: Duration = LATENCY_BUDGET.EXPERIENCE_LAG;
  private lagCallbacks: LagExceededHandler[] = [];
  private readonly physicalTimeFn: () => Timestamp;

  constructor(options?: ExperienceClockSynchronizerOptions) {
    this.physicalTimeFn = options?.getPhysicalTime
      ?? (() => Math.round(performance.now() * NS_PER_MS));
  }

  // ---------------------------------------------------------------------------
  // IExperienceClockSynchronizer
  // ---------------------------------------------------------------------------

  getPhysicalTime(): Timestamp {
    return this.physicalTimeFn();
  }

  getExperienceTime(): Timestamp {
    return this.experienceTime;
  }

  getExperienceLag(): Duration {
    const physical = this.getPhysicalTime();
    return Math.max(0, physical - this.experienceTime);
  }

  getLagThreshold(): Duration {
    return this.lagThreshold;
  }

  setLagThreshold(threshold: Duration): void {
    this.lagThreshold = threshold;
  }

  onLagExceeded(callback: LagExceededHandler): void {
    this.lagCallbacks.push(callback);
  }

  markExperienced(timestamp: Timestamp): void {
    // Only advance; never go backward
    if (timestamp > this.experienceTime) {
      this.experienceTime = timestamp;
    }
  }

  synchronize(): SyncResult {
    const physical = this.getPhysicalTime();
    const lag = Math.max(0, physical - this.experienceTime);
    const exceeded = lag > this.lagThreshold;

    if (exceeded) {
      // Notify callbacks
      for (const cb of this.lagCallbacks) {
        cb(lag, this.lagThreshold);
      }

      // Compensation: advance experience time to bring lag within threshold.
      // We advance to (physical - threshold) so lag === threshold after.
      const compensationTarget = physical - this.lagThreshold;
      if (compensationTarget > this.experienceTime) {
        this.experienceTime = compensationTarget;
      }

      return {
        lag,
        adjusted: true,
        compensationApplied: `Advanced experience time by ${lag - this.lagThreshold}ns to reduce lag from ${lag}ns to ${this.lagThreshold}ns`,
      };
    }

    return {
      lag,
      adjusted: false,
      compensationApplied: null,
    };
  }
}
