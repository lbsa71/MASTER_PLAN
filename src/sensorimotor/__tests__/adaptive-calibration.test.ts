/**
 * Adaptive Calibration System — Tests
 *
 * Covers:
 * - ModalityRegistry: register/unregister, hot-plug, health polling, change events
 * - DynamicRemapper: modality lost/added/degraded, gradual transition, rollback
 * - ExperienceContinuityGuard: stability gating, transition monitoring, rollback
 * - Integration: sensor add/remove/degrade without experience interruption
 *
 * @see docs/sensorimotor-consciousness-integration/ARCHITECTURE.md §4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModalityRegistry } from '../modality-registry';
import { DynamicRemapper } from '../dynamic-remapper';
import {
  ExperienceContinuityGuard,
  type ConsciousnessMetricsProvider,
} from '../experience-continuity-guard';
import { BaseModalityAdapter } from '../modality-adapter';
import type { IModalityAdapter, IQualiaTransformer } from '../interfaces';
import type {
  ModalityId,
  ModalityType,
  ModalityChangeEvent,
  SensorHealth,
  AttentionWeightMap,
  DegradationInfo,
  Timestamp,
} from '../types';
import { NS_PER_MS, LATENCY_BUDGET } from '../types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Create a minimal mock adapter */
function makeMockAdapter(
  id: ModalityId,
  type: ModalityType = 'VISION',
  health: SensorHealth = 'HEALTHY',
): IModalityAdapter {
  return new BaseModalityAdapter({
    modalityId: id,
    modalityType: type,
    readRaw: () => new Uint8Array([128]).buffer,
    getTimestamp: () => Date.now() * NS_PER_MS,
    health,
  } as any);
}

/** Create a mock adapter with controllable health */
function makeControllableAdapter(
  id: ModalityId,
  type: ModalityType = 'VISION',
): { adapter: IModalityAdapter; setHealth: (h: SensorHealth) => void } {
  let currentHealth: SensorHealth = 'HEALTHY';
  const adapter: IModalityAdapter = {
    modalityId: id,
    modalityType: type,
    initialize: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockReturnValue({
      modalityId: id,
      modalityType: type,
      timestamp: 0,
      data: new Uint8Array([0]).buffer,
      confidence: 0.9,
      spatialRef: null,
      metadata: {},
    }),
    getHealth: () => currentHealth,
    getCalibration: vi.fn().mockReturnValue({
      calibrated: true,
      lastCalibration: 0,
      quality: 1.0,
      params: { offset: [0], gain: [1] },
    }),
    recalibrate: vi.fn().mockResolvedValue({
      success: true,
      newState: {
        calibrated: true,
        lastCalibration: 0,
        quality: 1.0,
        params: { offset: [0], gain: [1] },
      },
      duration: 100 * NS_PER_MS,
    }),
    shutdown: vi.fn().mockResolvedValue(undefined),
  };
  return {
    adapter,
    setHealth: (h: SensorHealth) => { currentHealth = h; },
  };
}

/** Create a mock QualiaTransformer that tracks setAttentionWeights calls */
function makeMockQualiaTransformer(): IQualiaTransformer & {
  lastWeights: AttentionWeightMap | null;
  weightHistory: AttentionWeightMap[];
} {
  const mock: any = {
    lastWeights: null as AttentionWeightMap | null,
    weightHistory: [] as AttentionWeightMap[],
    transform: vi.fn(),
    transformBatch: vi.fn(),
    getTransformationLatency: vi.fn().mockReturnValue(5 * NS_PER_MS),
    setAttentionWeights: vi.fn().mockImplementation((weights: AttentionWeightMap) => {
      mock.lastWeights = new Map(weights);
      mock.weightHistory.push(new Map(weights));
    }),
    getSalienceMap: vi.fn().mockReturnValue(new Map()),
  };
  return mock;
}

/** Create a mock metrics provider with controllable values */
function makeMockMetrics(
  phi = 0.9,
  coherence = 0.9,
  continuity = 0.9,
): ConsciousnessMetricsProvider & {
  setPhi: (v: number) => void;
  setCoherence: (v: number) => void;
  setContinuity: (v: number) => void;
} {
  let _phi = phi;
  let _coh = coherence;
  let _cont = continuity;
  return {
    getPhi: () => _phi,
    getCoherence: () => _coh,
    getContinuity: () => _cont,
    setPhi: (v: number) => { _phi = v; },
    setCoherence: (v: number) => { _coh = v; },
    setContinuity: (v: number) => { _cont = v; },
  };
}

