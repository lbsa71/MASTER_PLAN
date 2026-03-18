/**
 * Retrieval Engine Tests (0.3.1.5.3)
 *
 * Tests the shared ranking functions used by episodic and semantic memory:
 *   - cosineSimilarity
 *   - recencyWeight
 *   - salienceBoost
 *   - compositeScore
 *   - scoreEpisodicEntry / scoreSemanticEntry
 *   - topK / mergeAndRank
 */

import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  recencyWeight,
  salienceBoost,
  compositeScore,
  scoreEpisodicEntry,
  scoreSemanticEntry,
  topK,
  mergeAndRank,
  extractCueEmbedding,
  DEFAULT_RECENCY_HALF_LIFE_MS,
  MAX_SALIENCE_BOOST,
  NO_EMBEDDING_SIMILARITY,
} from '../retrieval.js';
import type { EpisodicEntry, SemanticEntry, RetrievalResult } from '../types.js';

// ── Helpers ──────────────────────────────────────────────────

function makeEpisodicEntry(
  overrides: Partial<EpisodicEntry> = {},
): EpisodicEntry {
  return {
    id: 'ep-1',
    percept: { modality: 'text', features: {}, timestamp: 1000 },
    experientialState: {
      timestamp: 1000,
      phenomenalContent: { modalities: ['text'], richness: 0.5, raw: null },
      intentionalContent: { target: 'test', clarity: 0.8 },
      valence: 0,
      arousal: 0,
      unityIndex: 0.5,
      continuityToken: { id: 'c1', previousId: null, timestamp: 1000 },
    },
    actionTaken: null,
    outcomeObserved: null,
    emotionalTrace: { valence: 0, arousal: 0 },
    recordedAt: 1000,
    embedding: null,
    retrievalCount: 0,
    lastRetrievedAt: null,
    ...overrides,
  };
}

function makeSemanticEntry(
  overrides: Partial<SemanticEntry> = {},
): SemanticEntry {
  return {
    id: 'sem-1',
    topic: 'test',
    content: 'test content',
    relationships: [],
    sourceEpisodeIds: [],
    confidence: 0.5,
    createdAt: 1000,
    lastReinforcedAt: 1000,
    embedding: null,
    ...overrides,
  };
}

// ── cosineSimilarity ─────────────────────────────────────────

describe('cosineSimilarity', () => {
  it('returns 1.0 for identical unit vectors', () => {
    const v = [1, 0, 0];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
  });

  it('returns 0.0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
  });

  it('returns NO_EMBEDDING_SIMILARITY for null vectors', () => {
    expect(cosineSimilarity(null, [1, 0])).toBe(NO_EMBEDDING_SIMILARITY);
    expect(cosineSimilarity([1, 0], null)).toBe(NO_EMBEDDING_SIMILARITY);
    expect(cosineSimilarity(null, null)).toBe(NO_EMBEDDING_SIMILARITY);
  });

  it('returns NO_EMBEDDING_SIMILARITY for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(NO_EMBEDDING_SIMILARITY);
  });

  it('returns NO_EMBEDDING_SIMILARITY for mismatched lengths', () => {
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(NO_EMBEDDING_SIMILARITY);
  });

  it('returns NO_EMBEDDING_SIMILARITY for zero-magnitude vector', () => {
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(NO_EMBEDDING_SIMILARITY);
  });

  it('clamps negative cosine (anti-parallel vectors) to 0', () => {
    // Anti-parallel vectors have cosine = -1
    expect(cosineSimilarity([1, 0], [-1, 0])).toBe(0);
  });

  it('correctly scores a non-trivial similarity', () => {
    const a = [1, 1];
    const b = [1, 0];
    // dot = 1, |a| = sqrt(2), |b| = 1 → cos = 1/sqrt(2) ≈ 0.707
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.707, 2);
  });
});

// ── recencyWeight ────────────────────────────────────────────

