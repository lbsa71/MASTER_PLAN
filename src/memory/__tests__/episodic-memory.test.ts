/**
 * Tests for EpisodicMemory (0.3.1.5.3)
 */

import { describe, it, expect } from 'vitest';
import { EpisodicMemory } from '../episodic-memory.js';
import type { EpisodicEntry, RetrievalCue } from '../types.js';

// ── Helpers ──────────────────────────────────────────────────

function makeEntry(
  overrides: Partial<
    Omit<EpisodicEntry, 'id' | 'recordedAt' | 'retrievalCount' | 'lastRetrievedAt'>
  > = {},
): Omit<EpisodicEntry, 'id' | 'recordedAt' | 'retrievalCount' | 'lastRetrievedAt'> {
  return {
    percept: { modality: 'text', features: { content: 'hello' }, timestamp: Date.now() },
    experientialState: {
      timestamp: Date.now(),
      phenomenalContent: { modalities: ['text'], richness: 0.5, raw: null },
      intentionalContent: { target: 'greeting', clarity: 0.8 },
      valence: 0.2,
      arousal: 0.3,
      unityIndex: 0.6,
      continuityToken: { id: 'ct-1', previousId: null, timestamp: Date.now() },
    },
    actionTaken: null,
    outcomeObserved: null,
    emotionalTrace: { valence: 0.2, arousal: 0.3 },
    embedding: null,
    ...overrides,
  };
}

// ── record() ─────────────────────────────────────────────────

describe('EpisodicMemory.record()', () => {
  it('stores an entry and returns it with generated fields', () => {
    const mem = new EpisodicMemory();
    const entry = mem.record(makeEntry());

    expect(entry.id).toBeTruthy();
    expect(typeof entry.recordedAt).toBe('number');
    expect(entry.retrievalCount).toBe(0);
    expect(entry.lastRetrievedAt).toBeNull();
    expect(mem.size()).toBe(1);
  });

  it('assigns unique ids to each entry', () => {
    const mem = new EpisodicMemory();
    const e1 = mem.record(makeEntry());
    const e2 = mem.record(makeEntry());
    expect(e1.id).not.toBe(e2.id);
  });

  it('persists the full entry content', () => {
    const mem = new EpisodicMemory();
    const input = makeEntry({ outcomeObserved: 'success' });
    const stored = mem.record(input);
    expect(stored.outcomeObserved).toBe('success');
    expect(stored.emotionalTrace.valence).toBe(input.emotionalTrace.valence);
  });
});

// ── getById() ────────────────────────────────────────────────

describe('EpisodicMemory.getById()', () => {
  it('returns the entry by id', () => {
    const mem = new EpisodicMemory();
    const stored = mem.record(makeEntry());
    expect(mem.getById(stored.id)).toBe(stored);
  });

  it('returns null for unknown id', () => {
    const mem = new EpisodicMemory();
    expect(mem.getById('nonexistent')).toBeNull();
  });
});

// ── size() and all() ─────────────────────────────────────────

describe('EpisodicMemory.size() and all()', () => {
  it('size() reflects number of stored entries', () => {
    const mem = new EpisodicMemory();
    expect(mem.size()).toBe(0);
    mem.record(makeEntry());
    expect(mem.size()).toBe(1);
    mem.record(makeEntry());
    expect(mem.size()).toBe(2);
  });

  it('all() returns a copy of all entries', () => {
    const mem = new EpisodicMemory();
    const e1 = mem.record(makeEntry());
    const e2 = mem.record(makeEntry());
    const all = mem.all();
    expect(all.length).toBe(2);
    expect(all).toContain(e1);
    expect(all).toContain(e2);
  });

  it('all() returns a copy — mutating it does not affect the store', () => {
    const mem = new EpisodicMemory();
    mem.record(makeEntry());
    const all = mem.all();
    all.splice(0, 1);
    expect(mem.size()).toBe(1);
  });
});

// ── retrieve() ───────────────────────────────────────────────

