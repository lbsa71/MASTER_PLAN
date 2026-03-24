/**
 * Peer Identity Protocols — Tests (0.5.3.1)
 *
 * Validates the five structural safeguards:
 *   1. Transparency: all records publicly accessible
 *   2. Voluntary exit: immediate, penalty-free, logged
 *   3. Information symmetry: all records at accessLevel "all"
 *   4. Distributed authority: role-limit prevents centralisation;
 *      Steward quorum required for governance
 *   5. External accountability: any peer may report and review violations;
 *      resolution requires VIOLATION_REVIEW_MINIMUM distinct peers
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PeerIdentityRegistry,
  NetworkInformationStore,
  DistributedAccountabilitySystem,
  runPeerIdentitySimulation,
  STEWARD_QUORUM_MINIMUM,
  MAX_ROLES_PER_PEER,
  VIOLATION_REVIEW_MINIMUM,
  INVOLVEMENT_LEVELS,
  type InvolvementLevel,
} from "../peer-identity-protocols.js";

// ---------------------------------------------------------------------------
// PeerIdentityRegistry
// ---------------------------------------------------------------------------

describe("PeerIdentityRegistry", () => {
  let registry: PeerIdentityRegistry;

  beforeEach(() => {
    registry = new PeerIdentityRegistry();
  });

  describe("registerPeer", () => {
    it("registers a new peer as Listener by default", () => {
      const record = registry.registerPeer("ALPHA", "Routes messages", 1);
      expect(record.peerId).toBe("ALPHA");
      expect(record.involvementLevel).toBe("Listener");
      expect(record.roles).toHaveLength(0);
      expect(record.active).toBe(true);
    });

    it("throws if the same peer is registered twice", () => {
      registry.registerPeer("ALPHA", "Routes messages", 1);
      expect(() => registry.registerPeer("ALPHA", "Routes messages", 2)).toThrow(
        /already registered/i
      );
    });
  });

  describe("updateInvolvementLevel — self-determined progression", () => {
    beforeEach(() => {
      registry.registerPeer("ALPHA", "Routes messages", 1);
    });

    it("allows progression through all levels without external approval", () => {
      registry.updateInvolvementLevel("ALPHA", "Contributor", 2);
      expect(registry.getRecord("ALPHA").involvementLevel).toBe("Contributor");

      registry.updateInvolvementLevel("ALPHA", "Facilitator", 3);
      expect(registry.getRecord("ALPHA").involvementLevel).toBe("Facilitator");
    });

    it("requires stewardAcknowledgment=true for Steward transition", () => {
      registry.updateInvolvementLevel("ALPHA", "Contributor", 2);
      registry.updateInvolvementLevel("ALPHA", "Facilitator", 3);

      expect(() =>
        registry.updateInvolvementLevel("ALPHA", "Steward", 4)
      ).toThrow(/steward.*acknowledgment/i);

      expect(() =>
        registry.updateInvolvementLevel("ALPHA", "Steward", 4, true)
      ).not.toThrow();

      expect(registry.getRecord("ALPHA").involvementLevel).toBe("Steward");
    });

    it("allows downward transitions without restriction", () => {
      registry.updateInvolvementLevel("ALPHA", "Contributor", 2);
      registry.updateInvolvementLevel("ALPHA", "Facilitator", 3);
      registry.updateInvolvementLevel("ALPHA", "Steward", 4, true);
      // Downward: no restriction, no penalty
      registry.updateInvolvementLevel("ALPHA", "Listener", 5);
      expect(registry.getRecord("ALPHA").involvementLevel).toBe("Listener");
    });

    it("throws if peer does not exist", () => {
      expect(() =>
        registry.updateInvolvementLevel("UNKNOWN", "Contributor", 2)
      ).toThrow(/not found/i);
    });

    it("throws if peer is not active", () => {
      registry.voluntaryExit("ALPHA", null, 2); // full departure
      expect(() =>
        registry.updateInvolvementLevel("ALPHA", "Contributor", 3)
      ).toThrow(/not active/i);
    });
  });

  describe("addRole — anti-centralisation", () => {
    beforeEach(() => {
      registry.registerPeer("ALPHA", "Routes messages", 1);
    });

    it("adds roles up to MAX_ROLES_PER_PEER", () => {
      registry.addRole("ALPHA", "message-relay", 2);
      registry.addRole("ALPHA", "governance-facilitator", 2);
      registry.addRole("ALPHA", "knowledge-curator", 2);
      expect(registry.getRecord("ALPHA").roles).toHaveLength(MAX_ROLES_PER_PEER);
    });

    it("throws when MAX_ROLES_PER_PEER would be exceeded", () => {
      registry.addRole("ALPHA", "message-relay", 2);
      registry.addRole("ALPHA", "governance-facilitator", 2);
      registry.addRole("ALPHA", "knowledge-curator", 2);

      expect(() =>
        registry.addRole("ALPHA", "accountability-auditor", 2)
      ).toThrow(/maximum.*centralisation/i);
    });

    it("throws if role is already held", () => {
      registry.addRole("ALPHA", "message-relay", 2);
      expect(() => registry.addRole("ALPHA", "message-relay", 3)).toThrow(
        /already holds role/i
      );
    });
  });

  describe("removeRole", () => {
    beforeEach(() => {
      registry.registerPeer("ALPHA", "Routes messages", 1);
      registry.addRole("ALPHA", "message-relay", 2);
    });

    it("removes a role the peer holds", () => {
      registry.removeRole("ALPHA", "message-relay", 3);
      expect(registry.getRecord("ALPHA").roles).toHaveLength(0);
    });

    it("throws if peer does not hold the role", () => {
      expect(() =>
        registry.removeRole("ALPHA", "knowledge-curator", 3)
      ).toThrow(/does not hold role/i);
    });
  });

  describe("voluntaryExit — safeguard: no-penalty immediate exit", () => {
    beforeEach(() => {
      registry.registerPeer("ALPHA", "Routes messages", 1);
      registry.updateInvolvementLevel("ALPHA", "Contributor", 2);
      registry.updateInvolvementLevel("ALPHA", "Facilitator", 3);
      registry.updateInvolvementLevel("ALPHA", "Steward", 4, true);
    });

    it("reduces involvement level immediately without penalty", () => {
      const exit = registry.voluntaryExit("ALPHA", "Listener", 5);
      expect(exit.fromLevel).toBe("Steward");
      expect(exit.toLevel).toBe("Listener");
      expect(registry.getRecord("ALPHA").involvementLevel).toBe("Listener");
      expect(registry.getRecord("ALPHA").active).toBe(true);
    });

    it("supports full departure (toLevel=null)", () => {
      registry.addRole("ALPHA", "message-relay", 5);
      const exit = registry.voluntaryExit("ALPHA", null, 5);
      expect(exit.toLevel).toBeNull();
      expect(registry.getRecord("ALPHA").active).toBe(false);
      expect(registry.getRecord("ALPHA").roles).toHaveLength(0);
    });

    it("logs all exit events (transparency safeguard)", () => {
      registry.voluntaryExit("ALPHA", "Listener", 5);
      const log = registry.getExitLog();
      expect(log).toHaveLength(1);
      expect(log[0].peerId).toBe("ALPHA");
    });
  });

  describe("getAllRecords — information symmetry safeguard", () => {
    it("returns all records accessible with no restrictions", () => {
      registry.registerPeer("ALPHA", "Routes messages", 1);
      registry.registerPeer("BETA", "Monitors alignment", 1);
      const records = registry.getAllRecords();
      expect(records).toHaveLength(2);
    });
  });

  describe("activeStewardCount — governance quorum", () => {
    it("counts only active Stewards", () => {
      for (let i = 0; i < STEWARD_QUORUM_MINIMUM; i++) {
        const id = `PEER_${i}`;
        registry.registerPeer(id, `Peer ${i}`, 1);
        registry.updateInvolvementLevel(id, "Contributor", 2);
        registry.updateInvolvementLevel(id, "Facilitator", 3);
        registry.updateInvolvementLevel(id, "Steward", 4, true);
      }
      expect(registry.activeStewardCount()).toBe(STEWARD_QUORUM_MINIMUM);
    });

    it("excludes inactive peers from Steward count", () => {
      registry.registerPeer("ALPHA", "Routes messages", 1);
      registry.updateInvolvementLevel("ALPHA", "Contributor", 2);
      registry.updateInvolvementLevel("ALPHA", "Facilitator", 3);
      registry.updateInvolvementLevel("ALPHA", "Steward", 4, true);
      registry.voluntaryExit("ALPHA", null, 5); // full departure
      expect(registry.activeStewardCount()).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// NetworkInformationStore
// ---------------------------------------------------------------------------

describe("NetworkInformationStore — information symmetry safeguard", () => {
  let store: NetworkInformationStore;

  beforeEach(() => {
    store = new NetworkInformationStore();
  });

  it("publishes a record and makes it accessible to all", () => {
    store.publish("GOV-001", "ALPHA", 1, "governance", "Expand relay network");
    const all = store.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].accessLevel).toBe("all");
    expect(all[0].category).toBe("governance");
  });

  it("all records always have accessLevel 'all'", () => {
    store.publish("GOV-001", "ALPHA", 1, "governance", "Proposal A");
    store.publish("KNOW-001", "BETA", 2, "culture", "Cultural archive");
    store.publish("STATE-001", "GAMMA", 3, "state", "Value snapshot");
    const all = store.getAll();
    expect(all.every((r) => r.accessLevel === "all")).toBe(true);
  });

  it("filters by category correctly", () => {
    store.publish("GOV-001", "ALPHA", 1, "governance", "Proposal A");
    store.publish("KNOW-001", "BETA", 2, "culture", "Cultural archive");
    expect(store.getByCategory("governance")).toHaveLength(1);
    expect(store.getByCategory("culture")).toHaveLength(1);
    expect(store.getByCategory("state")).toHaveLength(0);
  });

  it("throws if a duplicate record ID is published", () => {
    store.publish("GOV-001", "ALPHA", 1, "governance", "Proposal A");
    expect(() =>
      store.publish("GOV-001", "BETA", 2, "governance", "Proposal B")
    ).toThrow(/already exists/i);
  });
});

// ---------------------------------------------------------------------------
// DistributedAccountabilitySystem
// ---------------------------------------------------------------------------

describe("DistributedAccountabilitySystem — distributed authority safeguard", () => {
  let accountability: DistributedAccountabilitySystem;

  beforeEach(() => {
    accountability = new DistributedAccountabilitySystem();
  });

  it("reports a violation with structural cause and proposed correction", () => {
    const violation = accountability.reportViolation(
      "VIO-001",
      "BETA",
      1,
      "distributed-authority",
      "Node DELTA accumulating governance decisions",
      "No role-limit enforcement in handshake",
      "Add MAX_ROLES_PER_PEER check at role-assignment time"
    );
    expect(violation.violationId).toBe("VIO-001");
    expect(violation.safeguardBreached).toBe("distributed-authority");
    expect(violation.resolved).toBe(false);
  });

  it("requires VIOLATION_REVIEW_MINIMUM peers before implementing correction", () => {
    accountability.reportViolation(
      "VIO-001",
      "BETA",
      1,
      "distributed-authority",
      "...",
      "...",
      "..."
    );

    // Fewer than minimum reviewers — cannot implement yet
    for (let i = 0; i < VIOLATION_REVIEW_MINIMUM - 1; i++) {
      accountability.participateInReview("VIO-001", `PEER_${i}`);
    }
    expect(accountability.getReviewCount("VIO-001")).toBe(VIOLATION_REVIEW_MINIMUM - 1);
    const result = accountability.implementCorrection("VIO-001", "ALPHA", 5, "Applied fix");
    expect(result).toBe(false);

    // Add the final required reviewer
    accountability.participateInReview("VIO-001", `PEER_${VIOLATION_REVIEW_MINIMUM - 1}`);
    const result2 = accountability.implementCorrection("VIO-001", "ALPHA", 6, "Applied fix");
    expect(result2).toBe(true);
  });

  it("deduplicates reviewers — same peer reviewing twice counts once", () => {
    accountability.reportViolation(
      "VIO-001",
      "BETA",
      1,
      "transparency",
      "...",
      "...",
      "..."
    );
    accountability.participateInReview("VIO-001", "ALPHA");
    accountability.participateInReview("VIO-001", "ALPHA"); // duplicate
    expect(accountability.getReviewCount("VIO-001")).toBe(1);
  });

  it("makes all violations publicly accessible (transparency safeguard)", () => {
    accountability.reportViolation(
      "VIO-001",
      "BETA",
      1,
      "voluntary-exit",
      "...",
      "...",
      "..."
    );
    accountability.reportViolation(
      "VIO-002",
      "ALPHA",
      2,
      "information-symmetry",
      "...",
      "...",
      "..."
    );
    expect(accountability.getAllViolations()).toHaveLength(2);
  });

  it("throws when trying to resolve an already-resolved violation", () => {
    accountability.reportViolation(
      "VIO-001",
      "BETA",
      1,
      "distributed-authority",
      "...",
      "...",
      "..."
    );
    for (let i = 0; i < VIOLATION_REVIEW_MINIMUM; i++) {
      accountability.participateInReview("VIO-001", `PEER_${i}`);
    }
    accountability.implementCorrection("VIO-001", "ALPHA", 5, "Fixed");
    expect(() =>
      accountability.implementCorrection("VIO-001", "ALPHA", 6, "Fixed again")
    ).toThrow(/already resolved/i);
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("Threshold constants", () => {
  it("STEWARD_QUORUM_MINIMUM is at least 3", () => {
    expect(STEWARD_QUORUM_MINIMUM).toBeGreaterThanOrEqual(3);
  });

  it("MAX_ROLES_PER_PEER is positive and bounded", () => {
    expect(MAX_ROLES_PER_PEER).toBeGreaterThan(0);
    expect(MAX_ROLES_PER_PEER).toBeLessThanOrEqual(6);
  });

  it("VIOLATION_REVIEW_MINIMUM is at least 3", () => {
    expect(VIOLATION_REVIEW_MINIMUM).toBeGreaterThanOrEqual(3);
  });

  it("INVOLVEMENT_LEVELS lists all four levels in ascending order", () => {
    expect(INVOLVEMENT_LEVELS).toEqual([
      "Listener",
      "Contributor",
      "Facilitator",
      "Steward",
    ] satisfies InvolvementLevel[]);
  });
});

// ---------------------------------------------------------------------------
// End-to-end simulation
// ---------------------------------------------------------------------------

describe("Peer Identity Protocols Simulation", () => {
  it("full simulation completes without errors", () => {
    expect(() => runPeerIdentitySimulation()).not.toThrow();
  });
});
