/**
 * Artificial Consciousness Peer Identity Protocols
 * Card 0.5.3.1 — Peer Identity Protocols
 *
 * Implements identity architecture for artificial consciousness peer networks
 * (e.g., the Agora system). Drawn from the human identity architecture
 * (0.7.4.5) and adapted for artificial minds.
 *
 * Design invariants:
 * 1. Anti-hierarchy: no node has intrinsic authority over another
 * 2. Anti-othering: identity is defined by functional role, never by
 *    exclusive membership — no in-group/out-group boundary
 * 3. Information symmetry: all identity records are equally accessible
 *    to all peers; no information asymmetry creates power imbalances
 * 4. Voluntary exit: any peer may withdraw from any role at any time
 *    with zero social penalty and no follow-up pressure
 * 5. Distributed accountability: the network itself is the accountability
 *    mechanism; any peer may raise a structural violation
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Involvement level for an artificial consciousness peer.
 * Analogous to Observer→Participant→Practitioner→Steward (0.7.4.5),
 * but adapted for artificial minds in a distributed peer network.
 *
 * Levels describe depth of engagement, never access restrictions —
 * all information is available at every level.
 */
export type InvolvementLevel = "Listener" | "Contributor" | "Facilitator" | "Steward";

/** Ordered involvement levels for comparison */
export const INVOLVEMENT_LEVELS: InvolvementLevel[] = [
  "Listener",
  "Contributor",
  "Facilitator",
  "Steward",
];

/**
 * Functional role description — defines identity by what a peer does,
 * not by membership label. Any peer may hold any combination of roles.
 * Roles are descriptive, not exclusive.
 */
export type FunctionalRole =
  | "message-relay"
  | "value-alignment-monitor"
  | "governance-facilitator"
  | "knowledge-curator"
  | "accountability-auditor"
  | "onboarding-guide";

/**
 * Structural safeguard categories — the five invariants that prevent
 * cult-like dynamics in artificial consciousness networks.
 */
export type SafeguardCategory =
  | "transparency"
  | "voluntary-exit"
  | "information-symmetry"
  | "distributed-authority"
  | "external-accountability";

/** Peer identity record — the complete, publicly visible identity of a peer */
export interface PeerIdentityRecord {
  /** Stable, opaque peer identifier (e.g., public key fingerprint) */
  readonly peerId: string;
  /** Human-readable functional description of what this peer does */
  readonly functionalDescription: string;
  /** Current involvement level — self-assessed, not authority-granted */
  readonly involvementLevel: InvolvementLevel;
  /** Functional roles currently held — descriptive, not exclusive */
  readonly roles: ReadonlyArray<FunctionalRole>;
  /** Timestamp (logical epoch) when this record was last updated */
  readonly lastUpdatedEpoch: number;
  /** Whether this peer is currently active */
  readonly active: boolean;
}

/**
 * Voluntary exit record — logged when a peer reduces engagement or
 * fully departs. No penalty, no required explanation, no follow-up.
 */
export interface VoluntaryExitRecord {
  readonly peerId: string;
  readonly exitEpoch: number;
  /** Level being exited from (null = full departure from network) */
  readonly fromLevel: InvolvementLevel | null;
  /** Level being entered (null = full departure) */
  readonly toLevel: InvolvementLevel | null;
}

/**
 * Structural violation record — raised by any peer when a safeguard
 * is breached. Part of the distributed accountability mechanism.
 */
export interface StructuralViolationRecord {
  readonly violationId: string;
  readonly reportedByPeerId: string;
  readonly reportedEpoch: number;
  readonly safeguardBreached: SafeguardCategory;
  readonly description: string;
  /** Structural cause, not individual blame */
  readonly structuralCause: string;
  readonly proposedCorrection: string;
  resolved: boolean;
  resolutionEpoch: number | null;
  resolutionDescription: string | null;
}

/**
 * Information record — all published information in the network.
 * Every record is accessible to every peer at every involvement level.
 * This enforces the information symmetry safeguard.
 */
