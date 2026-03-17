/**
 * Sensory Binding Tests
 *
 * Verifies that the SensoryBindingIntegrator correctly merges per-modality
 * QualiaRepresentation objects into a UnifiedQualiaField, detects cross-modal
 * conflicts, and maintains spatial coherence.
 *
 * @see docs/sensorimotor-consciousness-integration/ARCHITECTURE.md §1.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SensoryBindingIntegrator } from '../sensory-binding-integrator';
import type { QualiaRepresentation } from '../types';
import { LATENCY_BUDGET } from '../types';

function makeQualia(overrides: Partial<QualiaRepresentation> = {}): QualiaRepresentation {
  return {
    modalityId: 'vision-0',
    timestamp: 1_000_000_000,
    intensity: 0.8,
    valence: 0.0,
    spatialLocation: null,
    phenomenalContent: new ArrayBuffer(16),
    salience: 0.5,
    ...overrides,
  };
}

describe('SensoryBindingIntegrator', () => {
  let integrator: SensoryBindingIntegrator;

  beforeEach(() => {
    integrator = new SensoryBindingIntegrator();
  });

  describe('bind()', () => {
    it('should merge multiple qualia representations into a UnifiedQualiaField', () => {
      const reps: QualiaRepresentation[] = [
        makeQualia({ modalityId: 'vision-0' }),
        makeQualia({ modalityId: 'tactile-0' }),
        makeQualia({ modalityId: 'audio-0' }),
      ];

      const field = integrator.bind(reps);

      expect(field.representations).toHaveLength(3);
      expect(field.activeModalities).toContain('vision-0');
      expect(field.activeModalities).toContain('tactile-0');
      expect(field.activeModalities).toContain('audio-0');
    });

    it('should use the latest timestamp from input representations', () => {
      const reps: QualiaRepresentation[] = [
        makeQualia({ timestamp: 1_000_000_000 }),
        makeQualia({ modalityId: 'tactile-0', timestamp: 3_000_000_000 }),
        makeQualia({ modalityId: 'audio-0', timestamp: 2_000_000_000 }),
      ];

      const field = integrator.bind(reps);
      expect(field.timestamp).toBe(3_000_000_000);
    });

    it('should return an empty field for empty input', () => {
      const field = integrator.bind([]);

      expect(field.representations).toHaveLength(0);
      expect(field.activeModalities).toHaveLength(0);
      expect(field.integrationInfo).toBe(0);
    });

    it('should compute spatial coherence from spatial locations', () => {
      const reps: QualiaRepresentation[] = [
        makeQualia({
          modalityId: 'vision-0',
          spatialLocation: { x: 1.0, y: 0, z: 0 },
        }),
        makeQualia({
          modalityId: 'tactile-0',
          spatialLocation: { x: 1.01, y: 0, z: 0 },
        }),
      ];

      const field = integrator.bind(reps);
      // Close spatial locations should yield high coherence
      expect(field.spatialCoherence).toBeGreaterThan(0.9);
    });

    it('should report lower coherence for widely separated spatial locations', () => {
      const closeReps: QualiaRepresentation[] = [
        makeQualia({
          modalityId: 'vision-0',
          spatialLocation: { x: 0, y: 0, z: 0 },
        }),
        makeQualia({
          modalityId: 'tactile-0',
          spatialLocation: { x: 0.01, y: 0, z: 0 },
        }),
      ];

      const farReps: QualiaRepresentation[] = [
        makeQualia({
          modalityId: 'vision-0',
          spatialLocation: { x: 0, y: 0, z: 0 },
        }),
        makeQualia({
          modalityId: 'tactile-0',
          spatialLocation: { x: 10, y: 10, z: 10 },
        }),
      ];

      const closeField = integrator.bind(closeReps);
      const farField = integrator.bind(farReps);

      expect(closeField.spatialCoherence).toBeGreaterThan(farField.spatialCoherence);
    });

    it('should compute integration info (phi) proportional to modality diversity and intensity', () => {
      const singleModality = integrator.bind([
        makeQualia({ modalityId: 'vision-0', intensity: 0.8 }),
      ]);

      const multiModality = integrator.bind([
        makeQualia({ modalityId: 'vision-0', intensity: 0.8 }),
        makeQualia({ modalityId: 'tactile-0', intensity: 0.8 }),
        makeQualia({ modalityId: 'audio-0', intensity: 0.8 }),
      ]);

      // More diverse modalities → higher integration
      expect(multiModality.integrationInfo).toBeGreaterThan(singleModality.integrationInfo);
    });
  });

  describe('cross-modal conflict detection', () => {
    it('should detect spatial conflicts between modalities', () => {
      // Vision says object is at (5,0,0), touch says contact at (0,0,0)
      const reps: QualiaRepresentation[] = [
        makeQualia({
          modalityId: 'vision-0',
          spatialLocation: { x: 5, y: 0, z: 0 },
        }),
        makeQualia({
          modalityId: 'tactile-0',
          spatialLocation: { x: 0, y: 0, z: 0 },
        }),
      ];

      integrator.bind(reps);
      const conflicts = integrator.getCrossModalConflicts();

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].conflictType).toBe('SPATIAL');
    });

    it('should report no conflicts when modalities agree spatially', () => {
      const reps: QualiaRepresentation[] = [
        makeQualia({
          modalityId: 'vision-0',
          spatialLocation: { x: 1, y: 0, z: 0 },
        }),
        makeQualia({
          modalityId: 'tactile-0',
          spatialLocation: { x: 1.01, y: 0, z: 0 },
        }),
      ];

      integrator.bind(reps);
      const conflicts = integrator.getCrossModalConflicts();

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('getActiveModalities()', () => {
    it('should return modalities from the most recent bind call', () => {
      const reps: QualiaRepresentation[] = [
        makeQualia({ modalityId: 'vision-0' }),
        makeQualia({ modalityId: 'imu-0' }),
      ];

      integrator.bind(reps);
      const active = integrator.getActiveModalities();

      expect(active).toContain('vision-0');
      expect(active).toContain('imu-0');
      expect(active).toHaveLength(2);
    });
  });

  describe('latency', () => {
    it('should report binding latency within budget', () => {
      const reps: QualiaRepresentation[] = [
        makeQualia({ modalityId: 'vision-0' }),
        makeQualia({ modalityId: 'tactile-0' }),
        makeQualia({ modalityId: 'audio-0' }),
        makeQualia({ modalityId: 'imu-0' }),
        makeQualia({ modalityId: 'proprio-0' }),
      ];

      integrator.bind(reps);
      const latency = integrator.getBindingLatency();

      expect(latency).toBeLessThan(LATENCY_BUDGET.SENSORY_BINDING);
    });
  });
});
