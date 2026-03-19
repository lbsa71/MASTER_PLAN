/**
 * Semantic Memory Tests (0.3.1.5.3)
 *
 * Tests for the SemanticMemory implementation:
 *   - store(): persists entries with generated id, createdAt, lastReinforcedAt
 *   - retrieve(): ranks by composite score (similarity * recencyWeight * salienceBoost)
 *   - reinforce(): increases confidence, appends sourceEpisodeId, updates lastReinforcedAt
 *   - getById(): returns entry or null
 *   - getByTopic(): exact and prefix matching
 *   - size() / all()
 */

import { describe, it, expect } from 'vitest';
import { SemanticMemory } from '../semantic-memory.js';
import type { SemanticEntry } from '../types.js';

// ── Test helpers ─────────────────────────────────────────────

function makeInput(
  overrides: Partial<Omit<SemanticEntry, 'id' | 'createdAt' | 'lastReinforcedAt'>> = {},
): Omit<SemanticEntry, 'id' | 'createdAt' | 'lastReinforcedAt'> {
  return {
    topic: 'test-topic',
    content: 'A generalised knowledge fact.',
    relationships: [],
    sourceEpisodeIds: ['ep-001'],
    confidence: 0.7,
    embedding: null,
    ...overrides,
  };
}

// ── store() ──────────────────────────────────────────────────

describe('SemanticMemory.store()', () => {
  it('assigns a unique id to each stored entry', () => {
    const mem = new SemanticMemory();
    const a = mem.store(makeInput());
    const b = mem.store(makeInput());
    expect(a.id).not.toBe(b.id);
    expect(typeof a.id).toBe('string');
    expect(a.id.length).toBeGreaterThan(0);
  });

  it('stamps createdAt and lastReinforcedAt on creation', () => {
    const before = Date.now();
    const mem = new SemanticMemory();
    const entry = mem.store(makeInput());
    const after = Date.now();

    expect(entry.createdAt).toBeGreaterThanOrEqual(before);
    expect(entry.createdAt).toBeLessThanOrEqual(after);
    expect(entry.lastReinforcedAt).toBeGreaterThanOrEqual(before);
    expect(entry.lastReinforcedAt).toBeLessThanOrEqual(after);
  });

  it('preserves topic, content, relationships, sourceEpisodeIds, confidence, embedding', () => {
    const mem = new SemanticMemory();
    const input = makeInput({
      topic: 'physics',
      content: 'Objects fall at 9.8 m/s²',
      relationships: [{ targetId: 'sem-007', relation: 'causes' }],
      sourceEpisodeIds: ['ep-001', 'ep-002'],
      confidence: 0.85,
      embedding: [0.1, 0.2, 0.3],
    });
    const entry = mem.store(input);

    expect(entry.topic).toBe('physics');
    expect(entry.content).toBe('Objects fall at 9.8 m/s²');
    expect(entry.relationships).toEqual([{ targetId: 'sem-007', relation: 'causes' }]);
    expect(entry.sourceEpisodeIds).toEqual(['ep-001', 'ep-002']);
    expect(entry.confidence).toBeCloseTo(0.85);
    expect(entry.embedding).toEqual([0.1, 0.2, 0.3]);
  });

  it('increments size() with each stored entry', () => {
    const mem = new SemanticMemory();
    expect(mem.size()).toBe(0);
    mem.store(makeInput());
    expect(mem.size()).toBe(1);
    mem.store(makeInput());
    expect(mem.size()).toBe(2);
  });
});

// ── getById() ────────────────────────────────────────────────

describe('SemanticMemory.getById()', () => {
  it('returns the entry for a known id', () => {
    const mem = new SemanticMemory();
    const stored = mem.store(makeInput({ topic: 'gravity' }));
    const found = mem.getById(stored.id);
    expect(found).not.toBeNull();
    expect(found!.topic).toBe('gravity');
  });

  it('returns null for an unknown id', () => {
    const mem = new SemanticMemory();
    expect(mem.getById('nonexistent-id')).toBeNull();
  });
});

// ── getByTopic() ─────────────────────────────────────────────

describe('SemanticMemory.getByTopic()', () => {
  it('returns entries whose topic exactly matches', () => {
    const mem = new SemanticMemory();
    mem.store(makeInput({ topic: 'physics' }));
    mem.store(makeInput({ topic: 'chemistry' }));
    mem.store(makeInput({ topic: 'physics' }));

    const results = mem.getByTopic('physics');
    expect(results).toHaveLength(2);
    expect(results.every(e => e.topic === 'physics')).toBe(true);
  });

  it('returns empty array when no entries match the topic', () => {
    const mem = new SemanticMemory();
    mem.store(makeInput({ topic: 'chemistry' }));
    expect(mem.getByTopic('biology')).toHaveLength(0);
  });

  it('supports prefix matching', () => {
    const mem = new SemanticMemory();
    mem.store(makeInput({ topic: 'physics:kinematics' }));
    mem.store(makeInput({ topic: 'physics:thermodynamics' }));
    mem.store(makeInput({ topic: 'chemistry:organic' }));

    const results = mem.getByTopic('physics:');
    expect(results).toHaveLength(2);
    expect(results.every(e => e.topic.startsWith('physics:'))).toBe(true);
  });
});

// ── reinforce() ──────────────────────────────────────────────