describe('recencyWeight', () => {
  it('returns 1.0 when referenceTime === now', () => {
    expect(recencyWeight(1000, 1000)).toBeCloseTo(1.0);
  });

  it('returns 0.5 at exactly one half-life', () => {
    const ref = 0;
    const now = DEFAULT_RECENCY_HALF_LIFE_MS;
    expect(recencyWeight(ref, now, DEFAULT_RECENCY_HALF_LIFE_MS)).toBeCloseTo(0.5, 5);
  });

  it('returns 0.25 at two half-lives', () => {
    const ref = 0;
    const now = 2 * DEFAULT_RECENCY_HALF_LIFE_MS;
    expect(recencyWeight(ref, now, DEFAULT_RECENCY_HALF_LIFE_MS)).toBeCloseTo(0.25, 5);
  });

  it('returns a value in (0, 1] always', () => {
    const result = recencyWeight(0, 1_000_000_000);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1.0);
  });

  it('treats future referenceTime (negative elapsed) as now', () => {
    // elapsed = max(0, now - ref) = 0 → weight = 1.0
    expect(recencyWeight(2000, 1000)).toBeCloseTo(1.0);
  });

  it('supports custom halfLifeMs', () => {
    const halfLife = 1000;
    expect(recencyWeight(0, halfLife, halfLife)).toBeCloseTo(0.5, 5);
  });
});

// ── salienceBoost ────────────────────────────────────────────

describe('salienceBoost', () => {
  it('returns 1.0 for neutral emotion (valence=0, arousal=0)', () => {
    expect(salienceBoost(0, 0)).toBeCloseTo(1.0);
  });

  it('returns MAX_SALIENCE_BOOST for maximum intensity (|valence|=1, arousal=1)', () => {
    expect(salienceBoost(1, 1)).toBeCloseTo(MAX_SALIENCE_BOOST);
    expect(salienceBoost(-1, 1)).toBeCloseTo(MAX_SALIENCE_BOOST);
  });

  it('treats strongly negative valence same as strongly positive', () => {
    const boost_pos = salienceBoost(0.8, 0.5);
    const boost_neg = salienceBoost(-0.8, 0.5);
    expect(boost_pos).toBeCloseTo(boost_neg);
  });

  it('returns value in [1.0, MAX_SALIENCE_BOOST]', () => {
    for (const [v, a] of [[0, 0], [0.5, 0.5], [-1, 1], [1, 0], [0, 1]] as const) {
      const b = salienceBoost(v, a);
      expect(b).toBeGreaterThanOrEqual(1.0);
      expect(b).toBeLessThanOrEqual(MAX_SALIENCE_BOOST + 1e-10);
    }
  });

  it('ignores negative arousal (clamps to 0)', () => {
    // Negative arousal is not physically meaningful; formula uses max(0, arousal)
    const withNegArousal = salienceBoost(0, -1);
    const withZeroArousal = salienceBoost(0, 0);
    expect(withNegArousal).toBeCloseTo(withZeroArousal);
  });
});

// ── compositeScore ────────────────────────────────────────────

describe('compositeScore', () => {
  it('returns product of three factors', () => {
    expect(compositeScore(0.8, 0.7, 1.5)).toBeCloseTo(0.8 * 0.7 * 1.5);
  });

  it('returns 0 when any factor is 0', () => {
    expect(compositeScore(0, 0.7, 1.5)).toBe(0);
    expect(compositeScore(0.8, 0, 1.5)).toBe(0);
    expect(compositeScore(0.8, 0.7, 0)).toBe(0);
  });
});

// ── scoreEpisodicEntry ────────────────────────────────────────

