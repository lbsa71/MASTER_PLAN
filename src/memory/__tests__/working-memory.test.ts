/**
 * Working Memory Tests (0.3.1.5.3)
 *
 * Tests the bounded cognitive workspace:
 *   - Capacity enforcement and overflow eviction
 *   - Slot ordering by relevanceScore
 *   - evict() / updateRelevance() / clear()
 *   - snapshot() serialisation for LLM context injection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkingMemory } from '../working-memory.js';
import type { WorkingMemorySlot } from '../types.js';

// ── Helpers ──────────────────────────────────────────────────

function makeSlotInput(
  overrides: Partial<Omit<WorkingMemorySlot, 'id' | 'enteredAt'>> = {},
): Omit<WorkingMemorySlot, 'id' | 'enteredAt'> {
  return {
    kind: 'percept',
    content: { text: 'hello' },
    relevanceScore: 0.5,
    ...overrides,
  };
}

// ── Construction ─────────────────────────────────────────────

describe('WorkingMemory construction', () => {
  it('creates an empty workspace with the given capacity', () => {
    const wm = new WorkingMemory(5);
    expect(wm.capacity).toBe(5);
    expect(wm.slots()).toHaveLength(0);
  });

  it('throws for capacity ≤ 0', () => {
    expect(() => new WorkingMemory(0)).toThrow();
    expect(() => new WorkingMemory(-1)).toThrow();
  });
});

// ── add() ────────────────────────────────────────────────────

describe('WorkingMemory.add()', () => {
  let wm: WorkingMemory;
  beforeEach(() => { wm = new WorkingMemory(3); });

  it('returns a slot with generated id and enteredAt', () => {
    const before = Date.now();
    const slot = wm.add(makeSlotInput());
    const after = Date.now();

    expect(typeof slot.id).toBe('string');
    expect(slot.id.length).toBeGreaterThan(0);
    expect(slot.enteredAt).toBeGreaterThanOrEqual(before);
    expect(slot.enteredAt).toBeLessThanOrEqual(after);
  });

  it('stores the slot and it appears in slots()', () => {
    const added = wm.add(makeSlotInput({ relevanceScore: 0.8 }));
    const found = wm.slots().find(s => s.id === added.id);
    expect(found).toBeDefined();
    expect(found!.relevanceScore).toBe(0.8);
  });

  it('slots() returns items ordered by relevanceScore descending', () => {
    wm.add(makeSlotInput({ relevanceScore: 0.3 }));
    wm.add(makeSlotInput({ relevanceScore: 0.9 }));
    wm.add(makeSlotInput({ relevanceScore: 0.6 }));

    const scores = wm.slots().map(s => s.relevanceScore);
    expect(scores).toEqual([0.9, 0.6, 0.3]);
  });

  it('evicts the lowest-relevance slot when at capacity', () => {
    wm.add(makeSlotInput({ relevanceScore: 0.9, content: 'high' }));
    wm.add(makeSlotInput({ relevanceScore: 0.1, content: 'low' }));
    wm.add(makeSlotInput({ relevanceScore: 0.5, content: 'mid' }));

    // Buffer is now full (capacity=3). Add a higher-priority slot.
    wm.add(makeSlotInput({ relevanceScore: 0.7, content: 'new' }));

    const contents = wm.slots().map(s => s.content);
    // 'low' (0.1) should have been evicted
    expect(wm.slots()).toHaveLength(3);
    expect(contents).not.toContain('low');
    expect(contents).toContain('new');
  });

  it('evicts the lowest slot even when the incoming slot has the same low score', () => {
    wm.add(makeSlotInput({ relevanceScore: 0.9 }));
    wm.add(makeSlotInput({ relevanceScore: 0.2 }));
    wm.add(makeSlotInput({ relevanceScore: 0.2 }));

    // Both 0.2 slots are tied; adding one more must still evict one of them.
    wm.add(makeSlotInput({ relevanceScore: 0.2, content: 'newest' }));
    expect(wm.slots()).toHaveLength(3);
  });

  it('generates unique ids across multiple additions', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const wm2 = new WorkingMemory(20);
      ids.add(wm2.add(makeSlotInput()).id);
    }
    // At minimum all ids in a single WorkingMemory should be unique
    const wm3 = new WorkingMemory(20);
    const idsInOne = new Set<string>();
    for (let i = 0; i < 10; i++) {
      idsInOne.add(wm3.add(makeSlotInput()).id);
    }
    expect(idsInOne.size).toBe(10);
  });

  it('supports all slot kinds', () => {
    const kinds: WorkingMemorySlot['kind'][] = [
      'percept', 'goal', 'retrieved-episode', 'deliberation-context', 'self-model',
    ];
    const wm2 = new WorkingMemory(10);
    for (const kind of kinds) {
      const slot = wm2.add(makeSlotInput({ kind }));
      expect(slot.kind).toBe(kind);
    }
  });
});

// ── evict() ──────────────────────────────────────────────────

describe('WorkingMemory.evict()', () => {
  let wm: WorkingMemory;
  beforeEach(() => { wm = new WorkingMemory(5); });

  it('removes a slot by id', () => {
    const s = wm.add(makeSlotInput());
    expect(wm.slots()).toHaveLength(1);
    wm.evict(s.id);
    expect(wm.slots()).toHaveLength(0);
  });

  it('no-ops when id is not found', () => {
    wm.add(makeSlotInput());
    expect(() => wm.evict('nonexistent-id')).not.toThrow();
    expect(wm.slots()).toHaveLength(1);
  });

  it('does not affect other slots', () => {
    const a = wm.add(makeSlotInput({ relevanceScore: 0.9 }));
    const b = wm.add(makeSlotInput({ relevanceScore: 0.5 }));
    wm.evict(a.id);
    expect(wm.slots()).toHaveLength(1);
    expect(wm.slots()[0].id).toBe(b.id);
  });
});

// ── updateRelevance() ────────────────────────────────────────

describe('WorkingMemory.updateRelevance()', () => {
  let wm: WorkingMemory;
  beforeEach(() => { wm = new WorkingMemory(5); });

  it('updates the relevanceScore of an existing slot', () => {
    const s = wm.add(makeSlotInput({ relevanceScore: 0.3 }));
    wm.updateRelevance(s.id, 0.95);
    const updated = wm.slots().find(sl => sl.id === s.id);
    expect(updated!.relevanceScore).toBe(0.95);
  });

  it('re-sorts slots after update', () => {
    wm.add(makeSlotInput({ relevanceScore: 0.8 }));
    const low = wm.add(makeSlotInput({ relevanceScore: 0.1 }));

    wm.updateRelevance(low.id, 0.99);
    expect(wm.slots()[0].id).toBe(low.id);
  });

  it('no-ops when id is not found', () => {
    const s = wm.add(makeSlotInput({ relevanceScore: 0.5 }));
    expect(() => wm.updateRelevance('ghost-id', 0.9)).not.toThrow();
    expect(wm.slots()[0].relevanceScore).toBe(0.5);
    expect(wm.slots()[0].id).toBe(s.id);
  });
});

// ── clear() ──────────────────────────────────────────────────

describe('WorkingMemory.clear()', () => {
  it('removes all slots', () => {
    const wm = new WorkingMemory(5);
    wm.add(makeSlotInput());
    wm.add(makeSlotInput());
    wm.clear();
    expect(wm.slots()).toHaveLength(0);
  });

  it('allows adding new slots after clear', () => {
    const wm = new WorkingMemory(2);
    wm.add(makeSlotInput());
    wm.add(makeSlotInput());
    wm.clear();
    const s = wm.add(makeSlotInput({ relevanceScore: 0.7 }));
    expect(wm.slots()).toHaveLength(1);
    expect(wm.slots()[0].id).toBe(s.id);
  });
});

// ── snapshot() ───────────────────────────────────────────────

describe('WorkingMemory.snapshot()', () => {
  it('returns a copy of slots (not the live array)', () => {
    const wm = new WorkingMemory(5);
    wm.add(makeSlotInput());
    const snap = wm.snapshot();

    wm.add(makeSlotInput({ relevanceScore: 0.99 }));
    // Original snapshot should still have only 1 item
    expect(snap).toHaveLength(1);
    expect(wm.slots()).toHaveLength(2);
  });

  it('snapshot is ordered by relevanceScore descending', () => {
    const wm = new WorkingMemory(5);
    wm.add(makeSlotInput({ relevanceScore: 0.2 }));
    wm.add(makeSlotInput({ relevanceScore: 0.8 }));
    wm.add(makeSlotInput({ relevanceScore: 0.5 }));

    const scores = wm.snapshot().map(s => s.relevanceScore);
    expect(scores).toEqual([0.8, 0.5, 0.2]);
  });

  it('returns empty array when no slots', () => {
    const wm = new WorkingMemory(3);
    expect(wm.snapshot()).toEqual([]);
  });
});

// ── Capacity boundary ────────────────────────────────────────

describe('WorkingMemory capacity boundary', () => {
  it('never exceeds capacity', () => {
    const wm = new WorkingMemory(3);
    for (let i = 0; i < 20; i++) {
      wm.add(makeSlotInput({ relevanceScore: Math.random() }));
      expect(wm.slots().length).toBeLessThanOrEqual(3);
    }
  });

  it('capacity=1 always keeps the highest-score slot seen so far', () => {
    const wm = new WorkingMemory(1);
    wm.add(makeSlotInput({ relevanceScore: 0.3, content: 'a' }));
    wm.add(makeSlotInput({ relevanceScore: 0.9, content: 'b' }));
    wm.add(makeSlotInput({ relevanceScore: 0.1, content: 'c' }));

    // After the 0.9 beat 0.3, then 0.1 should not beat 0.9
    expect(wm.slots()).toHaveLength(1);
    expect(wm.slots()[0].content).toBe('b');
  });
});
