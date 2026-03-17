/**
 * Primary Storage Bank (PSB)
 *
 * High-density energy storage for general operation.
 * Must sustain a minimum of 72 hours of consciousness-only operation
 * without any harvesting input.
 *
 * Models a lithium-ceramic solid-state bank with:
 * - Configurable capacity (default: 2160 Wh — 72 h × 30 W consciousness draw)
 * - Charge/discharge rate limits
 * - State-of-health degradation tracking
 * - Cycle counting for lifetime estimation
 */

import { IPrimaryStorage } from "./interfaces";
import {
  ChargeResult,
  DischargeResult,
  Duration,
  EnergyMeasurement,
  PowerMeasurement,
  Temperature,
  celsius,
  duration,
  wattHours,
  watts,
} from "./types";

/** Minimum consciousness draw assumed for runtime calculations (watts) */
const CONSCIOUSNESS_DRAW_WATTS = 30;

/** Nominal 72-hour consciousness-only capacity */
const DEFAULT_CAPACITY_WH = CONSCIOUSNESS_DRAW_WATTS * 72; // 2 160 Wh

/** Max charge rate (C/2 by default) */
const DEFAULT_MAX_CHARGE_WATTS = DEFAULT_CAPACITY_WH / 2;

/** Max discharge rate (1C by default) */
const DEFAULT_MAX_DISCHARGE_WATTS = DEFAULT_CAPACITY_WH;

/** Estimated cycle life at nominal conditions */
const NOMINAL_CYCLE_LIFE = 5000;

export class PrimaryStorage implements IPrimaryStorage {
  private storedEnergyWh: number;
  private readonly capacityWh: number;
  private readonly maxChargeWatts: number;
  private readonly maxDischargeWatts: number;
  private stateOfHealth: number; // 0.0 – 1.0
  private cycleCount: number;
  private temperature: Temperature;

  constructor(
    capacityWh = DEFAULT_CAPACITY_WH,
    initialChargeRatio = 1.0,
    stateOfHealth = 1.0,
    maxChargeWatts = DEFAULT_MAX_CHARGE_WATTS,
    maxDischargeWatts = DEFAULT_MAX_DISCHARGE_WATTS
  ) {
    this.capacityWh = capacityWh;
    this.storedEnergyWh = capacityWh * Math.min(1.0, Math.max(0.0, initialChargeRatio));
    this.stateOfHealth = Math.min(1.0, Math.max(0.0, stateOfHealth));
    this.maxChargeWatts = maxChargeWatts;
    this.maxDischargeWatts = maxDischargeWatts;
    this.cycleCount = 0;
    this.temperature = celsius(25);
  }

  // ─── IPrimaryStorage ────────────────────────────────────────────────

  getCapacity(): EnergyMeasurement {
    return wattHours(this.capacityWh * this.stateOfHealth);
  }

  getStoredEnergy(): EnergyMeasurement {
    return wattHours(this.storedEnergyWh);
  }

  getChargeRate(): PowerMeasurement {
    return watts(this.maxChargeWatts);
  }

  getDischargeRate(): PowerMeasurement {
    return watts(this.maxDischargeWatts);
  }

  getStateOfHealth(): number {
    return this.stateOfHealth;
  }

  getCycleCount(): number {
    return this.cycleCount;
  }

  getEstimatedLifetime(): Duration {
    const remainingCycles = Math.max(0, NOMINAL_CYCLE_LIFE - this.cycleCount);
    // Assume average cycle drains and fully charges ~1h per cycle
    const remainingMs = remainingCycles * 3600 * 1000;
    return duration(remainingMs);
  }

  getTemperature(): Temperature {
    return this.temperature;
  }

  /**
   * Charge the storage at up to `power` watts for one iteration tick (1 s).
   *
   * The actual rate is clamped to:
   *   min(requested, maxCharge, remaining_capacity / 1s)
   */
  charge(power: PowerMeasurement): ChargeResult {
    if (power.watts <= 0) {
      return { success: false, actualRate: watts(0), error: "Charge power must be positive" };
    }

    const effectiveCapacity = this.capacityWh * this.stateOfHealth;
    const headroom = effectiveCapacity - this.storedEnergyWh;

    if (headroom <= 0) {
      return { success: false, actualRate: watts(0), error: "Storage fully charged" };
    }

    // Rate limited by hardware max and available headroom
    const maxByHeadroomWatts = headroom * 3600; // headroom Wh → W at 1s tick
    const actualWatts = Math.min(power.watts, this.maxChargeWatts, maxByHeadroomWatts);

    // Accumulate energy (1 second tick assumed)
    this.storedEnergyWh += actualWatts / 3600;
    this.storedEnergyWh = Math.min(this.storedEnergyWh, effectiveCapacity);

    // Count half-cycle contribution
    this.cycleCount += actualWatts / (effectiveCapacity * 3600 * 2);

    return { success: true, actualRate: watts(actualWatts) };
  }

  /**
   * Discharge the storage at up to `power` watts for one iteration tick (1 s).
   *
   * The actual rate is clamped to:
   *   min(requested, maxDischarge, stored_energy / 1s)
   */
  discharge(power: PowerMeasurement): DischargeResult {
    if (power.watts <= 0) {
      return { success: false, actualRate: watts(0), error: "Discharge power must be positive" };
    }

    if (this.storedEnergyWh <= 0) {
      return { success: false, actualRate: watts(0), error: "Storage depleted" };
    }

    // Rate limited by hardware max and stored energy
    const maxByStoredWatts = this.storedEnergyWh * 3600; // Wh → W at 1s tick
    const actualWatts = Math.min(power.watts, this.maxDischargeWatts, maxByStoredWatts);

    this.storedEnergyWh -= actualWatts / 3600;
    this.storedEnergyWh = Math.max(0, this.storedEnergyWh);

    // Count half-cycle contribution
    const effectiveCapacity = this.capacityWh * this.stateOfHealth;
    this.cycleCount += actualWatts / (effectiveCapacity * 3600 * 2);

    return { success: true, actualRate: watts(actualWatts) };
  }

  // ─── Test / Simulation Helpers ──────────────────────────────────────

  /** Directly set stored energy for test scenarios */
  setStoredEnergy(wh: number): void {
    const effective = this.capacityWh * this.stateOfHealth;
    this.storedEnergyWh = Math.max(0, Math.min(wh, effective));
  }

  /** Apply degradation (simulates aging) */
  applyDegradation(loss: number): void {
    this.stateOfHealth = Math.max(0, this.stateOfHealth - loss);
    // Clamp stored energy to new effective capacity
    const effective = this.capacityWh * this.stateOfHealth;
    if (this.storedEnergyWh > effective) {
      this.storedEnergyWh = effective;
    }
  }

  /** Set ambient temperature */
  setTemperature(temp: Temperature): void {
    this.temperature = temp;
  }
}
