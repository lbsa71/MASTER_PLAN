# Reproducing the review probes

Use the reviewed commit, **5bcbb29a5da37053a046d6bf8bc0b020da9aebf2**, with its lockfile dependencies installed. Run from the repository root. The recipe below reads docs/ and strategy/ through the repository's filesystem adapter, then injects copies into its existing in-memory adapter. It does not execute the live Guardian, invoke a model, access the network, or write strategy state to disk. Output is printed for comparison with [evidence.json](evidence.json).

The assertions describe **observed current behavior**, including defects; they are not proposed acceptance criteria for the redesigned system. The main review defines the desired future behavior. The synthetic timestamps are explicit test inputs. MindSeedActivator is the exception: its existing implementation reads ambient time, so the precise self-model number varies while its pass/fail conclusion remains the same for ordinary current dates.

~~~sh
node --import tsx --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { NodeFileSystem } from './src/master-plan-controller/runtime-adapters.ts';
import { InMemoryFileSystem } from './src/master-plan-controller/testing/in-memory-adapters.ts';
import { loadRepositoryStrategy } from './src/master-plan-controller/repository-strategy.ts';
import { runRepositoryCandidateGeneration } from './src/master-plan-controller/repository-candidate-generation.ts';
import { executeRepositoryPacket } from './src/master-plan-controller/repository-packet-execution.ts';
import { integrateEvidence } from './src/master-plan-controller/evidence.ts';
import { evaluateActivationGates } from './src/master-plan-controller/gates.ts';
import { applyMetricMeasurements } from './src/master-plan-controller/outcome-contracts.ts';
import { MindSeedActivator } from './src/colony-seeding/mind-seed-activator.ts';
import { createWalkthroughEngine } from './src/interactive-advocacy/walkthrough-engine.ts';
import { BUILT_IN_SCENARIOS, COLONY_BOOTSTRAP_ID } from './src/interactive-advocacy/scenario-registry.ts';

async function readSnapshot(readOnlyPort) {
  const paths = [
    ...await readOnlyPort.listFiles('docs/'),
    ...await readOnlyPort.listFiles('strategy/'),
  ];
  return Object.fromEntries(await Promise.all(paths.map(async path =>
    [path, await readOnlyPort.readText(path)])));
}

