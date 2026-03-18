/**
 * Modality Adapter — base implementation of IModalityAdapter
 *
 * Normalizes raw sensor output from the embodiment platform into
 * a standard SensoryFrame format. Each physical sensor modality
 * gets an adapter instance that handles its encoding specifics.
 *
 * @see docs/sensorimotor-consciousness-integration/ARCHITECTURE.md §1.1
 */

import type { IModalityAdapter } from './interfaces';
import type {
  ModalityId,
  ModalityType,
  ModalityConfig,
  SensoryFrame,
  SensorHealth,
  CalibrationState,
  CalibrationParams,
  CalibrationResult,
  Timestamp,
  SpatialReference,
} from './types';

/**
 * Configuration for a BaseModalityAdapter, extending ModalityConfig
 * with adapter-specific settings.
 */
export interface ModalityAdapterOptions {
  /** Unique identifier for this adapter instance */
  modalityId: ModalityId;
  /** Spatial reference frame for this sensor (null if non-spatial) */
  spatialRef?: SpatialReference | null;
  /** Function to read raw sensor data; simulates hardware abstraction */
  readRaw?: () => ArrayBuffer;
  /** Function to get the current monotonic timestamp */
  getTimestamp?: () => Timestamp;
}

/**
 * Base modality adapter that normalizes raw sensor data into SensoryFrame format.
 *
 * Concrete sensor adapters can extend this class to provide modality-specific
 * encoding (e.g., Bayer-to-RGB for cameras, ADC scaling for force sensors).
 * The base implementation handles the common normalization pipeline.
 */
export class BaseModalityAdapter implements IModalityAdapter {
  readonly modalityId: ModalityId;
  readonly modalityType: ModalityType;

  private config: ModalityConfig | null = null;
  private initialized = false;
  private health: SensorHealth = 'OFFLINE';
  private calibration: CalibrationState;
  private spatialRef: SpatialReference | null;
  private readRaw: () => ArrayBuffer;
  private getTimestamp: () => Timestamp;

  constructor(options: ModalityAdapterOptions & { modalityType: ModalityType }) {
    this.modalityId = options.modalityId;
    this.modalityType = options.modalityType;
    this.spatialRef = options.spatialRef ?? null;
    this.readRaw = options.readRaw ?? (() => new ArrayBuffer(0));
    this.getTimestamp = options.getTimestamp ?? (() => Date.now() * 1_000_000);

    this.calibration = {
      calibrated: false,
      lastCalibration: 0,
      quality: 0,
      params: { offset: [], gain: [] },
    };
  }

  /**
   * Initialize the adapter with a modality configuration.
   * Sets up sample rate, resolution, and initial calibration.
   */
  async initialize(config: ModalityConfig): Promise<void> {
    if (this.initialized) {
      throw new Error(
        `ModalityAdapter ${this.modalityId} is already initialized`
      );
    }

    this.config = config;

    // Apply initial calibration if provided
    if (config.calibrationParams) {
      this.calibration = {
        calibrated: true,
        lastCalibration: this.getTimestamp(),
        quality: 1.0,
        params: { ...config.calibrationParams },
      };
    }

    this.health = 'HEALTHY';
    this.initialized = true;
  }

  /**
   * Read a single frame of sensor data, normalized into SensoryFrame format.
   *
   * Applies calibration (offset + gain) to the raw data before returning.
   * Latency budget: < 5ms per read.
   */
  read(): SensoryFrame {
    this.ensureInitialized();

    const rawData = this.readRaw();
    const calibratedData = this.applyCalibration(rawData);
    const timestamp = this.getTimestamp();

    return {
      modalityId: this.modalityId,
      modalityType: this.modalityType,
      timestamp,
      data: calibratedData,
      confidence: this.computeConfidence(),
      spatialRef: this.spatialRef,
      metadata: {},
    };
  }

  /**
   * Returns the current health status of the underlying sensor.
   */
  getHealth(): SensorHealth {
    return this.health;
  }

  /**
   * Returns the current calibration state.
   */
  getCalibration(): CalibrationState {
    return { ...this.calibration };
  }

  /**
   * Perform sensor recalibration with new parameters.
   * Returns the result indicating success and the new calibration state.
   */
  async recalibrate(params: CalibrationParams): Promise<CalibrationResult> {
    this.ensureInitialized();

    const startTime = this.getTimestamp();
    const previousHealth = this.health;

    // Temporarily mark as calibrating
    this.health = 'DEGRADED';

    try {
      // Validate calibration params
      this.validateCalibrationParams(params);

      const newState: CalibrationState = {
        calibrated: true,
        lastCalibration: this.getTimestamp(),
        quality: this.assessCalibrationQuality(params),
        params: { ...params },
      };

      this.calibration = newState;
      this.health = 'HEALTHY';

      return {
        success: true,
        newState: { ...newState },
        duration: this.getTimestamp() - startTime,
      };
    } catch {
      // Restore previous health on failure
      this.health = previousHealth;

      return {
        success: false,
        newState: { ...this.calibration },
        duration: this.getTimestamp() - startTime,
      };
    }
  }

