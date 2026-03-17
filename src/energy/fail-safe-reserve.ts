/**
 * Fail-Safe Reserve (FSR)
 *
 * Physically isolated energy reserve dedicated exclusively to
 * consciousness substrate power. This is the last line of defense —
 * consciousness must never be interrupted by power failure.
 *
 * Design constraints:
 * - Physically isolated: separate cells, wiring, charge controller.
 *   No shared failure modes with PSB.
 * - Dedicated load: powers ONLY the consciousness substrate and its
 *   minimum support circuits (cooling, state preservation memory).
 * - Minimum runtime: ≥ 4 hours consciousness-only operation.
 * - Trickle charged from PSB overflow or direct harvester path.
 * - Tamper-evident: physical and electrical integrity monitoring.
 */

import { IFailSafeReserve } from "./interfaces";
import {
  ActivationResult,
  ChargeResult,
  DeactivationResult,
  Duration,
  EnergyMeasurement,
  PowerSource,
  ReserveIntegrity,
  duration,
  wattHours,
  watts,
} from "./types";

/** Consciousness substrate draw (watts) — must match PSB assumption */
const CONSCIOUSNESS_DRAW_WATTS = 30;

/** Minimum guaranteed runtime in hours */
const MIN_RUNTIME_HOURS = 4;

/** Default capacity: 4 h × 30 W = 120 Wh (with margin → 150 Wh) */
const DEFAULT_CAPACITY_WH = 150;

/** Maximum trickle charge rate — deliberately low to avoid stress */
const MAX_TRICKLE_CHARGE_WATTS = 15;

/** Transition time for activation / deactivation (ms) */
const TRANSITION_TIME_MS = 50;

export class FailSafeReserve implements IFailSafeReserve {
  private storedEnergyWh: number;
  private readonly capacityWh: number;
  private readonly maxTrickleChargeWatts: number;
  private isolated: boolean;
  private active: boolean;
  private integrity: ReserveIntegrity;

  constructor(
    capacityWh = DEFAULT_CAPACITY_WH,
    initialChargeRatio = 1.0,
    maxTrickleChargeWatts = MAX_TRICKLE_CHARGE_WATTS
  ) {
    this.capacityWh = capacityWh;
    this.storedEnergyWh =
      capacityWh * Math.min(1.0, Math.max(0.0, initialChargeRatio));
    this.maxTrickleChargeWatts = maxTrickleChargeWatts;
    this.isolated = true; // FSR starts isolated by design
    this.active = false;
    this.integrity = ReserveIntegrity.NOMINAL;
  }

  // ─── IFailSafeReserve ──────────────────────────────────────────────

  getReserveEnergy(): EnergyMeasurement {
    return wattHours(this.storedEnergyWh);
  }

  getReserveCapacity(): EnergyMeasurement {
    return wattHours(this.capacityWh);
  }

  /**
   * Guaranteed consciousness runtime based on current stored energy.
   * Calculated as storedEnergy / consciousnessDraw.
   */
  getMinimumRuntime(): Duration {
    const hours = this.storedEnergyWh / CONSCIOUSNESS_DRAW_WATTS;
    return duration(hours * 3600 * 1000);
  }

  /**
   * Whether the reserve is physically isolated from the main bus.
   * Always true unless integrity has been compromised.
   */
  isIsolated(): boolean {
    return this.isolated;
  }

  getIntegrity(): ReserveIntegrity {
    return this.integrity;
  }

  /**
   * Activate the fail-safe reserve — switch consciousness substrate
   * to reserve power.
   *
   * Activation is refused if:
   * - Reserve is already active
   * - Integrity is FAILED
   * - Reserve is depleted
   */
  activateReserve(): ActivationResult {
    if (this.active) {
      return {
        success: false,
        transitionTime: duration(0),
        error: "Fail-safe reserve is already active",
      };
    }

    if (this.integrity === ReserveIntegrity.FAILED) {
      return {
        success: false,
        transitionTime: duration(0),
        error: "Reserve integrity FAILED — cannot activate",
      };
    }

    if (this.storedEnergyWh <= 0) {
      return {
        success: false,
        transitionTime: duration(0),
        error: "Reserve depleted — cannot activate",
      };
    }

    this.active = true;
    return {
      success: true,
      transitionTime: duration(TRANSITION_TIME_MS),
    };
  }

