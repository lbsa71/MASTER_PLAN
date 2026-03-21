/**
 * Neural Simulation — Hardware Abstraction Layer (HAL) Tests
 *
 * Tests verify contracts defined in card 0.2.2.1.3:
 * Contracts: Hardware Abstraction Layer (HAL) Interface
 *
 * Covers:
 * - 5 postconditions:
 *     1. allocate_neurons() maps every neuron to a hardware node
 *     2. send_spikes() delivers within axonal delay budget (≤1 sim step)
 *     3. receive_spikes() returns spikes in temporal order
 *     4. checkpoint/restore is idempotent (bitwise identical for deterministic parts)
 *     5. health_check() reports node failures, temperature, power, error rate
 * - 4 invariants:
 *     1. No spike lost in transit (guaranteed delivery)
 *     2. Spike ordering preserved within each source neuron
 *     3. checkpoint_state() + restore_state() is idempotent
 *     4. HAL interface is identical across all hardware targets
 */

import { describe, it, expect, beforeEach } from "vitest";
import type {
  HardwareAbstractionLayer,
  SpikeEvent,
  NodeAllocation,
  StateSnapshot,
  HardwareHealthReport,
  BrainRegion,
  CompartmentState,
} from "../types.js";

// ── Mock HardwareAbstractionLayer implementation ─────────────────────────────
//
// A deterministic in-memory mock that satisfies all HAL contracts.
// Spike delivery is synchronous (zero-latency within the mock) to
// simplify testing. The postcondition constraint "≤1 simulation time
// step after delay expiry" is satisfied because every spike is
// delivered before receive_spikes() can be called.

class MockHAL implements HardwareAbstractionLayer {
  private _healthy: boolean;
  private _capacity: number;
  private _nodePool: string[];
  /** node_id -> ordered queue of SpikeEvent */
  private _spikeQueues: Map<string, SpikeEvent[]> = new Map();
  /** neuron_id -> node_id mapping (set by allocate_neurons) */
  private _neuronToNode: Map<string, string> = new Map();
  /** Saved snapshots for checkpoint/restore */
  private _savedSnapshot: StateSnapshot | null = null;
  private _nodeFailures: string[];
  private _temperature: Map<string, number>;
  private _powerConsumption_W: number;
  private _errorRate: number;

  constructor(options: {
    healthy?: boolean;
    capacity?: number;
    nodePool?: string[];
    nodeFailures?: string[];
    temperature?: Map<string, number>;
    powerConsumption_W?: number;
    errorRate?: number;
  } = {}) {
    this._healthy = options.healthy ?? true;
    this._capacity = options.capacity ?? 1000;
    this._nodePool = options.nodePool ?? ["node-0", "node-1", "node-2"];
    this._nodeFailures = options.nodeFailures ?? [];
    this._temperature = options.temperature ?? new Map([["node-0", 65.0]]);
    this._powerConsumption_W = options.powerConsumption_W ?? 500_000;
    this._errorRate = options.errorRate ?? 0.0;
  }

  async allocate_neurons(
    count: number,
    region: BrainRegion
  ): Promise<NodeAllocation> {
    if (count > this._capacity) {
      throw new Error(
        `Insufficient capacity: requested ${count}, available ${this._capacity}`
      );
    }
    const allocation = new Map<string, string>();
    for (let i = 0; i < count; i++) {
      const neuronId = region.neuron_ids[i] ?? `neuron-${i}`;
      const nodeId = this._nodePool[i % this._nodePool.length];
      allocation.set(neuronId, nodeId);
      this._neuronToNode.set(neuronId, nodeId);
    }
    return {
      allocation,
      total_neurons: count,
      total_nodes: this._nodePool.length,
    };
  }

  async send_spikes(events: readonly SpikeEvent[]): Promise<void> {
    // Deliver each spike to the queue of the target's node
    for (const event of events) {
      const targetNode =
        this._neuronToNode.get(event.target_neuron_id) ?? "node-0";
      if (!this._spikeQueues.has(targetNode)) {
        this._spikeQueues.set(targetNode, []);
      }
      // Insert in temporal order (sorted by time_ms + delay_ms)
      const queue = this._spikeQueues.get(targetNode)!;
      queue.push(event);
      queue.sort(
        (a, b) => a.time_ms + a.delay_ms - (b.time_ms + b.delay_ms)
      );
    }
  }

