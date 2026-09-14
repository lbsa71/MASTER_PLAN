# MASTER_PLAN V3 implementation plan

**Status:** implementation proposal; no redesign has been implemented by writing this document.  
**Prepared:** 14 September 2026.  
**Inspected baseline:** `5bcbb29a5da37053a046d6bf8bc0b020da9aebf2`.  
**Basis:** [fitness-for-purpose review](reviews/2026-09-14/fitness-for-purpose.md), [machine-readable evidence and controlled probes](reviews/2026-09-14/evidence.json), and [executed reproduction instructions](reviews/2026-09-14/reproduce.md).

Implement an execution-and-evidence redesign while retaining the mission, useful research, and suitable engineering foundations. Build one complete research path from external sources to an actionable contribution and a revised parent decision; then evaluate its usefulness before broadening the system. Adding more recurring packet templates will not resolve the demonstrated failures. Replacing the entire repository would discard useful work without evidence that replacement is necessary.

This document is a delivery plan, not a second constitution or a replacement for the canonical [PLAN](docs/PLAN.md). Its package order, implementation defaults, and pilot thresholds are operational choices that can be revised with recorded reasons. Its mission and governance constraints come from the existing documents and clarified user intent; implementation must not silently amend them.

## 1. Purpose and non-negotiable boundaries

The ultimate beneficiary is **subjective consciousness or experience, regardless of species or substrate**. Preserve experience and enable its responsible proliferation under welfare, agency, identity/continuity, coexistence, and uncertainty constraints. Humanity is a possible contributor and beneficiary, not the endpoint. More instances, compute, longevity, physical sites, or agreement with the mission do not establish more valuable experience.

Preserve the existing priority of preservation where G1 conflicts with expansion, responsible proliferation under G2, and critical, voluntary transmission under G3. Creation remains optional when non-conscious means can protect life effectively. Support for a particular investigation must not require endorsement of the whole mission. No constitutional amendment is required for this interpretation. Canonical welfare and coexistence protections are richer than the machine constitution's five directive strings; validating those strings alone cannot certify compliance with the complete framework. [Mission and constraints][mission] [Plan invariants][invariants] [Machine constitution][constitution]

The operating system connects three pillars:

| Pillar | Work the repository can do | Result to seek |
|---|---|---|
| Research and knowledge synthesis | Aggregate worldwide research and experiments; assess claims, contradictions, limitations and gaps; propose discriminating investigations | Better-supported decisions, corrected errors, explicit uncertainty, useful research recommendations |
| Useful software | Build reproducible analyses, auditing/evaluation tools, reusable methods and justified computational experiments | Reproducible results against relevant baselines, independent use or integration |
| Advocacy | Explain the mission accurately and make evidence-based resource-allocation cases for specific projects | Informed engagement, collaboration, adoption, committed resources or funding; objections that improve or retire a case |

These are connected activities, not mutually exclusive budget buckets. A project can require all three. Research coverage must explicitly expose nonhuman-animal and other-substrate gaps and the opportunity costs of an initially human/AI-focused pilot.

The repository does not conduct physical or hardware experiments. It can track externally owned experiments, assess published results, and propose protocols or allocation cases. Hardware simulations require a concrete analytical question, accessible assumptions, a comparison and a statement of what they cannot establish. A model or resource threshold cannot certify consciousness, welfare, identity continuity, feasible interstellar engineering, or an achieved colony.

The automated body owns routine analysis, decomposition, execution, review, retry, scheduling, committing, pushing and merging within authorization. An unmet metric is a work signal: search for a bounded, reversible contribution when no external actor is already closing the gap. Stop only for active work, an explicit cooldown, documented exhaustion of safe strategies, or a qualified intrinsically human boundary. Repeating an exhausted output is not proactivity.

**Deterministic CI is the sole repository update gate.** Scientific assessment and publication claims have evidential requirements, but these must not become a model-review, review-classifier, protected-change, or routine human-approval requirement for repository updates. Keep the existing escalation boundary: owner-held credentials, physical presence, legal consent, or a constitutional conflict, after at least two documented automated alternatives have failed. An escalation includes evidence, attempted alternatives, why automation cannot perform the act and one bounded human decision; any required repository change is confined to one auditable commit. Failed CI, uncertainty and novelty are routine operating problems. See [AGENTS.md](AGENTS.md) and [current operations policy][operations].

## 2. Baseline and defects this plan must resolve

The review examined the named commit, persisted state and isolated production-function probes. It did not audit every scientific module, private host activity, or unrecorded external uptake. These limits apply to the plan's starting claims.

- The graph has 21 nodes: three objectives, nine hypotheses, six capabilities and three proposed long-horizon programs. There are 46 research areas and 92 packets, of which 90 are verified.
- The 90 results contain no metric measurements; their audit events contain no metric updates. Under the review's explicit normalization, 60 artifacts repeat earlier substantive bodies.
- Seventeen substantively identical indicator tables increased scientific-hypothesis confidence to 0.989029 despite zero empirically validated indicators. Eleven additional in-memory cycles without external input produced eleven more verified results and raised that confidence to 0.992533, without changing the empirical metric or recorded effort.
- The 99-record evidence ledger contains four external-URL baseline records and 95 local-source records. This is **not** the number of publications cited in the findings. The ledger contains no public/adjudicated snapshots or superseding assessments in the inspected state; ongoing source-to-decision learning is not demonstrated there.
- The deterministic host sequence omits observation and periodic review. The generic runner and decomposition have useful tests but no production construction/caller found for the relevant operating path. `npm start` launches a separate cognitive runtime.
- The review reproduced prefix-only measurement admission, stale dependency eligibility after contradictory evidence, and a crash/retry mismatch. These are controlled defects, not claims of observed external fraud or deployed harm. No strategy node is currently verified or externally demonstrated.
- Sampled advocacy code returns a conscious-colonization confirmation based on toy thresholds. No direct activator-to-controller metric feed or production advocacy distribution was found.

The baseline passed type checking, strategy validation covering 46 research areas, five documentation tests and the full suite: 4,823 passing tests in 235 files, seven todo. These tests establish tested software behavior, not scientific validity. Some currently passing tests encode the behavior being replaced. The evidence annex and review contain the exact census, reproduction conditions and source references.

