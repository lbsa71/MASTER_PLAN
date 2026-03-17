/**
 * Manufacturing Orchestrator — Tests
 *
 * Card: 0.3.2.1 Autonomous Manufacturing Ecosystems
 *
 * Verifies the orchestration layer against the acceptance criteria defined in
 * docs/autonomous-manufacturing-ecosystems/ARCHITECTURE.md.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createManufacturingOrchestrator,
  type OrchestratorConfig,
} from "./manufacturing-orchestrator.js";
import type {
  DemandForecast,
  BillOfMaterials,
  DisruptionEvent,
  ResourceExtractor,
  Refinery,
  Fabricator,
  Assembler,
  Recycler,
} from "./types.js";

// ── Stub Factories ────────────────────────────────────────────────────────────

function makeNodes(layer: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `layer${layer}-node${i + 1}`);
}

function stubExtractor(): ResourceExtractor {
  return {
    extract: (spec) => ({
      materialId: spec.materialId,
      flowRateKgPerDay: spec.quantityKg,
      purity: 0.85,
      sourceIds: ["source-1", "source-2", "source-3"],
    }),
    status: () => ({
      active: true,
      currentOutputKgPerDay: 1000,
      activeSupplySources: ["source-1", "source-2", "source-3"],
      selfRepairInProgress: false,
    }),
    estimateYield: (site) => ({
      siteId: site.siteId,
      materialId: site.materialId,
      forecastedYieldKg: site.estimatedReserveKg * 0.9,
      confidenceLevel: 0.8,
    }),
  };
}

function stubRefinery(): Refinery {
  return {
    process: (raw, spec) => ({
      feedstockId: spec.feedstockId,
      flowRateKgPerDay: raw.flowRateKgPerDay * 0.98,
      purity: spec.targetPurity,
    }),
    purity: (sample) => ({
      sampleId: sample.sampleId,
      materialId: sample.materialId,
      measuredPurity: 0.9999,
      meetsSpec: true,
    }),
    adapt: () => {},
  };
}

function stubFabricator(): Fabricator {
  let replicaCount = 0;
  return {
    produce: (design, qty) => ({
      batchId: `batch-${design.designId}-${Date.now()}`,
      designId: design.designId,
      quantity: qty,
      producedAt: Date.now(),
    }),
    verify: (batch) => ({
      batchId: batch.batchId,
      passCount: batch.quantity,
      failCount: 0,
      yieldFraction: 1.0,
      defectCategories: [],
    }),
    selfReplicate: (targetSpec) => {
      replicaCount++;
      return stubFabricator();
    },
  };
}

function stubAssembler(): Assembler {
  return {
    assemble: (bom) => ({
      systemId: `system-${bom.bomId}`,
      components: [],
      assembledAt: Date.now(),
    }),
    test: (system) => ({
      systemId: system.systemId,
      passed: true,
      consciousnessSubstrateValidated: true,
      failureReasons: [],
    }),
    install: (system, location) => ({
      systemId: system.systemId,
      location,
      installedAt: Date.now(),
      success: true,
    }),
  };
}

function stubRecycler(): Recycler {
  return {
    disassemble: (system) => ({
      streamId: `stream-${system.systemId}`,
      materials: [{ materialId: "silicon", massKg: 10, purity: 0.9 }],
    }),
    sort: (stream) => ({
      streamId: stream.streamId,
      sorted: [...stream.materials].sort((a, b) =>
        a.materialId.localeCompare(b.materialId)
      ),
    }),
    reintroduce: () => {},
  };
}

function makeBom(id: string): BillOfMaterials {
  return {
    bomId: id,
    items: [
      {
        design: {
          designId: `comp-${id}`,
          version: "1.0",
          feedstockRequirements: [
            { feedstockId: "silicon", targetPurity: 0.9999, quantityKg: 1 },
          ],
          isFabricatorDesign: false,
        },
        quantity: 10,
      },
    ],
  };
}

function makeConfig(nodeCount = 5): OrchestratorConfig {
  const layers = [1, 2, 3, 4, 5] as const;
  const layerNodes = {} as Record<1 | 2 | 3 | 4 | 5, string[]>;
  for (const l of layers) layerNodes[l] = makeNodes(l, nodeCount);

  const extractors = new Map(
    layerNodes[1].map((id) => [id, stubExtractor()])
  );
  const refineries = new Map(
    layerNodes[2].map((id) => [id, stubRefinery()])
  );
  const fabricators = new Map(
    layerNodes[3].map((id) => [id, stubFabricator()])
  );
  const assemblers = new Map(
    layerNodes[4].map((id) => [id, stubAssembler()])
  );
  const recyclers = new Map(
    layerNodes[5].map((id) => [id, stubRecycler()])
  );

  return {
    minNodesPerLayer: 3,
    replicationUtilisationThreshold: 0.8,
    targetRecoveryRate: 0.95,
    layerNodes,
    extractors,
    refineries,
    fabricators,
    assemblers,
    recyclers,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ManufacturingOrchestrator", () => {
  let config: OrchestratorConfig;

  beforeEach(() => {
    config = makeConfig();
  });

  // ── plan() ─────────────────────────────────────────────────────────────────

  describe("plan()", () => {
    it("returns a plan covering all five layers for each BOM", () => {
      const orchestrator = createManufacturingOrchestrator(config);
      const demand: DemandForecast = {
        forecastId: "forecast-1",
        projectedPopulation: 1000,
        horizonDays: 180,
        requiredBoms: [makeBom("bom-A"), makeBom("bom-B")],
      };

      const plan = orchestrator.plan(demand);

      expect(plan.forecastId).toBe("forecast-1");
      expect(plan.phases).toHaveLength(2);
      for (const phase of plan.phases) {
        expect(phase.layerAllocations).toHaveLength(5);
        const layers = phase.layerAllocations.map((a) => a.layer).sort();
        expect(layers).toEqual([1, 2, 3, 4, 5]);
      }
    });

    it("assigns node IDs from each layer", () => {
      const orchestrator = createManufacturingOrchestrator(config);
      const demand: DemandForecast = {
        forecastId: "forecast-2",
        projectedPopulation: 500,
        horizonDays: 90,
        requiredBoms: [makeBom("bom-C")],
      };

      const plan = orchestrator.plan(demand);
      const phase = plan.phases[0];

      for (const allocation of phase.layerAllocations) {
        expect(allocation.nodeIds.length).toBeGreaterThan(0);
      }
    });
  });

  // ── execute() ──────────────────────────────────────────────────────────────

  describe("execute()", () => {
    it("returns a handle with planId matching the executed plan", () => {
      const orchestrator = createManufacturingOrchestrator(config);
      const demand: DemandForecast = {
        forecastId: "forecast-3",
        projectedPopulation: 200,
        horizonDays: 60,
        requiredBoms: [makeBom("bom-D")],
      };

      const plan = orchestrator.plan(demand);
      const handle = orchestrator.execute(plan);

      expect(handle.planId).toBe(plan.planId);
    });

    it("reports progress reaching 1.0 after all phases complete", async () => {
      const orchestrator = createManufacturingOrchestrator(config);
      const boms = [makeBom("bom-E"), makeBom("bom-F")];
      const demand: DemandForecast = {
        forecastId: "forecast-4",
        projectedPopulation: 100,
        horizonDays: 30,
        requiredBoms: boms,
      };

      const plan = orchestrator.plan(demand);
      const handle = orchestrator.execute(plan);

      // Flush one microtask tick per phase (each phase awaits once internally)
      for (let i = 0; i < boms.length * 2 + 1; i++) {
        await Promise.resolve();
      }

      expect(handle.progress()).toBe(1.0);
    });

    it("stops progressing after cancel() called before first yield", async () => {
      const manyBoms = Array.from({ length: 10 }, (_, i) => makeBom(`bom-${i}`));
      const orchestrator = createManufacturingOrchestrator(config);
      const demand: DemandForecast = {
        forecastId: "forecast-5",
        projectedPopulation: 10000,
        horizonDays: 365,
        requiredBoms: manyBoms,
      };

      const plan = orchestrator.plan(demand);
      const handle = orchestrator.execute(plan);

      // Cancel immediately — before any async phase runs
      handle.cancel();

      // Flush all microtasks
      for (let i = 0; i < 25; i++) await Promise.resolve();

      expect(handle.progress()).toBeLessThan(1.0);
    });
  });

  // ── monitor() ──────────────────────────────────────────────────────────────

  describe("monitor()", () => {
    it("reports full health with no disruptions", () => {
      const orchestrator = createManufacturingOrchestrator(config);
      const report = orchestrator.monitor();

      expect(report.overallHealthFraction).toBe(1.0);
      expect(report.throughputFraction).toBe(1.0);
      expect(report.activeDisruptions).toHaveLength(0);
      for (const layer of [1, 2, 3, 4, 5] as const) {
        expect(report.layerHealth[layer]).toBe(1.0);
      }
    });
  });

  // ── rebalance() ────────────────────────────────────────────────────────────

  describe("rebalance()", () => {
    it("degrades throughput by less than 10% on a single-node failure (≥5 nodes)", () => {
      const orchestrator = createManufacturingOrchestrator(config); // 5 nodes/layer
      const disruption: DisruptionEvent = {
        eventId: "evt-1",
        affectedNodeId: "layer1-node1",
        layer: 1,
        estimatedRecoveryHours: 72,
      };

      orchestrator.rebalance(disruption);
      const report = orchestrator.monitor();

      // A single-node disruption across 5 nodes: throughput loss per-node = 1/5 = 0.20,
      // but capped at 9%, so layer-1 throughput drops by at most 0.09.
      const layer1Throughput = 1.0 - (1 / Math.max(1, config.layerNodes[1].length));
      // The cap ensures < 10% loss
      expect(report.throughputFraction).toBeGreaterThan(0.9);
    });

    it("records the disruption as active", () => {
      const orchestrator = createManufacturingOrchestrator(config);
      const disruption: DisruptionEvent = {
        eventId: "evt-2",
        affectedNodeId: "layer3-node2",
        layer: 3,
        estimatedRecoveryHours: 24,
      };

      orchestrator.rebalance(disruption);
      const report = orchestrator.monitor();

      expect(report.activeDisruptions).toHaveLength(1);
      expect(report.activeDisruptions[0].eventId).toBe("evt-2");
    });

    it("layer health reflects the number of disrupted nodes", () => {
      const orchestrator = createManufacturingOrchestrator(config);
      const disruption: DisruptionEvent = {
        eventId: "evt-3",
        affectedNodeId: "layer2-node1",
        layer: 2,
        estimatedRecoveryHours: 12,
      };

      orchestrator.rebalance(disruption);
      const report = orchestrator.monitor();

      // 1 disruption across 5 nodes → 80% health for layer 2
      expect(report.layerHealth[2]).toBeCloseTo(4 / 5, 5);
    });
  });
});
