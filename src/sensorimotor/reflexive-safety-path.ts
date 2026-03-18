/**
 * Reflexive Safety Path — low-latency safety reflex loop that bypasses
 * conscious deliberation for safety-critical responses.
 *
 * Monitors safety-critical sensor inputs and executes pre-defined safety
 * responses within the reflexive latency budget (<10ms). Notifies the
 * conscious deliberation path after-the-fact.
 *
 * @see docs/sensorimotor-consciousness-integration/ARCHITECTURE.md §2.1
 */

import type { IReflexiveSafetyPath } from './interfaces';
import type {
  SensoryFrame,
  SafetyTrigger,
  ReflexResponse,
  SafetyReflex,
  ReflexEvent,
  Duration,
} from './types';

export class ReflexiveSafetyPath implements IReflexiveSafetyPath {
  private reflexes: SafetyReflex[] = [];
  private lastTriggeredEvent: ReflexEvent | null = null;
  private lastResponseLatency: Duration = 0;
  private consciousOverrideEnabled: boolean = false;

  /**
   * Register a safety reflex: a trigger condition paired with a motor response.
   * Reflexes are enabled by default upon registration.
   */
  registerReflex(trigger: SafetyTrigger, response: ReflexResponse): void {
    this.reflexes.push({
      trigger,
      response,
      enabled: true,
    });
  }

  /**
   * Returns all registered reflexes (both enabled and disabled).
   */
  getActiveReflexes(): SafetyReflex[] {
    return [...this.reflexes];
  }

  /**
   * Returns the most recent reflex event, or null if no reflex has triggered.
   */
  getLastTriggered(): ReflexEvent | null {
    return this.lastTriggeredEvent;
  }

  /**
   * Enable or disable conscious override.
   * When enabled, reflexes are suppressed — the consciousness substrate
   * has asserted control and deems the situation safe to override.
   */
  setConsciousOverrideEnabled(enabled: boolean): void {
    this.consciousOverrideEnabled = enabled;
  }

  /**
   * Returns the latency of the most recent evaluate() call in nanoseconds.
   * Must remain below the REFLEXIVE_RESPONSE budget (10ms).
   */
  getResponseLatency(): Duration {
    return this.lastResponseLatency;
  }

  /**
   * Evaluate a sensory frame against all registered reflexes.
   *
   * For each enabled reflex whose trigger modalityId matches the frame:
   * - Extract the sensor value (first float64 from frame.data)
   * - Compare against the trigger threshold using the specified comparison
   * - If triggered, record the event and return it immediately (first match wins)
   *
   * Returns null if no reflex was triggered.
   */
  evaluate(frame: SensoryFrame): ReflexEvent | null {
    const startTime = performance.now();

    // Conscious override suppresses all reflexes
    if (this.consciousOverrideEnabled) {
      this.lastResponseLatency = (performance.now() - startTime) * 1_000_000;
      return null;
    }

    const sensorValue = this.extractSensorValue(frame);

    for (const reflex of this.reflexes) {
      if (!reflex.enabled) continue;
      if (reflex.trigger.modalityId !== frame.modalityId) continue;

      if (this.isTriggered(sensorValue, reflex.trigger)) {
        const responseTimestamp = performance.now();
        const event: ReflexEvent = {
          reflex,
          triggerTimestamp: frame.timestamp,
          responseTimestamp: responseTimestamp * 1_000_000, // ms → ns approximation
          stimulus: frame,
        };

        this.lastTriggeredEvent = event;
        this.lastResponseLatency = (performance.now() - startTime) * 1_000_000;
        return event;
      }
    }

    this.lastResponseLatency = (performance.now() - startTime) * 1_000_000;
    return null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Extract the primary sensor value from the frame data.
   * Convention: the first float64 in the data buffer is the trigger-relevant value.
   */
  private extractSensorValue(frame: SensoryFrame): number {
    if (frame.data.byteLength < 8) {
      return 0;
    }
    return new Float64Array(frame.data)[0];
  }

  /**
   * Check whether a sensor value satisfies a trigger's comparison condition.
   */
  private isTriggered(value: number, trigger: SafetyTrigger): boolean {
    switch (trigger.comparison) {
      case 'GT':
        return value > trigger.threshold;
      case 'LT':
        return value < trigger.threshold;
      case 'ABS_GT':
        return Math.abs(value) > trigger.threshold;
      default:
        return false;
    }
  }
}
