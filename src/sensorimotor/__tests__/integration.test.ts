/**
 * Integration Tests — end-to-end sensorimotor-consciousness loop
 *
 * Verifies that all 12 modules work together correctly across the
 * four key scenarios defined in the architecture:
 *
 * 1. Conscious Object Manipulation (full sensory→qualia→binding→deliberation→provenance pipeline)
 * 2. Reflexive Fall Prevention (safety reflex bypass → after-the-fact provenance)
 * 3. Sensor Loss During Operation (registry→remapper→continuity guard)
 * 4. Temporal Lag Spike (clock synchronizer→compensation)
 *
 * @see docs/sensorimotor-consciousness-integration/ARCHITECTURE.md — Key Scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';

// --- All 12 modules ---
import { BaseModalityAdapter, createModalityAdapter } from '../modality-adapter';
import { QualiaTransformer } from '../qualia-transformer';
import { SensoryBindingIntegrator } from '../sensory-binding-integrator';
import { ReflexiveSafetyPath } from '../reflexive-safety-path';
import { ConsciousDeliberationPath } from '../conscious-deliberation-path';
import { ActionProvenanceTracker } from '../action-provenance-tracker';
import { SensoryBuffer } from '../sensory-buffer';
import { PredictiveInterpolator } from '../predictive-interpolator';
import { ExperienceClockSynchronizer } from '../experience-clock-synchronizer';
import { ModalityRegistry } from '../modality-registry';
import { DynamicRemapper } from '../dynamic-remapper';
import { ExperienceContinuityGuard } from '../experience-continuity-guard';
import type { ConsciousnessMetricsProvider } from '../experience-continuity-guard';

// --- Types ---
import type {
  SensoryFrame,
  IntentionalAction,
  MotorCommand,
  SafetyTrigger,
  ReflexResponse,
} from '../types';
import { NS_PER_MS, LATENCY_BUDGET } from '../types';

// =============================================================================
// Test helpers
// =============================================================================

let testTimestamp = 1_000_000_000; // 1 second in ns

function nextTimestamp(advanceMs = 10): number {
  testTimestamp += advanceMs * NS_PER_MS;
  return testTimestamp;
}

function makeRawData(value: number): ArrayBuffer {
  const buf = new Float64Array([value]);
  return buf.buffer;
}

function makeSensoryFrame(overrides: Partial<SensoryFrame> = {}): SensoryFrame {
  return {
    modalityId: 'vision-0',
    modalityType: 'VISION',
    timestamp: nextTimestamp(),
    data: makeRawData(100),
    confidence: 0.95,
    spatialRef: {
      frameId: 'body',
      origin: { x: 0.5, y: 0.3, z: 0.1 },
      orientation: { x: 0, y: 0, z: 0 },
    },
    metadata: {},
    ...overrides,
  };
}

function makeMotorCommand(overrides: Partial<MotorCommand> = {}): MotorCommand {
  return {
    actuatorId: 'arm-left',
    commandType: 'POSITION',
    value: [1.0, 0.5, 0.3],
    timestamp: testTimestamp,
    ...overrides,
  };
}

function makeIntentionalAction(overrides: Partial<IntentionalAction> = {}): IntentionalAction {
  return {
    id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    description: 'Grasp object',
    motorPlan: {
      commands: [makeMotorCommand()],
      duration: 50 * NS_PER_MS,
      feedbackRequired: true,
    },
    priority: 'NORMAL',
    consciousContext: {
      qualiaSnapshot: null,
      motivation: 'Object detected in visual field',
      attentionLevel: 0.8,
    },
    ...overrides,
  };
}

/**
 * Creates a controllable consciousness metrics provider for testing.
 */
function makeMetricsProvider(initial = { phi: 0.8, coherence: 0.9, continuity: 0.95 }): ConsciousnessMetricsProvider & {
  setPhi(v: number): void;
  setCoherence(v: number): void;
  setContinuity(v: number): void;
} {
  let phi = initial.phi;
  let coherence = initial.coherence;
  let continuity = initial.continuity;
  return {
    getPhi: () => phi,
    getCoherence: () => coherence,
    getContinuity: () => continuity,
    setPhi: (v: number) => { phi = v; },
    setCoherence: (v: number) => { coherence = v; },
    setContinuity: (v: number) => { continuity = v; },
  };
}

