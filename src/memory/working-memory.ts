/**
 * Memory Architecture — Working Memory (0.3.1.5.3)
 *
 * Implements the bounded cognitive workspace: a fixed-capacity slot buffer
 * that maps to the LLM context window. Slots compete for capacity by
 * relevanceScore — the lowest-scoring slot is evicted when the buffer is full.
 *
 * This models the GWT "global workspace": a shared broadcast medium where
 * currently active percepts, goals, retrieved episodes, deliberation context,
 * and self-model predictions compete for attention.
 */

import type { IWorkingMemory } from './interfaces.js';
import type { WorkingMemorySlot, MemoryId } from './types.js';

// ── ID generation ────────────────────────────────────────────

let _counter = 0;

/**
 * Generates a lightweight unique id for working-memory slots.
 * Uses a monotonic counter combined with epoch ms — sufficient for
 * in-process uniqueness without a uuid dependency.
 */
function newSlotId(): string {
  return `wm-${Date.now()}-${++_counter}`;
}

// ── WorkingMemory ────────────────────────────────────────────

/**
 * Bounded cognitive workspace — concrete implementation of IWorkingMemory.
 *
 * Invariants:
 *   - `slots().length <= capacity` at all times
 *   - `slots()` is always ordered by relevanceScore descending
 *   - `add()` is O(n) in capacity (small constant in practice)
 *   - `snapshot()` returns a stable copy — mutations after snapshot do not
 *     affect the returned array
 */
export class WorkingMemory implements IWorkingMemory {
  readonly capacity: number;

  /** Internal storage, kept sorted high → low by relevanceScore. */
  private _slots: WorkingMemorySlot[] = [];

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new RangeError(
        `WorkingMemory capacity must be > 0, got ${capacity}`,
      );
    }
    this.capacity = capacity;
  }

  // ── IWorkingMemory ───────────────────────────────────────

  slots(): WorkingMemorySlot[] {
    return [...this._slots];
  }

  add(slotInput: Omit<WorkingMemorySlot, 'id' | 'enteredAt'>): WorkingMemorySlot {
    const slot: WorkingMemorySlot = {
      ...slotInput,
      id: newSlotId(),
      enteredAt: Date.now(),
    };

    this._insertSorted(slot);

    // If we exceeded capacity, drop the lowest-scoring slot (tail of sorted array).
    // This may be the slot we just inserted if its score is the lowest present.
    if (this._slots.length > this.capacity) {
      this._slots.pop();
    }

    return slot;
  }

  evict(id: MemoryId): void {
    const idx = this._slots.findIndex(s => s.id === id);
    if (idx !== -1) {
      this._slots.splice(idx, 1);
    }
  }

  updateRelevance(id: MemoryId, newScore: number): void {
    const idx = this._slots.findIndex(s => s.id === id);
    if (idx === -1) return;

    // Replace in place with updated score then re-sort
    const existing = this._slots[idx];
    this._slots.splice(idx, 1);
    const updated: WorkingMemorySlot = { ...existing, relevanceScore: newScore };
    this._insertSorted(updated);
  }

  snapshot(): WorkingMemorySlot[] {
    // Return a shallow copy — caller gets a stable point-in-time view
    return [...this._slots];
  }

  clear(): void {
    this._slots = [];
  }

  // ── Private helpers ──────────────────────────────────────

  /**
   * Inserts a slot into `_slots` maintaining descending relevanceScore order.
   * Binary search for insertion point → O(log n) comparisons, O(n) splice.
   */
  private _insertSorted(slot: WorkingMemorySlot): void {
    let lo = 0;
    let hi = this._slots.length;

    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this._slots[mid].relevanceScore >= slot.relevanceScore) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    this._slots.splice(lo, 0, slot);
  }
}
