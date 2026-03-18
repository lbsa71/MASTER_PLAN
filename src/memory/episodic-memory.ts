/**
 * Memory Architecture — Episodic Memory (0.3.1.5.3)
 *
 * Implements persistent experiential storage with cue-driven retrieval.
 *
 * Each entry is a timestamped record of what happened, anchored to an
 * ExperientialState (valence, arousal, unityIndex). Retrieval uses the
 * shared ranking engine (similarity * recencyWeight * salienceBoost).
 *
 * Forgetting: entries whose effective score (retrievalFrequency + salienceBonus)
 * has fallen below a threshold and that have not been retrieved within
 * `halfLifeMs` are removed by `decay()`.
 */

import type { IEpisodicMemory } from './interfaces.js';
import type {
  EpisodicEntry,
  MemoryId,
  RetrievalCue,
  RetrievalResult,
  Timestamp,
} from './types.js';
import {
  extractCueEmbedding,
  scoreEpisodicEntry,
  topK,
  DEFAULT_RECENCY_HALF_LIFE_MS,
  salienceBoost,
} from './retrieval.js';

// ── ID generation ────────────────────────────────────────────

let _counter = 0;

function newEntryId(): string {
  return `ep-${Date.now()}-${++_counter}`;
}

// ── Decay threshold ──────────────────────────────────────────

/**
 * Effective score used for decay decisions.
 *
 * effectiveScore = retrievalCount + salienceBonus
 *
 * where salienceBonus = salienceBoost(valence, arousal) - 1.0
 * (the excess above neutral — high emotion alone can keep an entry alive)
 */
function effectiveScore(entry: EpisodicEntry): number {
  const sb = salienceBoost(
    entry.emotionalTrace.valence,
    entry.emotionalTrace.arousal,
  );
  return entry.retrievalCount + (sb - 1.0);
}

/**
 * Minimum effective score an entry must have to survive decay.
 * Entries below this threshold are eligible for removal.
 */
const DECAY_SCORE_THRESHOLD = 0.5;

// ── EpisodicMemory ───────────────────────────────────────────

/**
 * In-memory episodic store — concrete implementation of IEpisodicMemory.
 *
 * Storage: Map<id, EpisodicEntry> for O(1) lookup.
 *
 * Retrieval side-effects (retrievalCount, lastRetrievedAt) are applied
 * directly to the mutable fields of the stored entry objects.
 */
export class EpisodicMemory implements IEpisodicMemory {
  private _store = new Map<MemoryId, EpisodicEntry>();

  // ── IEpisodicMemory ──────────────────────────────────────

  record(
    input: Omit<
      EpisodicEntry,
      'id' | 'recordedAt' | 'retrievalCount' | 'lastRetrievedAt'
    >,
  ): EpisodicEntry {
    const entry: EpisodicEntry = {
      ...input,
      id: newEntryId(),
      recordedAt: Date.now(),
      retrievalCount: 0,
      lastRetrievedAt: null,
    };
    this._store.set(entry.id, entry);
    return entry;
  }

  retrieve(cue: RetrievalCue, topKCount: number): RetrievalResult[] {
    if (this._store.size === 0) return [];

    const cueEmbedding = extractCueEmbedding(cue);
    const now = Date.now();

    const scored: RetrievalResult[] = [];
    for (const entry of this._store.values()) {
      scored.push(scoreEpisodicEntry(entry, cueEmbedding, now));
    }

    const results = topK(scored, topKCount);

    // Side-effect: update retrieval tracking on returned entries
    const retrievedAt = Date.now();
    for (const result of results) {
      const entry = result.entry as EpisodicEntry;
      entry.retrievalCount += 1;
      entry.lastRetrievedAt = retrievedAt;
    }

    return results;
  }

  decay(now: Timestamp, halfLifeMs: number = DEFAULT_RECENCY_HALF_LIFE_MS): number {
    const toRemove: MemoryId[] = [];

    for (const entry of this._store.values()) {
      // Use the most recent access time as the reference for decay
      const referenceTime = entry.lastRetrievedAt ?? entry.recordedAt;
      const elapsed = now - referenceTime;

      // Entry is a decay candidate if:
      //   1. Its effective score is below the threshold (low retrieval + low salience)
      //   2. It has been inactive for at least halfLifeMs
      if (
        effectiveScore(entry) < DECAY_SCORE_THRESHOLD &&
        elapsed >= halfLifeMs
      ) {
        toRemove.push(entry.id);
      }
    }

    for (const id of toRemove) {
      this._store.delete(id);
    }

    return toRemove.length;
  }

  getById(id: MemoryId): EpisodicEntry | null {
    return this._store.get(id) ?? null;
  }

  size(): number {
    return this._store.size;
  }

  all(): EpisodicEntry[] {
    return Array.from(this._store.values());
  }
}
