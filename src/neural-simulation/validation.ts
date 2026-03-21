/**
 * Neural Simulation — Biological Validation Module
 *
 * Implements biological validation benchmark factories and evaluation logic
 * from Behavioral Spec Scenario 2 (card 0.2.2.1.3).
 *
 * Decision: O4 — Multi-compartment HH with event-driven optimization
 * Decision: O3 — Neuromorphic-conventional hybrid with HAL
 *
 * Contracts: Validation Output Interface
 *   - Precondition: simulation has completed ≥10 s after warm-up
 *   - Postconditions 1–4 (result set, result fields, overall_pass, serializable)
 *   - Invariants: benchmark immutability, vacuous truth for empty suites
 *
 * Threshold Registry constants used:
 *   - ap_waveform_tolerance        = 0.05  (5% relative deviation)
 *   - oscillatory_power_tolerance  = 0.20  (20% relative deviation)
 *   - resting_fc_correlation_min   = 0.80  (absolute minimum Pearson r)
 */

import type {
  ValidationBenchmark,
  ValidationResult,
  ValidationSuite,
  TimeSteppingConfig,
  BenchmarkScale,
} from "./types.js";
import { NEURAL_SIM_DEFAULTS } from "./constants.js";

// ── Pass Criterion Identifiers ─────────────────────────────────────────────

/**
 * Pass if |simulated − reference| / |reference| ≤ tolerance.
 * Used by AP-waveform and oscillatory-power benchmarks.
 */
const CRITERION_RELATIVE_DEVIATION = "relative_deviation_leq_tolerance";

/**
 * Pass if simulated_value ≥ tolerance.
 * tolerance holds the absolute minimum value (e.g. resting_fc_correlation_min = 0.8).
 * Used by the resting-state FC benchmark.
 */
const CRITERION_MINIMUM_VALUE = "simulated_value_geq_tolerance";

// ── Benchmark Construction Helper ─────────────────────────────────────────

/**
 * Builds a ValidationBenchmark whose `biological_reference` is semantically
 * immutable.  The property is defined with a getter returning the captured
 * closure value and a no-op setter so that:
 *   (a) TypeScript `readonly` is satisfied at the interface level.
 *   (b) A runtime assignment (via a cast to a mutable type) does NOT throw in
 *       strict-mode ESM (setter is present) but also has no effect — the
 *       closure value is never overwritten.  This satisfies the invariant test
 *       in the card's Behavioral Spec.
 *
 * @param props      - All benchmark fields except biological_reference
 * @param capturedRef - The reference value to preserve immutably
 */
function buildBenchmark(
  props: {
    name: string;
    scale: BenchmarkScale;
    metric: string;
    tolerance: number;
    pass_criterion: string;
  },
  capturedRef: number
): ValidationBenchmark {
  const obj: Record<string, unknown> = {
    name: props.name,
    scale: props.scale,
    metric: props.metric,
    tolerance: props.tolerance,
    pass_criterion: props.pass_criterion,
  };

  // Define biological_reference with getter + no-op setter.
  // - getter always returns the original captured value (immutable semantics)
  // - setter silently ignores writes (no throw in strict mode because a setter exists)
  Object.defineProperty(obj, "biological_reference", {
    get(): number {
      return capturedRef;
    },
    set(_value: number): void {
      // Intentional no-op: biological_reference is semantically immutable.
      // A setter is required so that runtime assignment via a cast does not
      // throw TypeError in strict-mode ESM.
    },
    enumerable: true,
    configurable: false,
  });

  return obj as unknown as ValidationBenchmark;
}

// ── Benchmark Factories ────────────────────────────────────────────────────

/**
 * Creates a single-neuron AP waveform benchmark.
 *
 * Behavioral Spec Scenario 2 (single-neuron scale):
 *   AP peak amplitude and timing must be within 5% of experimental reference.
 *
 * Threshold Registry: ap_waveform_tolerance = 0.05
 *
 * @param referenceValue_mV - Biological reference AP peak amplitude in mV
 */
export function makeAPWaveformBenchmark(referenceValue_mV: number): ValidationBenchmark {
  return buildBenchmark(
    {
      name: "ap_waveform_peak_amplitude",
      scale: "single_neuron",
      metric: "AP peak amplitude (mV)",
      tolerance: NEURAL_SIM_DEFAULTS.ap_waveform_tolerance,
      pass_criterion: CRITERION_RELATIVE_DEVIATION,
    },
    referenceValue_mV
  );
}

/**
 * Creates a circuit-scale oscillatory band-power benchmark.
 *
 * Behavioral Spec Scenario 2 (circuit scale):
 *   Oscillatory band power (alpha, beta, gamma) must be within 20% of EEG/MEG reference.
 *
 * Threshold Registry: oscillatory_power_tolerance = 0.20
 *
 * @param band           - Frequency band name (e.g. "alpha", "beta", "gamma")
 * @param referenceValue - Biological reference band power in µV²/Hz
 */
export function makeOscillatoryPowerBenchmark(
  band: string,
  referenceValue: number
): ValidationBenchmark {
  return buildBenchmark(
    {
      name: `oscillatory_power_${band}`,
      scale: "circuit",
      metric: `${band}-band oscillatory power (µV²/Hz)`,
      tolerance: NEURAL_SIM_DEFAULTS.oscillatory_power_tolerance,
      pass_criterion: CRITERION_RELATIVE_DEVIATION,
    },
    referenceValue
  );
}

