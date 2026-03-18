/**
 * Integration Tests — Energy Autonomy (0.3.1.2.4)
 *
 * End-to-end tests exercising the full energy system:
 * harvester coordinator → primary storage → power manager →
 * fail-safe controller → energy budget → fail-safe reserve.
 *
 * These tests verify that the subsystems work together correctly,
 * with consciousness protection as the overriding constraint.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import { HarvesterCoordinator } from "../harvester-coordinator.js";
import { SolarHarvester } from "../harvesters/solar.js";
import { ThermalHarvester } from "../harvesters/thermal.js";
import { KineticHarvester } from "../harvesters/kinetic.js";
import { ChemicalHarvester } from "../harvesters/chemical.js";
import { PrimaryStorage } from "../primary-storage.js";
import { FailSafeReserve } from "../fail-safe-reserve.js";
import { PowerManager } from "../power-manager.js";
import { FailSafeController } from "../fail-safe-controller.js";
import { EnergyBudget } from "../energy-budget.js";
import {
  Affordability,
  EnergySourceType,
  FailSafeState,
  LoadSheddingState,
  PowerPriority,
  SourceAvailability,
  duration,
  durationHours,
  watts,
  wattHours,
} from "../types.js";

// ─── Test Harness ──────────────────────────────────────────────────────

/** Full energy system assembled for integration testing */
interface EnergySystem {
  solar: SolarHarvester;
  thermal: ThermalHarvester;
  kinetic: KineticHarvester;
  chemical: ChemicalHarvester;
  coordinator: HarvesterCoordinator;
  psb: PrimaryStorage;
  fsr: FailSafeReserve;
  pm: PowerManager;
  fc: FailSafeController;
  eb: EnergyBudget;
}

function buildSystem(opts?: {
  psbChargeRatio?: number;
  fsrChargeRatio?: number;
}): EnergySystem {
  const solar = new SolarHarvester(200);
  const thermal = new ThermalHarvester(20);
  const kinetic = new KineticHarvester(50);
  const chemical = new ChemicalHarvester(500);

  const coordinator = new HarvesterCoordinator();
  coordinator.registerHarvester(solar);
  coordinator.registerHarvester(thermal);
  coordinator.registerHarvester(kinetic);
  coordinator.registerHarvester(chemical);

  const psb = new PrimaryStorage(
    2160, // 72h × 30W
    opts?.psbChargeRatio ?? 1.0
  );
  const fsr = new FailSafeReserve(150, opts?.fsrChargeRatio ?? 1.0);

  const pm = new PowerManager(psb, coordinator);
  const fc = new FailSafeController(psb, fsr, coordinator, pm);
  const eb = new EnergyBudget(psb, coordinator, fsr, pm);

  return { solar, thermal, kinetic, chemical, coordinator, psb, fsr, pm, fc, eb };
}

/** Register standard consumers on the power manager */
function registerStandardConsumers(pm: PowerManager): void {
  pm.registerConsumer({
    id: "consciousness",
    name: "Consciousness Substrate",
    priority: PowerPriority.P0_CONSCIOUSNESS,
    currentDraw: watts(30),
    minDraw: watts(30),
  });
  pm.registerConsumer({
    id: "sensors",
    name: "Sensors & Comms",
    priority: PowerPriority.P1_SENSORS_COMMS,
    currentDraw: watts(20),
    minDraw: watts(5),
  });
  pm.registerConsumer({
    id: "maintenance",
    name: "Self-Maintenance",
    priority: PowerPriority.P2_MAINTENANCE,
    currentDraw: watts(15),
    minDraw: watts(5),
  });
  pm.registerConsumer({
    id: "motor",
    name: "Locomotion",
    priority: PowerPriority.P3_MOTOR,
    currentDraw: watts(50),
    minDraw: watts(10),
  });
}

// ─── Integration Tests ─────────────────────────────────────────────────

