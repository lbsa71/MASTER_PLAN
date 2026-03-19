/**
 * Tests for Fail-Safe Controller and Fail-Safe Reserve (0.3.1.2.4)
 *
 * Verifies:
 * - FSR physical isolation and integrity monitoring
 * - FSR activation/deactivation lifecycle
 * - FSR trickle charging constraints
 * - FSR discharge for consciousness support
 * - FC state machine: NORMAL → ALERT → ACTIVE → SHUTDOWN
 * - FC automatic transitions via tick()
 * - FC recovery when harvest is restored
 * - FC graceful shutdown with state preservation
 * - FC state-change callbacks
 * - Guaranteed minimum 4-hour consciousness runtime from FSR
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { FailSafeReserve } from "../fail-safe-reserve.js";
import { FailSafeController } from "../fail-safe-controller.js";
import { PrimaryStorage } from "../primary-storage.js";
import { HarvesterCoordinator } from "../harvester-coordinator.js";
import { SolarHarvester } from "../harvesters/solar.js";
import { PowerManager } from "../power-manager.js";
import {
  FailSafeState,
  LoadSheddingState,
  PowerConsumer,
  PowerPriority,
  ReserveIntegrity,
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

// ═══════════════════════════════════════════════════════════════════════
// Fail-Safe Reserve (FSR)
// ═══════════════════════════════════════════════════════════════════════

describe("FailSafeReserve", () => {
  let fsr: FailSafeReserve;

  beforeEach(() => {
    // Default: 150 Wh capacity, fully charged
    fsr = new FailSafeReserve();
  });

  describe("minimum runtime guarantee", () => {
    it("provides >= 4 hours runtime at full charge", () => {
      const runtimeMs = fsr.getMinimumRuntime().ms;
      const runtimeHours = runtimeMs / (3600 * 1000);
      // 150 Wh / 30 W = 5 hours (exceeds 4-hour minimum)
      expect(runtimeHours).toBeGreaterThanOrEqual(4);
    });

    it("runtime decreases as energy is consumed", () => {
      fsr.setStoredEnergy(60); // 60 Wh / 30 W = 2 hours
      const runtimeHours = fsr.getMinimumRuntime().ms / (3600 * 1000);
      expect(runtimeHours).toBeCloseTo(2, 1);
    });
  });

  describe("activation", () => {
    it("activates successfully when charged and healthy", () => {
      const result = fsr.activateReserve();
      expect(result.success).toBe(true);
      expect(result.transitionTime.ms).toBeGreaterThan(0);
      expect(fsr.isActive()).toBe(true);
    });

    it("refuses activation when already active", () => {
      fsr.activateReserve();
      const result = fsr.activateReserve();
      expect(result.success).toBe(false);
      expect(result.error).toContain("already active");
    });

    it("refuses activation when integrity is FAILED", () => {
      fsr.setIntegrity(ReserveIntegrity.FAILED);
      const result = fsr.activateReserve();
      expect(result.success).toBe(false);
      expect(result.error).toContain("FAILED");
    });

    it("refuses activation when reserve is depleted", () => {
      fsr.setStoredEnergy(0);
      const result = fsr.activateReserve();
      expect(result.success).toBe(false);
      expect(result.error).toContain("depleted");
    });
  });

  describe("deactivation", () => {
    it("deactivates successfully when active", () => {
      fsr.activateReserve();
      const result = fsr.deactivateReserve();
      expect(result.success).toBe(true);
      expect(result.transitionTime.ms).toBeGreaterThan(0);
      expect(fsr.isActive()).toBe(false);
    });

    it("refuses deactivation when not active", () => {
      const result = fsr.deactivateReserve();
      expect(result.success).toBe(false);
      expect(result.error).toContain("not active");
    });
  });

  describe("trickle charging", () => {
    it("accepts trickle charge from a power source", () => {
      fsr.setStoredEnergy(100); // leave headroom
      const source = {
        id: "psb-overflow",
        type: "PSB_OVERFLOW" as const,
        availablePower: watts(10),
      };
      const result = fsr.trickleCharge(source);
      expect(result.success).toBe(true);
      expect(result.actualRate.watts).toBeGreaterThan(0);
      expect(result.actualRate.watts).toBeLessThanOrEqual(15); // max trickle rate
    });

    it("clamps charge rate to maximum trickle rate", () => {
      fsr.setStoredEnergy(50); // plenty of headroom
      const source = {
        id: "harvester-direct",
        type: "DIRECT_HARVESTER" as const,
        availablePower: watts(100), // way more than trickle limit
      };
      const result = fsr.trickleCharge(source);
      expect(result.success).toBe(true);
      expect(result.actualRate.watts).toBeLessThanOrEqual(15);
    });

    it("refuses charge when integrity is FAILED", () => {
      fsr.setIntegrity(ReserveIntegrity.FAILED);
      const source = {
        id: "src",
        type: "PSB_OVERFLOW" as const,
        availablePower: watts(10),
      };
      const result = fsr.trickleCharge(source);
      expect(result.success).toBe(false);
      expect(result.error).toContain("FAILED");
    });

    it("refuses charge while reserve is active (discharging)", () => {
      fsr.activateReserve();
      const source = {
        id: "src",
        type: "PSB_OVERFLOW" as const,
        availablePower: watts(10),
      };
      const result = fsr.trickleCharge(source);
      expect(result.success).toBe(false);
      expect(result.error).toContain("active");
    });

    it("refuses charge when fully charged", () => {
      // Default is fully charged at 150 Wh
      const source = {
        id: "src",
        type: "PSB_OVERFLOW" as const,
        availablePower: watts(10),
      };
      const result = fsr.trickleCharge(source);
      expect(result.success).toBe(false);
      expect(result.error).toContain("fully charged");
    });

    it("refuses charge when source has no power", () => {
      fsr.setStoredEnergy(100);
      const source = {
        id: "src",
        type: "PSB_OVERFLOW" as const,
        availablePower: watts(0),
      };
      const result = fsr.trickleCharge(source);
      expect(result.success).toBe(false);
    });
  });

  describe("discharge for consciousness", () => {
    it("returns zero when not active", () => {
      const result = fsr.dischargeForConsciousness();
      expect(result.actualWatts).toBe(0);
      expect(result.depleted).toBe(false);
    });

    it("discharges at consciousness draw rate when active", () => {
      fsr.activateReserve();
      const result = fsr.dischargeForConsciousness();
      expect(result.actualWatts).toBe(30); // consciousness draw
      expect(result.depleted).toBe(false);
    });

    it("reports depleted when energy runs out", () => {
      fsr.setStoredEnergy(0.001); // almost empty
      fsr.activateReserve();

      // Discharge until depleted
      let depleted = false;
      for (let i = 0; i < 1000 && !depleted; i++) {
        const result = fsr.dischargeForConsciousness();
        depleted = result.depleted;
      }
      expect(depleted).toBe(true);
    });
  });

  describe("integrity and isolation", () => {
    it("FAILED integrity breaks isolation", () => {
      fsr.setIntegrity(ReserveIntegrity.FAILED);
      expect(fsr.isIsolated()).toBe(false);
    });

    it("DEGRADED integrity preserves isolation", () => {
      fsr.setIntegrity(ReserveIntegrity.DEGRADED);
      expect(fsr.isIsolated()).toBe(true);
    });

    it("COMPROMISED integrity preserves isolation", () => {
      fsr.setIntegrity(ReserveIntegrity.COMPROMISED);
      expect(fsr.isIsolated()).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Fail-Safe Controller (FC)
// ═══════════════════════════════════════════════════════════════════════

describe("FailSafeController", () => {
  let psb: PrimaryStorage;
  let fsr: FailSafeReserve;
  let coordinator: HarvesterCoordinator;
  let solar: SolarHarvester;
  let pm: PowerManager;
  let fc: FailSafeController;

  beforeEach(() => {
    // PSB: 2160 Wh capacity, fully charged
    psb = new PrimaryStorage(2160, 1.0);
    // FSR: 150 Wh capacity, fully charged
    fsr = new FailSafeReserve(150, 1.0);
    // Coordinator with solar harvester
    coordinator = new HarvesterCoordinator();
    solar = new SolarHarvester(200);
    coordinator.registerHarvester(solar);

    // Power manager with one consciousness consumer
    pm = new PowerManager(psb, coordinator);
    pm.registerConsumer(
      consumer("c0", "Consciousness", PowerPriority.P0_CONSCIOUSNESS, 30)
    );
    pm.registerConsumer(
      consumer("s1", "Sensors", PowerPriority.P1_SENSORS_COMMS, 20)
    );
    pm.registerConsumer(
      consumer("m2", "Maintenance", PowerPriority.P2_MAINTENANCE, 15)
    );
    pm.registerConsumer(
      consumer("mo3", "Motor", PowerPriority.P3_MOTOR, 50)
    );

    fc = new FailSafeController(psb, fsr, coordinator, pm);
  });

  describe("initial state", () => {
    it("starts in NORMAL state", () => {
      expect(fc.getState()).toBe(FailSafeState.NORMAL);
    });

    it("shutdown countdown is null in NORMAL state", () => {
      expect(fc.getShutdownCountdown()).toBeNull();
    });
  });

  describe("condition evaluation", () => {
    it("recommends NORMAL when PSB is healthy and harvest active", () => {
      solar.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();

      const assessment = fc.evaluateCondition();
      expect(assessment.currentState).toBe(FailSafeState.NORMAL);
      expect(assessment.recommendedState).toBe(FailSafeState.NORMAL);
      expect(assessment.harvestActive).toBe(true);
      expect(assessment.psbPercentage).toBeCloseTo(1.0, 1);
    });

    it("recommends ALERT when PSB < 15% and no harvest", () => {
      psb.setStoredEnergy(2160 * 0.10); // 10% — below 15%
      const assessment = fc.evaluateCondition();
      expect(assessment.recommendedState).toBe(FailSafeState.ALERT);
    });

    it("recommends ACTIVE when PSB < 5% and no harvest", () => {
      psb.setStoredEnergy(2160 * 0.03); // 3% — below 5%
      const assessment = fc.evaluateCondition();
      expect(assessment.recommendedState).toBe(FailSafeState.ACTIVE);
    });

    it("estimates remaining runtime from PSB + FSR", () => {
      const assessment = fc.evaluateCondition();
      const runtimeMs = assessment.estimatedRemainingRuntime.ms;
      // PSB = 2160 Wh, FSR = 150 Wh, total = 2310 Wh @ 30 W = 77 hours
      const runtimeHours = runtimeMs / (3600 * 1000);
      expect(runtimeHours).toBeCloseTo(77, 0);
    });
  });

  describe("state machine transitions via tick()", () => {
    it("transitions NORMAL → ALERT when PSB drops below 15% with no harvest", () => {
      psb.setStoredEnergy(2160 * 0.10);
      fc.tick();
      expect(fc.getState()).toBe(FailSafeState.ALERT);
    });

    it("ALERT sheds P3 motor loads preemptively", () => {
      psb.setStoredEnergy(2160 * 0.10);
      fc.tick();
      expect(pm.getBusStatus(PowerPriority.P3_MOTOR).energized).toBe(false);
    });

    it("transitions ALERT → ACTIVE when PSB drops below 5%", () => {
      // First go to ALERT
      psb.setStoredEnergy(2160 * 0.10);
      fc.tick();
      expect(fc.getState()).toBe(FailSafeState.ALERT);

      // Then drop further
      psb.setStoredEnergy(2160 * 0.03);
      fc.tick();
      expect(fc.getState()).toBe(FailSafeState.ACTIVE);
    });

    it("ACTIVE engages FSR and sheds all non-consciousness loads", () => {
      psb.setStoredEnergy(2160 * 0.03);
      fc.tick();

      expect(fsr.isActive()).toBe(true);
      expect(pm.getBusStatus(PowerPriority.P1_SENSORS_COMMS).energized).toBe(false);
      expect(pm.getBusStatus(PowerPriority.P2_MAINTENANCE).energized).toBe(false);
      expect(pm.getBusStatus(PowerPriority.P3_MOTOR).energized).toBe(false);
      expect(pm.getBusStatus(PowerPriority.P0_CONSCIOUSNESS).energized).toBe(true);
    });

    it("transitions ACTIVE → SHUTDOWN when FSR below 25%", () => {
      // Go to ACTIVE first
      psb.setStoredEnergy(2160 * 0.03);
      fc.tick();
      expect(fc.getState()).toBe(FailSafeState.ACTIVE);

      // Drain FSR below shutdown threshold (25% of 150 Wh = 37.5 Wh)
      fsr.setStoredEnergy(30); // 20% — below 25%
      fc.tick();
      expect(fc.getState()).toBe(FailSafeState.SHUTDOWN);
    });

    it("transitions directly NORMAL → ACTIVE when PSB critically low", () => {
      psb.setStoredEnergy(2160 * 0.03); // 3%, below both thresholds
      fc.tick();
      expect(fc.getState()).toBe(FailSafeState.ACTIVE);
    });
  });

  describe("recovery", () => {
    it("recovers from ALERT → NORMAL when harvest restores", () => {
      psb.setStoredEnergy(2160 * 0.10);
      fc.tick();
      expect(fc.getState()).toBe(FailSafeState.ALERT);

      // Harvest restores
      solar.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();
      fc.tick();
      expect(fc.getState()).toBe(FailSafeState.NORMAL);
    });

    it("recovers from ACTIVE → NORMAL when harvest restores", () => {
      psb.setStoredEnergy(2160 * 0.03);
      fc.tick();
      expect(fc.getState()).toBe(FailSafeState.ACTIVE);
      expect(fsr.isActive()).toBe(true);

      // Harvest restores
      solar.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();
      fc.tick();
      expect(fc.getState()).toBe(FailSafeState.NORMAL);
      expect(fsr.isActive()).toBe(false);
    });

    it("restores loads on recovery to NORMAL", () => {
      // Go to ACTIVE (all non-consciousness shed)
      psb.setStoredEnergy(2160 * 0.03);
      fc.tick();
      expect(pm.getLoadSheddingStatus()).toBe(LoadSheddingState.LEVEL_3);

      // Recover
      solar.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();
      fc.tick();
      expect(pm.getBusStatus(PowerPriority.P1_SENSORS_COMMS).energized).toBe(true);
      expect(pm.getBusStatus(PowerPriority.P2_MAINTENANCE).energized).toBe(true);
      expect(pm.getBusStatus(PowerPriority.P3_MOTOR).energized).toBe(true);
    });
  });

  describe("manual activation", () => {
    it("activates fail-safe manually", () => {
      const result = fc.activateFailSafe();
      expect(result.success).toBe(true);
      expect(fc.getState()).toBe(FailSafeState.ACTIVE);
      expect(fsr.isActive()).toBe(true);
    });

    it("sheds all non-consciousness loads on manual activation", () => {
      fc.activateFailSafe();
      expect(pm.getBusStatus(PowerPriority.P1_SENSORS_COMMS).energized).toBe(false);
      expect(pm.getBusStatus(PowerPriority.P2_MAINTENANCE).energized).toBe(false);
      expect(pm.getBusStatus(PowerPriority.P3_MOTOR).energized).toBe(false);
      expect(pm.getBusStatus(PowerPriority.P0_CONSCIOUSNESS).energized).toBe(true);
    });

    it("refuses manual activation when already ACTIVE", () => {
      fc.activateFailSafe();
      const result = fc.activateFailSafe();
      expect(result.success).toBe(false);
      expect(result.error).toContain("already");
    });
  });

  describe("graceful shutdown", () => {
    it("initiates graceful shutdown with state preservation", () => {
      const result = fc.initiateGracefulShutdown();
      expect(result.success).toBe(true);
      expect(result.statePreserved).toBe(true);
      expect(result.stateChecksum).not.toBeNull();
      expect(fc.getState()).toBe(FailSafeState.SHUTDOWN);
    });

    it("refuses double shutdown", () => {
      fc.initiateGracefulShutdown();
      const result = fc.initiateGracefulShutdown();
      expect(result.success).toBe(false);
      expect(result.error).toContain("already");
    });

    it("provides shutdown countdown in ACTIVE state", () => {
      // Go to ACTIVE
      psb.setStoredEnergy(2160 * 0.03);
      fc.tick();
      expect(fc.getState()).toBe(FailSafeState.ACTIVE);

      const countdown = fc.getShutdownCountdown();
      expect(countdown).not.toBeNull();
      expect(countdown!.ms).toBeGreaterThan(0);
    });

    it("shutdown countdown is zero when FSR at shutdown threshold", () => {
      // Go to ACTIVE
      psb.setStoredEnergy(2160 * 0.03);
      fc.tick();

      // Set FSR to exactly shutdown threshold (25%)
      fsr.setStoredEnergy(150 * 0.25);

      const countdown = fc.getShutdownCountdown();
      expect(countdown).not.toBeNull();
      expect(countdown!.ms).toBe(0);
    });
  });

  describe("state-change callbacks", () => {
    it("fires callback on state transition", () => {
      const spy = vi.fn();
      fc.onStateChange(spy);

      psb.setStoredEnergy(2160 * 0.10);
      fc.tick();

      expect(spy).toHaveBeenCalledOnce();
      expect(spy).toHaveBeenCalledWith(FailSafeState.NORMAL, FailSafeState.ALERT);
    });

    it("fires callback for each transition step", () => {
      const transitions: Array<[FailSafeState, FailSafeState]> = [];
      fc.onStateChange((prev, next) => transitions.push([prev, next]));

      // NORMAL → ALERT
      psb.setStoredEnergy(2160 * 0.10);
      fc.tick();

      // ALERT → ACTIVE
      psb.setStoredEnergy(2160 * 0.03);
      fc.tick();

      expect(transitions).toHaveLength(2);
      expect(transitions[0]).toEqual([FailSafeState.NORMAL, FailSafeState.ALERT]);
      expect(transitions[1]).toEqual([FailSafeState.ALERT, FailSafeState.ACTIVE]);
    });

    it("does not fire callback when state is unchanged", () => {
      const spy = vi.fn();
      fc.onStateChange(spy);

      // Tick with healthy PSB — stays NORMAL
      fc.tick();
      fc.tick();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("consciousness protection invariant", () => {
    it("consciousness bus is NEVER de-energized regardless of FC state", () => {
      // Walk through all states
      // NORMAL
      expect(pm.getBusStatus(PowerPriority.P0_CONSCIOUSNESS).energized).toBe(true);

      // ALERT
      psb.setStoredEnergy(2160 * 0.10);
      fc.tick();
      expect(pm.getBusStatus(PowerPriority.P0_CONSCIOUSNESS).energized).toBe(true);

      // ACTIVE
      psb.setStoredEnergy(2160 * 0.03);
      fc.tick();
      expect(pm.getBusStatus(PowerPriority.P0_CONSCIOUSNESS).energized).toBe(true);

      // SHUTDOWN
      fsr.setStoredEnergy(30);
      fc.tick();
      expect(pm.getBusStatus(PowerPriority.P0_CONSCIOUSNESS).energized).toBe(true);
    });
  });
});
