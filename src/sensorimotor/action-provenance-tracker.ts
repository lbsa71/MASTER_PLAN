/**
 * Action Provenance Tracker — records the origin and causal chain of every
 * motor command, enabling the system to determine which actions were reflexive
 * vs. consciously intended.
 *
 * Every motor command is tagged with its source (REFLEXIVE or CONSCIOUS) and
 * stored with a full causal chain. The consciousness substrate can
 * retrospectively "claim" or "disown" reflexive actions.
 *
 * @see docs/sensorimotor-consciousness-integration/ARCHITECTURE.md §2.3
 */

import type { IActionProvenanceTracker } from './interfaces';
import type {
  MotorCommand,
  ActionSource,
  ProvenanceId,
  ActionProvenance,
  ProvenanceFilter,
  ConsciousClaim,
  Duration,
} from './types';

let nextId = 0;

function generateProvenanceId(): ProvenanceId {
  return `prov-${Date.now()}-${nextId++}`;
}

export class ActionProvenanceTracker implements IActionProvenanceTracker {
  private records: Map<ProvenanceId, ActionProvenance> = new Map();
  /** Ordered list of IDs for chronological access */
  private orderedIds: ProvenanceId[] = [];

  /**
   * Record a motor command with its source (REFLEXIVE or CONSCIOUS).
   * Returns a unique ProvenanceId for later retrieval.
   */
  recordCommand(command: MotorCommand, source: ActionSource): ProvenanceId {
    const id = generateProvenanceId();

    const provenance: ActionProvenance = {
      id,
      source,
      stimulus: null,
      timestamp: command.timestamp,
      command,
      outcome: null,
      consciousClaim: null,
    };

    this.records.set(id, provenance);
    this.orderedIds.push(id);

    return id;
  }

  /**
   * Retrieve a provenance record by its ID.
   * Throws if the ID is not found.
   */
  getProvenance(provenanceId: ProvenanceId): ActionProvenance {
    const record = this.records.get(provenanceId);
    if (!record) {
      throw new Error(`Provenance record not found: ${provenanceId}`);
    }
    return record;
  }

  /**
   * Query provenance history with optional filters:
   * - source: REFLEXIVE or CONSCIOUS
   * - startTime / endTime: timestamp window (inclusive)
   * - actuatorId: filter by target actuator
   * - limit: max number of records to return
   */
  getHistory(filter: ProvenanceFilter): ActionProvenance[] {
    let results: ActionProvenance[] = [];

    for (const id of this.orderedIds) {
      const record = this.records.get(id)!;

      if (filter.source !== undefined && record.source !== filter.source) {
        continue;
      }
      if (filter.startTime !== undefined && record.timestamp < filter.startTime) {
        continue;
      }
      if (filter.endTime !== undefined && record.timestamp > filter.endTime) {
        continue;
      }
      if (filter.actuatorId !== undefined && record.command.actuatorId !== filter.actuatorId) {
        continue;
      }

      results.push(record);
    }

    if (filter.limit !== undefined && results.length > filter.limit) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Compute the fraction of commands from the reflexive path within the
   * given time window (measured backwards from the latest recorded timestamp).
   * Returns 0 if no commands exist.
   */
  getReflexiveRatio(window: Duration): number {
    if (this.orderedIds.length === 0) {
      return 0;
    }

    // Find the latest timestamp
    const latest = this.records.get(this.orderedIds[this.orderedIds.length - 1])!;
    const windowStart = latest.timestamp - window;

    let total = 0;
    let reflexive = 0;

    for (const id of this.orderedIds) {
      const record = this.records.get(id)!;
      if (record.timestamp >= windowStart) {
        total++;
        if (record.source === 'REFLEXIVE') {
          reflexive++;
        }
      }
    }

    return total === 0 ? 0 : reflexive / total;
  }

  /**
   * Attach a retroactive conscious claim to an existing provenance record.
   * This allows the consciousness substrate to "claim" or "disown" a
   * reflexive action after the fact.
   * Throws if the provenance ID is not found.
   */
  retroactiveClaim(provenanceId: ProvenanceId, claim: ConsciousClaim): void {
    const record = this.records.get(provenanceId);
    if (!record) {
      throw new Error(`Provenance record not found: ${provenanceId}`);
    }
    record.consciousClaim = claim;
  }
}
