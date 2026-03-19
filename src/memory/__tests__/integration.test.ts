/**
 * Integration Tests — Memory Architecture (0.3.1.5.3)
 *
 * "History makes a difference" integration test.
 *
 * Verifies that:
 *   1. An agent that has experienced a sequence of events can recall relevant
 *      episodes when faced with a similar situation.
 *   2. An agent *without* that history returns empty (or unrelated) results.
 *   3. Retrieved memories are promoted into working memory and influence the
 *      deliberation context an agent sees.
 *   4. Consolidation distils repeated episodes into semantic knowledge.
 *   5. Memory state can be snapshotted and restored (substrate migration).
 *
 * These tests exercise the full MemorySystem facade end-to-end.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemorySystem } from '../memory-system.js';
import type {
  EpisodicEntry,
  RetrievalCue,
  ConsolidationBudget,
} from '../types.js';

// ── Test fixtures ─────────────────────────────────────────────

/** A realistic embedding for a "fire hazard" scenario (4-dim for simplicity). */
const FIRE_EMBEDDING: number[] = [0.9, 0.1, 0.05, 0.0];

/** A similar embedding — same conceptual space but not identical. */
const SMOKE_EMBEDDING: number[] = [0.85, 0.15, 0.0, 0.0];

/** An unrelated embedding — completely different topic. */
const MUSIC_EMBEDDING: number[] = [0.0, 0.0, 0.9, 0.1];

function makeExperientialState(valence: number, arousal: number) {
  return {
    timestamp: Date.now(),
    phenomenalContent: { modalities: ['language'], richness: 0.6, raw: null },
    intentionalContent: { target: 'situation-assessment', clarity: 0.8 },
    valence,
    arousal,
    unityIndex: 0.7,
    continuityToken: {
      id: `ct-${Math.random()}`,
      previousId: null,
      timestamp: Date.now(),
    },
  };
}

/**
 * Records a "fire warning" episode in the given memory system.
 * High negative valence + high arousal → should be salient and retrievable.
 */
function recordFireEpisode(
  ms: MemorySystem,
  outcome: string,
): ReturnType<typeof ms.episodic.record> {
  return ms.episodic.record({
    percept: {
      modality: 'visual',
      features: { content: 'bright orange flames near equipment' },
      timestamp: Date.now(),
    },
    experientialState: makeExperientialState(-0.8, 0.9),
    actionTaken: { type: 'alert', parameters: { channel: 'emergency' } },
    outcomeObserved: outcome,
    emotionalTrace: { valence: -0.8, arousal: 0.9 },
    embedding: FIRE_EMBEDDING,
  });
}

/**
 * Records a neutral "routine check" episode.
 * Low valence + low arousal → low salience, easy to decay.
 */
function recordRoutineEpisode(ms: MemorySystem): void {
  ms.episodic.record({
    percept: {
      modality: 'auditory',
      features: { content: 'standard beep from sensor array' },
      timestamp: Date.now(),
    },
    experientialState: makeExperientialState(0.0, 0.1),
    actionTaken: null,
    outcomeObserved: 'no anomalies',
    emotionalTrace: { valence: 0.0, arousal: 0.1 },
    embedding: MUSIC_EMBEDDING,
  });
}

// ── Tests ─────────────────────────────────────────────────────

describe('Integration: history makes a difference', () => {
  let experiencedAgent: MemorySystem;
  let naiveAgent: MemorySystem;

  beforeEach(() => {
    // Experienced agent has seen three fire-related episodes
    experiencedAgent = new MemorySystem({ workingCapacity: 10 });
    recordFireEpisode(experiencedAgent, 'fire suppressed successfully');
    recordFireEpisode(experiencedAgent, 'area evacuated in time');
    recordFireEpisode(experiencedAgent, 'equipment saved — early warning worked');
    recordRoutineEpisode(experiencedAgent);

    // Naive agent has no prior history
    naiveAgent = new MemorySystem({ workingCapacity: 10 });
  });

  it('experienced agent retrieves relevant episodes for a similar cue', () => {
    const smokeCue: RetrievalCue = {
      text: 'I see smoke near the machinery',
      embedding: SMOKE_EMBEDDING,
    };

    const results = experiencedAgent.episodic.retrieve(smokeCue, 3);

    // Should find at least the three fire episodes (smoke ≈ fire embedding)
    expect(results.length).toBeGreaterThan(0);

    // All returned results should be episodic
    for (const r of results) {
      expect(r.type).toBe('episodic');
    }

    // Top result should have a meaningful composite score
    expect(results[0].compositeScore).toBeGreaterThan(0);

    // Similarity to smoke cue should be high (cosine of fire vs smoke embeddings)
    expect(results[0].similarity).toBeGreaterThan(0.5);
  });

  it('naive agent returns nothing for the same cue', () => {
    const smokeCue: RetrievalCue = {
      text: 'I see smoke near the machinery',
      embedding: SMOKE_EMBEDDING,
    };

    const results = naiveAgent.episodic.retrieve(smokeCue, 3);
    expect(results).toHaveLength(0);
  });

  it('experienced agent retrieves higher-scoring results than naive agent', () => {
    const smokeCue: RetrievalCue = { embedding: SMOKE_EMBEDDING };

    const experiencedResults = experiencedAgent.episodic.retrieve(smokeCue, 5);
    const naiveResults = naiveAgent.episodic.retrieve(smokeCue, 5);

    // Experienced agent has real results; naive has none
    expect(experiencedResults.length).toBeGreaterThan(naiveResults.length);
  });

  it('unrelated cue retrieves low-relevance results from the unrelated episode', () => {
    const musicCue: RetrievalCue = { embedding: MUSIC_EMBEDDING };

    const results = experiencedAgent.episodic.retrieve(musicCue, 3);

    // At least one result (the routine/auditory episode whose embedding is close)
    expect(results.length).toBeGreaterThan(0);

    // Fire episodes should score lower than the routine episode for music cue
    const topEntry = results[0].entry as EpisodicEntry;
    // Routine episode has music-like embedding — should be the top hit
    expect(topEntry.percept.modality).toBe('auditory');
  });
});