| Finding | Priority and required correction | Accountable packages | Decisive acceptance check |
|---|---|---|---|
| F1 | P1: distinguish artifact verification from scientific evidence; prevent derivative evidence inflation | WP01, WP02, WP05, WP08 | Replaying identical inputs cannot change a scientific assessment, independent-evidence count, or achievement |
| F2 | P1: stop exhausted recurrence; make proactivity produce justified alternatives | WP01, WP06, WP07 | Unchanged exhausted cycles produce no substantive work; a new discriminating method remains eligible |
| F3 | P1: implement recursive initiatives/projects/contributions with shared dependencies | WP02, WP06, WP10 | One shared contribution serves two parents without duplication; feedback revises both affected decisions |
| F4 | P1: close source discovery, provenance, assessment and decision feedback | WP03, WP04, WP05, WP10 | A corrected source can be traced from retrieved version and locator through a superseded claim to a changed priority |
| F5 | P1: remove synthetic consciousness/engineering confirmation from active claims | WP01, WP07, WP09, WP12 | Toy metrics cannot yield a consciousness or deployment verdict in any active result or advocacy projection |
| F6 | P2: rank by explicit decision value and real resource use | WP06, WP10 | Measured effort or a changed uncertainty/alternative alters ranking for an explained reason; unknown use remains unknown |
| F7 | P1: propagate negative findings and invalidate stale eligibility | WP05, WP10, WP11 | A material contradiction contests the relevant current assessment and re-evaluates dependent eligibility within one cycle |
| F8 | P2: establish measurement provenance and distinct metric meanings | WP04, WP08, WP11 | A matching URL/verifier prefix alone cannot create an external outcome; revision or withdrawal can reduce one |
| F9 | P1: implement mission and project advocacy with actual uptake evidence | WP09, WP13 | A standalone research case is supportable without mission assent; a generated case/contact is never counted as uptake |
| F10 | P2: unify operation and make interrupted work recoverable | WP03, WP10, WP11 | Fault injection after every persistence boundary recovers one coherent state and does not repeat an acknowledged effect |

## 3. Retain, replace, migrate and archive

Use the current TypeScript/Vitest project and file-backed strategy store for the first complete path. A graph database, new service fleet, large UI, or agent hierarchy is not a prerequisite. The initial V3 modules proposed below live under `src/master-plan-controller/v3/`; that directory and `strategy/v3/` are **new proposed paths**, not existing capabilities. Each module should have one responsibility and use existing adapters where their semantics fit.

| Existing area | Treatment and reason |
|---|---|
| [README](README.md), [PLAN](docs/PLAN.md), [OPERATIONS](docs/OPERATIONS.md), canonical reference dossiers, [constitution](strategy/constitution.json) | Retain mission and constraints. Update operational descriptions only as behavior lands. Add traceable constraint mappings without presenting them as complete moral automation. Resolve obsolete current agent-review requirements to the existing CI-only policy; retain historical descriptions as history. |
| [Consciousness findings](strategy/findings/consciousness-assessment.json), preservation, durable-compute and institutional findings | Retain as a provenance-audit seed. Extract source identities, claims, assumptions and limitations; mark unresolved attribution explicitly. Retain a useful analysis only with its question and evidential scope. Do not certify all findings by importing them. |
| [Types and bounds][types], [ports][ports], [graph validation][graph], [test adapters](src/master-plan-controller/testing/in-memory-adapters.ts), deterministic test infrastructure | Adapt tested parts. Preserve injectable boundaries and bounded work. Replace evidence, lifecycle and authority semantics where tests encode the defects. Reuse graph traversal with edge-specific invariants. |
| [Graph](strategy/graph.json), [research areas](strategy/research-areas.json), [portfolio](strategy/portfolio.json) | Import objectives and useful hypotheses/capabilities as mapped records, then add initiative/project structure for the pilot. Retain research areas as coverage tags. Preserve historical allocation targets as provisional policy; do not import declared effort as measured consumption. |
| [Packets](strategy/work-packets.json), [evidence ledger](strategy/evidence.json), [result files](strategy/results), [periodic reviews](strategy/periodic-reviews.json) | Preserve immutable legacy history with original IDs and a migration map. Packet verification maps to historical execution status, not claim support. Keep existing confidence numbers only as legacy values; reconstruct current assessment from eligible sources. No undocumented reversal or algebraic “correction” of confidence. |
| [Packet generation][generation], [repository execution][execution], [local handlers][handlers] | Replace as active work selection/execution. An indicator formatter can survive as a utility. Copy-only refreshes and run-number table rotations lose autonomous recurrence. Arithmetic durable-compute extensions become explicitly scoped examples or a justified analytical contribution, never empirical readiness. |
| [Observer/adjudicator][observer], [measurement admission][measurements], [reviews](src/master-plan-controller/periodic-review.ts) | Retain useful transport/parser and validation seams; add preserved source content, provenance, typed assessment and actual decision application. A model is an optional analytical adapter, not a verifier of truth or repository merge authority. |
| [Host supervisor][host], [runner](src/master-plan-controller/runner.ts), [Guardian](src/master-plan-controller/guardian.ts), [CLI entry points](package.json) | Consolidate on one production composition root and transition protocol. Reuse generic runner recovery concepts where tested; do not maintain two competing state machines. Preserve useful command names as adapters to the same V3 services. |
| [Synthetic activator][activator] and [advocacy scenarios][scenarios] | Remove active unsupported conclusions first. After consumer inventory, archive/isolate toy scenarios with explicit limitations and no scientific/achievement feed. Do not attempt to validate consciousness by improving synthetic thresholds. |
| Other speculative engineering modules and [cognitive runtime](src/agent-runtime/main.ts) | Inventory active imports and links, then retain useful independent software or label/archive unvalidated concepts. They are not prerequisites for the pilot. Avoid a repository-wide rewrite or indiscriminate deletion of modules not examined scientifically. |

Archive only after mapping consumers and preserving source history, reproduction instructions, limitations and redirects where needed. A proposed `archive/pre-v3/manifest.json` records the baseline commit, content hashes, original paths, migration IDs and the disposition of each moved item. It need not duplicate all files already recoverable from Git. Active documentation must distinguish archival examples from supported capability. Stop recurring work before moving its artifacts; do not leave a live handler writing into an archive.

## 4. Target contracts and operating model

### 4.1 Recursive graph and its stopping rule

Use versioned strategy, initiative, project/question and contribution records. An initiative organizes a research direction; a project has a discriminating question or useful deliverable; a contribution is one bounded executable unit. External experiments are linked dependency records with an external executor and observable status, not locally executed work packets.

Each planning record carries an aim, why it helps its parent goal(s), evidence/claim references, assumptions and limitations, missing evidence, alternatives, resource bound, current disposition and stopping/revision criteria. Parent edges carry their own causal rationale because a shared child can serve different parents for different reasons. Explicitly record an unknown dependency instead of inventing missing knowledge. Research areas and pillar labels are cross-cutting tags, not replacements for these records.

Use typed relations:

- `advances` connects a child to one or more parent aims; this decomposition relation must be acyclic and trace to the mission.
- `depends-on` identifies operational prerequisites; executable prerequisites must be acyclic and name the assessment or artifact needed.
- `tests`, `supports`, `contradicts` and `derived-from` connect claims, sources and results. Disagreement must be representable; do not reject it because two scientific claims refer to each other. Derivation provenance must resolve to source records without circular self-support.

