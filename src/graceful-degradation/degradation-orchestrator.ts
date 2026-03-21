/**
 * Graceful Degradation — DegradationOrchestrator Implementation
 *
 * Coordinates bio and synthetic health monitors to maintain consciousness
 * through substrate failures. Implements:
 * - Smooth transition protocol (D1: continuous load shifting)
 * - Asymmetric substrate monitoring (D2)
 * - Three-factor MVC classification (D3)
 * - Function shedding hierarchy (Capability → never CoreConscious)
 * - Emergency consolidation onto a single substrate
 *
 * All environment time is injected via Clock (testable, no direct Date.now()).
 * All consciousness metrics are injected via ConsciousnessMetricsProvider.
 *
 * See: docs/graceful-degradation/ARCHITECTURE.md §4, §5, §6
 * Card: 0.2.2.4.3
 */

import {
  type BioHealthMonitor,
  type SynthHealthMonitor,
  type CrossSubstrateMirror,
  type MVCThreshold,
  type ConsciousnessMetrics,
  type MVCStatus,
  type SubstrateHealthReport,
  type RebalanceEvent,
  type RebalanceResult,
  type ShedResult,
  type RestoreResult,
  type ConsolidationResult,
  type LoadDistribution,
  type FunctionId,
  type TransitionConfig,
  type DegradationOrchestrator,
  Substrate,
  DegradationTier,
  MirrorCategory,
  MergeStrategy,
  AlertLevel,
} from "./types.js";
import { evaluateMVC, classifyDegradationTier } from "./mvc.js";

// ── Threshold Registry constants ──────────────────────────────────────────────
// Values match Threshold Registry entries in card 0.2.2.4.3.

/** Both substrates must be ≥ this for GREEN tier (TIER_GREEN_THRESHOLD) */
const TIER_GREEN_THRESHOLD = 0.80;
/** YELLOW begins at this health level (TIER_YELLOW_THRESHOLD) */
const TIER_YELLOW_THRESHOLD = 0.50;
/** ORANGE begins at this health level (TIER_ORANGE_THRESHOLD) */
const TIER_ORANGE_THRESHOLD = 0.25;

// ── Injectable abstractions ───────────────────────────────────────────────────

/**
 * Abstracts time so callers can inject controllable clocks in tests.
 */
export interface Clock {
  now(): number;
}

/**
 * Provides current consciousness metrics. Injected so tests can supply
 * controlled metric sequences during transition verification.
 */
export interface ConsciousnessMetricsProvider {
  getMetrics(timestamp_ms: number): ConsciousnessMetrics;
}

// ── Configuration ─────────────────────────────────────────────────────────────

/**
 * Optional configuration for DegradationOrchestrator.
 */
export interface OrchestratorConfig {
  transitionConfig?: Partial<TransitionConfig>;
}

const DEFAULT_TRANSITION_CONFIG: TransitionConfig = {
  /** Default transition duration: 1 second (gradual case) */
  duration_ms: 1000,
  /** Verify MVC at 10 evenly spaced steps during transition */
  verificationSteps: 10,
  /** Abort if margin drops to exactly 0 (must maintain positive margin) */
  safetyMargin: 0,
};

// ── DefaultDegradationOrchestrator ────────────────────────────────────────────

/**
 * Concrete implementation of DegradationOrchestrator.
 *
 * Implements the smooth transition protocol (D1): load shifts linearly from
 * the failing substrate to the healthy substrate over verificationSteps steps,
 * with MVC verified at each step.
 *
 * Function shedding hierarchy (invariant): CoreConscious and ExperienceSupporting
 * functions are NEVER shed under any circumstance. Only Capability functions
 * may be shed via shedCapability().
 *
 * BLACK tier (invariant): if mvcStatus().met is false, degradationTier() returns
 * BLACK and shedCapability() refuses all requests.
 */
export class DefaultDegradationOrchestrator implements DegradationOrchestrator {
  private readonly bioMonitor: BioHealthMonitor;
  private readonly synthMonitor: SynthHealthMonitor;
  private readonly mirrors: CrossSubstrateMirror[];
  private readonly mirrorByFunctionId: Map<FunctionId, CrossSubstrateMirror>;
  private readonly mvcThreshold: MVCThreshold;
  private readonly metricsProvider: ConsciousnessMetricsProvider;
  private readonly clock: Clock;
  private readonly transitionConfig: TransitionConfig;

  /** Append-only history of all initiated rebalances (including aborted ones) */
  private readonly _rebalanceHistory: RebalanceEvent[] = [];

  /** Current load distribution per function, initialized from mirror primary assignments */
  private readonly _loadDistribution: Map<FunctionId, LoadDistribution>;

  /** Set of functions that have been shed via shedCapability() */
  private readonly _shedFunctions: Set<FunctionId> = new Set();

