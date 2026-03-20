/**
 * Memory Architecture — Interfaces (0.3.1.5.3)
 *
 * Defines the four service contracts that the three-tier memory system
 * exposes to the rest of the conscious-agent architecture:
 *
 *   IWorkingMemory   — bounded cognitive workspace (LLM context-window map)
 *   IEpisodicMemory  — persistent experiential store with retrieval
 *   ISemanticMemory  — consolidated knowledge store with provenance
 *   IMemorySystem    — facade composing the three tiers
 */

import type {
  WorkingMemorySlot,
  EpisodicEntry,
  SemanticEntry,
  RetrievalCue,
  RetrievalResult,
  ConsolidationBudget,
  ConsolidationReport,
  MemorySnapshot,
  CryptographicHash,
  Timestamp,
  MemoryId,
} from './types.js';

// ── Working Memory ───────────────────────────────────────────

/**
 * Bounded cognitive workspace — the "global workspace" of GWT theory.
 *
 * Items compete for capacity slots by relevanceScore. When the buffer is
 * full, the lowest-scoring slot is automatically evicted before a new one
 * is admitted. The snapshot() method serialises all active slots for
 * injection into an LLM prompt context.
 */
export interface IWorkingMemory {
  /** Maximum number of slots that may be active simultaneously. */
  readonly capacity: number;

  /** Returns all currently active slots, ordered by relevanceScore descending. */
  slots(): WorkingMemorySlot[];

  /**
   * Adds a new slot, evicting the lowest-relevance slot if at capacity.
   * Generates a stable id and stamps enteredAt automatically.
   */
  add(
    slot: Omit<WorkingMemorySlot, 'id' | 'enteredAt'>,
  ): WorkingMemorySlot;

  /**
   * Explicitly removes the slot with the given id.
   * No-ops if the id is not present.
   */
  evict(id: MemoryId): void;

  /**
   * Updates the relevanceScore of an existing slot in-place.
   * Used when new information increases or decreases a slot's salience.
   */
  updateRelevance(id: MemoryId, newScore: number): void;

  /**
   * Returns a serialisable snapshot of all active slots, suitable for
   * injecting into an LLM context window as structured memory context.
   */
  snapshot(): WorkingMemorySlot[];

  /** Removes all slots from the workspace. */
  clear(): void;
}

// ── Episodic Memory ───────────────────────────────────────────

/**
 * Persistent experiential store — timestamped records of what happened.
 *
 * Entries are written once and retrieved many times. Retrieval updates
 * retrievalCount and lastRetrievedAt on the entry, which feeds the
 * consolidation heuristic.
 */
export interface IEpisodicMemory {
  /**
   * Persists a new episodic entry.
   * Generates id, recordedAt, sets retrievalCount=0, lastRetrievedAt=null.
   */
  record(
    entry: Omit<
      EpisodicEntry,
      'id' | 'recordedAt' | 'retrievalCount' | 'lastRetrievedAt'
    >,
  ): EpisodicEntry;

  /**
   * Retrieves the top-k episodic entries most relevant to the cue.
   * Uses composite score: similarity * recencyWeight * salienceBoost.
   * Side-effect: increments retrievalCount and updates lastRetrievedAt
   * on returned entries.
   */
  retrieve(cue: RetrievalCue, topK: number): RetrievalResult[];

  /**
   * Applies temporal decay: entries whose effective score
   * (retrievalFrequency + salienceBonus) has fallen below the threshold
   * and that were last retrieved more than halfLifeMs ago are removed.
   */
  decay(now: Timestamp, halfLifeMs: number): number; // returns count dropped

  /** Returns a single entry by id, or null if not found. */
  getById(id: MemoryId): EpisodicEntry | null;

  /** Returns total number of stored entries. */
  size(): number;

  /** Returns all entries (for checkpoint serialisation — use with care). */
  all(): EpisodicEntry[];
}

// ── Semantic Memory ───────────────────────────────────────────

/**
 * Consolidated knowledge store — generalised knowledge decoupled from
 * specific episodes.
 *
 * Semantic entries are never auto-dropped. They may be reinforced as new
 * corroborating episodes are consolidated, which increases confidence.
 */
export interface ISemanticMemory {
  /**
   * Persists a new semantic entry.
   * Generates id, stamps createdAt and lastReinforcedAt.
   */
  store(
    entry: Omit<SemanticEntry, 'id' | 'createdAt' | 'lastReinforcedAt'>,
  ): SemanticEntry;

  /**
   * Retrieves the top-k semantic entries most relevant to the cue.
   * Applies similarity * recencyWeight * salienceBoost ranking.
   */
  retrieve(cue: RetrievalCue, topK: number): RetrievalResult[];

  /**
   * Reinforces an existing semantic entry:
   *   - Appends sourceEpisodeId to sourceEpisodeIds (if not already present)
   *   - Increases confidence (logarithmic saturation toward 1.0)
   *   - Updates lastReinforcedAt
   */
  reinforce(id: MemoryId, sourceEpisodeId: MemoryId): void;

  /** Returns a single entry by id, or null if not found. */
  getById(id: MemoryId): SemanticEntry | null;

  /** Returns entries whose topic matches the given string (exact or prefix). */
  getByTopic(topic: string): SemanticEntry[];

  /**
   * Update the content and/or topic of an existing semantic entry.
   * Updates lastReinforcedAt. Returns the updated entry, or null if not found.
   */
  update(id: MemoryId, fields: { content?: string; topic?: string; confidence?: number }): SemanticEntry | null;

  /**
   * Delete a semantic entry by id.
   * Returns true if the entry existed and was removed, false otherwise.
   */
  delete(id: MemoryId): boolean;

  /** Returns total number of stored entries. */
  size(): number;

  /** Returns all entries (for checkpoint serialisation — use with care). */
  all(): SemanticEntry[];
}

// ── Memory System ─────────────────────────────────────────────

/**
 * Facade composing the three memory tiers.
 *
 * Provides cue-driven cross-tier retrieval, consolidation scheduling,
 * and identity-checkpoint serialisation.
 */
export interface IMemorySystem {
  /** Direct access to the working memory tier. */
  readonly working: IWorkingMemory;
  /** Direct access to the episodic memory tier. */
  readonly episodic: IEpisodicMemory;
  /** Direct access to the semantic memory tier. */
  readonly semantic: ISemanticMemory;

  /**
   * Cue-driven retrieval across both episodic and semantic stores.
   * Returns top-k results merged from both stores, re-ranked by composite
   * score. Promotes results into working memory as 'retrieved-episode' slots.
   */
  retrieveAndPromote(cue: RetrievalCue, topK: number): RetrievalResult[];

  /**
   * Runs a consolidation pass within the given budget:
   *   1. Identifies episodic entries that exceed the retrieval/salience threshold
   *   2. Creates or reinforces semantic entries from those episodes
   *   3. Optionally decays low-salience episodic entries
   * Must not exceed budget.maxMs wall-clock time.
   */
  consolidate(budget: ConsolidationBudget): ConsolidationReport;

  /**
   * Returns a SHA-256 hex digest of the canonical serialisation of the
   * current memory state. Included in identity checkpoints.
   */
  stateHash(): CryptographicHash;

  /**
   * Hydrates the memory system from a previously serialised snapshot.
   * Used during substrate migration (replaces current state entirely).
   */
  restoreFromSnapshot(snapshot: MemorySnapshot): void;

  /**
   * Serialises the full memory state for checkpoint inclusion.
   */
  toSnapshot(): MemorySnapshot;
}