describe('SemanticMemory.reinforce()', () => {
  it('appends sourceEpisodeId to sourceEpisodeIds when not already present', () => {
    const mem = new SemanticMemory();
    const entry = mem.store(makeInput({ sourceEpisodeIds: ['ep-001'] }));
    mem.reinforce(entry.id, 'ep-002');

    const updated = mem.getById(entry.id)!;
    expect(updated.sourceEpisodeIds).toContain('ep-002');
    expect(updated.sourceEpisodeIds).toContain('ep-001');
  });

  it('does not duplicate sourceEpisodeId if already present', () => {
    const mem = new SemanticMemory();
    const entry = mem.store(makeInput({ sourceEpisodeIds: ['ep-001'] }));
    mem.reinforce(entry.id, 'ep-001');

    const updated = mem.getById(entry.id)!;
    const occurrences = updated.sourceEpisodeIds.filter(id => id === 'ep-001').length;
    expect(occurrences).toBe(1);
  });

  it('increases confidence (logarithmic saturation toward 1.0)', () => {
    const mem = new SemanticMemory();
    const entry = mem.store(makeInput({ confidence: 0.5 }));
    mem.reinforce(entry.id, 'ep-new');

    const updated = mem.getById(entry.id)!;
    expect(updated.confidence).toBeGreaterThan(0.5);
    expect(updated.confidence).toBeLessThanOrEqual(1.0);
  });

  it('confidence never exceeds 1.0 even with many reinforcements', () => {
    const mem = new SemanticMemory();
    const entry = mem.store(makeInput({ confidence: 0.9 }));
    for (let i = 0; i < 50; i++) {
      mem.reinforce(entry.id, `ep-${i}`);
    }
    const updated = mem.getById(entry.id)!;
    expect(updated.confidence).toBeLessThanOrEqual(1.0);
  });

  it('updates lastReinforcedAt to a time >= the original', () => {
    const mem = new SemanticMemory();
    const entry = mem.store(makeInput());
    const originalTime = entry.lastReinforcedAt;

    // Small pause to ensure timestamp advances
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    return delay(2).then(() => {
      mem.reinforce(entry.id, 'ep-new');
      const updated = mem.getById(entry.id)!;
      expect(updated.lastReinforcedAt).toBeGreaterThanOrEqual(originalTime);
    });
  });

  it('is a no-op for unknown ids', () => {
    const mem = new SemanticMemory();
    expect(() => mem.reinforce('nonexistent-id', 'ep-001')).not.toThrow();
  });
});

// ── retrieve() ───────────────────────────────────────────────

describe('SemanticMemory.retrieve()', () => {
  it('returns empty array when store is empty', () => {
    const mem = new SemanticMemory();
    expect(mem.retrieve({ text: 'test' }, 5)).toHaveLength(0);
  });

  it('returns up to topK results', () => {
    const mem = new SemanticMemory();
    for (let i = 0; i < 10; i++) {
      mem.store(makeInput({ topic: `topic-${i}` }));
    }
    const results = mem.retrieve({ text: 'test' }, 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('returns all entries if fewer than topK exist', () => {
    const mem = new SemanticMemory();
    mem.store(makeInput());
    mem.store(makeInput());
    const results = mem.retrieve({ text: 'test' }, 10);
    expect(results).toHaveLength(2);
  });

  it('all returned results have type "semantic"', () => {
    const mem = new SemanticMemory();
    mem.store(makeInput());
    const results = mem.retrieve({ text: 'query' }, 5);
    expect(results.every(r => r.type === 'semantic')).toBe(true);
  });

  it('results are sorted by compositeScore descending', () => {
    const mem = new SemanticMemory();
    // High similarity: embedding close to cue
    mem.store(makeInput({ embedding: [1, 0, 0], topic: 'high-sim' }));
    // Low similarity: embedding orthogonal to cue
    mem.store(makeInput({ embedding: [0, 1, 0], topic: 'low-sim' }));

    const results = mem.retrieve({ embedding: [1, 0, 0] }, 5);
    if (results.length >= 2) {
      expect(results[0].compositeScore).toBeGreaterThanOrEqual(results[1].compositeScore);
    }
  });

  it('high-similarity entry ranks above low-similarity entry', () => {
    const mem = new SemanticMemory();
    const high = mem.store(makeInput({ embedding: [1, 0, 0], topic: 'high' }));
    mem.store(makeInput({ embedding: [0, 1, 0], topic: 'low' }));

    const results = mem.retrieve({ embedding: [1, 0, 0] }, 5);
    expect(results[0].entry.id).toBe(high.id);
  });

  it('each result includes similarity, recencyWeight, salienceBoost, compositeScore', () => {
    const mem = new SemanticMemory();
    mem.store(makeInput());
    const results = mem.retrieve({ text: 'query' }, 5);
    expect(results.length).toBeGreaterThan(0);
    const r = results[0];
    expect(typeof r.similarity).toBe('number');
    expect(typeof r.recencyWeight).toBe('number');
    expect(typeof r.salienceBoost).toBe('number');
    expect(typeof r.compositeScore).toBe('number');
    // compositeScore = similarity * recencyWeight * salienceBoost
    expect(r.compositeScore).toBeCloseTo(r.similarity * r.recencyWeight * r.salienceBoost);
  });

  it('salienceBoost is 1.0 for semantic entries (no emotional trace)', () => {
    const mem = new SemanticMemory();
    mem.store(makeInput());
    const results = mem.retrieve({ text: 'query' }, 5);
    expect(results[0].salienceBoost).toBe(1.0);
  });
});

// ── all() ────────────────────────────────────────────────────

describe('SemanticMemory.all()', () => {
  it('returns all stored entries', () => {
    const mem = new SemanticMemory();
    const a = mem.store(makeInput({ topic: 'a' }));
    const b = mem.store(makeInput({ topic: 'b' }));
    const all = mem.all();
    expect(all).toHaveLength(2);
    expect(all.map(e => e.id)).toContain(a.id);
    expect(all.map(e => e.id)).toContain(b.id);
  });

  it('returns empty array when store is empty', () => {
    const mem = new SemanticMemory();
    expect(mem.all()).toHaveLength(0);
  });
});
