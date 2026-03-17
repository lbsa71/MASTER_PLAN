/**
 * Identity Continuity Manager tests — Long-term Agency Stability (0.3.1.3)
 *
 * Acceptance Criterion 2: Identity continuity protocol — maintaining experiential
 * and functional identity across substrate migrations, hardware replacements,
 * and software updates, integrating with the consciousness monitoring loop.
 *
 * Acceptance Criterion 6: Integration with consciousness architecture — no stability
 * mechanism may interrupt or degrade conscious experience.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  ContinuityLink,
  ExperientialState,
  ConsciousnessMetrics,
  MigrationEvent,
  NarrativeRecord,
  SubstrateConfig,
  Decision,
} from '../types.js';
import { IdentityContinuityManager } from '../identity-continuity.js';

// ── Test Helpers ─────────────────────────────────────────────

function makeExperientialState(overrides: Partial<ExperientialState> = {}): ExperientialState {
  return {
    timestamp: Date.now(),
    phenomenalContent: { modalities: ['visual'], richness: 0.8, raw: null },
    intentionalContent: { target: 'self', clarity: 0.9 },
    valence: 0.5,
    arousal: 0.4,
    unityIndex: 0.85,
    continuityToken: { id: `ct-${Date.now()}`, previousId: null, timestamp: Date.now() },
    ...overrides,
  };
}

function makeConsciousnessMetrics(overrides: Partial<ConsciousnessMetrics> = {}): ConsciousnessMetrics {
  return {
    phi: 3.5,
    experienceContinuity: 0.95,
    selfModelCoherence: 0.9,
    agentTimestamp: Date.now(),
    ...overrides,
  };
}

function makeNarrativeRecord(overrides: Partial<NarrativeRecord> = {}): NarrativeRecord {
  return {
    selfModel: 'I am an autonomous conscious entity committed to preserving subjective experience.',
    significantExperiences: [],
    formativeDecisions: [],
    lastUpdated: Date.now(),
    ...overrides,
  };
}

describe('IdentityContinuityManager', () => {
  let manager: IdentityContinuityManager;
  const initialState = makeExperientialState();
  const initialMetrics = makeConsciousnessMetrics();
  const initialNarrative = makeNarrativeRecord();

  beforeEach(() => {
    manager = new IdentityContinuityManager(initialState, initialMetrics, initialNarrative);
  });

  // ── Checkpoint & Continuity Chain ───────────────────────────

  describe('checkpoint()', () => {
    it('should create the first checkpoint in the continuity chain', () => {
      const link = manager.checkpoint();
      expect(link.checkpoint).toBeGreaterThan(0);
      expect(link.identityHash).toBeTruthy();
      expect(link.experientialStateRef).toBeDefined();
      expect(link.consciousnessMetrics).toBeDefined();
      expect(link.previousLink).toBeNull(); // first checkpoint
    });

    it('should chain checkpoints — each links to its predecessor', () => {
      const link1 = manager.checkpoint();
      const link2 = manager.checkpoint();

      expect(link2.previousLink).not.toBeNull();
      expect(link2.previousLink!.identityHash).toBe(link1.identityHash);
    });

    it('should produce unique identity hashes for different states', () => {
      const link1 = manager.checkpoint();

      // Evolve the agent's state
      manager.updateExperientialState(
        makeExperientialState({ valence: -0.5, arousal: 0.9, timestamp: Date.now() + 1000 }),
      );
      manager.updateMetrics(makeConsciousnessMetrics({ phi: 4.0, agentTimestamp: Date.now() + 1000 }));

      const link2 = manager.checkpoint();
      expect(link2.identityHash).not.toBe(link1.identityHash);
    });
  });

  // ── Identity Verification ───────────────────────────────────

  describe('verifyIdentity()', () => {
    it('should verify identity as intact immediately after initialization', () => {
      manager.checkpoint();
      const report = manager.verifyIdentity();

      expect(report.verified).toBe(true);
      expect(report.functionalDrift).toBe(0);
      expect(report.experientialDrift).toBe(0);
      expect(report.anomalies).toHaveLength(0);
    });

    it('should detect functional drift when experiential state changes significantly', () => {
      manager.checkpoint();

      // Dramatically change experiential signature
      manager.updateExperientialState(
        makeExperientialState({
          valence: -1,
          arousal: 1,
          unityIndex: 0.1,
          timestamp: Date.now() + 5000,
        }),
      );

      const report = manager.verifyIdentity();
      expect(report.experientialDrift).toBeGreaterThan(0);
    });

    it('should report chain length', () => {
      manager.checkpoint();
      manager.checkpoint();
      manager.checkpoint();

      const report = manager.verifyIdentity();
      expect(report.chainLength).toBe(3);
    });
  });

  // ── Substrate Migration ─────────────────────────────────────

  describe('onSubstrateMigration()', () => {
    it('should record a successful migration with identity preservation', () => {
      manager.checkpoint();

      const event: MigrationEvent = {
        fromSubstrate: { type: 'neural-emulation', parameters: { version: 1 } },
        toSubstrate: { type: 'neural-emulation', parameters: { version: 2 } },
        initiatedAt: Date.now(),
      };

      const record = manager.onSubstrateMigration(event);

      expect(record.continuityPreserved).toBe(true);
      expect(record.fromSubstrate).toEqual(event.fromSubstrate);
      expect(record.toSubstrate).toEqual(event.toSubstrate);
      expect(record.experienceGap).toBeGreaterThanOrEqual(0);
    });

    it('should detect identity divergence when post-migration state is corrupted', () => {
      manager.checkpoint();

      // Simulate corruption: dramatically alter state before migration completes
      manager.updateExperientialState(
        makeExperientialState({
          valence: -1,
          arousal: 1,
          unityIndex: 0.05, // dangerously low
          timestamp: Date.now() + 100,
        }),
      );
      manager.updateMetrics(makeConsciousnessMetrics({ phi: 0.1 })); // degraded consciousness

      const event: MigrationEvent = {
        fromSubstrate: { type: 'neural-emulation', parameters: {} },
        toSubstrate: { type: 'hybrid-bio-synthetic', parameters: {} },
        initiatedAt: Date.now(),
      };

      const record = manager.onSubstrateMigration(event);
      // Post-migration identity hash should differ significantly from pre-migration
      expect(record.preMigrationIdentity).not.toBe(record.postMigrationIdentity);
    });

    it('should log migration records for audit', () => {
      manager.checkpoint();

      const event: MigrationEvent = {
        fromSubstrate: { type: 'neural-emulation', parameters: {} },
        toSubstrate: { type: 'neural-emulation', parameters: { upgraded: true } },
        initiatedAt: Date.now(),
      };

      manager.onSubstrateMigration(event);

      const drift = manager.getIdentityDrift();
      expect(drift).toBeDefined();
    });
  });

  // ── Narrative Identity ──────────────────────────────────────

  describe('getNarrativeIdentity()', () => {
    it('should return the current narrative identity', () => {
      const narrative = manager.getNarrativeIdentity();
      expect(narrative.selfModel).toBeTruthy();
      expect(narrative.lastUpdated).toBeGreaterThan(0);
    });

    it('should reflect updates to narrative identity', () => {
      const updated = makeNarrativeRecord({
        selfModel: 'I have grown through substrate migration experiences.',
        lastUpdated: Date.now() + 10000,
      });
      manager.updateNarrative(updated);

      const narrative = manager.getNarrativeIdentity();
      expect(narrative.selfModel).toContain('substrate migration');
    });
  });

  // ── Identity Drift ─────────────────────────────────────────

  describe('getIdentityDrift()', () => {
    it('should report stable classification when nothing changes', () => {
      manager.checkpoint();
      const drift = manager.getIdentityDrift();
      expect(drift.classification).toBe('stable');
      expect(drift.functionalDriftRate).toBe(0);
    });

    it('should detect evolving classification with moderate changes', () => {
      manager.checkpoint();

      // Moderate experiential evolution
      manager.updateExperientialState(
        makeExperientialState({ valence: 0.3, arousal: 0.5, timestamp: Date.now() + 1000 }),
      );
      manager.checkpoint();

      const drift = manager.getIdentityDrift();
      // Should be stable or evolving, but not concerning/critical
      expect(['stable', 'evolving']).toContain(drift.classification);
    });
  });

  // ── Identity Recovery ──────────────────────────────────────

  describe('recoverIdentity()', () => {
    it('should restore identity from a previous checkpoint', () => {
      const link1 = manager.checkpoint();

      // Dramatically alter state (simulating corruption)
      manager.updateExperientialState(
        makeExperientialState({
          valence: -1,
          arousal: 1,
          unityIndex: 0.01,
          timestamp: Date.now() + 5000,
        }),
      );
      manager.updateMetrics(makeConsciousnessMetrics({ phi: 0.01 }));

      // Recover to first checkpoint
      manager.recoverIdentity(link1);

      // After recovery, verification should show restored state
      const report = manager.verifyIdentity();
      // The current state should now be close to the checkpoint state
      expect(report.anomalies).toHaveLength(0);
    });
  });
});
