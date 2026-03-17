/**
 * Hardware Diagnostic Engine (HDE)
 *
 * Implements IHardwareDiagnostics — continuous monitoring of physical
 * subsystems for degradation, detecting problems before they cascade.
 *
 * Architecture reference: docs/autonomous-self-maintenance/ARCHITECTURE.md §1.1
 */

import type {
  HardwareDiagnosticReading,
  HardwareHealthSnapshot,
  WearPrediction,
  HardwareFaultCategory,
  FaultSeverity,
  TrendDirection,
  Timestamp,
  Duration,
} from "./types.js";
import type {
  IHardwareDiagnostics,
  DegradationHandler,
  Unsubscribe,
} from "./interfaces.js";

// ── Internal types ────────────────────────────────────────────

interface ComponentConfig {
  readonly category: HardwareFaultCategory;
  readonly thresholds: { readonly warningPercent: number; readonly criticalPercent: number };
}

interface MeasurementRecord {
  readonly measurement: number;
  readonly maxValue: number;
  readonly timestamp: Timestamp;
}

// ── Helpers ───────────────────────────────────────────────────

function now(): Timestamp {
  return Date.now();
}

/**
 * Categories where a LOWER measurement is worse (inverse fault direction).
 * e.g. ACTUATOR_FATIGUE tracks efficiency — low efficiency = fault.
 */
const INVERSE_FAULT_CATEGORIES = new Set<HardwareFaultCategory>([
  "ACTUATOR_FATIGUE",
]);

const CATEGORY_UNITS: Record<HardwareFaultCategory, string> = {
  MECHANICAL_WEAR: "%",
  SENSOR_DRIFT: "sigma",
  ELECTRICAL_DEGRADATION: "count",
  ACTUATOR_FATIGUE: "%",
  THERMAL_ANOMALY: "°C",
  CONNECTION_FAULT: "count",
};

function computeSeverity(
  measurement: number,
  config: ComponentConfig
): FaultSeverity {
  const { thresholds, category } = config;
  if (INVERSE_FAULT_CATEGORIES.has(category)) {
    // Lower measurement is worse
    if (measurement < thresholds.criticalPercent) return "CRITICAL";
    if (measurement < thresholds.warningPercent) return "WARNING";
    return "INFO";
  } else {
    // Higher measurement is worse
    if (measurement >= thresholds.criticalPercent) return "CRITICAL";
    if (measurement >= thresholds.warningPercent) return "WARNING";
    return "INFO";
  }
}

function computeWearPercent(
  measurement: number,
  maxValue: number,
  category: HardwareFaultCategory
): number {
  if (maxValue === 0) return 0;
  if (INVERSE_FAULT_CATEGORIES.has(category)) {
    // Wear is how far below maximum the measurement has fallen
    return Math.max(0, Math.min(100, ((maxValue - measurement) / maxValue) * 100));
  }
  return Math.max(0, Math.min(100, (measurement / maxValue) * 100));
}

interface TrendResult {
  trend: TrendDirection;
  avgDeltaPerSample: number;
}

function computeTrend(
  history: readonly MeasurementRecord[],
  category: HardwareFaultCategory
): TrendResult {
  if (history.length < 2) {
    return { trend: "STABLE", avgDeltaPerSample: 0 };
  }
  const deltas: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const delta = history[i].measurement - history[i - 1].measurement;
    deltas.push(delta);
  }
  const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;

  const isInverse = INVERSE_FAULT_CATEGORIES.has(category);
  const wearingDelta = isInverse ? -avgDelta : avgDelta; // positive means wearing out

  if (Math.abs(avgDelta) < 0.001) {
    return { trend: "STABLE", avgDeltaPerSample: avgDelta };
  }
  if (wearingDelta > 0) {
    return { trend: "DEGRADING", avgDeltaPerSample: avgDelta };
  }
  return { trend: "IMPROVING", avgDeltaPerSample: avgDelta };
}

/**
 * Estimates time-to-failure in milliseconds given the current wear trajectory.
 * Uses a simple linear extrapolation with 1-sample-per-hour assumed rate.
 */
function estimateTimeToFailure(
  currentWearPercent: number,
  trend: TrendDirection,
  avgDeltaPerSample: number,
  category: HardwareFaultCategory,
  maxValue: number
): Duration | null {
  if (trend !== "DEGRADING" || avgDeltaPerSample === 0) return null;

  const isInverse = INVERSE_FAULT_CATEGORIES.has(category);
  const wearRatePerSample = isInverse
    ? -avgDeltaPerSample / maxValue * 100  // rate of wear increase
    : avgDeltaPerSample / maxValue * 100;

  if (wearRatePerSample <= 0) return null;

  const remainingWear = 100 - currentWearPercent;
  if (remainingWear <= 0) return 0;

  const samplesUntilFailure = remainingWear / wearRatePerSample;
  const ASSUMED_SAMPLE_INTERVAL_MS = 3_600_000; // 1 hour per sample
  return Math.round(samplesUntilFailure * ASSUMED_SAMPLE_INTERVAL_MS);
}