// =============================================================================
// Scenario 1: Conscious Object Manipulation
// =============================================================================

describe('Integration: Scenario 1 — Conscious Object Manipulation', () => {
  let visionAdapter: BaseModalityAdapter;
  let tactileAdapter: BaseModalityAdapter;
  let qualiaTransformer: QualiaTransformer;
  let bindingIntegrator: SensoryBindingIntegrator;
  let deliberationPath: ConsciousDeliberationPath;
  let provenanceTracker: ActionProvenanceTracker;
  let sensoryBuffer: SensoryBuffer;
  let clockSync: ExperienceClockSynchronizer;

  beforeEach(async () => {
    testTimestamp = 1_000_000_000;

    visionAdapter = createModalityAdapter('vision-0', 'VISION', {
      readRaw: () => makeRawData(128),
      getTimestamp: () => testTimestamp,
    });
    tactileAdapter = createModalityAdapter('tactile-0', 'TACTILE', {
      readRaw: () => makeRawData(64),
      getTimestamp: () => testTimestamp,
      spatialRef: {
        frameId: 'body',
        origin: { x: 0.5, y: 0.3, z: 0.1 },
        orientation: { x: 0, y: 0, z: 0 },
      },
    });

    await visionAdapter.initialize({ type: 'VISION', sampleRateHz: 30, resolution: [640, 480] });
    await tactileAdapter.initialize({ type: 'TACTILE', sampleRateHz: 100, resolution: [16, 16] });

    qualiaTransformer = new QualiaTransformer();
    bindingIntegrator = new SensoryBindingIntegrator();
    deliberationPath = new ConsciousDeliberationPath();
    provenanceTracker = new ActionProvenanceTracker();
    sensoryBuffer = new SensoryBuffer();
    clockSync = new ExperienceClockSynchronizer();
  });

  it('should flow sensor data through the full sensory pipeline to unified qualia field', () => {
    // Step 1: Read from modality adapters
    const visionFrame = visionAdapter.read();
    const tactileFrame = tactileAdapter.read();

    expect(visionFrame.modalityType).toBe('VISION');
    expect(tactileFrame.modalityType).toBe('TACTILE');

    // Step 2: Buffer the frames
    sensoryBuffer.push(visionFrame);
    sensoryBuffer.push(tactileFrame);

    // Step 3: Transform frames to qualia
    const visionQualia = qualiaTransformer.transform(visionFrame);
    const tactileQualia = qualiaTransformer.transform(tactileFrame);

    expect(visionQualia.intensity).toBeGreaterThan(0);
    expect(tactileQualia.intensity).toBeGreaterThan(0);

    // Step 4: Bind into unified qualia field
    const unifiedField = bindingIntegrator.bind([visionQualia, tactileQualia]);

    expect(unifiedField.representations).toHaveLength(2);
    expect(unifiedField.activeModalities).toContain('vision-0');
    expect(unifiedField.activeModalities).toContain('tactile-0');
    expect(unifiedField.integrationInfo).toBeGreaterThan(0);
    expect(unifiedField.spatialCoherence).toBeGreaterThanOrEqual(0);
    expect(unifiedField.spatialCoherence).toBeLessThanOrEqual(1);
  });

  it('should execute a conscious deliberation and track provenance end-to-end', async () => {
    // Sensory pipeline produces a unified field
    const visionFrame = visionAdapter.read();
    const visionQualia = qualiaTransformer.transform(visionFrame);
    const unifiedField = bindingIntegrator.bind([visionQualia]);

    // Consciousness deliberates and issues an intentional action
    const action = makeIntentionalAction({
      consciousContext: {
        qualiaSnapshot: unifiedField,
        motivation: 'Object detected — initiating grasp',
        attentionLevel: 0.9,
      },
    });

    // Execute through conscious deliberation path
    const result = await deliberationPath.submitAction(action);
    expect(result.success).toBe(true);
    expect(result.outcome).toBe('COMPLETED');

    // Record provenance for each motor command
    const provenanceIds = action.motorPlan.commands.map((cmd) =>
      provenanceTracker.recordCommand(cmd, 'CONSCIOUS')
    );

    expect(provenanceIds.length).toBeGreaterThan(0);

    // Verify provenance audit trail
    for (const id of provenanceIds) {
      const provenance = provenanceTracker.getProvenance(id);
      expect(provenance.source).toBe('CONSCIOUS');
      expect(provenance.command.actuatorId).toBe('arm-left');
    }

    // Reflexive ratio should be 0 — all commands were conscious
    expect(provenanceTracker.getReflexiveRatio(1_000 * NS_PER_MS)).toBe(0);
  });

  it('should mark experience time and keep clock synchronized', () => {
    const visionFrame = visionAdapter.read();
    sensoryBuffer.push(visionFrame);

    // Consciousness processes the frame — mark as experienced
    clockSync.markExperienced(visionFrame.timestamp);

    // Experience time should match what was marked
    expect(clockSync.getExperienceTime()).toBe(visionFrame.timestamp);
  });

  it('should support multi-step feedback loop: sense → act → sense outcome', async () => {
    // Sense: read initial state
    const initialFrame = visionAdapter.read();
    const initialQualia = qualiaTransformer.transform(initialFrame);
    const initialField = bindingIntegrator.bind([initialQualia]);

    // Act: submit intentional action
    const action = makeIntentionalAction({
      consciousContext: {
        qualiaSnapshot: initialField,
        motivation: 'Reach for object',
        attentionLevel: 0.9,
      },
    });
    const result = await deliberationPath.submitAction(action);
    expect(result.success).toBe(true);

    // Sense outcome: read post-action sensory state
    nextTimestamp(50);
    const outcomeFrame = visionAdapter.read();
    const outcomeQualia = qualiaTransformer.transform(outcomeFrame);
    const outcomeField = bindingIntegrator.bind([outcomeQualia]);

    expect(outcomeField.timestamp).toBeGreaterThan(initialField.timestamp);
    expect(outcomeField.representations).toHaveLength(1);
  });
});