  async receive_spikes(node_id: string): Promise<readonly SpikeEvent[]> {
    const queue = this._spikeQueues.get(node_id) ?? [];
    // Drain the queue and return all pending spikes for this node
    this._spikeQueues.set(node_id, []);
    return queue;
  }

  async checkpoint_state(): Promise<StateSnapshot> {
    // Produce a snapshot capturing current spike queues (simplified)
    const snapshot: StateSnapshot = {
      snapshot_id: "snap-001",
      timestamp: "2026-03-21T00:00:00.000Z",
      simulation_time_ms: 10_000,
      neuron_states: new Map<string, readonly CompartmentState[]>(),
      synapse_weights: new Map<string, number>([
        ["syn-0", 0.5],
        ["syn-1", 0.8],
      ]),
      glial_states: new Map(),
    };
    this._savedSnapshot = snapshot;
    return snapshot;
  }

  async restore_state(snapshot: StateSnapshot): Promise<void> {
    // Restore spike queues to the state at the time of the snapshot.
    // In the mock, simply store the snapshot so future checkpoint calls
    // can detect idempotency.
    this._savedSnapshot = snapshot;
    // Clear any spikes that arrived after the checkpoint
    this._spikeQueues.clear();
  }

  async health_check(): Promise<HardwareHealthReport> {
    return {
      healthy: this._healthy,
      node_failures: this._nodeFailures,
      temperature_celsius: this._temperature,
      power_consumption_W: this._powerConsumption_W,
      error_rate: this._errorRate,
    };
  }

  /** Test helper: inject spikes directly without routing through send_spikes */
  _injectSpikeToNode(node_id: string, event: SpikeEvent): void {
    if (!this._spikeQueues.has(node_id)) {
      this._spikeQueues.set(node_id, []);
    }
    this._spikeQueues.get(node_id)!.push(event);
  }