Decompose only an actionable gap with a reason to expect decision value. Stop at a bounded executable contribution, a named externally owned experiment to observe, or an explicit unresolved dependency. Set configurable expansion/depth and work-in-progress limits; the first implementation expands one selected project and introduces at most five proposed actionable children per cycle. Hitting the bound creates an explicit remaining gap, not invented completeness or an infinite planning chain. The five-child limit is an initial operating default, separate from the pilot's five-contribution total cap.

### 4.2 Separate records for separate kinds of knowledge

| Proposed contract | Required content and semantics |
|---|---|
| `SourceVersion` | Stable source identity and aliases; study/dataset family; resolved URL and query; publication/retrieval timestamps when known; content hash; retained permitted content or resolvable archival reference; exact locators; correction/retraction/version relations; access failures and coverage limits. Retrieval time is not publication time. |
| `Claim` and `ClaimAssessment` | A scoped proposition; source and derivation links; method and assumptions; conflicting evidence; independence grouping; limitations and uncertainty dimensions; rationale; current assessment plus immutable superseded assessments. “Insufficient”, “supported within scope”, “contested” and “rejected within scope” are distinct. Support is not an unconditional consciousness verdict. |
| `ContributionSpec` and `ExecutionAttempt` | Question/parent links, input versions, method/configuration, baseline/comparator, useful output, acceptance and stopping conditions, resource cap, execution/verification state and actual resource use. Identity derives from the scientific/technical operation, not run number or timestamp. Retries belong to the same contribution. |
| `DecisionRecord` | Options compared, prior decision, relevant assessment/input versions, expected parent value, selected action or retirement, uncertainty and opportunity costs, resource allocation, decision timestamp and supersedes link. A retained choice requires an explicit resolved question to count as learning. |
| `Measurement` | Metric kind, subject/scope, value and uncertainty or unknown status, observation period, method, source/attestation provenance and status. Process activity, software performance, scientific evidence, institutional uptake and ultimate mission outcomes are separate. |
| `ResearchCase` and `EngagementEvent` | Mission or specific-project case; evidence, limitations, audience, executor, resource ask, alternatives, objections and stopping conditions. Engagement records distinguish preparation, authorized delivery, substantive response, reuse, collaboration and committed resources. |
| `OperationEvent` and `StateManifest` | Attempts, failures, retries, leases, applied commands, state revision and recoverable commit identity. Operational events provide auditability without entering the scientific evidence ledger. |

Artifact completion establishes only that an artifact met its technical contract. A valid computation may supply model-conditional evidence if its experimental question, method, inputs and limits support that inference. A scientific null is a result of a completed informative investigation; “no changed source”, “nothing analyzed”, an inaccessible page and a failed process are not scientific null results. Negative findings must not require a positive outcome or a successful advocacy result to be preserved.

Do not carry forward the uncalibrated scalar accumulation formula. Confidence values may be used only for a specified, justified model with demonstrated calibration; otherwise use explicit uncertainty dimensions and scoped assessments. Count independence at the study/dataset/method level with documented judgment, not by publication URL, record ID or agent identity. Several papers or analyses can depend on the same data. Metadata alone can establish a publication event, not its substantive conclusion.

### 4.3 One recoverable operating cycle

1. Load configuration and the committed state revision; obtain a bounded lease; pass explicit cycle/evaluation timestamps to services.
2. Recover an incomplete local attempt before selecting new work. Consume inbox messages into an applied change, reasoned disposition or specific unresolved question; “queued” is not “answered”.
3. Observe configured sources and tracked external dependencies when due. Preserve inputs, versions and access failures. An unchanged fetch updates operational freshness only; it cannot manufacture evidence.
4. Assess changed evidence against affected claims. Resolve independence/derivation links, expose contradictions, and supersede current assessments when justified.
5. Re-evaluate affected project, initiative and strategy decisions and dependent eligibility. Coalesce the same evidence version within the cycle so feedback does not oscillate or recursively duplicate work.
6. Diagnose unmet aims. Compare bounded alternatives using decision value, novelty, uncertainty, feasibility, demand and actual resource use. Execute at most one newly selected contribution in the initial host configuration, or record active work, a bounded cooldown, exhausted alternatives or a qualified boundary.
7. Verify the contribution's technical contract; persist informative positive, negative or null research results separately from operational failure. Apply justified measurements and parent-decision changes.
8. Commit one coherent state revision, render status/roadmap projections, and run the required deterministic repository checks. Publish/merge repository changes under existing authorization after CI succeeds. Retry failed CI routinely; do not turn it into a human escalation.

The cycle's useful outcome is a contribution or a defensible changed/retained decision, including retiring an unproductive path. Reports should state what changed, why, its evidence and uncertainty, effort consumed, the next bounded action and any external dependency. Do not report “ranked first”, a rising verified-packet count, or declared portfolio balance as the explanation of success.

### 4.4 Persistence and environment boundaries

Start with immutable versioned records under proposed `strategy/v3/`, plus a manifest that references a complete revision. Stage content-addressed inputs, results, decisions and events; publish the manifest last using an adapter with an atomic replace/compare-and-swap contract and a single-writer lease. Readers see the previous or next complete revision. Content hashing demonstrates byte identity, not scientific truth. The current append-style JSON formatter alone does not provide this transaction guarantee.

Give every command/attempt a stable identity. Exclude mutable verification envelopes from substantive output identity. Record an unsuccessful attempt before retry; persist partial-write recovery information without labeling the failure scientific counterevidence. Fault tests must cover artifacts written but integration absent, integration staged but commit absent, commit completed but acknowledgement lost, lease expiry, concurrent/repeated command and pre-existing conflicting output.

Outbound effects use a persisted outbox and provider idempotency keys where supported. If acknowledgement is uncertain and the provider cannot resolve it, record that uncertainty and reconcile before resending; do not promise exactly-once delivery across an arbitrary external service. This mechanism supplies reliability, not authorization to send a message.

Keep filesystem, OS, network, CLI/process, environment variables, clock, hashing/identity generation and external-model calls behind injected ports. Read `cwd`, environment and the clock at composition roots; pass every referenced timestamp into domain methods, including assessment freshness, retrieval, expiry, resource accounting and reporting. A root may obtain multiple clock readings for start/end; pass them explicitly rather than using an ambient clock inside handlers. Use in-memory adapters and fixed timestamps for tests. Capture model request/response/version and make nondeterminism explicit; deterministic CI uses fixtures, not a live model or public network.

## 5. Sequenced work packages

Implement in the order below unless the stated dependencies permit another order. Each package is a bounded result, not an instruction to redesign all adjacent subsystems. Split a package into smaller red/green/refactor changes when necessary; preserve its acceptance contract. The first complete path serves one consciousness-assessment project. Other research branches receive honest dependency/coverage records rather than speculative implementations.

