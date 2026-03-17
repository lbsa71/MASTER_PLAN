import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NodeLifecycleManager } from '../../src/computational-infrastructure/node-lifecycle.js';
import type { ManufacturingLayer } from '../../src/computational-infrastructure/node-lifecycle.js';
import type { NodeSpec, ExpansionTrigger } from '../../src/computational-infrastructure/types.js';

const defaultSpec = (): NodeSpec => ({
  computeClass: 'general',
  minCpuCores: 8,
  minMemoryGiB: 32,
  storageGiB: 500,
  networkBandwidthGbps: 10,
  radiationHardened: false,
});

const urgentTrigger = (): ExpansionTrigger => ({
  triggeredAt: Date.now(),
  reason: 'headroom_low',
  suggestedNodeCount: 2,
  priority: 'urgent',
});

describe('NodeLifecycleManager', () => {
  let mockMfg: ManufacturingLayer;
  let manager: NodeLifecycleManager;

  beforeEach(() => {
    mockMfg = { submitRequest: vi.fn().mockResolvedValue(undefined) };
    manager = new NodeLifecycleManager(mockMfg);
  });

  it('issues a ManufacturingRequest when expansion is triggered', async () => {
    const req = await manager.handleExpansionTrigger(urgentTrigger(), defaultSpec());
    expect(mockMfg.submitRequest).toHaveBeenCalledWith(req);
    expect(req.priority).toBe('urgent');
    expect(req.quantity).toBe(2);
  });

  it('bootstraps a manufactured node through to ACTIVE state', async () => {
    manager.notifyManufactured('node-1', defaultSpec());
    const node = await manager.bootstrapNode('node-1');
    expect(node.state).toBe('ACTIVE');
    expect(node.joinedAt).toBeDefined();
  });

  it('fires onNodeAdmitted when node becomes ACTIVE', async () => {
    const onAdmitted = vi.fn();
    manager = new NodeLifecycleManager(mockMfg, { onNodeAdmitted: onAdmitted });
    manager.notifyManufactured('node-1', defaultSpec());
    await manager.bootstrapNode('node-1');
    expect(onAdmitted).toHaveBeenCalledOnce();
    expect(onAdmitted.mock.calls[0][0].nodeId).toBe('node-1');
  });

  it('decommissions a node that exceeds retry budget', async () => {
    // maxRetries=1 means first failure → decommissioned
    manager = new NodeLifecycleManager(mockMfg, {}, 1);
    manager.notifyManufactured('node-bad', defaultSpec());
    // First bootstrap: failureCount=0 → validation returns false if failureCount >= maxRetries
    // With maxRetries=1, validation passes on first attempt (failureCount=0 < 1)
    // So force failure by pre-incrementing: simulate already failed once
    const node = manager.getNode('node-bad')!;
    node.failureCount = 1; // already at max retries
    await manager.bootstrapNode('node-bad');
    expect(manager.getNode('node-bad')!.state).toBe('DECOMMISSIONED');
  });

  it('returns active nodes list correctly', async () => {
    manager.notifyManufactured('n1', defaultSpec());
    manager.notifyManufactured('n2', defaultSpec());
    await manager.bootstrapNode('n1');
    await manager.bootstrapNode('n2');
    const active = manager.getActiveNodes();
    expect(active.length).toBe(2);
    expect(active.every(n => n.state === 'ACTIVE')).toBe(true);
  });

  it('marks a node as DEGRADED', async () => {
    manager.notifyManufactured('n1', defaultSpec());
    await manager.bootstrapNode('n1');
    manager.markDegraded('n1');
    expect(manager.getNode('n1')!.state).toBe('DEGRADED');
  });
});
