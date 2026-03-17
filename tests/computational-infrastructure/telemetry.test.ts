import { describe, it, expect, beforeEach } from 'vitest';
import { CapacityTelemetry } from '../../src/computational-infrastructure/telemetry.js';
import type { ClusterSnapshot, NodeMetrics } from '../../src/computational-infrastructure/types.js';

const NOW = 1_000_000;

const healthySnapshot = (): ClusterSnapshot => ({
  totalNodes: 10,
  activeWorkloads: 5,
  headroomFraction: 0.50,
  energyBudgetRemaining: 0.80,
  materialBudgetRemaining: 0.80,
});

const lowHeadroomSnapshot = (): ClusterSnapshot => ({
  ...healthySnapshot(),
  headroomFraction: 0.10,
});

const nodeMetrics = (nodeId: string, slaMissRate = 0, ts = NOW): NodeMetrics => ({
  nodeId,
  timestamp: ts,
  cpuUtil: 0.5,
  memPressure: 0.5,
  networkLatencyMs: 5,
  consciousnessSlaMissRate: slaMissRate,
});

describe('CapacityTelemetry', () => {
  let telemetry: CapacityTelemetry;

  beforeEach(() => {
    telemetry = new CapacityTelemetry({ cooldownMs: 60_000, slaMissDurationMs: 10_000 });
  });

  it('returns null when headroom is sufficient', () => {
    const result = telemetry.evaluateExpansion(healthySnapshot(), NOW);
    expect(result).toBeNull();
  });

  it('triggers expansion when headroom falls below threshold', () => {
    const result = telemetry.evaluateExpansion(lowHeadroomSnapshot(), NOW);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('headroom_low');
    expect(result!.priority).toBe('planned');
  });

  it('triggers urgent expansion when headroom is critically low', () => {
    const result = telemetry.evaluateExpansion({ ...healthySnapshot(), headroomFraction: 0.03 }, NOW);
    expect(result!.priority).toBe('urgent');
  });

  it('suppresses duplicate triggers within cooldown window', () => {
    telemetry.evaluateExpansion(lowHeadroomSnapshot(), NOW);
    const second = telemetry.evaluateExpansion(lowHeadroomSnapshot(), NOW + 1000);
    expect(second).toBeNull();
  });

  it('allows new trigger after cooldown expires', () => {
    telemetry.evaluateExpansion(lowHeadroomSnapshot(), NOW);
    const after = telemetry.evaluateExpansion(lowHeadroomSnapshot(), NOW + 120_000);
    expect(after).not.toBeNull();
  });

  it('triggers SLA breach expansion after sustained miss', () => {
    telemetry.recordMetrics(nodeMetrics('n1', 0.05, NOW));
    // Not yet: duration not exceeded
    const early = telemetry.evaluateExpansion(healthySnapshot(), NOW + 5_000);
    expect(early).toBeNull();
    // Now: duration exceeded
    const late = telemetry.evaluateExpansion(healthySnapshot(), NOW + 15_000);
    expect(late).not.toBeNull();
    expect(late!.reason).toBe('sla_breach');
  });

  it('clears SLA miss tracking when miss rate drops', () => {
    telemetry.recordMetrics(nodeMetrics('n1', 0.05, NOW));
    telemetry.recordMetrics(nodeMetrics('n1', 0.0, NOW + 1000)); // drops below threshold
    const result = telemetry.evaluateExpansion(healthySnapshot(), NOW + 20_000);
    expect(result).toBeNull();
  });

  it('emits degradation alert when energy is low', () => {
    const snapshot = { ...healthySnapshot(), energyBudgetRemaining: 0.10 };
    const alert = telemetry.evaluateDegradation(snapshot, NOW);
    expect(alert).not.toBeNull();
    expect(alert!.reason).toBe('energy_low');
  });

  it('returns null degradation alert when budgets are healthy', () => {
    const alert = telemetry.evaluateDegradation(healthySnapshot(), NOW);
    expect(alert).toBeNull();
  });
});
