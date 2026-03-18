/**
 * Replication Cycle Orchestrator
 *
 * Implements the seven-stage replication pipeline from Architecture Section 2:
 *   SURVEY -> ENERGY -> EXTRACTION -> PROPULSION -> FABRICATION -> VERIFICATION -> LAUNCH
 *
 * Handles stage sequencing, parallel stage support, retry logic with
 * exponential backoff, rework routing from verification failures, and
 * cycle completion detection.
 */

import {
  ReplicationStage,
  StageStatus,
  StageEntryCondition,
  RetryPolicy,
  ReworkRoute,
  StageRecord,
  ReplicationCycleState,
  VerificationLevel,
} from "./types.js";

// ── Stage Order ──────────────────────────────────────────────────────────────

/** The canonical seven-stage replication pipeline order */
export const STAGE_ORDER: ReplicationStage[] = [
  ReplicationStage.Survey,
  ReplicationStage.Energy,
  ReplicationStage.Extraction,
  ReplicationStage.Propulsion,
  ReplicationStage.Fabrication,
  ReplicationStage.Verification,
  ReplicationStage.Launch,
];

// ── Parallel Stage Pairs ─────────────────────────────────────────────────────

/**
 * Pairs of stages that may execute concurrently per Architecture Section 2.
 * Energy + Extraction overlap once initial power is available.
 * Extraction + Propulsion overlap since propulsion materials come from extraction.
 */
const PARALLEL_PAIRS: ReadonlySet<string> = new Set([
  pairKey(ReplicationStage.Energy, ReplicationStage.Extraction),
  pairKey(ReplicationStage.Extraction, ReplicationStage.Propulsion),
]);

function pairKey(a: ReplicationStage, b: ReplicationStage): string {
  return [a, b].sort().join("|");
}

/** Check whether two stages may run in parallel */
export function isParallelWith(a: ReplicationStage, b: ReplicationStage): boolean {
  return PARALLEL_PAIRS.has(pairKey(a, b));
}

// ── Entry Conditions ─────────────────────────────────────────────────────────

const ENTRY_CONDITIONS: Map<ReplicationStage, StageEntryCondition> = new Map([
  [ReplicationStage.Survey, {
    stage: ReplicationStage.Survey,
    requiredStages: [],
    description: "Probe arrives at destination, magsail deceleration complete",
  }],
  [ReplicationStage.Energy, {
    stage: ReplicationStage.Energy,
    requiredStages: [ReplicationStage.Survey],
    description: "SystemSurveyReport available from Stage 1",
  }],
  [ReplicationStage.Extraction, {
    stage: ReplicationStage.Extraction,
    requiredStages: [ReplicationStage.Energy],
    description: "EnergyBudget >= mining threshold",
  }],
  [ReplicationStage.Propulsion, {
    stage: ReplicationStage.Propulsion,
    requiredStages: [ReplicationStage.Extraction],
    description: "FeedstockInventory includes propulsion materials",
  }],
  [ReplicationStage.Fabrication, {
    stage: ReplicationStage.Fabrication,
    requiredStages: [ReplicationStage.Extraction, ReplicationStage.Propulsion],
    description: "ReplicationReadiness signal — all feedstocks at spec",
  }],
  [ReplicationStage.Verification, {
    stage: ReplicationStage.Verification,
    requiredStages: [ReplicationStage.Fabrication],
    description: "AssembledProbe complete",
  }],
  [ReplicationStage.Launch, {
    stage: ReplicationStage.Launch,
    requiredStages: [ReplicationStage.Verification],
    description: "LaunchClearance granted",
  }],
]);

/** Get the entry conditions for a given stage */
export function getStageEntryConditions(stage: ReplicationStage): StageEntryCondition {
  return ENTRY_CONDITIONS.get(stage)!;
}

// ── Cycle Creation ───────────────────────────────────────────────────────────

let cycleCounter = 0;

