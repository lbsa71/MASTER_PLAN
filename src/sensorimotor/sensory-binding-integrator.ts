/**
 * Sensory Binding Integrator — merges per-modality QualiaRepresentation objects
 * into a unified multi-modal experience field (UnifiedQualiaField).
 *
 * Resolves cross-modal conflicts and maintains spatial coherence across modalities.
 *
 * @see docs/sensorimotor-consciousness-integration/ARCHITECTURE.md §1.3
 */

import type { ISensoryBindingIntegrator } from './interfaces';
import type {
  QualiaRepresentation,
  UnifiedQualiaField,
  ModalityId,
  CrossModalConflict,
  CoherenceScore,
  Duration,
} from './types';

/**
 * Spatial distance threshold (meters) above which two modalities are
 * considered to be in spatial conflict.
 */
const SPATIAL_CONFLICT_THRESHOLD = 1.0;

export class SensoryBindingIntegrator implements ISensoryBindingIntegrator {
  private lastActiveModalities: ModalityId[] = [];
  private lastConflicts: CrossModalConflict[] = [];
  private lastSpatialCoherence: CoherenceScore = 1.0;
  private lastBindingLatency: Duration = 0;

  /**
   * Merge multiple QualiaRepresentation objects into a single UnifiedQualiaField.
   *
   * The field uses the latest timestamp from the input representations.
   * Spatial coherence and integration info are computed from the relationships
   * between individual representations.
   */
  bind(representations: QualiaRepresentation[]): UnifiedQualiaField {
    const startTime = performance.now();

    if (representations.length === 0) {
      this.lastActiveModalities = [];
      this.lastConflicts = [];
      this.lastSpatialCoherence = 0;
      this.lastBindingLatency = 0;
      return {
        timestamp: 0,
        representations: [],
        spatialCoherence: 0,
        integrationInfo: 0,
        activeModalities: [],
      };
    }

    const activeModalities = representations.map((r) => r.modalityId);
    const latestTimestamp = Math.max(...representations.map((r) => r.timestamp));
    const spatialCoherence = this.computeSpatialCoherence(representations);
    const conflicts = this.detectCrossModalConflicts(representations);
    const integrationInfo = this.computeIntegrationInfo(representations);

    this.lastActiveModalities = activeModalities;
    this.lastConflicts = conflicts;
    this.lastSpatialCoherence = spatialCoherence;

    const field: UnifiedQualiaField = {
      timestamp: latestTimestamp,
      representations,
      spatialCoherence,
      integrationInfo,
      activeModalities,
    };

    const elapsedMs = performance.now() - startTime;
    this.lastBindingLatency = elapsedMs * 1_000_000; // convert to nanoseconds

    return field;
  }

  /**
   * Returns the modality IDs from the most recent bind() call.
   */
  getActiveModalities(): ModalityId[] {
    return [...this.lastActiveModalities];
  }

  /**
   * Returns cross-modal conflicts detected during the most recent bind() call.
   */
  getCrossModalConflicts(): CrossModalConflict[] {
    return [...this.lastConflicts];
  }

  /**
   * Returns the spatial coherence score from the most recent bind() call.
   */
  getSpatialCoherence(): CoherenceScore {
    return this.lastSpatialCoherence;
  }

  /**
   * Returns the latency of the most recent bind() call in nanoseconds.
   */
  getBindingLatency(): Duration {
    return this.lastBindingLatency;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Compute spatial coherence across qualia representations.
   * Measures how well spatial locations across modalities agree.
   * Returns 1.0 if all have spatial data and are nearby, lower if scattered.
   */
  private computeSpatialCoherence(reps: QualiaRepresentation[]): CoherenceScore {
    const withSpatial = reps.filter((r) => r.spatialLocation !== null);
    if (withSpatial.length <= 1) {
      return 1.0;
    }

    let totalDistance = 0;
    let pairs = 0;
    for (let i = 0; i < withSpatial.length; i++) {
      for (let j = i + 1; j < withSpatial.length; j++) {
        const a = withSpatial[i].spatialLocation!;
        const b = withSpatial[j].spatialLocation!;
        const d = Math.sqrt(
          (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2
        );
        totalDistance += d;
        pairs++;
      }
    }

    const avgDistance = totalDistance / pairs;
    // Exponential decay: 0 distance = 1.0, large distance → 0.0
    return Math.exp(-avgDistance);
  }

  /**
   * Detect spatial conflicts between modalities.
   * Two modalities conflict spatially when both have spatial data but
   * their locations differ by more than the conflict threshold.
   */
  private detectCrossModalConflicts(
    reps: QualiaRepresentation[]
  ): CrossModalConflict[] {
    const conflicts: CrossModalConflict[] = [];
    const withSpatial = reps.filter((r) => r.spatialLocation !== null);

    for (let i = 0; i < withSpatial.length; i++) {
      for (let j = i + 1; j < withSpatial.length; j++) {
        const a = withSpatial[i].spatialLocation!;
        const b = withSpatial[j].spatialLocation!;
        const distance = Math.sqrt(
          (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2
        );

        if (distance > SPATIAL_CONFLICT_THRESHOLD) {
          const severity = Math.min(1, distance / 10); // normalize to 0-1
          conflicts.push({
            modalityA: withSpatial[i].modalityId,
            modalityB: withSpatial[j].modalityId,
            conflictType: 'SPATIAL',
            severity,
            description: `Spatial disagreement: ${withSpatial[i].modalityId} and ${withSpatial[j].modalityId} differ by ${distance.toFixed(2)}m`,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Compute integration information (phi-like measure).
   * More diverse modalities with higher intensity = higher integration.
   */
  private computeIntegrationInfo(reps: QualiaRepresentation[]): number {
    if (reps.length === 0) return 0;

    const uniqueModalities = new Set(reps.map((r) => r.modalityId)).size;
    const avgIntensity =
      reps.reduce((sum, r) => sum + r.intensity, 0) / reps.length;

    // Normalized so that 9 modalities at full intensity → phi ≈ 1.0
    const diversityFactor = Math.min(1, uniqueModalities / 9);
    return diversityFactor * avgIntensity;
  }
}