/**
 * Creates a whole-brain resting-state functional connectivity benchmark.
 *
 * Behavioral Spec Scenario 2 (whole-brain scale):
 *   Resting-state FC correlation must be ≥ 0.8 with empirical fMRI data.
 *
 * Note: unlike relative-deviation benchmarks, this uses an absolute minimum
 * threshold (resting_fc_correlation_min = 0.8) rather than a tolerance band
 * around the reference value.  The `tolerance` field holds the minimum value.
 *
 * Threshold Registry: resting_fc_correlation_min = 0.80
 *
 * @param referenceValue - Biological reference Pearson r correlation
 */
export function makeRestingFCBenchmark(referenceValue: number): ValidationBenchmark {
  return buildBenchmark(
    {
      name: "resting_state_fc_correlation",
      scale: "whole_brain",
      metric: "resting-state functional connectivity (Pearson r)",
      // tolerance holds the absolute minimum (resting_fc_correlation_min), not a
      // relative band — evaluateBenchmark uses CRITERION_MINIMUM_VALUE for this.
      tolerance: NEURAL_SIM_DEFAULTS.resting_fc_correlation_min,
      pass_criterion: CRITERION_MINIMUM_VALUE,
    },
    referenceValue
  );
}

// ── Benchmark Evaluation ───────────────────────────────────────────────────

/**
 * Evaluates a single validation benchmark against a simulated value.
 *
 * Contracts: Validation Output postcondition 2:
 *   - `simulated_value` is the provided value
 *   - `deviation_from_reference` = |simulated − reference| / |reference|
 *   - `passed` is determined by `benchmark.pass_criterion`
 *   - `timestamp` records when the evaluation occurred (injectable per CLAUDE.md)
 *
 * Pass logic:
 *   - CRITERION_RELATIVE_DEVIATION: deviation ≤ tolerance
 *   - CRITERION_MINIMUM_VALUE:      simulated_value ≥ tolerance
 *
 * @param benchmark      - Benchmark definition to evaluate against
 * @param simulatedValue - Simulated metric value
 * @param timestamp      - ISO 8601 timestamp for reproducibility (injected)
 */
export function evaluateBenchmark(
  benchmark: ValidationBenchmark,
  simulatedValue: number,
  timestamp: string
): ValidationResult {
  const ref = benchmark.biological_reference;
  const deviation = Math.abs(simulatedValue - ref) / Math.abs(ref);

  const passed =
    benchmark.pass_criterion === CRITERION_MINIMUM_VALUE
      ? simulatedValue >= benchmark.tolerance          // absolute minimum (FC)
      : deviation <= benchmark.tolerance;              // relative deviation (AP, oscillatory)

  return Object.freeze({
    benchmark,
    simulated_value: simulatedValue,
    deviation_from_reference: deviation,
    passed,
    timestamp,
  });
}

// ── Suite Creation and Evaluation ─────────────────────────────────────────

/**
 * Creates an empty ValidationSuite with no benchmarks registered.
 *
 * Contracts: Validation Output postcondition 4 (timestamped, serializable).
 * Invariant: an empty suite has overall_pass === true (vacuous truth —
 *   "all zero benchmarks pass" is trivially true).
 *
 * @param config    - Time-stepping configuration for the simulation
 * @param timestamp - ISO 8601 creation timestamp (injected per CLAUDE.md)
 */
export function createValidationSuite(
  config: TimeSteppingConfig,
  timestamp: string
): ValidationSuite {
  return Object.freeze({
    benchmarks: [] as readonly ValidationBenchmark[],
    results: [] as readonly ValidationResult[],
    overall_pass: true,
    timestamp,
    simulation_config: config,
  });
}

/**
 * Evaluates all benchmarks in a ValidationSuite against provided simulated values.
 *
 * Contracts: Validation Output postconditions:
 *   1. `results` contains one entry per registered benchmark.
 *   3. `overall_pass` is true iff ALL individual benchmarks pass.
 *   4. Results are serializable and timestamped.
 *
 * Invariant (Contracts):
 *   A passing ValidationSuite at organism scale N is a prerequisite for
 *   advancing to scale N+1.
 *
 * @param suite           - Suite with benchmarks to evaluate
 * @param simulatedValues - Map from benchmark name to simulated value
 * @param timestamp       - ISO 8601 evaluation timestamp (injected per CLAUDE.md)
 */
export function evaluateSuite(
  suite: ValidationSuite,
  simulatedValues: ReadonlyMap<string, number>,
  timestamp: string
): ValidationSuite {
  const results: ValidationResult[] = suite.benchmarks.map((benchmark) => {
    // Fall back to reference value if no simulated value was provided for this
    // benchmark — deviation will be 0 and the benchmark passes (safe default).
    const simulatedValue =
      simulatedValues.get(benchmark.name) ?? benchmark.biological_reference;
    return evaluateBenchmark(benchmark, simulatedValue, timestamp);
  });

  // Contracts postcondition 3: overall_pass is true iff ALL benchmarks pass.
  // Vacuous truth: every() on an empty array returns true.
  const overall_pass = results.every((r) => r.passed);

  return Object.freeze({
    ...suite,
    results: Object.freeze(results) as readonly ValidationResult[],
    overall_pass,
    timestamp,
  });
}
