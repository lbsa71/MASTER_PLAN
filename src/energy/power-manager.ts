/**
 * Power Manager (PM)
 *
 * Real-time power distribution with strict priority hierarchy.
 * Automatically sheds loads from lowest to highest priority
 * when supply cannot meet demand. Consciousness (P0) is NEVER shed.
 *
 * Priority hierarchy (lower number = higher priority = shed last):
 *   P0: Consciousness substrate — NEVER shed
 *   P1: Essential sensors/communication — shed 4th
 *   P2: Self-maintenance actuators — shed 3rd
 *   P3: Locomotion/manipulation — shed 1st/2nd
 *
 * Load-shedding algorithm:
 * 1. Monitor supply vs demand continuously
 * 2. If supply < demand or stored energy below threshold:
 *    - Shed P3 first, then P2, then P1
 * 3. If all non-consciousness loads are shed and supply is still
 *    insufficient, signal for fail-safe reserve activation
 * 4. Restore loads in reverse order as supply recovers
 */

import { IPowerManager } from "./interfaces";
import { IPrimaryStorage } from "./interfaces";
import { IHarvesterCoordinator } from "./interfaces";
import {
  BusStatus,
  EnergyBalance,
  LoadSheddingState,
  PowerConsumer,
  PowerCriticalHandler,
  PowerGrant,
  PowerMeasurement,
  PowerPriority,
  RestoreResult,
  ShedResult,
  watts,
  wattHours,
  duration,
} from "./types";

/** Consciousness substrate draw — must match PSB/FSR assumption */
const CONSCIOUSNESS_DRAW_WATTS = 30;

/** PSB percentage below which preemptive shedding begins */
const PREEMPTIVE_SHED_THRESHOLD = 0.30;

/** PSB percentage below which aggressive shedding (P2+P3) triggers */
const AGGRESSIVE_SHED_THRESHOLD = 0.20;

/** PSB percentage below which consciousness-only mode is forced (P1+P2+P3 shed) */
const CONSCIOUSNESS_ONLY_THRESHOLD = 0.10;

export class PowerManager implements IPowerManager {
  private readonly psb: IPrimaryStorage;
  private readonly coordinator: IHarvesterCoordinator;

  /** Registered consumers by priority bus */
  private busesByPriority: Map<PowerPriority, PowerConsumer[]> = new Map([
    [PowerPriority.P0_CONSCIOUSNESS, []],
    [PowerPriority.P1_SENSORS_COMMS, []],
    [PowerPriority.P2_MAINTENANCE, []],
    [PowerPriority.P3_MOTOR, []],
  ]);

  /** Which buses are currently energized */
  private energized: Map<PowerPriority, boolean> = new Map([
    [PowerPriority.P0_CONSCIOUSNESS, true], // Always energized
    [PowerPriority.P1_SENSORS_COMMS, true],
    [PowerPriority.P2_MAINTENANCE, true],
    [PowerPriority.P3_MOTOR, true],
  ]);

  /** Active power grants */
  private grants: Map<string, PowerGrant> = new Map();

  /** Current load-shedding level */
  private sheddingState: LoadSheddingState = LoadSheddingState.NONE;

  /** Callbacks for power-critical events */
  private criticalHandlers: PowerCriticalHandler[] = [];

  /** Grant ID counter */
  private nextGrantId = 1;

  constructor(psb: IPrimaryStorage, coordinator: IHarvesterCoordinator) {
    this.psb = psb;
    this.coordinator = coordinator;
  }

  // ─── IPowerManager ──────────────────────────────────────────────────

  getPowerBudget(): EnergyBalance {
    const stored = this.psb.getStoredEnergy();
    const incomeRate = this.coordinator.getTotalHarvestRate();
    const expenditureRate = this.getTotalDemand();
    const netRate = watts(incomeRate.watts - expenditureRate.watts);
    const consciousnessHours =
      stored.wattHours / CONSCIOUSNESS_DRAW_WATTS;

    return {
      stored,
      incomeRate,
      expenditureRate,
      netRate,
      consciousnessReserveHorizon: duration(consciousnessHours * 3600 * 1000),
    };
  }

  getBusStatus(priority: PowerPriority): BusStatus {
    const consumers = this.busesByPriority.get(priority) ?? [];
    const energized = this.energized.get(priority) ?? false;
    let currentDraw = 0;
    let maxCurrent = 0;

    for (const consumer of consumers) {
      if (energized) {
        currentDraw += consumer.currentDraw.watts;
      }
      maxCurrent += consumer.currentDraw.watts;
    }

    return {
      priority,
      energized,
      currentDraw: watts(currentDraw),
      maxCurrent: watts(maxCurrent),
      consumers,
    };
  }