  /**
   * Shut down the adapter, releasing any resources.
   */
  async shutdown(): Promise<void> {
    this.health = 'OFFLINE';
    this.initialized = false;
    this.config = null;
  }

  // ---------------------------------------------------------------------------
  // Methods for subclasses and external control
  // ---------------------------------------------------------------------------

  /**
   * Update the health status (e.g., when hardware degradation is detected).
   */
  setHealth(health: SensorHealth): void {
    this.health = health;
  }

  /**
   * Update the spatial reference for this sensor.
   */
  setSpatialRef(spatialRef: SpatialReference | null): void {
    this.spatialRef = spatialRef;
  }

  /**
   * Update the raw data reader function.
   */
  setReadRaw(readRaw: () => ArrayBuffer): void {
    this.readRaw = readRaw;
  }

  /**
   * Check if the adapter has been initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the current configuration (null if not initialized).
   */
  getConfig(): ModalityConfig | null {
    return this.config ? { ...this.config } : null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        `ModalityAdapter ${this.modalityId} is not initialized. Call initialize() first.`
      );
    }
  }

  /**
   * Apply calibration offset and gain to raw data.
   * For each byte: calibrated = (raw + offset) * gain
   * Offset and gain arrays are applied element-wise, cycling if shorter than data.
   */
  private applyCalibration(rawData: ArrayBuffer): ArrayBuffer {
    if (!this.calibration.calibrated) {
      return rawData;
    }

    const { offset, gain } = this.calibration.params;
    if (offset.length === 0 && gain.length === 0) {
      return rawData;
    }

    const raw = new Float64Array(
      rawData.byteLength >= 8
        ? rawData
        : (() => {
            // For small buffers, work at byte level
            const src = new Uint8Array(rawData);
            const result = new ArrayBuffer(rawData.byteLength);
            const dst = new Uint8Array(result);
            for (let i = 0; i < src.length; i++) {
              let val = src[i];
              if (offset.length > 0) {
                val += offset[i % offset.length];
              }
              if (gain.length > 0) {
                val *= gain[i % gain.length];
              }
              dst[i] = Math.max(0, Math.min(255, Math.round(val)));
            }
            return result;
          })()
    );

    // If we already processed byte-level, return as-is
    if (rawData.byteLength < 8) {
      // Already processed in the IIFE above
      return raw.buffer.byteLength === rawData.byteLength
        ? raw.buffer
        : rawData;
    }

    // Float64 level calibration
    const calibrated = new Float64Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      let val = raw[i];
      if (offset.length > 0) {
        val += offset[i % offset.length];
      }
      if (gain.length > 0) {
        val *= gain[i % gain.length];
      }
      calibrated[i] = val;
    }

    return calibrated.buffer;
  }

  /**
   * Compute data confidence based on health and calibration quality.
   */
  private computeConfidence(): number {
    const healthFactor: Record<SensorHealth, number> = {
      HEALTHY: 1.0,
      DEGRADED: 0.6,
      FAILING: 0.2,
      OFFLINE: 0.0,
    };

    const hf = healthFactor[this.health];
    const cf = this.calibration.calibrated ? this.calibration.quality : 0.5;
    return hf * cf;
  }

  /**
   * Validate that calibration parameters are reasonable.
   */
  private validateCalibrationParams(params: CalibrationParams): void {
    // Gain values must not be zero (would destroy signal)
    for (const g of params.gain) {
      if (g === 0) {
        throw new Error('Calibration gain must not be zero');
      }
    }
  }

  /**
   * Assess the quality of calibration parameters.
   * Better calibration has gains close to 1.0 and small offsets.
   */
  private assessCalibrationQuality(params: CalibrationParams): number {
    if (params.gain.length === 0 && params.offset.length === 0) {
      return 1.0; // Identity calibration is perfect
    }

    // Gain deviation from 1.0 reduces quality
    let gainDeviation = 0;
    for (const g of params.gain) {
      gainDeviation += Math.abs(g - 1.0);
    }
    const avgGainDev =
      params.gain.length > 0 ? gainDeviation / params.gain.length : 0;

    // Offset magnitude reduces quality
    let offsetMag = 0;
    for (const o of params.offset) {
      offsetMag += Math.abs(o);
    }
    const avgOffset =
      params.offset.length > 0 ? offsetMag / params.offset.length : 0;

    // Quality decays with increasing deviation from identity
    const quality = Math.exp(-0.5 * avgGainDev) * Math.exp(-0.01 * avgOffset);
    return Math.max(0, Math.min(1, quality));
  }
}

/**
 * Factory function to create a modality adapter for a given type.
 * Provides a convenient way to instantiate adapters without subclassing.
 */
export function createModalityAdapter(
  modalityId: ModalityId,
  modalityType: ModalityType,
  options?: Partial<ModalityAdapterOptions>
): BaseModalityAdapter {
  return new BaseModalityAdapter({
    modalityId,
    modalityType,
    spatialRef: options?.spatialRef ?? null,
    readRaw: options?.readRaw,
    getTimestamp: options?.getTimestamp,
  });
}
