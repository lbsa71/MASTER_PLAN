/**
 * Modality Registry — central registry of all active sensor and actuator modalities
 *
 * Tracks connected modalities, handles hot-plug events (sensor added, removed,
 * or replaced), and notifies dependent subsystems of configuration changes.
 *
 * @see docs/sensorimotor-consciousness-integration/ARCHITECTURE.md §4.1
 */

import type { IModalityRegistry, IModalityAdapter } from './interfaces';
import type {
  ModalityId,
  ModalityDescriptor,
  ModalityChangeHandler,
  ModalityChangeEvent,
  UnregisterResult,
  SensorHealth,
  Timestamp,
} from './types';

/**
 * Options for constructing a ModalityRegistry.
 */
export interface ModalityRegistryOptions {
  /** Function to get the current monotonic timestamp */
  getTimestamp?: () => Timestamp;
  /** Interval (ms) between health polling cycles; 0 disables polling */
  healthPollIntervalMs?: number;
}

/**
 * Internal record for a registered modality, holding the adapter reference
 * and its last-known descriptor.
 */
interface RegistryEntry {
  adapter: IModalityAdapter;
  descriptor: ModalityDescriptor;
}

/**
 * Central registry that tracks all sensor/actuator modalities in the system.
 *
 * Responsibilities:
 * - Track all connected modalities and their current status
 * - Handle hot-plug events (sensor added, removed, or replaced)
 * - Notify dependent subsystems (QualiaTransformer, SBI, PI) of config changes
 * - Provide queries for active and degraded modalities
 */
