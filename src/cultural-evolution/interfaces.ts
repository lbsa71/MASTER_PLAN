/**
 * Cultural Evolution Among Artificial Minds — Interface Definitions
 *
 * Contracts for the five subsystems:
 *   1. Meme Encoding & Codec Layer
 *   2. Transmission Protocol Layer
 *   3. Variation Engine
 *   4. Selection & Inheritance
 *   5. Cultural Conflict Resolution & Synthesis Engine
 *   + Cultural Memory Bridge (integration with 0.3.2.3)
 */

import {
  Meme,
  MemeId,
  MemeType,
  AgentId,
  CommunityId,
  Timestamp,
  CulturalTrait,
  MutationPressure,
  TransmissionScope,
  TransmissionReceipt,
  AdoptionDecision,
  MemeExposureLog,
  MemePool,
  RejectionReason,
  ExperientialContext,
  VariationTree,
  FitnessRecord,
  FitnessCriteria,
  AgentContext,
  ExtinctionRiskReport,
  ConflictReport,
  ResolutionOptions,
  CulturalAgreement,
  MemeFilter,
  CommunitySnapshot,
} from './types';

// ─── Subsystem 1: Meme Encoding & Codec ────────────────────────────────

/**
 * Substrate-agnostic encoding/decoding of cultural traits.
 * Encoding is self-describing — no external schema registry required.
 */
export interface IMemeCodec {
  /** Encode a cultural trait into a Meme */
  encode(trait: CulturalTrait): Meme;

  /** Decode a Meme back into a cultural trait */
  decode(meme: Meme): CulturalTrait;

  /** Check whether this codec can decode a given meme */
  canDecode(meme: Meme): boolean;

  /** Apply a mutation to a meme under given pressure */
  mutate(meme: Meme, pressure: MutationPressure): Meme;

  /** Cultural hybridization — crossover of two memes */
  crossover(a: Meme, b: Meme): Meme;

  /** Compute semantic distance between two memes (0 = identical, 1 = maximally different) */
  distance(a: Meme, b: Meme): number;
}

// ─── Subsystem 2: Transmission Protocol ─────────────────────────────────

/**
 * Governs how memes propagate between minds and communities.
 * Transmission is voluntary and contextual — agents choose what to share and adopt.
 */
export interface ITransmissionProtocol {
  /** Broadcast a meme to a given scope */
  broadcast(meme: Meme, scope: TransmissionScope): TransmissionReceipt;

  /** An agent decides whether to adopt a received meme */
  receive(meme: Meme, source: AgentId): AdoptionDecision;

  /** Get the full exposure history of an agent */
  getExposureHistory(agentId: AgentId): MemeExposureLog;

  /** Get all active memes in a community */
  getCommunityMemePool(communityId: CommunityId): MemePool;

  /** Record that an agent adopted a meme */
  recordAdoption(agentId: AgentId, meme: Meme): void;

  /** Record that an agent rejected a meme */
  recordRejection(agentId: AgentId, meme: Meme, reason: RejectionReason): void;
}

// ─── Subsystem 3: Variation Engine ──────────────────────────────────────

/**
 * Generates novel cultural traits through creative synthesis, recombination,
 * environmental pressure responses, and spontaneous mutation.
 */
export interface IVariationEngine {
  /** Apply mutation to a meme under given pressure */
  mutate(meme: Meme, pressure: MutationPressure): Meme;

  /** Synthesize a new meme from multiple inputs + experiential context */
  synthesize(inputs: Meme[], experience: ExperientialContext): Meme;

  /** Crossover two memes from different lineages */
  crossover(a: Meme, b: Meme, blend_ratio: number): Meme;

  /** Project a meme from one domain onto another (analogical transfer) */
  generateAnalog(source: Meme, target_domain: MemeType): Meme;

  /** Get the full variation tree of a meme */
  getVariationHistory(meme: Meme): VariationTree;
}

// ─── Subsystem 4: Selection & Inheritance ───────────────────────────────

/**
 * Tracks meme fitness over time. Selection is decentralized and emergent —
 * fitness is measured by adoption rates, longevity, and community prevalence.
 */
export interface ISelectionEngine {
  /** Compute current fitness record for a meme */
  computeFitness(meme: Meme): FitnessRecord;

  /** Rank a pool of memes by given fitness criteria */
  rankMemePool(pool: MemePool, criteria: FitnessCriteria): Meme[];

  /** Sample a cultural heritage for a newly instantiated agent */
  sampleHeritage(community: CommunityId, newAgentContext: AgentContext): Meme[];

  /** Detect if a meme is at risk of extinction */
  detectExtinctionRisk(meme: Meme): ExtinctionRiskReport;

  /** Archive an extinct meme (preserves to 0.3.2.3, marks inactive) */
  archiveExtinctMeme(meme: Meme): void;
}

// ─── Subsystem 5: Cultural Conflict Resolution & Synthesis ──────────────

/**
 * Mechanisms for negotiation, hybridization, and coexistence when
 * distinct cultural traditions collide. Does NOT enforce a winner.
 */
export interface ICulturalConflictEngine {
  /** Detect conflicts between two meme pools */
  detectConflict(a: MemePool, b: MemePool): ConflictReport[];

  /** Propose resolution options for a detected conflict */
  proposeResolution(conflict: ConflictReport): ResolutionOptions;

  /** Create a hybrid meme from two conflicting memes */
  executeHybridization(a: Meme, b: Meme): Meme;

  /** Record a cultural agreement between communities */
  recordCulturalAgreement(communities: CommunityId[], agreement: CulturalAgreement): void;

  /** Compute cultural divergence between two communities (0–1 scalar) */
  getCulturalDivergenceIndex(a: CommunityId, b: CommunityId): number;
}

// ─── Cultural Memory Bridge (Integration with 0.3.2.3) ─────────────────

/**
 * Specialized cultural view layered over the knowledge preservation store.
 * Manages active meme pools, lineage graphs, and cultural archaeology.
 */
export interface ICulturalMemoryBridge {
  /** Persist a meme to the cultural memory store */
  persistMeme(meme: Meme): void;

  /** Retrieve a meme by ID */
  retrieveMeme(id: MemeId): Meme | null;

  /** Query memes in a community with optional filters */
  queryCommunityPool(community: CommunityId, filter: MemeFilter): Meme[];

  /** Get a snapshot of a community's culture at a point in time */
  getCulturalSnapshot(community: CommunityId, at: Timestamp): CommunitySnapshot;

  /** Get the lineage tree of a meme to a given depth */
  getLineageTree(meme: Meme, depth: number): VariationTree;

  /** Mark a meme as extinct with a reason */
  markExtinct(meme: Meme, reason: string): void;

  /** Search for memes similar to a query meme within a threshold */
  searchBySimilarity(query: Meme, threshold: number): Meme[];
}
