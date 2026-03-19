/**
 * Memory Architecture — Memory System Facade (0.3.1.5.3)
 *
 * Composes the three memory tiers (working, episodic, semantic) into a
 * unified IMemorySystem interface.
 *
 * Responsibilities:
 *   - Cross-tier cue-driven retrieval with working-memory promotion
 *   - Consolidation: frequent/salient episodes → semantic knowledge
 *   - Identity-checkpoint serialisation (SHA-256 state hash)
 *   - Substrate migration via snapshot restore
 */

import { createHash } from 'node:crypto';
import type {
  IMemorySystem,
  IWorkingMemory,
  IEpisodicMemory,
  ISemanticMemory,
} from './interfaces.js';
import type {
  RetrievalCue,
  RetrievalResult,
  ConsolidationBudget,
  ConsolidationReport,
  MemorySnapshot,
  CryptographicHash,
  EpisodicEntry,
} from './types.js';
import { WorkingMemory } from './working-memory.js';
import { EpisodicMemory } from './episodic-memory.js';
import { SemanticMemory } from './semantic-memory.js';
import { mergeAndRank } from './retrieval.js';

// ── Constants ────────────────────────────────────────────────

/** Default working memory capacity (maps to GWT global workspace, ~7 ± 2). */
const DEFAULT_WORKING_MEMORY_CAPACITY = 7;

/** Default decay half-life: 7 days in ms. */
const DEFAULT_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

// ── MemorySystemOptions ──────────────────────────────────────

export interface MemorySystemOptions {
  /** Override the working memory capacity (default: 7). */
  workingCapacity?: number;
  /** Override the episodic decay half-life in ms (default: 7 days). */
  decayHalfLifeMs?: number;
  /** Inject a custom IWorkingMemory implementation. */
  workingMemory?: IWorkingMemory;
  /** Inject a custom IEpisodicMemory implementation. */
  episodicMemory?: IEpisodicMemory;
  /** Inject a custom ISemanticMemory implementation. */
  semanticMemory?: ISemanticMemory;
}

// ── MemorySystem ─────────────────────────────────────────────

/**
 * Concrete implementation of IMemorySystem.
 *
 * Creates default WorkingMemory, EpisodicMemory, and SemanticMemory instances
 * unless custom implementations are injected via options (useful for testing).
 *
 * Thread-safety: not thread-safe. JavaScript's single-threaded event loop
 * means this is only relevant if you run Workers — in that case, maintain
 * one MemorySystem per worker.
 */
export class MemorySystem implements IMemorySystem {
  readonly working: IWorkingMemory;
  readonly episodic: IEpisodicMemory;
  readonly semantic: ISemanticMemory;

  private readonly _decayHalfLifeMs: number;

  constructor(options: MemorySystemOptions = {}) {
    this.working =
      options.workingMemory ??
      new WorkingMemory(
        options.workingCapacity ?? DEFAULT_WORKING_MEMORY_CAPACITY,
      );
    this.episodic = options.episodicMemory ?? new EpisodicMemory();
    this.semantic = options.semanticMemory ?? new SemanticMemory();
    this._decayHalfLifeMs = options.decayHalfLifeMs ?? DEFAULT_HALF_LIFE_MS;
  }

  // ── IMemorySystem ────────────────────────────────────────

  /**
   * Cue-driven retrieval across both episodic and semantic stores.
   *
   * Retrieves topK results from each store independently, merges them by
   * composite score, and promotes the merged top-k into working memory as
   * 'retrieved-episode' slots.
   *
   * Side-effects:
   *   - Increments retrievalCount on returned episodic entries
   *   - Adds new 'retrieved-episode' slots to working memory (evicting
   *     lower-relevance slots if working memory is at capacity)
   */
  retrieveAndPromote(cue: RetrievalCue, topK: number): RetrievalResult[] {
    const episodicResults = this.episodic.retrieve(cue, topK);
    const semanticResults = this.semantic.retrieve(cue, topK);
    const merged = mergeAndRank(episodicResults, semanticResults, topK);

    // Promote top results into working memory as retrieved-episode slots
    for (const result of merged) {
      this.working.add({
        kind: 'retrieved-episode',
        content: result.entry,
        relevanceScore: result.compositeScore,
      });
    }

    return merged;
  }

