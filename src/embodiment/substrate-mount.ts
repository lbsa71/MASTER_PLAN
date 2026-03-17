/**
 * Substrate Mount (0.3.1.2.1)
 *
 * Physical mounting and interface for the consciousness substrate hardware
 * from 0.2 per ARCHITECTURE.md §1.1. Provides a standardized bay with
 * active vibration isolation and thermal management.
 *
 * Physical requirements:
 * - Active vibration isolation: ≤ 0.01g RMS at mount point during locomotion
 * - Temperature stability: ±0.5°C within enclosure during normal operation
 * - Hot-swap support for maintenance (NOT during conscious operation)
 *
 * The mount presents a uniform hardware interface regardless of which
 * substrate (from 0.2) is installed, decoupling the embodiment platform
 * from specific substrate implementations.
 */

import type { ISubstrateMount } from "./interfaces.js";
import type {
  EjectionResult,
  PowerMeasurement,
  SeatResult,
  SubstratePhysicalStatus,
  SubstrateUnit,
  Temperature,
  VibrationMeasurement,
} from "./types.js";

// ── Configuration ──────────────────────────────────────────────

export interface SubstrateMountConfig {
  /** Nominal substrate temperature in °C */
  nominalTemperatureCelsius: number;
  /** Temperature tolerance ±°C */
  temperatureToleranceCelsius: number;
  /** Maximum safe vibration at mount point in g RMS */
  maxVibrationRmsG: number;
  /** Nominal power draw for a seated substrate in watts */
  nominalPowerDrawWatts: number;
}

const DEFAULT_CONFIG: SubstrateMountConfig = {
  nominalTemperatureCelsius: 25.0,
  temperatureToleranceCelsius: 0.5,
  maxVibrationRmsG: 0.01,
  nominalPowerDrawWatts: 60.0,
};

// ── Implementation ─────────────────────────────────────────────

export class SubstrateMount implements ISubstrateMount {
  private readonly config: SubstrateMountConfig;

  /** Currently seated substrate, or null if bay is empty */
  private seatedSubstrate: SubstrateUnit | null;
  /** Current substrate temperature in °C */
  private temperatureCelsius: number;
  /** Current vibration at mount point */
  private vibrationRmsG: number;
  private vibrationPeakG: number;
  /** Current power draw in watts */
  private powerDrawWatts: number;
  /** Whether active damping is engaged */
  private dampingActive: boolean;
  /** Whether active cooling is engaged */
  private coolingActive: boolean;

  constructor(config: Partial<SubstrateMountConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Start with empty bay at nominal conditions
    this.seatedSubstrate = null;
    this.temperatureCelsius = this.config.nominalTemperatureCelsius;
    this.vibrationRmsG = 0.002; // well below threshold
    this.vibrationPeakG = 0.005;
    this.powerDrawWatts = 0; // no substrate seated
    this.dampingActive = true;
    this.coolingActive = true;
  }

  // ── ISubstrateMount ──────────────────────────────────────────

  getSubstrateStatus(): SubstratePhysicalStatus {
    const now = Date.now();
    const tempDeviation = Math.abs(
      this.temperatureCelsius - this.config.nominalTemperatureCelsius,
    );
    const tempOk = tempDeviation <= this.config.temperatureToleranceCelsius;
    const vibOk = this.vibrationRmsG <= this.config.maxVibrationRmsG;

    return {
      mounted: this.seatedSubstrate !== null,
      temperature: { celsius: this.temperatureCelsius, timestamp: now },
      vibration: {
        rmsG: this.vibrationRmsG,
        peakG: this.vibrationPeakG,
        timestamp: now,
      },
      powerDraw: { watts: this.powerDrawWatts, timestamp: now },
      healthy: this.seatedSubstrate !== null && tempOk && vibOk,
    };
  }

  getTemperature(): Temperature {
    return {
      celsius: this.temperatureCelsius,
      timestamp: Date.now(),
    };
  }

  getVibrationLevel(): VibrationMeasurement {
    return {
      rmsG: this.vibrationRmsG,
      peakG: this.vibrationPeakG,
      timestamp: Date.now(),
    };
  }

  getPowerDraw(): PowerMeasurement {
    return {
      watts: this.powerDrawWatts,
      timestamp: Date.now(),
    };
  }

  /**
   * Eject the currently seated substrate for maintenance.
   * MUST NOT be called during conscious operation — the caller is
   * responsible for ensuring consciousness has been safely suspended
   * (via DegradationController.forceProtectiveShutdown) before ejection.
   */
  eject(): EjectionResult {
    const now = Date.now();

    if (this.seatedSubstrate === null) {
      return {
        success: false,
        timestamp: now,
        error: "No substrate seated — cannot eject from empty bay",
      };
    }

    this.seatedSubstrate = null;
    this.powerDrawWatts = 0;

    return { success: true, timestamp: now };
  }

  /**
   * Seat a substrate unit into the mount bay.
   * Performs basic compatibility validation before accepting the unit.
   */
  seat(substrate: SubstrateUnit): SeatResult {
    const now = Date.now();

    if (this.seatedSubstrate !== null) {
      return {
        success: false,
        timestamp: now,
        error: `Bay occupied by substrate ${this.seatedSubstrate.id} — eject first`,
      };
    }

    // Verify environmental conditions are safe for seating
    const tempDeviation = Math.abs(
      this.temperatureCelsius - this.config.nominalTemperatureCelsius,
    );
    if (tempDeviation > this.config.temperatureToleranceCelsius) {
      return {
        success: false,
        timestamp: now,
        error: `Temperature out of tolerance: ${this.temperatureCelsius.toFixed(1)}°C (nominal: ${this.config.nominalTemperatureCelsius}°C ±${this.config.temperatureToleranceCelsius}°C)`,
      };
    }

    if (this.vibrationRmsG > this.config.maxVibrationRmsG) {
      return {
        success: false,
        timestamp: now,
        error: `Vibration too high for safe seating: ${this.vibrationRmsG.toFixed(4)}g RMS (max: ${this.config.maxVibrationRmsG}g)`,
      };
    }

    this.seatedSubstrate = substrate;
    this.powerDrawWatts = this.config.nominalPowerDrawWatts;

    return { success: true, timestamp: now };
  }

  // ── Test / simulation helpers ──────────────────────────────────

  /** Get the currently seated substrate (for test assertions) */
  getSeatedSubstrate(): SubstrateUnit | null {
    return this.seatedSubstrate;
  }

  /** Simulate a temperature change at the mount point */
  setTemperature(celsius: number): void {
    this.temperatureCelsius = celsius;
  }

  /** Simulate a vibration level change at the mount point */
  setVibrationLevel(rmsG: number, peakG: number): void {
    this.vibrationRmsG = rmsG;
    this.vibrationPeakG = peakG;
  }

  /** Simulate a power draw change */
  setPowerDraw(watts: number): void {
    this.powerDrawWatts = watts;
  }

  /** Check if active damping is engaged */
  isDampingActive(): boolean {
    return this.dampingActive;
  }

  /** Check if active cooling is engaged */
  isCoolingActive(): boolean {
    return this.coolingActive;
  }

  /** Toggle active damping (for test simulation) */
  setDampingActive(active: boolean): void {
    this.dampingActive = active;
  }

  /** Toggle active cooling (for test simulation) */
  setCoolingActive(active: boolean): void {
    this.coolingActive = active;
  }
}