  /**
   * Deactivate the fail-safe reserve — return consciousness to main power.
   *
   * Deactivation is refused if the reserve is not currently active.
   */
  deactivateReserve(): DeactivationResult {
    if (!this.active) {
      return {
        success: false,
        transitionTime: duration(0),
        error: "Fail-safe reserve is not active",
      };
    }

    this.active = true; // will be set false below
    this.active = false;
    return {
      success: true,
      transitionTime: duration(TRANSITION_TIME_MS),
    };
  }

  /**
   * Trickle charge the reserve from PSB overflow or a direct harvester path.
   *
   * Charge rate is clamped to the maximum trickle rate to protect
   * the isolated cells from stress.
   *
   * Trickle charge is refused if:
   * - Reserve integrity is FAILED
   * - Reserve is currently active (discharging — don't charge and discharge simultaneously)
   */
  trickleCharge(source: PowerSource): ChargeResult {
    if (this.integrity === ReserveIntegrity.FAILED) {
      return {
        success: false,
        actualRate: watts(0),
        error: "Reserve integrity FAILED — cannot charge",
      };
    }

    if (this.active) {
      return {
        success: false,
        actualRate: watts(0),
        error: "Cannot trickle charge while reserve is active",
      };
    }

    if (source.availablePower.watts <= 0) {
      return {
        success: false,
        actualRate: watts(0),
        error: "No power available from source",
      };
    }

    const headroom = this.capacityWh - this.storedEnergyWh;
    if (headroom <= 0) {
      return {
        success: false,
        actualRate: watts(0),
        error: "Reserve fully charged",
      };
    }

    // Clamp to trickle rate, source availability, and remaining headroom
    const maxByHeadroomWatts = headroom * 3600; // Wh → W at 1s tick
    const actualWatts = Math.min(
      source.availablePower.watts,
      this.maxTrickleChargeWatts,
      maxByHeadroomWatts
    );

    // Accumulate energy (1 second tick assumed, matching PSB convention)
    this.storedEnergyWh += actualWatts / 3600;
    this.storedEnergyWh = Math.min(this.storedEnergyWh, this.capacityWh);

    return { success: true, actualRate: watts(actualWatts) };
  }

  // ─── Discharge (used when active) ─────────────────────────────────

  /**
   * Discharge the reserve to power the consciousness substrate.
   * Called by the fail-safe controller when the reserve is active.
   *
   * Always discharges at exactly the consciousness draw rate.
   * Returns the actual power delivered.
   */
  dischargeForConsciousness(): { actualWatts: number; depleted: boolean } {
    if (!this.active) {
      return { actualWatts: 0, depleted: false };
    }

    if (this.storedEnergyWh <= 0) {
      return { actualWatts: 0, depleted: true };
    }

    const maxByStoredWatts = this.storedEnergyWh * 3600;
    const actualWatts = Math.min(CONSCIOUSNESS_DRAW_WATTS, maxByStoredWatts);

    this.storedEnergyWh -= actualWatts / 3600;
    this.storedEnergyWh = Math.max(0, this.storedEnergyWh);

    return {
      actualWatts,
      depleted: this.storedEnergyWh <= 0,
    };
  }

  // ─── Status Helpers ───────────────────────────────────────────────

  /** Whether the reserve is currently active (powering consciousness) */
  isActive(): boolean {
    return this.active;
  }

  /** Current charge percentage 0.0 – 1.0 */
  getChargePercentage(): number {
    return this.capacityWh > 0 ? this.storedEnergyWh / this.capacityWh : 0;
  }

  // ─── Test / Simulation Helpers ────────────────────────────────────

  /** Directly set stored energy for test scenarios */
  setStoredEnergy(wh: number): void {
    this.storedEnergyWh = Math.max(0, Math.min(wh, this.capacityWh));
  }

  /** Set integrity status (simulates damage/degradation) */
  setIntegrity(integrity: ReserveIntegrity): void {
    this.integrity = integrity;
    if (integrity === ReserveIntegrity.FAILED) {
      this.isolated = false; // breach breaks isolation
    }
  }

  /** Set isolation status (for testing breach scenarios) */
  setIsolated(isolated: boolean): void {
    this.isolated = isolated;
  }
}