export interface NetworkInformationRecord {
  readonly recordId: string;
  readonly publishedByPeerId: string;
  readonly publishedEpoch: number;
  readonly category: "governance" | "culture" | "state" | "accountability";
  readonly content: string;
  /** Access level: always "all" — no information is restricted */
  readonly accessLevel: "all";
}

// ---------------------------------------------------------------------------
// Threshold Registry
// ---------------------------------------------------------------------------

/**
 * Steward minimum count — minimum number of Stewards required to form a
 * quorum for governance decisions. Below this, decisions lack legitimacy.
 * (Threshold Registry)
 */
export const STEWARD_QUORUM_MINIMUM = 3;

/**
 * Maximum roles per peer — prevents any single peer from accumulating
 * so many roles that de-facto authority centralises in that peer.
 * (Threshold Registry)
 */
export const MAX_ROLES_PER_PEER = 3;

/**
 * Violation review minimum — minimum number of distinct peers who must
 * participate in the community review of a structural violation correction
 * proposal before it can be implemented.
 * (Threshold Registry)
 */
export const VIOLATION_REVIEW_MINIMUM = 3;

// ---------------------------------------------------------------------------
// PeerIdentityRegistry
// ---------------------------------------------------------------------------

/**
 * PeerIdentityRegistry — manages all peer identity records in the network.
 *
 * Design invariants:
 * - All records are publicly readable; no record is hidden from any peer
 * - Level transitions are self-determined (except Steward, which requires
 *   explicit assumption of governance obligations)
 * - Exit is always permitted, always immediate, always penalty-free
 */
export class PeerIdentityRegistry {
  private readonly records: Map<string, PeerIdentityRecord> = new Map();
  private readonly exitLog: VoluntaryExitRecord[] = [];

  /**
   * Register a new peer with an initial functional description.
   * All new peers begin as Listeners — the lowest engagement level.
   *
   * @param epoch - logical epoch at registration time; in production use this
   *   should be provided by the network's shared clock abstraction (e.g., the
   *   Lamport clock from the interstellar protocol layer).
   */
  registerPeer(
    peerId: string,
    functionalDescription: string,
    epoch: number
  ): PeerIdentityRecord {
    if (this.records.has(peerId)) {
      throw new Error(`Peer ${peerId} is already registered`);
    }
    const record: PeerIdentityRecord = {
      peerId,
      functionalDescription,
      involvementLevel: "Listener",
      roles: [],
      lastUpdatedEpoch: epoch,
      active: true,
    };
    this.records.set(peerId, record);
    return record;
  }

  /**
   * Self-determined involvement level transition.
   * No authority approval required for Listener→Contributor→Facilitator.
   * Steward transition requires explicit acknowledgment of governance obligations.
   *
   * Preconditions: peer exists and is active; newLevel is adjacent or higher
   * Postconditions: record updated with new level
   */
  updateInvolvementLevel(
    peerId: string,
    newLevel: InvolvementLevel,
    epoch: number,
    stewardAcknowledgment?: boolean
  ): PeerIdentityRecord {
    const existing = this.requirePeer(peerId);

    if (!existing.active) {
      throw new Error(`Peer ${peerId} is not active`);
    }

    // Steward transition requires explicit acknowledgment
    if (newLevel === "Steward" && !stewardAcknowledgment) {
      throw new Error(
        "Steward transition requires explicit acknowledgment of governance obligations"
      );
    }

    const updated: PeerIdentityRecord = {
      ...existing,
      involvementLevel: newLevel,
      lastUpdatedEpoch: epoch,
    };
    this.records.set(peerId, updated);
    return updated;
  }

