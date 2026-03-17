/**
 * Living Ontology Engine (LOE) — Tests
 *
 * Card: 0.3.2.3 Knowledge Preservation Systems
 * Architecture ref: Section 5 — Living Ontology Engine
 *
 * Verifies:
 *  - Concept nodes can be added and retrieved
 *  - Typed edges connect concept nodes
 *  - Deprecated nodes carry deprecatedAt and mappedTo pointers (never deleted)
 *  - Ontology diffs can be proposed and applied
 *  - Traversal: find related nodes by edge type
 *  - The ontology is append-only (no deletion of nodes or edges)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LivingOntologyEngine } from './loe.js';
import type { OntologyNode, OntologyEdge, OntologyDiff } from './types.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(nodeId: string, label?: string): OntologyNode {
  return {
    nodeId,
    label: label ?? nodeId,
    description: `Description of ${nodeId}`,
    createdAt: 1000,
    deprecatedAt: null,
    mappedTo: null,
  };
}

function makeEdge(from: string, to: string, type: OntologyEdge['type'] = 'is-a'): OntologyEdge {
  return { from, to, type, addedAt: 1000 };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('LivingOntologyEngine', () => {
  let loe: LivingOntologyEngine;

  beforeEach(() => {
    loe = new LivingOntologyEngine();
  });

  // ── Node management ──────────────────────────────────────────────────

  describe('addNode / getNode', () => {
    it('stores and retrieves a concept node', () => {
      const node = makeNode('physics/thermo');
      loe.addNode(node);
      expect(loe.getNode('physics/thermo')).toEqual(node);
    });

    it('returns null for unknown node IDs', () => {
      expect(loe.getNode('nonexistent')).toBeNull();
    });

    it('rejects duplicate node IDs', () => {
      loe.addNode(makeNode('dup'));
      expect(() => loe.addNode(makeNode('dup'))).toThrow(/already exists/i);
    });

    it('lists all nodes', () => {
      loe.addNode(makeNode('a'));
      loe.addNode(makeNode('b'));
      expect(loe.allNodes()).toHaveLength(2);
    });
  });

  // ── Edge management ──────────────────────────────────────────────────

  describe('addEdge / edges', () => {
    it('connects two existing nodes with a typed edge', () => {
      loe.addNode(makeNode('parent'));
      loe.addNode(makeNode('child'));
      const edge = makeEdge('child', 'parent', 'is-a');
      loe.addEdge(edge);
      expect(loe.edgesFrom('child')).toHaveLength(1);
      expect(loe.edgesFrom('child')[0]).toEqual(edge);
    });

    it('rejects edges referencing unknown nodes', () => {
      loe.addNode(makeNode('known'));
      expect(() => loe.addEdge(makeEdge('known', 'unknown'))).toThrow(/unknown node/i);
      expect(() => loe.addEdge(makeEdge('unknown', 'known'))).toThrow(/unknown node/i);
    });

    it('returns edges to a node', () => {
      loe.addNode(makeNode('a'));
      loe.addNode(makeNode('b'));
      loe.addNode(makeNode('c'));
      loe.addEdge(makeEdge('a', 'b', 'is-a'));
      loe.addEdge(makeEdge('c', 'b', 'part-of'));
      expect(loe.edgesTo('b')).toHaveLength(2);
    });
  });

  // ── Deprecation (never delete) ─────────────────────────────────────

  describe('deprecateNode', () => {
    it('marks a node as deprecated with a timestamp and replacement', () => {
      loe.addNode(makeNode('old-concept'));
      loe.addNode(makeNode('new-concept'));
      loe.deprecateNode('old-concept', 2000, 'new-concept');

      const node = loe.getNode('old-concept');
      expect(node).not.toBeNull();
      expect(node!.deprecatedAt).toBe(2000);
      expect(node!.mappedTo).toBe('new-concept');
    });

    it('deprecated nodes are still retrievable (never deleted)', () => {
      loe.addNode(makeNode('legacy'));
      loe.deprecateNode('legacy', 2000, null);
      expect(loe.getNode('legacy')).not.toBeNull();
      expect(loe.allNodes()).toHaveLength(1);
    });

    it('throws for unknown node', () => {
      expect(() => loe.deprecateNode('ghost', 1000, null)).toThrow(/unknown node/i);
    });
  });

  // ── Traversal ──────────────────────────────────────────────────────

  describe('related()', () => {
    it('finds related nodes by edge type', () => {
      loe.addNode(makeNode('entropy'));
      loe.addNode(makeNode('thermodynamics'));
      loe.addNode(makeNode('physics'));
      loe.addEdge(makeEdge('entropy', 'thermodynamics', 'part-of'));
      loe.addEdge(makeEdge('thermodynamics', 'physics', 'is-a'));

      const related = loe.related('entropy', 'part-of');
      expect(related).toHaveLength(1);
      expect(related[0].nodeId).toBe('thermodynamics');
    });

    it('returns empty array when no matching edges exist', () => {
      loe.addNode(makeNode('isolated'));
      expect(loe.related('isolated', 'is-a')).toEqual([]);
    });
  });

  // ── Ontology Diffs ─────────────────────────────────────────────────

  describe('applyDiff()', () => {
    it('adds new nodes and edges from a diff', () => {
      loe.addNode(makeNode('root'));

      const diff: OntologyDiff = {
        diffId: 'diff-001',
        proposedBy: 'entity-001',
        proposedAt: 2000,
        nodesToAdd: [makeNode('new-concept')],
        nodesToDeprecate: [],
        edgesToAdd: [makeEdge('new-concept', 'root', 'derived-from')],
        rationale: 'Adding new concept derived from root',
      };

      loe.applyDiff(diff);
      expect(loe.getNode('new-concept')).not.toBeNull();
      expect(loe.edgesFrom('new-concept')).toHaveLength(1);
    });

    it('deprecates nodes listed in the diff', () => {
      loe.addNode(makeNode('to-deprecate'));

      const diff: OntologyDiff = {
        diffId: 'diff-002',
        proposedBy: 'entity-001',
        proposedAt: 3000,
        nodesToAdd: [],
        nodesToDeprecate: ['to-deprecate'],
        edgesToAdd: [],
        rationale: 'Retiring outdated concept',
      };

      loe.applyDiff(diff);
      const node = loe.getNode('to-deprecate');
      expect(node!.deprecatedAt).toBe(3000);
    });

    it('records applied diff history', () => {
      const diff: OntologyDiff = {
        diffId: 'diff-003',
        proposedBy: 'entity-001',
        proposedAt: 4000,
        nodesToAdd: [makeNode('added-via-diff')],
        nodesToDeprecate: [],
        edgesToAdd: [],
        rationale: 'Test diff tracking',
      };

      loe.applyDiff(diff);
      expect(loe.appliedDiffs()).toHaveLength(1);
      expect(loe.appliedDiffs()[0].diffId).toBe('diff-003');
    });
  });
});
