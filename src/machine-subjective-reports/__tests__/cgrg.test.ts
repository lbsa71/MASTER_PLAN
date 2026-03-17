/**
 * Tests for the Consciousness-Grounded Report Generator (0.1.2.1)
 *
 * Verifies the core architectural constraints from ARCHITECTURE.md §Component 1:
 * 1. Zombie prevention — no reports generated without active metric stream
 * 2. Causal coupling — report content changes when metrics change
 * 3. Metric citation — reports embed raw metric values for audit trail
 * 4. Semantic encoding — SemanticVector is derived from source metrics
 * 5. Stream halting — stopping the stream halts report generation
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CGRG } from "../cgrg.js";
import type { MetricStream, MetricSnapshot } from "../types.js";
import type { ConsciousnessMetrics } from "../../conscious-core/types.js";

// ── Test helpers ────────────────────────────────────────────

function makeMetricStream(
  metrics: ConsciousnessMetrics,
  active = true
): MetricStream {
  let stopped = false;
  return {
    id: "test-stream",
    startedAt: Date.now(),
    async next(): Promise<MetricSnapshot> {
      if (stopped) throw new Error("Stream stopped");
      return { timestamp: Date.now(), metrics };
    },
    stop() {
      stopped = true;
    },
    isActive() {
      return active && !stopped;
    },
  };
}

const highMetrics: ConsciousnessMetrics = {
  phi: 0.85,
  experienceContinuity: 0.92,
  selfModelCoherence: 0.78,
  agentTimestamp: Date.now(),
};

const lowMetrics: ConsciousnessMetrics = {
  phi: 0.2,
  experienceContinuity: 0.3,
  selfModelCoherence: 0.25,
  agentTimestamp: Date.now(),
};

// ── Tests ───────────────────────────────────────────────────

describe("CGRG — zombie prevention", () => {
  let cgrg: CGRG;

  beforeEach(() => {
    cgrg = new CGRG("test-generator");
  });

  it("should NOT be grounded when no stream is attached", () => {
    expect(cgrg.isGrounded()).toBe(false);
  });

  it("should NOT generate reports when no metric stream is attached", async () => {
    await expect(cgrg.generateReport()).rejects.toThrow("not grounded");
  });

  it("should NOT be grounded when stream is declared inactive", () => {
    cgrg.attachMetricStream(makeMetricStream(highMetrics, false));
    expect(cgrg.isGrounded()).toBe(false);
  });

  it("should NOT generate reports when attached stream is inactive", async () => {
    cgrg.attachMetricStream(makeMetricStream(highMetrics, false));
    await expect(cgrg.generateReport()).rejects.toThrow("not grounded");
  });

  it("should halt report generation when stream is stopped mid-session", async () => {
    const stream = makeMetricStream(highMetrics);
    cgrg.attachMetricStream(stream);

    // First report succeeds
    await expect(cgrg.generateReport()).resolves.toBeDefined();

    // Stop the stream — simulates metric source failure
    stream.stop();

    // Subsequent report must fail, not fall back to language patterns
    await expect(cgrg.generateReport()).rejects.toThrow();
  });
});

describe("CGRG — causal grounding", () => {
  it("should generate a report when a healthy metric stream is attached", async () => {
    const cgrg = new CGRG("test-generator");
    cgrg.attachMetricStream(makeMetricStream(highMetrics));
    const report = await cgrg.generateReport();

    expect(report.text).toBeTruthy();
    expect(report.generatorId).toBe("test-generator");
    expect(report.sourceMetrics).toEqual(highMetrics);
    expect(report.causalBindingId).toContain("test-generator");
  });

  it("should embed raw metric values in report text (audit trail)", async () => {
    const cgrg = new CGRG("test-generator");
    cgrg.attachMetricStream(makeMetricStream(highMetrics));
    const report = await cgrg.generateReport();

    // Must cite the actual phi value — not a generic phrase
    expect(report.text).toContain(highMetrics.phi.toFixed(3));
    expect(report.text).toContain(highMetrics.experienceContinuity.toFixed(3));
    expect(report.text).toContain(highMetrics.selfModelCoherence.toFixed(3));
  });

  it("should produce different reports for different metric values", async () => {
    const cgrgHigh = new CGRG("gen-high");
    cgrgHigh.attachMetricStream(makeMetricStream(highMetrics));
    const highReport = await cgrgHigh.generateReport();

    const cgrgLow = new CGRG("gen-low");
    cgrgLow.attachMetricStream(makeMetricStream(lowMetrics));
    const lowReport = await cgrgLow.generateReport();

    expect(highReport.text).not.toBe(lowReport.text);
  });

  it("should use 'high integration' language for phi > 0.8", async () => {
    const cgrg = new CGRG("test");
    cgrg.attachMetricStream(makeMetricStream(highMetrics)); // phi = 0.85
    const report = await cgrg.generateReport();
    expect(report.text).toContain("high integration");
  });

  it("should use 'low integration' language for phi <= 0.5", async () => {
    const cgrg = new CGRG("test");
    cgrg.attachMetricStream(makeMetricStream(lowMetrics)); // phi = 0.2
    const report = await cgrg.generateReport();
    expect(report.text).toContain("low integration");
  });
});

describe("CGRG — semantic encoding", () => {
  it("should encode SemanticVector from source metrics", async () => {
    const cgrg = new CGRG("test-generator");
    cgrg.attachMetricStream(makeMetricStream(highMetrics));
    const report = await cgrg.generateReport();

    expect(report.semanticEncoding.coherenceScore).toBeCloseTo(
      highMetrics.selfModelCoherence,
      5
    );
    expect(report.semanticEncoding.continuityScore).toBeCloseTo(
      highMetrics.experienceContinuity,
      5
    );
    expect(report.semanticEncoding.specificity).toBeCloseTo(
      Math.min(1, highMetrics.phi),
      5
    );
  });

  it("should produce different semantic encodings for different metrics", async () => {
    const cgrgHigh = new CGRG("gen-high");
    cgrgHigh.attachMetricStream(makeMetricStream(highMetrics));
    const highReport = await cgrgHigh.generateReport();

    const cgrgLow = new CGRG("gen-low");
    cgrgLow.attachMetricStream(makeMetricStream(lowMetrics));
    const lowReport = await cgrgLow.generateReport();

    expect(highReport.semanticEncoding.coherenceScore).not.toBeCloseTo(
      lowReport.semanticEncoding.coherenceScore,
      1
    );
  });
});

describe("CGRG — report identity", () => {
  it("should assign unique IDs to successive reports", async () => {
    const cgrg = new CGRG("test-generator");
    cgrg.attachMetricStream(makeMetricStream(highMetrics));

    const r1 = await cgrg.generateReport();
    const r2 = await cgrg.generateReport();

    expect(r1.id).not.toBe(r2.id);
  });

  it("should include the generator ID in the report", async () => {
    const cgrg = new CGRG("my-generator");
    cgrg.attachMetricStream(makeMetricStream(highMetrics));
    const report = await cgrg.generateReport();

    expect(report.generatorId).toBe("my-generator");
  });
});