function generateCycleId(): string {
  cycleCounter++;
  return `cycle-${Date.now()}-${cycleCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface CreateCycleParams {
  generationNumber: number;
  parentProbeId: string;
  startedAtYears: number;
}

/** Create a new replication cycle in the initial SURVEY stage with all stages PENDING */
export function createReplicationCycle(params: CreateCycleParams): ReplicationCycleState {
  const stages = new Map<ReplicationStage, StageRecord>();

  for (const stage of STAGE_ORDER) {
    stages.set(stage, {
      stage,
      status: StageStatus.Pending,
      startedAt: null,
      completedAt: null,
      retryCount: 0,
      errorLog: [],
    });
  }

  return {
    cycleId: generateCycleId(),
    generationNumber: params.generationNumber,
    parentProbeId: params.parentProbeId,
    currentStage: ReplicationStage.Survey,
    stages,
    startedAtYears: params.startedAtYears,
    estimatedCompletionYears: params.startedAtYears + 50, // mid-range estimate
    feedstockProgress: new Map(),
    verificationResult: null,
    adaptationLog: [],
  };
}

// ── Stage Advancement ────────────────────────────────────────────────────────

export interface AdvanceResult {
  success: boolean;
  reason?: string;
}

/**
 * Check whether a stage's entry conditions are satisfied.
 * For parallel stages, the required stage only needs to be IN_PROGRESS or COMPLETED.
 * For sequential stages, the required stage must be COMPLETED.
 */
export function canStageBegin(cycle: ReplicationCycleState, stage: ReplicationStage): boolean {
  const conditions = getStageEntryConditions(stage);

  for (const required of conditions.requiredStages) {
    const requiredRecord = cycle.stages.get(required)!;
    if (isParallelWith(required, stage)) {
      // Parallel: required stage needs to be at least IN_PROGRESS
      if (requiredRecord.status === StageStatus.Pending) return false;
    } else {
      // Sequential: required stage must be COMPLETED
      if (requiredRecord.status !== StageStatus.Completed) return false;
    }
  }

  return true;
}

/**
 * Advance a stage to a new status. Validates entry conditions for transitions
 * to IN_PROGRESS. Records errors and increments retry count on FAILED transitions.
 */
export function advanceStage(
  cycle: ReplicationCycleState,
  stage: ReplicationStage,
  newStatus: StageStatus,
  error?: string,
): AdvanceResult {
  const record = cycle.stages.get(stage);
  if (!record) {
    return { success: false, reason: `Unknown stage: ${stage}` };
  }

  // When starting a stage, check entry conditions
  if (newStatus === StageStatus.InProgress) {
    if (!canStageBegin(cycle, stage)) {
      return {
        success: false,
        reason: `Entry conditions not met for ${stage}`,
      };
    }
    record.startedAt = Date.now();
  }

  // On failure, increment retry count and log error
  if (newStatus === StageStatus.Failed) {
    record.retryCount++;
    if (error) {
      record.errorLog.push(error);
    }
  }

  // On completion, record timestamp
  if (newStatus === StageStatus.Completed) {
    record.completedAt = Date.now();
  }

  record.status = newStatus;
  cycle.currentStage = stage;

  return { success: true };
}

// ── Retry Logic ──────────────────────────────────────────────────────────────

/** Compute the delay in hours for a given retry attempt using exponential backoff */
export function computeRetryDelay(policy: RetryPolicy, attempt: number): number {
  return policy.baseDelayHours * Math.pow(policy.backoffMultiplier, attempt);
}

// ── Rework Routing ───────────────────────────────────────────────────────────

const REWORK_ROUTES: Map<VerificationLevel, ReworkRoute> = new Map([
  [VerificationLevel.Structural, {
    failedLevel: VerificationLevel.Structural,
    targetStage: ReplicationStage.Fabrication,
    description: "Re-fabricate/re-assemble failed structural component",
  }],
  [VerificationLevel.Computational, {
    failedLevel: VerificationLevel.Computational,
    targetStage: ReplicationStage.Fabrication,
    description: "Replace compute tiles or address semiconductor purity issue",
  }],
  [VerificationLevel.Propulsion, {
    failedLevel: VerificationLevel.Propulsion,
    targetStage: ReplicationStage.Propulsion,
    description: "Re-fabricate propulsion components",
  }],
  [VerificationLevel.ResourceExtraction, {
    failedLevel: VerificationLevel.ResourceExtraction,
    targetStage: ReplicationStage.Fabrication,
    description: "Replace seed kit components",
  }],
  [VerificationLevel.Consciousness, {
    failedLevel: VerificationLevel.Consciousness,
    targetStage: ReplicationStage.Fabrication,
    description: "Substrate rebuild or kernel re-install",
  }],
  [VerificationLevel.Integration, {
    failedLevel: VerificationLevel.Integration,
    targetStage: ReplicationStage.Fabrication,
    description: "Targeted rework per failure analysis",
  }],
]);

/** Determine which pipeline stage to route back to for a given verification failure */
export function determineReworkTarget(failedLevel: VerificationLevel): ReworkRoute {
  return REWORK_ROUTES.get(failedLevel)!;
}

// ── Cycle Completion ─────────────────────────────────────────────────────────

/** Check whether the full replication cycle is complete (all stages COMPLETED) */
export function isCycleComplete(cycle: ReplicationCycleState): boolean {
  for (const stage of STAGE_ORDER) {
    const record = cycle.stages.get(stage)!;
    if (record.status !== StageStatus.Completed) return false;
  }
  return true;
}