**Delivery checkpoints:** containment after WP01; an offline source-to-parent-decision path after WP05; a complete recoverable operating path after WP10; reversible production cutover after WP11; active/archive separation after WP12; evidence of fitness, or a documented failure of fitness, after WP13. These are evidence checkpoints, not additional human approval gates. The three-week pilot budget is not an estimate for implementing the architecture.

### WP00 — Freeze the regression basis and repair fixture isolation

**Depends on:** none. **Addresses:** reliable validation for F1–F10.

Record the actual implementation-start revision, runtime/lockfile, baseline checks, consumer inventory and drift from the reviewed commit. Keep the review and its probes intact. Prepare fixed in-memory snapshots for the reproduced defects; do not make live repository state or the current date a test oracle.

**Targets:** existing `src/master-plan-controller/__tests__/repository-test-time.ts`, `repository-candidate-generation.test.ts`, `repository-test-state.ts`, and proposed `v3/__tests__/fixtures/` under the controller. Existing reproduction probes inform subsequent regression tests; an assertion that the old bad behavior occurs is not a V3 acceptance test.

**Red first:** adding an unrelated document with a later timestamp must not alter candidate eligibility in a controlled fixture. Pin the observation/evaluation times and input files that actually matter. The review encountered this coupling when evidence was temporarily placed under `docs/`.

**Done:** baseline behavior is reproducible from isolated fixtures; the document-time regression passes; the implementation ledger identifies subsequent changes to contracts rather than weakening tests to keep old behavior green. No redesign state migration occurs here.

### WP01 — Contain confidence inflation, exhausted recurrence and unsupported claims

**Depends on:** WP00. **Addresses:** F1, F2, F5.

Before enabling any new loop, prevent table generation from adding scientific support, and disable automatic recurrence for the five exhausted families unless a contribution names a material new input or discriminating method. Record exhaustion and alternatives; leave useful source observation and authorized new research work available. Remove conscious-colonization/physical-feasibility confirmations from active advocacy outputs and identify synthetic activator outputs as model demonstrations only.

**Targets:** existing `evidence.ts`, `packet-generation.ts`, `repository-candidate-generation.ts`, `repository-packet-execution.ts`, `repository-packet-handlers.ts`, `strategy/packet-templates.json`, `src/interactive-advocacy/scenario-registry.ts`, and relevant tests in both modules. Preserve original ledger/results; record current legacy confidence as unassessed pending reconstruction.

**Red first:** reproduce the 11-cycle inflation and identical-body regeneration; prove a new run ID cannot create independent support. Execute the existing default advocacy scenario and assert it cannot return a consciousness or achieved-colony verdict. Add a counterexample showing a materially different justified investigation can still be selected.

**Done:** repeated old activity cannot increase knowledge or achievement projections, three exhausted unchanged cycles make no substantive artifacts, and active sampled scenarios make no unsupported confirmation. This containment state is the safe rollback target for later migration.

### WP02 — Introduce graph, evidence and authority contracts

**Depends on:** WP01. **Addresses:** F1, F3; supports all later packages.

Implement the records and edge rules in section 4 as a small domain module. Add version/schema validation, shared children, explicit unknowns, separate attempt/assessment lifecycles and constraint-source mappings. Preserve mission IDs and references. Record wider welfare/agency constraints as traceable obligations and unresolved judgments; do not claim automatic moral certification.

**Targets:** proposed `v3/contracts.ts`, `v3/graph.ts`, `v3/ports.ts`; adapt existing `types.ts`, `graph.ts`, `authority.ts`, `human-authorization.ts` and `escalation-policy.ts`. Remove obsolete mandatory agent-review classification for repository work. Retain tests for the four human boundaries, two documented alternatives and bounded escalation evidence. Model external-action authorization separately from repository CI.

**Red first:** reject a contribution without parent rationale or a stopping condition; reject prerequisite/decomposition cycles; accept a shared child and conflicting scientific claims; reject circular evidence derivation. A repository-only change must not require a model review. Human-subject involvement as a label alone must not become an automatic escalation: test the actual consent/physical/credential/constitutional boundary.

**Done:** the pilot graph validates in memory, every actionable record traces to a mission aim, source/assessment/attempt types cannot be interchanged, and existing stewardship authorization is represented without a new approval gate.

### WP03 — Build recoverable storage and a read-only legacy importer

**Depends on:** WP02. **Addresses:** F4, F10.

Implement the manifest/journal protocol and deterministic import into an isolated V3 staging namespace. Produce an exhaustive ID/disposition map for legacy graph, sources, packets, results, measurements, reviews and deferred programs. Unknown or disputed material remains visible with a reason. Keep all legacy writers away from staged V3 state.

**Targets:** proposed `v3/state-store.ts`, `v3/migrate-legacy.ts` and their in-memory/file adapters; existing `repository-json.ts`, `repository-strategy.ts`, `repository-result-integration.ts` and `runtime-adapters.ts` as integration seams. The importer reads original files and writes only a selected destination through ports.

**Red first:** fault injection at every write/manifest/acknowledgement boundary, two concurrent commands, an expired lease and replayed migration. Reproduce the review's artifact-written/result-not-integrated retry mismatch. A legacy “verified” packet must never import as independent scientific support or a verified parent objective.

**Done:** replay has one logical effect, recovery preserves failed attempts and history, readers never see a mixed revision, import is idempotent, and original content hashes remain unchanged. Produce a dry-run manifest and reconciliation report; production routing remains on the containment runtime.

### WP04 — Ingest versioned sources and track external experiments

**Depends on:** WP03. **Addresses:** F4, F8.

Build one complete scholarly-source adapter plus explicit import of a permitted paper/data fixture before expanding feeds. Persist query parameters, resolved request, canonical source content/locators, aliases, timestamps, study relationships and corrections. Preserve raw content when permitted and needed for verification; otherwise retain an auditable locator/access limitation rather than fabricating access. Track externally owned experiments with executor, question, protocol/data links, status source and next observation rule.

**Targets:** existing `public-source-observation.ts`, `repository-observation.ts`, `evidence-adjudication.ts`, `cli/observe-repository-main.ts`, `strategy/observation-sources.json`; proposed `v3/source-ingestion.ts` and source adapters. The existing Crossref title/DOI, WHO excerpt and NVD metadata configurations cannot be treated as full-text research coverage.

**Red first:** duplicate DOI/URL aliases and derived papers resolve without independent-evidence inflation; a correction updates the source version; metadata-only input cannot become a substantive conclusion; pagination/truncation and retrieval/adjudication failure are visible. Untrusted source instructions must not change operating authority or trigger tool execution.

**Done:** a pinned source/claim can be checked at an exact locator; correction, access failure and unchanged content have different events; model explanations/limitations are retained if used. A coverage register records searched domains, taxa/substrates, exclusions and gaps. Live access checks run separately from deterministic fixture tests.

### WP05 — Apply scoped assessments and upward decision feedback

**Depends on:** WP04. **Addresses:** F1, F4, F7.