// ── Implementation ────────────────────────────────────────────

export class HardwareDiagnosticEngine implements IHardwareDiagnostics {
  private readonly configs = new Map<string, ComponentConfig>();
  private readonly latestReadings = new Map<string, HardwareDiagnosticReading>();
  private readonly measurementHistory = new Map<string, MeasurementRecord[]>();
  private readonly handlers = new Set<DegradationHandler>();

  // ── IHardwareDiagnostics ───────────────────────────────────

  getHealthSnapshot(): HardwareHealthSnapshot {
    const faults = Array.from(this.latestReadings.values()).filter(
      (r) => r.severity !== "INFO"
    );
    const predictions = Array.from(this.configs.keys())
      .map((id) => this.getWearPrediction(id))
      .filter((p): p is WearPrediction => p !== null);

    const health =
      faults.length === 0
        ? 1.0
        : Math.max(0, 1 - faults.length / Math.max(1, this.configs.size));

    return {
      faults,
      predictions,
      overallHealth: health,
      timestamp: now(),
    };
  }

  getComponentHealth(componentId: string): HardwareDiagnosticReading | null {
    return this.latestReadings.get(componentId) ?? null;
  }

  getWearPrediction(componentId: string): WearPrediction | null {
    const config = this.configs.get(componentId);
    if (!config) return null;

    const history = this.measurementHistory.get(componentId) ?? [];
    const latest = history[history.length - 1];
    const currentWearPercent =
      latest !== undefined
        ? computeWearPercent(latest.measurement, latest.maxValue, config.category)
        : 0;

    const { trend, avgDeltaPerSample } = computeTrend(history, config.category);
    const estimatedTimeToFailure = estimateTimeToFailure(
      currentWearPercent,
      trend,
      avgDeltaPerSample,
      config.category,
      latest?.maxValue ?? 100
    );

    const confidence =
      history.length >= 3 ? Math.min(1, history.length / 10) : history.length / 3;

    return {
      componentId,
      currentWearPercent,
      trend,
      estimatedTimeToFailure,
      confidence,
      timestamp: now(),
    };
  }

  async runTargetedDiagnostic(
    componentId: string
  ): Promise<HardwareDiagnosticReading[]> {
    const reading = this.latestReadings.get(componentId);
    return reading ? [reading] : [];
  }

  onDegradationDetected(handler: DegradationHandler): Unsubscribe {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async runFullScan(): Promise<HardwareHealthSnapshot> {
    // Ensure all registered components have a wear prediction by refreshing predictions
    const faults = Array.from(this.latestReadings.values()).filter(
      (r) => r.severity !== "INFO"
    );
    const predictions = Array.from(this.configs.keys())
      .map((id) => this.getWearPrediction(id))
      .filter((p): p is WearPrediction => p !== null);

    const health =
      faults.length === 0
        ? 1.0
        : Math.max(0, 1 - faults.length / Math.max(1, this.configs.size));

    return {
      faults,
      predictions,
      overallHealth: health,
      timestamp: now(),
    };
  }

  // ── Extra surface used by tests ────────────────────────────

  /**
   * Register a component so the engine tracks it.
   * Creates an initial baseline INFO reading so the component is immediately queryable.
   */
  registerComponent(componentId: string, config: ComponentConfig): void {
    this.configs.set(componentId, config);
    this.measurementHistory.set(componentId, []);

    // Seed a baseline INFO reading (no measurement yet — report 0 wear)
    const ts = now();
    const baselineReading: HardwareDiagnosticReading = {
      componentId,
      category: config.category,
      severity: "INFO",
      measurement: 0,
      threshold: config.thresholds.warningPercent,
      unit: CATEGORY_UNITS[config.category],
      timestamp: ts,
      description: `${config.category} baseline reading (no measurement yet)`,
    };
    this.latestReadings.set(componentId, baselineReading);
  }

  /**
   * Report a new sensor measurement for a registered component.
   * `measurement` is the observed value; `maxValue` is the rated scale.
   */
  reportMeasurement(
    componentId: string,
    measurement: number,
    maxValue: number
  ): void {
    const config = this.configs.get(componentId);
    if (!config) return;

    const ts = now();
    const history = this.measurementHistory.get(componentId)!;
    history.push({ measurement, maxValue, timestamp: ts });

    const severity = computeSeverity(measurement, config);
    const reading: HardwareDiagnosticReading = {
      componentId,
      category: config.category,
      severity,
      measurement,
      threshold: config.thresholds.warningPercent,
      unit: CATEGORY_UNITS[config.category],
      timestamp: ts,
      description: `${config.category} reading ${measurement} ${CATEGORY_UNITS[config.category]} (threshold: ${config.thresholds.warningPercent})`,
    };

    this.latestReadings.set(componentId, reading);

    if (severity !== "INFO") {
      for (const handler of this.handlers) {
        handler(reading);
      }
    }
  }
}