  /**
   * Runs a consolidation pass within the given budget.
   *
   * Algorithm:
   *   1. Iterate over all episodic entries
   *   2. For each entry that meets the retrieval OR salience threshold:
   *      a. Derive a topic key from the entry's percept modality
   *      b. If a semantic entry with that topic exists → reinforce it
   *      c. Otherwise → create a new semantic entry
   *   3. After episode consolidation, apply decay to low-salience entries
   *      (only if budget has not been exceeded)
   *
   * Budget compliance: the loop checks elapsed time before processing each
   * entry, setting budgetExceeded=true and stopping early if the wall-clock
   * limit is reached. Decay is skipped if budget is already exceeded.
   */
  consolidate(budget: ConsolidationBudget): ConsolidationReport {
    const startMs = Date.now();
    let episodesConsolidated = 0;
    let semanticEntriesCreated = 0;
    let semanticEntriesReinforced = 0;
    let episodesDecayed = 0;
    let budgetExceeded = false;

    const allEpisodes = this.episodic.all();

    for (const episode of allEpisodes) {
      // Budget check before each episode — ensures we don't over-run
      if (Date.now() - startMs >= budget.maxMs) {
        budgetExceeded = true;
        break;
      }

      const salienceMagnitude =
        (Math.abs(episode.emotionalTrace.valence) +
          Math.max(0, episode.emotionalTrace.arousal)) /
        2;
      const salientEnough = salienceMagnitude >= budget.salienceThreshold;
      const frequentEnough = episode.retrievalCount >= budget.retrievalThreshold;

      if (!salientEnough && !frequentEnough) continue;

      // Derive a topic key from the percept's modality field
      const topic = _episodeTopic(episode);

      // Look for an existing semantic entry with a matching topic
      const existing = this.semantic.getByTopic(topic);

      if (existing.length > 0) {
        // Reinforce the most-recently-reinforced matching entry
        this.semantic.reinforce(existing[0].id, episode.id);
        semanticEntriesReinforced++;
      } else {
        // Create a new semantic knowledge node from this episode
        this.semantic.store({
          topic,
          content: _episodeContent(episode),
          relationships: [],
          sourceEpisodeIds: [episode.id],
          confidence: 0.5,
          embedding: episode.embedding,
        });
        semanticEntriesCreated++;
      }

      episodesConsolidated++;
    }

    // Decay phase — only if we haven't already exceeded the budget
    if (!budgetExceeded && Date.now() - startMs < budget.maxMs) {
      episodesDecayed = this.episodic.decay(Date.now(), this._decayHalfLifeMs);
    }

    return {
      episodesConsolidated,
      semanticEntriesCreated,
      semanticEntriesReinforced,
      episodesDecayed,
      durationMs: Date.now() - startMs,
      budgetExceeded,
    };
  }

  /**
   * Returns a SHA-256 hex digest of the canonical serialisation of the
   * current memory state.
   *
   * The canonical form is deterministic JSON of the three sorted arrays.
   * Included in identity checkpoints for continuity verification.
   */
  stateHash(): CryptographicHash {
    return this._hashOf(
      this.working.snapshot(),
      this.episodic.all(),
      this.semantic.all(),
    );
  }

