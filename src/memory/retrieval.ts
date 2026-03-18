/**
 * Memory Architecture — Retrieval Engine (0.3.1.5.3)
 *
 * Shared ranking logic used by both episodic and semantic memory stores.
 *
 * Composite score formula:
 *   compositeScore = similarity * recencyWeight * salienceBoost
 *
 * Where:
 *   similarity     — cosine similarity between cue embedding and entry embedding (0..1)
 *   recencyWeight  — exponential decay from creation/reinforcement time (0..1]
 *   salienceBoost  — factor > 1.0 derived from emotional valence/arousal magnitude
 *
 * When no embedding is available (null vectors), similarity defaults to 0.5 so
 * recency and salience still meaningfully rank results.
 */

import type {
  EmbeddingVector,
  EpisodicEntry,
  SemanticEntry,
  RetrievalCue,
  RetrievalResult,
  Timestamp,
} from './types.js';

// ── Constants ────────────────────────────────────────────────

/**
 * Half-life for recency decay in milliseconds.
 * Default: 7 days — entries are at 0.5 weight after 7 days if unretrieved.
 */
export const DEFAULT_RECENCY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Minimum similarity floor when no embeddings are present.
 * Allows recency + salience to differentiate results.
 */
export const NO_EMBEDDING_SIMILARITY = 0.5;

/**
 * Maximum salience boost multiplier.
 * Prevents a single highly-emotional entry from drowning all others.
 */
export const MAX_SALIENCE_BOOST = 3.0;

// ── Core ranking functions ───────────────────────────────────

/**
 * Computes cosine similarity between two embedding vectors.
 *
 * Returns 0.5 (neutral) if either vector is null, empty, or zero-magnitude,
 * avoiding division-by-zero and still allowing other factors to rank results.
 *
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Similarity in [0, 1]
 */
export function cosineSimilarity(
  a: EmbeddingVector | null,
  b: EmbeddingVector | null,
): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return NO_EMBEDDING_SIMILARITY;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  if (magnitude === 0) {
    return NO_EMBEDDING_SIMILARITY;
  }

  // Clamp to [0, 1] — cosine can be negative for dissimilar vectors;
  // we treat negative similarity as 0 (no match) rather than anti-match.
  return Math.max(0, Math.min(1, dot / magnitude));
}

/**
 * Computes recency weight using exponential decay.
 *
 * weight = 2^(-(now - referenceTime) / halfLifeMs)
 *
 * Returns 1.0 when referenceTime === now, decays toward 0 as time passes.
 * Result is clamped to (0, 1].
 *
 * @param referenceTime - Creation or last-retrieval timestamp (epoch ms)
 * @param now           - Current timestamp (epoch ms)
 * @param halfLifeMs    - Time at which weight = 0.5 (default: 7 days)
 * @returns Recency weight in (0, 1]
 */
export function recencyWeight(
  referenceTime: Timestamp,
  now: Timestamp,
  halfLifeMs: number = DEFAULT_RECENCY_HALF_LIFE_MS,
): number {
  const elapsed = Math.max(0, now - referenceTime);
  return Math.pow(2, -elapsed / halfLifeMs);
}

/**
 * Computes a salience boost factor from an emotional trace.
 *
 * Boost = 1.0 + (|valence| + arousal) * (MAX_SALIENCE_BOOST - 1) / 2
 *
 * This means:
 *   - Neutral emotions (valence=0, arousal=0)  → boost = 1.0 (no boost)
 *   - Maximum intensity (|valence|=1, arousal=1) → boost = MAX_SALIENCE_BOOST
 *
 * The formula uses |valence| so both strongly positive and strongly negative
 * emotions are treated as salient — consistent with psychological evidence
 * that emotional salience is orthogonal to valence direction.
 *
 * @param valence - Emotional valence in [-1, 1]
 * @param arousal - Arousal intensity in [0, 1]
 * @returns Salience boost in [1.0, MAX_SALIENCE_BOOST]
 */
export function salienceBoost(valence: number, arousal: number): number {
  const intensity = (Math.abs(valence) + Math.max(0, arousal)) / 2;
  return 1.0 + intensity * (MAX_SALIENCE_BOOST - 1.0);
}

/**
 * Computes the full composite retrieval score.
 *
 * compositeScore = similarity * recencyWeight * salienceBoost
 *
 * All three factors multiply together:
 * - A highly similar but ancient, emotionally-flat entry scores low.
 * - A recent, emotionally-charged entry scores high even with moderate similarity.
 *
 * @param similarity    - Cosine similarity to cue embedding [0, 1]
 * @param recencyWt     - Recency decay factor (0, 1]
 * @param salienceBst   - Salience multiplier [1.0, MAX_SALIENCE_BOOST]
 * @returns Composite score ≥ 0
 */
