import { describe, it, expect, vi } from 'vitest';
import { CapacityTelemetry } from '../../src/computational-infrastructure/telemetry.js';
import { NodeLifecycleManager } from '../../src/computational-infrastructure/node-lifecycle.js';
import { WorkloadOrchestrator } from '../../src/computational-infrastructure/orchestrator.js';
import { SustainabilityManager } from '../../src/computational-infrastructure/sustainability.js';
import type { ClusterSnapshot, NodeSpec, ResourceBudget } from '../../src/computational-infrastructure/types.js';
import type { ManufacturingLayer } from '../../src/computational-infrastructure/node-lifecycle.js';

const NOW = 3_000_000;

const nodeSpec = (): NodeSpec => ({
  computeClass: 'general',
  minCpuCores: 16,
  minMemoryGiB: 64,
  storageGiB: 500,
  networkBandwidthGbps: 10,
  radiationHardened: false,
});

describe('End-to-end expansion cycle', () => {
  it('detects capacity shortfall and triggers node manufacturing', async () => {
    // Setup
    const submittedRequests: unknown[] = [];
    const mfgLayer: ManufacturingLayer = {
      submitRequest: vi.fn(async req => { submittedRequests.push(req); }),
    };

    const telemetry = new CapacityTelemetry({ cooldownMs: 0 });
    const lifecycle = new NodeLifecycleManager(mfgLayer);
    const orchestrator = new WorkloadOrchestrator();
    const sustainability = new SustainabilityManager({
      energyCeiling: 1000,
      energyCurrent: 100,
      materialCeiling: 1000,
      materialCurrent: 100,
    } as ResourceBudget);

    // 1. Simulate low headroom
    const snapshot: ClusterSnapshot = {
      totalNodes: 4,
      activeWorkloads: 10,
      headroomFraction: 0.10,  // below 0.20 threshold
      energyBudgetRemaining: 0.80,
      materialBudgetRemaining: 0.80,
    };

    // 2. Telemetry detects expansion needed
    const trigger = telemetry.evaluateExpansion(snapshot, NOW);
    expect(trigger).not.toBeNull();
    expect(trigger!.reason).toBe('headroom_low');

    // 3. Sustainability allows expansion
    const req = await lifecycle.handleExpansionTrigger(trigger!, nodeSpec());
    const canExpand = sustainability.canExpand(req);
    expect(canExpand).toBe(true);

    // 4. Manufacturing request was submitted
    expect(mfgLayer.submitRequest).toHaveBeenCalledOnce();

    // 5. Manufacturing layer notifies node is ready; bootstrap it
    lifecycle.notifyManufactured('new-node-1', nodeSpec());
    const node = await lifecycle.bootstrapNode('new-node-1', NOW);
    expect(node.state).toBe('ACTIVE');

    // 6. Orchestrator admits the new node
    orchestrator.admitNode(node);
    expect(orchestrator.getActiveNodes().length).toBe(1);

    // 7. Workload can now be placed
    const decision = orchestrator.placeWorkload({
      workloadId: 'consciousness-entity-1',
      class: 'consciousness_host',
      cpuRequest: 2,
      memRequest: 4,
      constraints: [],
    });
    expect(decision.nodeId).toBe('new-node-1');
  });

  it('blocks expansion under resource constraint and sheds gracefully', async () => {
    const mfgLayer: ManufacturingLayer = { submitRequest: vi.fn() };
    const lifecycle = new NodeLifecycleManager(mfgLayer);
    const sustainability = new SustainabilityManager({
      energyCeiling: 1000,
      energyCurrent: 950,   // 95% used → 5% remaining → cannot expand
      materialCeiling: 1000,
      materialCurrent: 100,
    } as ResourceBudget);

    // Simulate trigger
    const trigger = {
      triggeredAt: NOW,
      reason: 'headroom_low' as const,
      suggestedNodeCount: 1,
      priority: 'planned' as const,
    };
    const req = await lifecycle.handleExpansionTrigger(trigger, nodeSpec());

    // Sustainability blocks expansion
    const blocked = vi.fn();
    const mgr2 = new SustainabilityManager(
      { energyCeiling: 1000, energyCurrent: 950, materialCeiling: 1000, materialCurrent: 100 } as ResourceBudget,
      { onExpansionBlocked: blocked },
    );
    expect(mgr2.canExpand(req)).toBe(false);
    expect(blocked).toHaveBeenCalledOnce();

    // Shed decision protects consciousness workloads
    const workloads = [
      { spec: { workloadId: 'c1', class: 'consciousness_host' as const, cpuRequest: 1, memRequest: 1, constraints: [] }, nodeId: 'n1', placedAt: NOW },
      { spec: { workloadId: 's1', class: 'simulation' as const, cpuRequest: 1, memRequest: 1, constraints: [] }, nodeId: 'n1', placedAt: NOW },
    ];
    const shed = sustainability.evaluateShed(workloads, NOW);
    expect(shed).not.toBeNull();
    expect(shed!.affectedWorkloadIds).not.toContain('c1');
  });
});
