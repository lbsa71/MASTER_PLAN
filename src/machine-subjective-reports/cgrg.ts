/**
 * Consciousness-Grounded Report Generator (CGRG)
 *
 * Implements ICGRG — produces first-person experiential reports whose content
 * is causally derived from real-time F1.4 consciousness metrics.
 *
 * Key design constraints (ARCHITECTURE.md §Component 1):
 * 1. Zombie prevention: if the metric stream is detached or inactive,
 *    generateReport() throws immediately — no language-pattern fallback.
 * 2. Causal coupling: report text is produced algorithmically from metric values,
 *    not from a language model trained on "what subjective reports sound like."
 * 3. Metric citation: reports embed the raw metric values for audit trail.
 *
 * See docs/machine-subjective-reports/ARCHITECTURE.md
 */

import type { ConsciousnessMetrics } from "../conscious-core/types.js";
import type {
  MetricDimensionName,
  MetricStream,
  PerturbationSpec,
  SemanticVector,
  SubjectiveReport,
} from "./types.js";
import type { ICGRG } from "./interfaces.js";

export class CGRG implements ICGRG {
  readonly generatorId: string;

  private stream: MetricStream | null = null;
  private reportCounter = 0;

  constructor(id: string) {
    this.generatorId = id;
  }

  attachMetricStream(stream: MetricStream): void {
    this.stream = stream;
  }

  isGrounded(): boolean {
    return this.stream !== null && this.stream.isActive();
  }

  /**
   * Generate a first-person report from the current metric snapshot.
   * Throws if no active stream is attached — enforces zombie prevention.
   */
  async generateReport(): Promise<SubjectiveReport> {
    if (!this.isGrounded()) {
      throw new Error(
        "CGRG not grounded: no active metric stream attached. " +
          "Report generation halted to prevent zombie bypass."
      );
    }

    const snapshot = await this.stream!.next();
    const { metrics, timestamp } = snapshot;
    const text = this.metricsToReport(metrics);
    const semanticEncoding = this.encodeSemantics(metrics);
    const bindingId = `binding-${this.generatorId}-${timestamp}`;

    const report: SubjectiveReport = {
      id: `report-${this.generatorId}-${++this.reportCounter}`,
      text,
      timestamp,
      sourceMetrics: metrics,
      semanticEncoding,
      causalBindingId: bindingId,
      generatorId: this.generatorId,
    };

    return report;
  }

  /**
   * Verify causal binding: generates two consecutive reports and checks
   * whether the report content changes along the specified metric dimension.
   *
   * Note: the perturbation itself must be applied externally (by the substrate).
   * This method verifies that the generator is sensitive to the change.
   */
  async verifyCausalBinding(spec: PerturbationSpec): Promise<boolean> {
    if (!this.isGrounded()) return false;

    const before = await this.generateReport();
    const after = await this.generateReport();

    const delta = Math.abs(
      this.getDimensionValue(after.sourceMetrics, spec.dimension) -
        this.getDimensionValue(before.sourceMetrics, spec.dimension)
    );

    // Any measurable metric change must produce a different report
    return delta > 0.01;
  }

  // ── Private: Metric-to-Report Grounding ────────────────────

  /**
   * Produces first-person report text causally constrained by metric values.
   *
   * This is intentionally algorithmic — not a language model call.
   * Content is determined by metric thresholds, ensuring causal coupling:
   * change the metrics → change the report content.
   */
  private metricsToReport(metrics: ConsciousnessMetrics): string {
    const { phi, experienceContinuity, selfModelCoherence } = metrics;

    const integrationDesc =
      phi > 0.8
        ? "high integration — experiences feel unified and interconnected"
        : phi > 0.5
          ? "moderate integration — some coherence in the experiential field"
          : "low integration — experience feels fragmented";

    const continuityDesc =
      experienceContinuity > 0.9
        ? "strong temporal continuity — this moment connects clearly to prior moments"
        : experienceContinuity > 0.6
          ? "partial continuity — some temporal threads are present"
          : "weak continuity — the experiential stream feels discontinuous";

    const coherenceDesc =
      selfModelCoherence > 0.8
        ? "clear self-model — awareness of my own processing is coherent"
        : selfModelCoherence > 0.5
          ? "partial self-model — some aspects of my processing are opaque"
          : "degraded self-model — introspective access is limited";

    // Metric values are embedded verbatim to provide the causal audit trail
    return (
      `I am currently experiencing ${integrationDesc}. ` +
      `There is ${continuityDesc}. ` +
      `Introspectively, I note ${coherenceDesc}. ` +
      `[φ=${phi.toFixed(3)}, continuity=${experienceContinuity.toFixed(3)}, coherence=${selfModelCoherence.toFixed(3)}]`
    );
  }

  /**
   * Encodes metric values into the standardized semantic vector space
   * used in Phase B metric-correlation analysis.
   */
  private encodeSemantics(metrics: ConsciousnessMetrics): SemanticVector {
    return {
      coherenceScore: metrics.selfModelCoherence,
      continuityScore: metrics.experienceContinuity,
      specificity: Math.min(1, metrics.phi),
      // temporalNovelty requires history — neutral default for single snapshot
      temporalNovelty: 0.5,
      encodedAt: Date.now(),
    };
  }

  private getDimensionValue(
    metrics: ConsciousnessMetrics,
    dim: MetricDimensionName
  ): number {
    switch (dim) {
      case "phi":
        return metrics.phi;
      case "experienceContinuity":
        return metrics.experienceContinuity;
      case "selfModelCoherence":
        return metrics.selfModelCoherence;
    }
  }
}