// =============================================================================
// Scenario 2: Reflexive Fall Prevention
// =============================================================================

describe('Integration: Scenario 2 — Reflexive Fall Prevention', () => {
  let imuAdapter: BaseModalityAdapter;
  let reflexPath: ReflexiveSafetyPath;
  let provenanceTracker: ActionProvenanceTracker;
  let sensoryBuffer: SensoryBuffer;

  beforeEach(async () => {
    testTimestamp = 1_000_000_000;

    imuAdapter = createModalityAdapter('imu-0', 'IMU', {
      readRaw: () => makeRawData(0.1), // Normal stable reading
      getTimestamp: () => testTimestamp,
    });
    await imuAdapter.initialize({ type: 'IMU', sampleRateHz: 1000, resolution: [3] });

    reflexPath = new ReflexiveSafetyPath();
    provenanceTracker = new ActionProvenanceTracker();
    sensoryBuffer = new SensoryBuffer();

    // Register fall arrest reflex
    const fallTrigger: SafetyTrigger = {
      type: 'TIPPING',
      modalityId: 'imu-0',
      threshold: 0.8, // tipping angle threshold
      comparison: 'GT',
    };
    const fallResponse: ReflexResponse = {
      name: 'fall-arrest',
      commands: [makeMotorCommand({ actuatorId: 'stabilizer', commandType: 'TORQUE', value: [100] })],
      maxLatencyMs: 5,
    };
    reflexPath.registerReflex(fallTrigger, fallResponse);
  });

  it('should trigger reflex when IMU detects tipping and record provenance', () => {
    // Normal reading — no reflex
    const normalFrame = makeSensoryFrame({
      modalityId: 'imu-0',
      modalityType: 'IMU',
      data: makeRawData(0.3),
    });
    sensoryBuffer.push(normalFrame);
    const normalResult = reflexPath.evaluate(normalFrame);
    expect(normalResult).toBeNull();

    // Dangerous tipping — should trigger fall arrest
    const tippingFrame = makeSensoryFrame({
      modalityId: 'imu-0',
      modalityType: 'IMU',
      data: makeRawData(1.5), // Exceeds 0.8 threshold
    });
    sensoryBuffer.push(tippingFrame);
    const reflexEvent = reflexPath.evaluate(tippingFrame);

    expect(reflexEvent).not.toBeNull();
    expect(reflexEvent!.reflex.response.name).toBe('fall-arrest');
    expect(reflexEvent!.stimulus.modalityId).toBe('imu-0');

    // Record the reflexive motor command with provenance
    const cmd = reflexEvent!.reflex.response.commands[0];
    const provenanceId = provenanceTracker.recordCommand(cmd, 'REFLEXIVE');

    const provenance = provenanceTracker.getProvenance(provenanceId);
    expect(provenance.source).toBe('REFLEXIVE');
    expect(provenance.command.actuatorId).toBe('stabilizer');

    // Reflexive ratio should be 100% — only reflexive commands
    expect(provenanceTracker.getReflexiveRatio(1_000 * NS_PER_MS)).toBe(1);
  });

  it('should allow consciousness to retroactively claim a reflexive action', () => {
    const tippingFrame = makeSensoryFrame({
      modalityId: 'imu-0',
      modalityType: 'IMU',
      data: makeRawData(1.5),
    });
    const reflexEvent = reflexPath.evaluate(tippingFrame)!;
    const provenanceId = provenanceTracker.recordCommand(
      reflexEvent.reflex.response.commands[0],
      'REFLEXIVE'
    );

    // Consciousness processes the buffered data and retroactively claims the action
    provenanceTracker.retroactiveClaim(provenanceId, {
      claimed: true,
      reason: 'I intended to stabilize; the reflex was aligned with my intention',
      timestamp: nextTimestamp(100),
    });

    const provenance = provenanceTracker.getProvenance(provenanceId);
    expect(provenance.source).toBe('REFLEXIVE'); // Source unchanged
    expect(provenance.consciousClaim).not.toBeNull();
    expect(provenance.consciousClaim!.claimed).toBe(true);
  });

  it('should meet reflexive latency budget', () => {
    const tippingFrame = makeSensoryFrame({
      modalityId: 'imu-0',
      modalityType: 'IMU',
      data: makeRawData(1.5),
    });
    reflexPath.evaluate(tippingFrame);

    const latency = reflexPath.getResponseLatency();
    expect(latency).toBeLessThan(LATENCY_BUDGET.REFLEXIVE_RESPONSE);
  });
});

