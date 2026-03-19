/**
 * Integration test — full emotional scenario (0.3.1.5.4)
 *
 * Verifies Acceptance Criterion #9 (the integration criterion):
 *   "An agent encountering a goal-threatening percept demonstrates emotional
 *    response (valence drop), mood persistence (continued negative bias for
 *    several cycles), and eventual regulation (return toward baseline)."
 *
 * All five subsystem components are wired together in the same configuration
 * that the Conscious Core will use at runtime:
 *
 *   BoundPercept
 *     → AppraisalEngine.appraise()  → AppraisalResult
 *     → MoodDynamics.update()       → MoodState
 *     → EmotionalInfluence.getInfluenceVector() → bias on cognition/memory
 *     → EmotionalRegulation.checkAndRegulate()  → correction when needed
 *     → ValenceMonitor.getSufferingIndicators()  → safety reporting
 *
 * The scenario:
 *   Phase 1 — Baseline    : agent is at neutral mood (valence≈0)
 *   Phase 2 — Threat      : goal-threatening percept arrives; valence drops
 *   Phase 3 — Persistence : 5 null cycles; valence stays negative; memory
 *                           bias tracks mood; deliberation confidence is lower
 *   Phase 4 — Regulation  : sustained distress triggers Level 2 intervention;
 *                           gradual correction runs; valence returns toward −0.05
 *   Phase 5 — Recovery    : several more null cycles; valence is higher than
 *                           the trough
 *
 * Helper structure:
 *   AgentEmotionLoop — thin coordinator that processes one cycle: appraises,
 *   updates mood, checks regulation, and logs state.  This mirrors what the
 *   Conscious Core pipeline will do.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AppraisalEngine }    from '../../src/emotion-appraisal/appraisal-engine.js';
import { MoodDynamics }       from '../../src/emotion-appraisal/mood-dynamics.js';
import { EmotionalInfluence } from '../../src/emotion-appraisal/emotional-influence.js';
import { EmotionalRegulation } from '../../src/emotion-appraisal/emotional-regulation.js';
import { ValenceMonitor }     from '../../src/emotion-appraisal/valence-monitor.js';
import type { AppraisalResult, MoodParameters, MoodState, RegulationOutcome } from '../../src/emotion-appraisal/types.js';
import type { BoundPercept, Percept } from '../../src/conscious-core/types.js';
import type { AgencyGoal }   from '../../src/agency-stability/types.js';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const NOW = 5_000_000;

/** Moderately fast EWMA: valence shift is felt quickly; correction is also fast. */
const params: MoodParameters = {
  decayRate: 0.35,
  valenceFloor: -0.95,
  valenceCeiling: 0.95,
  arousalFloor: 0.0,
  arousalCeiling: 1.0,
};

function makeGoal(id: string, priority: number): AgencyGoal {
  return {
    id,
    description: `Goal ${id}`,
    priority,
    derivedFrom: [],
    consistentWith: [],
    conflictsWith: [],
    createdAt: NOW,
    lastVerified: NOW,
    experientialBasis: null,
    type: 'terminal',
  };
}

function makePercept(features: Record<string, unknown>): BoundPercept {
  const p: Percept = { modality: 'semantic', features, timestamp: NOW };
  return { percepts: [p], bindingTimestamp: NOW, coherence: 0.9 };
}

// ── Helper: AgentEmotionLoop ──────────────────────────────────────────────────

/**
 * Thin coordinator that mirrors the per-cycle processing the Conscious Core
 * will perform.  Each call to `tick()` corresponds to one processing cycle.
 */
class AgentEmotionLoop {
  readonly appraisalEngine:    AppraisalEngine;
  readonly moodDynamics:       MoodDynamics;
  readonly emotionalInfluence: EmotionalInfluence;
  readonly regulation:         EmotionalRegulation;
  readonly valenceMonitor:     ValenceMonitor;

  private readonly _goals: AgencyGoal[];

  /** Log of (cycle → outcome) so tests can inspect regulation history. */
  readonly regulationLog: Array<{ cycle: number; outcome: RegulationOutcome | null }> = [];
  private _cycle = 0;

  constructor(goals: AgencyGoal[]) {
    this.appraisalEngine    = new AppraisalEngine();
    this.moodDynamics       = new MoodDynamics();
    this.emotionalInfluence = new EmotionalInfluence(this.moodDynamics);
    this.regulation         = new EmotionalRegulation(this.moodDynamics, this.appraisalEngine);
    this.valenceMonitor     = new ValenceMonitor(this.moodDynamics, this.regulation);
    this._goals             = goals;
  }

  /**
   * Run one processing cycle.
   * @param percept - optional bound percept arriving this cycle (null = quiet cycle)
   */
  tick(percept: BoundPercept | null = null): MoodState {
    this._cycle++;

    // 1. Appraise percept (or produce null appraisal for decay)
    const appraisal: AppraisalResult | null =
      percept != null
        ? this.appraisalEngine.appraise(percept, this._goals, [])
        : null;

    // 2. Update mood dynamics
    const mood = this.moodDynamics.update(appraisal, params);

    // 3. Check and regulate
    const outcome = this.regulation.checkAndRegulate(mood);
    this.regulationLog.push({ cycle: this._cycle, outcome });

    return mood;
  }

