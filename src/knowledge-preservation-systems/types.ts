/**
 * Knowledge Preservation Systems — Core Type Definitions
 *
 * Types for the civilization-scale knowledge preservation system defined in
 * docs/autonomous-civilization-bootstrapping/knowledge-preservation-systems-architecture.md
 *
 * Card: 0.3.2.3
 *
 * Design principles:
 *  - Self-describing representations (every item carries inline schema)
 *  - Append-only mutations via content-addressed storage
 *  - Full provenance and audit trail
 *  - Living ontology via versioned concept graph
 */

// ── Shared Primitives ───────────────────────────────────────────────────────

/**
 * SHA-3 (or equivalent) hash of item content, used as the stable address.
 * Identical content always yields the same hash — ensures deduplication.
 */
export type ContentAddressedHash = string;

/**
 * Cryptographic identity of an artificial mind or automated system.
 * Corresponds to the persistent public key registered at entity creation.
 */
export type EntityIdentifier = string;

/**
 * An absolute time reference that remains meaningful across cosmological
 * timescales — expressed as SI seconds since J2000.0 epoch (TDB).
 */
export type CosmologicalTimestamp = number;

/**
 * MIME type string (e.g. "text/plain", "application/cbor") or a reference
 * into the Living Ontology for structured knowledge types.
 */
export type ContentType = string;

/**
 * Reference to a concept node inside the Living Ontology Engine.
 */
export type OntologyNodeRef = string;

/**
 * Typed edge label for ontology relationships.
 */
export type OntologyEdgeType =
  | 'is-a'
  | 'part-of'
  | 'supersedes'
  | 'derived-from'
  | 'conflicts-with'
  | 'related-to';

// ── Epoch & Confidence ──────────────────────────────────────────────────────

/**
 * The time range during which a knowledge item was / is considered valid.
 * Both bounds are CosmologicalTimestamps; open-ended ranges use null.
 */
export interface EpochRange {
  /** Start of validity window (inclusive). null = since the beginning of records. */
  validFrom: CosmologicalTimestamp | null;
  /** End of validity window (exclusive). null = still valid / unknown end. */
  validUntil: CosmologicalTimestamp | null;
}

/**
 * Epistemic confidence in a knowledge item, expressed as a float in [0, 1].
 * Decays over time at the configured rate absent re-endorsement.
 */
export type ConfidenceScore = number;

// ── Provenance ──────────────────────────────────────────────────────────────

/**
 * A snapshot of environmental and epistemic context at the moment a knowledge
 * item was created — preserves the conditions under which it was true.
 */
export interface ContextSnapshot {
  /** Free-form description of relevant context. */
  description: string;
  /** IDs of any systems / processes that contributed to this creation event. */
  contributorIds: EntityIdentifier[];
  /** Additional structured context fields (domain-specific). */
  extra?: Record<string, unknown>;
}

/**
 * Full provenance record embedded in every KnowledgeItem.
 */
export interface Provenance {
  /** The mind or system that authored this item. */
  authorId: EntityIdentifier;
  /** When the item was committed to the store. */
  createdAt: CosmologicalTimestamp;
  /** Environmental / epistemic context at creation time. */
  conditions: ContextSnapshot;
  /** Hashes of prior items this item derives from (may be empty). */
  sourceIds: ContentAddressedHash[];
}

// ── Conflict Resolution ─────────────────────────────────────────────────────

/**
 * Record describing how a conflict between knowledge items was adjudicated.
 */
export interface ResolutionRecord {
  /** Timestamp of adjudication. */
  resolvedAt: CosmologicalTimestamp;
  /** Identities of the quorum members who participated. */
  quorumMembers: EntityIdentifier[];
  /** Hash of the item selected as authoritative (if any). */
  authoritative: ContentAddressedHash | null;
  /** Human/machine-readable rationale for the resolution. */
  rationale: string;
}

// ── Authenticated Signature ─────────────────────────────────────────────────

/**
 * A cryptographic signature from an endorsing entity attesting to the
 * correctness or usefulness of a knowledge item.
 */