export class ModalityRegistry implements IModalityRegistry {
  private entries: Map<ModalityId, RegistryEntry> = new Map();
  private changeHandlers: ModalityChangeHandler[] = [];
  private getTimestamp: () => Timestamp;
  private healthPollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options?: ModalityRegistryOptions) {
    this.getTimestamp = options?.getTimestamp ?? (() => Date.now() * 1_000_000);

    const pollInterval = options?.healthPollIntervalMs ?? 0;
    if (pollInterval > 0) {
      this.startHealthPolling(pollInterval);
    }
  }

  /**
   * Register a new modality adapter with the registry.
   *
   * Emits a 'ADDED' change event to all registered handlers.
   * If an adapter with the same modalityId is already registered, it is
   * replaced (unregister + register) to support hot-swap.
   *
   * @returns The modalityId of the registered adapter.
   */
  register(adapter: IModalityAdapter): ModalityId {
    const id = adapter.modalityId;

    // Hot-swap: if already registered, unregister first
    if (this.entries.has(id)) {
      this.unregister(id);
    }

    const descriptor: ModalityDescriptor = {
      id,
      type: adapter.modalityType,
      status: healthToStatus(adapter.getHealth()),
      health: adapter.getHealth(),
      lastUpdate: this.getTimestamp(),
    };

    this.entries.set(id, { adapter, descriptor });

    this.emitChange({
      type: 'ADDED',
      modalityId: id,
      descriptor: { ...descriptor },
      timestamp: descriptor.lastUpdate,
    });

    return id;
  }

  /**
   * Unregister a modality, removing it from the registry.
   *
   * Emits a 'REMOVED' change event. Does NOT call adapter.shutdown() —
   * lifecycle management of the adapter is the caller's responsibility.
   */
  unregister(modalityId: ModalityId): UnregisterResult {
    const entry = this.entries.get(modalityId);
    if (!entry) {
      return { success: false, modalityId };
    }

    const descriptor = { ...entry.descriptor };
    this.entries.delete(modalityId);

    this.emitChange({
      type: 'REMOVED',
      modalityId,
      descriptor,
      timestamp: this.getTimestamp(),
    });

    return { success: true, modalityId };
  }

  /**
   * Get descriptors for all modalities with ACTIVE status.
   */
  getActive(): ModalityDescriptor[] {
    const result: ModalityDescriptor[] = [];
    for (const entry of this.entries.values()) {
      if (entry.descriptor.status === 'ACTIVE') {
        result.push({ ...entry.descriptor });
      }
    }
    return result;
  }

  /**
   * Get descriptors for all modalities with DEGRADED status.
   */
  getDegraded(): ModalityDescriptor[] {
    const result: ModalityDescriptor[] = [];
    for (const entry of this.entries.values()) {
      if (entry.descriptor.status === 'DEGRADED') {
        result.push({ ...entry.descriptor });
      }
    }
    return result;
  }

  /**
   * Subscribe to modality change events.
   *
   * Change events are emitted for: ADDED, REMOVED, DEGRADED, RECOVERED.
   */
  onModalityChange(callback: ModalityChangeHandler): void {
    this.changeHandlers.push(callback);
  }

  /**
   * Get the descriptor for a specific modality, or null if not registered.
   */
  getModality(modalityId: ModalityId): ModalityDescriptor | null {
    const entry = this.entries.get(modalityId);
    return entry ? { ...entry.descriptor } : null;
  }

  // ---------------------------------------------------------------------------
  // Extended API (not on the interface, but useful for the integration layer)
  // ---------------------------------------------------------------------------

  /**
   * Get the adapter instance for a given modality.
   * Returns null if not registered.
   */
  getAdapter(modalityId: ModalityId): IModalityAdapter | null {
    return this.entries.get(modalityId)?.adapter ?? null;
  }

  /**
   * Get descriptors for ALL registered modalities regardless of status.
   */
  getAll(): ModalityDescriptor[] {
    return Array.from(this.entries.values()).map((e) => ({ ...e.descriptor }));
  }

  /**
   * Get the total count of registered modalities.
   */
  getCount(): number {
    return this.entries.size;
  }

  /**
   * Poll the health of all registered adapters and emit change events
   * if any have transitioned between health states.
   *
   * This is called automatically when healthPollIntervalMs > 0, but can
   * also be called manually for immediate health checks.
   */
  pollHealth(): void {
    for (const [id, entry] of this.entries) {
      const previousHealth = entry.descriptor.health;
      const currentHealth = entry.adapter.getHealth();

      if (currentHealth !== previousHealth) {
        const now = this.getTimestamp();
        const newStatus = healthToStatus(currentHealth);

        entry.descriptor = {
          ...entry.descriptor,
          health: currentHealth,
          status: newStatus,
          lastUpdate: now,
        };

        const eventType = getHealthTransitionEventType(
          previousHealth,
          currentHealth
        );

        this.emitChange({
          type: eventType,
          modalityId: id,
          descriptor: { ...entry.descriptor },
          timestamp: now,
        });
      }
    }
  }

  /**
   * Stop health polling and clean up resources.
   */
  dispose(): void {
    if (this.healthPollTimer !== null) {
      clearInterval(this.healthPollTimer);
      this.healthPollTimer = null;
    }
    this.changeHandlers.length = 0;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private emitChange(event: ModalityChangeEvent): void {
    for (const handler of this.changeHandlers) {
      try {
        handler(event);
      } catch {
        // Handlers must not crash the registry; errors are silently swallowed.
        // In production, these would be logged.
      }
    }
  }

  private startHealthPolling(intervalMs: number): void {
    this.healthPollTimer = setInterval(() => {
      this.pollHealth();
    }, intervalMs);
  }
}

// =============================================================================
// Helper functions
// =============================================================================

/**
 * Map a SensorHealth value to the corresponding ModalityStatus.
 */
function healthToStatus(
  health: SensorHealth
): 'ACTIVE' | 'DEGRADED' | 'OFFLINE' | 'CALIBRATING' {
  switch (health) {
    case 'HEALTHY':
      return 'ACTIVE';
    case 'DEGRADED':
    case 'FAILING':
      return 'DEGRADED';
    case 'OFFLINE':
      return 'OFFLINE';
  }
}

/**
 * Determine the event type for a health state transition.
 */
function getHealthTransitionEventType(
  previous: SensorHealth,
  current: SensorHealth
): ModalityChangeEvent['type'] {
  const isRecovery =
    (previous === 'DEGRADED' || previous === 'FAILING' || previous === 'OFFLINE') &&
    current === 'HEALTHY';

  if (isRecovery) {
    return 'RECOVERED';
  }

  if (
    current === 'DEGRADED' ||
    current === 'FAILING' ||
    current === 'OFFLINE'
  ) {
    return 'DEGRADED';
  }

  // Fallback: any other transition is treated as recovery
  return 'RECOVERED';
}