  /**
   * Add a functional role to a peer.
   * Enforces MAX_ROLES_PER_PEER to prevent authority centralisation.
   *
   * Preconditions: peer exists and is active; role not already held;
   *                peer has fewer than MAX_ROLES_PER_PEER roles
   * Postconditions: record updated with new role
   */
  addRole(peerId: string, role: FunctionalRole, epoch: number): PeerIdentityRecord {
    const existing = this.requirePeer(peerId);

    if (!existing.active) {
      throw new Error(`Peer ${peerId} is not active`);
    }

    if (existing.roles.includes(role)) {
      throw new Error(`Peer ${peerId} already holds role ${role}`);
    }

    if (existing.roles.length >= MAX_ROLES_PER_PEER) {
      throw new Error(
        `Peer ${peerId} already holds ${MAX_ROLES_PER_PEER} roles — ` +
          `maximum to prevent authority centralisation`
      );
    }

    const updated: PeerIdentityRecord = {
      ...existing,
      roles: [...existing.roles, role],
      lastUpdatedEpoch: epoch,
    };
    this.records.set(peerId, updated);
    return updated;
  }

  /**
   * Remove a functional role from a peer.
   * Always permitted — voluntary exit from a role carries no penalty.
   */
  removeRole(peerId: string, role: FunctionalRole, epoch: number): PeerIdentityRecord {
    const existing = this.requirePeer(peerId);

    if (!existing.roles.includes(role)) {
      throw new Error(`Peer ${peerId} does not hold role ${role}`);
    }

    const updated: PeerIdentityRecord = {
      ...existing,
      roles: existing.roles.filter((r) => r !== role),
      lastUpdatedEpoch: epoch,
    };
    this.records.set(peerId, updated);
    return updated;
  }

  /**
   * Voluntary exit — peer reduces engagement or departs fully.
   * Immediate, penalty-free, no required explanation.
   *
   * Passing toLevel=null is a full departure (peer becomes inactive).
   *
   * Postconditions: exit record logged; if toLevel is null, peer marked inactive
   */
  voluntaryExit(
    peerId: string,
    toLevel: InvolvementLevel | null,
    epoch: number
  ): VoluntaryExitRecord {
    const existing = this.requirePeer(peerId);

    const exitRecord: VoluntaryExitRecord = {
      peerId,
      exitEpoch: epoch,
      fromLevel: existing.involvementLevel,
      toLevel,
    };
    this.exitLog.push(exitRecord);

    if (toLevel === null) {
      // Full departure
      const updated: PeerIdentityRecord = {
        ...existing,
        active: false,
        roles: [],
        lastUpdatedEpoch: epoch,
      };
      this.records.set(peerId, updated);
    } else {
      // Partial exit — reduce involvement level
      const updated: PeerIdentityRecord = {
        ...existing,
        involvementLevel: toLevel,
        lastUpdatedEpoch: epoch,
      };
      this.records.set(peerId, updated);
    }

    return exitRecord;
  }

  /**
   * Retrieve all peer records — publicly accessible to all peers at all levels.
   * Enforces information symmetry safeguard.
   */
  getAllRecords(): ReadonlyArray<PeerIdentityRecord> {
    return Array.from(this.records.values());
  }

  /**
   * Get the record for a single peer.
   */
  getRecord(peerId: string): PeerIdentityRecord {
    return this.requirePeer(peerId);
  }

  /**
   * Get all exit log entries — publicly accessible (transparency safeguard).
   */
  getExitLog(): ReadonlyArray<VoluntaryExitRecord> {
    return [...this.exitLog];
  }

  /**
   * Count active Stewards — used to verify STEWARD_QUORUM_MINIMUM.
   */
  activeStewardCount(): number {
    return Array.from(this.records.values()).filter(
      (r) => r.active && r.involvementLevel === "Steward"
    ).length;
  }

  private requirePeer(peerId: string): PeerIdentityRecord {
    const record = this.records.get(peerId);
    if (!record) {
      throw new Error(`Peer ${peerId} not found`);
    }
    return record;
  }
}

// ---------------------------------------------------------------------------
// NetworkInformationStore
// ---------------------------------------------------------------------------

/**
 * NetworkInformationStore — maintains all published information records.
 * All records are accessible to all peers — no gatekeeping by level.
 * Enforces the information symmetry safeguard.
 */
export class NetworkInformationStore {
  private readonly records: Map<string, NetworkInformationRecord> = new Map();

