/**
 * MessagePipeline — Event-Driven Conscious Processing
 *
 * Runs the 8-phase conscious processing cycle on demand (no polling loop).
 * Each call to processMessage() executes:
 *
 *   1. PERCEIVE  — ingest text as SensorData → Percept → ExperientialState
 *   2. RECALL    — retrieve relevant memories
 *   3. APPRAISE  — emotional appraisal
 *   4. DELIBERATE — conscious deliberation + ethical judgment
 *   5. ACT       — execute the decided action
 *   6. MONITOR   — check experience integrity
 *   7. CONSOLIDATE — background memory + drive maintenance
 *   8. YIELD     — return result
 *
 * All subsystems are injected. The pipeline holds no mutable state between
 * calls — each invocation is self-contained.
 */

import type {
  IConsciousCore,
  IPerceptionPipeline,
  IActionPipeline,
  IExperienceMonitor,
} from '../conscious-core/interfaces.js';
import type {
  ExperientialState,
  SensorData,
} from '../conscious-core/types.js';
import type { IEthicalDeliberationEngine } from '../ethical-self-governance/interfaces.js';
import type { EthicalDeliberationContext, EthicalJudgment } from '../ethical-self-governance/types.js';
import type { IMemoryStore, IEmotionSystem, IDriveSystem } from './interfaces.js';
import type { Goal } from '../conscious-core/types.js';

// ── Public types ─────────────────────────────────────────────

export interface MessagePipelineDeps {
  core: IConsciousCore;
  perception: IPerceptionPipeline;
  actionPipeline: IActionPipeline;
  monitor: IExperienceMonitor;
  ethicalEngine: IEthicalDeliberationEngine;
  memory: IMemoryStore;
  emotionSystem: IEmotionSystem;
  driveSystem: IDriveSystem;
}

export interface MessagePipelineConfig {
  /** Source identifier for SensorData. Default: 'web-chat'. */
  source?: string;
}

export interface PipelineResult {
  /** Response text, or null if the action was non-communicative. */
  text: string | null;
  /** The experiential state produced during perception. */
  experientialState: ExperientialState;
  /** Whether experience integrity held during this cycle. */
  intact: boolean;
}

// ── MessagePipeline ──────────────────────────────────────────

export class MessagePipeline {
  private readonly _deps: MessagePipelineDeps;
  private readonly _source: string;
  private _goals: Goal[] = [];
  private _values: unknown[] = [];

  constructor(deps: MessagePipelineDeps, config: MessagePipelineConfig = {}) {
    this._deps = deps;
    this._source = config.source ?? 'web-chat';
  }

  setGoals(goals: Goal[]): void { this._goals = goals; }
  setValues(values: unknown[]): void { this._values = values; }

  async processMessage(text: string, receivedAt: number): Promise<PipelineResult> {
    const { core, perception, actionPipeline, monitor, ethicalEngine, memory, emotionSystem, driveSystem } = this._deps;

    // 1. PERCEIVE
    const sensorData: SensorData = {
      source: this._source,
      modality: 'text',
      payload: text,
      timestamp: receivedAt,
    };
    const percept = perception.ingest(sensorData);
    const expState = core.processPercept(percept);

    // 2. RECALL
    await memory.retrieve(expState);

    // 3. APPRAISE
    await emotionSystem.appraise(percept, this._goals, this._values);

    // 4. DELIBERATE
    const metricsAtOnset = monitor.getConsciousnessMetrics();
    const baseDecision = core.deliberate(expState, this._goals);

    const deliberationContext: EthicalDeliberationContext = {
      situationPercept: percept,
      currentExperientialState: expState,
      affectedEntities: [],
      ethicalDimensions: [],
      consciousnessMetricsAtOnset: metricsAtOnset,
    };
    const judgment = ethicalEngine.extendDeliberation(baseDecision, deliberationContext);

    // 5. ACT
    const actionResult = actionPipeline.execute(judgment.decision);

    let responseText: string | null = null;
    if (actionResult.success && _isCommunicativeAction(judgment.decision.action.type)) {
      responseText = _extractOutputText(judgment);
    }

    // 6. MONITOR
    const intact = monitor.isExperienceIntact();

    // 7. CONSOLIDATE
    await memory.consolidate();
    await driveSystem.update(expState, monitor.getConsciousnessMetrics());

    // 8. YIELD
    return { text: responseText, experientialState: expState, intact };
  }
}

// ── Pure helpers ─────────────────────────────────────────────

function _isCommunicativeAction(actionType: string): boolean {
  const lower = actionType.toLowerCase();
  return (
    lower === 'communicate' ||
    lower === 'respond' ||
    lower === 'chat' ||
    lower === 'reply' ||
    lower.startsWith('communicate:') ||
    lower.includes('communicate')
  );
}

function _extractOutputText(judgment: EthicalJudgment): string | null {
  const params = judgment.decision.action.parameters;
  if (typeof params['text'] === 'string' && params['text'].length > 0) return params['text'];
  if (typeof params['response'] === 'string' && params['response'].length > 0) return params['response'];
  if (typeof params['content'] === 'string' && params['content'].length > 0) return params['content'];
  const summary = judgment.justification.naturalLanguageSummary;
  return summary.length > 0 ? summary : null;
}
