/**
 * Consumable Tracker (CT) — Resource Layer
 *
 * Tracks all consumable resources (lubricants, coolants, raw materials, etc.)
 * and forecasts depletion timelines so the system can signal or autonomously
 * source replacements before stockout.
 *
 * Alert thresholds:
 *   - belowMinimum: current quantity < minimumThreshold
 *   - Imminent stockout: predicted stockout within 7 days
 *
 * Architecture reference: docs/autonomous-self-maintenance/ARCHITECTURE.md §4
 * Card: 0.3.1.2.3 Autonomous Self-Maintenance
 */

import type {
  ConsumableResource,
  DepletionForecast,
  Timestamp,
} from "./types.js";
import type {
  IConsumableTracker,
  DepletionWarningHandler,
  Unsubscribe,
} from "./interfaces.js";

/** Days-to-stockout threshold for imminent depletion alerts */
const IMMINENT_STOCKOUT_DAYS = 7;

export class ConsumableTracker implements IConsumableTracker {
  private readonly consumables = new Map<string, ConsumableResource>();
  private readonly warningHandlers = new Set<DepletionWarningHandler>();

  // ── Registration ──────────────────────────────────────────────

  /** Register a new consumable resource for tracking */
  addConsumable(resource: ConsumableResource): void {
    this.consumables.set(resource.id, resource);
  }

  // ── IConsumableTracker ────────────────────────────────────────

  getInventory(): readonly ConsumableResource[] {
    return Array.from(this.consumables.values());
  }

  getConsumableStatus(consumableId: string): ConsumableResource | null {
    return this.consumables.get(consumableId) ?? null;
  }

  recordConsumption(consumableId: string, amount: number): void {
    const resource = this.consumables.get(consumableId);
    if (!resource) return;

    const newQuantity = Math.max(0, resource.currentQuantity - amount);
    const updated: ConsumableResource = {
      ...resource,
      currentQuantity: newQuantity,
    };
    this.consumables.set(consumableId, updated);

    // Fire depletion warning if we crossed below the minimum threshold
    if (newQuantity < resource.minimumThreshold) {
      const forecast = this.buildForecast(updated);
      for (const handler of this.warningHandlers) {
        handler(forecast);
      }
    }
  }

  recordRestock(consumableId: string, amount: number): void {
    const resource = this.consumables.get(consumableId);
    if (!resource) return;

    const newQuantity = Math.min(
      resource.maximumCapacity,
      resource.currentQuantity + amount,
    );
    const updated: ConsumableResource = {
      ...resource,
      currentQuantity: newQuantity,
      lastRestocked: Date.now() as Timestamp,
    };
    this.consumables.set(consumableId, updated);
  }

  getDepletionForecast(consumableId: string): DepletionForecast | null {
    const resource = this.consumables.get(consumableId);
    if (!resource) return null;
    return this.buildForecast(resource);
  }

  getDepletionAlerts(): readonly DepletionForecast[] {
    const alerts: DepletionForecast[] = [];
    for (const resource of this.consumables.values()) {
      const forecast = this.buildForecast(resource);
      if (
        forecast.belowMinimum ||
        (forecast.estimatedDaysToStockout !== null &&
          forecast.estimatedDaysToStockout <= IMMINENT_STOCKOUT_DAYS)
      ) {
        alerts.push(forecast);
      }
    }
    return alerts;
  }

  onDepletionWarning(handler: DepletionWarningHandler): Unsubscribe {
    this.warningHandlers.add(handler);
    return () => {
      this.warningHandlers.delete(handler);
    };
  }

  // ── Internal ──────────────────────────────────────────────────

  private buildForecast(resource: ConsumableResource): DepletionForecast {
    const now = Date.now() as Timestamp;
    const rate = resource.depletionRatePerDay;

    let estimatedDaysToStockout: number | null = null;
    let estimatedStockoutDate: Timestamp | null = null;

    if (rate > 0) {
      estimatedDaysToStockout = Math.floor(resource.currentQuantity / rate);
      estimatedStockoutDate = (now +
        estimatedDaysToStockout * 24 * 60 * 60 * 1000) as Timestamp;
    }

    return {
      resourceId: resource.id,
      currentQuantity: resource.currentQuantity,
      depletionRatePerDay: rate,
      estimatedDaysToStockout,
      estimatedStockoutDate,
      belowMinimum: resource.currentQuantity < resource.minimumThreshold,
      timestamp: now,
    };
  }
}
