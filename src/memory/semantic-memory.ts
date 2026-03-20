/**
 * Memory Architecture — Semantic Memory (0.3.1.5.3)
 *
 * Implements the consolidated knowledge store: generalised knowledge nodes
 * decoupled from specific episodes.
 *
 * Entries are never auto-dropped (unlike episodic entries). They are reinforced
 * as new corroborating episodes are consolidated, which increases confidence
 * using logarithmic saturation toward 1.0.
 *
 * Retrieval uses the shared ranking engine
 * (similarity * recencyWeight * salienceBoost). Semantic entries have no
 * emotional trace — salienceBoost is always 1.0.
 */

import type { ISemanticMemory } from './interfaces.js';
import type {
  SemanticEntry,
  MemoryId,
  RetrievalCue,
  RetrievalResult,
} from './types.js';
import {
  extractCueEmbedding,
  scoreSemanticEntry,
  topK,
} from './retrieval.js';

// ── ID generation ────────────────────────────────────────────

let _counter = 0;

function newEntryId(): string {
  return `sem-${Date.now()}-${++_counter}`;
}

// ── Confidence update ─────────────────────────────────────────

/**
 * Logarithmic saturation update for confidence.
 *
 * Each reinforcement closes 30% of the remaining gap to 1.0:
 *   newConfidence = confidence + (1 - confidence) * 0.3
 *
 * This ensures:
 *   - Confidence always increases after reinforcement
 *   - Confidence never exceeds 1.0
 *   - Successive reinforcements have diminishing returns
 */
const CONFIDENCE_STEP = 0.3;

function reinforceConfidence(current: number): number {
  return Math.min(1.0, current + (1.0 - current) * CONFIDENCE_STEP);
}

// ── SemanticMemory ────────────────────────────────────────────

/**
 * In-memory semantic store — concrete implementation of ISemanticMemory.
 *
 * Storage: Map<id, SemanticEntry> for O(1) lookup.
 *
 * Topic matching: getByTopic(query) returns entries where the topic starts
 * with the query string, supporting both exact match ('physics') and
 * hierarchical prefix match ('physics:').
 */
export class SemanticMemory implements ISemanticMemory {
  private _store = new Map<MemoryId, SemanticEntry>();

  // ── ISemanticMemory ──────────────────────────────────────

  store(
    input: Omit<SemanticEntry, 'id' | 'createdAt' | 'lastReinforcedAt'>,
  ): SemanticEntry {
    const now = Date.now();
    const entry: SemanticEntry = {
      ...input,
      id: newEntryId(),
      createdAt: now,
      lastReinforcedAt: now,
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
      scored.push(scoreSemanticEntry(entry, cueEmbedding, now));
    }

    return topK(scored, topKCount);
  }

  reinforce(id: MemoryId, sourceEpisodeId: MemoryId): void {
    const entry = this._store.get(id);
    if (!entry) return;

    // Append sourceEpisodeId only if not already present
    const updatedSources = entry.sourceEpisodeIds.includes(sourceEpisodeId)
      ? entry.sourceEpisodeIds
      : [...entry.sourceEpisodeIds, sourceEpisodeId];

    // Apply logarithmic confidence saturation
    const updatedEntry: SemanticEntry = {
      ...entry,
      sourceEpisodeIds: updatedSources,
      confidence: reinforceConfidence(entry.confidence),
      lastReinforcedAt: Date.now(),
    };

    this._store.set(id, updatedEntry);
  }

  update(id: MemoryId, fields: { content?: string; topic?: string; confidence?: number }): SemanticEntry | null {
    const entry = this._store.get(id);
    if (!entry) return null;

    const updated: SemanticEntry = {
      ...entry,
      ...(fields.content !== undefined ? { content: fields.content } : {}),
      ...(fields.topic !== undefined ? { topic: fields.topic } : {}),
      ...(fields.confidence !== undefined ? { confidence: Math.max(0, Math.min(1, fields.confidence)) } : {}),
      lastReinforcedAt: Date.now(),
    };
    this._store.set(id, updated);
    return updated;
  }

  delete(id: MemoryId): boolean {
    return this._store.delete(id);
  }

  getById(id: MemoryId): SemanticEntry | null {
    return this._store.get(id) ?? null;
  }

  getByTopic(query: string): SemanticEntry[] {
    const results: SemanticEntry[] = [];
    for (const entry of this._store.values()) {
      if (entry.topic.startsWith(query)) {
        results.push(entry);
      }
    }
    return results;
  }

  size(): number {
    return this._store.size;
  }

  all(): SemanticEntry[] {
    return Array.from(this._store.values());
  }
}