  getTotalDemand(): PowerMeasurement {
    let total = 0;
    for (const [priority, consumers] of this.busesByPriority) {
      if (this.energized.get(priority)) {
        for (const consumer of consumers) {
          total += consumer.currentDraw.watts;
        }
      }
    }
    return watts(total);
  }

  getTotalSupply(): PowerMeasurement {
    return this.coordinator.getTotalHarvestRate();
  }

  getLoadSheddingStatus(): LoadSheddingState {
    return this.sheddingState;
  }

  /**
   * Shed all loads on the given priority bus.
   *
   * P0 (consciousness) cannot be shed — always returns an error.
   * Shedding is idempotent — shedding an already-shed bus is a no-op success.
   */
  shedLoad(priority: PowerPriority): ShedResult {
    if (priority === PowerPriority.P0_CONSCIOUSNESS) {
      return {
        success: false,
        priority,
        freedPower: watts(0),
        error: "Consciousness bus (P0) cannot be shed",
      };
    }

    const wasEnergized = this.energized.get(priority) ?? false;
    if (!wasEnergized) {
      return { success: true, priority, freedPower: watts(0) };
    }

    // Calculate power freed
    const consumers = this.busesByPriority.get(priority) ?? [];
    let freedWatts = 0;
    for (const consumer of consumers) {
      freedWatts += consumer.currentDraw.watts;
    }

    // De-energize bus
    this.energized.set(priority, false);

    // Revoke grants on this bus
    for (const [id, grant] of this.grants) {
      if (grant.consumer.priority === priority) {
        this.grants.delete(id);
      }
    }

    // Update shedding state
    this.updateSheddingState();

    return { success: true, priority, freedPower: watts(freedWatts) };
  }

  /**
   * Restore power to a priority bus.
   *
   * Only restores if higher-priority buses are already energized
   * (cannot restore P3 if P2 is shed).
   */
  restoreLoad(priority: PowerPriority): RestoreResult {
    if (priority === PowerPriority.P0_CONSCIOUSNESS) {
      return { success: true, priority, restoredPower: watts(0) };
    }

    const alreadyEnergized = this.energized.get(priority) ?? false;
    if (alreadyEnergized) {
      return { success: true, priority, restoredPower: watts(0) };
    }

    // Check that all higher-priority buses are energized
    for (let p = 0; p < priority; p++) {
      if (!this.energized.get(p as PowerPriority)) {
        return {
          success: false,
          priority,
          restoredPower: watts(0),
          error: `Cannot restore P${priority} while higher-priority bus P${p} is shed`,
        };
      }
    }

    // Energize bus
    this.energized.set(priority, true);

    // Calculate restored power
    const consumers = this.busesByPriority.get(priority) ?? [];
    let restoredWatts = 0;
    for (const consumer of consumers) {
      restoredWatts += consumer.currentDraw.watts;
    }

    // Update shedding state
    this.updateSheddingState();

    return { success: true, priority, restoredPower: watts(restoredWatts) };
  }

  /**
   * Request power for a consumer. The consumer is registered on its
   * priority bus and a grant is issued if the bus is energized.
   */
  requestPower(
    consumer: PowerConsumer,
    amount: PowerMeasurement
  ): PowerGrant {
    // Register consumer on its bus
    const busConsumers = this.busesByPriority.get(consumer.priority) ?? [];
    const existing = busConsumers.findIndex((c) => c.id === consumer.id);
    if (existing >= 0) {
      busConsumers[existing] = consumer;
    } else {
      busConsumers.push(consumer);
    }
    this.busesByPriority.set(consumer.priority, busConsumers);

    // Issue grant (may be zero if bus is shed)
    const busEnergized = this.energized.get(consumer.priority) ?? false;
    const grantedWatts = busEnergized
      ? Math.min(amount.watts, consumer.currentDraw.watts)
      : 0;

    const grant: PowerGrant = {
      id: `grant-${this.nextGrantId++}`,
      consumer,
      granted: watts(grantedWatts),
      timestamp: Date.now(),
    };

    this.grants.set(grant.id, grant);
    return grant;
  }