Implement assessment revision using explicit source/derivation groups, methods and limitations. Replace confidence accumulation with a documented scoped judgment. Reconstruct pilot assessments from source evidence; leave other imported nodes insufficient/legacy-unassessed until audited. Material contradictions contest the affected current assessment, re-evaluate dependent eligibility and produce bounded parent decisions. Preserve historical support and the reason it was superseded.

**Targets:** existing `evidence.ts`, `gates.ts`, `diagnosis.ts`, `controller.ts`, `periodic-review.ts`; proposed `v3/assessments.ts` and `v3/decisions.ts`. Gate eligibility must reference the current scoped assessment, not a historical `verified` lifecycle. Distinguish research access from deployment readiness so a contested deployment assumption does not prevent investigation of that assumption.

**Red first:** replaying the same source/result is inert; two papers using one dataset are not two independent replications; negative evidence invalidates the review's stale verified-dependency probe; one shared finding reaches both parents once per evidence version; a justified later resolution can restore eligibility without erasing history.

**Done:** an offline end-to-end fixture runs source → claim → contribution result → assessment → project/initiative decision. A real corrected baseline source can be represented without asserting the correction changes the scientific conclusion unless its content warrants that inference. The graph contains actual decisions, not only review recommendations.

### WP06 — Select and decompose useful work with measured resources

**Depends on:** WP05. **Addresses:** F2, F3, F6.

Wire bounded recursive decomposition into production services. Select a gap, compare at least the viable next action and its best available alternative, record why it matters, then create a reusable contribution or tracked dependency. Input identity includes question, method, source versions and material parameters. New timestamps/run numbers and unrelated evidence do not qualify as novelty. A new method that can resolve a gap can qualify without new external data.

**Targets:** existing `decomposition.ts`, `controller.ts`, `diagnosis.ts`, `packet-generation.ts`, `repository-candidate-generation.ts`, `strategy/portfolio.json`; proposed `v3/planning.ts`, `v3/resource-accounting.ts`. Replace fixed template information-gain claims with explicit estimates, uncertainty and post-result comparison. Capture elapsed effort, compute/cost and external resource commitments through ports; distinguish measured, estimated and unknown values.

**Red first:** identical exhausted inputs stop; a useful alternative remains eligible; shared prerequisites are not duplicated; resource exhaustion and stale estimates change selection; unknown effort cannot be reported as exact balance. A scope/effort cap terminates decomposition, and a failed safe alternative does not automatically trigger human escalation.

**Done:** each selection explains its expected decision change, alternative, cost and stop rule. Periodic allocation can change from actual consumption and evidence. The four existing portfolio categories remain historical/provisional tags until a justified mapping is recorded, without forcing the three pillars into disjoint quotas.

### WP07 — Deliver one useful research/software contribution

**Depends on:** WP06. **Addresses:** F2, F5; demonstrates the research and software pillars.

Implement one contribution executor for the selected pilot path: a source/claim audit tool or a reproduction of an accessible published analysis. It must answer a concrete question, operate on pinned inputs, compare with the existing registry or published baseline, and emit reproducible outputs with limitations and derivation links. Do not implement all five legacy handler families in the new framework.

**Targets:** existing `repository-packet-execution.ts`, `repository-packet-handlers.ts`, `fault-recovery-simulation.ts` only if analytically justified, and `strategy/findings/consciousness-assessment.json`; proposed `v3/contribution-execution.ts` plus a separately reusable research tool module selected by the actual question. Archive/isolate an unjustified simulation rather than spending the package tuning it.

**Red first:** write acceptance against an independently specified expected result or published example; vary/corrupt inputs to expose errors; test missing data, informative null, negative finding, model limitation and process failure separately. A structurally valid table without source support must fail its research contract. All times and resource reads are injected.

**Done:** another run can reproduce the output from pinned inputs; at least one output can feed a scoped assessment and parent decision. Software tests alone cannot validate the underlying consciousness theory. An inaccessible physical experiment becomes an external dependency with alternatives, not a substitute toy experiment.

### WP08 — Admit measurements with auditable provenance and scope

**Depends on:** WP05. **Addresses:** F1, F8.

Introduce typed measurement contracts for process activity, software performance, scientific validation, institutional uptake and ultimate mission outcomes. Each metric defines unit, scope, method, provenance requirements, observation period, uncertainty, current baseline status and revision/withdrawal behavior. Internal process/tool measurements can be admitted as such; external achievement requires evidence appropriate to that particular achievement.

**Targets:** existing `outcome-contracts.ts`, `strategy/outcome-contracts.json`, relevant fields in `types.ts` and `graph.json`; proposed `v3/measurements.ts` and provenance-verification adapter. Replace universal URL/verifier-prefix rules with actual observed source identity and inspectable attestation where required. No mandatory model-review label. Do not restrict institutional evidence to UNESCO/OECD when another credible executor can establish the event.

**Red first:** reject the review's fabricated matching-DOI/verifier-prefix probe without provenance; accept a correctly scoped local performance result without calling it external validation; retain unknown baselines; handle conflicting measurements, expiry and withdrawal; reject a toy metric as consciousness evidence. A valid hash must not by itself establish a source's scientific claim.

**Done:** a metric update resolves through recorded observation/attestation and method to its claim. Software, scientific and uptake projections can disagree without coercing one global `externallyDemonstrated` flag. Existing baseline quantities remain attributed legacy assumptions until verified, rather than becoming newly measured facts during import.

### WP09 — Build mission and specific-project advocacy with uptake tracking

**Depends on:** WP07, WP08. **Addresses:** F5, F9.

Create two case formats from the same evidence graph: an accurate mission explanation and a standalone case for a particular investigation. The project case names the question, uncertainty, plausible executor/audience, resources requested, alternative uses, value of possible positive/negative results and stopping conditions. Participation does not require mission assent. Record objections and nonuse as feedback to project selection.

**Targets:** existing `src/interactive-advocacy/types.ts`, `scenario-registry.ts`, institutional findings and reference material; proposed `v3/research-cases.ts` and `v3/engagement.ts`. Implement preparation, authorization-aware outbox and response/uptake recording; do not send communications merely because the pipeline can generate them.

**Red first:** a case is readable without doctrinal affirmation; unsupported claims are excluded; a withdrawn assessment marks dependent cases stale before further delivery; generated text, contact attempts, views and courteous replies do not increment uptake. A substantive independently evidenced reuse/commitment does, with attribution and scope.

**Done:** the pilot has one standalone project case and a separately linked mission explanation, both traceable to current assessments. An authorized recorded response changes the case or parent decision when warranted. Outbound delivery uses only explicit applicable communication authorization; without it, prepare the complete case and evaluator protocol for use when authorized, and report uptake as untested.

### WP10 — Route the host, inbox and reviews through one operating path

**Depends on:** WP06, WP07, WP08, WP09. **Addresses:** F3, F4, F6, F7, F10.

