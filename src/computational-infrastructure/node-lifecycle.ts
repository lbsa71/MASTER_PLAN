import type {
  NodeRecord,
  NodeSpec,
  NodeState,
  ManufacturingRequest,
  ExpansionTrigger,
} from './types.js';

export interface ManufacturingLayer {
  submitRequest(req: ManufacturingRequest): Promise<void>;
}

export interface NodeLifecycleEvents {
  onNodeAdmitted?: (node: NodeRecord) => void;
  onNodeDecommissioned?: (node: NodeRecord) => void;
}

export class NodeLifecycleManager {
  private nodes: Map<string, NodeRecord> = new Map();
  private pendingRequests: Map<string, ManufacturingRequest> = new Map();
  private manufacturing: ManufacturingLayer;
  private events: NodeLifecycleEvents;
  private maxRetries: number;

  constructor(
    manufacturing: ManufacturingLayer,
    events: NodeLifecycleEvents = {},
    maxRetries: number = 3,
  ) {
    this.manufacturing = manufacturing;
    this.events = events;
    this.maxRetries = maxRetries;
  }

  async handleExpansionTrigger(trigger: ExpansionTrigger, nodeSpec: NodeSpec): Promise<ManufacturingRequest> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const req: ManufacturingRequest = {
      requestId,
      nodeSpec,
      quantity: trigger.suggestedNodeCount,
      priority: trigger.priority,
      issuedAt: trigger.triggeredAt,
    };
    this.pendingRequests.set(requestId, req);
    await this.manufacturing.submitRequest(req);
    return req;
  }

  /**
   * Called by the manufacturing layer when a node has been physically created.
   */
  notifyManufactured(nodeId: string, spec: NodeSpec): void {
    const record: NodeRecord = {
      nodeId,
      spec,
      state: 'MANUFACTURED',
      failureCount: 0,
    };
    this.nodes.set(nodeId, record);
  }

  /**
   * Run the bootstrap protocol for a node. Transitions:
   * MANUFACTURED → BOOTSTRAPPING → VALIDATING → ACTIVE
   */
  async bootstrapNode(nodeId: string, now: number = Date.now()): Promise<NodeRecord> {
    const node = this.requireNode(nodeId);
    this.transition(node, 'BOOTSTRAPPING');

    // Simulate bootstrap steps (in real system these call actual services)
    await this.runBootstrapSteps(node);

    this.transition(node, 'VALIDATING');
    const valid = await this.validateNode(node);

    if (!valid) {
      node.failureCount += 1;
      if (node.failureCount >= this.maxRetries) {
        this.transition(node, 'DECOMMISSIONED');
        this.events.onNodeDecommissioned?.(node);
      } else {
        this.transition(node, 'MANUFACTURED'); // retry
      }
      return node;
    }

    node.joinedAt = now;
    node.lastHealthCheck = now;
    this.transition(node, 'ACTIVE');
    this.events.onNodeAdmitted?.(node);
    return node;
  }

  markDegraded(nodeId: string): void {
    const node = this.requireNode(nodeId);
    this.transition(node, 'DEGRADED');
  }

  decommission(nodeId: string): void {
    const node = this.requireNode(nodeId);
    this.transition(node, 'DECOMMISSIONED');
    this.events.onNodeDecommissioned?.(node);
  }

  getNode(nodeId: string): NodeRecord | undefined {
    return this.nodes.get(nodeId);
  }

  getActiveNodes(): NodeRecord[] {
    return [...this.nodes.values()].filter(n => n.state === 'ACTIVE');
  }

  getAllNodes(): NodeRecord[] {
    return [...this.nodes.values()];
  }

  // ── internals ────────────────────────────────────────────────────────────

  private transition(node: NodeRecord, next: NodeState): void {
    node.state = next;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async runBootstrapSteps(_node: NodeRecord): Promise<void> {
    // In a real deployment these steps call external services:
    // 1. Flash OS/runtime image
    // 2. Issue mesh certificates
    // 3. Start telemetry agent and await first heartbeat
    // For this model layer we resolve immediately.
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async validateNode(_node: NodeRecord): Promise<boolean> {
    // Run synthetic workload validation suite.
    // Returns true unless the node has already failed too many times.
    return _node.failureCount < this.maxRetries;
  }

  private requireNode(nodeId: string): NodeRecord {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error(`Unknown node: ${nodeId}`);
    return node;
  }
}
