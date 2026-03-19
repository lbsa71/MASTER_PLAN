/**
 * Agent Runtime and Event Loop — Public API (0.3.1.5.9)
 *
 * Re-exports everything callers need to construct, start, and observe
 * a running AgentLoop.
 */

// ── Types ──────────────────────────────────────────────────────
export type {
  AgentPhase,
  PhaseTiming,
  BudgetReport,
  TickResult,
  RawInput,
  AgentOutput,
  AgentConfig,
  LoopMetrics,
} from './types.js';

// ── Interfaces ─────────────────────────────────────────────────
export type {
  IAgentLoop,
  ICognitiveBudgetMonitor,
  IEnvironmentAdapter,
  IMemoryStore,
  IEmotionSystem,
  IDriveSystem,
} from './interfaces.js';

// ── Implementations ────────────────────────────────────────────
export { AgentLoop } from './agent-loop.js';
export { CognitiveBudgetMonitor } from './cognitive-budget.js';
export { ChatAdapter } from './chat-adapter.js';
export type { ChatAdapterConfig } from './chat-adapter.js';

// ── Startup factory ────────────────────────────────────────────
export { startAgent, recoverFromCrash } from './startup.js';
export type {
  AgentDependencies,
  StartupResult,
  CrashRecoveryReport,
} from './startup.js';
