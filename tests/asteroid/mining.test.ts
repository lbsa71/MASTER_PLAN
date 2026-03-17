import { describe, it, expect } from 'vitest';
import {
  recommendExtractionMethod,
  simulateMining,
} from '../../src/asteroid/mining.js';
import type { AsteroidCandidate, ResourceMap } from '../../src/asteroid/types.js';

function cTypeAsteroid(): AsteroidCandidate {
  return {
    designation: 'CTYPE-001',
    spectralType: 'C',
    estimatedComposition: {
      metals: { iron: 10000, nickel: 2000, platinum_group: 50 },
      volatiles: { water_ice: 15000, co2: 3000, ammonia: 1000 },
      silicates: 5000,
      carbonaceous: 4000,
    },
    deltaVCost: 4500,
    accessibilityScore: 0.85,
    orbitEphemeris: {
      semiMajorAxis: 2.5,
      eccentricity: 0.15,
      inclination: 8,
      argOfPerihelion: 45,
      longOfAscNode: 120,
      meanAnomaly: 200,
    },
  };
}

function mTypeAsteroid(): AsteroidCandidate {
  return {
    ...cTypeAsteroid(),
    designation: 'MTYPE-001',
    spectralType: 'M',
    estimatedComposition: {
      metals: { iron: 30000, nickel: 8000, platinum_group: 200 },
      volatiles: { water_ice: 500, co2: 100, ammonia: 50 },
      silicates: 1000,
      carbonaceous: 200,
    },
  };
}

describe('recommendExtractionMethod', () => {
  it('recommends ablation for volatile-rich C-type', () => {
    const op = recommendExtractionMethod(cTypeAsteroid());
    expect(op.extractionMethod).toBe('ablation');
    expect(op.autonomyLevel).toBe('fully-autonomous');
  });

  it('recommends drill for M-type metallic', () => {
    const op = recommendExtractionMethod(mTypeAsteroid());
    expect(op.extractionMethod).toBe('drill');
  });

  it('sets fully-autonomous autonomy level', () => {
    const op = recommendExtractionMethod(cTypeAsteroid());
    expect(op.autonomyLevel).toBe('fully-autonomous');
  });
});

describe('simulateMining', () => {
  it('achieves ≥80% of theoretical extraction rate', () => {
    const candidate = cTypeAsteroid();
    const op = recommendExtractionMethod(candidate);
    const result = simulateMining(op, candidate.estimatedComposition, 365);

    const totalExtracted = result.bulkOreMass + result.capturedVolatileMass;
    const efficiency = totalExtracted / result.theoreticalMaxMass;
    expect(efficiency).toBeGreaterThanOrEqual(0.80);
  });

  it('operates autonomously for ≥90 consecutive days', () => {
    const candidate = cTypeAsteroid();
    const op = recommendExtractionMethod(candidate);
    const result = simulateMining(op, candidate.estimatedComposition, 365);

    // All operational days are autonomous (no Earth commands)
    expect(result.daysAutonomous).toBeGreaterThanOrEqual(90);
  });

  it('logs mining start and completion', () => {
    const candidate = cTypeAsteroid();
    const op = recommendExtractionMethod(candidate);
    const result = simulateMining(op, candidate.estimatedComposition, 100);

    const events = result.operationLog.map((e) => e.event);
    expect(events).toContain('MINING_START');
    expect(events).toContain('MINING_COMPLETE');
  });

  it('produces both ore and volatiles from C-type asteroid', () => {
    const candidate = cTypeAsteroid();
    const op = recommendExtractionMethod(candidate);
    const result = simulateMining(op, candidate.estimatedComposition, 180);

    expect(result.bulkOreMass).toBeGreaterThan(0);
    expect(result.capturedVolatileMass).toBeGreaterThan(0);
  });

  it('consumes energy during extraction', () => {
    const candidate = cTypeAsteroid();
    const op = recommendExtractionMethod(candidate);
    const result = simulateMining(op, candidate.estimatedComposition, 90);

    expect(result.energyConsumed).toBeGreaterThan(0);
  });

  it('is deterministic with same seed', () => {
    const candidate = cTypeAsteroid();
    const op = recommendExtractionMethod(candidate);
    const r1 = simulateMining(op, candidate.estimatedComposition, 90, 99);
    const r2 = simulateMining(op, candidate.estimatedComposition, 90, 99);

    expect(r1.bulkOreMass).toBe(r2.bulkOreMass);
    expect(r1.capturedVolatileMass).toBe(r2.capturedVolatileMass);
  });
});
