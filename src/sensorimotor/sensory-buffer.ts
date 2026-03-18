/**
 * Sensory Buffer — rolling time-indexed ring buffer of recent sensory data.
 *
 * Maintains a window of SensoryFrame data from all modalities so the
 * consciousness substrate can access temporally consistent snapshots.
 * Default buffer depth: 2 seconds (10x the conscious processing latency budget).
 *
 * @see docs/sensorimotor-consciousness-integration/ARCHITECTURE.md §3.1
 */

import type { ISensoryBuffer } from './interfaces';
import type {
  SensoryFrame,
  SensorySnapshot,
  ModalityId,
  Timestamp,
  Duration,
} from './types';
import { NS_PER_MS } from './types';

/**
 * Default buffer depth: 2 seconds in nanoseconds.
 * 10x the conscious processing latency budget (200ms).
 */
const DEFAULT_BUFFER_DEPTH: Duration = 2000 * NS_PER_MS;

export class SensoryBuffer implements ISensoryBuffer {
  private frames: SensoryFrame[] = [];
  private bufferDepth: Duration = DEFAULT_BUFFER_DEPTH;

  /**
   * Push a new sensory frame into the buffer.
   * Automatically evicts frames older than the buffer depth relative to
   * the pushed frame's timestamp.
   */
  push(frame: SensoryFrame): void {
    this.frames.push(frame);
    this.evictStale(frame.timestamp);
  }

  /**
   * Get a snapshot at the given timestamp: the latest frame from each
   * modality with timestamp <= the requested time.
   */
  getSnapshot(timestamp: Timestamp): SensorySnapshot {
    const latestByModality = new Map<ModalityId, SensoryFrame>();

    for (const frame of this.frames) {
      if (frame.timestamp > timestamp) {
        continue;
      }
      const existing = latestByModality.get(frame.modalityId);
      if (!existing || frame.timestamp > existing.timestamp) {
        latestByModality.set(frame.modalityId, frame);
      }
    }

    return {
      timestamp,
      frames: latestByModality,
    };
  }

  /**
   * Get all frames within a time window [start, end] (inclusive).
   * Results are ordered chronologically.
   */
  getWindow(start: Timestamp, end: Timestamp): SensoryFrame[] {
    const result: SensoryFrame[] = [];
    for (const frame of this.frames) {
      if (frame.timestamp >= start && frame.timestamp <= end) {
        result.push(frame);
      }
    }
    return result;
  }

  /**
   * Get the latest frame for a specific modality, or null if none buffered.
   */
  getLatestByModality(modalityId: ModalityId): SensoryFrame | null {
    let latest: SensoryFrame | null = null;
    for (const frame of this.frames) {
      if (frame.modalityId === modalityId) {
        if (!latest || frame.timestamp > latest.timestamp) {
          latest = frame;
        }
      }
    }
    return latest;
  }

  /**
   * Returns the current buffer depth in nanoseconds.
   */
  getBufferDepth(): Duration {
    return this.bufferDepth;
  }

  /**
   * Set the buffer depth. Immediately evicts frames that exceed the new depth
   * relative to the latest frame's timestamp.
   */
  setBufferDepth(depth: Duration): void {
    this.bufferDepth = depth;
    if (this.frames.length > 0) {
      const latestTimestamp = this.frames[this.frames.length - 1].timestamp;
      this.evictStale(latestTimestamp);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Remove frames older than (referenceTime - bufferDepth).
   * Since frames are pushed chronologically, we can scan from the front.
   */
  private evictStale(referenceTime: Timestamp): void {
    const cutoff = referenceTime - this.bufferDepth;
    let evictCount = 0;
    for (let i = 0; i < this.frames.length; i++) {
      if (this.frames[i].timestamp < cutoff) {
        evictCount++;
      } else {
        break;
      }
    }
    if (evictCount > 0) {
      this.frames.splice(0, evictCount);
    }
  }
}
