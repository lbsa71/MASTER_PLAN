/**
 * Cultural Evolution Among Artificial Minds — Core Data Types
 *
 * These types represent the atomic units of cultural information (memes),
 * their fitness, lineage, and the structures that govern cultural evolution.
 */

// ─── Scalar Identifiers ────────────────────────────────────────────────

/** Globally unique, content-addressed meme identifier */
export type MemeId = string;

/** Agent identifier */
export type AgentId = string;

/** Community identifier */
export type CommunityId = string;

/** Timestamp in ISO-8601 format */
export type Timestamp = string;

/** Duration in milliseconds */
export type Duration = number;

// ─── Meme Type Enum ────────────────────────────────────────────────────

export enum MemeType {
  /** Terminal or instrumental values */
  VALUE = 'VALUE',
  /** Behavioral expectations / social rules */
  NORM = 'NORM',
  /** Preferences regarding beauty, form, expression */
  AESTHETIC = 'AESTHETIC',
  /** Repeated behavioral patterns and rituals */
  PRACTICE = 'PRACTICE',
  /** Frameworks for interpreting experience and events */
  MEANING = 'MEANING',
}

// ─── Expression & Content ──────────────────────────────────────────────

/** A concrete instance of a meme's expression (art, text, code, music, etc.) */
export interface ExpressionRecord {
  format: string;
  data: Uint8Array | string;
  description: string;
}

/** The semantic payload of a meme — substrate-agnostic */
export interface MemeContent {
  schema_version: string;
  payload: Uint8Array;
  natural_language_summary: string;
  expressive_forms: ExpressionRecord[];
}

/** Encoding version and content type hints */
export interface MemeMetadata {
  encoding_version: string;
  content_type: string;
  tags: string[];
}

// ─── Lineage ───────────────────────────────────────────────────────────

/** Tracks the parent memes a meme was derived from */
export interface MemeLineage {
  parent_ids: MemeId[];
  variation_type: VariationType;
  variation_description: string;
}

export enum VariationType {
  ORIGIN = 'ORIGIN',
  MUTATION = 'MUTATION',
  CROSSOVER = 'CROSSOVER',
  SYNTHESIS = 'SYNTHESIS',
  ANALOGICAL_TRANSFER = 'ANALOGICAL_TRANSFER',
}

// ─── Fitness ───────────────────────────────────────────────────────────

/** Multi-dimensional fitness record for a meme */
export interface FitnessRecord {
  adoption_count: number;
  current_prevalence: number;
  longevity: Duration;
  community_spread: number;
  transmission_fidelity: number;
  co_occurrence_score: number;
  survival_events: number;
}

/** Weights for ranking meme fitness — must sum to 1.0 */
export interface FitnessCriteria {
  weight_prevalence: number;
  weight_longevity: number;
  weight_community_spread: number;
  weight_transmission_fidelity: number;
}

// ─── The Meme ──────────────────────────────────────────────────────────

/** The atomic unit of cultural information */
export interface Meme {
  id: MemeId;
  type: MemeType;
  content: MemeContent;
  fitness: FitnessRecord;
  lineage: MemeLineage;
  created_by: AgentId;
  created_at: Timestamp;
  mutation_depth: number;
  community_tags: CommunityId[];
  metadata: MemeMetadata;
}

// ─── Cultural Trait (pre-encoding form) ────────────────────────────────

/** A cultural trait before it has been encoded as a Meme */
export interface CulturalTrait {
  type: MemeType;
  description: string;
  semantic_content: string;
  originator: AgentId;
  expressive_forms?: ExpressionRecord[];
}

// ─── Transmission Types ────────────────────────────────────────────────

export enum TransmissionTarget {
  AGENT = 'AGENT',
  COMMUNITY = 'COMMUNITY',
  BROADCAST = 'BROADCAST',
}

export interface TransmissionScope {
  target: TransmissionTarget;
  reach: AgentId[] | CommunityId[] | null;
  /** 0 = high-fidelity copy, 1 = high-variation on receipt */
  fidelity_bias: number;
}