export function compositeScore(
  similarity: number,
  recencyWt: number,
  salienceBst: number,
): number {
  return similarity * recencyWt * salienceBst;
}

// ── Entry scoring helpers ────────────────────────────────────

/**
 * Scores a single episodic entry against a retrieval cue.
 *
 * Recency reference: uses `lastRetrievedAt` if available (reinforces recently
 * accessed memories), otherwise falls back to `recordedAt`.
 */
export function scoreEpisodicEntry(
  entry: EpisodicEntry,
  cueEmbedding: EmbeddingVector | null,
  now: Timestamp,
  halfLifeMs: number = DEFAULT_RECENCY_HALF_LIFE_MS,
): RetrievalResult {
  const sim = cosineSimilarity(cueEmbedding, entry.embedding);
  const ref = entry.lastRetrievedAt ?? entry.recordedAt;
  const rw = recencyWeight(ref, now, halfLifeMs);
  const sb = salienceBoost(
    entry.emotionalTrace.valence,
    entry.emotionalTrace.arousal,
  );

  return {
    type: 'episodic',
    entry,
    compositeScore: compositeScore(sim, rw, sb),
    similarity: sim,
    recencyWeight: rw,
    salienceBoost: sb,
  };
}

/**
 * Scores a single semantic entry against a retrieval cue.
 *
 * Recency reference: uses `lastReinforcedAt` (semantic entries gain recency
 * each time a new episode reinforces them).
 *
 * Semantic entries have no emotional trace — salience defaults to 1.0
 * (no boost, no penalty).
 */
export function scoreSemanticEntry(
  entry: SemanticEntry,
  cueEmbedding: EmbeddingVector | null,
  now: Timestamp,
  halfLifeMs: number = DEFAULT_RECENCY_HALF_LIFE_MS,
): RetrievalResult {
  const sim = cosineSimilarity(cueEmbedding, entry.embedding);
  const rw = recencyWeight(entry.lastReinforcedAt, now, halfLifeMs);
  const sb = 1.0; // semantic entries have no emotional trace

  return {
    type: 'semantic',
    entry,
    compositeScore: compositeScore(sim, rw, sb),
    similarity: sim,
    recencyWeight: rw,
    salienceBoost: sb,
  };
}

// ── Top-k selection ─────────────────────────────────────────

/**
 * Returns the top-k results from a list of retrieval results, sorted by
 * compositeScore descending. Handles k ≥ results.length gracefully.
 *
 * Uses partial sort (O(n log k)) rather than full sort when k << n.
 *
 * @param results - Unsorted scored results
 * @param k       - Maximum number of results to return
 * @returns Top-k results, highest score first
 */
export function topK(results: RetrievalResult[], k: number): RetrievalResult[] {
  if (k <= 0) return [];
  if (results.length <= k) {
    return [...results].sort((a, b) => b.compositeScore - a.compositeScore);
  }

  // For small k relative to n, a partial heap would be optimal; for simplicity
  // we use full sort (still O(n log n)) which is fine for in-memory stores
  // of realistic size (tens of thousands of entries).
  return [...results]
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, k);
}

/**
 * Merges and re-ranks two lists of retrieval results (e.g. from episodic and
 * semantic stores), returning the global top-k by compositeScore.
 *
 * @param episodicResults  - Results from the episodic store
 * @param semanticResults  - Results from the semantic store
 * @param k                - Maximum results to return
 * @returns Merged top-k, highest score first
 */
export function mergeAndRank(
  episodicResults: RetrievalResult[],
  semanticResults: RetrievalResult[],
  k: number,
): RetrievalResult[] {
  return topK([...episodicResults, ...semanticResults], k);
}

/**
 * Extracts the cue embedding from a RetrievalCue.
 *
 * If the cue carries a pre-computed embedding, use it directly.
 * Otherwise return null (callers must handle the no-embedding case).
 *
 * In a full system, the caller would invoke the LLM substrate adapter's
 * embedding endpoint here. This function is a seam for that integration.
 *
 * @param cue - Retrieval cue (may carry pre-computed embedding or text only)
 * @returns EmbeddingVector if available, null otherwise
 */
export function extractCueEmbedding(
  cue: RetrievalCue,
): EmbeddingVector | null {
  return cue.embedding ?? null;
}
