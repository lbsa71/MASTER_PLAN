import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SustainabilityManager } from '../../src/computational-infrastructure/sustainability.js';
import type { ResourceBudget, ManufacturingRequest } from '../../src/computational-infrastructure/types.js';
import type { ActiveWorkload } from '../../src/computational-infrastructure/orchestrator.js';

const NOW = 2_000_000;

const fullBudget = (): ResourceBudget => ({
  energyCeiling: 1000,
  energyCurrent: 100,    // 10% used → 90% remaining
  materialCeiling: 1000,
  materialCurrent: 100,  // 10% used
});

const lowEnergyBudget = (energyCurrent: number): ResourceBudget => ({
  energyCeiling: 1000,
  energyCurrent,
  materialCeiling: 1000,
  materialCurrent: 100,
});

const workload = (id: string, cls: ActiveWorkload['spec']['class']): ActiveWorkload => ({
  spec: { workloadId: id, class: cls, cpuRequest: 1, memRequest: 1, constraints: [] },
  nodeId: 'n1',
  placedAt: NOW,
});

const dummyReq = (): ManufacturingRequest => ({
  requestId: 'r1',
  nodeSpec: {
    computeClass: 'general',
    minCpuCores: 4,
    minMemoryGiB: 16,
    storageGiB: 100,
    networkBandwidthGbps: 1,
    radiationHardened: false,
  },
  quantity: 1,
  priority: 'planned',
  issuedAt: NOW,
});

describe('SustainabilityManager', () => {
  let mgr: SustainabilityManager;

  beforeEach(() => {
    mgr = new SustainabilityManager(fullBudget());
  });

  it('allows expansion when budgets are healthy', () => {
    expect(mgr.canExpand(dummyReq())).toBe(true);
  });

  it('blocks expansion when material budget is exhausted', () => {
    mgr.updateBudget({ materialCurrent: 1000, materialCeiling: 1000 });
    expect(mgr.canExpand(dummyReq())).toBe(false);
  });

  it('blocks expansion when energy is too low', () => {
    mgr.updateBudget({ energyCurrent: 850 }); // 85% used → 15% remaining < 20% minimum
    expect(mgr.canExpand(dummyReq())).toBe(false);
  });

  it('returns null shed when energy is healthy', () => {
    const workloads = [workload('w1', 'maintenance'), workload('w2', 'simulation')];
    expect(mgr.evaluateShed(workloads, NOW)).toBeNull();
  });

  it('level 1: pauses maintenance at < 40% energy remaining', () => {
    mgr.updateBudget({ energyCurrent: 650 }); // 65% used → 35% remaining
    const workloads = [workload('w1', 'maintenance'), workload('w2', 'simulation')];
    const decision = mgr.evaluateShed(workloads, NOW);
    expect(decision).not.toBeNull();
    expect(decision!.level).toBe(1);
    expect(decision!.affectedWorkloadIds).toContain('w1');
    expect(decision!.affectedWorkloadIds).not.toContain('w2');
  });

  it('level 4: never sheds consciousness_host workloads', () => {
    mgr.updateBudget({ energyCurrent: 980 }); // 98% used → 2% remaining
    const workloads = [
      workload('conscious-1', 'consciousness_host'),
      workload('comms-1', 'comms'),
      workload('sim-1', 'simulation'),
    ];
    const decision = mgr.evaluateShed(workloads, NOW);
    expect(decision!.level).toBe(4);
    expect(decision!.affectedWorkloadIds).not.toContain('conscious-1');
    expect(decision!.affectedWorkloadIds).toContain('comms-1');
    expect(decision!.affectedWorkloadIds).toContain('sim-1');
  });

  it('records shed decisions in the audit log', () => {
    mgr.updateBudget({ energyCurrent: 650 });
    const workloads = [workload('w1', 'maintenance')];
    mgr.evaluateShed(workloads, NOW);
    expect(mgr.getAuditLog().length).toBe(1);
  });

  it('fires onShedDecision callback', () => {
    const cb = vi.fn();
    mgr = new SustainabilityManager(fullBudget(), { onShedDecision: cb });
    mgr.updateBudget({ energyCurrent: 650 });
    mgr.evaluateShed([workload('w1', 'maintenance')], NOW);
    expect(cb).toHaveBeenCalledOnce();
  });

  it('level 5: returns shed decision when material budget is exhausted', () => {
    mgr.updateBudget({ materialCurrent: 1000, materialCeiling: 1000 });
    const decision = mgr.evaluateShed([], NOW);
    expect(decision!.level).toBe(5);
  });
});