export interface AuthenticatedSignature {
  signerId: EntityIdentifier;
  /** ISO algorithm identifier (e.g. "Ed25519", "ECDSA-P384"). */
  algorithm: string;
  /** Base64-encoded signature bytes. */
  signatureBytes: string;
  signedAt: CosmologicalTimestamp;
}

// ── Knowledge Item ──────────────────────────────────────────────────────────

/**
 * The atomic unit of the Knowledge Preservation System.
 *
 * Every field is self-describing; no external interpreter is needed to decode
 * a KnowledgeItem given the item itself.  Mutations produce new items with a
 * `versionChain` link — the original is never overwritten.
 */
export interface KnowledgeItem {
  /** Content-addressed identifier (hash of canonical content bytes). */
  id: ContentAddressedHash;

  /**
   * The encoded knowledge payload.  Self-describing format (e.g. CBOR with
   * inline schema) so the content can be decoded without external tooling.
   * Stored as a base64 string for transport-layer safety.
   */
  content: string;

  /**
   * MIME type or ontology reference describing what kind of knowledge this is.
   * Sufficient for any reader to select the correct decoder.
   */
  contentType: ContentType;

  /** Full provenance record. */
  provenance: Provenance;

  /** Descriptive metadata for retrieval and curation. */
  metadata: KnowledgeItemMetadata;

  /** Endorsing signatures (one per endorsing entity; may be empty at creation). */
  signatures: AuthenticatedSignature[];

  /**
   * Hash of the immediately preceding version of this item, if it is a
   * mutation of an existing item.  Forms a linked list back to genesis.
   * null for brand-new items.
   */
  versionChain: ContentAddressedHash | null;
}

/**
 * Descriptive metadata attached to every KnowledgeItem, used for retrieval,
 * curation, and lifecycle management.
 */
export interface KnowledgeItemMetadata {
  /** Domain classification tags drawn from the Living Ontology. */
  domainTags: OntologyNodeRef[];

  /** Epistemic confidence score at the time of writing (decays over time). */
  confidence: ConfidenceScore;

  /** The time window during which this knowledge is/was considered valid. */
  relevanceEpoch: EpochRange;

  /**
   * If this item has been superseded, the hashes of its successor(s).
   * Items are flagged, never deleted — supersededBy is append-only.
   */
  supersededBy: ContentAddressedHash[];

  /**
   * Explicit registry of items whose claims conflict with this one.
   * Conflict links are symmetric and append-only.
   */
  conflictsWith: ContentAddressedHash[];

  /**
   * Resolution metadata if a conflict involving this item has been adjudicated.
   * null while conflict is pending.
   */
  resolutionMeta: ResolutionRecord | null;
}

// ── Ontology Types ──────────────────────────────────────────────────────────

/**
 * A node in the Living Ontology — a concept in the civilization's vocabulary.
 * Stored as a KnowledgeItem; the ontology is itself append-only.
 */
export interface OntologyNode {
  /** Stable identifier for the concept (e.g. "physics/thermodynamics/entropy"). */
  nodeId: OntologyNodeRef;
  label: string;
  description: string;
  createdAt: CosmologicalTimestamp;
  /** If deprecated, when deprecation was recorded. */
  deprecatedAt: CosmologicalTimestamp | null;
  /** Pointer to the replacement concept node when deprecated. */
  mappedTo: OntologyNodeRef | null;
}

/**
 * A typed edge between two ontology concept nodes.
 */
export interface OntologyEdge {
  from: OntologyNodeRef;
  to: OntologyNodeRef;
  type: OntologyEdgeType;
  addedAt: CosmologicalTimestamp;
}

/**
 * A versioned diff proposing changes to the ontology.
 * Must achieve quorum consensus before being applied.
 */
export interface OntologyDiff {
  diffId: string;
  proposedBy: EntityIdentifier;
  proposedAt: CosmologicalTimestamp;
  nodesToAdd: OntologyNode[];
  nodesToDeprecate: OntologyNodeRef[];
  edgesToAdd: OntologyEdge[];
  rationale: string;
}

