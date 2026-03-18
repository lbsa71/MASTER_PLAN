/**
 * Sensorimotor-Consciousness Integration — Interface Contracts
 *
 * All interfaces for the 12 modules defined in the architecture:
 * - Sensory Phenomenal Binding: IModalityAdapter, IQualiaTransformer, ISensoryBindingIntegrator
 * - Motor Intentionality Pathway: IReflexiveSafetyPath, IConsciousDeliberationPath, IActionProvenanceTracker
 * - Temporal Coherence Engine: ISensoryBuffer, IPredictiveInterpolator, IExperienceClockSynchronizer
 * - Adaptive Calibration System: IModalityRegistry, IDynamicRemapper, IExperienceContinuityGuard
 *
 * Reference: docs/sensorimotor-consciousness-integration/ARCHITECTURE.md
 */

import type {
  ModalityId,
  ModalityType,
  ModalityConfig,
  SensoryFrame,
  QualiaRepresentation,
  UnifiedQualiaField,
  SensorySnapshot,
  PredictedFrame,
  CrossModalConflict,
  SalienceMap,
  AttentionWeightMap,
  SensorHealth,
  CalibrationState,
  CalibrationParams,
  CalibrationResult,
  SafetyTrigger,
  ReflexResponse,
  SafetyReflex,
  ReflexEvent,
  IntentionalAction,
  ActionResult,
  ActionId,
  AbortResult,
  ActionModification,
  ModifyResult,
  ExecutionFeedback,
  MotorCommand,
  ActionSource,
  ProvenanceId,
  ActionProvenance,
  ProvenanceFilter,
  ConsciousClaim,
  Timestamp,
  Duration,
  Confidence,
  CoherenceScore,
  StabilityScore,
  PredictionError,
  SyncResult,
  ModalityDescriptor,
  UnregisterResult,
  ModalityChangeHandler,
  DegradationInfo,
  RemapResult,
  RemapStatus,
  RemapTransition,
  TransitionMonitorHandle,
  RollbackResult,
  LagExceededHandler,
} from './types';

// =============================================================================
// 1. Sensory Phenomenal Binding
// =============================================================================

/** Adapter that normalizes raw sensor output into standard SensoryFrame format */
export interface IModalityAdapter {
  readonly modalityId: ModalityId;
  readonly modalityType: ModalityType;

  initialize(config: ModalityConfig): Promise<void>;
  read(): SensoryFrame;
  getHealth(): SensorHealth;
  getCalibration(): CalibrationState;
  recalibrate(params: CalibrationParams): Promise<CalibrationResult>;
  shutdown(): Promise<void>;
}

/** Converts SensoryFrame data into consciousness-compatible QualiaRepresentation */
export interface IQualiaTransformer {
  transform(frame: SensoryFrame): QualiaRepresentation;
  transformBatch(frames: SensoryFrame[]): UnifiedQualiaField;
  getTransformationLatency(): Duration;
  setAttentionWeights(weights: AttentionWeightMap): void;
  getSalienceMap(): SalienceMap;
}

/** Combines per-modality qualia into a unified multi-modal experience field */
export interface ISensoryBindingIntegrator {
  bind(representations: QualiaRepresentation[]): UnifiedQualiaField;
  getActiveModalities(): ModalityId[];
  getCrossModalConflicts(): CrossModalConflict[];
  getSpatialCoherence(): CoherenceScore;
  getBindingLatency(): Duration;
}

// =============================================================================
// 2. Motor Intentionality Pathway
// =============================================================================

/** Low-latency safety reflex loop that bypasses conscious deliberation */
export interface IReflexiveSafetyPath {
  registerReflex(trigger: SafetyTrigger, response: ReflexResponse): void;
  getActiveReflexes(): SafetyReflex[];
  getLastTriggered(): ReflexEvent | null;
  setConsciousOverrideEnabled(enabled: boolean): void;
  getResponseLatency(): Duration;
  /** Evaluate a sensory frame and trigger reflexes if thresholds are exceeded */
  evaluate(frame: SensoryFrame): ReflexEvent | null;
}

