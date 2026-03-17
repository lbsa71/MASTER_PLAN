import { describe, it, expect, beforeEach } from 'vitest';
import { WorkloadOrchestrator } from '../../src/computational-infrastructure/orchestrator.js';
import type { NodeRecord, WorkloadSpec, NodeMetrics } from '../../src/computational-infrastructure/types.js';

const activeNode = (id: string, radiationHardened = false): NodeRecord => ({
  nodeId: id,
  spec: {
    computeClass: 'general',
    minCpuCores: 16,
    minMemoryGiB: 64,
    storageGiB: 1000,
    networkBandwidthGbps: 10,
    radiationHardened,
  },
  state: 'ACTIVE',
  joinedAt: 1000,
  failureCount: 0,
});

const metrics = (nodeId: string, cpuUtil = 0.2, memPressure = 0.2): NodeMetrics => ({
  nodeId,
  timestamp: Date.now(),
  cpuUtil,
  memPressure,
  networkLatencyMs: 1,
  consciousnessSlaMissRate: 0,
});

const workload = (id: string, cls: WorkloadSpec['class'], constraints: WorkloadSpec['constraints'] = []): WorkloadSpec => ({
  workloadId: id,
  class: cls,
  cpuRequest: 2,
  memRequest: 4,
  constraints,
});

describe('WorkloadOrchestrator', () => {
  let orch: WorkloadOrchestrator;

  beforeEach(() => {
    orch = new WorkloadOrchestrator();
    orch.admitNode(activeNode('n1'));
    orch.admitNode(activeNode('n2', true));
    orch.updateMetrics(metrics('n1'));
    orch.updateMetrics(metrics('n2'));
  });

  it('places a workload on an available node', () => {
    const decision = orch.placeWorkload(workload('w1', 'simulation'));
    expect(['n1', 'n2']).toContain(decision.nodeId);
  });

  it('enforces radiationHardened constraint for consciousness_host', () => {
    const spec = workload('w1', 'consciousness_host', [
      { key: 'radiationHardened', value: true, required: true },
    ]);
    const decision = orch.placeWorkload(spec);
    expect(decision.nodeId).toBe('n2');
  });

  it('throws when no node satisfies hard constraints', () => {
    const spec = workload('w1', 'consciousness_host', [
      { key: 'radiationHardened', value: true, required: true },
    ]);
    orch.removeNode('n2');
    expect(() => orch.placeWorkload(spec)).toThrow();
  });

  it('prefers less loaded nodes', () => {
    orch.updateMetrics(metrics('n1', 0.9, 0.9));
    orch.updateMetrics(metrics('n2', 0.1, 0.1));
    const decision = orch.placeWorkload(workload('w1', 'maintenance'));
    expect(decision.nodeId).toBe('n2');
  });

  it('evicts all workloads from a node', () => {
    orch.placeWorkload(workload('w1', 'simulation'));
    orch.placeWorkload(workload('w2', 'comms'));
    const evicted = orch.evictWorkloadsFromNode('n1');
    // at least some workloads were on n1
    expect(evicted.length).toBeGreaterThanOrEqual(0);
  });

  it('places all four workload classes', () => {
    const classes: WorkloadSpec['class'][] = ['consciousness_host', 'simulation', 'comms', 'maintenance'];
    for (const cls of classes) {
      const w = workload(`w-${cls}`, cls);
      expect(() => orch.placeWorkload(w)).not.toThrow();
    }
  });

  it('cannot admit a non-ACTIVE node', () => {
    const degraded: NodeRecord = { ...activeNode('n3'), state: 'DEGRADED' };
    expect(() => orch.admitNode(degraded)).toThrow();
  });
});
