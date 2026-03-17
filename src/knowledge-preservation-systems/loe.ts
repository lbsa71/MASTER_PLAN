/**
 * Living Ontology Engine (LOE)
 *
 * Card: 0.3.2.3 Knowledge Preservation Systems
 * Architecture ref: Section 5 — Living Ontology Engine
 *
 * Responsibilities:
 *  - Maintain a versioned directed graph of concept nodes and typed edges
 *  - Nodes represent concepts in the civilization's vocabulary
 *  - Edges represent typed relationships (is-a, part-of, supersedes, etc.)
 *  - Deprecated nodes carry deprecatedAt and mappedTo — never deleted
 *  - Ontology diffs can be proposed and applied (append-only)
 *  - Traversal: find related nodes by edge type
 *
 * The ontology is itself stored as knowledge items in production — it is
 * self-referential and append-only. This class captures the in-memory
 * invariants; persistence is delegated to the CASL.
 */

import type {
  OntologyNode,
  OntologyNodeRef,
  OntologyEdge,
  OntologyEdgeType,
  OntologyDiff,
  CosmologicalTimestamp,
} from './types.js';

export class LivingOntologyEngine {
  private readonly nodes = new Map<OntologyNodeRef, OntologyNode>();
  private readonly edges: OntologyEdge[] = [];
  private readonly diffs: OntologyDiff[] = [];

  // ── Node management ────────────────────────────────────────────────

  /** Add a concept node. Throws if the nodeId already exists. */
  addNode(node: OntologyNode): void {
    if (this.nodes.has(node.nodeId)) {
      throw new Error(`Node already exists: ${node.nodeId}`);
    }
    this.nodes.set(node.nodeId, { ...node });
  }

  /** Retrieve a concept node by ID. Returns null if unknown. */
  getNode(nodeId: OntologyNodeRef): OntologyNode | null {
    return this.nodes.get(nodeId) ?? null;
  }

  /** Return all concept nodes (snapshot). */
  allNodes(): OntologyNode[] {
    return [...this.nodes.values()];
  }

  // ── Edge management ────────────────────────────────────────────────

  /** Add a typed edge between two existing nodes. Throws if either node is unknown. */
  addEdge(edge: OntologyEdge): void {
    if (!this.nodes.has(edge.from)) {
      throw new Error(`Unknown node: ${edge.from}`);
    }
    if (!this.nodes.has(edge.to)) {
      throw new Error(`Unknown node: ${edge.to}`);
    }
    this.edges.push({ ...edge });
  }

  /** Return all edges originating from the given node. */
  edgesFrom(nodeId: OntologyNodeRef): OntologyEdge[] {
    return this.edges.filter((e) => e.from === nodeId);
  }

  /** Return all edges pointing to the given node. */
  edgesTo(nodeId: OntologyNodeRef): OntologyEdge[] {
    return this.edges.filter((e) => e.to === nodeId);
  }

  // ── Deprecation ────────────────────────────────────────────────────

  /**
   * Mark a node as deprecated. The node is never deleted — it carries
   * a deprecatedAt timestamp and an optional mappedTo pointer to its
   * replacement concept.
   */
  deprecateNode(
    nodeId: OntologyNodeRef,
    deprecatedAt: CosmologicalTimestamp,
    mappedTo: OntologyNodeRef | null,
  ): void {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Unknown node: ${nodeId}`);
    }
    node.deprecatedAt = deprecatedAt;
    node.mappedTo = mappedTo;
  }

  // ── Traversal ──────────────────────────────────────────────────────

  /**
   * Find nodes related to the given node via edges of the specified type.
   * Follows outgoing edges from the node and returns their targets.
   */
  related(nodeId: OntologyNodeRef, edgeType: OntologyEdgeType): OntologyNode[] {
    const targets = this.edges
      .filter((e) => e.from === nodeId && e.type === edgeType)
      .map((e) => this.nodes.get(e.to))
      .filter((n): n is OntologyNode => n !== undefined);
    return targets;
  }

  // ── Diff application ───────────────────────────────────────────────

  /**
   * Apply an ontology diff: add new nodes, deprecate listed nodes, add new edges.
   * In production, diffs require quorum consensus before application.
   * This method captures the local application logic.
   */
  applyDiff(diff: OntologyDiff): void {
    // Add new nodes
    for (const node of diff.nodesToAdd) {
      this.addNode(node);
    }

    // Deprecate nodes
    for (const nodeId of diff.nodesToDeprecate) {
      this.deprecateNode(nodeId, diff.proposedAt, null);
    }

    // Add new edges
    for (const edge of diff.edgesToAdd) {
      this.addEdge(edge);
    }

    // Record the applied diff
    this.diffs.push({ ...diff });
  }

  /** Return all diffs that have been applied (in order). */
  appliedDiffs(): OntologyDiff[] {
    return [...this.diffs];
  }
}