describe('Integration: retrieveAndPromote populates working memory', () => {
  it('promotes retrieved episodes into working memory', () => {
    const ms = new MemorySystem({ workingCapacity: 10 });
    recordFireEpisode(ms, 'contained');
    recordFireEpisode(ms, 'second fire — same zone');

    expect(ms.working.slots()).toHaveLength(0); // nothing yet

    const cue: RetrievalCue = { embedding: FIRE_EMBEDDING };
    ms.retrieveAndPromote(cue, 2);

    // Working memory should now have retrieved-episode slots
    const wm = ms.working.slots();
    expect(wm.length).toBeGreaterThan(0);
    expect(wm.every(s => s.kind === 'retrieved-episode')).toBe(true);
  });

  it('promoted slots carry the composite score as relevanceScore', () => {
    const ms = new MemorySystem({ workingCapacity: 10 });
    recordFireEpisode(ms, 'contained');

    const cue: RetrievalCue = { embedding: FIRE_EMBEDDING };
    const results = ms.retrieveAndPromote(cue, 1);

    const wmSlots = ms.working.slots();
    expect(wmSlots.length).toBe(1);
    expect(wmSlots[0].relevanceScore).toBeCloseTo(results[0].compositeScore, 5);
  });

  it('working memory does not grow beyond capacity under repeated retrievals', () => {
    const capacity = 3;
    const ms = new MemorySystem({ workingCapacity: capacity });

    // Record 5 episodes so we have more than capacity
    for (let i = 0; i < 5; i++) {
      recordFireEpisode(ms, `outcome-${i}`);
    }

    const cue: RetrievalCue = { embedding: FIRE_EMBEDDING };
    ms.retrieveAndPromote(cue, 5); // ask for 5, but capacity is 3

    expect(ms.working.slots().length).toBeLessThanOrEqual(capacity);
  });
});

describe('Integration: consolidation builds semantic knowledge', () => {
  const budget: ConsolidationBudget = {
    maxMs: 1000,
    retrievalThreshold: 1,  // any retrieved episode qualifies
    salienceThreshold: 0.5, // high-emotional episodes qualify
  };

  it('consolidates salient episodes into semantic entries', () => {
    const ms = new MemorySystem();
    recordFireEpisode(ms, 'fire contained');
    recordFireEpisode(ms, 'fire spread');

    const report = ms.consolidate(budget);

    expect(report.episodesConsolidated).toBeGreaterThan(0);
    expect(ms.semantic.size()).toBeGreaterThan(0);
    expect(report.budgetExceeded).toBe(false);
  });

  it('repeated episodes reinforce the same semantic entry', () => {
    const ms = new MemorySystem();
    // All fire episodes share the 'visual' modality → same topic key
    recordFireEpisode(ms, 'fire 1');
    recordFireEpisode(ms, 'fire 2');
    recordFireEpisode(ms, 'fire 3');

    const report = ms.consolidate(budget);

    // One semantic entry created, then two reinforcements (or all three consolidated
    // into one entry) — not three separate entries
    expect(ms.semantic.size()).toBe(1);
    expect(report.semanticEntriesCreated).toBe(1);
    expect(report.semanticEntriesReinforced).toBe(2);
  });

  it('consolidated semantic entry has increased confidence after reinforcement', () => {
    const ms = new MemorySystem();
    recordFireEpisode(ms, 'fire A');
    recordFireEpisode(ms, 'fire B');
    recordFireEpisode(ms, 'fire C');

    ms.consolidate(budget);

    const entries = ms.semantic.all();
    expect(entries.length).toBe(1);
    // Three fire episodes → initial confidence 0.5 then two reinforcements
    // Each reinforcement: confidence += (1 - confidence) * 0.3
    // After 1st reinforcement: 0.5 + 0.15 = 0.65
    // After 2nd reinforcement: 0.65 + 0.105 = 0.755
    expect(entries[0].confidence).toBeGreaterThan(0.5);
  });

  it('low-salience episodes are not consolidated', () => {
    const ms = new MemorySystem();
    recordRoutineEpisode(ms); // valence=0, arousal=0.1 → salienceMagnitude=0.05

    const report = ms.consolidate(budget); // salienceThreshold=0.5

    expect(report.episodesConsolidated).toBe(0);
    expect(ms.semantic.size()).toBe(0);
  });
});

