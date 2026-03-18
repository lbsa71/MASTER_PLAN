/**
 * Action Provenance Tracker Tests
 *
 * Verifies that every motor command carries provenance:
 * - Records commands with REFLEXIVE or CONSCIOUS source
 * - Retrieves provenance by ID
 * - Filters history by source, time window, actuator, and limit
 * - Computes reflexive ratio over a time window
 * - Supports retroactive conscious claims on reflexive actions
 *
 * @see docs/sensorimotor-consciousness-integration/ARCHITECTURE.md §2.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ActionProvenanceTracker } from '../action-provenance-tracker';
import type {
  MotorCommand,
  ActionSource,
  SensoryFrame,
  ConsciousClaim,
} from '../types';

function makeMotorCommand(overrides: Partial<MotorCommand> = {}): MotorCommand {
  return {
    actuatorId: 'joint-0',
    commandType: 'POSITION',
    value: [1.0, 0.5],
    timestamp: 1_000_000_000,
    ...overrides,
  };
}

function makeSensoryFrame(overrides: Partial<SensoryFrame> = {}): SensoryFrame {
  return {
    modalityId: 'imu-0',
    modalityType: 'IMU',
    timestamp: 1_000_000_000,
    data: new ArrayBuffer(8),
    confidence: 0.95,
    spatialRef: null,
    metadata: {},
    ...overrides,
  };
}

describe('ActionProvenanceTracker', () => {
  let apt: ActionProvenanceTracker;

  beforeEach(() => {
    apt = new ActionProvenanceTracker();
  });

  describe('recordCommand()', () => {
    it('should record a REFLEXIVE motor command and return a provenance ID', () => {
      const cmd = makeMotorCommand();
      const id = apt.recordCommand(cmd, 'REFLEXIVE');

      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });

    it('should record a CONSCIOUS motor command', () => {
      const cmd = makeMotorCommand();
      const id = apt.recordCommand(cmd, 'CONSCIOUS');

      expect(id).toBeTruthy();
    });

    it('should generate unique provenance IDs for each command', () => {
      const id1 = apt.recordCommand(makeMotorCommand(), 'REFLEXIVE');
      const id2 = apt.recordCommand(makeMotorCommand(), 'CONSCIOUS');
      const id3 = apt.recordCommand(makeMotorCommand(), 'REFLEXIVE');

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });
  });

  describe('getProvenance()', () => {
    it('should retrieve a recorded provenance by ID', () => {
      const cmd = makeMotorCommand({ actuatorId: 'joint-3', timestamp: 5_000_000_000 });
      const id = apt.recordCommand(cmd, 'CONSCIOUS');

      const prov = apt.getProvenance(id);

      expect(prov.id).toBe(id);
      expect(prov.source).toBe('CONSCIOUS');
      expect(prov.command.actuatorId).toBe('joint-3');
      expect(prov.command.timestamp).toBe(5_000_000_000);
      expect(prov.outcome).toBeNull();
      expect(prov.consciousClaim).toBeNull();
    });

    it('should throw for an unknown provenance ID', () => {
      expect(() => apt.getProvenance('nonexistent-id')).toThrow();
    });
  });

  describe('getHistory()', () => {
    it('should return all records when no filter is specified', () => {
      apt.recordCommand(makeMotorCommand({ timestamp: 1_000_000_000 }), 'REFLEXIVE');
      apt.recordCommand(makeMotorCommand({ timestamp: 2_000_000_000 }), 'CONSCIOUS');
      apt.recordCommand(makeMotorCommand({ timestamp: 3_000_000_000 }), 'REFLEXIVE');

      const history = apt.getHistory({});
      expect(history).toHaveLength(3);
    });

    it('should filter by source', () => {
      apt.recordCommand(makeMotorCommand(), 'REFLEXIVE');
      apt.recordCommand(makeMotorCommand(), 'CONSCIOUS');
      apt.recordCommand(makeMotorCommand(), 'REFLEXIVE');

      const reflexive = apt.getHistory({ source: 'REFLEXIVE' });
      expect(reflexive).toHaveLength(2);
      expect(reflexive.every(p => p.source === 'REFLEXIVE')).toBe(true);

      const conscious = apt.getHistory({ source: 'CONSCIOUS' });
      expect(conscious).toHaveLength(1);
    });

    it('should filter by time window', () => {
      apt.recordCommand(makeMotorCommand({ timestamp: 1_000_000_000 }), 'REFLEXIVE');
      apt.recordCommand(makeMotorCommand({ timestamp: 2_000_000_000 }), 'CONSCIOUS');
      apt.recordCommand(makeMotorCommand({ timestamp: 3_000_000_000 }), 'REFLEXIVE');
      apt.recordCommand(makeMotorCommand({ timestamp: 4_000_000_000 }), 'CONSCIOUS');

      const window = apt.getHistory({
        startTime: 1_500_000_000,
        endTime: 3_500_000_000,
      });
      expect(window).toHaveLength(2);
    });

    it('should filter by actuatorId', () => {
      apt.recordCommand(makeMotorCommand({ actuatorId: 'joint-0' }), 'REFLEXIVE');
      apt.recordCommand(makeMotorCommand({ actuatorId: 'joint-1' }), 'CONSCIOUS');
      apt.recordCommand(makeMotorCommand({ actuatorId: 'joint-0' }), 'REFLEXIVE');

      const joint0 = apt.getHistory({ actuatorId: 'joint-0' });
      expect(joint0).toHaveLength(2);
      expect(joint0.every(p => p.command.actuatorId === 'joint-0')).toBe(true);
    });

    it('should respect limit', () => {
      apt.recordCommand(makeMotorCommand({ timestamp: 1_000_000_000 }), 'REFLEXIVE');
      apt.recordCommand(makeMotorCommand({ timestamp: 2_000_000_000 }), 'CONSCIOUS');
      apt.recordCommand(makeMotorCommand({ timestamp: 3_000_000_000 }), 'REFLEXIVE');

      const limited = apt.getHistory({ limit: 2 });
      expect(limited).toHaveLength(2);
    });

    it('should combine multiple filter criteria', () => {
      apt.recordCommand(makeMotorCommand({ actuatorId: 'joint-0', timestamp: 1_000_000_000 }), 'REFLEXIVE');
      apt.recordCommand(makeMotorCommand({ actuatorId: 'joint-0', timestamp: 2_000_000_000 }), 'CONSCIOUS');
      apt.recordCommand(makeMotorCommand({ actuatorId: 'joint-1', timestamp: 3_000_000_000 }), 'REFLEXIVE');
      apt.recordCommand(makeMotorCommand({ actuatorId: 'joint-0', timestamp: 4_000_000_000 }), 'REFLEXIVE');

      const result = apt.getHistory({
        source: 'REFLEXIVE',
        actuatorId: 'joint-0',
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('getReflexiveRatio()', () => {
    it('should return 0.0 when no commands have been recorded', () => {
      expect(apt.getReflexiveRatio(10_000_000_000)).toBe(0);
    });

    it('should return 1.0 when all commands are reflexive', () => {
      apt.recordCommand(makeMotorCommand({ timestamp: 1_000_000_000 }), 'REFLEXIVE');
      apt.recordCommand(makeMotorCommand({ timestamp: 2_000_000_000 }), 'REFLEXIVE');

      // Window covers all commands
      expect(apt.getReflexiveRatio(10_000_000_000)).toBe(1.0);
    });

    it('should return 0.0 when all commands are conscious', () => {
      apt.recordCommand(makeMotorCommand({ timestamp: 1_000_000_000 }), 'CONSCIOUS');
      apt.recordCommand(makeMotorCommand({ timestamp: 2_000_000_000 }), 'CONSCIOUS');

      expect(apt.getReflexiveRatio(10_000_000_000)).toBe(0.0);
    });

    it('should compute the correct ratio for mixed commands', () => {
      apt.recordCommand(makeMotorCommand({ timestamp: 1_000_000_000 }), 'REFLEXIVE');
      apt.recordCommand(makeMotorCommand({ timestamp: 2_000_000_000 }), 'CONSCIOUS');
      apt.recordCommand(makeMotorCommand({ timestamp: 3_000_000_000 }), 'REFLEXIVE');
      apt.recordCommand(makeMotorCommand({ timestamp: 4_000_000_000 }), 'CONSCIOUS');

      // All four are within a 10-second window from the latest (4s)
      expect(apt.getReflexiveRatio(10_000_000_000)).toBe(0.5);
    });
  });

  describe('retroactiveClaim()', () => {
    it('should attach a conscious claim to a reflexive action', () => {
      const id = apt.recordCommand(makeMotorCommand(), 'REFLEXIVE');

      const claim: ConsciousClaim = {
        claimed: true,
        reason: 'I intended to stabilize even before the reflex fired',
        timestamp: 2_000_000_000,
      };

      apt.retroactiveClaim(id, claim);

      const prov = apt.getProvenance(id);
      expect(prov.consciousClaim).not.toBeNull();
      expect(prov.consciousClaim!.claimed).toBe(true);
      expect(prov.consciousClaim!.reason).toBe('I intended to stabilize even before the reflex fired');
    });

    it('should allow disowning a reflexive action', () => {
      const id = apt.recordCommand(makeMotorCommand(), 'REFLEXIVE');

      apt.retroactiveClaim(id, {
        claimed: false,
        reason: 'That was purely reflexive, not my intention',
        timestamp: 2_000_000_000,
      });

      const prov = apt.getProvenance(id);
      expect(prov.consciousClaim!.claimed).toBe(false);
    });

    it('should throw for an unknown provenance ID', () => {
      expect(() =>
        apt.retroactiveClaim('nonexistent', {
          claimed: true,
          reason: 'test',
          timestamp: 0,
        })
      ).toThrow();
    });
  });
});
