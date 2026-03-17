/**
 * Query & Retrieval Interface (QRI)
 *
 * Card: 0.3.2.3 Knowledge Preservation Systems
 * Architecture ref: Section 4 — Query & Retrieval Interface
 *
 * Responsibilities:
 *  - Exact-match lookup by content hash
 *  - Search with metadata filters (domain, confidence, epoch, author, superseded)
 *  - Version chain history retrieval
 *  - Provenance tree resolution (audit trail)
 *
 * The QRI wraps a ContentAddressedStorageLayer and provides the standard
 * interface through which authenticated artificial minds query knowledge.
 */

import type { ContentAddressedStorageLayer } from './casl.js';
import type {
  KnowledgeItem,
  ContentAddressedHash,
  MetadataFilter,
  ProvenanceTree,
  EpochRange,
} from './types.js';

// ── Epoch overlap check ──────────────────────────────────────────────────────

/**
 * Returns true if two epoch ranges overlap.
 * Null bounds are treated as open-ended (–∞ or +∞).
 */
function epochsOverlap(a: EpochRange, b: EpochRange): boolean {
  const aStart = a.validFrom ?? -Infinity;
  const aEnd = a.validUntil ?? Infinity;
  const bStart = b.validFrom ?? -Infinity;
  const bEnd = b.validUntil ?? Infinity;
  return aStart < bEnd && bStart < aEnd;
}

// ── QRI ──────────────────────────────────────────────────────────────────────

export class QueryRetrievalInterface {
  private readonly casl: ContentAddressedStorageLayer;

  constructor(casl: ContentAddressedStorageLayer) {
    this.casl = casl;
  }

  /**
   * Exact-match lookup by content-addressed hash.
   * Returns null if the item is not held locally.
   */
  get(id: ContentAddressedHash): KnowledgeItem | null {
    return this.casl.get(id);
  }

  /**
   * Search items with metadata filters.
   * By default, superseded items are excluded unless includeSuperseded is true.
   */
  search(filter: MetadataFilter): KnowledgeItem[] {
    const allItems = this.casl.allItems();
    return allItems.filter((item) => this.matchesFilter(item, filter));
  }

  /**
   * Retrieve the full version chain for an item (newest first).
   * Returns empty array if the item is unknown.
   */
  history(id: ContentAddressedHash): KnowledgeItem[] {
    return this.casl.history(id);
  }

  /**
   * Resolve the full provenance tree for an item — recursively follows
   * sourceIds to build a tree of who/what contributed to this knowledge.
   * Returns null if the item is unknown.
   */
  auditTrail(
    id: ContentAddressedHash,
    ancestors: Set<ContentAddressedHash> = new Set(),
  ): ProvenanceTree | null {
    const item = this.casl.get(id);
    if (!item) return null;

    const pathAncestors = new Set(ancestors);
    pathAncestors.add(id);

    const sources: ProvenanceTree[] = [];
    for (const sourceId of item.provenance.sourceIds) {
      if (pathAncestors.has(sourceId)) continue; // avoid cycles on this path
      const sourceTree = this.auditTrail(sourceId, pathAncestors);
      if (sourceTree) sources.push(sourceTree);
    }

    return {
      itemId: id,
      provenance: item.provenance,
      sources,
    };
  }

  // ── Private ───────────────────────────────────────────────────────────

  private matchesFilter(item: KnowledgeItem, filter: MetadataFilter): boolean {
    // Exclude superseded items by default
    if (!filter.includeSuperseded && item.metadata.supersededBy.length > 0) {
      return false;
    }

    // Domain tags: item must have at least one matching tag
    if (filter.domainTags && filter.domainTags.length > 0) {
      const hasMatch = filter.domainTags.some((tag) =>
        item.metadata.domainTags.includes(tag),
      );
      if (!hasMatch) return false;
    }

    // Minimum confidence
    if (filter.minConfidence !== undefined) {
      if (item.metadata.confidence < filter.minConfidence) return false;
    }

    // Epoch overlap
    if (filter.epochOverlap) {
      if (!epochsOverlap(item.metadata.relevanceEpoch, filter.epochOverlap)) {
        return false;
      }
    }

    // Author
    if (filter.authorId) {
      if (item.provenance.authorId !== filter.authorId) return false;
    }

    return true;
  }
}