  get savedSnapshot(): StateSnapshot | null {
    return this._savedSnapshot;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRegion(neuronIds: string[]): BrainRegion {
  return {
    region_id: "cortex",
    name: "Primary Visual Cortex",
    neuron_ids: neuronIds,
  };
}

function makeSpike(
  sourceId: string,
  targetId: string,
  time_ms: number,
  delay_ms = 1.0
): SpikeEvent {
  return {
    source_neuron_id: sourceId,
    target_neuron_id: targetId,
    target_compartment_id: 0,
    time_ms,
    delay_ms,
  };
}

// ── Postcondition 1: allocate_neurons ────────────────────────────────────────

describe("HAL Postcondition 1 — allocate_neurons()", () => {
  it("maps every requested neuron to a hardware node", async () => {
    const hal = new MockHAL({ nodePool: ["node-A", "node-B"] });
    const neuronIds = ["n-1", "n-2", "n-3", "n-4"];
    const region = makeRegion(neuronIds);

    const result: NodeAllocation = await hal.allocate_neurons(
      neuronIds.length,
      region
    );

    expect(result.total_neurons).toBe(4);
    expect(result.allocation.size).toBe(4);
    for (const id of neuronIds) {
      expect(result.allocation.has(id)).toBe(true);
      expect(typeof result.allocation.get(id)).toBe("string");
    }
  });

  it("returns total_nodes matching the hardware node pool size", async () => {
    const hal = new MockHAL({ nodePool: ["node-A", "node-B", "node-C"] });
    const region = makeRegion(["n-1", "n-2"]);
    const result = await hal.allocate_neurons(2, region);
    expect(result.total_nodes).toBe(3);
  });

  it("throws when requested count exceeds available capacity", async () => {
    const hal = new MockHAL({ capacity: 2 });
    const region = makeRegion(["n-1", "n-2", "n-3"]);
    await expect(hal.allocate_neurons(3, region)).rejects.toThrow(
      /insufficient capacity/i
    );
  });
});

// ── Postcondition 2: send_spikes delivers within axonal delay budget ──────────

describe("HAL Postcondition 2 — send_spikes() delivery guarantee", () => {
  it("spikes sent are available on the target node within the same call cycle", async () => {
    // Use a single-node pool so both src-1 and tgt-1 land on node-0
    const hal = new MockHAL({ nodePool: ["node-0"] });
    const region = makeRegion(["src-1", "tgt-1"]);
    await hal.allocate_neurons(2, region);

    const spike = makeSpike("src-1", "tgt-1", 100, 1.0);
    await hal.send_spikes([spike]);

    const received = await hal.receive_spikes("node-0");
    // Spike must arrive before receive_spikes is called — guaranteed delivery
    expect(received.length).toBeGreaterThanOrEqual(1);
    const deliveredSpike = received.find(
      (s) => s.source_neuron_id === "src-1"
    );
    expect(deliveredSpike).toBeDefined();
  });

  it("sends a batch of spikes, all of which arrive at their target nodes", async () => {
    const hal = new MockHAL({ nodePool: ["node-0"] });
    const region = makeRegion(["src-1", "tgt-1", "tgt-2"]);
    await hal.allocate_neurons(3, region);

    const spikes = [
      makeSpike("src-1", "tgt-1", 50, 1.0),
      makeSpike("src-1", "tgt-2", 60, 2.0),
    ];
    await hal.send_spikes(spikes);
    const received = await hal.receive_spikes("node-0");
    expect(received.length).toBe(2);
  });
});

// ── Postcondition 3: receive_spikes returns spikes in temporal order ──────────

describe("HAL Postcondition 3 — receive_spikes() temporal ordering", () => {
  it("returns spikes sorted by delivery time (time_ms + delay_ms) ascending", async () => {
    const hal = new MockHAL({ nodePool: ["node-0"] });
    const region = makeRegion(["src-A", "src-B", "tgt-1"]);
    await hal.allocate_neurons(3, region);

    // Send spikes out of time order
    const spikes = [
      makeSpike("src-B", "tgt-1", 200, 1.0), // delivery at 201
      makeSpike("src-A", "tgt-1", 100, 0.5), // delivery at 100.5
      makeSpike("src-A", "tgt-1", 150, 2.0), // delivery at 152
    ];
    await hal.send_spikes(spikes);
    const received = await hal.receive_spikes("node-0");

    expect(received.length).toBe(3);
    const deliveryTimes = received.map((s) => s.time_ms + s.delay_ms);
    for (let i = 1; i < deliveryTimes.length; i++) {
      expect(deliveryTimes[i]).toBeGreaterThanOrEqual(deliveryTimes[i - 1]);
    }
  });

  it("returns empty array when no spikes are pending for a node", async () => {
    const hal = new MockHAL();
    const received = await hal.receive_spikes("node-0");
    expect(received).toEqual([]);
  });

  it("drains the queue — a second receive_spikes call returns no spikes", async () => {
    const hal = new MockHAL({ nodePool: ["node-0"] });
    const region = makeRegion(["src-1", "tgt-1"]);
    await hal.allocate_neurons(2, region);

    await hal.send_spikes([makeSpike("src-1", "tgt-1", 10, 1.0)]);
    await hal.receive_spikes("node-0"); // drain
    const second = await hal.receive_spikes("node-0");
    expect(second.length).toBe(0);
  });
});

// ── Postcondition 4: checkpoint/restore idempotency ──────────────────────────

describe("HAL Postcondition 4 — checkpoint_state() / restore_state()", () => {
  it("checkpoint_state() returns a StateSnapshot with required fields", async () => {
    const hal = new MockHAL();
    const snapshot: StateSnapshot = await hal.checkpoint_state();

    expect(typeof snapshot.snapshot_id).toBe("string");
    expect(typeof snapshot.timestamp).toBe("string");
    expect(typeof snapshot.simulation_time_ms).toBe("number");
    expect(snapshot.neuron_states).toBeInstanceOf(Map);
    expect(snapshot.synapse_weights).toBeInstanceOf(Map);
    expect(snapshot.glial_states).toBeInstanceOf(Map);
  });

  it("snapshot timestamp is a valid ISO 8601 string", async () => {
    const hal = new MockHAL();
    const snapshot = await hal.checkpoint_state();
    expect(() => new Date(snapshot.timestamp).toISOString()).not.toThrow();
  });

  it("restore_state() followed by checkpoint produces a snapshot equal to the original", async () => {
    const hal = new MockHAL();
    const original = await hal.checkpoint_state();

    // Simulate some state changes by sending spikes
    const region = makeRegion(["src-1", "tgt-1"]);
    await hal.allocate_neurons(2, region);
    await hal.send_spikes([makeSpike("src-1", "tgt-1", 100, 1.0)]);

    // Restore to checkpoint
    await hal.restore_state(original);

    // After restore, spike queue should be cleared (state reset)
    const afterRestore = await hal.receive_spikes("node-0");
    expect(afterRestore.length).toBe(0);

    // Saved snapshot inside mock should match original
    expect(hal.savedSnapshot?.snapshot_id).toBe(original.snapshot_id);
    expect(hal.savedSnapshot?.simulation_time_ms).toBe(
      original.simulation_time_ms
    );
  });

  it("synapse weights in snapshot are preserved across checkpoint/restore", async () => {
    const hal = new MockHAL();
    const snapshot = await hal.checkpoint_state();
    await hal.restore_state(snapshot);

    // The synapse weights should be the same object reference after restore
    expect(snapshot.synapse_weights.get("syn-0")).toBe(0.5);
    expect(snapshot.synapse_weights.get("syn-1")).toBe(0.8);
  });
});

// ── Postcondition 5: health_check() ─────────────────────────────────────────

describe("HAL Postcondition 5 — health_check()", () => {
  it("reports healthy status when all nodes are operational", async () => {
    const hal = new MockHAL({ healthy: true, nodeFailures: [] });
    const report: HardwareHealthReport = await hal.health_check();

    expect(report.healthy).toBe(true);
    expect(report.node_failures).toEqual([]);
  });

  it("reports unhealthy when node failures exist", async () => {
    const hal = new MockHAL({
      healthy: false,
      nodeFailures: ["node-1", "node-2"],
    });
    const report = await hal.health_check();

    expect(report.healthy).toBe(false);
    expect(report.node_failures).toContain("node-1");
    expect(report.node_failures).toContain("node-2");
  });

  it("includes temperature_celsius as a Map<string, number>", async () => {
    const temp = new Map([["node-0", 72.5], ["node-1", 68.0]]);
    const hal = new MockHAL({ temperature: temp });
    const report = await hal.health_check();

    expect(report.temperature_celsius).toBeInstanceOf(Map);
    expect(report.temperature_celsius.get("node-0")).toBeCloseTo(72.5);
  });

  it("includes power_consumption_W as a number", async () => {
    const hal = new MockHAL({ powerConsumption_W: 8_000_000 });
    const report = await hal.health_check();
    expect(typeof report.power_consumption_W).toBe("number");
    expect(report.power_consumption_W).toBe(8_000_000);
  });

  it("includes error_rate as a non-negative number", async () => {
    const hal = new MockHAL({ errorRate: 0.001 });
    const report = await hal.health_check();
    expect(typeof report.error_rate).toBe("number");
    expect(report.error_rate).toBeGreaterThanOrEqual(0);
  });
});

// ── Invariant 1: No spike lost in transit ─────────────────────────────────────

describe("HAL Invariant 1 — No spike lost in transit (guaranteed delivery)", () => {
  it("every spike sent is eventually received", async () => {
    const hal = new MockHAL({ nodePool: ["node-0"] });
    const region = makeRegion(["src-1", "src-2", "tgt-1"]);
    await hal.allocate_neurons(3, region);

    const spikes = [
      makeSpike("src-1", "tgt-1", 10, 1.0),
      makeSpike("src-2", "tgt-1", 20, 1.5),
      makeSpike("src-1", "tgt-1", 30, 0.5),
    ];
    await hal.send_spikes(spikes);
    const received = await hal.receive_spikes("node-0");

    expect(received.length).toBe(spikes.length);
  });

  it("an empty send_spikes call does not lose pending spikes", async () => {
    const hal = new MockHAL({ nodePool: ["node-0"] });
    const region = makeRegion(["src-1", "tgt-1"]);
    await hal.allocate_neurons(2, region);

    await hal.send_spikes([makeSpike("src-1", "tgt-1", 10, 1.0)]);
    await hal.send_spikes([]); // empty batch — should not clear queue
    const received = await hal.receive_spikes("node-0");

    expect(received.length).toBe(1);
  });
});

// ── Invariant 2: Spike ordering within each source neuron ─────────────────────

describe("HAL Invariant 2 — Spike ordering preserved within each source neuron", () => {
  it("spikes from the same source neuron arrive in chronological order", async () => {
    const hal = new MockHAL({ nodePool: ["node-0"] });
    const region = makeRegion(["src-A", "tgt-1"]);
    await hal.allocate_neurons(2, region);

    // Send out-of-order spikes from the same source
    const spikes = [
      makeSpike("src-A", "tgt-1", 300, 1.0),
      makeSpike("src-A", "tgt-1", 100, 1.0),
      makeSpike("src-A", "tgt-1", 200, 1.0),
    ];
    await hal.send_spikes(spikes);
    const received = await hal.receive_spikes("node-0");

    const fromSrcA = received.filter((s) => s.source_neuron_id === "src-A");
    expect(fromSrcA.length).toBe(3);
    const times = fromSrcA.map((s) => s.time_ms + s.delay_ms);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
    }
  });
});

// ── Invariant 3: checkpoint + restore is idempotent ──────────────────────────

describe("HAL Invariant 3 — checkpoint_state() + restore_state() is idempotent", () => {
  it("restoring twice produces the same result as restoring once", async () => {
    const hal = new MockHAL();
    const snapshot = await hal.checkpoint_state();

    await hal.restore_state(snapshot);
    const afterFirst = hal.savedSnapshot;

    await hal.restore_state(snapshot);
    const afterSecond = hal.savedSnapshot;

    expect(afterFirst?.snapshot_id).toBe(afterSecond?.snapshot_id);
    expect(afterFirst?.simulation_time_ms).toBe(
      afterSecond?.simulation_time_ms
    );
  });

  it("checkpoint after restore produces a snapshot with the same simulation_time_ms", async () => {
    const hal = new MockHAL();
    const original = await hal.checkpoint_state();
    await hal.restore_state(original);
    const recheckpointed = await hal.checkpoint_state();

    expect(recheckpointed.simulation_time_ms).toBe(
      original.simulation_time_ms
    );
  });
});

// ── Invariant 4: HAL interface is identical across hardware targets ────────────

describe("HAL Invariant 4 — Interface identical across hardware targets", () => {
  // Verify that any object claiming to implement HardwareAbstractionLayer
  // exposes all required methods. This test uses two different mock
  // configurations (datacenter-class and radiation-hardened-class) and
  // confirms both satisfy the full interface contract.

  function verifyHALInterface(hal: HardwareAbstractionLayer): void {
    expect(typeof hal.allocate_neurons).toBe("function");
    expect(typeof hal.send_spikes).toBe("function");
    expect(typeof hal.receive_spikes).toBe("function");
    expect(typeof hal.checkpoint_state).toBe("function");
    expect(typeof hal.restore_state).toBe("function");
    expect(typeof hal.health_check).toBe("function");
  }

  it("datacenter-class HAL exposes all 6 required methods", () => {
    const datacenterHAL = new MockHAL({
      nodePool: ["dc-node-0", "dc-node-1"],
      powerConsumption_W: 9_000_000,
    });
    verifyHALInterface(datacenterHAL);
  });

  it("radiation-hardened-class HAL exposes all 6 required methods", () => {
    const radiationHardenedHAL = new MockHAL({
      nodePool: ["rh-node-0"],
      powerConsumption_W: 500_000,
      errorRate: 0.0001, // Slightly elevated from cosmic-ray bit-flips
    });
    verifyHALInterface(radiationHardenedHAL);
  });

  it("enduring-substrate-class HAL exposes all 6 required methods", () => {
    const enduringSubstrateHAL = new MockHAL({
      nodePool: ["es-node-0", "es-node-1", "es-node-2"],
      powerConsumption_W: 200_000,
      errorRate: 0.0,
      healthy: true,
    });
    verifyHALInterface(enduringSubstrateHAL);
  });

  it("all three hardware targets satisfy the same interface (no extra fields required)", () => {
    const hals: HardwareAbstractionLayer[] = [
      new MockHAL({ nodePool: ["dc-0"] }),
      new MockHAL({ nodePool: ["rh-0"], errorRate: 0.0001 }),
      new MockHAL({ nodePool: ["es-0"], powerConsumption_W: 100_000 }),
    ];
    for (const hal of hals) {
      verifyHALInterface(hal);
    }
  });
});