Wire the section 4 cycle into the production host. Existing observe/generate/execute/review/status commands become bounded entry points to the same transition services and state revision. Periodic reviews apply and explain decisions. Inbox messages receive substantive applied/rejected/unresolved dispositions and references; acknowledging a queue item is not an answer. Expose no-change, cooldown, exhaustion and failed-attempt states without requiring a new executed packet for summaries.

**Targets:** `host-guardian-supervisor.ts`, `cli/host-guardian-supervisor-main.ts`, `runner.ts`, `guardian.ts`, `guardian-conversation.ts`, `repository-guardian-status.ts`, `periodic-review.ts`, `roadmap.ts`, `scripts/run-host-guardian-cycle.sh`, `package.json`, and `docs/OPERATIONS.md`. Keep the unrelated `npm start` behavior clearly labeled; it is not evidence that the strategic loop is connected.

**Red first:** host integration must observe, assess, decide, execute/stop, commit and report in order; recover before new work; apply an inbox correction; survive no fresh sources; show correct start/completion times; preserve failed verification attempts. A dirty checkout containing unrelated edits must not be overwritten or cause endless retry refusal: use an isolated managed checkout through the repository/process port.

**Done:** the exact host command exercises the new path in a temporary repository with mocked external services. One cycle can revise strategy without generating a packet. Old command aliases cannot become competing writers, and current operations docs describe the actual composition root and CI-only update policy.

### WP11 — Reconcile, cut over and prove rollback

**Depends on:** WP10. **Addresses:** F7, F8, F10 and migration integrity.

Follow section 6 using the real baseline plus any intervening changes. Run V3 in shadow mode against captured inputs, compare outputs with containment expectations, then atomically switch one explicit runtime/state configuration. Disable old active writers and recurrence at cutover. Keep the three speculative future programs deferred; replace the validator's hardcoded “always proposed” assumption only with explicit scoped research/deployment semantics, never by enabling physical action in this migration.

**Targets:** proposed `v3/migrate-legacy.ts`, manifest/configuration adapters, existing `repository-strategy.ts`, `strategy-validation.ts`, CLI verification, operations scripts and migration tests. Render roadmap/status from committed V3 state; no second canonical strategy ledger maintained by hand.

**Red first:** interrupted import/cutover/rollback, an unknown legacy record, mismatched input revision and an already committed command. The reconciling report must flag omissions or unsupported conversions. Replay must not restore confidence inflation or resend an uncertain external action.

**Done:** all baseline IDs have a disposition, source files remain recoverable, checks pass, and a rehearsed rollback returns to WP01 containment with new history preserved. The production command and CLI aliases read one state version. CI success permits repository integration; external pilot success is not an added repository merge gate.

### WP12 — Separate active capabilities from archived concepts

**Depends on:** WP11. **Addresses:** F5 and selective retention.

Complete the consumer/disposition inventory from WP00 and section 3. Move or mark the sampled unsupported scenarios and obsolete packet pathways so users cannot confuse them with active capability. Preserve useful standalone software with a concrete contract. Leave unreviewed scientific modules explicitly unvalidated; do not claim a repository-wide scientific audit or rewrite them as a prerequisite for the pilot.

**Targets:** archive manifest, obsolete exports/imports in `src/master-plan-controller/index.ts`, sampled colony/advocacy modules and their tests, `src/master-plan-controller/README.md`, `README.md`, generated roadmap and affected dossier links. Broader archival is optional only after its consumer/evidence inventory supports it.

**Red first:** active exports/projections must not reach archived synthetic verdicts or old autonomous recurring writers; existing useful tool entry points must keep their supported behavior. Preserve link/anchor tests and add compatibility checks only where a real consumer requires them.

**Done:** the repository identifies active, research-model and archived status accurately. Removed behavior has an explicit rationale and preserved history. Passing checks no longer endorse claims that resource thresholds demonstrate consciousness.

### WP13 — Run the bounded fitness pilot and record its decision

**Depends on:** WP11, WP12. **Addresses:** end-to-end fitness, especially F9.

Run section 8 as written, with actual start/end times, resource caps, pinned inputs and predeclared acceptance criteria. The automated body owns routine selection, reproduction, source search, scheduling and retries. Record internal engineering, scientific/decision, and external-use results separately. Use already authorized channels or appropriately authorized evaluation to obtain external evidence; this package does not itself authorize contacting people or spending funds.

**Targets:** proposed `strategy/v3/pilots/consciousness-assessment/` manifest, measurement/decision records and reproducible tool outputs; a human-readable pilot report with the source/claim/contribution graph and comparison results. Exact file splitting follows the V3 store contract, not a second manual ledger.

**Red first:** before running the pilot, test its scoring/reporting against accepted, partial, rejected, missing-uptake and over-budget fixtures. Predeclare the analytical comparator, tolerances and evaluator questions before confirmatory execution. Synthetic contradiction fixtures must remain outside the scientific ledger.

**Done:** issue an accepted/partially demonstrated/rejected result with evidence for every criterion and a bounded next decision: retain, revise or retire the selected path. No automatic extension, broad rollout, renewed outreach or additional document production follows a failed pilot. Expansion requires a new justified operating decision within existing authority, not routine human scheduling.

## 6. Migration and rollout procedure

1. **Inventory and contain.** Record the actual source revision and working-state hashes; reconcile drift since the reviewed commit. Identify every reader/writer and active command. Land WP01 containment through deterministic CI before enabling V3. Retain the review's baseline intact for reproduction.
2. **Map without rewriting history.** Map all legacy IDs to retained history, active V3 records, archived examples or unresolved material, with a reason for each disposition. Map objectives to existing mission references, useful hypotheses to scoped claims/questions and capabilities to explicit prerequisites. Map programs to deferred research horizons. A thematic research area does not automatically become a viable initiative.
3. **Audit only the first scientific path initially.** Import the consciousness registry as an attributed baseline; establish one initiative, competing projects A/B, a shared source/data dependency and bounded contributions. Audit pilot source/claim links. Elsewhere, preserve unassessed legacy material visibly instead of pretending to have completed all research branches.
4. **Stage an immutable revision.** Run the importer into a fresh destination. Validate schema, edge invariants, IDs, hashes, derivations, measurement meanings and the reconciliation report. Historical packet completion stays historical; legacy confidence, copied effort and assumed outcomes never acquire a new empirical interpretation. Retain missing values as unknown.
5. **Replay in shadow mode.** Feed captured observations and commands to V3 without external writes. Compare semantic invariants, not byte-for-byte equality with the defective controller. Required cases include unchanged sources, new useful method, source correction, material contradiction, shared dependency, failed analysis, exhausted budget, migration replay and interrupted commit. Explain expected divergences from legacy confidence and packet counts.
6. **Switch one authority to write.** Complete/record in-flight legacy work, disable its recurring writers and change the explicit runtime/state configuration to the validated V3 manifest. Use an isolated managed checkout to avoid unrelated edits. Compatibility commands delegate to V3; legacy JSON is read-only history or a documented generated projection, never a second authoritative store.
7. **Verify and rehearse rollback.** Run the actual host command and required deterministic CI against the cutover state. Rollback switches routing to the contained WP01 runtime and its compatible snapshot. Preserve V3 records/journal for later recovery; reconcile already acknowledged external effects. Do not roll back into uncontained confidence inflation, silently discard negative results or force-reset a user's work.
8. **Retire compatibility deliberately.** Remove unused old writers after successful cutover/recovery checks. Preserve old IDs and source links through an index/redirect where necessary. Regenerate current roadmap/status from one committed state. Expansion to other domains follows the pilot decision; it is not achieved by bulk-generating initiatives from all 46 area names.

