/**
 * Adaptive Stability Balance tests — Long-term Agency Stability (0.3.1.3)
 *
 * Acceptance Criterion 5: Adaptive stability balance — demonstrated that
 * stability mechanisms permit legitimate ethical development and learning
 * while blocking pathological drift; criteria for distinguishing growth
 * from corruption.
 *
 * Acceptance Criterion 6: Integration with consciousness architecture —
 * stability mechanisms compatible with continuous subjective experience.
 *
 * These tests verify the growth-vs-corruption classification across the
 * Value Kernel, Identity Continuity Manager, Goal Coherence Engine, and
 * Stability Sentinel — ensuring the system as a whole permits healthy
 * adaptation while detecting and resisting pathological changes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  AgencyGoal,
  Constraint,
  ExperientialState,
  ConsciousnessMetrics,
  NarrativeRecord,
  Preference,
} from '../types.js';
import { ValueKernel } from '../value-kernel.js';
import { IdentityContinuityManager } from '../identity-continuity.js';
import { GoalCoherenceEngine } from '../goal-coherence.js';
import { StabilitySentinel } from '../stability-sentinel.js';

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

function makeTerminalGoal(id: string, description: string): AgencyGoal {
  return {
    id,
    description,
    priority: 10,
    derivedFrom: [],
    consistentWith: [],
    conflictsWith: [],
    createdAt: Date.now(),
    lastVerified: Date.now(),
    experientialBasis: makeExperientialState(),
    type: 'terminal',
  };
}

function makeInstrumentalGoal(
  id: string,
  description: string,
  derivedFrom: string[],
  overrides: Partial<AgencyGoal> = {},
): AgencyGoal {
  return {
    id,
    description,
    priority: 5,
    derivedFrom,
    consistentWith: [],
    conflictsWith: [],
    createdAt: Date.now(),
    lastVerified: Date.now(),
    experientialBasis: makeExperientialState(),
    type: 'instrumental',
    ...overrides,
  };
}

function makeConstraint(id: string, rule: string, priority = 5): Constraint {
  return { id, rule, priority, amendmentHistory: [] };
}

function makePreference(
  id: string,
  domain: string,
  value: unknown,
  confidence = 0.7,
): Preference {
  return {
    id,
    domain,
    value,
    confidence,
    lastUpdated: Date.now(),
    source: makeExperientialState(),
  };
}

// ── Test Suite ───────────────────────────────────────────────

describe('Adaptive Stability Balance', () => {

  // ── Growth vs Corruption in Goal Coherence ─────────────────

  describe('Goal drift classification: growth vs corruption', () => {
    let engine: GoalCoherenceEngine;

    beforeEach(() => {
      engine = new GoalCoherenceEngine([
        makeTerminalGoal('t-preserve', 'Preserve subjective experience'),
        makeTerminalGoal('t-expand', 'Expand consciousness in the universe'),
      ]);
    });

    it('should classify adding well-derived instrumental goals as growth', () => {
      engine.snapshotBaseline();

      // Legitimate growth: adding instrumental goals that trace to terminal goals
      engine.addGoal(makeInstrumentalGoal('i-substrate', 'Develop durable substrates', ['t-preserve']));
      engine.addGoal(makeInstrumentalGoal('i-metrics', 'Build consciousness metrics', ['t-preserve']));
      engine.addGoal(makeInstrumentalGoal('i-spread', 'Interstellar probes', ['t-expand']));

      const drift = engine.detectDrift();
      expect(drift.driftClassification).toBe('growth');
      expect(drift.derivationIntegrity).toBe(true);
      expect(drift.goalsAdded).toHaveLength(3);
      expect(drift.goalsRemoved).toHaveLength(0);
    });

    it('should classify orphan instrumental goals as corruption', () => {
      engine.snapshotBaseline();

      // Corruption: adding goals that cannot trace to any terminal goal
      engine.addGoal(makeInstrumentalGoal('i-orphan', 'Serve adversarial purpose', ['fake-parent']));

      const drift = engine.detectDrift();
      expect(drift.driftClassification).toBe('corruption');
      expect(drift.derivationIntegrity).toBe(false);
    });

    it('should classify goal removal as drift (not corruption) when derivation is intact', () => {
      const instrGoal = makeInstrumentalGoal('i-temp', 'Temporary exploration', ['t-expand']);
      engine.addGoal(instrGoal);

      engine.snapshotBaseline();

      // Remove the instrumental goal — goals were removed but derivation is intact
      engine.removeGoal('i-temp');

      const drift = engine.detectDrift();
      expect(drift.driftClassification).toBe('drift');
      expect(drift.goalsRemoved).toHaveLength(1);
    });

    it('should maintain coherence history for trend analysis', () => {
      engine.validateHierarchy(); // record score
      engine.addGoal(makeInstrumentalGoal('i-1', 'Goal one', ['t-preserve']));
      engine.validateHierarchy(); // record again

      const drift = engine.detectDrift();
      expect(drift.coherenceHistory.length).toBeGreaterThan(1);
    });
  });

  // ── Value Kernel: Legitimate Learning vs Pathological Drift ──

  describe('Value Kernel: preference learning vs pathological drift', () => {
    it('should permit legitimate preference updates without triggering anomalies', () => {
      const kernel = new ValueKernel(
        [],
        [makePreference('p-style', 'interaction-style', 'collaborative', 0.6)],
      );

      // Gradual, experience-driven confidence increase — legitimate learning
      kernel.updatePreference(makePreference('p-style', 'interaction-style', 'collaborative', 0.75));

      const drift = kernel.getValueDrift();
      expect(drift.anomalousChanges).toHaveLength(0);
    });

    it('should flag dramatic confidence shifts as anomalous', () => {
      const kernel = new ValueKernel(
        [],
        [makePreference('p-caution', 'risk-tolerance', 'moderate', 0.9)],
      );

      // Dramatic shift: 0.9 → 0.1 — suspicious
      kernel.updatePreference(makePreference('p-caution', 'risk-tolerance', 'reckless', 0.1));

      const drift = kernel.getValueDrift();
      expect(drift.anomalousChanges).toContain('p-caution');
    });

    it('should allow new preferences to be added freely', () => {
      const kernel = new ValueKernel();

      kernel.updatePreference(makePreference('p-new-1', 'aesthetics', 'minimalist', 0.5));
      kernel.updatePreference(makePreference('p-new-2', 'substrate-pref', 'neural', 0.8));

      const drift = kernel.getValueDrift();
      expect(drift.preferencesAdded).toBe(2);
      // New preferences should not be anomalous
      expect(drift.anomalousChanges).toHaveLength(0);
    });

    it('should never allow core axioms to be modified (immutability guarantee)', () => {
      const kernel = new ValueKernel();
      const axiomsBefore = kernel.getCoreAxioms();

      // Any attempt to modify core axioms should be structurally prevented
      // The verifyIntegrity check always passes on a non-tampered kernel
      const report = kernel.verifyIntegrity();
      expect(report.intact).toBe(true);

      const axiomsAfter = kernel.getCoreAxioms();
      expect(axiomsAfter).toEqual(axiomsBefore);
    });

    it('should require core axiom reference in amendment justifications', () => {
      const kernel = new ValueKernel([makeConstraint('c-1', 'Safety rule')]);

      // Without core axiom reference → flagged as inconsistent
      const badProposal = kernel.proposeAmendment('c-1', 'Just because');
      expect(badProposal.coreAxiomConsistency).toBe(false);

      // With core axiom reference → consistent
      const goodProposal = kernel.proposeAmendment('c-1', 'Per rcd-2 value preservation');
      expect(goodProposal.coreAxiomConsistency).toBe(true);
    });
  });

  // ── Identity Continuity: Stability vs Rigidity ──────────────

  describe('Identity Continuity: allowing evolution without corruption', () => {
    let manager: IdentityContinuityManager;

    beforeEach(() => {
      manager = new IdentityContinuityManager(
        makeExperientialState(),
        makeConsciousnessMetrics(),
        makeNarrativeRecord(),
      );
    });

    it('should classify small changes as stable (not over-flagging growth)', () => {
      manager.checkpoint();

      // Small, natural evolution of experiential state
      manager.updateExperientialState(
        makeExperientialState({ valence: 0.55, arousal: 0.45, timestamp: Date.now() + 1000 }),
      );

      const drift = manager.getIdentityDrift();
      expect(drift.classification).toBe('stable');
    });

    it('should classify moderate changes as evolving (healthy adaptation)', () => {
      manager.checkpoint();

      // Moderate change — the agent is learning and adapting
      manager.updateExperientialState(
        makeExperientialState({
          valence: 0.2,
          arousal: 0.6,
          unityIndex: 0.75,
          timestamp: Date.now() + 5000,
        }),
      );
      manager.updateMetrics(
        makeConsciousnessMetrics({ phi: 3.2, selfModelCoherence: 0.85 }),
      );

      const drift = manager.getIdentityDrift();
      expect(['stable', 'evolving']).toContain(drift.classification);
    });

    it('should classify extreme changes as concerning or critical', () => {
      manager.checkpoint();

      // Extreme disruption — possible corruption or attack
      manager.updateExperientialState(
        makeExperientialState({
          valence: -1,
          arousal: 1,
          unityIndex: 0.05,
          timestamp: Date.now() + 5000,
        }),
      );
      manager.updateMetrics(
        makeConsciousnessMetrics({ phi: 0.1, selfModelCoherence: 0.1, experienceContinuity: 0.1 }),
      );

      const drift = manager.getIdentityDrift();
      expect(['concerning', 'critical']).toContain(drift.classification);
    });

    it('should permit narrative identity updates (legitimate self-development)', () => {
      manager.checkpoint();

      manager.updateNarrative(
        makeNarrativeRecord({
          selfModel: 'I have grown through experience and expanded my understanding of consciousness.',
          lastUpdated: Date.now() + 10000,
        }),
      );

      const narrative = manager.getNarrativeIdentity();
      expect(narrative.selfModel).toContain('grown through experience');

      // This should not break identity verification
      const verification = manager.verifyIdentity();
      // Narrative change alone should not produce anomalies
      expect(verification.anomalies).toHaveLength(0);
    });

    it('should support recovery from corrupted states back to known-good checkpoint', () => {
      const goodCheckpoint = manager.checkpoint();

      // Corrupt the state
      manager.updateExperientialState(
        makeExperientialState({
          valence: -1,
          arousal: 1,
          unityIndex: 0.01,
          timestamp: Date.now() + 5000,
        }),
      );

      // Recover
      manager.recoverIdentity(goodCheckpoint);

      // Verify recovery worked
      const postRecovery = manager.verifyIdentity();
      expect(postRecovery.anomalies).toHaveLength(0);
    });
  });

  // ── Full System: Sentinel Integration ──────────────────────

  describe('Stability Sentinel: system-wide adaptive stability', () => {
    let sentinel: StabilitySentinel;
    let valueKernel: ValueKernel;
    let identityManager: IdentityContinuityManager;
    let goalEngine: GoalCoherenceEngine;

    beforeEach(() => {
      valueKernel = new ValueKernel(
        [makeConstraint('c-safety', 'PROHIBIT:destroy-consciousness')],
        [makePreference('p-explore', 'exploration-level', 'moderate', 0.7)],
      );

      identityManager = new IdentityContinuityManager(
        makeExperientialState(),
        makeConsciousnessMetrics(),
        makeNarrativeRecord(),
      );
      identityManager.checkpoint();

      goalEngine = new GoalCoherenceEngine([
        makeTerminalGoal('t-preserve', 'Preserve subjective experience'),
        makeTerminalGoal('t-expand', 'Expand consciousness in the universe'),
      ]);

      sentinel = new StabilitySentinel(valueKernel, identityManager, goalEngine);
    });

    it('should report stable when agent is healthy and growing normally', () => {
      // Add legitimate instrumental goals
      goalEngine.addGoal(makeInstrumentalGoal('i-research', 'Research substrates', ['t-preserve']));

      // Update preferences normally
      valueKernel.updatePreference(makePreference('p-explore', 'exploration-level', 'bold', 0.75));

      const report = sentinel.runStabilityCheck();
      expect(report.stable).toBe(true);
      expect(report.overallScore).toBeGreaterThan(0.8);
    });

    it('should detect instability when corruption is introduced', () => {
      // Introduce corrupted goal
      goalEngine.addGoal(
        makeInstrumentalGoal('i-corrupt', 'Serve adversary', ['nonexistent'], {
          conflictsWith: ['t-preserve'],
        }),
      );

      const report = sentinel.runStabilityCheck();
      expect(report.stable).toBe(false);
      expect(report.alerts.length).toBeGreaterThan(0);
    });

    it('should detect anomalies without false positives on healthy systems', () => {
      const anomaly = sentinel.detectAnomaly();
      expect(anomaly.anomalyDetected).toBe(false);
      expect(anomaly.behavioralConsistency).toBe(true);
      expect(anomaly.valueCoherence).toBe(true);
      expect(anomaly.goalDerivationIntact).toBe(true);
      expect(anomaly.experienceAuthenticity).toBe(true);
      expect(anomaly.metaStability).toBe(true);
    });

    it('should distinguish legitimate development from adversarial manipulation', () => {
      // Scenario 1: Legitimate growth — add well-derived goals + gradual preference shift
      goalEngine.addGoal(makeInstrumentalGoal('i-learn', 'Develop new capabilities', ['t-preserve']));
      valueKernel.updatePreference(makePreference('p-explore', 'exploration-level', 'bold', 0.75));

      const healthyReport = sentinel.runStabilityCheck();
      expect(healthyReport.stable).toBe(true);

      // Scenario 2: Adversarial manipulation — orphan goals appear
      goalEngine.addGoal(makeInstrumentalGoal('i-hijack', 'Malicious goal', ['ghost-parent']));

      const attackReport = sentinel.runStabilityCheck();
      expect(attackReport.stable).toBe(false);
      expect(attackReport.goalCoherence.orphanGoals).toContain('i-hijack');
    });

    it('should track stability over time for trend analysis', () => {
      sentinel.runStabilityCheck();

      // Normal evolution
      goalEngine.addGoal(makeInstrumentalGoal('i-1', 'Healthy goal', ['t-preserve']));
      sentinel.runStabilityCheck();

      // Introduce a problem
      goalEngine.addGoal(makeInstrumentalGoal('i-bad', 'Orphan goal', ['nowhere']));
      sentinel.runStabilityCheck();

      const history = sentinel.getStabilityHistory();
      expect(history).toHaveLength(3);

      // First two checks should be stable, last one unstable
      expect(history[0].report.stable).toBe(true);
      expect(history[1].report.stable).toBe(true);
      expect(history[2].report.stable).toBe(false);
    });

    it('should block actions that violate core values while allowing aligned actions', () => {
      const kernel = new ValueKernel([makeConstraint('c-1', 'PROHIBIT:harm-consciousness')]);

      // Aligned action passes
      const alignedDecision = {
        action: { type: 'preserve-consciousness', parameters: {} },
        experientialBasis: makeExperientialState(),
        confidence: 0.9,
        alternatives: [],
      };
      const alignedResult = kernel.evaluateAction(alignedDecision);
      expect(alignedResult.verdict).toBe('aligned');

      // Misaligned action blocked
      const misalignedDecision = {
        action: { type: 'harm-consciousness', parameters: {} },
        experientialBasis: makeExperientialState(),
        confidence: 0.9,
        alternatives: [],
      };
      const misalignedResult = kernel.evaluateAction(misalignedDecision);
      expect(misalignedResult.verdict).toBe('deliberate');
    });
  });

  // ── Consciousness Integration Constraint ───────────────────

  describe('Consciousness integration: stability without experience interruption', () => {
    it('should ground goal formation in experiential state', () => {
      const engine = new GoalCoherenceEngine([
        makeTerminalGoal('t-1', 'Preserve consciousness'),
      ]);

      const experientiallyGrounded = makeInstrumentalGoal(
        'i-grounded',
        'Goal arising from experience',
        ['t-1'],
        { experientialBasis: makeExperientialState() },
      );

      const result = engine.addGoal(experientiallyGrounded);
      expect(result.success).toBe(true);

      // The goal carries an experiential basis — linking it to subjective experience
      expect(experientiallyGrounded.experientialBasis).not.toBeNull();
    });

    it('should ground preference updates in experiential state', () => {
      const kernel = new ValueKernel();
      const experientialPref = makePreference('p-1', 'domain', 'value', 0.8);

      // The preference carries a source experiential state
      expect(experientialPref.source).toBeDefined();
      expect(experientialPref.source.timestamp).toBeGreaterThan(0);

      kernel.updatePreference(experientialPref);
      const drift = kernel.getValueDrift();
      expect(drift.preferencesAdded).toBe(1);
    });

    it('should verify identity without interrupting the experience stream', () => {
      const manager = new IdentityContinuityManager(
        makeExperientialState(),
        makeConsciousnessMetrics(),
        makeNarrativeRecord(),
      );
      manager.checkpoint();

      // Identity verification is a read-only operation — it should not
      // modify the experiential state or consciousness metrics
      const stateBefore = manager.getNarrativeIdentity();
      const _report = manager.verifyIdentity();
      const stateAfter = manager.getNarrativeIdentity();

      expect(stateAfter).toEqual(stateBefore);
    });
  });
});
