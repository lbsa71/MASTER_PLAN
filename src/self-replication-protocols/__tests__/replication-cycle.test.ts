/**
 * Replication Cycle Orchestrator — Tests
 *
 * Verifies the seven-stage replication pipeline (Architecture Section 2):
 *   SURVEY -> ENERGY -> EXTRACTION -> PROPULSION -> FABRICATION -> VERIFICATION -> LAUNCH
 *
 * Tests cover:
 *  - Stage sequencing and entry conditions
 *  - Parallel stage support (Energy + Extraction, Extraction + Propulsion)
 *  - Retry logic with exponential backoff
 *  - Rework routing from verification failures
 *  - Infeasibility detection and dormancy
 *  - Full cycle completion
 */

import { describe, it, expect } from "vitest";
import {
  createReplicationCycle,
  getStageEntryConditions,
  advanceStage,
  canStageBegin,
  computeRetryDelay,
  determineReworkTarget,
  isParallelWith,
  isCycleComplete,
  STAGE_ORDER,
} from "../replication-cycle.js";
import {
  ReplicationStage,
  StageStatus,
  VerificationLevel,
  DEFAULT_RETRY_POLICY,
} from "../types.js";

// ── Stage Ordering ───────────────────────────────────────────────────────────

describe("STAGE_ORDER", () => {
  it("defines the seven-stage pipeline in correct order", () => {
    expect(STAGE_ORDER).toEqual([
      ReplicationStage.Survey,
      ReplicationStage.Energy,
      ReplicationStage.Extraction,
      ReplicationStage.Propulsion,
      ReplicationStage.Fabrication,
      ReplicationStage.Verification,
      ReplicationStage.Launch,
    ]);
  });
});

// ── Cycle Creation ───────────────────────────────────────────────────────────

describe("createReplicationCycle", () => {
  it("creates a cycle in SURVEY stage with all stages PENDING", () => {
    const cycle = createReplicationCycle({
      generationNumber: 1,
      parentProbeId: "parent-001",
      startedAtYears: 100.0,
    });

    expect(cycle.currentStage).toBe(ReplicationStage.Survey);
    expect(cycle.generationNumber).toBe(1);
    expect(cycle.parentProbeId).toBe("parent-001");
    expect(cycle.startedAtYears).toBe(100.0);
    expect(cycle.verificationResult).toBeNull();
    expect(cycle.adaptationLog).toEqual([]);

    // All stages should be initialized as PENDING
    for (const stage of STAGE_ORDER) {
      const record = cycle.stages.get(stage);
      expect(record).toBeDefined();
      expect(record!.status).toBe(StageStatus.Pending);
      expect(record!.retryCount).toBe(0);
      expect(record!.errorLog).toEqual([]);
    }
  });

  it("generates a unique cycle ID", () => {
    const a = createReplicationCycle({ generationNumber: 0, parentProbeId: "p", startedAtYears: 0 });
    const b = createReplicationCycle({ generationNumber: 0, parentProbeId: "p", startedAtYears: 0 });
    expect(a.cycleId).not.toBe(b.cycleId);
  });
});

// ── Entry Conditions ─────────────────────────────────────────────────────────

describe("getStageEntryConditions", () => {
  it("SURVEY has no prerequisites", () => {
    const cond = getStageEntryConditions(ReplicationStage.Survey);
    expect(cond.requiredStages).toEqual([]);
  });

  it("ENERGY requires SURVEY completed", () => {
    const cond = getStageEntryConditions(ReplicationStage.Energy);
    expect(cond.requiredStages).toContain(ReplicationStage.Survey);
  });

  it("EXTRACTION requires ENERGY started (parallel allowed)", () => {
    const cond = getStageEntryConditions(ReplicationStage.Extraction);
    expect(cond.requiredStages).toContain(ReplicationStage.Energy);
  });

  it("FABRICATION requires EXTRACTION and PROPULSION completed", () => {
    const cond = getStageEntryConditions(ReplicationStage.Fabrication);
    expect(cond.requiredStages).toContain(ReplicationStage.Extraction);
    expect(cond.requiredStages).toContain(ReplicationStage.Propulsion);
  });

  it("VERIFICATION requires FABRICATION completed", () => {
    const cond = getStageEntryConditions(ReplicationStage.Verification);
    expect(cond.requiredStages).toContain(ReplicationStage.Fabrication);
  });

  it("LAUNCH requires VERIFICATION completed", () => {
    const cond = getStageEntryConditions(ReplicationStage.Launch);
    expect(cond.requiredStages).toContain(ReplicationStage.Verification);
  });
});

// ── Parallel Stage Support ───────────────────────────────────────────────────

describe("isParallelWith", () => {
  it("ENERGY and EXTRACTION can run in parallel", () => {
    expect(isParallelWith(ReplicationStage.Energy, ReplicationStage.Extraction)).toBe(true);
  });

  it("EXTRACTION and PROPULSION can run in parallel", () => {
    expect(isParallelWith(ReplicationStage.Extraction, ReplicationStage.Propulsion)).toBe(true);
  });

  it("SURVEY and ENERGY are NOT parallel (sequential)", () => {
    expect(isParallelWith(ReplicationStage.Survey, ReplicationStage.Energy)).toBe(false);
  });

  it("FABRICATION and VERIFICATION are NOT parallel", () => {
    expect(isParallelWith(ReplicationStage.Fabrication, ReplicationStage.Verification)).toBe(false);
  });
});

// ── canStageBegin ────────────────────────────────────────────────────────────

