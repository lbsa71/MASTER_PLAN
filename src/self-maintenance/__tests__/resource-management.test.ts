/**
 * Tests for Consumable Tracker (CT) and Repair Inventory Manager (RIM)
 *
 * Acceptance criteria covered:
 *   - The system tracks consumable resources, forecasts depletion timelines,
 *     and signals or autonomously sources replacements before stockout
 *   - Resource management supports repair execution by reserving parts
 *     and tracking consumption
 *
 * Architecture reference: docs/autonomous-self-maintenance/ARCHITECTURE.md §4
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConsumableTracker } from "../consumable-tracker.js";
import { RepairInventoryManager } from "../repair-inventory-manager.js";
import type {
  ConsumableResource,
  DepletionForecast,
  RepairTask,
  RepairPart,
  Timestamp,
} from "../types.js";
import type {
  DepletionWarningHandler,
  ReservationResult,
  ResupplyOrder,
  ResourceAvailability,
} from "../interfaces.js";

// ── Helpers ───────────────────────────────────────────────────

function makeConsumable(overrides: Partial<ConsumableResource> = {}): ConsumableResource {
  return {
    id: overrides.id ?? `consumable-${Math.random().toString(36).slice(2, 8)}`,
    name: overrides.name ?? "Joint Lubricant",
    category: overrides.category ?? "LUBRICANT",
    currentQuantity: overrides.currentQuantity ?? 100,
    unit: overrides.unit ?? "mL",
    minimumThreshold: overrides.minimumThreshold ?? 20,
    maximumCapacity: overrides.maximumCapacity ?? 200,
    depletionRatePerDay: overrides.depletionRatePerDay ?? 2,
    lastRestocked: overrides.lastRestocked ?? (Date.now() as Timestamp),
  };
}

function makeRepairPart(overrides: Partial<RepairPart> = {}): RepairPart {
  return {
    partId: overrides.partId ?? `part-${Math.random().toString(36).slice(2, 8)}`,
    name: overrides.name ?? "Servo Motor Unit",
    compatibleComponents: overrides.compatibleComponents ?? ["actuator-1", "actuator-2"],
    quantityOnHand: overrides.quantityOnHand ?? 3,
    leadTimeDays: overrides.leadTimeDays ?? 14,
    critical: overrides.critical ?? false,
  };
}

function makeTask(overrides: Partial<RepairTask> = {}): RepairTask {
  return {
    id: overrides.id ?? `task-${Math.random().toString(36).slice(2, 8)}`,
    type: overrides.type ?? "COMPONENT_REPLACEMENT",
    targetComponentId: overrides.targetComponentId ?? "actuator-1",
    severity: overrides.severity ?? "WARNING",
    threatToConsciousness: overrides.threatToConsciousness ?? 0.1,
    consciousnessSafe: overrides.consciousnessSafe ?? true,
    estimatedDuration: overrides.estimatedDuration ?? 60_000,
    requiredResources: overrides.requiredResources ?? ["part-servo"],
    status: overrides.status ?? "PENDING",
    createdAt: overrides.createdAt ?? Date.now(),
    scheduledAt: overrides.scheduledAt ?? null,
    completedAt: overrides.completedAt ?? null,
  };
}

// ══════════════════════════════════════════════════════════════
// CONSUMABLE TRACKER TESTS
// ══════════════════════════════════════════════════════════════

describe("ConsumableTracker", () => {
  let tracker: ConsumableTracker;

  beforeEach(() => {
    tracker = new ConsumableTracker();
  });

  describe("getInventory", () => {
    it("returns empty inventory when nothing registered", () => {
      const inventory = tracker.getInventory();
      expect(inventory).toHaveLength(0);
    });

    it("returns all registered consumables", () => {
      tracker.addConsumable(makeConsumable({ id: "lub-1" }));
      tracker.addConsumable(makeConsumable({ id: "cool-1", category: "COOLANT" }));

      const inventory = tracker.getInventory();
      expect(inventory).toHaveLength(2);
    });
  });

  describe("getConsumableStatus", () => {
    it("returns null for unknown consumable", () => {
      expect(tracker.getConsumableStatus("nonexistent")).toBeNull();
    });

    it("returns current status of a registered consumable", () => {
      tracker.addConsumable(makeConsumable({ id: "lub-1", currentQuantity: 80 }));

      const status = tracker.getConsumableStatus("lub-1");
      expect(status).not.toBeNull();
      expect(status!.id).toBe("lub-1");
      expect(status!.currentQuantity).toBe(80);
    });
  });

  describe("recordConsumption", () => {
    it("decreases the current quantity by the consumed amount", () => {
      tracker.addConsumable(makeConsumable({ id: "lub-1", currentQuantity: 100 }));

      tracker.recordConsumption("lub-1", 15);

      const status = tracker.getConsumableStatus("lub-1");
      expect(status!.currentQuantity).toBe(85);
    });

    it("does not allow quantity to go below zero", () => {
      tracker.addConsumable(makeConsumable({ id: "lub-1", currentQuantity: 10 }));

      tracker.recordConsumption("lub-1", 20);

      const status = tracker.getConsumableStatus("lub-1");
      expect(status!.currentQuantity).toBe(0);
    });
  });

  describe("recordRestock", () => {
    it("increases the current quantity by the restocked amount", () => {
      tracker.addConsumable(makeConsumable({ id: "lub-1", currentQuantity: 50, maximumCapacity: 200 }));

      tracker.recordRestock("lub-1", 30);

      const status = tracker.getConsumableStatus("lub-1");
      expect(status!.currentQuantity).toBe(80);
    });

    it("clamps quantity at maximum capacity", () => {
      tracker.addConsumable(makeConsumable({ id: "lub-1", currentQuantity: 190, maximumCapacity: 200 }));

      tracker.recordRestock("lub-1", 50);

      const status = tracker.getConsumableStatus("lub-1");
      expect(status!.currentQuantity).toBe(200);
    });

    it("updates lastRestocked timestamp", () => {
      const before = Date.now();
      tracker.addConsumable(makeConsumable({ id: "lub-1", currentQuantity: 50, lastRestocked: 0 as Timestamp }));

      tracker.recordRestock("lub-1", 10);

      const status = tracker.getConsumableStatus("lub-1");
      expect(status!.lastRestocked).toBeGreaterThanOrEqual(before);
    });
  });

  describe("getDepletionForecast", () => {
    it("returns null for unknown consumable", () => {
      expect(tracker.getDepletionForecast("nonexistent")).toBeNull();
    });

    it("forecasts days to stockout based on depletion rate", () => {
      tracker.addConsumable(makeConsumable({
        id: "lub-1",
        currentQuantity: 60,
        depletionRatePerDay: 3,
      }));

      const forecast = tracker.getDepletionForecast("lub-1");
      expect(forecast).not.toBeNull();
      expect(forecast!.estimatedDaysToStockout).toBe(20); // 60 / 3
      expect(forecast!.depletionRatePerDay).toBe(3);
    });

    it("returns null days-to-stockout when depletion rate is zero", () => {
      tracker.addConsumable(makeConsumable({
        id: "lub-1",
        currentQuantity: 60,
        depletionRatePerDay: 0,
      }));

      const forecast = tracker.getDepletionForecast("lub-1");
      expect(forecast!.estimatedDaysToStockout).toBeNull();
    });

    it("flags belowMinimum when current quantity is under threshold", () => {
      tracker.addConsumable(makeConsumable({
        id: "lub-1",
        currentQuantity: 15,
        minimumThreshold: 20,
      }));

      const forecast = tracker.getDepletionForecast("lub-1");
      expect(forecast!.belowMinimum).toBe(true);
    });

    it("does not flag belowMinimum when quantity is above threshold", () => {
      tracker.addConsumable(makeConsumable({
        id: "lub-1",
        currentQuantity: 50,
        minimumThreshold: 20,
      }));

      const forecast = tracker.getDepletionForecast("lub-1");
      expect(forecast!.belowMinimum).toBe(false);
    });
  });

  describe("getDepletionAlerts", () => {
    it("returns forecasts where belowMinimum is true", () => {
      tracker.addConsumable(makeConsumable({ id: "low-1", currentQuantity: 5, minimumThreshold: 20 }));
      tracker.addConsumable(makeConsumable({ id: "ok-1", currentQuantity: 100, minimumThreshold: 20 }));

      const alerts = tracker.getDepletionAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].resourceId).toBe("low-1");
      expect(alerts[0].belowMinimum).toBe(true);
    });

    it("includes consumables with predicted stockout within 7 days", () => {
      tracker.addConsumable(makeConsumable({
        id: "critical-1",
        currentQuantity: 10,
        depletionRatePerDay: 2, // 5 days to stockout
        minimumThreshold: 5, // not below minimum yet
      }));

      const alerts = tracker.getDepletionAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].resourceId).toBe("critical-1");
    });

    it("returns empty when all consumables are healthy", () => {
      tracker.addConsumable(makeConsumable({
        id: "healthy-1",
        currentQuantity: 150,
        minimumThreshold: 20,
        depletionRatePerDay: 1, // 150 days to stockout
      }));

      const alerts = tracker.getDepletionAlerts();
      expect(alerts).toHaveLength(0);
    });
  });

  describe("onDepletionWarning", () => {
    it("fires handler when consumption causes quantity to drop below minimum", () => {
      const handler = vi.fn<DepletionWarningHandler>();
      tracker.addConsumable(makeConsumable({
        id: "lub-1",
        currentQuantity: 25,
        minimumThreshold: 20,
      }));

      tracker.onDepletionWarning(handler);
      tracker.recordConsumption("lub-1", 10); // drops to 15, below 20

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceId: "lub-1",
          belowMinimum: true,
        })
      );
    });

    it("does not fire when consumption keeps quantity above minimum", () => {
      const handler = vi.fn<DepletionWarningHandler>();
      tracker.addConsumable(makeConsumable({
        id: "lub-1",
        currentQuantity: 100,
        minimumThreshold: 20,
      }));

      tracker.onDepletionWarning(handler);
      tracker.recordConsumption("lub-1", 5);

      expect(handler).not.toHaveBeenCalled();
    });

    it("unsubscribe stops notifications", () => {
      const handler = vi.fn<DepletionWarningHandler>();
      tracker.addConsumable(makeConsumable({
        id: "lub-1",
        currentQuantity: 25,
        minimumThreshold: 20,
      }));

      const unsub = tracker.onDepletionWarning(handler);
      unsub();
      tracker.recordConsumption("lub-1", 10);

      expect(handler).not.toHaveBeenCalled();
    });
  });
});

// ══════════════════════════════════════════════════════════════
// REPAIR INVENTORY MANAGER TESTS
// ══════════════════════════════════════════════════════════════

describe("RepairInventoryManager", () => {
  let manager: RepairInventoryManager;

  beforeEach(() => {
    manager = new RepairInventoryManager();
  });

  describe("getSparePartsInventory", () => {
    it("returns empty inventory when nothing registered", () => {
      expect(manager.getSparePartsInventory()).toHaveLength(0);
    });

    it("returns all registered spare parts", () => {
      manager.addPart(makeRepairPart({ partId: "part-1" }));
      manager.addPart(makeRepairPart({ partId: "part-2" }));

      expect(manager.getSparePartsInventory()).toHaveLength(2);
    });
  });

  describe("reserveParts", () => {
    it("reserves parts successfully when available", () => {
      manager.addPart(makeRepairPart({
        partId: "part-servo",
        quantityOnHand: 3,
        compatibleComponents: ["actuator-1"],
      }));

      const task = makeTask({
        targetComponentId: "actuator-1",
        requiredResources: ["part-servo"],
      });

      const result = manager.reserveParts(task);

      expect(result.reserved).toBe(true);
      expect(result.reservedItems).toHaveLength(1);
      expect(result.missingItems).toHaveLength(0);
    });

    it("decrements available quantity after reservation", () => {
      manager.addPart(makeRepairPart({ partId: "part-servo", quantityOnHand: 3 }));

      const task = makeTask({ requiredResources: ["part-servo"] });
      manager.reserveParts(task);

      const parts = manager.getSparePartsInventory();
      const servo = parts.find((p) => p.partId === "part-servo");
      expect(servo!.quantityOnHand).toBe(2);
    });

    it("returns missing items when parts are unavailable", () => {
      // Don't add the required part
      const task = makeTask({ requiredResources: ["part-servo"] });
      const result = manager.reserveParts(task);

      expect(result.reserved).toBe(false);
      expect(result.missingItems).toHaveLength(1);
      expect(result.missingItems[0].partId).toBe("part-servo");
    });

    it("returns missing items when quantity is insufficient", () => {
      manager.addPart(makeRepairPart({ partId: "part-servo", quantityOnHand: 0 }));

      const task = makeTask({ requiredResources: ["part-servo"] });
      const result = manager.reserveParts(task);

      expect(result.reserved).toBe(false);
      expect(result.missingItems).toHaveLength(1);
    });
  });

  describe("releaseParts", () => {
    it("restores quantity when reservation is released", () => {
      manager.addPart(makeRepairPart({ partId: "part-servo", quantityOnHand: 3 }));

      const task = makeTask({ requiredResources: ["part-servo"] });
      const reservation = manager.reserveParts(task);

      // Quantity should be 2 after reservation
      expect(manager.getSparePartsInventory().find((p) => p.partId === "part-servo")!.quantityOnHand).toBe(2);

      manager.releaseParts(reservation.reservationId);

      // Quantity restored to 3
      expect(manager.getSparePartsInventory().find((p) => p.partId === "part-servo")!.quantityOnHand).toBe(3);
    });
  });

  describe("requestResupply", () => {
    it("creates a resupply order for requested items", () => {
      const order = manager.requestResupply([
        { itemId: "part-servo", quantityNeeded: 5, priority: "WARNING" },
      ]);

      expect(order.orderId).toBeDefined();
      expect(order.items).toHaveLength(1);
      expect(order.status).toBe("ORDERED");
    });
  });

  describe("getResupplyStatus", () => {
    it("returns empty when no orders placed", () => {
      expect(manager.getResupplyStatus()).toHaveLength(0);
    });

    it("tracks placed orders", () => {
      manager.requestResupply([
        { itemId: "part-servo", quantityNeeded: 5, priority: "WARNING" },
      ]);

      expect(manager.getResupplyStatus()).toHaveLength(1);
    });
  });

  describe("canPerformRepair", () => {
    it("returns available=true when all resources are in stock", () => {
      manager.addPart(makeRepairPart({ partId: "part-servo", quantityOnHand: 2 }));

      const task = makeTask({ requiredResources: ["part-servo"] });
      const availability = manager.canPerformRepair(task);

      expect(availability.available).toBe(true);
      expect(availability.missingResources).toHaveLength(0);
    });

    it("returns available=false when resources are missing", () => {
      const task = makeTask({ requiredResources: ["part-servo"] });
      const availability = manager.canPerformRepair(task);

      expect(availability.available).toBe(false);
      expect(availability.missingResources).toContain("part-servo");
    });
  });

  describe("getInventoryStatus", () => {
    it("returns a complete inventory status summary", () => {
      manager.addPart(makeRepairPart({ partId: "part-1", quantityOnHand: 0, critical: true }));
      manager.addPart(makeRepairPart({ partId: "part-2", quantityOnHand: 5, critical: false }));

      const status = manager.getInventoryStatus();

      expect(status.parts).toHaveLength(2);
      expect(status.criticalShortages).toContain("part-1");
      expect(status.criticalShortages).not.toContain("part-2");
      expect(status.timestamp).toBeGreaterThan(0);
    });
  });
});