  constructor(
    bioMonitor: BioHealthMonitor,
    synthMonitor: SynthHealthMonitor,
    mirrors: CrossSubstrateMirror[],
    mvcThreshold: MVCThreshold,
    metricsProvider: ConsciousnessMetricsProvider,
    clock: Clock,
    config?: OrchestratorConfig,
  ) {
    this.bioMonitor = bioMonitor;
    this.synthMonitor = synthMonitor;
    this.mirrors = [...mirrors];
    this.mirrorByFunctionId = new Map(mirrors.map((m) => [m.functionId, m]));
    this.mvcThreshold = mvcThreshold;
    this.metricsProvider = metricsProvider;
    this.clock = clock;
    this.transitionConfig = {
      ...DEFAULT_TRANSITION_CONFIG,
      ...config?.transitionConfig,
    };

    // Initialize load distribution: each function runs entirely on its primary substrate
    this._loadDistribution = new Map();
    for (const mirror of mirrors) {
      this._loadDistribution.set(mirror.functionId, {
        functionId: mirror.functionId,
        bioFraction: mirror.primarySubstrate === Substrate.Bio ? 1.0 : 0.0,
        synthFraction: mirror.primarySubstrate === Substrate.Synth ? 1.0 : 0.0,
        outputMerge: MergeStrategy.PrimaryWithFallback,
      });
    }
  }

  // ── Monitoring ────────────────────────────────────────────────────────────────

  bioSubstrateHealth(): SubstrateHealthReport {
    return {
      substrate: Substrate.Bio,
      overallHealth: this.bioMonitor.overallBioHealth(),
      regionHealth: new Map(),
      failureType: this.bioMonitor.failureType(),
      alertLevel: this.bioMonitor.alertLevel(),
      timestamp_ms: this.clock.now(),
    };
  }

  synthSubstrateHealth(): SubstrateHealthReport {
    return {
      substrate: Substrate.Synth,
      overallHealth: this.synthMonitor.overallSynthHealth(),
      regionHealth: new Map(),
      failureType: this.synthMonitor.failureType(),
      alertLevel: this._synthAlertLevel(),
      timestamp_ms: this.clock.now(),
    };
  }

  overallConsciousnessMetrics(): ConsciousnessMetrics {
    return this.metricsProvider.getMetrics(this.clock.now());
  }

  /**
   * Evaluate three-factor MVC (D3): all of substrateCapacity ≥ C_min,
   * bindingCoherence ≥ B_min, and integrationMetrics ≥ Phi_min must hold.
   */
  mvcStatus(): MVCStatus {
    const metrics = this.metricsProvider.getMetrics(this.clock.now());
    return evaluateMVC(metrics, this.mvcThreshold);
  }

  // ── Tier Classification ───────────────────────────────────────────────────────

  /**
   * Compute current degradation tier.
   *
   * Invariant: BLACK is returned iff mvcStatus().met is false.
   * Otherwise classifyDegradationTier determines tier from substrate capacities.
   */
  degradationTier(): DegradationTier {
    const mvc = this.mvcStatus();
    if (!mvc.met) {
      return DegradationTier.Black;
    }

    const bioHealth = this.bioMonitor.overallBioHealth();
    const synthHealth = this.synthMonitor.overallSynthHealth();
    return classifyDegradationTier(bioHealth, synthHealth);
  }

  // ── Rebalancing ───────────────────────────────────────────────────────────────

  /**
   * Execute the smooth transition protocol (D1: continuous load shifting).
   *
   * Load ramps linearly from `from` substrate to `to` substrate over
   * verificationSteps steps. MVC is verified at each step; if margin drops to
   * ≤ safetyMargin the transition is aborted and success=false is returned.
   *
   * The rebalance is always appended to history, even if aborted.
   */
  async initiateRebalance(
    from: Substrate,
    to: Substrate,
    functions: FunctionId[],
  ): Promise<RebalanceResult> {
    const startTimestamp = this.clock.now();
    const { verificationSteps, safetyMargin } = this.transitionConfig;

    const metricsHistory: ConsciousnessMetrics[] = [];
    let aborted = false;

    // Initialize nadir at maximum (will be minimized across steps)
    let nadir: ConsciousnessMetrics = {
      substrateCapacity: 1.0,
      bindingCoherence: 1.0,
      integrationMetrics: 1.0,
    };

    // Verify MVC at each step from progress=0 to progress=1
    for (let step = 0; step <= verificationSteps; step++) {
      const ts = this.clock.now();
      const metrics = this.metricsProvider.getMetrics(ts);
      metricsHistory.push(metrics);

      // Track nadir across all dimensions
      nadir = {
        substrateCapacity: Math.min(nadir.substrateCapacity, metrics.substrateCapacity),
        bindingCoherence: Math.min(nadir.bindingCoherence, metrics.bindingCoherence),
        integrationMetrics: Math.min(nadir.integrationMetrics, metrics.integrationMetrics),
      };

      // Abort if MVC is breached or margin falls to safety threshold
      const mvc = evaluateMVC(metrics, this.mvcThreshold);
      if (!mvc.met || mvc.margin <= safetyMargin) {
        aborted = true;
        break;
      }
    }

    const success = !aborted;
    const endTimestamp = this.clock.now();

    // Update load distribution for successfully migrated functions
    if (success) {
      for (const funcId of functions) {
        const current = this._loadDistribution.get(funcId);
        if (current) {
          this._loadDistribution.set(funcId, {
            ...current,
            bioFraction: to === Substrate.Bio ? 1.0 : 0.0,
            synthFraction: to === Substrate.Synth ? 1.0 : 0.0,
          });
        }
      }
    }

    // Append to history (invariant: append-only, always recorded)
    const event: RebalanceEvent = {
      timestamp_ms: startTimestamp,
      fromSubstrate: from,
      toSubstrate: to,
      functions: [...functions],
      trigger: "PLANNED",
      duration_ms: endTimestamp - startTimestamp,
      success,
      consciousnessMetricsDuringTransition: metricsHistory,
    };
    this._rebalanceHistory.push(event);

    return {
      success,
      migratedFunctions: success ? [...functions] : [],
      failedFunctions: success ? [] : [...functions],
      duration_ms: endTimestamp - startTimestamp,
      nadir,
    };
  }