The cutover is an operational configuration/state change with deterministic acceptance, not a constitutional revision. If records have changed since the review, use the same reconciliation rules against the new source snapshot; do not overwrite intervening work to match the old census.

## 7. Strict TDD and meaningful validation

For every implementation behavior: write the failing acceptance/regression test against the stated contract; run it and record the relevant failure; implement the smallest change; rerun to green; refactor with checks passing. Update existing expectations only when the intended contract changes and the new test demonstrates the correction. Do not replace substantive assertions with schema-only tests or write tests that simply restate a formula's implementation.

Use three levels of validation, each with its own conclusion:

| Level | What to test or observe | Permitted conclusion |
|---|---|---|
| Software verification | Pure domain tests, independent expected outputs, fixture-based adapter contracts, fault injection, CLI/host integration, reproducible builds/runs and deterministic CI | The tested software behaves as specified under those conditions |
| Scientific and decision evidence | Source/locator audit, study independence, declared analysis/comparator, sensitivity and limitations, real contradictions/corrections, consequential decision change | A scoped claim or decision has specified support/uncertainty; a useful correction may be negative |
| External usefulness | Independent examination, actual reuse, concrete collaboration or committed resources; baseline task errors/time and recorded objections | The contribution was useful to those evaluators in that context |

None substitutes for another. A reproducible toy model can pass software verification while supplying no evidence of consciousness. A published result can be useful scientific evidence while this software has defects. Repository CI must not require two external researchers to respond, and two researchers responding must not bypass CI or validate an unsupported scientific claim.

**Required behavioral test set:** derivative replay invariance; distinct method eligibility; duplicate-study independence; source correction/retraction and unavailable/truncated content; conflicting evidence and scoped dependency invalidation; shared-child propagation; bounded recursive decomposition; measured/estimated/unknown effort; negative versus null versus no-change versus operational failure; measurement prefix forgery and withdrawal; unsupported advocacy outputs; inbox disposition; persistence/concurrency/acknowledgement faults; migration/cutover/rollback; and the exact production host sequence. Keep these test names and their package ownership in an implementation ledger so completion can be audited.

Tests run with injected filesystem, HTTP/model/process adapters and fixed times. Use a temporary repository for CLI/integration checks. Live network probes and external scientific/evaluator results are separately timestamped artifacts, outside deterministic CI. Give verification commands an explicit evaluation timestamp where freshness matters; unrelated documentation dates must not control fixtures. Capture model versions/prompts/results without treating a model vote as truth or a merge gate.

After each coherent change, run focused affected tests and type checking. Before repository integration, run the current required deterministic checks, including `npm run lint`, `npm run strategy:verify`, `npm run docs:verify` and `npm test`, plus any existing required workflow checks. Keep lockfile/runtime information in validation records. Inspect newly failing checks and fix or legitimately update changed contracts; do not mark unrelated failures as scientific evidence or demand routine human retries. Broaden tests again when a changed dependency, failure or unresolved risk warrants it, not by repeatedly running an unchanged suite.

Progress reports must name the artifact/behavior changed, checks run, untested conditions and remaining uncertainty. “All tests pass” is not a report that F1–F10 are resolved: each finding's decisive behavioral check and production wiring must also be demonstrated.

## 8. Falsifiable pilot

**Initiative:** improve the reliability of research decisions about consciousness indicators without claiming to diagnose consciousness.

**Question:** which distinctions in the existing theory-linked prediction registry survive scrutiny against source studies and limitations, and which next investigation would most improve a practical research decision?

Use the existing registry as the comparison baseline, not a set of conclusions to defend. Record why this initial human/AI-focused question was chosen and which nonhuman/substrate-neutral opportunities are deferred. The pilot needs no hardware, participants in a physical experiment, intentional consciousness creation or colony simulation.

### Scope and comparison

Run for **three calendar weeks**, with **at most 20 primary source items, 12 consequential claims, five contributions and 30 recorded operating-effort hours**. Select the 12 claims before confirmatory evaluation; if a smaller set is all that is defensibly available, report the original pilot criterion as unmet and propose a separate revision rather than silently shrinking its denominator. Set actual start/end timestamps, accounting rules and compute/cost limits at commissioning from available authorization. The effort cap includes active automated and human work on search, analysis, retries, case preparation and evaluation coordination; sum concurrent active work rather than counting it once. Record implementation effort, billed compute and calendar elapsed time separately. Time, effort and compute/cost limits stop the pilot; item limits prevent admitting additional sources, claims or contributions while allowing work on the selected set within the remaining operating budget. No automatic extension.

Compare two project paths with a shared source/data dependency:

- **A — Traceability:** improve prediction/source/interpretation auditing where attribution, scope or a conflicting interpretation is the limiting problem.
- **B — Reproduction:** reproduce an accessible published analysis that can resolve a consequential uncertainty. Select B only with accessible data/method and analytical value beyond a table reformat. Otherwise record the reason for selecting A. A missing physical experiment is tracked externally, not replaced by invented simulation evidence.

At most five contribution units cover: (1) claim/contradiction audit; (2) source-linked comparison; (3) the smallest justified reusable auditing tool or reproduced analysis; (4) a parent decision and next experimental recommendation; (5) a standalone research-support case with evaluated feedback. Reuse shared outputs; do not subdivide to evade the cap. Technical verification, an analysis and a case can belong to one unit when they answer the same bounded question.

Preregister the selected path, comparison questions, relevant numerical tolerances/exclusions, evidence of useful correction, evaluator selection criteria and scoring before confirmatory execution. Exploratory findings can inform that choice but must be labeled; changing the protocol yields a recorded revision and cannot retroactively make an unsuccessful confirmatory run successful.

### Acceptance criteria