describe('scoreEpisodicEntry', () => {
  it('produces a RetrievalResult with type=episodic', () => {
    const entry = makeEpisodicEntry({ recordedAt: 1000 });
    const result = scoreEpisodicEntry(entry, null, 1000);
    expect(result.type).toBe('episodic');
    expect(result.entry).toBe(entry);
  });

  it('uses NO_EMBEDDING_SIMILARITY when embeddings are absent', () => {
    const entry = makeEpisodicEntry({ embedding: null, recordedAt: 1000 });
    const result = scoreEpisodicEntry(entry, null, 1000);
    expect(result.similarity).toBe(NO_EMBEDDING_SIMILARITY);
  });

  it('computes higher score for recent entry vs old entry', () => {
    const now = 10_000;
    const recent = makeEpisodicEntry({ id: 'r', recordedAt: now - 100 });
    const old = makeEpisodicEntry({ id: 'o', recordedAt: now - DEFAULT_RECENCY_HALF_LIFE_MS });
    const rResult = scoreEpisodicEntry(recent, null, now);
    const oResult = scoreEpisodicEntry(old, null, now);
    expect(rResult.compositeScore).toBeGreaterThan(oResult.compositeScore);
  });

  it('uses lastRetrievedAt as recency reference when present', () => {
    const now = 10_000;
    // recordedAt is ancient, but lastRetrievedAt is recent
    const entryA = makeEpisodicEntry({
      id: 'a',
      recordedAt: 0,
      lastRetrievedAt: now - 100,
    });
    // Both timestamps ancient
    const entryB = makeEpisodicEntry({
      id: 'b',
      recordedAt: 0,
      lastRetrievedAt: null,
    });
    const rA = scoreEpisodicEntry(entryA, null, now);
    const rB = scoreEpisodicEntry(entryB, null, now);
    expect(rA.compositeScore).toBeGreaterThan(rB.compositeScore);
  });

  it('gives higher score to emotionally salient entry', () => {
    const now = 1000;
    const salient = makeEpisodicEntry({
      id: 's',
      recordedAt: now,
      emotionalTrace: { valence: 0.9, arousal: 0.9 },
    });
    const neutral = makeEpisodicEntry({
      id: 'n',
      recordedAt: now,
      emotionalTrace: { valence: 0, arousal: 0 },
    });
    const rS = scoreEpisodicEntry(salient, null, now);
    const rN = scoreEpisodicEntry(neutral, null, now);
    expect(rS.compositeScore).toBeGreaterThan(rN.compositeScore);
  });

  it('uses cue embedding for similarity when provided', () => {
    const cueEmb = [1, 0, 0];
    const matchEmb = [1, 0, 0];
    const mismatchEmb = [0, 1, 0];
    const now = 1000;
    const match = makeEpisodicEntry({ id: 'm', recordedAt: now, embedding: matchEmb });
    const mismatch = makeEpisodicEntry({ id: 'mm', recordedAt: now, embedding: mismatchEmb });
    const rMatch = scoreEpisodicEntry(match, cueEmb, now);
    const rMismatch = scoreEpisodicEntry(mismatch, cueEmb, now);
    expect(rMatch.similarity).toBeCloseTo(1.0);
    expect(rMismatch.similarity).toBeCloseTo(0.0);
    expect(rMatch.compositeScore).toBeGreaterThan(rMismatch.compositeScore);
  });
});

// ── scoreSemanticEntry ────────────────────────────────────────

describe('scoreSemanticEntry', () => {
  it('produces a RetrievalResult with type=semantic', () => {
    const entry = makeSemanticEntry();
    const result = scoreSemanticEntry(entry, null, 1000);
    expect(result.type).toBe('semantic');
    expect(result.entry).toBe(entry);
  });

  it('always has salienceBoost=1.0 (no emotional trace)', () => {
    const entry = makeSemanticEntry();
    const result = scoreSemanticEntry(entry, null, 1000);
    expect(result.salienceBoost).toBe(1.0);
  });

  it('uses lastReinforcedAt for recency', () => {
    const now = 10_000;
    const recent = makeSemanticEntry({ id: 's1', lastReinforcedAt: now - 100 });
    const old = makeSemanticEntry({ id: 's2', lastReinforcedAt: now - DEFAULT_RECENCY_HALF_LIFE_MS });
    const rRecent = scoreSemanticEntry(recent, null, now);
    const rOld = scoreSemanticEntry(old, null, now);
    expect(rRecent.compositeScore).toBeGreaterThan(rOld.compositeScore);
  });
});