// ── Query & Retrieval ───────────────────────────────────────────────────────

/**
 * A dense vector representing the semantic meaning of a query or knowledge item,
 * produced by the semantic embedding layer.
 */
export type SemanticVector = number[];

/**
 * Natural-language query string as an alternative to SemanticVector.
 */
export type NaturalLanguageQuery = string;

/**
 * Filter criteria applied to KnowledgeItem metadata during search.
 */
export interface MetadataFilter {
  domainTags?: OntologyNodeRef[];
  minConfidence?: ConfidenceScore;
  /** Only return items valid within this epoch window. */
  epochOverlap?: EpochRange;
  /** If true, include items with supersededBy links. Default: false. */
  includeSuperseded?: boolean;
  authorId?: EntityIdentifier;
}

/**
 * The full provenance tree for an item — resolved recursively through
 * sourceIds up to a configurable depth.
 */
export interface ProvenanceTree {
  itemId: ContentAddressedHash;
  provenance: Provenance;
  /** Recursively resolved provenance of source items. */
  sources: ProvenanceTree[];
}

// ── Replication & Health ────────────────────────────────────────────────────

/**
 * Deployment configuration parameters — all values configurable per deployment.
 */
export interface ReplicationConfig {
  /** Number of simultaneous node failures tolerated without data loss. Default: 3. */
  nToleratedNodeLoss: number;
  /**
   * Replication factor = nToleratedNodeLoss + 1.
   * Items below this count trigger re-replication alerts.
   */
  replicationFactor: number;
  /** Annual confidence score decay rate absent re-endorsement. Default: 0.01. */
  confidenceDecayRatePerYear: number;
  /** Max seconds for semantic search over full corpus. Default: 30. */
  semanticLatencySlaSeconds: number;
  /** Max milliseconds for exact-match local cache retrieval. Default: 100. */
  exactMatchLocalCacheMs: number;
  /** Max seconds for exact-match cross-node retrieval. Default: 5. */
  exactMatchCrossNodeSeconds: number;
}

/**
 * Per-item replication status tracked by the Content-Addressed Storage Layer.
 */
export interface ReplicationStatus {
  itemId: ContentAddressedHash;
  /** IDs of nodes currently holding a copy. */
  nodeIds: string[];
  /** Current replication count. */
  currentCopies: number;
  /** Whether this item is below the minimum replication threshold. */
  belowThreshold: boolean;
}

/**
 * Anomaly record produced when a mutation or deletion attempt is detected.
 * Tamper evidence is cryptographically verifiable.
 */
export interface TamperAnomalyRecord {
  detectedAt: CosmologicalTimestamp;
  affectedItemId: ContentAddressedHash;
  attemptingNodeId: string;
  /** Base64-encoded cryptographic proof of the anomaly. */
  cryptographicProof: string;
  description: string;
}

/**
 * A Merkle manifest of all item IDs held by a node — used during bootstrapping
 * to allow a new node to discover which items it is missing.
 */
export interface MerkleManifest {
  /** Merkle root of the full item ID set. */
  merkleRoot: string;
  /** All item IDs held by this node. */
  itemIds: ContentAddressedHash[];
  generatedAt: CosmologicalTimestamp;
  nodeId: string;
}

// ── Recovery ────────────────────────────────────────────────────────────────

/**
 * Parameters for a catastrophic recovery drill or actual recovery operation.
 */
export interface RecoveryScenario {
  scenarioId: string;
  /** Number of nodes simulated as lost. */
  lostNodeCount: number;
  lostNodeIds: string[];
  triggeredAt: CosmologicalTimestamp;
}

/**
 * Outcome report from a recovery drill or actual recovery operation.
 */
export interface RecoveryReport {
  scenarioId: string;
  completedAt: CosmologicalTimestamp;
  /** Whether all items were reconstructed from surviving copies. */
  fullyRecovered: boolean;
  /** Items that could not be recovered (should be empty if replication holds). */
  unrecoverableItemIds: ContentAddressedHash[];
  /** Time taken to complete recovery in seconds. */
  recoveryTimeSeconds: number;
}