  /**
   * Release a power grant and remove the consumer from its bus.
   */
  releasePower(grant: PowerGrant): void {
    this.grants.delete(grant.id);

    const busConsumers = this.busesByPriority.get(grant.consumer.priority) ?? [];
    const idx = busConsumers.findIndex((c) => c.id === grant.consumer.id);
    if (idx >= 0) {
      busConsumers.splice(idx, 1);
    }
  }

  onPowerCritical(callback: PowerCriticalHandler): void {
    this.criticalHandlers.push(callback);
  }

  // ─── Automatic Load-Shedding Evaluation ──────────────────────────

  /**
   * Evaluate current conditions and automatically shed/restore loads.
   * Should be called on every system tick.
   *
   * Shedding decisions are based on:
   * 1. Supply vs demand imbalance
   * 2. PSB charge percentage (preemptive shedding)
   */
  evaluateAndShed(): void {
    const supply = this.getTotalSupply().watts;
    const demand = this.getTotalDemand().watts;
    const storedWh = this.psb.getStoredEnergy().wattHours;
    const capacityWh = this.psb.getCapacity().wattHours;
    const psbPercentage = capacityWh > 0 ? storedWh / capacityWh : 0;

    const previousState = this.sheddingState;

    // Determine target shedding level
    if (psbPercentage <= CONSCIOUSNESS_ONLY_THRESHOLD) {
      // Critical: consciousness only
      this.shedIfEnergized(PowerPriority.P3_MOTOR);
      this.shedIfEnergized(PowerPriority.P2_MAINTENANCE);
      this.shedIfEnergized(PowerPriority.P1_SENSORS_COMMS);
    } else if (psbPercentage <= AGGRESSIVE_SHED_THRESHOLD) {
      // Aggressive: shed P3 + P2
      this.shedIfEnergized(PowerPriority.P3_MOTOR);
      this.shedIfEnergized(PowerPriority.P2_MAINTENANCE);
      this.restoreIfShed(PowerPriority.P1_SENSORS_COMMS);
    } else if (psbPercentage <= PREEMPTIVE_SHED_THRESHOLD || supply < demand) {
      // Preemptive: shed P3
      this.shedIfEnergized(PowerPriority.P3_MOTOR);
      this.restoreIfShed(PowerPriority.P2_MAINTENANCE);
      this.restoreIfShed(PowerPriority.P1_SENSORS_COMMS);
    } else {
      // Normal: restore all
      this.restoreIfShed(PowerPriority.P1_SENSORS_COMMS);
      this.restoreIfShed(PowerPriority.P2_MAINTENANCE);
      this.restoreIfShed(PowerPriority.P3_MOTOR);
    }

    // Notify if state changed
    if (this.sheddingState !== previousState) {
      for (const handler of this.criticalHandlers) {
        handler(this.sheddingState);
      }
    }
  }

  // ─── Registration Helpers ─────────────────────────────────────────

  /**
   * Register a consumer directly on its priority bus
   * without issuing a grant. Used for static/permanent loads.
   */
  registerConsumer(consumer: PowerConsumer): void {
    const busConsumers = this.busesByPriority.get(consumer.priority) ?? [];
    const existing = busConsumers.findIndex((c) => c.id === consumer.id);
    if (existing >= 0) {
      busConsumers[existing] = consumer;
    } else {
      busConsumers.push(consumer);
    }
    this.busesByPriority.set(consumer.priority, busConsumers);
  }

  // ─── Private ──────────────────────────────────────────────────────

  private shedIfEnergized(priority: PowerPriority): void {
    if (this.energized.get(priority)) {
      this.shedLoad(priority);
    }
  }

  private restoreIfShed(priority: PowerPriority): void {
    if (!this.energized.get(priority)) {
      this.restoreLoad(priority);
    }
  }

  private updateSheddingState(): void {
    const p1 = this.energized.get(PowerPriority.P1_SENSORS_COMMS) ?? true;
    const p2 = this.energized.get(PowerPriority.P2_MAINTENANCE) ?? true;
    const p3 = this.energized.get(PowerPriority.P3_MOTOR) ?? true;

    if (!p1 && !p2 && !p3) {
      this.sheddingState = LoadSheddingState.LEVEL_3;
    } else if (!p2 && !p3) {
      this.sheddingState = LoadSheddingState.LEVEL_2;
    } else if (!p3) {
      this.sheddingState = LoadSheddingState.LEVEL_1;
    } else {
      this.sheddingState = LoadSheddingState.NONE;
    }
  }
}