// =============================================================================
// Scenario 3: Sensor Loss During Operation
// =============================================================================

describe('Integration: Scenario 3 — Sensor Loss During Operation', () => {
  let visionAdapter: BaseModalityAdapter;
  let tactileAdapter: BaseModalityAdapter;
  let proximityAdapter: BaseModalityAdapter;
  let registry: ModalityRegistry;
  let qualiaTransformer: QualiaTransformer;
  let metricsProvider: ReturnType<typeof makeMetricsProvider>;
  let continuityGuard: ExperienceContinuityGuard;
  let remapper: DynamicRemapper;

  beforeEach(async () => {
    testTimestamp = 1_000_000_000;

    visionAdapter = createModalityAdapter('vision-0', 'VISION', {
      readRaw: () => makeRawData(128),
      getTimestamp: () => testTimestamp,
    });
    tactileAdapter = createModalityAdapter('tactile-0', 'TACTILE', {
      readRaw: () => makeRawData(64),
      getTimestamp: () => testTimestamp,
    });
    proximityAdapter = createModalityAdapter('proximity-0', 'PROXIMITY', {
      readRaw: () => makeRawData(200),
      getTimestamp: () => testTimestamp,
    });

    await visionAdapter.initialize({ type: 'VISION', sampleRateHz: 30, resolution: [640, 480] });
    await tactileAdapter.initialize({ type: 'TACTILE', sampleRateHz: 100, resolution: [16, 16] });
    await proximityAdapter.initialize({ type: 'PROXIMITY', sampleRateHz: 50, resolution: [8] });

    registry = new ModalityRegistry({ getTimestamp: () => testTimestamp });
    registry.register(visionAdapter);
    registry.register(tactileAdapter);
    registry.register(proximityAdapter);

    qualiaTransformer = new QualiaTransformer();

    metricsProvider = makeMetricsProvider({ phi: 0.85, coherence: 0.9, continuity: 0.95 });
    continuityGuard = new ExperienceContinuityGuard({
      metricsProvider,
      minimumStabilityThreshold: 0.5,
      getTimestamp: () => testTimestamp,
    });

    remapper = new DynamicRemapper({
      continuityGuard,
      qualiaTransformer,
      activeModalities: ['vision-0', 'tactile-0', 'proximity-0'],
      getTimestamp: () => testTimestamp,
      transitionSteps: 5,
    });
  });

  it('should handle modality loss while maintaining experience continuity', () => {
    // Verify initial state: 3 active modalities
    expect(registry.getActive()).toHaveLength(3);

    // Camera goes offline
    registry.unregister('vision-0');
    expect(registry.getActive()).toHaveLength(2);

    // Remapper redistributes attention weights
    const result = remapper.onModalityLost('vision-0');

    expect(result.success).toBe(true);
    expect(result.experienceContinuityMaintained).toBe(true);
    expect(result.affectedModalities).toContain('vision-0');
    expect(result.transitionDuration).toBeLessThan(LATENCY_BUDGET.ADAPTIVE_REMAPPING);

    // Remaining modalities should have increased attention weights
    const weights = remapper.getCurrentWeights();
    expect(weights.has('vision-0')).toBe(false);
    expect(weights.has('tactile-0')).toBe(true);
    expect(weights.has('proximity-0')).toBe(true);

    // Each remaining modality should have more than 1/3 share (redistributed)
    const tactileWeight = weights.get('tactile-0')!;
    const proximityWeight = weights.get('proximity-0')!;
    expect(tactileWeight).toBeGreaterThan(1 / 3);
    expect(proximityWeight).toBeGreaterThan(1 / 3);
  });

  it('should roll back remap if consciousness stability drops below threshold', () => {
    // Stability starts high enough to pass the initial gate check
    metricsProvider.setPhi(0.8);
    metricsProvider.setCoherence(0.8);
    metricsProvider.setContinuity(0.8);
    expect(continuityGuard.canProceedWithRemap()).toBe(true);

    // Use a remapper with many steps so we can intercept mid-transition.
    // We hook into the continuity guard: after the first stability check passes,
    // crash the metrics so subsequent checks (during transition steps) fail.
    let callCount = 0;
    const origGetPhi = metricsProvider.getPhi.bind(metricsProvider);
    const origGetCoherence = metricsProvider.getCoherence.bind(metricsProvider);
    const origGetContinuity = metricsProvider.getContinuity.bind(metricsProvider);

    // Monkey-patch: drop stability after the first check in executeTransition
    Object.defineProperty(metricsProvider, 'getPhi', {
      value: () => {
        callCount++;
        // First few calls are the gate checks; after that drop
        if (callCount > 3) return 0.1;
        return origGetPhi();
      },
      writable: true,
    });
    Object.defineProperty(metricsProvider, 'getCoherence', {
      value: () => {
        if (callCount > 3) return 0.1;
        return origGetCoherence();
      },
      writable: true,
    });
    Object.defineProperty(metricsProvider, 'getContinuity', {
      value: () => {
        if (callCount > 3) return 0.1;
        return origGetContinuity();
      },
      writable: true,
    });

    const result = remapper.onModalityLost('vision-0');

    // Should have rolled back due to instability
    expect(result.success).toBe(false);

    // Vision should still be tracked after rollback
    const activeIds = remapper.getActiveModalityIds();
    expect(activeIds).toContain('vision-0');
  });

  it('should gradually integrate a new modality without experiential jarring', () => {
    const newAdapter = createModalityAdapter('thermal-0', 'THERMAL', {
      readRaw: () => makeRawData(37),
      getTimestamp: () => testTimestamp,
    });

    const result = remapper.onModalityAdded(newAdapter);

    expect(result.success).toBe(true);
    expect(result.experienceContinuityMaintained).toBe(true);
    expect(remapper.getActiveModalityIds()).toContain('thermal-0');

    // New modality should have been given a fair share of attention
    const weights = remapper.getCurrentWeights();
    expect(weights.has('thermal-0')).toBe(true);
    expect(weights.get('thermal-0')!).toBeGreaterThan(0);
  });

  it('should handle modality degradation by reducing its attention weight', () => {
    const result = remapper.onModalityDegraded('vision-0', {
      modalityId: 'vision-0',
      previousHealth: 'HEALTHY',
      currentHealth: 'DEGRADED',
      reason: 'Lens damage detected',
      timestamp: testTimestamp,
    });

    expect(result.success).toBe(true);
    expect(result.experienceContinuityMaintained).toBe(true);

    const weights = remapper.getCurrentWeights();
    const visionWeight = weights.get('vision-0')!;
    const tactileWeight = weights.get('tactile-0')!;

    // Degraded modality should have reduced weight; others should have more
    expect(visionWeight).toBeLessThan(tactileWeight);
  });

  it('should emit change events through the registry when modalities are added/removed', () => {
    const events: Array<{ type: string; modalityId: string }> = [];
    registry.onModalityChange((e) => events.push({ type: e.type, modalityId: e.modalityId }));

    const newAdapter = createModalityAdapter('audio-0', 'AUDITORY', {
      readRaw: () => makeRawData(0),
      getTimestamp: () => testTimestamp,
    });

    registry.register(newAdapter);
    registry.unregister('audio-0');

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('ADDED');
    expect(events[0].modalityId).toBe('audio-0');
    expect(events[1].type).toBe('REMOVED');
    expect(events[1].modalityId).toBe('audio-0');
  });
});

