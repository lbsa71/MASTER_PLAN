/**
 * Dual-Path Motor Tests
 *
 * Verifies the Reflexive Safety Path and Conscious Deliberation Path:
 * - Reflexive path triggers within latency budget (<10ms)
 * - Reflexive path evaluates sensor frames against registered triggers
 * - Conscious override can be enabled/disabled
 * - Safety reflexes are registered and retrieved correctly
 *
 * Phase 1: Reflexive Safety Path only. Conscious Deliberation Path tests
 * will be added when that module is implemented.
 *
 * @see docs/sensorimotor-consciousness-integration/ARCHITECTURE.md §2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReflexiveSafetyPath } from '../reflexive-safety-path';
import type {
  SensoryFrame,
  SafetyTrigger,
  ReflexResponse,
  MotorCommand,
} from '../types';
import { LATENCY_BUDGET } from '../types';

function makeSensoryFrame(overrides: Partial<SensoryFrame> = {}): SensoryFrame {
  return {
    modalityId: 'imu-0',
    modalityType: 'IMU',
    timestamp: 1_000_000_000,
    data: new ArrayBuffer(16),
    confidence: 0.95,
    spatialRef: null,
    metadata: {},
    ...overrides,
  };
}

/**
 * Encode a single float value into an ArrayBuffer for sensor data.
 * The ReflexiveSafetyPath reads the first float64 from frame.data as the trigger value.
 */
function encodeValue(value: number): ArrayBuffer {
  const buf = new ArrayBuffer(8);
  new Float64Array(buf)[0] = value;
  return buf;
}

function makeStopCommand(actuatorId: string = 'joint-0'): MotorCommand {
  return {
    actuatorId,
    commandType: 'STOP',
    value: [0],
    timestamp: 0, // filled by the reflex path
  };
}

describe('ReflexiveSafetyPath', () => {
  let rsp: ReflexiveSafetyPath;

  beforeEach(() => {
    rsp = new ReflexiveSafetyPath();
  });

  describe('evaluate()', () => {
    it('should trigger a reflex when sensor value exceeds GT threshold', () => {
      rsp.registerReflex(
        { type: 'FREEFALL', modalityId: 'imu-0', threshold: 9.0, comparison: 'GT' },
        { name: 'fall-arrest', commands: [makeStopCommand()], maxLatencyMs: 5 }
      );

      const frame = makeSensoryFrame({
        modalityId: 'imu-0',
        data: encodeValue(9.5), // exceeds threshold of 9.0
      });

      const event = rsp.evaluate(frame);

      expect(event).not.toBeNull();
      expect(event!.reflex.trigger.type).toBe('FREEFALL');
      expect(event!.stimulus.modalityId).toBe('imu-0');
    });

    it('should NOT trigger when sensor value is below GT threshold', () => {
      rsp.registerReflex(
        { type: 'FREEFALL', modalityId: 'imu-0', threshold: 9.0, comparison: 'GT' },
        { name: 'fall-arrest', commands: [makeStopCommand()], maxLatencyMs: 5 }
      );

      const frame = makeSensoryFrame({
        modalityId: 'imu-0',
        data: encodeValue(8.0), // below threshold
      });

      const event = rsp.evaluate(frame);
      expect(event).toBeNull();
    });

    it('should trigger on LT comparison when value is below threshold', () => {
      rsp.registerReflex(
        { type: 'COLLISION', modalityId: 'proximity-0', threshold: 0.1, comparison: 'LT' },
        { name: 'collision-avoid', commands: [makeStopCommand()], maxLatencyMs: 8 }
      );

      const frame = makeSensoryFrame({
        modalityId: 'proximity-0',
        modalityType: 'PROXIMITY',
        data: encodeValue(0.05), // below threshold → too close
      });

      const event = rsp.evaluate(frame);
      expect(event).not.toBeNull();
      expect(event!.reflex.trigger.type).toBe('COLLISION');
    });

    it('should trigger on ABS_GT comparison for absolute value', () => {
      rsp.registerReflex(
        { type: 'FORCE_LIMIT', modalityId: 'force-0', threshold: 50, comparison: 'ABS_GT' },
        { name: 'force-relax', commands: [makeStopCommand()], maxLatencyMs: 3 }
      );

      const frame = makeSensoryFrame({
        modalityId: 'force-0',
        modalityType: 'FORCE_TORQUE',
        data: encodeValue(-60), // |−60| > 50
      });

      const event = rsp.evaluate(frame);
      expect(event).not.toBeNull();
    });

    it('should only trigger reflexes matching the frame modalityId', () => {
      rsp.registerReflex(
        { type: 'FREEFALL', modalityId: 'imu-0', threshold: 9.0, comparison: 'GT' },
        { name: 'fall-arrest', commands: [makeStopCommand()], maxLatencyMs: 5 }
      );

      // Send a frame from a different modality
      const frame = makeSensoryFrame({
        modalityId: 'force-0',
        modalityType: 'FORCE_TORQUE',
        data: encodeValue(100),
      });

      const event = rsp.evaluate(frame);
      expect(event).toBeNull();
    });

    it('should record the last triggered event', () => {
      rsp.registerReflex(
        { type: 'FREEFALL', modalityId: 'imu-0', threshold: 9.0, comparison: 'GT' },
        { name: 'fall-arrest', commands: [makeStopCommand()], maxLatencyMs: 5 }
      );

      expect(rsp.getLastTriggered()).toBeNull();

      rsp.evaluate(makeSensoryFrame({
        modalityId: 'imu-0',
        data: encodeValue(10.0),
      }));

      const last = rsp.getLastTriggered();
      expect(last).not.toBeNull();
      expect(last!.reflex.response.name).toBe('fall-arrest');
    });
  });

  describe('conscious override', () => {
    it('should default to conscious override disabled', () => {
      rsp.registerReflex(
        { type: 'FREEFALL', modalityId: 'imu-0', threshold: 9.0, comparison: 'GT' },
        { name: 'fall-arrest', commands: [makeStopCommand()], maxLatencyMs: 5 }
      );

      // With override disabled (default), reflexes should fire
      const event = rsp.evaluate(makeSensoryFrame({
        modalityId: 'imu-0',
        data: encodeValue(10.0),
      }));
      expect(event).not.toBeNull();
    });

    it('should suppress reflexes when conscious override is enabled', () => {
      rsp.registerReflex(
        { type: 'FREEFALL', modalityId: 'imu-0', threshold: 9.0, comparison: 'GT' },
        { name: 'fall-arrest', commands: [makeStopCommand()], maxLatencyMs: 5 }
      );

      rsp.setConsciousOverrideEnabled(true);

      const event = rsp.evaluate(makeSensoryFrame({
        modalityId: 'imu-0',
        data: encodeValue(10.0),
      }));
      expect(event).toBeNull();
    });
  });

  describe('latency', () => {
    it('should report response latency within reflexive budget (<10ms)', () => {
      rsp.registerReflex(
        { type: 'FREEFALL', modalityId: 'imu-0', threshold: 9.0, comparison: 'GT' },
        { name: 'fall-arrest', commands: [makeStopCommand()], maxLatencyMs: 5 }
      );

      rsp.evaluate(makeSensoryFrame({
        modalityId: 'imu-0',
        data: encodeValue(10.0),
      }));

      const latency = rsp.getResponseLatency();
      expect(latency).toBeLessThan(LATENCY_BUDGET.REFLEXIVE_RESPONSE);
    });
  });
});
