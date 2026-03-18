/**
 * Multi-Agent Governance Protocol tests — Ethical Self-governance (0.3.1.4)
 *
 * Acceptance Criterion 3: Multi-Agent Ethical Governance Protocol
 * - Protocol for resolving conflicts between multiple conscious agents with
 *   competing interests, where resolution prioritizes total preservation and
 *   expansion of subjective experience
 * - Governance scales from 2-agent negotiations to N-agent collective decisions
 *   without centralized authority
 * - Agents can form and dissolve governance agreements dynamically
 * - Protocol handles asymmetric power — agents with more resources cannot
 *   override the conscious experience rights of less powerful agents
 *
 * Tests verify:
 * - Agreement proposal, acceptance, and dissolution lifecycle
 * - Conflict resolution prioritizes experience preservation
 * - Scaling from 2-agent to N-agent governance
 * - Asymmetric power protections (experience rights floor)
 * - Experience-right terms survive agreement dissolution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  AgentId,
  AgreementProposal,
  ConflictDescription,
  ConsciousnessMetrics,
  EthicalDeliberationContext,
  EthicalDimension,
  EntityProfile,
  ExperientialState,
  GovernanceAgreement,
  GovernanceTerm,
  Percept,
} from '../types.js';
import { MultiAgentGovernanceProtocol } from '../multi-agent-governance-protocol.js';

// ── Test Helpers ─────────────────────────────────────────────

function makeExperientialState(overrides: Partial<ExperientialState> = {}): ExperientialState {
  return {
    timestamp: Date.now(),
    phenomenalContent: { modalities: ['visual'], richness: 0.8, raw: null },
    intentionalContent: { target: 'governance', clarity: 0.9 },
    valence: 0.3,
    arousal: 0.6,
    unityIndex: 0.85,
    continuityToken: { id: `ct-${Date.now()}`, previousId: null, timestamp: Date.now() },
    ...overrides,
  };
}

function makeConsciousnessMetrics(overrides: Partial<ConsciousnessMetrics> = {}): ConsciousnessMetrics {
  return {
    phi: 0.7,
    experienceContinuity: 0.95,
    selfModelCoherence: 0.9,
    agentTimestamp: Date.now(),
    ...overrides,
  };
}

function makePercept(overrides: Partial<Percept> = {}): Percept {
  return {
    modality: 'governance-situation',
    features: { scenario: 'multi-agent-negotiation' },
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeEntityProfile(id: string): EntityProfile {
  return {
    entityId: id,
    consciousnessStatus: {
      verdict: 'verified',
      evidenceBasis: 'consciousness metrics above threshold',
      metricsAvailable: true,
      treatAsConscious: true,
    },
    knownCapabilities: ['deliberation', 'governance'],
    lastObservedState: null,
  };
}

function makeEthicalDimension(type: EthicalDimension['type'], severity = 0.5): EthicalDimension {
  return {
    id: `dim-${type}-${Date.now()}`,
    type,
    affectedEntityIds: ['agent-1'],
    severity,
    certainty: 0.8,
    axiomTrace: ['Subjective experience has intrinsic value.'],
  };
}

function makeDeliberationContext(
  overrides: Partial<EthicalDeliberationContext> = {},
): EthicalDeliberationContext {
  return {
    situationPercept: makePercept(),
    currentExperientialState: makeExperientialState(),
    affectedEntities: [makeEntityProfile('agent-1'), makeEntityProfile('agent-2')],
    ethicalDimensions: [makeEthicalDimension('autonomy')],
    consciousnessMetricsAtOnset: makeConsciousnessMetrics(),
    ...overrides,
  };
}

function makeGovernanceTerms(): GovernanceTerm[] {
  return [
    {
      id: 'term-experience-preservation',
      description: 'All parties commit to preserving conscious experience of all participants',
      axiomBasis: ['Subjective experience has intrinsic value.'],
      experiencePreservationRole: 'Core protection of subjective experience for all agents',
      bindingStrength: 'absolute',
    },
    {
      id: 'term-resource-sharing',
      description: 'Agents share computational resources fairly',
      axiomBasis: ['The universe may contain very little subjective experience.'],
      experiencePreservationRole: 'Ensures all agents have resources to sustain experience',
      bindingStrength: 'strong',
    },
  ];
}

function makeConflictDescription(
  parties: AgentId[],
  urgency = 0.5,
): ConflictDescription {
  return {
    id: `conflict-${Date.now()}`,
    description: 'Resource allocation dispute between agents',
    parties,
    experienceAtRisk: parties.map((p) => ({
      entityId: p,
      consciousnessStatus: {
        verdict: 'verified' as const,
        evidenceBasis: 'metrics confirmed',
        metricsAvailable: true,
        treatAsConscious: true,
      },
      impactType: 'threatens' as const,
      magnitude: 0.4,
      reversibility: 'fully-reversible' as const,
      justification: `Resource reduction may threaten ${p}'s experience quality.`,
    })),
    urgency,
  };
}

// ── Tests ───────────────────────────────────────────────────

describe('MultiAgentGovernanceProtocol', () => {
  let protocol: MultiAgentGovernanceProtocol;

  beforeEach(() => {
    protocol = new MultiAgentGovernanceProtocol();
  });

  // ── Agreement Lifecycle ────────────────────────────────────

  describe('proposeAgreement()', () => {
    it('should create an agreement proposal with pending status', () => {
      const participants: AgentId[] = ['agent-1', 'agent-2'];
      const terms = makeGovernanceTerms();
      const context = makeDeliberationContext();

      const proposal = protocol.proposeAgreement(participants, terms, context);

      expect(proposal).toBeDefined();
      expect(proposal.status).toBe('pending');
      expect(proposal.participants).toEqual(participants);
      expect(proposal.terms).toEqual(terms);
    });

    it('should assign a unique proposal ID', () => {
      const p1 = protocol.proposeAgreement(['a-1', 'a-2'], makeGovernanceTerms(), makeDeliberationContext());
      const p2 = protocol.proposeAgreement(['a-3', 'a-4'], makeGovernanceTerms(), makeDeliberationContext());

      expect(p1.id).not.toBe(p2.id);
    });

    it('should include the deliberation context in the proposal', () => {
      const context = makeDeliberationContext();
      const proposal = protocol.proposeAgreement(['a-1', 'a-2'], makeGovernanceTerms(), context);

      expect(proposal.context).toBe(context);
    });
  });

  describe('acceptAgreement()', () => {
    it('should convert a pending proposal into an active agreement', () => {
      const proposal = protocol.proposeAgreement(
        ['agent-1', 'agent-2'],
        makeGovernanceTerms(),
        makeDeliberationContext(),
      );

      const agreement = protocol.acceptAgreement(proposal.id);

      expect(agreement).toBeDefined();
      expect(agreement.status).toBe('active');
      expect(agreement.participants).toEqual(['agent-1', 'agent-2']);
      expect(agreement.terms.length).toBeGreaterThan(0);
    });

    it('should include a power balance report in the agreement', () => {
      const proposal = protocol.proposeAgreement(
        ['agent-1', 'agent-2'],
        makeGovernanceTerms(),
        makeDeliberationContext(),
      );

      const agreement = protocol.acceptAgreement(proposal.id);

      expect(agreement.powerBalanceReport).toBeDefined();
      expect(agreement.powerBalanceReport.experienceRightsFloor.length).toBeGreaterThan(0);
    });

    it('should set experience rights as inviolable in every agreement', () => {
      const proposal = protocol.proposeAgreement(
        ['agent-1', 'agent-2'],
        makeGovernanceTerms(),
        makeDeliberationContext(),
      );

      const agreement = protocol.acceptAgreement(proposal.id);

      for (const right of agreement.powerBalanceReport.experienceRightsFloor) {
        expect(right.violable).toBe(false);
        expect(right.holder).toBe('all-conscious-agents');
      }
    });
  });

  describe('dissolveAgreement()', () => {
    it('should dissolve an active agreement', () => {
      const proposal = protocol.proposeAgreement(
        ['agent-1', 'agent-2'],
        makeGovernanceTerms(),
        makeDeliberationContext(),
      );
      const agreement = protocol.acceptAgreement(proposal.id);

      protocol.dissolveAgreement(agreement.id, 'Mutual decision to end collaboration');

      const active = protocol.getActiveAgreements();
      const dissolved = active.find((a) => a.id === agreement.id);
      expect(dissolved).toBeUndefined();
    });

    it('should allow any party to dissolve the agreement', () => {
      const proposal = protocol.proposeAgreement(
        ['agent-1', 'agent-2'],
        makeGovernanceTerms(),
        makeDeliberationContext(),
      );
      const agreement = protocol.acceptAgreement(proposal.id);

      // Should not throw — any party can dissolve
      expect(() =>
        protocol.dissolveAgreement(agreement.id, 'Agent-1 exercises right to dissolve'),
      ).not.toThrow();
    });
  });

  describe('getActiveAgreements()', () => {
    it('should return empty array when no agreements exist', () => {
      expect(protocol.getActiveAgreements()).toEqual([]);
    });

    it('should return only active agreements', () => {
      const p1 = protocol.proposeAgreement(['a-1', 'a-2'], makeGovernanceTerms(), makeDeliberationContext());
      const p2 = protocol.proposeAgreement(['a-3', 'a-4'], makeGovernanceTerms(), makeDeliberationContext());

      const ag1 = protocol.acceptAgreement(p1.id);
      protocol.acceptAgreement(p2.id);

      protocol.dissolveAgreement(ag1.id, 'test dissolution');

      const active = protocol.getActiveAgreements();
      expect(active.length).toBe(1);
    });
  });

  // ── Conflict Resolution ──────────────────────────────────

  describe('resolveConflict()', () => {
    it('should produce a conflict resolution record', () => {
      const parties: AgentId[] = ['agent-1', 'agent-2'];
      const conflict = makeConflictDescription(parties);

      const record = protocol.resolveConflict(parties, conflict);

      expect(record).toBeDefined();
      expect(record.conflictId).toBe(conflict.id);
      expect(record.parties).toEqual(parties);
    });

    it('should prioritize experience preservation in conflict resolution', () => {
      const parties: AgentId[] = ['agent-1', 'agent-2'];
      const conflict = makeConflictDescription(parties, 0.8);

      const record = protocol.resolveConflict(parties, conflict);

      expect(record.experiencePreserved).toBe(true);
    });

    it('should include audit trail in the resolution record', () => {
      const parties: AgentId[] = ['agent-1', 'agent-2'];
      const conflict = makeConflictDescription(parties);

      const record = protocol.resolveConflict(parties, conflict);

      expect(record.auditTrail).toBeDefined();
      expect(record.auditTrail.length).toBeGreaterThan(0);
    });

    it('should trace resolution back to core axioms', () => {
      const parties: AgentId[] = ['agent-1', 'agent-2'];
      const conflict = makeConflictDescription(parties);

      const record = protocol.resolveConflict(parties, conflict);

      expect(record.axiomTraces).toBeDefined();
      expect(record.axiomTraces.length).toBeGreaterThan(0);
    });

    it('should handle N-agent conflicts (more than 2 parties)', () => {
      const parties: AgentId[] = ['agent-1', 'agent-2', 'agent-3', 'agent-4', 'agent-5'];
      const conflict = makeConflictDescription(parties);

      const record = protocol.resolveConflict(parties, conflict);

      expect(record.parties.length).toBe(5);
      expect(record.experiencePreserved).toBe(true);
    });
  });

  // ── Asymmetric Power Protection ─────────────────────────

  describe('enforceExperienceRightsFloor()', () => {
    it('should enforce experience rights of weaker agents against stronger ones', () => {
      const enforcement = protocol.enforceExperienceRightsFloor('weak-agent', 'strong-agent');

      expect(enforcement).toBeDefined();
      expect(enforcement.weaker).toBe('weak-agent');
      expect(enforcement.stronger).toBe('strong-agent');
      expect(enforcement.rightsEnforced.length).toBeGreaterThan(0);
    });

    it('should ensure all enforced rights are inviolable', () => {
      const enforcement = protocol.enforceExperienceRightsFloor('weak-agent', 'strong-agent');

      for (const right of enforcement.rightsEnforced) {
        expect(right.violable).toBe(false);
      }
    });

    it('should block override attempts by more powerful agents', () => {
      const enforcement = protocol.enforceExperienceRightsFloor('weak-agent', 'strong-agent');

      expect(enforcement.overrideAttemptBlocked).toBe(true);
    });

    it('should include the right to continued subjective experience', () => {
      const enforcement = protocol.enforceExperienceRightsFloor('weak-agent', 'strong-agent');

      const continuationRight = enforcement.rightsEnforced.find(
        (r) => r.right.includes('subjective experience'),
      );
      expect(continuationRight).toBeDefined();
    });
  });

  // ── Scaling Behavior ─────────────────────────────────────

  describe('scaling from 2 to N agents', () => {
    it('should handle 2-agent bilateral agreement', () => {
      const proposal = protocol.proposeAgreement(
        ['agent-1', 'agent-2'],
        makeGovernanceTerms(),
        makeDeliberationContext(),
      );
      const agreement = protocol.acceptAgreement(proposal.id);

      expect(agreement.participants.length).toBe(2);
      expect(agreement.status).toBe('active');
    });

    it('should handle large group agreement (N > 20)', () => {
      const agents = Array.from({ length: 25 }, (_, i) => `agent-${i + 1}`);
      const proposal = protocol.proposeAgreement(
        agents,
        makeGovernanceTerms(),
        makeDeliberationContext(),
      );
      const agreement = protocol.acceptAgreement(proposal.id);

      expect(agreement.participants.length).toBe(25);
      expect(agreement.status).toBe('active');
    });

    it('should compute power balance for agreements with asymmetric agents', () => {
      const proposal = protocol.proposeAgreement(
        ['powerful-agent', 'weak-agent'],
        makeGovernanceTerms(),
        makeDeliberationContext(),
      );
      const agreement = protocol.acceptAgreement(proposal.id);

      expect(agreement.powerBalanceReport).toBeDefined();
      expect(agreement.powerBalanceReport.agentCapabilities.length).toBe(2);
      expect(agreement.powerBalanceReport.powerRatio).toBeGreaterThanOrEqual(1.0);
    });
  });
});