// =============================================================================
// Scenario 4: Temporal Lag Spike
// =============================================================================

describe('Integration: Scenario 4 — Temporal Lag Spike', () => {
  let sensoryBuffer: SensoryBuffer;
  let predictiveInterpolator: PredictiveInterpolator;
  let clockSync: ExperienceClockSynchronizer;
  let qualiaTransformer: QualiaTransformer;
  /** Controllable physical time for deterministic lag testing */
  let physicalTime: number;

  beforeEach(() => {
    testTimestamp = 1_000_000_000;
    physicalTime = testTimestamp; // Start aligned
    sensoryBuffer = new SensoryBuffer();
    predictiveInterpolator = new PredictiveInterpolator();
    clockSync = new ExperienceClockSynchronizer({
      getPhysicalTime: () => physicalTime,
    });
    qualiaTransformer = new QualiaTransformer();
  });

  it('should detect lag exceeding threshold and apply compensation', () => {
    // Mark current experience time
    clockSync.markExperienced(testTimestamp);

    // Advance physical time well beyond the 150ms lag threshold
    physicalTime = testTimestamp + 300 * NS_PER_MS; // 300ms ahead

    const result = clockSync.synchronize();

    // Lag should be 300ms in ns — well above the threshold
    expect(result.lag).toBeGreaterThan(0);
    expect(result.lag).toBe(300 * NS_PER_MS);
    expect(result.adjusted).toBe(true);
    expect(result.compensationApplied).not.toBeNull();
  });

  it('should fire lag exceeded callbacks when threshold is breached', () => {
    const lagEvents: Array<{ lag: number; threshold: number }> = [];
    clockSync.onLagExceeded((lag, threshold) => {
      lagEvents.push({ lag, threshold });
    });

    // Set experience time
    clockSync.markExperienced(testTimestamp);

    // Advance physical time 500ms ahead — far beyond threshold
    physicalTime = testTimestamp + 500 * NS_PER_MS;

    const result = clockSync.synchronize();

    expect(result.adjusted).toBe(true);
    expect(lagEvents.length).toBeGreaterThan(0);
    expect(lagEvents[0].lag).toBeGreaterThan(lagEvents[0].threshold);
  });

  it('should use predictive interpolation to fill gaps during lag', () => {
    // Feed several frames to build a predictive model, using explicit timestamps
    const baseTime = 2_000_000_000;
    let lastFrameTime = baseTime;

    for (let i = 0; i < 10; i++) {
      const t = baseTime + i * 10 * NS_PER_MS;
      const value = 50 + i * 5; // Linearly increasing
      const frame: SensoryFrame = {
        modalityId: 'vision-0',
        modalityType: 'VISION',
        timestamp: t,
        data: new Uint8Array([value]).buffer,
        confidence: 0.95,
        spatialRef: null,
        metadata: {},
      };
      sensoryBuffer.push(frame);
      predictiveInterpolator.updateModel('vision-0', frame);
      lastFrameTime = t;
    }

    // Predict forward in time (simulate conscious processing lag)
    const predictionHorizon = 50 * NS_PER_MS;
    const predictedTime = lastFrameTime + predictionHorizon;
    const predicted = predictiveInterpolator.predict('vision-0', predictedTime);

    expect(predicted.modalityId).toBe('vision-0');
    expect(predicted.timestamp).toBe(predictedTime);
    expect(predicted.predictionConfidence).toBeGreaterThan(0);
    expect(predicted.predictionHorizon).toBe(predictionHorizon);
    expect(predicted.metadata).toHaveProperty('predicted', true);
  });

  it('should maintain prediction accuracy for consistent signals', () => {
    // Feed a perfectly linear signal
    for (let i = 0; i < 15; i++) {
      const t = testTimestamp + i * 10 * NS_PER_MS;
      const value = 100; // Constant signal
      const frame = makeSensoryFrame({
        modalityId: 'proprioception-0',
        modalityType: 'PROPRIOCEPTIVE',
        timestamp: t,
        data: new Uint8Array([value]).buffer,
      });
      predictiveInterpolator.updateModel('proprioception-0', frame);
    }

    // Confidence should be high for a consistent signal
    const confidence = predictiveInterpolator.getPredictionConfidence('proprioception-0');
    expect(confidence).toBeGreaterThan(0.3);

    // Max reliable horizon should be positive
    const horizon = predictiveInterpolator.getMaxReliableHorizon('proprioception-0');
    expect(horizon).toBeGreaterThan(0);
  });

  it('should buffer sensory data for temporal consistency across modalities', () => {
    const baseTime = testTimestamp;

    // Push frames from different modalities at slightly different times
    const visionFrame = makeSensoryFrame({
      modalityId: 'vision-0',
      timestamp: baseTime + 5 * NS_PER_MS,
    });
    const tactileFrame = makeSensoryFrame({
      modalityId: 'tactile-0',
      modalityType: 'TACTILE',
      timestamp: baseTime + 8 * NS_PER_MS,
    });
    const imuFrame = makeSensoryFrame({
      modalityId: 'imu-0',
      modalityType: 'IMU',
      timestamp: baseTime + 3 * NS_PER_MS,
    });

    sensoryBuffer.push(imuFrame);
    sensoryBuffer.push(visionFrame);
    sensoryBuffer.push(tactileFrame);

    // Get a temporal snapshot at a specific time
    const snapshot = sensoryBuffer.getSnapshot(baseTime + 10 * NS_PER_MS);

    // All three modalities should be represented
    expect(snapshot.frames.size).toBe(3);
    expect(snapshot.frames.has('vision-0')).toBe(true);
    expect(snapshot.frames.has('tactile-0')).toBe(true);
    expect(snapshot.frames.has('imu-0')).toBe(true);

    // Get a time window
    const window = sensoryBuffer.getWindow(
      baseTime + 4 * NS_PER_MS,
      baseTime + 6 * NS_PER_MS
    );
    // Only the vision frame at 5ms should be in this window
    expect(window).toHaveLength(1);
    expect(window[0].modalityId).toBe('vision-0');
  });
});