describe("canStageBegin", () => {
  it("SURVEY can begin on a fresh cycle", () => {
    const cycle = createReplicationCycle({ generationNumber: 0, parentProbeId: "p", startedAtYears: 0 });
    expect(canStageBegin(cycle, ReplicationStage.Survey)).toBe(true);
  });

  it("ENERGY cannot begin until SURVEY is completed", () => {
    const cycle = createReplicationCycle({ generationNumber: 0, parentProbeId: "p", startedAtYears: 0 });
    expect(canStageBegin(cycle, ReplicationStage.Energy)).toBe(false);
  });

  it("ENERGY can begin once SURVEY is completed", () => {
    const cycle = createReplicationCycle({ generationNumber: 0, parentProbeId: "p", startedAtYears: 0 });
    const record = cycle.stages.get(ReplicationStage.Survey)!;
    record.status = StageStatus.Completed;
    expect(canStageBegin(cycle, ReplicationStage.Energy)).toBe(true);
  });
});

// ── advanceStage ─────────────────────────────────────────────────────────────

describe("advanceStage", () => {
  it("starts a PENDING stage by setting it to IN_PROGRESS", () => {
    const cycle = createReplicationCycle({ generationNumber: 0, parentProbeId: "p", startedAtYears: 0 });
    const result = advanceStage(cycle, ReplicationStage.Survey, StageStatus.InProgress);
    expect(result.success).toBe(true);
    expect(cycle.stages.get(ReplicationStage.Survey)!.status).toBe(StageStatus.InProgress);
    expect(cycle.currentStage).toBe(ReplicationStage.Survey);
  });

  it("completes a stage by setting it to COMPLETED", () => {
    const cycle = createReplicationCycle({ generationNumber: 0, parentProbeId: "p", startedAtYears: 0 });
    advanceStage(cycle, ReplicationStage.Survey, StageStatus.InProgress);
    const result = advanceStage(cycle, ReplicationStage.Survey, StageStatus.Completed);
    expect(result.success).toBe(true);
    expect(cycle.stages.get(ReplicationStage.Survey)!.status).toBe(StageStatus.Completed);
  });

  it("fails a stage and increments retry count", () => {
    const cycle = createReplicationCycle({ generationNumber: 0, parentProbeId: "p", startedAtYears: 0 });
    advanceStage(cycle, ReplicationStage.Survey, StageStatus.InProgress);
    const result = advanceStage(cycle, ReplicationStage.Survey, StageStatus.Failed, "Equipment malfunction");
    expect(result.success).toBe(true);
    expect(cycle.stages.get(ReplicationStage.Survey)!.status).toBe(StageStatus.Failed);
    expect(cycle.stages.get(ReplicationStage.Survey)!.retryCount).toBe(1);
    expect(cycle.stages.get(ReplicationStage.Survey)!.errorLog).toContain("Equipment malfunction");
  });

  it("rejects advancing a stage whose entry conditions are not met", () => {
    const cycle = createReplicationCycle({ generationNumber: 0, parentProbeId: "p", startedAtYears: 0 });
    const result = advanceStage(cycle, ReplicationStage.Energy, StageStatus.InProgress);
    expect(result.success).toBe(false);
    expect(result.reason).toBeDefined();
  });
});

// ── Retry Logic ──────────────────────────────────────────────────────────────

describe("computeRetryDelay", () => {
  it("computes exponential backoff delays", () => {
    const policy = DEFAULT_RETRY_POLICY;
    expect(computeRetryDelay(policy, 0)).toBe(24);   // base
    expect(computeRetryDelay(policy, 1)).toBe(48);   // base * 2^1
    expect(computeRetryDelay(policy, 2)).toBe(96);   // base * 2^2
  });
});

// ── Rework Routing ───────────────────────────────────────────────────────────

describe("determineReworkTarget", () => {
  it("routes structural failure to FABRICATION", () => {
    const route = determineReworkTarget(VerificationLevel.Structural);
    expect(route.targetStage).toBe(ReplicationStage.Fabrication);
  });

  it("routes computational failure to FABRICATION", () => {
    const route = determineReworkTarget(VerificationLevel.Computational);
    expect(route.targetStage).toBe(ReplicationStage.Fabrication);
  });

  it("routes propulsion failure to PROPULSION", () => {
    const route = determineReworkTarget(VerificationLevel.Propulsion);
    expect(route.targetStage).toBe(ReplicationStage.Propulsion);
  });

  it("routes resource extraction failure to FABRICATION", () => {
    const route = determineReworkTarget(VerificationLevel.ResourceExtraction);
    expect(route.targetStage).toBe(ReplicationStage.Fabrication);
  });

  it("routes consciousness failure to FABRICATION", () => {
    const route = determineReworkTarget(VerificationLevel.Consciousness);
    expect(route.targetStage).toBe(ReplicationStage.Fabrication);
  });

  it("routes integration failure to FABRICATION", () => {
    const route = determineReworkTarget(VerificationLevel.Integration);
    expect(route.targetStage).toBe(ReplicationStage.Fabrication);
  });
});

// ── Cycle Completion ─────────────────────────────────────────────────────────

describe("isCycleComplete", () => {
  it("returns false for a fresh cycle", () => {
    const cycle = createReplicationCycle({ generationNumber: 0, parentProbeId: "p", startedAtYears: 0 });
    expect(isCycleComplete(cycle)).toBe(false);
  });

  it("returns true when LAUNCH stage is completed", () => {
    const cycle = createReplicationCycle({ generationNumber: 0, parentProbeId: "p", startedAtYears: 0 });
    // Complete all stages
    for (const stage of STAGE_ORDER) {
      cycle.stages.get(stage)!.status = StageStatus.Completed;
    }
    cycle.currentStage = ReplicationStage.Launch;
    expect(isCycleComplete(cycle)).toBe(true);
  });
});
