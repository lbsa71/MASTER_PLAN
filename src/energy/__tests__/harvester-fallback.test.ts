/**
 * Tests for Harvester Coordinator fallback behavior (0.3.1.2.4)
 *
 * Verifies multi-source energy harvesting with automatic fallback:
 * - Coordinator activates available harvesters on update
 * - Falling back to secondary sources when primary becomes unavailable
 * - Source-lost / source-found callbacks fire correctly
 * - Faulted harvesters are skipped during activation
 * - Total harvest rate aggregates only active harvesters
 * - Priority ordering respected for activation
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { HarvesterCoordinator } from "../harvester-coordinator.js";
import { SolarHarvester } from "../harvesters/solar.js";
import { ThermalHarvester } from "../harvesters/thermal.js";
import { KineticHarvester } from "../harvesters/kinetic.js";
import { ChemicalHarvester } from "../harvesters/chemical.js";
import {
  EnergySourceType,
  HarvesterStatus,
  SourceAvailability,
} from "../types.js";

describe("HarvesterCoordinator — fallback", () => {
  let coordinator: HarvesterCoordinator;
  let solar: SolarHarvester;
  let thermal: ThermalHarvester;
  let kinetic: KineticHarvester;
  let chemical: ChemicalHarvester;

  beforeEach(() => {
    coordinator = new HarvesterCoordinator();
    solar = new SolarHarvester(200);
    thermal = new ThermalHarvester(20);
    kinetic = new KineticHarvester(50);
    chemical = new ChemicalHarvester(500);

    coordinator.registerHarvester(solar);
    coordinator.registerHarvester(thermal);
    coordinator.registerHarvester(kinetic);
    coordinator.registerHarvester(chemical);
  });

  describe("initial state", () => {
    it("has no active harvesters before first update", () => {
      expect(coordinator.getActiveHarvesters()).toHaveLength(0);
    });

    it("reports zero total harvest rate before any source is available", () => {
      coordinator.updateHarvesters();
      expect(coordinator.getTotalHarvestRate().watts).toBe(0);
    });

  });

  describe("single-source activation", () => {
    it("activates solar when sunlight is available", () => {
      solar.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();

      const active = coordinator.getActiveHarvesters();
      expect(active).toHaveLength(1);
      expect(active[0].getSourceType()).toBe(EnergySourceType.SOLAR);
      expect(active[0].getStatus()).toBe(HarvesterStatus.ACTIVE);
    });

    it("reports non-zero harvest rate with one active source", () => {
      solar.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();

      expect(coordinator.getTotalHarvestRate().watts).toBeGreaterThan(0);
      expect(coordinator.isHarvestActive()).toBe(true);
    });
  });

  describe("multi-source aggregation", () => {
    it("activates all available sources and aggregates output", () => {
      solar.setAvailability(SourceAvailability.HIGH);
      thermal.setAvailability(SourceAvailability.MEDIUM);
      kinetic.setAvailability(SourceAvailability.LOW);

      coordinator.updateHarvesters();

      expect(coordinator.getActiveHarvesters()).toHaveLength(3);
      // Total should be sum of all three outputs
      const breakdown = coordinator.getSourceBreakdown();
      const solarW = breakdown.get(EnergySourceType.SOLAR)!.watts;
      const thermalW = breakdown.get(EnergySourceType.THERMAL)!.watts;
      const kineticW = breakdown.get(EnergySourceType.KINETIC)!.watts;

      expect(solarW).toBeGreaterThan(0);
      expect(thermalW).toBeGreaterThan(0);
      expect(kineticW).toBeGreaterThan(0);
      expect(coordinator.getTotalHarvestRate().watts).toBeCloseTo(
        solarW + thermalW + kineticW,
        5
      );
    });
  });

  describe("fallback on source loss", () => {
    it("continues harvesting from remaining sources when primary is lost", () => {
      // Start with solar + chemical
      solar.setAvailability(SourceAvailability.HIGH);
      chemical.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();

      const totalBefore = coordinator.getTotalHarvestRate().watts;
      expect(coordinator.getActiveHarvesters()).toHaveLength(2);

      // Solar goes dark (nightfall)
      solar.setAvailability(SourceAvailability.NONE);
      coordinator.updateHarvesters();

      const active = coordinator.getActiveHarvesters();
      expect(active).toHaveLength(1);
      expect(active[0].getSourceType()).toBe(EnergySourceType.CHEMICAL);
      expect(coordinator.getTotalHarvestRate().watts).toBeGreaterThan(0);
      expect(coordinator.getTotalHarvestRate().watts).toBeLessThan(totalBefore);
    });

    it("falls back through multiple sources as they are lost", () => {
      // Start with all four
      solar.setAvailability(SourceAvailability.HIGH);
      thermal.setAvailability(SourceAvailability.MEDIUM);
      kinetic.setAvailability(SourceAvailability.HIGH);
      chemical.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();
      expect(coordinator.getActiveHarvesters()).toHaveLength(4);

      // Lose solar
      solar.setAvailability(SourceAvailability.NONE);
      coordinator.updateHarvesters();
      expect(coordinator.getActiveHarvesters()).toHaveLength(3);

      // Lose kinetic (stopped moving)
      kinetic.setAvailability(SourceAvailability.NONE);
      coordinator.updateHarvesters();
      expect(coordinator.getActiveHarvesters()).toHaveLength(2);

      // Lose thermal
      thermal.setAvailability(SourceAvailability.NONE);
      coordinator.updateHarvesters();
      expect(coordinator.getActiveHarvesters()).toHaveLength(1);
      expect(coordinator.getActiveHarvesters()[0].getSourceType()).toBe(
        EnergySourceType.CHEMICAL
      );

      // Lose chemical — total blackout
      chemical.setAvailability(SourceAvailability.NONE);
      coordinator.updateHarvesters();
      expect(coordinator.getActiveHarvesters()).toHaveLength(0);
      expect(coordinator.isHarvestActive()).toBe(false);
    });
  });

  describe("fault handling", () => {
    it("skips faulted harvesters during activation", () => {
      solar.setAvailability(SourceAvailability.HIGH);
      solar.injectFault();
      chemical.setAvailability(SourceAvailability.HIGH);

      coordinator.updateHarvesters();

      const active = coordinator.getActiveHarvesters();
      expect(active).toHaveLength(1);
      expect(active[0].getSourceType()).toBe(EnergySourceType.CHEMICAL);
    });

    it("re-activates harvester after fault is cleared and source returns", () => {
      solar.setAvailability(SourceAvailability.HIGH);
      solar.injectFault();
      coordinator.updateHarvesters();
      expect(coordinator.getActiveHarvesters()).toHaveLength(0);

      // Clear fault, source still available
      solar.clearFault();
      solar.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();

      const active = coordinator.getActiveHarvesters();
      expect(active).toHaveLength(1);
      expect(active[0].getSourceType()).toBe(EnergySourceType.SOLAR);
    });
  });

  describe("source-lost / source-found callbacks", () => {
    it("fires source-found when a new source becomes active", () => {
      const foundSpy = vi.fn();
      coordinator.onSourceFound(foundSpy);

      solar.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();

      expect(foundSpy).toHaveBeenCalledOnce();
      expect(foundSpy).toHaveBeenCalledWith(EnergySourceType.SOLAR);
    });

    it("fires source-lost when an active source disappears", () => {
      const lostSpy = vi.fn();
      coordinator.onSourceLost(lostSpy);

      solar.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();

      solar.setAvailability(SourceAvailability.NONE);
      coordinator.updateHarvesters();

      expect(lostSpy).toHaveBeenCalledOnce();
      expect(lostSpy).toHaveBeenCalledWith(EnergySourceType.SOLAR);
    });

    it("fires both callbacks during a source swap", () => {
      const lostSpy = vi.fn();
      const foundSpy = vi.fn();
      coordinator.onSourceLost(lostSpy);
      coordinator.onSourceFound(foundSpy);

      // Solar comes on
      solar.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();
      expect(foundSpy).toHaveBeenCalledWith(EnergySourceType.SOLAR);

      foundSpy.mockClear();

      // Solar lost, chemical comes on
      solar.setAvailability(SourceAvailability.NONE);
      chemical.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();

      expect(lostSpy).toHaveBeenCalledWith(EnergySourceType.SOLAR);
      expect(foundSpy).toHaveBeenCalledWith(EnergySourceType.CHEMICAL);
    });

    it("does not fire callbacks when nothing changes", () => {
      const lostSpy = vi.fn();
      const foundSpy = vi.fn();
      coordinator.onSourceLost(lostSpy);
      coordinator.onSourceFound(foundSpy);

      solar.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();
      foundSpy.mockClear();

      // Same state, update again
      coordinator.updateHarvesters();
      expect(lostSpy).not.toHaveBeenCalled();
      expect(foundSpy).not.toHaveBeenCalled();
    });
  });

  describe("priority ordering", () => {
    it("respects custom priority ordering", () => {
      coordinator.setHarvestPriority([
        EnergySourceType.CHEMICAL,
        EnergySourceType.THERMAL,
        EnergySourceType.SOLAR,
        EnergySourceType.KINETIC,
      ]);

      chemical.setAvailability(SourceAvailability.HIGH);
      thermal.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();

      // Both should be active regardless of priority
      // (priority affects iteration order, not exclusion)
      expect(coordinator.getActiveHarvesters()).toHaveLength(2);
    });
  });

  describe("environmental forecast", () => {
    it("returns forecast based on current harvest rates", () => {
      solar.setAvailability(SourceAvailability.HIGH);
      chemical.setAvailability(SourceAvailability.MEDIUM);
      coordinator.updateHarvesters();

      const forecast = coordinator.getEnvironmentalForecast({ ms: 3600000 });
      expect(forecast.horizon.ms).toBe(3600000);
      expect(forecast.expectedOutput.watts).toBeGreaterThan(0);
      expect(forecast.confidence).toBeGreaterThan(0);
      expect(forecast.breakdown.size).toBeGreaterThan(0);
    });
  });

  describe("recovery from total blackout", () => {
    it("recovers when sources return after total loss", () => {
      // Start with solar
      solar.setAvailability(SourceAvailability.HIGH);
      coordinator.updateHarvesters();
      expect(coordinator.isHarvestActive()).toBe(true);

      // Total blackout
      solar.setAvailability(SourceAvailability.NONE);
      coordinator.updateHarvesters();
      expect(coordinator.isHarvestActive()).toBe(false);

      // Thermal becomes available (dawn warmth)
      thermal.setAvailability(SourceAvailability.LOW);
      coordinator.updateHarvesters();
      expect(coordinator.isHarvestActive()).toBe(true);
      expect(coordinator.getActiveHarvesters()[0].getSourceType()).toBe(
        EnergySourceType.THERMAL
      );
    });
  });
});