// ---------------------------------------------------------------------------
// ModalityRegistry
// ---------------------------------------------------------------------------

describe('ModalityRegistry', () => {
  let registry: ModalityRegistry;
  let clock: number;

  beforeEach(() => {
    clock = 1000 * NS_PER_MS;
    registry = new ModalityRegistry({
      getTimestamp: () => clock,
      healthPollIntervalMs: 0, // no auto-polling in tests
    });
  });

  describe('register and unregister', () => {
    it('should register an adapter and return its modality ID', () => {
      const { adapter } = makeControllableAdapter('cam-1', 'VISION');
      const id = registry.register(adapter);
      expect(id).toBe('cam-1');
      expect(registry.getModality('cam-1')).not.toBeNull();
    });

    it('should list registered adapters as active', () => {
      const { adapter: a1 } = makeControllableAdapter('cam-1', 'VISION');
      const { adapter: a2 } = makeControllableAdapter('imu-1', 'IMU');
      registry.register(a1);
      registry.register(a2);

      const active = registry.getActive();
      expect(active).toHaveLength(2);
      expect(active.map((d) => d.id).sort()).toEqual(['cam-1', 'imu-1']);
    });

    it('should unregister and remove a modality', () => {
      const { adapter } = makeControllableAdapter('cam-1');
      registry.register(adapter);
      const result = registry.unregister('cam-1');

      expect(result.success).toBe(true);
      expect(registry.getModality('cam-1')).toBeNull();
      expect(registry.getActive()).toHaveLength(0);
    });

    it('should return failure when unregistering unknown modality', () => {
      const result = registry.unregister('nonexistent');
      expect(result.success).toBe(false);
    });

    it('should support hot-swap by re-registering same ID', () => {
      const events: ModalityChangeEvent[] = [];
      registry.onModalityChange((e) => events.push(e));

      const { adapter: first } = makeControllableAdapter('cam-1', 'VISION');
      const { adapter: second } = makeControllableAdapter('cam-1', 'VISION');

      registry.register(first);
      registry.register(second); // hot-swap

      // Should have ADDED, REMOVED (from hot-swap), ADDED
      expect(events.filter((e) => e.type === 'ADDED')).toHaveLength(2);
      expect(events.filter((e) => e.type === 'REMOVED')).toHaveLength(1);
      expect(registry.getCount()).toBe(1);
    });
  });

  describe('change events', () => {
    it('should emit ADDED event on register', () => {
      const events: ModalityChangeEvent[] = [];
      registry.onModalityChange((e) => events.push(e));

      const { adapter } = makeControllableAdapter('cam-1');
      registry.register(adapter);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('ADDED');
      expect(events[0].modalityId).toBe('cam-1');
    });

    it('should emit REMOVED event on unregister', () => {
      const { adapter } = makeControllableAdapter('cam-1');
      registry.register(adapter);

      const events: ModalityChangeEvent[] = [];
      registry.onModalityChange((e) => events.push(e));
      registry.unregister('cam-1');

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('REMOVED');
    });
  });

  describe('health polling', () => {
    it('should detect health transitions on pollHealth()', () => {
      const { adapter, setHealth } = makeControllableAdapter('cam-1');
      registry.register(adapter);

      const events: ModalityChangeEvent[] = [];
      registry.onModalityChange((e) => events.push(e));

      // Degrade the sensor
      setHealth('DEGRADED');
      registry.pollHealth();

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('DEGRADED');
      expect(events[0].modalityId).toBe('cam-1');
    });

    it('should detect recovery from degraded to healthy', () => {
      const { adapter, setHealth } = makeControllableAdapter('cam-1');
      setHealth('DEGRADED');
      registry.register(adapter);

      const events: ModalityChangeEvent[] = [];
      registry.onModalityChange((e) => events.push(e));

      setHealth('HEALTHY');
      registry.pollHealth();

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('RECOVERED');
    });

    it('should list degraded modalities separately', () => {
      const { adapter, setHealth } = makeControllableAdapter('cam-1');
      registry.register(adapter);

      setHealth('DEGRADED');
      registry.pollHealth();

      expect(registry.getDegraded()).toHaveLength(1);
      expect(registry.getActive()).toHaveLength(0);
    });

    it('should not emit events when health is unchanged', () => {
      const { adapter } = makeControllableAdapter('cam-1');
      registry.register(adapter);

      const events: ModalityChangeEvent[] = [];
      registry.onModalityChange((e) => events.push(e));

      registry.pollHealth();
      registry.pollHealth();

      expect(events).toHaveLength(0);
    });
  });

  describe('dispose', () => {
    it('should stop emitting events after dispose', () => {
      const events: ModalityChangeEvent[] = [];
      registry.onModalityChange((e) => events.push(e));
      registry.dispose();

      const { adapter } = makeControllableAdapter('cam-1');
      registry.register(adapter);
      expect(events).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// ExperienceContinuityGuard
// ---------------------------------------------------------------------------

describe('ExperienceContinuityGuard', () => {
  let guard: ExperienceContinuityGuard;
  let metrics: ReturnType<typeof makeMockMetrics>;

  beforeEach(() => {
    metrics = makeMockMetrics(0.9, 0.9, 0.9);
    guard = new ExperienceContinuityGuard({
      metricsProvider: metrics,
      minimumStabilityThreshold: 0.6,
    });
  });

  it('should allow remap when stability is above threshold', () => {
    expect(guard.canProceedWithRemap()).toBe(true);
  });

  it('should block remap when stability is below threshold', () => {
    metrics.setPhi(0.2);
    metrics.setCoherence(0.2);
    metrics.setContinuity(0.2);
    expect(guard.canProceedWithRemap()).toBe(false);
  });

  it('should compute stability as weighted combination of metrics', () => {
    metrics.setPhi(1.0);
    metrics.setCoherence(1.0);
    metrics.setContinuity(1.0);
    expect(guard.getConsciousnessStability()).toBeCloseTo(1.0);

    metrics.setPhi(0.0);
    metrics.setCoherence(0.0);
    metrics.setContinuity(0.0);
    expect(guard.getConsciousnessStability()).toBeCloseTo(0.0);
  });

  it('should monitor transitions and track lowest stability', () => {
    const handle = guard.monitorTransition({
      type: 'MODALITY_LOST',
      modalityId: 'cam-1',
      startTimestamp: 0,
    });

    // Stability is fine
    guard.getConsciousnessStability();

    // Dip stability well below threshold (0.6)
    metrics.setPhi(0.1);
    metrics.setCoherence(0.1);
    guard.getConsciousnessStability();

    expect(guard.isTransitionDegraded(handle)).toBe(true);
  });

  it('should support rollback of monitored transitions', () => {
    const handle = guard.monitorTransition({
      type: 'MODALITY_LOST',
      modalityId: 'cam-1',
      startTimestamp: 0,
    });

    const result = guard.rollback(handle);
    expect(result.success).toBe(true);
  });

  it('should reject double rollback', () => {
    const handle = guard.monitorTransition({
      type: 'MODALITY_LOST',
      modalityId: 'cam-1',
      startTimestamp: 0,
    });

    guard.rollback(handle);
    const result = guard.rollback(handle);
    expect(result.success).toBe(false);
  });

  it('should allow get/set of minimum stability threshold', () => {
    expect(guard.getMinimumStabilityThreshold()).toBe(0.6);
    guard.setMinimumStabilityThreshold(0.8);
    expect(guard.getMinimumStabilityThreshold()).toBe(0.8);
  });

  it('should throw on invalid threshold values', () => {
    expect(() => guard.setMinimumStabilityThreshold(-0.1)).toThrow(RangeError);
    expect(() => guard.setMinimumStabilityThreshold(1.1)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// DynamicRemapper
// ---------------------------------------------------------------------------

describe('DynamicRemapper', () => {
  let remapper: DynamicRemapper;
  let qt: ReturnType<typeof makeMockQualiaTransformer>;
  let guard: ExperienceContinuityGuard;
  let metrics: ReturnType<typeof makeMockMetrics>;

  beforeEach(() => {
    metrics = makeMockMetrics(0.9, 0.9, 0.9);
    guard = new ExperienceContinuityGuard({
      metricsProvider: metrics,
      minimumStabilityThreshold: 0.6,
    });
    qt = makeMockQualiaTransformer();
    remapper = new DynamicRemapper({
      continuityGuard: guard,
      qualiaTransformer: qt,
      activeModalities: ['cam-1', 'imu-1', 'touch-1'],
      transitionSteps: 5,
    });
  });

  describe('initialization', () => {
    it('should initialize with equal attention weights', () => {
      const weights = remapper.getCurrentWeights();
      expect(weights.size).toBe(3);
      for (const w of weights.values()) {
        expect(w).toBeCloseTo(1 / 3);
      }
    });

    it('should report no transition in progress', () => {
      expect(remapper.getRemapStatus().inProgress).toBe(false);
      expect(remapper.getTransitionProgress()).toBe(1.0);
    });
  });

  describe('onModalityLost', () => {
    it('should redistribute attention weight from lost modality', () => {
      const result = remapper.onModalityLost('cam-1');

      expect(result.success).toBe(true);
      expect(result.experienceContinuityMaintained).toBe(true);
      expect(result.affectedModalities).toContain('cam-1');

      const weights = remapper.getCurrentWeights();
      expect(weights.has('cam-1')).toBe(false);
      expect(weights.size).toBe(2);
      // Remaining modalities should share the full weight
      for (const w of weights.values()) {
        expect(w).toBeCloseTo(0.5);
      }
    });

    it('should fail for unknown modality', () => {
      const result = remapper.onModalityLost('nonexistent');
      expect(result.success).toBe(false);
    });

    it('should block remap when continuity guard says no', () => {
      metrics.setPhi(0.1);
      metrics.setCoherence(0.1);
      metrics.setContinuity(0.1);

      const result = remapper.onModalityLost('cam-1');
      expect(result.success).toBe(false);
    });

    it('should gradually transition weights over multiple steps', () => {
      remapper.onModalityLost('cam-1');

      // The QT should have received multiple setAttentionWeights calls
      // (one per transition step + initial setup)
      // Initial: 1 call (constructor), then 5 steps + 1 final = 6 more
      expect(qt.weightHistory.length).toBeGreaterThan(2);
    });
  });

  describe('onModalityAdded', () => {
    it('should integrate new modality with gradual weight adjustment', () => {
      const { adapter } = makeControllableAdapter('lidar-1', 'PROXIMITY');
      const result = remapper.onModalityAdded(adapter);

      expect(result.success).toBe(true);
      expect(result.experienceContinuityMaintained).toBe(true);

      const weights = remapper.getCurrentWeights();
      expect(weights.has('lidar-1')).toBe(true);
      expect(weights.size).toBe(4);
      // New modality should get ~1/4 of attention
      expect(weights.get('lidar-1')!).toBeCloseTo(0.25, 1);
    });

    it('should fail for already-registered modality', () => {
      const { adapter } = makeControllableAdapter('cam-1', 'VISION');
      const result = remapper.onModalityAdded(adapter);
      expect(result.success).toBe(false);
    });
  });

  describe('onModalityDegraded', () => {
    it('should reduce degraded modality weight and boost others', () => {
      const degradation: DegradationInfo = {
        modalityId: 'cam-1',
        previousHealth: 'HEALTHY',
        currentHealth: 'DEGRADED',
        reason: 'Lens damage',
        timestamp: 0,
      };

      const result = remapper.onModalityDegraded('cam-1', degradation);

      expect(result.success).toBe(true);
      expect(result.experienceContinuityMaintained).toBe(true);

      const weights = remapper.getCurrentWeights();
      // Degraded modality should have reduced weight
      expect(weights.get('cam-1')!).toBeLessThan(1 / 3);
      // Other modalities should have increased weight
      expect(weights.get('imu-1')!).toBeGreaterThan(1 / 3);
      expect(weights.get('touch-1')!).toBeGreaterThan(1 / 3);
    });

    it('should reduce weight more severely for FAILING health', () => {
      const degraded: DegradationInfo = {
        modalityId: 'cam-1',
        previousHealth: 'HEALTHY',
        currentHealth: 'DEGRADED',
        reason: 'Minor damage',
        timestamp: 0,
      };
      const failing: DegradationInfo = {
        modalityId: 'cam-1',
        previousHealth: 'HEALTHY',
        currentHealth: 'FAILING',
        reason: 'Major damage',
        timestamp: 0,
      };

      // Test degraded
      remapper.onModalityDegraded('cam-1', degraded);
      const degradedWeight = remapper.getCurrentWeights().get('cam-1')!;

      // Reset remapper to test failing
      qt = makeMockQualiaTransformer();
      remapper = new DynamicRemapper({
        continuityGuard: guard,
        qualiaTransformer: qt,
        activeModalities: ['cam-1', 'imu-1', 'touch-1'],
        transitionSteps: 5,
      });

      remapper.onModalityDegraded('cam-1', failing);
      const failingWeight = remapper.getCurrentWeights().get('cam-1')!;

      expect(failingWeight).toBeLessThan(degradedWeight);
    });
  });

  describe('rollback on stability drop', () => {
    it('should rollback transition if stability drops below threshold', () => {
      let stepCount = 0;
      // Inject instability after 2 transition steps
      const origGetStability = guard.getConsciousnessStability.bind(guard);
      vi.spyOn(guard, 'getConsciousnessStability').mockImplementation(() => {
        stepCount++;
        if (stepCount > 2) {
          // Return a value below threshold
          return 0.3;
        }
        return origGetStability();
      });

      const result = remapper.onModalityLost('cam-1');

      expect(result.success).toBe(false);
      expect(result.experienceContinuityMaintained).toBe(false);

      // Modality should be re-added after rollback
      const modalities = remapper.getActiveModalityIds();
      expect(modalities).toContain('cam-1');

      // Weights should be restored to pre-transition state
      const weights = remapper.getCurrentWeights();
      for (const w of weights.values()) {
        expect(w).toBeCloseTo(1 / 3);
      }
    });

    it('should rollback modality addition on stability drop', () => {
      let stepCount = 0;
      vi.spyOn(guard, 'getConsciousnessStability').mockImplementation(() => {
        stepCount++;
        return stepCount > 2 ? 0.3 : 0.9;
      });

      const { adapter } = makeControllableAdapter('lidar-1', 'PROXIMITY');
      const result = remapper.onModalityAdded(adapter);

      expect(result.success).toBe(false);
      // New modality should be removed on rollback
      expect(remapper.getActiveModalityIds()).not.toContain('lidar-1');
    });
  });
});

// ---------------------------------------------------------------------------
// Adaptive Calibration Integration
// ---------------------------------------------------------------------------

describe('Adaptive Calibration Integration', () => {
  let registry: ModalityRegistry;
  let remapper: DynamicRemapper;
  let guard: ExperienceContinuityGuard;
  let qt: ReturnType<typeof makeMockQualiaTransformer>;
  let metrics: ReturnType<typeof makeMockMetrics>;

  beforeEach(() => {
    metrics = makeMockMetrics(0.9, 0.9, 0.9);
    guard = new ExperienceContinuityGuard({
      metricsProvider: metrics,
      minimumStabilityThreshold: 0.6,
    });
    qt = makeMockQualiaTransformer();

    registry = new ModalityRegistry({ healthPollIntervalMs: 0 });

    // Register initial modalities
    const { adapter: cam } = makeControllableAdapter('cam-1', 'VISION');
    const { adapter: imu } = makeControllableAdapter('imu-1', 'IMU');
    const { adapter: touch } = makeControllableAdapter('touch-1', 'TACTILE');
    registry.register(cam);
    registry.register(imu);
    registry.register(touch);

    remapper = new DynamicRemapper({
      continuityGuard: guard,
      qualiaTransformer: qt,
      activeModalities: ['cam-1', 'imu-1', 'touch-1'],
      transitionSteps: 5,
    });
  });

  it('should handle sensor loss: registry remove triggers remap', () => {
    // Wire registry changes to remapper
    registry.onModalityChange((event) => {
      if (event.type === 'REMOVED') {
        remapper.onModalityLost(event.modalityId);
      }
    });

    registry.unregister('cam-1');

    // Registry should have 2 modalities
    expect(registry.getActive()).toHaveLength(2);
    // Remapper should have redistributed weights to 2 modalities
    const weights = remapper.getCurrentWeights();
    expect(weights.size).toBe(2);
    expect(weights.has('cam-1')).toBe(false);
  });

  it('should handle sensor addition: registry add triggers remap', () => {
    registry.onModalityChange((event) => {
      if (event.type === 'ADDED' && event.modalityId === 'lidar-1') {
        remapper.onModalityAdded(registry.getAdapter(event.modalityId)!);
      }
    });

    const { adapter: lidar } = makeControllableAdapter('lidar-1', 'PROXIMITY');
    registry.register(lidar);

    expect(registry.getActive()).toHaveLength(4);
    expect(remapper.getCurrentWeights().has('lidar-1')).toBe(true);
  });

  it('should handle sensor degradation: health poll triggers remap', () => {
    const { adapter: cam, setHealth } = makeControllableAdapter('cam-1', 'VISION');
    // Re-register with controllable adapter
    registry.register(cam);

    registry.onModalityChange((event) => {
      if (event.type === 'DEGRADED') {
        remapper.onModalityDegraded(event.modalityId, {
          modalityId: event.modalityId,
          previousHealth: 'HEALTHY',
          currentHealth: event.descriptor.health,
          reason: 'Test degradation',
          timestamp: event.timestamp,
        });
      }
    });

    setHealth('DEGRADED');
    registry.pollHealth();

    // Degraded modality should have reduced weight
    expect(remapper.getCurrentWeights().get('cam-1')!).toBeLessThan(1 / 3);
  });

  it('should maintain experience continuity through sequential changes', () => {
    // Perform multiple sequential configuration changes and verify
    // that all succeed with continuity maintained

    // 1. Lose a sensor
    const loss = remapper.onModalityLost('cam-1');
    expect(loss.success).toBe(true);
    expect(loss.experienceContinuityMaintained).toBe(true);

    // 2. Add a new sensor
    const { adapter: lidar } = makeControllableAdapter('lidar-1', 'PROXIMITY');
    const add = remapper.onModalityAdded(lidar);
    expect(add.success).toBe(true);
    expect(add.experienceContinuityMaintained).toBe(true);

    // 3. Degrade another sensor
    const degrade = remapper.onModalityDegraded('imu-1', {
      modalityId: 'imu-1',
      previousHealth: 'HEALTHY',
      currentHealth: 'DEGRADED',
      reason: 'Test',
      timestamp: 0,
    });
    expect(degrade.success).toBe(true);
    expect(degrade.experienceContinuityMaintained).toBe(true);

    // Final state should have 3 modalities with valid weights
    const weights = remapper.getCurrentWeights();
    expect(weights.size).toBe(3);
    expect(weights.has('cam-1')).toBe(false);
    expect(weights.has('lidar-1')).toBe(true);

    // All weights should be positive
    for (const w of weights.values()) {
      expect(w).toBeGreaterThan(0);
    }
  });

  it('should block all changes when consciousness is unstable', () => {
    // Drop stability below threshold
    metrics.setPhi(0.1);
    metrics.setCoherence(0.1);
    metrics.setContinuity(0.1);

    const loss = remapper.onModalityLost('cam-1');
    expect(loss.success).toBe(false);

    const { adapter: lidar } = makeControllableAdapter('lidar-1', 'PROXIMITY');
    const add = remapper.onModalityAdded(lidar);
    expect(add.success).toBe(false);

    const degrade = remapper.onModalityDegraded('imu-1', {
      modalityId: 'imu-1',
      previousHealth: 'HEALTHY',
      currentHealth: 'DEGRADED',
      reason: 'Test',
      timestamp: 0,
    });
    expect(degrade.success).toBe(false);

    // Nothing should have changed
    const weights = remapper.getCurrentWeights();
    expect(weights.size).toBe(3);
    for (const w of weights.values()) {
      expect(w).toBeCloseTo(1 / 3);
    }
  });

  it('should complete remapping within the latency budget', () => {
    // The adaptive remapping budget is < 2000ms
    // Since our transitions are synchronous in tests, verify the transition
    // duration field is within budget
    const result = remapper.onModalityLost('cam-1');
    expect(result.success).toBe(true);
    // transitionDuration is in nanoseconds
    expect(result.transitionDuration).toBeLessThan(LATENCY_BUDGET.ADAPTIVE_REMAPPING);
  });
});