describe('Integration: forgetting preserves high-salience entries', () => {
  it('decays low-salience entries that are old enough', () => {
    const ms = new MemorySystem({ decayHalfLifeMs: 1 }); // 1ms half-life for testing
    recordRoutineEpisode(ms); // low salience

    // Wait a tick so elapsed > halfLifeMs
    const now = Date.now() + 10;
    const dropped = ms.episodic.decay(now, 1);

    expect(dropped).toBe(1);
    expect(ms.episodic.size()).toBe(0);
  });

  it('preserves high-salience entries even past half-life', () => {
    const ms = new MemorySystem({ decayHalfLifeMs: 1 });
    recordFireEpisode(ms, 'critical event'); // high salience

    const now = Date.now() + 100;
    const dropped = ms.episodic.decay(now, 1);

    // Fire episode should NOT be dropped (high emotional salience keeps it alive)
    expect(dropped).toBe(0);
    expect(ms.episodic.size()).toBe(1);
  });
});

describe('Integration: snapshot and restore (substrate migration)', () => {
  it('stateHash changes after recording an episode', () => {
    const ms = new MemorySystem();
    const hash1 = ms.stateHash();

    recordFireEpisode(ms, 'new event');
    const hash2 = ms.stateHash();

    expect(hash1).not.toBe(hash2);
  });

  it('stateHash is identical for equivalent memory states', () => {
    const ms1 = new MemorySystem();
    const ms2 = new MemorySystem();

    // Both empty — hashes should match
    expect(ms1.stateHash()).toBe(ms2.stateHash());
  });

  it('toSnapshot / restoreFromSnapshot round-trips memory state', () => {
    const original = new MemorySystem({ workingCapacity: 5 });

    // Build up some state
    recordFireEpisode(original, 'survived');
    recordFireEpisode(original, 'contained');
    recordRoutineEpisode(original);
    original.retrieveAndPromote({ embedding: FIRE_EMBEDDING }, 2);

    const snapshot = original.toSnapshot();
    const restored = new MemorySystem({ workingCapacity: 5 });
    restored.restoreFromSnapshot(snapshot);

    // Episodic and semantic entry counts should match
    expect(restored.episodic.size()).toBe(original.episodic.size());
    expect(restored.semantic.size()).toBe(original.semantic.size());

    // Working memory slots count should match (up to capacity)
    expect(restored.working.slots().length).toBe(
      original.working.slots().length,
    );
  });

  it('restoreFromSnapshot throws on tampered integrity hash', () => {
    const ms = new MemorySystem();
    recordFireEpisode(ms, 'test');

    const snapshot = ms.toSnapshot();
    const tampered = { ...snapshot, integrityHash: 'deadbeef' };

    expect(() => ms.restoreFromSnapshot(tampered)).toThrow(
      /integrity check failed/i,
    );
  });
});

describe('Integration: retrieval updates influence future consolidation', () => {
  it('retrieved episodes meet the retrieval threshold for consolidation', () => {
    const ms = new MemorySystem({ workingCapacity: 10 });
    recordFireEpisode(ms, 'fire spotted');

    // Retrieve the episode so retrievalCount > 0
    ms.episodic.retrieve({ embedding: FIRE_EMBEDDING }, 1);

    const budget: ConsolidationBudget = {
      maxMs: 1000,
      retrievalThreshold: 1, // only episodes retrieved at least once
      salienceThreshold: 1.0, // too high for emotional salience alone to trigger
    };

    const report = ms.consolidate(budget);

    // The retrieved episode should have been consolidated (via retrievalThreshold)
    expect(report.episodesConsolidated).toBe(1);
    expect(ms.semantic.size()).toBe(1);
  });
});