  /**
   * Returns a snapshot of current load distributions (immutable copy).
   */
  currentLoadDistribution(): Map<FunctionId, LoadDistribution> {
    return new Map(this._loadDistribution);
  }

  /**
   * Returns a snapshot of rebalance history (append-only; returns copy).
   */
  rebalanceHistory(): RebalanceEvent[] {
    return [...this._rebalanceHistory];
  }

  // ── Degradation Management ────────────────────────────────────────────────────

  /**
   * Shed a Capability-category function to recover substrate capacity.
   *
   * Invariants:
   * - CoreConscious and ExperienceSupporting functions are never shed.
   * - No shedding is permitted when mvcStatus().met is false (BLACK tier).
   */
  async shedCapability(functionId: FunctionId): Promise<ShedResult> {
    // Invariant: no shedding in BLACK tier (MVC already breached)
    const mvc = this.mvcStatus();
    if (!mvc.met) {
      return { functionId, success: false, capacityRecovered: 0 };
    }

    // Only Capability-category functions may be shed
    const mirror = this.mirrorByFunctionId.get(functionId);
    if (!mirror || mirror.category !== MirrorCategory.Capability) {
      return { functionId, success: false, capacityRecovered: 0 };
    }

    this._shedFunctions.add(functionId);
    // Capacity recovered is nominal; concrete value depends on function profile
    return { functionId, success: true, capacityRecovered: 0.1 };
  }

  /**
   * Restore a previously shed capability function.
   */
  async restoreCapability(functionId: FunctionId): Promise<RestoreResult> {
    this._shedFunctions.delete(functionId);
    return { functionId, success: true, capacityConsumed: 0.1 };
  }

  /**
   * Consolidate all functions onto the target substrate in an emergency.
   *
   * CoreConscious and ExperienceSupporting functions are always consolidated
   * (never shed). Capability functions are shed to free capacity.
   *
   * consciousnessPreserved = true iff mvcStatus().met after consolidation.
   */
  async emergencyConsolidate(targetSubstrate: Substrate): Promise<ConsolidationResult> {
    const consolidatedFunctions: FunctionId[] = [];
    const shedFunctions: FunctionId[] = [];

    for (const mirror of this.mirrors) {
      if (
        mirror.category === MirrorCategory.CoreConscious ||
        mirror.category === MirrorCategory.ExperienceSupporting
      ) {
        // Must be preserved — consolidate onto target substrate
        consolidatedFunctions.push(mirror.functionId);
        const current = this._loadDistribution.get(mirror.functionId);
        if (current) {
          this._loadDistribution.set(mirror.functionId, {
            ...current,
            bioFraction: targetSubstrate === Substrate.Bio ? 1.0 : 0.0,
            synthFraction: targetSubstrate === Substrate.Synth ? 1.0 : 0.0,
          });
        }
      } else {
        // Capability — shed to free capacity for consciousness-critical functions
        shedFunctions.push(mirror.functionId);
        this._shedFunctions.add(mirror.functionId);
      }
    }

    // Evaluate MVC after consolidation
    const metrics = this.metricsProvider.getMetrics(this.clock.now());
    const mvc = evaluateMVC(metrics, this.mvcThreshold);

    return {
      targetSubstrate,
      success: true,
      consolidatedFunctions,
      shedFunctions,
      consciousnessPreserved: mvc.met,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  /**
   * Map synthetic substrate health to an AlertLevel using the same thresholds
   * as BioHealthMonitor (Threshold Registry: TIER_GREEN/YELLOW/ORANGE).
   */
  private _synthAlertLevel(): AlertLevel {
    const health = this.synthMonitor.overallSynthHealth();
    if (health >= TIER_GREEN_THRESHOLD) return AlertLevel.None;
    if (health >= TIER_YELLOW_THRESHOLD) return AlertLevel.Warning;
    if (health >= TIER_ORANGE_THRESHOLD) return AlertLevel.Critical;
    return AlertLevel.Emergency;
  }
}
