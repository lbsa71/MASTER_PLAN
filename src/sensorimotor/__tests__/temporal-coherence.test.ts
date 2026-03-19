/**
 * Temporal Coherence Engine — Tests
 *
 * Covers:
 * - PredictiveInterpolator: prediction, model update, confidence, error tracking
 * - ExperienceClockSynchronizer: lag detection, threshold enforcement, compensation
 * - Integration between SensoryBuffer, PI, and ECS
 *
 * @see docs/sensorimotor-consciousness-integration/ARCHITECTURE.md §3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PredictiveInterpolator } from '../predictive-interpolator';
import { ExperienceClockSynchronizer } from '../experience-clock-synchronizer';
import { SensoryBuffer } from '../sensory-buffer';
import type {
  SensoryFrame,
  ModalityId,
  Timestamp,
  Duration,
} from '../types';
import { NS_PER_MS, LATENCY_BUDGET } from '../types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeFrame(
  modalityId: ModalityId,
  timestamp: Timestamp,
  values: number[] = [128],
): SensoryFrame {
  const data = new Uint8Array(values).buffer;
  return {
    modalityId,
    modalityType: 'PROPRIOCEPTIVE',
    timestamp,
    data,
    confidence: 0.9,
    spatialRef: null,
    metadata: {},
  };
}

// ---------------------------------------------------------------------------
// PredictiveInterpolator
// ---------------------------------------------------------------------------

describe('PredictiveInterpolator', () => {
  let pi: PredictiveInterpolator;

  beforeEach(() => {
    pi = new PredictiveInterpolator();
  });

  describe('prediction with model updates', () => {
    it('should predict a frame at a future timestamp', () => {
      const modality: ModalityId = 'prop-1';
      // Feed a sequence of frames with increasing values
      pi.updateModel(modality, makeFrame(modality, 100 * NS_PER_MS, [10]));
      pi.updateModel(modality, makeFrame(modality, 200 * NS_PER_MS, [20]));
      pi.updateModel(modality, makeFrame(modality, 300 * NS_PER_MS, [30]));

      const predicted = pi.predict(modality, 400 * NS_PER_MS);

      expect(predicted.modalityId).toBe(modality);
      expect(predicted.timestamp).toBe(400 * NS_PER_MS);
      expect(predicted.predictionConfidence).toBeGreaterThan(0);
      expect(predicted.predictionConfidence).toBeLessThanOrEqual(1.0);
      expect(predicted.predictionHorizon).toBe(100 * NS_PER_MS);
    });

    it('should produce higher confidence with more consistent data', () => {
      const modality: ModalityId = 'prop-1';
      // Feed a very consistent linear sequence
      for (let i = 1; i <= 10; i++) {
        pi.updateModel(modality, makeFrame(modality, i * 100 * NS_PER_MS, [i * 10]));
      }

      const confidence = pi.getPredictionConfidence(modality);
      expect(confidence).toBeGreaterThan(0.5);
    });

    it('should produce lower confidence with erratic data', () => {
      const modality: ModalityId = 'prop-1';
      // Feed erratic data
      pi.updateModel(modality, makeFrame(modality, 100 * NS_PER_MS, [10]));
      pi.updateModel(modality, makeFrame(modality, 200 * NS_PER_MS, [200]));
      pi.updateModel(modality, makeFrame(modality, 300 * NS_PER_MS, [5]));
      pi.updateModel(modality, makeFrame(modality, 400 * NS_PER_MS, [250]));

      const confidenceErratic = pi.getPredictionConfidence(modality);

      // Now feed consistent data to a different modality
      const modality2: ModalityId = 'prop-2';
      for (let i = 1; i <= 4; i++) {
        pi.updateModel(modality2, makeFrame(modality2, i * 100 * NS_PER_MS, [i * 10]));
      }
      const confidenceConsistent = pi.getPredictionConfidence(modality2);

      expect(confidenceConsistent).toBeGreaterThan(confidenceErratic);
    });

});

  describe('prediction error tracking', () => {
    it('should track prediction errors when actual data arrives', () => {
      const modality: ModalityId = 'prop-1';
      pi.updateModel(modality, makeFrame(modality, 100 * NS_PER_MS, [10]));
      pi.updateModel(modality, makeFrame(modality, 200 * NS_PER_MS, [20]));
      pi.updateModel(modality, makeFrame(modality, 300 * NS_PER_MS, [30]));

      // Make a prediction
      pi.predict(modality, 400 * NS_PER_MS);

      // Provide actual data (which may differ from prediction)
      pi.updateModel(modality, makeFrame(modality, 400 * NS_PER_MS, [40]));

      const error = pi.getPredictionError(modality);
      expect(error.modalityId).toBe(modality);
      expect(error.sampleCount).toBeGreaterThan(0);
      expect(error.meanAbsoluteError).toBeGreaterThanOrEqual(0);
      expect(error.maxError).toBeGreaterThanOrEqual(0);
    });

});

  describe('max reliable horizon', () => {
    it('should return a positive horizon for modalities with data', () => {
      const modality: ModalityId = 'prop-1';
      pi.updateModel(modality, makeFrame(modality, 100 * NS_PER_MS, [10]));
      pi.updateModel(modality, makeFrame(modality, 200 * NS_PER_MS, [20]));

      const horizon = pi.getMaxReliableHorizon(modality);
      expect(horizon).toBeGreaterThan(0);
    });

    it('should return zero horizon for unknown modality', () => {
      expect(pi.getMaxReliableHorizon('nonexistent')).toBe(0);
    });
  });

  describe('prediction for unknown modality', () => {
    it('should return a low-confidence fallback prediction', () => {
      const predicted = pi.predict('unknown-mod', 500 * NS_PER_MS);
      expect(predicted.predictionConfidence).toBe(0);
      expect(predicted.modalityId).toBe('unknown-mod');
    });
  });
});

// ---------------------------------------------------------------------------
// ExperienceClockSynchronizer
// ---------------------------------------------------------------------------

describe('ExperienceClockSynchronizer', () => {
  let ecs: ExperienceClockSynchronizer;

  beforeEach(() => {
    ecs = new ExperienceClockSynchronizer();
  });

  describe('lag tracking', () => {
    it('should compute experience lag as physical - experience time', () => {
      // Mark experience at a known time
      const experienceTime = 1000 * NS_PER_MS;
      ecs.markExperienced(experienceTime);

      const lag = ecs.getExperienceLag();
      // Lag should be non-negative (physical time >= experience time)
      expect(lag).toBeGreaterThanOrEqual(0);
    });

    it('should have default lag threshold of 150ms', () => {
      expect(ecs.getLagThreshold()).toBe(LATENCY_BUDGET.EXPERIENCE_LAG);
    });

});

  describe('lag exceeded callback', () => {
    it('should invoke callback when lag exceeds threshold during synchronize', () => {
      const callback = vi.fn();
      ecs.onLagExceeded(callback);

      // Set a very tight threshold that will be exceeded
      ecs.setLagThreshold(0);

      // Don't mark any experience time, so lag = physical time = large
      ecs.synchronize();

      expect(callback).toHaveBeenCalled();
      const [lagArg, thresholdArg] = callback.mock.calls[0];
      expect(lagArg).toBeGreaterThan(0);
      expect(thresholdArg).toBe(0);
    });

    it('should not invoke callback when lag is within threshold', () => {
      const callback = vi.fn();
      ecs.onLagExceeded(callback);

      // Set very generous threshold
      ecs.setLagThreshold(Number.MAX_SAFE_INTEGER);

      // Mark experience at current physical time
      ecs.markExperienced(ecs.getPhysicalTime());
      ecs.synchronize();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple lag-exceeded callbacks', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      ecs.onLagExceeded(cb1);
      ecs.onLagExceeded(cb2);

      ecs.setLagThreshold(0);
      ecs.synchronize();

      expect(cb1).toHaveBeenCalled();
      expect(cb2).toHaveBeenCalled();
    });
  });

  describe('synchronize', () => {
    it('should return a SyncResult with current lag', () => {
      ecs.markExperienced(ecs.getPhysicalTime());
      const result = ecs.synchronize();
      expect(result.lag).toBeGreaterThanOrEqual(0);
      expect(typeof result.adjusted).toBe('boolean');
    });

    it('should indicate compensation when lag is exceeded', () => {
      ecs.setLagThreshold(0);
      const result = ecs.synchronize();
      expect(result.adjusted).toBe(true);
      expect(result.compensationApplied).not.toBeNull();
    });

    it('should indicate no compensation when lag is within threshold', () => {
      ecs.setLagThreshold(Number.MAX_SAFE_INTEGER);
      ecs.markExperienced(ecs.getPhysicalTime());
      const result = ecs.synchronize();
      expect(result.adjusted).toBe(false);
      expect(result.compensationApplied).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Integration: SensoryBuffer + PredictiveInterpolator + ECS
// ---------------------------------------------------------------------------

describe('Temporal Coherence Integration', () => {
  it('should use buffer data to feed predictor and track lag via ECS', () => {
    const buffer = new SensoryBuffer();
    const pi = new PredictiveInterpolator();
    const ecs = new ExperienceClockSynchronizer();

    const modality: ModalityId = 'joint-1';

    // Simulate sensor data arriving over time
    for (let i = 1; i <= 5; i++) {
      const frame = makeFrame(modality, i * 50 * NS_PER_MS, [i * 20]);
      buffer.push(frame);
      pi.updateModel(modality, frame);
    }

    // Predict forward
    const lastActualTime = 5 * 50 * NS_PER_MS;
    const predictedFrame = pi.predict(modality, lastActualTime + 50 * NS_PER_MS);
    expect(predictedFrame.predictionConfidence).toBeGreaterThan(0);

    // Mark that consciousness has processed up to the 3rd frame
    const experiencedUpTo = 3 * 50 * NS_PER_MS;
    ecs.markExperienced(experiencedUpTo);

    // Lag should reflect the gap
    const lag = ecs.getExperienceLag();
    expect(lag).toBeGreaterThan(0);
  });

  it('should maintain experience lag below 150ms threshold in normal operation', () => {
    const ecs = new ExperienceClockSynchronizer();
    const lagExceededSpy = vi.fn();
    ecs.onLagExceeded(lagExceededSpy);

    // Simulate normal operation: experience tracks physical time closely
    const now = ecs.getPhysicalTime();
    ecs.markExperienced(now - 50 * NS_PER_MS); // 50ms behind = well within 150ms

    const result = ecs.synchronize();
    expect(result.lag).toBeLessThan(LATENCY_BUDGET.EXPERIENCE_LAG);
    expect(lagExceededSpy).not.toHaveBeenCalled();
  });
});
