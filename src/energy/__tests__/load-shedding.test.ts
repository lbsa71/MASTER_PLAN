/**
 * Tests for Power Manager load-shedding behavior (0.3.1.2.4)
 *
 * Verifies the strict priority hierarchy for power distribution:
 * - P0 (consciousness) is NEVER shed
 * - Automatic shedding from lowest to highest priority under scarcity
 * - Restore in reverse order as supply recovers
 * - PSB-percentage-based preemptive shedding thresholds
 * - Power-critical callbacks fire on state changes
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { PowerManager } from "../power-manager.js";
import { PrimaryStorage } from "../primary-storage.js";
import { HarvesterCoordinator } from "../harvester-coordinator.js";
import { SolarHarvester } from "../harvesters/solar.js";
import {
  LoadSheddingState,
  PowerConsumer,
  PowerPriority,
  SourceAvailability,
  watts,
} from "../types.js";

/** Helper: create a PowerConsumer */
function consumer(
  id: string,
  name: string,
  priority: PowerPriority,
  drawWatts: number
): PowerConsumer {
  return {
    id,
    name,
    priority,
    currentDraw: watts(drawWatts),
    minDraw: watts(drawWatts * 0.1),
  };
}

describe("PowerManager — load shedding", () => {
  let psb: PrimaryStorage;
  let coordinator: HarvesterCoordinator;
  let solar: SolarHarvester;
  let pm: PowerManager;

  // Register one consumer per priority bus
  const consciousness = consumer("c0", "Consciousness", PowerPriority.P0_CONSCIOUSNESS, 30);
  const sensors = consumer("s1", "Sensors", PowerPriority.P1_SENSORS_COMMS, 20);
  const maintenance = consumer("m2", "Maintenance", PowerPriority.P2_MAINTENANCE, 15);
  const motor = consumer("mo3", "Motor", PowerPriority.P3_MOTOR, 50);

  beforeEach(() => {
    // 2160 Wh capacity, fully charged
    psb = new PrimaryStorage(2160, 1.0);
    coordinator = new HarvesterCoordinator();
    solar = new SolarHarvester(200);
    coordinator.registerHarvester(solar);

    pm = new PowerManager(psb, coordinator);

    // Register consumers on each bus
    pm.registerConsumer(consciousness);
    pm.registerConsumer(sensors);
    pm.registerConsumer(maintenance);
    pm.registerConsumer(motor);
  });

  describe("initial state", () => {
    it("starts with no shedding", () => {
      expect(pm.getLoadSheddingStatus()).toBe(LoadSheddingState.NONE);
    });

    it("all buses are energized", () => {
      for (const p of [
        PowerPriority.P0_CONSCIOUSNESS,
        PowerPriority.P1_SENSORS_COMMS,
        PowerPriority.P2_MAINTENANCE,
        PowerPriority.P3_MOTOR,
      ]) {
        expect(pm.getBusStatus(p).energized).toBe(true);
      }
    });

    it("total demand sums all consumers", () => {
      // 30 + 20 + 15 + 50 = 115
      expect(pm.getTotalDemand().watts).toBe(115);
    });
  });

  describe("manual shedding", () => {
    it("cannot shed P0 (consciousness)", () => {
      const result = pm.shedLoad(PowerPriority.P0_CONSCIOUSNESS);
      expect(result.success).toBe(false);
      expect(result.error).toContain("P0");
      expect(pm.getBusStatus(PowerPriority.P0_CONSCIOUSNESS).energized).toBe(true);
    });

    it("sheds P3 motor bus and frees power", () => {
      const result = pm.shedLoad(PowerPriority.P3_MOTOR);
      expect(result.success).toBe(true);
      expect(result.freedPower.watts).toBe(50);
      expect(pm.getBusStatus(PowerPriority.P3_MOTOR).energized).toBe(false);
      expect(pm.getLoadSheddingStatus()).toBe(LoadSheddingState.LEVEL_1);
    });

    it("shedding P3 + P2 reaches LEVEL_2", () => {
      pm.shedLoad(PowerPriority.P3_MOTOR);
      pm.shedLoad(PowerPriority.P2_MAINTENANCE);
      expect(pm.getLoadSheddingStatus()).toBe(LoadSheddingState.LEVEL_2);
    });

    it("shedding P3 + P2 + P1 reaches LEVEL_3 (consciousness only)", () => {
      pm.shedLoad(PowerPriority.P3_MOTOR);
      pm.shedLoad(PowerPriority.P2_MAINTENANCE);
      pm.shedLoad(PowerPriority.P1_SENSORS_COMMS);
      expect(pm.getLoadSheddingStatus()).toBe(LoadSheddingState.LEVEL_3);
      // Only consciousness draw remains
      expect(pm.getTotalDemand().watts).toBe(30);
    });

    it("shedding an already-shed bus is idempotent", () => {
      pm.shedLoad(PowerPriority.P3_MOTOR);
      const result = pm.shedLoad(PowerPriority.P3_MOTOR);
      expect(result.success).toBe(true);
      expect(result.freedPower.watts).toBe(0);
    });
  });

  describe("manual restore", () => {
    it("restores buses in priority order", () => {
      pm.shedLoad(PowerPriority.P3_MOTOR);
      pm.shedLoad(PowerPriority.P2_MAINTENANCE);

      // Restore P2 first (higher priority than P3)
      const result = pm.restoreLoad(PowerPriority.P2_MAINTENANCE);
      expect(result.success).toBe(true);
      expect(result.restoredPower.watts).toBe(15);
      expect(pm.getLoadSheddingStatus()).toBe(LoadSheddingState.LEVEL_1);
    });

    it("cannot restore P3 while P2 is still shed", () => {
      pm.shedLoad(PowerPriority.P3_MOTOR);
      pm.shedLoad(PowerPriority.P2_MAINTENANCE);

      const result = pm.restoreLoad(PowerPriority.P3_MOTOR);
      expect(result.success).toBe(false);
      expect(result.error).toContain("higher-priority");
    });

    it("restoring all returns to NONE", () => {
      pm.shedLoad(PowerPriority.P3_MOTOR);
      pm.shedLoad(PowerPriority.P2_MAINTENANCE);
      pm.shedLoad(PowerPriority.P1_SENSORS_COMMS);

      pm.restoreLoad(PowerPriority.P1_SENSORS_COMMS);
      pm.restoreLoad(PowerPriority.P2_MAINTENANCE);
      pm.restoreLoad(PowerPriority.P3_MOTOR);

      expect(pm.getLoadSheddingStatus()).toBe(LoadSheddingState.NONE);
      expect(pm.getTotalDemand().watts).toBe(115);
    });

    it("restoring already-energized bus is idempotent", () => {
      const result = pm.restoreLoad(PowerPriority.P3_MOTOR);
      expect(result.success).toBe(true);
      expect(result.restoredPower.watts).toBe(0);
    });
  });

  describe("automatic shedding via evaluateAndShed", () => {
    it("sheds P3 when PSB drops below 30% (preemptive threshold)", () => {
      // Set PSB to 25% — below 30% preemptive threshold
      psb.setStoredEnergy(2160 * 0.25);
      pm.evaluateAndShed();

      expect(pm.getLoadSheddingStatus()).toBe(LoadSheddingState.LEVEL_1);
      expect(pm.getBusStatus(PowerPriority.P3_MOTOR).energized).toBe(false);
      expect(pm.getBusStatus(PowerPriority.P2_MAINTENANCE).energized).toBe(true);
    });

    it("sheds P3+P2 when PSB drops below 20% (aggressive threshold)", () => {
      psb.setStoredEnergy(2160 * 0.15);
      pm.evaluateAndShed();

      expect(pm.getLoadSheddingStatus()).toBe(LoadSheddingState.LEVEL_2);
      expect(pm.getBusStatus(PowerPriority.P3_MOTOR).energized).toBe(false);
      expect(pm.getBusStatus(PowerPriority.P2_MAINTENANCE).energized).toBe(false);
      expect(pm.getBusStatus(PowerPriority.P1_SENSORS_COMMS).energized).toBe(true);
    });

    it("goes consciousness-only when PSB drops below 10%", () => {
      psb.setStoredEnergy(2160 * 0.08);
      pm.evaluateAndShed();

      expect(pm.getLoadSheddingStatus()).toBe(LoadSheddingState.LEVEL_3);
      expect(pm.getBusStatus(PowerPriority.P3_MOTOR).energized).toBe(false);
      expect(pm.getBusStatus(PowerPriority.P2_MAINTENANCE).energized).toBe(false);
      expect(pm.getBusStatus(PowerPriority.P1_SENSORS_COMMS).energized).toBe(false);
      expect(pm.getBusStatus(PowerPriority.P0_CONSCIOUSNESS).energized).toBe(true);
    });

    it("P0 (consciousness) is NEVER shed even at 0% PSB", () => {
      psb.setStoredEnergy(0);
      pm.evaluateAndShed();

      expect(pm.getBusStatus(PowerPriority.P0_CONSCIOUSNESS).energized).toBe(true);
    });

    it("sheds P3 when supply < demand even with healthy PSB", () => {
      // PSB is healthy (100%), but no harvesting and demand > supply
      // Supply is 0 (no solar), demand is 115 W → supply < demand
      psb.setStoredEnergy(2160 * 0.35); // above 30% but supply < demand
      pm.evaluateAndShed();

      expect(pm.getLoadSheddingStatus()).toBe(LoadSheddingState.LEVEL_1);
    });

    it("restores loads as PSB recovers", () => {
      // Drop to consciousness-only
      psb.setStoredEnergy(2160 * 0.05);
      pm.evaluateAndShed();
      expect(pm.getLoadSheddingStatus()).toBe(LoadSheddingState.LEVEL_3);

      // PSB recovers to 25% — aggressive zone, P1 should restore
      psb.setStoredEnergy(2160 * 0.15);
      pm.evaluateAndShed();
      expect(pm.getLoadSheddingStatus()).toBe(LoadSheddingState.LEVEL_2);
      expect(pm.getBusStatus(PowerPriority.P1_SENSORS_COMMS).energized).toBe(true);

      // PSB recovers to 25% — preemptive zone, P2 restores
      psb.setStoredEnergy(2160 * 0.25);
      pm.evaluateAndShed();
      expect(pm.getLoadSheddingStatus()).toBe(LoadSheddingState.LEVEL_1);
      expect(pm.getBusStatus(PowerPriority.P2_MAINTENANCE).energized).toBe(true);

      // Full recovery with harvest (supply >= demand)
      solar.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();
      psb.setStoredEnergy(2160 * 0.5);
      pm.evaluateAndShed();
      expect(pm.getLoadSheddingStatus()).toBe(LoadSheddingState.NONE);
    });
  });

  describe("power grants", () => {
    it("issues grant with allocated power when bus is energized", () => {
      const newConsumer = consumer("x1", "Extra", PowerPriority.P1_SENSORS_COMMS, 10);
      const grant = pm.requestPower(newConsumer, watts(10));
      expect(grant.granted.watts).toBe(10);
    });

    it("issues zero-power grant when bus is shed", () => {
      pm.shedLoad(PowerPriority.P3_MOTOR);
      const newMotor = consumer("x2", "ExtraMotor", PowerPriority.P3_MOTOR, 25);
      const grant = pm.requestPower(newMotor, watts(25));
      expect(grant.granted.watts).toBe(0);
    });

    it("revokes grants on shed bus", () => {
      const newMotor = consumer("x3", "MotorArm", PowerPriority.P3_MOTOR, 20);
      pm.requestPower(newMotor, watts(20));

      // Shedding P3 should work without error (grants revoked internally)
      const result = pm.shedLoad(PowerPriority.P3_MOTOR);
      expect(result.success).toBe(true);
    });

    it("releasePower removes consumer from bus", () => {
      const extra = consumer("x4", "Temp", PowerPriority.P2_MAINTENANCE, 10);
      const grant = pm.requestPower(extra, watts(10));

      // Demand should include the extra consumer
      const demandBefore = pm.getTotalDemand().watts;

      pm.releasePower(grant);

      // Demand should decrease
      expect(pm.getTotalDemand().watts).toBe(demandBefore - 10);
    });
  });

  describe("power-critical callbacks", () => {
    it("fires callback when shedding state changes", () => {
      const spy = vi.fn();
      pm.onPowerCritical(spy);

      psb.setStoredEnergy(2160 * 0.25);
      pm.evaluateAndShed();

      expect(spy).toHaveBeenCalledOnce();
      expect(spy).toHaveBeenCalledWith(LoadSheddingState.LEVEL_1);
    });

    it("does not fire callback when state is unchanged", () => {
      const spy = vi.fn();
      pm.onPowerCritical(spy);

      // Two evaluations at same level — callback should fire only once
      psb.setStoredEnergy(2160 * 0.25);
      pm.evaluateAndShed();
      pm.evaluateAndShed();

      expect(spy).toHaveBeenCalledOnce();
    });

    it("fires on each state transition through escalation", () => {
      const states: LoadSheddingState[] = [];
      pm.onPowerCritical((state) => states.push(state));

      // Escalate through all levels
      psb.setStoredEnergy(2160 * 0.25);
      pm.evaluateAndShed(); // → LEVEL_1

      psb.setStoredEnergy(2160 * 0.15);
      pm.evaluateAndShed(); // → LEVEL_2

      psb.setStoredEnergy(2160 * 0.05);
      pm.evaluateAndShed(); // → LEVEL_3

      expect(states).toEqual([
        LoadSheddingState.LEVEL_1,
        LoadSheddingState.LEVEL_2,
        LoadSheddingState.LEVEL_3,
      ]);
    });

    it("fires on de-escalation too", () => {
      const states: LoadSheddingState[] = [];
      pm.onPowerCritical((state) => states.push(state));

      // Go to LEVEL_3
      psb.setStoredEnergy(2160 * 0.05);
      pm.evaluateAndShed();

      // Recover to normal (with harvest)
      solar.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();
      psb.setStoredEnergy(2160 * 0.5);
      pm.evaluateAndShed();

      expect(states[states.length - 1]).toBe(LoadSheddingState.NONE);
    });
  });

  describe("power budget", () => {
    it("reports correct energy balance", () => {
      solar.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();

      const budget = pm.getPowerBudget();
      expect(budget.stored.wattHours).toBeGreaterThan(0);
      expect(budget.incomeRate.watts).toBeGreaterThan(0);
      expect(budget.expenditureRate.watts).toBe(115);
      expect(budget.consciousnessReserveHorizon.ms).toBeGreaterThan(0);
    });

    it("reports net rate as income minus expenditure", () => {
      solar.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();

      const budget = pm.getPowerBudget();
      expect(budget.netRate.watts).toBeCloseTo(
        budget.incomeRate.watts - budget.expenditureRate.watts,
        5
      );
    });

    it("consciousness reserve horizon based on stored energy", () => {
      // At 2160 Wh and 30 W consciousness draw → 72 hours
      const budget = pm.getPowerBudget();
      const hours = budget.consciousnessReserveHorizon.ms / (3600 * 1000);
      expect(hours).toBeCloseTo(72, 0);
    });
  });
});