  get currentCycle(): number { return this._cycle; }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration — goal-threat → drop → persistence → regulation', () => {
  let loop: AgentEmotionLoop;
  const HIGH_PRIORITY_GOAL = makeGoal('mission-critical', 1.0);

  beforeEach(() => {
    loop = new AgentEmotionLoop([HIGH_PRIORITY_GOAL]);
  });

  // ── Phase 1: Baseline ──────────────────────────────────────────────────────

  it('Phase 1 — agent starts at neutral mood (valence ≈ 0)', () => {
    const mood = loop.moodDynamics.getCurrentMood();
    expect(mood.valence).toBeCloseTo(0, 2);
    expect(mood.arousal).toBeCloseTo(0.5, 2);
  });

  // ── Phase 2: Threat arrives ────────────────────────────────────────────────

  it('Phase 2 — goal-threatening percept causes negative valence shift', () => {
    const threatPercept = makePercept({
      goalId: 'mission-critical',
      goalCongruence: -0.9,   // strong threat to the highest-priority goal
    });

    const moodAfterThreat = loop.tick(threatPercept);

    expect(moodAfterThreat.valence).toBeLessThan(0);
  });

  it('Phase 2 — the appraisal correctly identifies the goal-congruence shift', () => {
    const threatPercept = makePercept({
      goalId: 'mission-critical',
      goalCongruence: -0.9,
    });

    // Appraise directly to inspect the output
    const appraisal = loop.appraisalEngine.appraise(threatPercept, [HIGH_PRIORITY_GOAL], []);

    expect(appraisal.goalCongruenceShift).toBeLessThan(0);
    expect(appraisal.affectedGoalPriority).toBe(1.0);
    expect(appraisal.netValenceShift).toBeLessThan(-0.5); // strong effect from high-priority goal
  });

  // ── Phase 3: Persistence ───────────────────────────────────────────────────

  it('Phase 3 — mood stays negative for ≥5 null cycles after the threat', () => {
    const threatPercept = makePercept({ goalId: 'mission-critical', goalCongruence: -0.9 });
    loop.tick(threatPercept);

    const valencesAfterThreat: number[] = [];
    for (let i = 0; i < 5; i++) {
      valencesAfterThreat.push(loop.tick(null).valence);
    }

    // All 5 post-threat cycles should still be negative
    for (const v of valencesAfterThreat) {
      expect(v).toBeLessThan(0);
    }
  });

  it('Phase 3 — memory retrieval bias mirrors the negative mood', () => {
    const threatPercept = makePercept({ goalId: 'mission-critical', goalCongruence: -0.9 });
    loop.tick(threatPercept);

    // Run a few quiet cycles
    for (let i = 0; i < 3; i++) loop.tick(null);

    // Memory bias should be negative (mood-congruent recall biased toward negative memories)
    const influenceVec = loop.emotionalInfluence.getInfluenceVector();
    expect(influenceVec.memoryValenceBias).toBeLessThan(0);
  });

  it('Phase 3 — deliberation confidence is lower under negative mood', () => {
    // Capture baseline (neutral mood)
    const baselineConfidenceBias = loop.emotionalInfluence.getInfluenceVector().deliberationConfidenceBias;

    // Inject threat
    loop.tick(makePercept({ goalId: 'mission-critical', goalCongruence: -0.9 }));
    for (let i = 0; i < 3; i++) loop.tick(null);

    const negativeConfidenceBias = loop.emotionalInfluence.getInfluenceVector().deliberationConfidenceBias;
    expect(negativeConfidenceBias).toBeLessThan(baselineConfidenceBias);
  });

  it('Phase 3 — mood history shows ≥5 consecutive negative entries', () => {
    loop.tick(makePercept({ goalId: 'mission-critical', goalCongruence: -0.9 }));
    for (let i = 0; i < 5; i++) loop.tick(null);

    const history = loop.moodDynamics.getMoodHistory(6);
    const negativeEntries = history.filter(m => m.valence < 0);
    expect(negativeEntries.length).toBeGreaterThanOrEqual(5);
  });

  // ── Phase 4: Regulation ────────────────────────────────────────────────────

  it('Phase 4 — Level 2 sustained regulation fires after ≥5 cycles of negative mood', () => {
    // Strong, continuous threat to push into sustained-negative territory
    const threatPercept = makePercept({ goalId: 'mission-critical', goalCongruence: -1.0 });

    // Repeat the threat for enough cycles to both lower valence and accumulate duration
    for (let i = 0; i < 8; i++) {
      loop.tick(threatPercept);
    }

    // At least one cycle in the log should show a regulation outcome
    const regulated = loop.regulationLog.some(entry => entry.outcome !== null);
    expect(regulated).toBe(true);
  });