// ── topK ─────────────────────────────────────────────────────

describe('topK', () => {
  function makeResult(score: number): RetrievalResult {
    return {
      type: 'episodic',
      entry: makeEpisodicEntry(),
      compositeScore: score,
      similarity: score,
      recencyWeight: 1,
      salienceBoost: 1,
    };
  }

  it('returns at most k results', () => {
    const results = [3, 1, 4, 1, 5, 9, 2, 6].map(makeResult);
    expect(topK(results, 3)).toHaveLength(3);
  });

  it('returns all results when k >= length', () => {
    const results = [3, 1, 4].map(makeResult);
    expect(topK(results, 10)).toHaveLength(3);
  });

  it('returns results sorted by compositeScore descending', () => {
    const results = [3, 1, 4, 1, 5, 9].map(makeResult);
    const top = topK(results, 4);
    expect(top[0].compositeScore).toBe(9);
    expect(top[1].compositeScore).toBe(5);
    expect(top[2].compositeScore).toBe(4);
    expect(top[3].compositeScore).toBe(3);
  });

  it('returns empty array for k=0', () => {
    const results = [1, 2, 3].map(makeResult);
    expect(topK(results, 0)).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(topK([], 5)).toHaveLength(0);
  });

  it('does not mutate the input array', () => {
    const results = [3, 1, 2].map(makeResult);
    const original = [...results];
    topK(results, 2);
    expect(results.map(r => r.compositeScore)).toEqual(original.map(r => r.compositeScore));
  });
});

// ── mergeAndRank ─────────────────────────────────────────────

describe('mergeAndRank', () => {
  function makeEpResult(score: number): RetrievalResult {
    return {
      type: 'episodic',
      entry: makeEpisodicEntry(),
      compositeScore: score,
      similarity: score,
      recencyWeight: 1,
      salienceBoost: 1,
    };
  }
  function makeSemResult(score: number): RetrievalResult {
    return {
      type: 'semantic',
      entry: makeSemanticEntry(),
      compositeScore: score,
      similarity: score,
      recencyWeight: 1,
      salienceBoost: 1,
    };
  }

  it('merges both lists and returns global top-k', () => {
    const episodic = [makeEpResult(0.9), makeEpResult(0.3)];
    const semantic = [makeSemResult(0.8), makeSemResult(0.1)];
    const merged = mergeAndRank(episodic, semantic, 3);
    expect(merged).toHaveLength(3);
    expect(merged[0].compositeScore).toBe(0.9);
    expect(merged[1].compositeScore).toBe(0.8);
    expect(merged[2].compositeScore).toBe(0.3);
  });

  it('handles empty episodic list', () => {
    const semantic = [makeSemResult(0.8), makeSemResult(0.5)];
    const merged = mergeAndRank([], semantic, 2);
    expect(merged).toHaveLength(2);
    expect(merged[0].type).toBe('semantic');
  });

  it('handles empty semantic list', () => {
    const episodic = [makeEpResult(0.9)];
    const merged = mergeAndRank(episodic, [], 2);
    expect(merged).toHaveLength(1);
    expect(merged[0].type).toBe('episodic');
  });
});

// ── extractCueEmbedding ──────────────────────────────────────

describe('extractCueEmbedding', () => {
  it('returns pre-computed embedding if present', () => {
    const emb = [1, 2, 3];
    expect(extractCueEmbedding({ embedding: emb })).toBe(emb);
  });

  it('returns null when no embedding is present', () => {
    expect(extractCueEmbedding({ text: 'hello' })).toBeNull();
    expect(extractCueEmbedding({})).toBeNull();
  });
});