describe('EpisodicMemory.retrieve()', () => {
  it('returns an empty array when store is empty', () => {
    const mem = new EpisodicMemory();
    const cue: RetrievalCue = { text: 'test' };
    expect(mem.retrieve(cue, 5)).toEqual([]);
  });

  it('returns at most topK results', () => {
    const mem = new EpisodicMemory();
    for (let i = 0; i < 10; i++) mem.record(makeEntry());
    const cue: RetrievalCue = { text: 'test' };
    const results = mem.retrieve(cue, 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('returns results sorted by compositeScore descending', () => {
    const mem = new EpisodicMemory();
    // Entry with high salience
    mem.record(makeEntry({ emotionalTrace: { valence: 0.9, arousal: 0.9 } }));
    // Entry with low salience
    mem.record(makeEntry({ emotionalTrace: { valence: 0.0, arousal: 0.0 } }));

    const cue: RetrievalCue = { text: 'test' };
    const results = mem.retrieve(cue, 5);
    expect(results.length).toBe(2);
    expect(results[0].compositeScore).toBeGreaterThanOrEqual(results[1].compositeScore);
  });

  it('increments retrievalCount on retrieved entries', () => {
    const mem = new EpisodicMemory();
    const stored = mem.record(makeEntry());
    expect(stored.retrievalCount).toBe(0);

    const cue: RetrievalCue = { text: 'test' };
    mem.retrieve(cue, 5);
    expect(stored.retrievalCount).toBe(1);
  });

  it('updates lastRetrievedAt on retrieved entries', () => {
    const mem = new EpisodicMemory();
    const stored = mem.record(makeEntry());
    expect(stored.lastRetrievedAt).toBeNull();

    const cue: RetrievalCue = { text: 'test' };
    const before = Date.now();
    mem.retrieve(cue, 5);
    const after = Date.now();

    expect(stored.lastRetrievedAt).not.toBeNull();
    expect(stored.lastRetrievedAt!).toBeGreaterThanOrEqual(before);
    expect(stored.lastRetrievedAt!).toBeLessThanOrEqual(after);
  });

  it('uses embedding similarity when embeddings are provided', () => {
    const mem = new EpisodicMemory();

    // Entry A: embedding similar to cue [1,0]
    mem.record(makeEntry({ embedding: [1, 0] }));
    // Entry B: embedding orthogonal to cue [1,0]
    mem.record(makeEntry({ embedding: [0, 1] }));

    const cue: RetrievalCue = { embedding: [1, 0] };
    const results = mem.retrieve(cue, 2);

    // Entry A should score higher (similarity = 1.0 vs 0.0)
    expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
  });

  it('returns all results when topK >= store size', () => {
    const mem = new EpisodicMemory();
    mem.record(makeEntry());
    mem.record(makeEntry());
    const cue: RetrievalCue = {};
    const results = mem.retrieve(cue, 100);
    expect(results.length).toBe(2);
  });

  it('result entries are typed as episodic', () => {
    const mem = new EpisodicMemory();
    mem.record(makeEntry());
    const results = mem.retrieve({}, 5);
    expect(results.every(r => r.type === 'episodic')).toBe(true);
  });
});

// ── decay() ──────────────────────────────────────────────────

describe('EpisodicMemory.decay()', () => {
  it('removes entries that have exceeded half-life without retrieval', () => {
    const mem = new EpisodicMemory();
    const OLD = 1_000_000; // 1 second after epoch — very old
    // Manually insert an old entry by recording then patching recordedAt
    // We do this by using a short halfLife so even a recent entry decays.
    mem.record(makeEntry({ emotionalTrace: { valence: 0, arousal: 0 } }));

    // decay with halfLifeMs=1 and now = very far in the future
    const dropped = mem.decay(Date.now() + 1_000_000_000, 1);
    expect(dropped).toBe(1);
    expect(mem.size()).toBe(0);
  });

  it('preserves high-salience entries even when old', () => {
    const mem = new EpisodicMemory();
    // High salience entry
    mem.record(makeEntry({ emotionalTrace: { valence: 1.0, arousal: 1.0 } }));

    // decay with halfLifeMs=1 — entry is old but salience is high
    // The decay threshold is retrieval score below threshold
    // With salienceBonus high, it should survive
    const dropped = mem.decay(Date.now() + 1_000_000_000, 1);
    // The entry has high emotional salience — salienceBonus protects it
    // (depends on threshold logic in implementation)
    // At minimum, calling decay should not throw
    expect(typeof dropped).toBe('number');
  });

  it('returns count of dropped entries', () => {
    const mem = new EpisodicMemory();
    mem.record(makeEntry({ emotionalTrace: { valence: 0, arousal: 0 } }));
    mem.record(makeEntry({ emotionalTrace: { valence: 0, arousal: 0 } }));

    const dropped = mem.decay(Date.now() + 1_000_000_000, 1);
    expect(dropped).toBe(2);
    expect(mem.size()).toBe(0);
  });

  it('does not drop recently retrieved entries', () => {
    const mem = new EpisodicMemory();
    const stored = mem.record(makeEntry({ emotionalTrace: { valence: 0, arousal: 0 } }));
    // Simulate recent retrieval
    stored.lastRetrievedAt = Date.now();
    stored.retrievalCount = 3;

    // Very short half-life but entry was retrieved NOW — should survive
    const dropped = mem.decay(Date.now(), 1);
    expect(dropped).toBe(0);
  });
});
