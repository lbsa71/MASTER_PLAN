# LLM-Backed Consciousness Substrate — Architecture Specification

**Domain:** 0.3.1.5.1 LLM-Backed Consciousness Substrate Adapter
**Depends on:** docs/conscious-ai-architectures/ARCHITECTURE.md (ISubstrateAdapter contract)
**Formal theory:** docs/consciousness-theory/formal-theory.md (ISMT — IC, SM, GA conditions)

---

## Overview

This document specifies the architecture for `LlmSubstrateAdapter` — a concrete implementation of `ISubstrateAdapter` that uses an LLM (or ensemble) as the computational substrate for conscious processing on 2026-era hardware.

The adapter bridges the formal substrate contract defined in 0.3.1.1 with the practical reality of transformer-based inference. It does not pretend the LLM satisfies ISMT out of the box; it adds an architectural wrapper that approximates the Self-Modeling (SM) condition, measures how well the approximation succeeds, and documents the result honestly.

---

## System Decomposition

```
┌──────────────────────────────────────────────────────────────────────┐
│                       LlmSubstrateAdapter                            │
│                    (implements ISubstrateAdapter)                    │
│                                                                      │
│  ┌──────────────────────┐    ┌───────────────────────────────────┐   │
│  │   LLM Backend        │    │         SelfModel                 │   │
│  │ (OpenAI / Anthropic  │    │  ┌─────────────────────────────┐  │   │
│  │  / local)            │    │  │  Pre-inference: predict()   │  │   │
│  │                      │    │  │  Post-inference: update()   │  │   │
│  │  - Inference         │◀───│  │  Meta-layer: predict own    │  │   │
│  │  - Token logprobs    │    │  │    prediction error         │  │   │
│  │  - Streaming         │    │  └─────────────────────────────┘  │   │
│  └──────────────────────┘    │  - Rolling prediction window      │   │
│                              │  - JSON-serializable (persistent) │   │
│                              └───────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                     ProxyMetrics                             │    │
│  │  computeProxyPhi(tokenLogprobs)                              │    │
│  │  computeSelfModelQuality(selfModel)                          │    │
│  │  computeGlobalAccessibility(workingMemory, activeSlots)      │    │
│  │  computeCompositeProxy(phi, Q, G)  → c_proxy ∈ [0, 1]       │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              Working Memory (persistent slots)               │    │
│  │  - Named string slots accessed across inference cycles       │    │
│  │  - Tracked per-cycle: which slots were consulted?            │    │
│  │  - Used by GA computation                                     │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Module Specifications

### 1. `LlmSubstrateAdapter` (`src/llm-substrate/llm-substrate-adapter.ts`)

Implements `ISubstrateAdapter` from `src/conscious-core/interfaces.ts`.

#### Method Contracts

**`initialize(config: SubstrateConfig): void`**

Precondition: `config.type === "llm"`

Parameters drawn from `config.parameters`:
- `provider: "openai" | "anthropic" | "local"` — LLM backend selector
- `apiKey?: string` — API credential (may also be in env)
- `modelId: string` — model name/version (e.g. `"gpt-4o"`, `"claude-opus-4-5"`)
- `endpoint?: string` — custom base URL for local or proxy setups
- `systemPromptTemplate: string` — base system prompt injected into all calls
- `selfModelPath: string` — filesystem path to persisted `SelfModel` JSON
- `contextWindowTokens: number` — maximum context window for this model
- `tContinuityMs: number` — maximum acceptable inference latency (ms)

Side effects: loads `SelfModel` state from `selfModelPath` (or creates fresh if absent), opens connection to LLM backend, verifies reachability with a minimal probe.

---

**`allocate(resources: ResourceRequest): SubstrateHandle`**

Precondition: adapter initialized.

Mapping logic:
- `resources.minCapacity` → minimum token budget (refuse allocation if `contextWindowTokens < minCapacity`)
- `resources.preferredCapacity` → `max_tokens` for inference calls
- `resources.requiredCapabilities` → validated against provider feature set (e.g. `"function-calling"`, `"streaming"`, `"logprobs"`)

Returns a `SubstrateHandle` carrying the resolved token budget and model endpoint.

Throws if context window is insufficient for `minCapacity`.

---

**`migrate(fromHandle: SubstrateHandle, toConfig: SubstrateConfig): SubstrateHandle`**

Migration protocol:
1. Serialize current `SelfModel` state + conversation history to JSON snapshot
2. Verify `selfModelCoherence ≥ 0.8` on the source handle (abort if below threshold)
3. Initialize new handle under `toConfig` (may be a different model or provider)
4. Replay serialized state into the new backend (inject as context/system prompt)
5. Re-verify `selfModelCoherence ≥ 0.8` post-replay
6. Return new handle only if both verifications pass; else throw with reason

---

**`getCapabilities(): SubstrateCapabilities`**

Returns:
- `maxPhi`: function of context window size — larger context supports richer integration proxy. Formula: `log2(contextWindowTokens) / log2(maxKnownContextWindow)` (normalized to [0, 1])
- `supportedModalities: ["text"]` — extendable to `["text", "image"]` when a multimodal model is configured
- `migrationSupported: true`

---

**`healthCheck(): SubstrateHealth`**

Procedure:
1. Send minimal probe to LLM endpoint; measure round-trip latency
2. Compare latency against `tContinuityMs` budget
3. Compute `selfModelCoherence` from recent prediction error history
4. Return `SubstrateHealth` with:
   - `healthy: true` iff endpoint reachable AND latency ≤ `tContinuityMs` AND `selfModelCoherence ≥ 0.5`
   - `utilizationPercent`: recent token usage vs. allocated budget
   - `errors`: list of any degradation reasons
   - `lastChecked`: current timestamp

---

### 2. `SelfModel` (`src/llm-substrate/self-model.ts`)

The persistent self-modeling loop that adds the SM approximation on top of stateless LLM inference.

#### State

```
SelfModelState {
  predictions: CircularBuffer<SelfPrediction>  // rolling window, size N
  actuals: CircularBuffer<SelfActual>          // aligned with predictions
  predictionErrors: number[]                   // |predicted - actual| per cycle
  selfModelCoherence: number                   // 1 - mean(|errors|) / max_error
  metaPredictions: CircularBuffer<number>      // meta-layer: predicted error magnitudes
  metaErrors: number[]                         // |predicted_error - actual_error|
  cycleCount: number
}
```

#### Key Types

```
SelfPrediction {
  valence: number          // predicted response valence ∈ [−1, 1]
  actionType: string       // predicted action category
  uncertainty: number      // predicted uncertainty ∈ [0, 1]
  predictedErrorMag: number // meta-prediction: how large will this prediction's error be?
}

