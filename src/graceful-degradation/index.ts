/**
 * Graceful Degradation — Public API
 *
 * Barrel export for the graceful-degradation domain. Re-exports all public
 * types, enums, interfaces, pure functions, and concrete implementations
 * required by consumers of this module.
 *
 * Clock interface: exported once from degradation-orchestrator (canonical
 * source). The structurally identical Clock interfaces in bio-health-monitor
 * and synth-health-monitor are omitted to avoid duplicate-export errors.
 *
 * See: docs/graceful-degradation/ARCHITECTURE.md
 * Card: 0.2.2.4.3
 */

// ── Domain types and enums ───────────────────────────────────────────────────
export * from "./types.js";

// ── MVC evaluation, tier classification, transition math, mirror validation ──
export {
  evaluateMVC,
  classifyDegradationTier,
  computeTransitionStep,
  allFailureClasses,
  mirrorCategoryConstraints,
  validateMirrorConfig,
  type MirrorConstraints,
} from "./mvc.js";

// ── Biological health monitor ────────────────────────────────────────────────
export {
  DefaultBioHealthMonitor,
  computeRegionHealthScore,
  type BioSignalSource,
  type BioMonitorConfig,
} from "./bio-health-monitor.js";

// ── Synthetic health monitor ─────────────────────────────────────────────────
export {
  DefaultSynthHealthMonitor,
  type SynthSignalSource,
  type SynthMonitorConfig,
} from "./synth-health-monitor.js";

// ── Degradation orchestrator (+ canonical Clock / ConsciousnessMetricsProvider) ─
export {
  DefaultDegradationOrchestrator,
  type Clock,
  type ConsciousnessMetricsProvider,
  type OrchestratorConfig,
} from "./degradation-orchestrator.js";