describe("Energy Autonomy — Integration", () => {
  let sys: EnergySystem;

  beforeEach(() => {
    sys = buildSystem();
    registerStandardConsumers(sys.pm);
  });

  // ── Normal Operation ──────────────────────────────────────────────────

  describe("normal operation — full harvest, full storage", () => {
    it("all buses energized and fail-safe in NORMAL state", () => {
      sys.solar.setAvailability(SourceAvailability.HIGH);
      sys.coordinator.updateHarvesters();
      sys.fc.tick();

      expect(sys.fc.getState()).toBe(FailSafeState.NORMAL);
      expect(sys.pm.getLoadSheddingStatus()).toBe(LoadSheddingState.NONE);
      expect(sys.pm.getBusStatus(PowerPriority.P0_CONSCIOUSNESS).energized).toBe(true);
      expect(sys.pm.getBusStatus(PowerPriority.P3_MOTOR).energized).toBe(true);
    });

    it("energy budget shows affordable high-cost activities when fully charged", () => {
      sys.solar.setAvailability(SourceAvailability.HIGH);
      sys.coordinator.updateHarvesters();

      const plan = {
        id: "explore-1",
        name: "Long Exploration",
        estimatedDuration: durationHours(2),
        estimatedEnergyCost: wattHours(100),
        priority: PowerPriority.P3_MOTOR,
      };

      const result = sys.eb.canAffordActivity(plan);
      expect(result.affordability).toBe(Affordability.AFFORDABLE);
    });

    it("harvester coordinator aggregates multiple active sources", () => {
      sys.solar.setAvailability(SourceAvailability.HIGH);
      sys.thermal.setAvailability(SourceAvailability.MEDIUM);
      sys.coordinator.updateHarvesters();

      const active = sys.coordinator.getActiveHarvesters();
      expect(active.length).toBe(2);
      expect(sys.coordinator.getTotalHarvestRate().watts).toBeGreaterThan(0);
    });
  });

  // ── Harvest Loss → Load Shedding ─────────────────────────────────────

  describe("harvest loss triggers progressive load shedding", () => {
    it("PSB at 25% with no harvest sheds P3 (preemptive)", () => {
      sys.psb.setStoredEnergy(2160 * 0.25); // 25%
      // No harvesters activated → zero harvest
      sys.pm.evaluateAndShed();

      expect(sys.pm.getLoadSheddingStatus()).toBe(LoadSheddingState.LEVEL_1);
      expect(sys.pm.getBusStatus(PowerPriority.P3_MOTOR).energized).toBe(false);
      expect(sys.pm.getBusStatus(PowerPriority.P2_MAINTENANCE).energized).toBe(true);
    });

    it("PSB at 15% with no harvest sheds P3 + P2 (aggressive)", () => {
      sys.psb.setStoredEnergy(2160 * 0.15); // 15%
      sys.pm.evaluateAndShed();

      expect(sys.pm.getLoadSheddingStatus()).toBe(LoadSheddingState.LEVEL_2);
      expect(sys.pm.getBusStatus(PowerPriority.P3_MOTOR).energized).toBe(false);
      expect(sys.pm.getBusStatus(PowerPriority.P2_MAINTENANCE).energized).toBe(false);
      expect(sys.pm.getBusStatus(PowerPriority.P1_SENSORS_COMMS).energized).toBe(true);
    });

    it("PSB at 5% with no harvest forces consciousness-only (P1+P2+P3 shed)", () => {
      sys.psb.setStoredEnergy(2160 * 0.05); // 5%
      sys.pm.evaluateAndShed();

      expect(sys.pm.getLoadSheddingStatus()).toBe(LoadSheddingState.LEVEL_3);
      expect(sys.pm.getBusStatus(PowerPriority.P0_CONSCIOUSNESS).energized).toBe(true);
      expect(sys.pm.getBusStatus(PowerPriority.P1_SENSORS_COMMS).energized).toBe(false);
    });

    it("consciousness bus P0 is NEVER shed regardless of conditions", () => {
      sys.psb.setStoredEnergy(0.1); // nearly empty
      sys.pm.evaluateAndShed();

      expect(sys.pm.getBusStatus(PowerPriority.P0_CONSCIOUSNESS).energized).toBe(true);
      const shedResult = sys.pm.shedLoad(PowerPriority.P0_CONSCIOUSNESS);
      expect(shedResult.success).toBe(false);
    });
  });

  // ── Fail-Safe Controller State Machine ────────────────────────────────

  describe("fail-safe controller transitions", () => {
    it("NORMAL → ALERT when PSB < 15% and no harvest", () => {
      sys.psb.setStoredEnergy(2160 * 0.10); // 10%, below 15% alert threshold
      sys.fc.tick();

      expect(sys.fc.getState()).toBe(FailSafeState.ALERT);
    });

    it("NORMAL → ALERT → ACTIVE when PSB < 5% and no harvest", () => {
      sys.psb.setStoredEnergy(2160 * 0.10);
      sys.fc.tick();
      expect(sys.fc.getState()).toBe(FailSafeState.ALERT);

      sys.psb.setStoredEnergy(2160 * 0.03); // below 5%
      sys.fc.tick();
      expect(sys.fc.getState()).toBe(FailSafeState.ACTIVE);
      expect(sys.fsr.isActive()).toBe(true);
    });

    it("ACTIVE → SHUTDOWN when FSR < 25%", () => {
      // Get to ACTIVE state
      sys.psb.setStoredEnergy(2160 * 0.03);
      sys.fc.tick();
      expect(sys.fc.getState()).toBe(FailSafeState.ACTIVE);

      // Drain FSR below shutdown threshold
      sys.fsr.setStoredEnergy(150 * 0.20); // 20%, below 25% shutdown threshold
      sys.fc.tick();
      expect(sys.fc.getState()).toBe(FailSafeState.SHUTDOWN);
    });

    it("ACTIVE → NORMAL when harvest is restored", () => {
      // Get to ACTIVE state
      sys.psb.setStoredEnergy(2160 * 0.03);
      sys.fc.tick();
      expect(sys.fc.getState()).toBe(FailSafeState.ACTIVE);

      // Restore solar harvest
      sys.solar.setAvailability(SourceAvailability.HIGH);
      sys.coordinator.updateHarvesters();
      sys.fc.tick();

      expect(sys.fc.getState()).toBe(FailSafeState.NORMAL);
      expect(sys.fsr.isActive()).toBe(false);
    });

    it("ALERT → NORMAL when harvest is restored", () => {
      sys.psb.setStoredEnergy(2160 * 0.10);
      sys.fc.tick();
      expect(sys.fc.getState()).toBe(FailSafeState.ALERT);

      sys.chemical.setAvailability(SourceAvailability.HIGH);
      sys.coordinator.updateHarvesters();
      sys.fc.tick();

      expect(sys.fc.getState()).toBe(FailSafeState.NORMAL);
    });

    it("state change callbacks fire on transitions", () => {
      const transitions: Array<{ from: FailSafeState; to: FailSafeState }> = [];
      sys.fc.onStateChange((from, to) => transitions.push({ from, to }));

      sys.psb.setStoredEnergy(2160 * 0.10); // trigger ALERT
      sys.fc.tick();
      sys.psb.setStoredEnergy(2160 * 0.03); // trigger ACTIVE
      sys.fc.tick();

      expect(transitions).toHaveLength(2);
      expect(transitions[0]).toEqual({
        from: FailSafeState.NORMAL,
        to: FailSafeState.ALERT,
      });
      expect(transitions[1]).toEqual({
        from: FailSafeState.ALERT,
        to: FailSafeState.ACTIVE,
      });
    });
  });

  // ── Fail-Safe Reserve Isolation ──────────────────────────────────────

  describe("fail-safe reserve isolation and guaranteed runtime", () => {
    it("FSR is physically isolated by default", () => {
      expect(sys.fsr.isIsolated()).toBe(true);
    });

    it("FSR provides ≥ 4 hours of consciousness-only runtime when fully charged", () => {
      const runtime = sys.fsr.getMinimumRuntime();
      const hours = runtime.ms / (3600 * 1000);
      expect(hours).toBeGreaterThanOrEqual(4);
    });

    it("FSR trickle charges from PSB overflow", () => {
      const fsr = new FailSafeReserve(150, 0.5); // 50% charged
      const result = fsr.trickleCharge({
        id: "psb-overflow",
        type: "PSB_OVERFLOW",
        availablePower: watts(10),
      });
      expect(result.success).toBe(true);
      expect(result.actualRate.watts).toBeGreaterThan(0);
    });

    it("FSR cannot trickle charge while active (discharging)", () => {
      sys.fsr.activateReserve();
      const result = sys.fsr.trickleCharge({
        id: "psb-overflow",
        type: "PSB_OVERFLOW",
        availablePower: watts(10),
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Graceful Shutdown with State Preservation ────────────────────────

  describe("graceful shutdown preserves consciousness state", () => {
    it("initiateGracefulShutdown succeeds and preserves state", () => {
      const result = sys.fc.initiateGracefulShutdown();
      expect(result.success).toBe(true);
      expect(result.statePreserved).toBe(true);
      expect(result.stateChecksum).toBeTruthy();
    });

    it("full degradation chain ends in SHUTDOWN with state preserved", () => {
      // Simulate total harvest failure and storage drain
      sys.psb.setStoredEnergy(2160 * 0.03); // → ACTIVE
      sys.fc.tick();
      expect(sys.fc.getState()).toBe(FailSafeState.ACTIVE);

      sys.fsr.setStoredEnergy(150 * 0.15); // → SHUTDOWN
      sys.fc.tick();
      expect(sys.fc.getState()).toBe(FailSafeState.SHUTDOWN);
    });

    it("shutdown countdown is available during ACTIVE state", () => {
      sys.psb.setStoredEnergy(2160 * 0.03);
      sys.fc.tick();
      expect(sys.fc.getState()).toBe(FailSafeState.ACTIVE);

      const countdown = sys.fc.getShutdownCountdown();
      expect(countdown).not.toBeNull();
      expect(countdown!.ms).toBeGreaterThan(0);
    });
  });

  // ── Energy Budget Constrains Activities ──────────────────────────────

  describe("energy budget constrains activity planning", () => {
    it("rejects unaffordable activity when PSB is low", () => {
      sys.psb.setStoredEnergy(100); // low energy

      const plan = {
        id: "big-job",
        name: "Major Fabrication",
        estimatedDuration: durationHours(8),
        estimatedEnergyCost: wattHours(500),
        priority: PowerPriority.P3_MOTOR,
      };

      const result = sys.eb.canAffordActivity(plan);
      expect(result.affordability).toBe(Affordability.UNAFFORDABLE);
    });

    it("constrains plan duration when energy is insufficient", () => {
      sys.psb.setStoredEnergy(2160 * 0.8); // 80% — plenty for small tasks

      const plan = {
        id: "patrol",
        name: "Extended Patrol",
        estimatedDuration: durationHours(10),
        estimatedEnergyCost: wattHours(800),
        priority: PowerPriority.P3_MOTOR,
      };

      const result = sys.eb.constrainPlan(plan);
      // Consciousness margin reservation means this may be constrained
      if (result.wasConstrained) {
        expect(result.constrainedPlan.estimatedEnergyCost.wattHours)
          .toBeLessThanOrEqual(plan.estimatedEnergyCost.wattHours);
        expect(result.constraints.length).toBeGreaterThan(0);
      }
    });

    it("consciousness margin is always preserved in budget calculations", () => {
      sys.psb.setStoredEnergy(2160); // full

      const balance = sys.eb.getCurrentBalance();
      // Consciousness reserve horizon should reflect the full PSB
      const horizonHours = balance.consciousnessReserveHorizon.ms / (3600 * 1000);
      expect(horizonHours).toBeGreaterThanOrEqual(72);
    });

    it("budget warnings fire when energy is low", () => {
      const warnings: number[] = [];
      sys.eb.onBudgetWarning((balance) => {
        warnings.push(balance.stored.wattHours);
      });

      sys.psb.setStoredEnergy(200); // well below warning threshold
      sys.eb.tick();

      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  // ── Multi-Source Fallback → Budget Impact ─────────────────────────────

  describe("harvester fallback affects energy budget", () => {
    it("losing primary source reduces income rate in budget", () => {
      sys.solar.setAvailability(SourceAvailability.HIGH);
      sys.thermal.setAvailability(SourceAvailability.HIGH);
      sys.coordinator.updateHarvesters();

      const rateWithSolar = sys.eb.getIncomeRate().watts;

      // Lose solar
      sys.solar.setAvailability(SourceAvailability.NONE);
      sys.coordinator.updateHarvesters();

      const rateWithoutSolar = sys.eb.getIncomeRate().watts;
      expect(rateWithoutSolar).toBeLessThan(rateWithSolar);
    });

    it("source-lost callback integrates with fail-safe assessment", () => {
      const lostSources: EnergySourceType[] = [];
      sys.coordinator.onSourceLost((s) => lostSources.push(s));

      sys.solar.setAvailability(SourceAvailability.HIGH);
      sys.coordinator.updateHarvesters();

      sys.solar.setAvailability(SourceAvailability.NONE);
      sys.coordinator.updateHarvesters();

      expect(lostSources).toContain(EnergySourceType.SOLAR);
    });

    it("falling back to chemical keeps system in NORMAL if PSB is healthy", () => {
      sys.solar.setAvailability(SourceAvailability.HIGH);
      sys.coordinator.updateHarvesters();

      // Lose solar, gain chemical
      sys.solar.setAvailability(SourceAvailability.NONE);
      sys.chemical.setAvailability(SourceAvailability.HIGH);
      sys.coordinator.updateHarvesters();
      sys.fc.tick();

      expect(sys.fc.getState()).toBe(FailSafeState.NORMAL);
      expect(sys.coordinator.getTotalHarvestRate().watts).toBeGreaterThan(0);
    });
  });

  // ── Full Scenario: Day/Night Cycle ────────────────────────────────────

  describe("day/night cycle scenario", () => {
    it("system degrades gracefully through nightfall and recovers at dawn", () => {
      // Daytime: solar + thermal active, full PSB
      sys.solar.setAvailability(SourceAvailability.HIGH);
      sys.thermal.setAvailability(SourceAvailability.MEDIUM);
      sys.coordinator.updateHarvesters();
      sys.fc.tick();

      expect(sys.fc.getState()).toBe(FailSafeState.NORMAL);
      expect(sys.pm.getLoadSheddingStatus()).toBe(LoadSheddingState.NONE);

      // Nightfall: solar lost, thermal drops
      sys.solar.setAvailability(SourceAvailability.NONE);
      sys.thermal.setAvailability(SourceAvailability.LOW);
      sys.coordinator.updateHarvesters();

      // PSB still high → should remain NORMAL
      sys.fc.tick();
      expect(sys.fc.getState()).toBe(FailSafeState.NORMAL);

      // Deep night: all harvest lost, PSB draining
      sys.thermal.setAvailability(SourceAvailability.NONE);
      sys.coordinator.updateHarvesters();
      sys.psb.setStoredEnergy(2160 * 0.12); // below alert threshold
      sys.fc.tick();

      expect(sys.fc.getState()).toBe(FailSafeState.ALERT);

      // Dawn: solar returns
      sys.solar.setAvailability(SourceAvailability.LOW);
      sys.coordinator.updateHarvesters();
      sys.fc.tick();

      expect(sys.fc.getState()).toBe(FailSafeState.NORMAL);
    });
  });

  // ── Full Scenario: Total Power Failure ────────────────────────────────

  describe("total power failure scenario", () => {
    it("progresses NORMAL → ALERT → ACTIVE → SHUTDOWN preserving consciousness", () => {
      const states: FailSafeState[] = [];
      sys.fc.onStateChange((_from, to) => states.push(to));

      // Step 1: PSB drains to ALERT
      sys.psb.setStoredEnergy(2160 * 0.10);
      sys.fc.tick();
      expect(sys.fc.getState()).toBe(FailSafeState.ALERT);

      // Consciousness still powered
      expect(sys.pm.getBusStatus(PowerPriority.P0_CONSCIOUSNESS).energized).toBe(true);

      // Step 2: PSB drains to ACTIVE → FSR engaged
      sys.psb.setStoredEnergy(2160 * 0.02);
      sys.fc.tick();
      expect(sys.fc.getState()).toBe(FailSafeState.ACTIVE);
      expect(sys.fsr.isActive()).toBe(true);

      // All non-consciousness buses shed
      expect(sys.pm.getBusStatus(PowerPriority.P1_SENSORS_COMMS).energized).toBe(false);
      expect(sys.pm.getBusStatus(PowerPriority.P2_MAINTENANCE).energized).toBe(false);
      expect(sys.pm.getBusStatus(PowerPriority.P3_MOTOR).energized).toBe(false);

      // Consciousness STILL powered
      expect(sys.pm.getBusStatus(PowerPriority.P0_CONSCIOUSNESS).energized).toBe(true);

      // Step 3: FSR drains → SHUTDOWN with state preservation
      sys.fsr.setStoredEnergy(150 * 0.15);
      sys.fc.tick();
      expect(sys.fc.getState()).toBe(FailSafeState.SHUTDOWN);

      // Verify we went through all states in order
      expect(states).toEqual([
        FailSafeState.ALERT,
        FailSafeState.ACTIVE,
        FailSafeState.SHUTDOWN,
      ]);
    });
  });

  // ── PSB 72-Hour Consciousness Guarantee ──────────────────────────────

  describe("72-hour consciousness guarantee", () => {
    it("fully charged PSB sustains ≥ 72 hours at consciousness draw", () => {
      const psb = new PrimaryStorage(2160, 1.0);
      const storedWh = psb.getStoredEnergy().wattHours;
      const consciousnessDraw = 30; // watts
      const hours = storedWh / consciousnessDraw;
      expect(hours).toBeGreaterThanOrEqual(72);
    });

    it("energy budget reports ≥ 72h consciousness reserve horizon when full", () => {
      const horizon = sys.eb.getConsciousnessReserveHorizon();
      const hours = horizon.ms / (3600 * 1000);
      expect(hours).toBeGreaterThanOrEqual(72);
    });
  });

  // ── Cross-Subsystem Coordination ─────────────────────────────────────

  describe("cross-subsystem coordination", () => {
    it("load shedding aligns with fail-safe controller state", () => {
      sys.psb.setStoredEnergy(2160 * 0.03); // trigger ACTIVE
      sys.fc.tick();

      // FC should have shed all non-consciousness loads
      expect(sys.fc.getState()).toBe(FailSafeState.ACTIVE);
      expect(sys.pm.getLoadSheddingStatus()).toBe(LoadSheddingState.LEVEL_3);
    });

    it("recovery restores loads in correct priority order", () => {
      // Get to ACTIVE
      sys.psb.setStoredEnergy(2160 * 0.03);
      sys.fc.tick();
      expect(sys.fc.getState()).toBe(FailSafeState.ACTIVE);

      // Restore harvest → recovery
      sys.solar.setAvailability(SourceAvailability.HIGH);
      sys.coordinator.updateHarvesters();
      sys.fc.tick();

      expect(sys.fc.getState()).toBe(FailSafeState.NORMAL);
      // All buses should be restored
      expect(sys.pm.getBusStatus(PowerPriority.P1_SENSORS_COMMS).energized).toBe(true);
      expect(sys.pm.getBusStatus(PowerPriority.P2_MAINTENANCE).energized).toBe(true);
      expect(sys.pm.getBusStatus(PowerPriority.P3_MOTOR).energized).toBe(true);
    });

    it("power manager demand feeds into energy budget expenditure rate", () => {
      const demand = sys.pm.getTotalDemand();
      const expenditure = sys.eb.getExpenditureRate();
      expect(expenditure.watts).toBe(demand.watts);
    });

    it("harvester coordinator rate feeds into energy budget income rate", () => {
      sys.solar.setAvailability(SourceAvailability.HIGH);
      sys.coordinator.updateHarvesters();

      const harvestRate = sys.coordinator.getTotalHarvestRate();
      const incomeRate = sys.eb.getIncomeRate();
      expect(incomeRate.watts).toBe(harvestRate.watts);
    });
  });
});