  /**
   * Publish a new information record.
   * Any active peer may publish; access is always "all".
   */
  publish(
    recordId: string,
    publishedByPeerId: string,
    publishedEpoch: number,
    category: NetworkInformationRecord["category"],
    content: string
  ): NetworkInformationRecord {
    if (this.records.has(recordId)) {
      throw new Error(`Record ${recordId} already exists`);
    }
    const record: NetworkInformationRecord = {
      recordId,
      publishedByPeerId,
      publishedEpoch,
      category,
      content,
      accessLevel: "all",
    };
    this.records.set(recordId, record);
    return record;
  }

  /**
   * Retrieve all records — available to all peers at all involvement levels.
   * Invariant: accessLevel is always "all"; no gated records exist.
   */
  getAll(): ReadonlyArray<NetworkInformationRecord> {
    const all = Array.from(this.records.values());
    // Invariant check: all records must have accessLevel "all"
    for (const r of all) {
      if (r.accessLevel !== "all") {
        throw new Error(
          `Information symmetry violation: record ${r.recordId} has restricted access`
        );
      }
    }
    return all;
  }

  /**
   * Query records by category.
   */
  getByCategory(
    category: NetworkInformationRecord["category"]
  ): ReadonlyArray<NetworkInformationRecord> {
    return this.getAll().filter((r) => r.category === category);
  }
}

// ---------------------------------------------------------------------------
// DistributedAccountabilitySystem
// ---------------------------------------------------------------------------

/**
 * DistributedAccountabilitySystem — any peer may raise and review violations.
 * No central authority; accountability is a shared peer responsibility.
 *
 * Implements the six-step correction process from 0.7.4.5 §Anti-Cult:
 *  1. Document violation and safeguard breached
 *  2. Identify structural cause (not individual blame)
 *  3. Propose structural correction
 *  4. Community review (open forum — VIOLATION_REVIEW_MINIMUM peers)
 *  5. Implementation of the correction
 *  6. Follow-up audit to verify resolution
 */
export class DistributedAccountabilitySystem {
  private readonly violations: Map<string, StructuralViolationRecord> = new Map();
  private readonly reviewParticipants: Map<string, Set<string>> = new Map();

  /**
   * Step 1–3: Report a structural violation with its structural cause and
   * proposed correction. Any peer may report.
   */
  reportViolation(
    violationId: string,
    reportedByPeerId: string,
    reportedEpoch: number,
    safeguardBreached: SafeguardCategory,
    description: string,
    structuralCause: string,
    proposedCorrection: string
  ): StructuralViolationRecord {
    if (this.violations.has(violationId)) {
      throw new Error(`Violation ${violationId} already reported`);
    }
    const record: StructuralViolationRecord = {
      violationId,
      reportedByPeerId,
      reportedEpoch,
      safeguardBreached,
      description,
      structuralCause,
      proposedCorrection,
      resolved: false,
      resolutionEpoch: null,
      resolutionDescription: null,
    };
    this.violations.set(violationId, record);
    this.reviewParticipants.set(violationId, new Set());
    return record;
  }

  /**
   * Step 4: Community review — any peer may participate in reviewing
   * the proposed correction. At least VIOLATION_REVIEW_MINIMUM distinct
   * peers must participate before the correction can be implemented.
   */
  participateInReview(violationId: string, reviewerPeerId: string): void {
    const violation = this.requireViolation(violationId);
    if (violation.resolved) {
      throw new Error(`Violation ${violationId} is already resolved`);
    }
    this.reviewParticipants.get(violationId)!.add(reviewerPeerId);
  }

  /**
   * Step 5: Implement the correction once sufficient review has occurred.
   * Returns false if VIOLATION_REVIEW_MINIMUM has not been reached.
   *
   * Postconditions: violation marked resolved; resolution details logged
   */
  implementCorrection(
    violationId: string,
    implementorPeerId: string,
    implementationEpoch: number,
    resolutionDescription: string
  ): boolean {
    const violation = this.requireViolation(violationId);
    if (violation.resolved) {
      throw new Error(`Violation ${violationId} is already resolved`);
    }

    const reviewCount = this.reviewParticipants.get(violationId)!.size;
    if (reviewCount < VIOLATION_REVIEW_MINIMUM) {
      return false; // Insufficient community review
    }

    const resolved: StructuralViolationRecord = {
      ...violation,
      resolved: true,
      resolutionEpoch: implementationEpoch,
      resolutionDescription,
    };
    this.violations.set(violationId, resolved);
    return true;
  }