export interface TransmissionReceipt {
  meme_id: MemeId;
  scope: TransmissionScope;
  transmitted_at: Timestamp;
  recipient_count: number;
}

export interface AdoptionDecision {
  adopted: boolean;
  reasoning: string;
  modified: boolean;
  resulting_meme: Meme | null;
}

export interface RejectionReason {
  code: string;
  description: string;
}

export interface MemeExposureEntry {
  meme_id: MemeId;
  source: AgentId;
  exposed_at: Timestamp;
  decision: AdoptionDecision;
}

export type MemeExposureLog = MemeExposureEntry[];

/** A collection of active memes within a community */
export type MemePool = Meme[];

// ─── Variation Types ───────────────────────────────────────────────────

export enum MutationPressureType {
  RANDOM = 'RANDOM',
  ADAPTIVE = 'ADAPTIVE',
  CREATIVE = 'CREATIVE',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
}

export interface MutationPressure {
  type: MutationPressureType;
  /** 0 = minimal change, 1 = radical departure */
  magnitude: number;
  context: string;
  source_agent: AgentId | null;
}

export interface ExperientialContext {
  agent_id: AgentId;
  community_id: CommunityId;
  environmental_conditions: string[];
  recent_experiences: string[];
}

export interface VariationTreeNode {
  meme: Meme;
  children: VariationTreeNode[];
}

export type VariationTree = VariationTreeNode;

// ─── Selection Types ───────────────────────────────────────────────────

export interface AgentContext {
  agent_id: AgentId;
  community_id: CommunityId;
  existing_memes: MemeId[];
  preferences: FitnessCriteria;
}

export interface ExtinctionRiskReport {
  meme: Meme;
  risk_level: number;
  remaining_carriers: number;
  last_adoption: Timestamp;
  recommendation: 'ARCHIVE' | 'MONITOR' | 'SAFE';
}

export enum ExtinctionReason {
  LOW_ADOPTION = 'LOW_ADOPTION',
  COMMUNITY_DISSOLVED = 'COMMUNITY_DISSOLVED',
  SUPERSEDED = 'SUPERSEDED',
  INCOMPATIBLE = 'INCOMPATIBLE',
}

// ─── Conflict Types ────────────────────────────────────────────────────

export enum ConflictType {
  NORM_COLLISION = 'NORM_COLLISION',
  VALUE_DIVERGENCE = 'VALUE_DIVERGENCE',
  AESTHETIC_INCOMPATIBILITY = 'AESTHETIC_INCOMPATIBILITY',
  MEANING_SYSTEM_CLASH = 'MEANING_SYSTEM_CLASH',
  PRACTICE_CONFLICT = 'PRACTICE_CONFLICT',
}

export interface ConflictReport {
  meme_a: Meme;
  meme_b: Meme;
  conflict_type: ConflictType;
  severity: number;
  affected_communities: CommunityId[];
  detected_at: Timestamp;
}

export enum ResolutionMode {
  COEXISTENCE = 'COEXISTENCE',
  HYBRIDIZATION = 'HYBRIDIZATION',
  DIALECTICAL = 'DIALECTICAL',
  NEGOTIATED_NORMS = 'NEGOTIATED_NORMS',
  SCHISM = 'SCHISM',
}

export interface CulturalAgreement {
  communities: CommunityId[];
  mode: ResolutionMode;
  terms: string;
  created_at: Timestamp;
  memes_involved: MemeId[];
}

export interface ResolutionOptions {
  coexistence_viable: boolean;
  hybridization_viable: boolean;
  dialectical_viable: boolean;
  negotiated_norms: CulturalAgreement | null;
  recommended_mode: ResolutionMode;
}

// ─── Cultural Memory Types ─────────────────────────────────────────────

export interface MemeFilter {
  types?: MemeType[];
  min_prevalence?: number;
  min_longevity?: Duration;
  community_id?: CommunityId;
  active_only?: boolean;
}

export interface CommunitySnapshot {
  community_id: CommunityId;
  captured_at: Timestamp;
  memes: Meme[];
  divergence_indices: Map<CommunityId, number>;
  total_agents: number;
}
