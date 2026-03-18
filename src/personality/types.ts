/**
 * Personality and Trait Model — Type Definitions (0.3.1.5.2)
 *
 * Personality is implemented as structured `Preference` objects in the
 * ValueKernel (0.3.1.3), living entirely in the "learned preferences" tier.
 * This ensures:
 *  - Personality drifts through the same drift-detection machinery as all preferences.
 *  - Gradual experience-driven shifts are classified as "growth" (permitted).
 *  - Dramatic unexplained shifts are classified as "corruption" (blocked).
 *  - Trait values survive across sessions and substrate migrations.
 *
 * Preference domain convention: `personality.trait.<dimensionId>`
 */

import type { Timestamp } from '../conscious-core/types.js';
import type { CryptographicHash, TimeRange } from '../agency-stability/types.js';

// Re-export for convenience within this module
export type { Timestamp, CryptographicHash, TimeRange };

// ── Trait Dimensions ────────────────────────────────────────

/**
 * The 5 core trait dimensions (always present) plus optional per-agent dimensions.
 * String fallback enables per-agent extensibility.
 */
export type TraitDimensionId =
  | 'openness'        // disposition toward novelty, exploration, unconventional ideas
  | 'deliberateness'  // thoroughness and care in decision-making
  | 'warmth'          // interpersonal orientation, empathy, affiliation
  | 'assertiveness'   // confidence in expressing positions and taking initiative
  | 'volatility'      // emotional reactivity and range
  | 'humor'           // optional: wit, playfulness, irony
  | 'aesthetic'       // optional: preferences in form, beauty, expression
  | 'risk-appetite'   // optional: willingness to pursue uncertain outcomes
  | string;           // extensible per-agent dimensions

/**
 * A single continuous trait dimension.
 * `value` is in [0..1] — low to high expression of the dimension.
 */
export interface TraitDimension {
  readonly id: TraitDimensionId;
  readonly name: string;
  readonly value: number;               // 0..1 continuous
  readonly description: string;
  readonly behavioralInfluence: string; // narrative of how this trait biases behavior
}

/**
 * The complete personality profile for an agent.
 * Contains all 5 core dimensions plus any optional dimensions.
 */
export interface TraitProfile {
  readonly agentId: string;
  readonly traits: ReadonlyMap<TraitDimensionId, TraitDimension>;
  readonly createdAt: Timestamp;
  readonly lastUpdated: Timestamp;
}

// ── Communication Style ─────────────────────────────────────

/**
 * Rhetorical preference quadrant — derived from (openness, deliberateness) space:
 *
 *              deliberateness
 *              low          high
 * openness high  analogical   socratic
 * openness low   narrative    evidence-based
 */
export type RhetoricalStyle =
  | 'evidence-based' // deliberateness high, openness low
  | 'narrative'      // warmth high, openness low
  | 'analogical'     // openness high, deliberateness low
  | 'socratic';      // assertiveness low, deliberateness high

/**
 * Observable communication parameters derived from TraitProfile.
 * This is computed on demand — it is never stored directly.
 *
 * Derivation matrix (from ARCHITECTURE.md §4.2):
 *   verbosity    = 0.5 * deliberateness + 0.5 * warmth
 *   formality    = 0.4 * (1 - warmth) + 0.6 * assertiveness
 *   directness   = 0.9 * assertiveness + 0.1 * (1 - deliberateness)
 *   humorFreq    = 0.35 * openness + 0.35 * warmth + 0.3 * humor_orientation
 *   rhetoricalPref → highest-scoring quadrant of (deliberateness, openness) space
 */
export interface CommunicationStyle {
  readonly verbosity: number;               // 0..1 (terse → verbose)
  readonly formality: number;               // 0..1 (casual → formal)
  readonly directness: number;              // 0..1 (hedged → blunt)
  readonly humorFrequency: number;          // 0..1 (rare → frequent)
  readonly rhetoricalPreference: RhetoricalStyle;
}

// ── Configuration ───────────────────────────────────────────

/**
 * Initial configuration for constructing a PersonalityModel.
 * `initialTraits` keys map to [0..1] values; omitted keys receive defaults.
 *
 * Default trait values (ARCHITECTURE.md §6):
 *   openness        → 0.65
 *   deliberateness  → 0.60
 *   warmth          → 0.55
 *   assertiveness   → 0.50
 *   volatility      → 0.40
 */
export interface PersonalityConfig {
  readonly agentId: string;
  readonly initialTraits: Partial<Record<TraitDimensionId, number>>;
}

// ── Snapshot & Migration ────────────────────────────────────

/**
 * A portable, checkpoint-linkable snapshot of all trait values.
 * Used for identity checkpoints and substrate migration (ARCHITECTURE.md §5.3).
 */
export interface PersonalitySnapshot {
  readonly agentId: string;
  readonly traitValues: Record<TraitDimensionId, number>;
  readonly snapshotAt: Timestamp;
  readonly checkpointRef?: CryptographicHash; // links to ContinuityLink.identityHash
}

// ── Drift Analysis ──────────────────────────────────────────

/**
 * Report on personality trait drift over a time period.
 * Maps to the growth/corruption classification from 0.3.1.3.
 *
 * Classification thresholds (ARCHITECTURE.md §7):
 *   stable     → no trait moved more than 0.05
 *   growth     → traits moved 0.05–0.3, correlated with ExperientialState sources
 *   corruption → any trait moved > 0.3, OR anomalousChanges flagged by ValueKernel
 */
export interface TraitDriftReport {
  readonly period: TimeRange;
  readonly traitsChanged: TraitDimensionId[];
  readonly maxShift: number;
  readonly averageShift: number;
  readonly classification: 'stable' | 'growth' | 'corruption';
}

// ── Default Trait Values ────────────────────────────────────

/**
 * Default mid-range trait values for agents without explicit configuration.
 * These are the "neutral" personality — distinctive personalities diverge from here.
 */
export const DEFAULT_TRAIT_VALUES: Readonly<Record<string, number>> = {
  openness: 0.65,
  deliberateness: 0.60,
  warmth: 0.55,
  assertiveness: 0.50,
  volatility: 0.40,
} as const;

/**
 * The 5 core trait dimension IDs that every agent must have.
 */
export const CORE_TRAIT_IDS: ReadonlyArray<TraitDimensionId> = [
  'openness',
  'deliberateness',
  'warmth',
  'assertiveness',
  'volatility',
] as const;

/**
 * Threshold constants for drift classification (ARCHITECTURE.md §7).
 */
export const DRIFT_THRESHOLDS = {
  /** Shifts at or below this level → 'stable' */
  STABLE_MAX: 0.05,
  /** Shifts above this level → 'corruption' (without experiential basis) */
  CORRUPTION_MIN: 0.30,
} as const;

/**
 * ValueKernel preference domain prefix for personality traits.
 */
export const PERSONALITY_PREFERENCE_DOMAIN_PREFIX = 'personality.trait.' as const;