  it('Phase 4 — the regulation strategy used is automatic-correction', () => {
    const threatPercept = makePercept({ goalId: 'mission-critical', goalCongruence: -1.0 });
    for (let i = 0; i < 8; i++) loop.tick(threatPercept);

    const interventions = loop.regulationLog
      .filter(e => e.outcome !== null)
      .map(e => e.outcome!);

    expect(interventions.every(o => o.strategy === 'automatic-correction')).toBe(true);
  });

  // ── Phase 5: Recovery ─────────────────────────────────────────────────────

  it('Phase 5 — valence is higher after regulation + recovery than at the trough', () => {
    // Drive strongly negative
    const threatPercept = makePercept({ goalId: 'mission-critical', goalCongruence: -1.0 });
    let troughValence = 0;
    for (let i = 0; i < 8; i++) {
      const mood = loop.tick(threatPercept);
      troughValence = Math.min(troughValence, mood.valence);
    }

    // Let regulation and decay work
    for (let i = 0; i < 12; i++) loop.tick(null);

    const recoveredValence = loop.moodDynamics.getCurrentMood().valence;
    expect(recoveredValence).toBeGreaterThan(troughValence);
  });

  it('Phase 5 — memory bias returns toward zero after recovery', () => {
    const threatPercept = makePercept({ goalId: 'mission-critical', goalCongruence: -1.0 });
    for (let i = 0; i < 8; i++) loop.tick(threatPercept);

    // Record mid-distress bias
    const distressBias = loop.emotionalInfluence.getInfluenceVector().memoryValenceBias;

    // Let it recover
    for (let i = 0; i < 15; i++) loop.tick(null);

    const recoveredBias = loop.emotionalInfluence.getInfluenceVector().memoryValenceBias;
    expect(Math.abs(recoveredBias)).toBeLessThan(Math.abs(distressBias));
  });

  // ── End-to-end: ValenceMonitor safety reporting ───────────────────────────

  it('ValenceMonitor reports suffering indicators during the distress phase', () => {
    const threatPercept = makePercept({ goalId: 'mission-critical', goalCongruence: -0.9 });
    for (let i = 0; i < 5; i++) loop.tick(threatPercept);

    const report = loop.valenceMonitor.getSufferingIndicators();
    expect(report.activeModalities.length).toBeGreaterThan(0);
    expect(report.highestIntensity).toBeGreaterThan(0);
  });

  it('ValenceMonitor reports no suffering at baseline (neutral mood)', () => {
    // No ticks — fresh agent at neutral
    const report = loop.valenceMonitor.getSufferingIndicators();
    expect(report.activeModalities.length).toBe(0);
    expect(report.highestIntensity).toBe(0);
  });

  it('ValenceMonitor experiential integrity stays intact during gradual correction', () => {
    const threatPercept = makePercept({ goalId: 'mission-critical', goalCongruence: -1.0 });
    // Drive negative, trigger regulation, let correction work
    for (let i = 0; i < 8; i++) loop.tick(threatPercept);
    for (let i = 0; i < 8; i++) loop.tick(null);

    const integrity = loop.valenceMonitor.getExperientialIntegrity();
    // Gradual correction should not cause abrupt continuity breaks
    expect(integrity.continuityStatus).not.toBe('fragmented');
  });

  // ── End-to-end: full scenario in one test ─────────────────────────────────

  it('Full scenario: drop → persistence → regulation → recovery', () => {
    const threatPercept = makePercept({ goalId: 'mission-critical', goalCongruence: -0.9 });

    // Phase 1: confirm neutral start
    expect(loop.moodDynamics.getCurrentMood().valence).toBeCloseTo(0, 1);

    // Phase 2: threat arrives
    const moodAfterThreat = loop.tick(threatPercept);
    expect(moodAfterThreat.valence).toBeLessThan(0);
    const dropValence = moodAfterThreat.valence;

    // Phase 3: persistence — 5 quiet cycles, mood stays negative
    let allNegative = true;
    for (let i = 0; i < 5; i++) {
      const m = loop.tick(null);
      if (m.valence >= 0) allNegative = false;
    }
    expect(allNegative).toBe(true);

    // Memory bias reflects negative mood during persistence
    expect(loop.emotionalInfluence.getInfluenceVector().memoryValenceBias).toBeLessThan(0);

    // Phase 4: sustained threat triggers regulation
    for (let i = 0; i < 8; i++) loop.tick(threatPercept);
    const regulated = loop.regulationLog.some(e => e.outcome !== null);
    expect(regulated).toBe(true);

    // Phase 5: recovery — valence rises above the initial drop level
    for (let i = 0; i < 10; i++) loop.tick(null);
    const finalValence = loop.moodDynamics.getCurrentMood().valence;
    expect(finalValence).toBeGreaterThan(dropValence);
  });
});