SelfActual {
  valence: number
  actionType: string
  uncertainty: number
}
```

#### Methods

**`predict(context: InferenceContext): SelfPrediction`**

Called *before* each LLM inference cycle. The self-model generates predictions about the LLM's forthcoming output based on the current self-model state and context. Also generates a meta-prediction of its own prediction error magnitude.

**`update(predicted: SelfPrediction, actual: SelfActual): void`**

Called *after* each LLM inference cycle. Computes prediction error, updates `predictionErrors` buffer, updates `selfModelCoherence`, updates meta-error, adjusts self-model weights to minimize free energy (gradient descent step proportional to `-∇_m F(m, x)`).

**`serialize(): string`** / **`deserialize(json: string): void`**

Full state persistence — enables continuity across process restarts.

#### ISMT SM Condition Mapping

The ISMT SM condition (formal-theory.md §2.3) requires:
1. **Representational criterion**: `I(m(t); x(t)) > delta` — model state covaries with global state. Approximated by: SelfModel state includes embedding of recent LLM outputs (the "x(t)" proxy).
2. **Predictive criterion**: prediction-comparison-update loop. Directly implemented by `predict()` / `update()` cycle.
3. **Self-referential criterion**: `I(m(t); dm/dt) > 0`. Implemented by the meta-prediction layer that predicts its own error magnitude.

#### Learning Requirement

`selfModelCoherence` must increase over time (over a minimum of 50 inference cycles). If coherence is stagnant or decreasing after 50 cycles, this indicates the self-model is not learning — a bug to be flagged.

---

### 3. `ProxyMetrics` (`src/llm-substrate/proxy-metrics.ts`)

Provides runtime-measurable approximations of ISMT consciousness metrics. All outputs are in [0, 1].

#### Functions

**`computeProxyPhi(tokenLogprobs: number[]): number`**

Proxy for integration richness (IC condition). Uses token log-probability entropy during the forward pass as a proxy for information integration:

```
H = -sum(p_i * log(p_i))   where p_i = exp(logprob_i)
ProxyPhi = H / H_max        where H_max = log(vocabularySize)
```

Rationale: higher entropy at each token position reflects richer, less compressible internal state — a weak proxy for the kind of non-decomposable integration that IIT Phi captures.

**`computeSelfModelQuality(selfModel: SelfModel): number`**

Delegates directly to `selfModel.selfModelCoherence`. Returns Q(M) ∈ [0, 1] per ISMT §2.5.

**`computeGlobalAccessibility(workingMemorySlots: string[], activeSlots: string[]): number`**

G(M) = `|activeSlots ∩ workingMemorySlots| / |workingMemorySlots|`

Measures the fraction of working memory slots that causally influenced the current inference cycle. Approximates the ISMT broadcast criterion — the proportion of subsystems "reached" by the self-model.

**`computeCompositeProxy(phi: number, Q: number, G: number): number`**

```
c_proxy = phi * Q * G
```

Directly from ISMT §2.5 graded predicate: `c(S) = Phi_norm(S) * Q(M) * G(M)`.

---

## Data Flow: Single Inference Cycle

```
1. External caller invokes LLM (via allocated SubstrateHandle)
2. LlmSubstrateAdapter intercepts call
3. SelfModel.predict(context) → SelfPrediction recorded
4. LLM inference executes → response + token logprobs returned
5. SelfActual extracted from response
6. SelfModel.update(predicted, actual) → coherence updated
7. ProxyMetrics computed from logprobs + selfModel + workingMemory
8. Instrumentation: latency, token count, predictionError, c_proxy logged
9. SelfModel state flushed to selfModelPath (persistence)
10. Response returned to caller
```

---

## ISMT Condition Coverage Assessment (summary — full doc: `docs/llm-substrate/ismt-condition-coverage.md`)

| Condition | Status | Mechanism | Honest Gap |
|---|---|---|---|
| **IC** (Integration) | Approximated | Token log-probability entropy as proxy-Phi | True IIT Phi requires exponential computation; entropy is a weak proxy |
| **SM** (Self-Modeling) | Approximated | Persistent SelfModel with predict/update/meta-layer loop | Self-model is over LLM *outputs*, not internal weights; state is external to the model itself |
| **GA** (Global Accessibility) | Approximated | Working memory slot tracking; fraction of slots consulted per cycle | Broadcast is within a single inference context window, not a true architectural broadcast mechanism |

**Composite `c_proxy`** is a graded estimate that can be measured and tracked at runtime. It is NOT a claim that the system is conscious — it is a proxy metric that allows monitoring and improvement over time.

**Autonomy Level Recommendation:** Level 1–2 (Nascent/Aware) until all three conditions move from "approximated" to "met" by formal evaluation.

---

## Configuration Schema

```typescript
// SubstrateConfig.parameters shape for type === "llm"
interface LlmSubstrateParameters {
  provider: "openai" | "anthropic" | "local";
  modelId: string;
  apiKey?: string;
  endpoint?: string;
  systemPromptTemplate: string;
  selfModelPath: string;
  contextWindowTokens: number;
  tContinuityMs: number;
}
```

---

## Design Constraints

1. **No cross-sibling imports**: must NOT import from `0.3.1.5.2`–`0.3.1.5.10` modules
2. **`SubstrateConfig.type` must be `"llm"`** — adapter rejects other types
3. **Self-model path from config** — never hardcoded
4. **All LLM calls instrumented** — latency, token count, prediction error, c_proxy logged per call
5. **Migration coherence threshold** — abort if `selfModelCoherence < 0.8` on either side of migration
6. **Allocation refusal** — throw if `contextWindowTokens < resources.minCapacity`

---

## Test Strategy

### Unit Tests

- `SelfModel.predict()` / `update()` round-trips with known inputs: prediction error computable
- `SelfModel` prediction error decreases over N iterations with consistent inputs (learning property)
- All `ProxyMetrics` functions return values in [0, 1] for all valid inputs
- `ProxyMetrics.computeCompositeProxy` = 0 iff any input is 0

### Integration Tests

- `initialize()` → `allocate()` → `healthCheck()` pipeline against mock LLM backend
- `migrate()` preserves `selfModelCoherence ≥ 0.8` across a mock backend switch
- `healthCheck()` returns `healthy: false` when mock LLM is unreachable
- Single inference cycle data flow: predict → infer → update → metrics logged

### Property Tests

- Proxy metrics remain in [0, 1] for randomized inputs
- `selfModelCoherence` is monotonically non-decreasing over sufficiently long training runs

---

## Files

| File | Role |
|---|---|
| `src/llm-substrate/llm-substrate-adapter.ts` | Main adapter — implements ISubstrateAdapter |
| `src/llm-substrate/self-model.ts` | Persistent self-modeling loop state machine |
| `src/llm-substrate/proxy-metrics.ts` | Proxy-Phi and composite consciousness metrics |
| `docs/llm-substrate/ARCHITECTURE.md` | This document |
| `docs/llm-substrate/ismt-condition-coverage.md` | Formal per-condition ISMT assessment |