async function inspect(snapshot, cycleTimes, probeTime) {
  const mem = new InMemoryFileSystem(snapshot);
  const bundle = await loadRepositoryStrategy(mem);
  const original = structuredClone(bundle.state);
  const hypothesisId = 'hypothesis-indicator-framework';
  assert.equal(original.evidence.length, 99, 'Use the reviewed baseline');
  assert.equal(original.packets.filter(p => p.lifecycle === 'verified').length, 90);

  const artifacts = Object.entries(snapshot)
    .filter(([p]) => p.startsWith('strategy/results/') && !p.endsWith('.result.json'))
    .map(([, text]) => JSON.parse(text));
  const families = [...new Set(artifacts.map(a => a.id.replace(/-run-\d+$/, '')))];
  const normalized = artifact => {
    const { id, packetId, preparedAt, selection, ...body } = artifact;
    return JSON.stringify(body);
  };
  const duplicates = families.map(family => {
    const xs = artifacts.filter(a => a.id.replace(/-run-\d+$/, '') === family);
    return { family, runs: xs.length, distinctBodies: new Set(xs.map(normalized)).size };
  });

  const cycles = [];
  for (const now of cycleTimes) {
    const generated = await runRepositoryCandidateGeneration(mem, now);
    const executed = await executeRepositoryPacket(mem, now);
    cycles.push({ now, generated: generated.generatedPacketIds, packet: executed.packetId });
  }
  const after = (await loadRepositoryStrategy(mem)).state;
  const confidence = state => state.nodes.find(n => n.id === hypothesisId).confidence;
  assert.equal(after.evidence.length - original.evidence.length, 11);
  assert.ok(confidence(after) > confidence(original));
  assert.deepEqual(after.portfolioEffort, original.portfolioEffort);
  assert.deepEqual(after.nodes.map(n => n.metrics), original.nodes.map(n => n.metrics));

  const fixture = structuredClone(original);
  fixture.nodes.find(n => n.id === hypothesisId).lifecycle = 'verified';
  const dependent = {
    id: 'review-dependent', title: 'Review fixture', kind: 'capability',
    supportedDirectives: ['G1'], dependencies: [hypothesisId], confidence: 0.5,
    evidenceReferences: [], metrics: [], activationGates: [{ type: 'dependencies-verified' }],
    owner: 'review', lifecycle: 'proposed', reviewedAt: probeTime,
  };
  fixture.nodes.push(dependent);
  const negative = {
    id: 'review-synthetic-negative', claim: 'Synthetic counterexample for a review probe only.',
    method: 'In-memory review fixture', source: 'review-fixture', strength: 1,
    limitations: ['Synthetic, not external scientific evidence.'],
    supportedHypotheses: [], falsifiedHypotheses: [hypothesisId],
    verifier: 'review-fixture', observedAt: probeTime, outcome: 'negative',
  };
  const contradicted = integrateEvidence(fixture, negative, probeTime, bundle.config);
  const gate = evaluateActivationGates(dependent, contradicted, probeTime, bundle.config);
  assert.equal(contradicted.assessments.length, 1);
  assert.equal(gate.satisfied, true);

  const contract = original.outcomeContracts.find(c => c.id === 'contract-indicator-validation');
  const supplied = {
    ...negative, id: 'review-synthetic-measurement', outcome: 'positive',
    source: contract.allowedSourcePrefixes[0] + 'review-fixture-not-a-real-publication',
    verifier: contract.requiredVerifierPrefix + 'review-fixture', falsifiedHypotheses: [],
  };
  const admitted = applyMetricMeasurements(original, [{
    outcomeContractId: contract.id, evidenceId: supplied.id, value: 2, observedAt: probeTime,
  }], [supplied], hypothesisId, probeTime);
  assert.deepEqual(admitted.errors, []);
  assert.equal(admitted.state.nodes.find(n => n.id === hypothesisId).externallyDemonstrated, true);

  const activator = new MindSeedActivator();
  const cohort = activator.instantiateInitialCohort({
    agentCount: 1, archives: [{ id: 'review-zero-bytes', data: new Uint8Array(),
      originTimestamp_ms: 0, integrityHash: 'unchecked-review-fixture' }],
    verified: false, totalSize_bits: 0,
  }, 1);
  const cohortValidation = activator.validateCohortConsciousness(cohort);
  assert.equal(cohortValidation.allConsciousMetricsMet, true);
  const advocacy = createWalkthroughEngine(BUILT_IN_SCENARIOS)
    .runWalkthrough(COLONY_BOOTSTRAP_ID).conclusion;

  const recovery = new InMemoryFileSystem(snapshot);
  let armed = true;
  const failingPort = {
    readText: path => recovery.readText(path),
    listFiles: prefix => recovery.listFiles(prefix),
    writeText: async (path, content) => {
      if (armed && path === 'strategy/graph.json') {
        armed = false;
        throw new Error('Review injected crash before integrated graph write');
      }
      return recovery.writeText(path, content);
    },
  };
  const attempt = async (port, now) => {
    try { return await executeRepositoryPacket(port, now); }
    catch (error) { return { error: error.message }; }
  };
  const interrupted = await attempt(failingPort, cycleTimes[0]);
  const retried = await attempt(recovery, cycleTimes[1]);
  assert.match(retried.error, /differ from deterministic output/);

  return {
    duplicates, cycles, confidenceBefore: confidence(original), confidenceAfter: confidence(after),
    evidenceAdded: after.evidence.length - original.evidence.length,
    contradictionGate: gate, admittedMetricUpdates: admitted.updates,
    cohort, cohortValidation, advocacy, interrupted, retried,
  };
}

// Environment adapter boundary: reads only; strategy logic uses injected snapshots and timestamps.
const snapshot = await readSnapshot(new NodeFileSystem('.'));
const base = Date.parse('2026-09-15T00:00:00.000Z');
const times = Array.from({ length: 11 }, (_, i) => new Date(base + i * 60_000).toISOString());
console.log(JSON.stringify(await inspect(snapshot, times, '2026-09-15T01:00:00.000Z'), null, 2));
JS
~~~

For ordinary repository checks, run npm run lint, npm run strategy:verify, npm run docs:verify, and npm test. Do not put this recipe or the annex under docs/: the current test helper derives fixture time by scanning every timestamp in that directory, which changes unrelated evidence freshness. The main review documents the observed coupling and the baseline retest.