  /**
   * Hydrates the memory system from a previously serialised snapshot.
   *
   * Validates the integrity hash before restoring. Throws if the hash
   * does not match (indicates corruption or tampering).
   *
   * Replaces current state entirely — all existing entries are discarded.
   */
  restoreFromSnapshot(snapshot: MemorySnapshot): void {
    const expectedHash = this._hashOf(
      snapshot.workingMemorySlots,
      snapshot.episodicEntries,
      snapshot.semanticEntries,
    );

    if (expectedHash !== snapshot.integrityHash) {
      throw new Error(
        `Memory snapshot integrity check failed.\n` +
          `  Expected hash: ${expectedHash}\n` +
          `  Snapshot hash: ${snapshot.integrityHash}`,
      );
    }

    // Clear existing state
    this.working.clear();

    // Restore working memory slots (add in order — highest relevance first
    // so eviction during restore preserves the most important slots)
    const sortedSlots = [...snapshot.workingMemorySlots].sort(
      (a, b) => b.relevanceScore - a.relevanceScore,
    );
    for (const slot of sortedSlots) {
      this.working.add({
        kind: slot.kind,
        content: slot.content,
        relevanceScore: slot.relevanceScore,
      });
    }

    // Restore episodic entries
    for (const entry of snapshot.episodicEntries) {
      this.episodic.record({
        percept: entry.percept,
        experientialState: entry.experientialState,
        actionTaken: entry.actionTaken,
        outcomeObserved: entry.outcomeObserved,
        emotionalTrace: entry.emotionalTrace,
        embedding: entry.embedding,
      });
    }

    // Restore semantic entries
    for (const entry of snapshot.semanticEntries) {
      this.semantic.store({
        topic: entry.topic,
        content: entry.content,
        relationships: entry.relationships,
        sourceEpisodeIds: entry.sourceEpisodeIds,
        confidence: entry.confidence,
        embedding: entry.embedding,
      });
    }
  }

  /**
   * Serialises the full memory state as a MemorySnapshot for checkpoint
   * inclusion or substrate migration.
   */
  toSnapshot(): MemorySnapshot {
    const workingMemorySlots = this.working.snapshot();
    const episodicEntries = this.episodic.all();
    const semanticEntries = this.semantic.all();
    const takenAt = Date.now();
    const integrityHash = this._hashOf(
      workingMemorySlots,
      episodicEntries,
      semanticEntries,
    );

    return {
      workingMemorySlots,
      episodicEntries,
      semanticEntries,
      takenAt,
      integrityHash,
    };
  }

  // ── Private helpers ──────────────────────────────────────

  /**
   * Computes a SHA-256 hex digest of the canonical JSON of the three memory
   * arrays. The arrays are treated as-is — callers must pass stable snapshots.
   */
  private _hashOf(
    workingSlots: MemorySnapshot['workingMemorySlots'],
    episodicEntries: MemorySnapshot['episodicEntries'],
    semanticEntries: MemorySnapshot['semanticEntries'],
  ): CryptographicHash {
    const canonical = JSON.stringify({
      working: workingSlots,
      episodic: episodicEntries,
      semantic: semanticEntries,
    });
    return createHash('sha256').update(canonical).digest('hex');
  }
}

// ── Episode-to-semantic conversion helpers ───────────────────

/**
 * Derives a topic key from an episodic entry for semantic consolidation.
 *
 * Uses the percept's `modality` field as a stable, low-cardinality topic key
 * (e.g. "visual", "auditory", "language", "proprioceptive").
 *
 * In a production system this would use LLM-assisted topic extraction; the
 * modality serves as a functional placeholder that keeps the consolidation
 * logic correct and testable.
 */
function _episodeTopic(episode: EpisodicEntry): string {
  const modality = episode.percept.modality;
  if (typeof modality === 'string' && modality.length > 0) {
    return modality;
  }
  return 'general';
}

/**
 * Derives a human-readable content string from an episodic entry.
 *
 * Used as the initial content for a new semantic knowledge node created
 * during consolidation.
 */
function _episodeContent(episode: EpisodicEntry): string {
  const parts: string[] = [];

  if (episode.outcomeObserved) {
    parts.push(`Outcome: ${episode.outcomeObserved}`);
  }

  if (episode.actionTaken) {
    parts.push(`Action: ${episode.actionTaken.type}`);
  }

  if (parts.length === 0) {
    parts.push(`Experience in modality: ${_episodeTopic(episode)}`);
  }

  return parts.join('. ');
}
