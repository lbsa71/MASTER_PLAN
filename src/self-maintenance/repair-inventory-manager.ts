/**
 * Repair Inventory Manager (RIM) — Resource Layer
 *
 * Manages spare parts and repair materials, including reservation
 * for pending repairs and autonomous resupply ordering.
 *
 * Architecture reference: docs/autonomous-self-maintenance/ARCHITECTURE.md §4
 * Card: 0.3.1.2.3 Autonomous Self-Maintenance
 */

import type {
  ConsumableResource,
  DepletionForecast,
  InventoryStatus,
  RepairPart,
  RepairTask,
  Timestamp,
} from "./types.js";
import type {
  IRepairInventoryManager,
  ReservationResult,
  ResupplyOrder,
  ResupplyRequest,
  ResourceAvailability,
} from "./interfaces.js";

interface Reservation {
  readonly reservationId: string;
  readonly taskId: string;
  readonly items: readonly { partId: string; quantity: number }[];
}

export class RepairInventoryManager implements IRepairInventoryManager {
  private readonly parts = new Map<string, RepairPart>();
  private readonly reservations = new Map<string, Reservation>();
  private readonly orders: ResupplyOrder[] = [];
  private reservationCounter = 0;
  private orderCounter = 0;

  // ── Registration ──────────────────────────────────────────────

  /** Register a spare part for tracking */
  addPart(part: RepairPart): void {
    this.parts.set(part.partId, part);
  }

  // ── IRepairInventoryManager ───────────────────────────────────

  getSparePartsInventory(): readonly RepairPart[] {
    return Array.from(this.parts.values());
  }

  reserveParts(task: RepairTask): ReservationResult {
    const reservationId = `reservation-${++this.reservationCounter}`;
    const reservedItems: { partId: string; quantity: number }[] = [];
    const missingItems: { partId: string; quantityShort: number }[] = [];

    for (const resourceId of task.requiredResources) {
      const part = this.parts.get(resourceId);
      if (!part || part.quantityOnHand < 1) {
        missingItems.push({ partId: resourceId, quantityShort: 1 });
      } else {
        reservedItems.push({ partId: resourceId, quantity: 1 });
      }
    }

    // Only actually decrement if all parts are available
    if (missingItems.length === 0) {
      for (const item of reservedItems) {
        const part = this.parts.get(item.partId)!;
        this.parts.set(item.partId, {
          ...part,
          quantityOnHand: part.quantityOnHand - item.quantity,
        });
      }

      this.reservations.set(reservationId, {
        reservationId,
        taskId: task.id,
        items: reservedItems,
      });
    }

    return {
      reservationId,
      taskId: task.id,
      reserved: missingItems.length === 0,
      reservedItems: missingItems.length === 0 ? reservedItems : [],
      missingItems,
    };
  }

  releaseParts(reservationId: string): void {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) return;

    for (const item of reservation.items) {
      const part = this.parts.get(item.partId);
      if (part) {
        this.parts.set(item.partId, {
          ...part,
          quantityOnHand: part.quantityOnHand + item.quantity,
        });
      }
    }

    this.reservations.delete(reservationId);
  }

  requestResupply(items: readonly ResupplyRequest[]): ResupplyOrder {
    const order: ResupplyOrder = {
      orderId: `order-${++this.orderCounter}`,
      items,
      estimatedArrival: null,
      status: "ORDERED",
    };
    this.orders.push(order);
    return order;
  }

  getResupplyStatus(): readonly ResupplyOrder[] {
    return [...this.orders];
  }

  canPerformRepair(task: RepairTask): ResourceAvailability {
    const missingResources: string[] = [];

    for (const resourceId of task.requiredResources) {
      const part = this.parts.get(resourceId);
      if (!part || part.quantityOnHand < 1) {
        missingResources.push(resourceId);
      }
    }

    return {
      taskId: task.id,
      available: missingResources.length === 0,
      missingResources,
      estimatedAvailability: null,
    };
  }

  getInventoryStatus(): InventoryStatus {
    const parts = this.getSparePartsInventory();
    const criticalShortages = parts
      .filter((p) => p.critical && p.quantityOnHand === 0)
      .map((p) => p.partId);

    return {
      parts,
      consumables: [],
      depletionForecasts: [],
      criticalShortages,
      timestamp: Date.now() as Timestamp,
    };
  }
}