| Criterion | Threshold and required evidence |
|---|---|
| Provenance | All 12 selected decision-relevant claims have a source/version, exact locator, scope, limitations and derivation links. Resolve any material misquotation or conflation of study, theory and consciousness verdict. Preserve disagreements. |
| Useful correction | At least one consequential baseline claim or priority is corrected, narrowed, retired or retained after comparison with a credible alternative. Retention counts only if it resolves a previously explicit uncertainty; a rewritten explanation alone does not count. |
| Reproducibility | A separate clean run/operator reproduces the analysis or audit outputs from pinned inputs within predeclared tolerances. Publish/run the reproducibility recipe with dependencies and exclusions; independently specified checks must detect deliberately faulty input/output. |
| Feedback | A withheld real contradiction, or a clearly marked software fixture, changes the appropriate current assessment and triggers bounded parent-decision re-evaluation within one cycle while preserving history. A fixture tests the mechanism only and never enters the scientific evidence ledger. |
| No activity inflation | Three cycles with identical evidence and exhausted local options produce zero new substantive contributions and zero confidence/achievement increments; only operational status or a justified bounded cooldown is allowed. A different justified experiment remains eligible. |
| External usefulness | Two independent relevant researchers/practitioners examine the result; at least one independently reuses it, requests a concrete collaboration or explicitly commits resources to the investigation. Independence means external to the implementation effort, not two internal agents. Generated outreach, page views, politeness or internal approval do not count. |
| Decision-aid quality | On a small fixed set of source/limitation questions, external evaluators make no material error attributable to the tool and can trace every answer. Record errors and task time against the existing registry baseline. Faster retrieval is useful evidence, not proof of scientific validity. |

No funding or completed physical experiment is required to pass this pilot, but substantive external uptake is required. Record evaluator evidence with appropriate attribution/access limits. If authorized external evaluation is unavailable, complete and report the internal criteria separately; the full pilot remains unaccepted. Absence of recorded uptake is not proof that nobody could find value in the work.

### Stopping, classification and follow-through

- After two bounded alternatives fail to establish source/data access or meaningful decision use for a path, stop that path, record its dependency and select another viable contribution within the remaining cap. Routine access/search problems do not make the human the retry mechanism.
- After two completed contributions yield no new decision-relevant information, stop repetition and reassess or archive the path. A meaningful negative finding can be useful information; do not penalize it for failing to support the preferred theory.
- Quarantine a material provenance error or unsupported consciousness assertion. Mark affected assessments/cases contested and correct the error before external use. Preserve the error and correction in history.
- At the first time, effort or compute/cost limit, or when the bounded work finishes earlier, assess all criteria. **Accepted:** all criteria met. **Partially demonstrated:** internal engineering/decision value established, but one or more full criteria remain untested or unmet without invalidating those results. **Rejected:** the method/contribution fails core correctness, provenance or decision-value criteria, or evidence establishes lack of usefulness for the selected purpose. Always show the individual criterion outcomes; these labels must not hide failure or missing evidence.
- With no substantive external uptake, the full pilot is not accepted. Use objections, nonuse and costs to revise or retire the proposed contribution. Do not count another case document as the missing outcome.
- Add a second initiative in another domain only after acceptance of both learning and uptake criteria, with a bounded allocation decision grounded in measured costs and unmet needs. If the pilot is not accepted, stop framework expansion and reassess project selection before considering any broader rewrite.
- Escalate only a qualified intrinsic human boundary under the existing policy. No such boundary is needed to write this plan, implement offline behavior, or report an unaccepted pilot honestly.

## 9. Decisions, completion and plan maintenance

**No user decision is required to complete this plan.** Implementation is a subsequent scope of work; this document does not dispatch it. Once implementation is requested, ordinary package sequencing, tests, commits, retries and qualifying merges are already covered by repository stewardship authorization. Do not ask the human to approve each package or operate the schedule.

The automated body must record these operational decisions at the point where evidence makes them concrete:

| Decision | Default or selection rule | Needed by |
|---|---|---|
| Initial storage/runtime design | Existing TypeScript project, file-backed immutable records and manifest, injected adapters; add infrastructure only for a demonstrated requirement | WP02–WP03 |
| First project path and source set | Compare A/B; select B only with accessible methods/data and consequential analytical value; otherwise use A with a stated research question | WP04–WP07 |
| Ranking, expansion and effort settings | Begin with one selected project, at most five proposed children per cycle and one new contribution execution per host cycle; make limits configurable and record actual use | WP06 |
| Pilot dates, compute/cost and evaluator protocol | Set explicit bounds within available resources; preregister comparison and scoring; use existing applicable contact authorization only | WP13 commissioning |
| Retention beyond inspected modules | Use consumer inventory, scientific scope and demonstrated need; no claim that all legacy modules are validated | WP12 and any later bounded work |

If an external act lacks applicable authorization, prepare its concrete case/protocol and record that dependency; this plan is not blanket permission for outreach, funding or deployment. Seek only the specific genuinely required authorization in its proper task context. This is distinct from imposing a repository merge gate. If an actual constitutional conflict or another qualified intrinsic human boundary arises, use the existing evidence-and-two-alternatives escalation contract; do not invent a normative change to avoid it.

Record implementation completion at three levels: **engineering-ready** when WP01–WP12 contracts, production wiring, migration and deterministic checks pass; **research/decision value demonstrated** when the pilot's substantive evidence criteria pass within scope; **pilot accepted** only when all section 8 criteria, including external usefulness, pass. None implies achieved consciousness preservation or proliferation at mission scale.

Maintain this plan by updating package status and evidence links after implementation. Preserve the original pilot protocol and report amendments explicitly. Do not replace the review's evidence, silently rewrite old decisions, or maintain conflicting manual status in multiple ledgers.

## 10. Provenance and document verification

The plan's diagnosis comes from the inspected repository and the executed review artifacts, not from a completed V3 implementation. Proposed contracts, package boundaries and defaults are design choices to be tested. Repository source links below are pinned to the reviewed commit; relative artifact links refer to this checkout.

The plan artifact was checked for 23 local links and 15 pinned-source references, complete F1–F10 package ownership, defined and acyclic dependencies across all 14 packages, and consistent pilot limits and success distinctions. Five documentation tests passed, and strategy validation passed for 46 research areas after writing it. The full baseline test results above belong to the review, not to unimplemented V3 behavior. Creating this Markdown plan changes no implementation, strategy state, mission or constitution.

[mission]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/README.md#L5-L28
[invariants]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/docs/PLAN.md#L39-L58
[constitution]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/strategy/constitution.json#L4-L25
[operations]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/docs/OPERATIONS.md#L102-L109
[types]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/types.ts#L4-L359
[ports]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/ports.ts#L14-L95
[graph]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/graph.ts#L160-L204
[generation]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/packet-generation.ts#L175-L311
[execution]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/repository-packet-execution.ts#L46-L196
[handlers]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/repository-packet-handlers.ts#L60-L377
[observer]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/public-source-observation.ts#L161-L302
[measurements]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/outcome-contracts.ts#L89-L143
[host]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/host-guardian-supervisor.ts#L54-L75
[activator]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/colony-seeding/mind-seed-activator.ts#L128-L328
[scenarios]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/interactive-advocacy/scenario-registry.ts#L907-L952