/** Motor commands originating from conscious intention */
export interface IConsciousDeliberationPath {
  submitAction(action: IntentionalAction): Promise<ActionResult>;
  getActiveActions(): IntentionalAction[];
  abortAction(actionId: ActionId): AbortResult;
  modifyAction(actionId: ActionId, modification: ActionModification): ModifyResult;
  getDeliberationLatency(): Duration;
  getExecutionFeedback(actionId: ActionId): ExecutionFeedback;
}

/** Records origin and causal chain of every motor command */
export interface IActionProvenanceTracker {
  recordCommand(command: MotorCommand, source: ActionSource): ProvenanceId;
  getProvenance(provenanceId: ProvenanceId): ActionProvenance;
  getHistory(filter: ProvenanceFilter): ActionProvenance[];
  getReflexiveRatio(window: Duration): number;
  retroactiveClaim(provenanceId: ProvenanceId, claim: ConsciousClaim): void;
}

// =============================================================================
// 3. Temporal Coherence Engine
// =============================================================================

/** Rolling window of recent sensory data for temporal consistency */
export interface ISensoryBuffer {
  push(frame: SensoryFrame): void;
  getSnapshot(timestamp: Timestamp): SensorySnapshot;
  getWindow(start: Timestamp, end: Timestamp): SensoryFrame[];
  getLatestByModality(modalityId: ModalityId): SensoryFrame | null;
  getBufferDepth(): Duration;
  setBufferDepth(depth: Duration): void;
}

/** Predicts sensor values forward in time to bridge conscious processing lag */
export interface IPredictiveInterpolator {
  predict(modalityId: ModalityId, targetTime: Timestamp): PredictedFrame;
  getPredictionConfidence(modalityId: ModalityId): Confidence;
  getPredictionError(modalityId: ModalityId): PredictionError;
  updateModel(modalityId: ModalityId, actualFrame: SensoryFrame): void;
  getMaxReliableHorizon(modalityId: ModalityId): Duration;
}

/** Maintains relationship between physical time, sensor time, and experience time */
export interface IExperienceClockSynchronizer {
  getPhysicalTime(): Timestamp;
  getExperienceTime(): Timestamp;
  getExperienceLag(): Duration;
  getLagThreshold(): Duration;
  setLagThreshold(threshold: Duration): void;
  onLagExceeded(callback: LagExceededHandler): void;
  synchronize(): SyncResult;
  /** Mark that the consciousness substrate has processed up to this timestamp */
  markExperienced(timestamp: Timestamp): void;
}

// =============================================================================
// 4. Adaptive Calibration System
// =============================================================================

/** Central registry of all active sensor and actuator modalities */
export interface IModalityRegistry {
  register(adapter: IModalityAdapter): ModalityId;
  unregister(modalityId: ModalityId): UnregisterResult;
  getActive(): ModalityDescriptor[];
  getDegraded(): ModalityDescriptor[];
  onModalityChange(callback: ModalityChangeHandler): void;
  getModality(modalityId: ModalityId): ModalityDescriptor | null;
}

/** Adjusts qualia pipeline when modality configuration changes */
export interface IDynamicRemapper {
  onModalityLost(modalityId: ModalityId): RemapResult;
  onModalityAdded(adapter: IModalityAdapter): RemapResult;
  onModalityDegraded(modalityId: ModalityId, degradation: DegradationInfo): RemapResult;
  getRemapStatus(): RemapStatus;
  getTransitionProgress(): number;
}

/** Monitors consciousness metrics during calibration to prevent experience interruption */
export interface IExperienceContinuityGuard {
  canProceedWithRemap(): boolean;
  monitorTransition(transition: RemapTransition): TransitionMonitorHandle;
  getConsciousnessStability(): StabilityScore;
  rollback(handle: TransitionMonitorHandle): RollbackResult;
  getMinimumStabilityThreshold(): StabilityScore;
  setMinimumStabilityThreshold(threshold: StabilityScore): void;
}