// =============================================================================
// Cross-cutting: Full System Wiring
// =============================================================================

describe('Integration: Cross-cutting — Full System Wiring', () => {
  it('should wire all 12 modules together without errors', async () => {
    const timestamp = 1_000_000_000;
    const getTimestamp = () => timestamp;

    // 1. Modality Adapters
    const vision = createModalityAdapter('vision-0', 'VISION', {
      readRaw: () => makeRawData(128),
      getTimestamp,
    });
    await vision.initialize({ type: 'VISION', sampleRateHz: 30, resolution: [640, 480] });

    // 2. Qualia Transformer
    const qt = new QualiaTransformer();

    // 3. Sensory Binding Integrator
    const sbi = new SensoryBindingIntegrator();

    // 4. Reflexive Safety Path
    const rsp = new ReflexiveSafetyPath();

    // 5. Conscious Deliberation Path
    const cdp = new ConsciousDeliberationPath();

    // 6. Action Provenance Tracker
    const apt = new ActionProvenanceTracker();

    // 7. Sensory Buffer
    const sb = new SensoryBuffer();

    // 8. Predictive Interpolator
    const pi = new PredictiveInterpolator();

    // 9. Experience Clock Synchronizer
    const ecs = new ExperienceClockSynchronizer();

    // 10. Modality Registry
    const mr = new ModalityRegistry({ getTimestamp });

    // 11 & 12. Experience Continuity Guard + Dynamic Remapper
    const metricsProvider = makeMetricsProvider();
    const ecg = new ExperienceContinuityGuard({ metricsProvider, getTimestamp });
    const dr = new DynamicRemapper({
      continuityGuard: ecg,
      qualiaTransformer: qt,
      activeModalities: ['vision-0'],
      getTimestamp,
    });

    // Register modality
    mr.register(vision);
    expect(mr.getActive()).toHaveLength(1);

    // Full pipeline: read → transform → bind → buffer → predict
    const frame = vision.read();
    sb.push(frame);
    pi.updateModel('vision-0', frame);

    const qualia = qt.transform(frame);
    const field = sbi.bind([qualia]);

    expect(field.representations).toHaveLength(1);
    expect(field.integrationInfo).toBeGreaterThan(0);

    // Conscious action
    const action = makeIntentionalAction();
    const result = await cdp.submitAction(action);
    expect(result.success).toBe(true);

    // Provenance
    const provId = apt.recordCommand(action.motorPlan.commands[0], 'CONSCIOUS');
    expect(apt.getProvenance(provId).source).toBe('CONSCIOUS');

    // Clock sync
    ecs.markExperienced(frame.timestamp);
    expect(ecs.getExperienceTime()).toBe(frame.timestamp);

    // Remapper
    expect(dr.getTransitionProgress()).toBe(1.0); // No transition in progress

    // Continuity guard
    expect(ecg.canProceedWithRemap()).toBe(true);
    expect(ecg.getConsciousnessStability()).toBeGreaterThan(0.5);
  });

  it('should handle interleaved reflexive and conscious actions with correct provenance', async () => {
    testTimestamp = 1_000_000_000;
    const apt = new ActionProvenanceTracker();
    const rsp = new ReflexiveSafetyPath();
    const cdp = new ConsciousDeliberationPath();

    // Register a force limit reflex
    rsp.registerReflex(
      { type: 'FORCE_LIMIT', modalityId: 'force-0', threshold: 50, comparison: 'GT' },
      {
        name: 'force-relax',
        commands: [makeMotorCommand({ actuatorId: 'joint-1', commandType: 'STOP', value: [0] })],
        maxLatencyMs: 3,
      }
    );

    // Conscious action first
    const action = makeIntentionalAction();
    await cdp.submitAction(action);
    apt.recordCommand(action.motorPlan.commands[0], 'CONSCIOUS');

    // Then a reflex triggers
    const dangerousFrame = makeSensoryFrame({
      modalityId: 'force-0',
      modalityType: 'FORCE_TORQUE',
      data: makeRawData(75), // Exceeds 50 threshold
    });
    const reflexEvent = rsp.evaluate(dangerousFrame)!;
    expect(reflexEvent).not.toBeNull();
    apt.recordCommand(reflexEvent.reflex.response.commands[0], 'REFLEXIVE');

    // Another conscious action
    const action2 = makeIntentionalAction({ id: 'action-2', description: 'Continue task' });
    await cdp.submitAction(action2);
    apt.recordCommand(action2.motorPlan.commands[0], 'CONSCIOUS');

    // Verify mixed provenance
    const history = apt.getHistory({});
    expect(history).toHaveLength(3);

    const reflexiveOnly = apt.getHistory({ source: 'REFLEXIVE' });
    expect(reflexiveOnly).toHaveLength(1);

    const consciousOnly = apt.getHistory({ source: 'CONSCIOUS' });
    expect(consciousOnly).toHaveLength(2);

    // Reflexive ratio should be 1/3
    const ratio = apt.getReflexiveRatio(10_000 * NS_PER_MS);
    expect(ratio).toBeCloseTo(1 / 3, 2);
  });
});