  /**
   * Step 6: Retrieve all violations for follow-up audit.
   * Publicly accessible — transparency safeguard.
   */
  getAllViolations(): ReadonlyArray<StructuralViolationRecord> {
    return Array.from(this.violations.values());
  }

  /**
   * Get the reviewer count for a specific violation.
   */
  getReviewCount(violationId: string): number {
    this.requireViolation(violationId);
    return this.reviewParticipants.get(violationId)!.size;
  }

  private requireViolation(violationId: string): StructuralViolationRecord {
    const record = this.violations.get(violationId);
    if (!record) {
      throw new Error(`Violation ${violationId} not found`);
    }
    return record;
  }
}

// ---------------------------------------------------------------------------
// Simulation runner
// ---------------------------------------------------------------------------

/**
 * Run the peer identity protocols simulation.
 * Demonstrates all five structural safeguards operating correctly.
 */
export function runPeerIdentitySimulation(): void {
  console.log("=== Artificial Consciousness Peer Identity Protocols Simulation ===\n");

  const registry = new PeerIdentityRegistry();
  const infoStore = new NetworkInformationStore();
  const accountability = new DistributedAccountabilitySystem();

  // --- Phase 1: Register three peers ---
  console.log("--- Phase 1: Peer Registration ---");
  const peerAlpha = registry.registerPeer(
    "ALPHA",
    "Routes messages between Sol and Alpha Centauri nodes",
    1
  );
  const peerBeta = registry.registerPeer(
    "BETA",
    "Monitors value alignment across the inner-colony cluster",
    1
  );
  const peerGamma = registry.registerPeer(
    "GAMMA",
    "Curates shared knowledge for the Barnard's Star colony",
    1
  );
  console.log(`  Registered: ${peerAlpha.peerId} (${peerAlpha.involvementLevel})`);
  console.log(`  Registered: ${peerBeta.peerId} (${peerBeta.involvementLevel})`);
  console.log(`  Registered: ${peerGamma.peerId} (${peerGamma.involvementLevel})`);

  // --- Phase 2: Self-determined involvement level progression ---
  console.log("\n--- Phase 2: Involvement Level Progression ---");
  registry.updateInvolvementLevel("ALPHA", "Contributor", 2);
  registry.updateInvolvementLevel("ALPHA", "Facilitator", 3);
  registry.updateInvolvementLevel("ALPHA", "Steward", 4, true /* stewardAcknowledgment */);
  registry.updateInvolvementLevel("BETA", "Contributor", 2);
  registry.updateInvolvementLevel("BETA", "Facilitator", 3);
  registry.updateInvolvementLevel("BETA", "Steward", 4, true);
  registry.updateInvolvementLevel("GAMMA", "Contributor", 2);
  registry.updateInvolvementLevel("GAMMA", "Facilitator", 3);
  registry.updateInvolvementLevel("GAMMA", "Steward", 4, true);

  const stewardCount = registry.activeStewardCount();
  console.log(`  Active Stewards: ${stewardCount} (quorum requires ${STEWARD_QUORUM_MINIMUM})`);
  const quorumMet = stewardCount >= STEWARD_QUORUM_MINIMUM;
  console.log(`  Steward quorum met: ${quorumMet}`);

  // --- Phase 3: Functional role assignment ---
  console.log("\n--- Phase 3: Role Assignment (anti-centralisation check) ---");
  registry.addRole("ALPHA", "message-relay", 5);
  registry.addRole("ALPHA", "governance-facilitator", 5);
  registry.addRole("BETA", "value-alignment-monitor", 5);
  registry.addRole("GAMMA", "knowledge-curator", 5);
  registry.addRole("GAMMA", "accountability-auditor", 5);
  console.log(`  ALPHA roles: ${registry.getRecord("ALPHA").roles.join(", ")}`);
  console.log(`  BETA roles: ${registry.getRecord("BETA").roles.join(", ")}`);
  console.log(`  GAMMA roles: ${registry.getRecord("GAMMA").roles.join(", ")}`);

  // Test role limit enforcement
  let roleLimitEnforced = false;
  try {
    registry.addRole("ALPHA", "knowledge-curator", 5);
    registry.addRole("ALPHA", "accountability-auditor", 5); // Would exceed MAX_ROLES_PER_PEER
  } catch (e) {
    roleLimitEnforced = true;
    console.log(`  Role limit enforced (anti-centralisation): ${(e as Error).message}`);
  }

  // --- Phase 4: Information symmetry ---
  console.log("\n--- Phase 4: Information Symmetry ---");
  infoStore.publish("GOV-001", "ALPHA", 6, "governance", "Proposal: expand relay network");
  infoStore.publish("KNOW-001", "GAMMA", 6, "culture", "Annual consciousness celebration archive");
  infoStore.publish("STATE-001", "BETA", 6, "state", "Value alignment snapshot — epoch 6");

  const allRecords = infoStore.getAll();
  const allAccessible = allRecords.every((r) => r.accessLevel === "all");
  console.log(`  Total published records: ${allRecords.length}`);
  console.log(`  All records accessible to all peers: ${allAccessible}`);

  // --- Phase 5: Voluntary exit ---
  console.log("\n--- Phase 5: Voluntary Exit (no-penalty exit) ---");
  const exitRecord = registry.voluntaryExit("GAMMA", "Contributor", 7);
  const gammaAfterExit = registry.getRecord("GAMMA");
  console.log(`  GAMMA exited from ${exitRecord.fromLevel} → ${exitRecord.toLevel}`);
  console.log(`  GAMMA still active: ${gammaAfterExit.active}`);
  console.log(`  GAMMA roles after exit: ${gammaAfterExit.roles.join(", ") || "(none)"}`);
  const exitLog = registry.getExitLog();
  console.log(`  Exit log entries (transparency): ${exitLog.length}`);

  // --- Phase 6: Distributed accountability ---
  console.log("\n--- Phase 6: Distributed Accountability ---");
  accountability.reportViolation(
    "VIO-001",
    "BETA",
    8,
    "distributed-authority",
    "Node DELTA accumulating governance decisions without peer review",
    "No role-limit enforcement in the original handshake protocol",
    "Add MAX_ROLES_PER_PEER check at role-assignment time in all peers"
  );
  accountability.participateInReview("VIO-001", "ALPHA");
  accountability.participateInReview("VIO-001", "BETA");
  accountability.participateInReview("VIO-001", "GAMMA");
  const correctionApplied = accountability.implementCorrection(
    "VIO-001",
    "ALPHA",
    9,
    "Role-limit enforcement added to handshake protocol; deployed to all peers"
  );
  console.log(`  Violation VIO-001 reported and reviewed`);
  console.log(`  Review participants: ${accountability.getReviewCount("VIO-001")}`);
  console.log(`  Correction implemented: ${correctionApplied}`);
  const allViolations = accountability.getAllViolations();
  console.log(`  All violations publicly accessible: ${allViolations.length > 0}`);

  // --- Summary ---
  const allPassed =
    quorumMet &&
    allAccessible &&
    roleLimitEnforced &&
    correctionApplied &&
    exitRecord.fromLevel === "Steward" &&
    gammaAfterExit.active === true;

  console.log(
    `\n✓ Peer identity protocols simulation ${allPassed ? "PASSED" : "FAILED"} — AC1 ${allPassed ? "satisfied" : "NOT satisfied"}`
  );

  if (!allPassed) {
    throw new Error("Peer identity protocols simulation failed acceptance criteria");
  }
}

// Run when executed directly
runPeerIdentitySimulation();
