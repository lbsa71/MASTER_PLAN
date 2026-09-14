# MASTER_PLAN fitness-for-purpose review

**Review date:** 14 September 2026. **Reviewed commit:** 5bcbb29a5da37053a046d6bf8bc0b020da9aebf2. **Scope:** architecture, representative behavior, persisted results, scientific claim boundaries, and transition design. This is a review, not approval or implementation of a redesign. No mission, constitution, strategy state, or implementation was changed.

## Recommendation

**Redesign the execution and evidence layer, selectively retaining the repository's useful foundations. Do not replace the whole project, and do not treat incremental repair of the five recurring packet families as sufficient.**

The mission and the main documents are substantially aligned with the clarified purpose. The repository also contains a useful research baseline, modular interfaces, deterministic tests, and explicit distinctions between artifacts and external outcomes. Those are valuable assets. The operating system built around them does not yet function as a continuously learning research and contribution program. Its dominant demonstrated behavior is recurring transformation of its own records. Some of that activity actively increases scientific confidence without new scientific evidence.

The strongest evidence is behavioral, not the absence of desirable names in a schema:

- The checked-in state contains **90 verified packets in five families and 90 result files**. None contains a metric measurement; the corresponding audit events record no metric updates.
- The **17 indicator comparison artifacts have identical substantive content** after removing identity and preparation time. Nevertheless, all 17 are positive evidence supporting the hypothesis that theory-derived indicators improve calibrated AI-consciousness assessment. That hypothesis has confidence **0.989029**, while its independently validated indicator count is **0**.
- The **19 preservation refreshes** and **18 institutional refreshes** each have one distinct substantive body. The 19 mitigation “tabletops” rotate over ten prewritten risks. The 17 durable-compute extensions vary an arithmetic delay, with no observed failure-to-strategy feedback.
- An isolated replay of eleven additional repository cycles, with no external inputs, produced eleven more verified results, raised indicator confidence to **0.992533**, and left empirical validation and recorded portfolio effort unchanged.
- A separate advocacy scenario converts passing resource thresholds into a claim that a reproducible conscious-colonization pipeline is confirmed. This is an actual returned string, despite the much more careful main documentation.

These results and the controlled probes are recorded in [evidence.json](evidence.json), with an executed [read-only reproduction recipe](reproduce.md). They describe the reviewed checkout, not all historical work or unobserved external activity.

## 1. Fitness criteria: the intended architecture

### Mission and scope

The beneficiary is **subjective consciousness or experience, regardless of species or substrate**. Humanity can supply evidence, institutions, and capabilities; it is not the moral endpoint. Preservation and responsible proliferation remain constrained by welfare, agency, continuity, coexistence, and uncertainty. Population, uptime, resource scale, and ideological agreement are not substitutes for valuable experience.

The repository should aggregate and assess experiments and knowledge produced in the world; retain research disagreements and negative findings; identify missing evidence; propose discriminating investigations; and argue why particular contributions or research projects deserve effort. It does **not** conduct physical or hardware experiments. It can produce reproducible analyses, useful software, and computational experiments whose assumptions, comparisons, and decision value are explicit. A hardware simulation is useful only when it answers a concrete analytical question; simulation code is not automatically research progress.

### Three connected pillars

| Pillar | Useful output | Evidence of success |
|---|---|---|
| Knowledge synthesis and research | Source-grounded claims, contradictions, research maps, proposed discriminating experiments | Better-supported decisions; discovered errors or gaps; independent reuse or correction |
| Software contributions | Reproducible analyses, evaluation tools, reusable methods, justified computational experiments | Reproduction, performance against a relevant baseline, adoption or integration by an external user |
| Advocacy | Accurate mission communication and evidence-based cases for particular research allocations | Qualified engagement, collaboration, adoption, committed resources, or funding; documented objections that revise the case |

A supporter must be able to support a particular investigation without endorsing the entire mission. These pillars should share evidence and project identities. They are **not** mutually exclusive budget buckets: a project can require a synthesis, a software tool, and a resource-allocation case.

### Recursive planning with graph dependencies

~~~mermaid
flowchart TD
    M[Mission and constitutional constraints] --> S[Strategic choices and allocation]
    S --> I[Research initiatives]
    I --> P[Projects and questions]
    P --> C[Actionable contributions]
    P --> X[External experiments and unresolved dependencies]
    C --> K[Evidence and decision records]
    X --> K
    K --> P
    K --> I
    K --> S
    P -. shared prerequisite .-> P2[Another project]
~~~

Every initiative, project/question, and contribution should state:

1. What it aims to establish, improve, or decide, including what would disconfirm its value.
2. Why that result matters to one or more parent goals, with the causal argument and assumptions exposed.
3. The relevant evidence, provenance, competing interpretations, limitations, and unresolved contradictions.
4. The missing evidence, dependencies, and best next contributions, including external experiments to track.
5. Its current disposition, resource bound, comparison with alternatives, and stopping or revision conditions.

Decomposition stops at an executable contribution, a specific externally owned experiment to observe, or an explicit unresolved dependency. A contribution is not required to create another planning document. Dependencies form a graph; one study or software package can serve multiple projects. Evidence travels upward through explicit claim and decision links, changing priorities or retiring weak paths. Historical decisions remain immutable, but the current decision can be superseded.

This does not require a grand universal planner, a particular graph database, or a new agent hierarchy. A small versioned schema and clear state transitions can implement the essential contract. The operating body should perform routine execution, retries, and integration. Deterministic CI remains the repository update gate. Scientific evidential standards and external participation must not be confused with an additional model-review or human merge gate.

## 2. What is already aligned and worth retaining

The preliminary favorable observations were verified. [README.md:5–28][readme] explicitly centers experience, not species or technology, and rejects artifact-to-outcome inference. [PLAN.md:39–58][plan-invariants] preserves uncertainty, negative evidence, welfare, agency, and contestable power. [PLAN.md:173–196][plan-failure] names failure modes including coercive preservation, institutional capture, and rejection of propagation by artificial moral patients. These are substantive constraints, not incidental prose.

The controller has useful engineering seams: explicit timestamps; filesystem, network, process, state, executor, and reviewer ports; graph validation; structured packet bounds; audit events; and deterministic tests. [ports.ts:14–95][ports], [graph.ts:160–204][graph-validation], and [types.ts:175–201][packet-type] provide components worth adapting. The full test suite passes at the reviewed baseline: **235 files, 4,823 passing tests, seven todo**. Passing tests establish behavior under those tests, not scientific validity.

The consciousness baseline is materially more useful than a bare citation list. It contains source identities, publication and access dates, theory-specific limitations, confounders, competing interpretations, measurement proposals, and explicit forbidden inferences. It is a promising seed for the desired research system. Its own ledger correctly says it is **not a completed preregistration**. [consciousness-assessment.json:9–105,176–230][research-baseline]; [evidence.json:82–100][baseline-evidence].

External metric contracts correctly prevent the ordinary local handlers from automatically incrementing real-world achievements. Long-horizon programs remain proposed. The reference dossiers explicitly call the space modules speculative and describe toy thresholds. These safeguards materially limit the present overclaim; they do not close the confidence and advocacy gaps below. [outcome-contracts.json:2–22][contracts]; [space-and-longevity.md:89–109][space-caveats].

### Constitutional compatibility and actual tensions

No mission amendment is required by the clarified intent. Preservation priority, substrate neutrality, welfare precaution, optional creation, and legitimate agency are compatible with **responsible** proliferation. “Creation is optional” means a project need not create experience when an effective non-conscious alternative exists; it need not mean abandoning G2. If obligatory creation or expansion regardless of welfare were intended, that would be a real normative conflict, but it was not requested.

There are implementation and scope tensions to address without silently changing values:

- The main plan contains richer welfare and coexistence constraints than the five strings in the machine constitution. The controller cannot be assumed to enforce the full moral framework merely because it validates that file. [constitution.json:4–9][constitution]; [PLAN.md:39–58][plan-invariants].
- Current research is mainly human consciousness and AI, and the preservation map focuses heavily on human institutions and civilization. That can be a justified initial selection, but explicit nonhuman-animal and other-substrate coverage, evidence gaps, and opportunity costs are needed. The three configured public sources do not establish substrate-neutral coverage. [observation-sources.json:9–65][observation-config].
- G3's critical, voluntary transmission is compatible with the mission. Treating doctrine transmission as an end independent of beneficial research, or presenting speculative engineering as confirmed to promote it, is not. The advocacy implementation exhibits the latter tension.
- Some historical records and current reference prose still describe protected-change agent review, while current instructions and operations require deterministic CI only. Preserve historical records as history; make current contracts consistent. Do not reinstate a review classifier to resolve this documentation drift. [constitution.json:11–25][constitution]; [institutions-and-transmission.md:100–109][institution-doc]; [OPERATIONS.md:102–109][operations-policy].

## 3. Execution and state: what actually happens

There are distinct operating paths. The generic CycleRunner observes external data, integrates evidence, diagnoses, generates, activates, executes, reviews, and saves. It also has recovery and negative-result handling. However, a source search found **no production construction of CycleRunner or Guardian**; their constructors are used in tests, while the current scheduled path is the host supervisor. The decomposition function likewise has test callers but no operating-path caller. [runner.ts:68–186][runner]; [decomposition.ts:22–65][decomposition].

The host supervisor invokes a Codex pass limited to docs/ and strategy/, then strategy:generate, strategy:execute, verification commands, and a summary. Its deterministic command sequence calls **neither strategy:observe nor strategy:review**, and its generic Codex prompt does not require evidence ingestion, an initiative-bound decision, or inbox consumption. The prompt permits no change if there is no material improvement, but the following deterministic generation step can still fill a repetitive backlog. [host-guardian-supervisor.ts:54–75][host]. The separate npm start launches the cognitive agent runtime, not the strategic controller. [package.json:7–29][package]; [agent-runtime/main.ts:5–24][runtime-entry].

The checked-in ledger contains 99 evidence records: 24 positive, one negative, and 74 null. Four source fields are external HTTPS URLs, all baseline records from 3–4 August; 95 point locally. **This is not a count of all cited publications**: consolidated findings contain additional sources. There are no public-snapshot or adjudicated-snapshot records in this baseline, no superseding assessments, and one weekly review. The absence of those records does not prove that no host ever fetched a source. It does mean the promised ongoing observation-to-learning loop is not demonstrated by persisted state.

| Executed family | Verified runs | Distinct substantive artifact bodies | Actual computation |
|---|---:|---:|---|
| Indicator comparison | 17 | 1 | Reformat registered interpretations into a table |
| Preservation register refresh | 19 | 1 | Copy the baseline with unchanged ranks |
| Institutional dependency refresh | 18 | 1 | Copy the baseline with unchanged dependencies |
| Mitigation tabletop | 19 | 10 | Select a risk by run-number modulo ten; copy its first indicator and response |
| Durable-compute extension | 17 | 17 | Add a run-number-derived delay to four baseline recovery values |

The distinct-body calculation removes artifact identity, packet identity, preparation time, and the tabletop selection/run-index wrapper, while retaining findings. Thus 60 of 90 artifacts duplicate an earlier substantive body under that explicit normalization. Numerical variation in the remaining artifacts is not by itself evidence of learning.

## 4. Prioritized findings

**Priority convention:** P1 materially prevents trustworthy operation for the stated purpose; P2 materially degrades learning, reliability, or usefulness. No finding here alleges demonstrated real-world creation of consciousness or harm. “Observed” below means repository state or reproduced software behavior, not external scientific confirmation.

### F1 — P1: The evidence system amplifies repeated artifact production into scientific confidence

**Classification:** observed defect in evidence semantics and independence handling.

The indicator handler always returns positive evidence, strength 0.7, supporting the packet's scientific hypothesis, after checking that a transformed table is nonempty and contains certain fields. Its own limitations correctly say this establishes an artifact. The integrator deduplicates by evidence ID only; each numbered run gets a new ID and increases confidence by (1 − confidence) × strength × learning rate. It does not establish independent information, distinguish source evidence from derivatives, or restrict the inference to “the table was generated.” [repository-packet-execution.ts:74–135][indicator-handler]; [evidence.ts:55–100][evidence-integration].

The persisted confidence of 0.989029 and zero validated indicators are visible together at [graph.json:167–205][indicator-state]. The repeated bodies and replay in the evidence annex establish that this is occurring, not merely possible. With seventeen updates at strength 0.7 and learning rate 0.25, a starting confidence of 0.71125 reaches the stored value through repeated multiplication of residual uncertainty by 0.825. The 0.71125 starting value is an algebraic reconstruction, not a separately audited historical assessment.

**Consequence:** the system can become more certain by rereading itself. Diagnosis uses confidence to calculate uncertainty, so the distortion can alter uncertainty ordering; fresh local artifact evidence can also satisfy a fresh-evidence gate. The present empirical metric remains zero, and no evidence was found that this has activated a long-horizon program. [diagnosis.ts:35–46][diagnosis]; [gates.ts:39–48][gates].

**Design requirement:** separate artifact verification, source-level observations, inferential assessments, and external outcomes. Derivatives must point to their source evidence and must not count as independent confirmation. Replace uncalibrated scalar accumulation with explicitly justified assessments and uncertainty dimensions; retain numbers only where a defined model and validation justify them.

### F2 — P1: Proactivity bypasses recurrence constraints and rewards exhausted work

**Classification:** observed behavioral mismatch with the desired contribution process.

Normal recurring generation checks elapsed time and, for evidence-signal triggers, fresh relevant evidence. Its fallback generates new run numbers without checking the trigger, interval, or new-evidence requirement. The repository caller uses that fallback when diagnostic generation yields nothing. [packet-generation.ts:175–243,265–311][generation]; [repository-candidate-generation.ts:33–53][candidate-generation].

This is not a reason to make the system passive. The user explicitly wants unmet metrics to prompt new bounded experiments. The defect is that **a new run number is substituted for a new experiment**. There is no demonstrated exhaustion check, decision-delta requirement, diminishing-return penalty, or transition from an unproductive series to a different contribution. A configured seven-day series can be regenerated within minutes. The eleven-cycle replay demonstrates this without network access.

The underlying handlers cannot deliver the learning implied by their titles:

- Refresh handlers hard-code changed=false and zero changed counts while reading the same files. [repository-packet-handlers.ts:170–223,329–377][handlers].
- A “tabletop” copies a proposed trigger and response without executing observation, response, or adversarial scenario. Its summary counts a “tested risk” nevertheless. [repository-packet-handlers.ts:105–164][handlers]; [mitigation run 19:16–32][tabletop-result].
- The durable extension labels ever-larger delays as new fault classes. With the stored baseline, the complete threshold is simply 20.5 + 5(n + 1) ≤ 50 ms: runs 1–4 pass and every integer run from 5 onward fails. Run 17 reports four failures but becomes another unlinked null result, with no revised design or retirement. A sensitivity calculation is useful once; indefinitely renaming points along that inequality is not discovering new failure mechanisms. [repository-packet-handlers.ts:244–312][handlers]; [durable-compute.json:16–44][fault-baseline]; [extension run 17:20–64][fault-result].

**Design requirement:** budget work against unresolved decisions and material input changes. A no-change refresh is an observation event, not another research contribution. On saturation, automatically select a different justified experiment or record a bounded cooldown/exhausted-strategy state. Preserve informative null and negative results; do not equate absence of analysis with a scientific null finding.

### F3 — P1: The recursive initiative/project layer is absent from execution

**Classification:** missing architecture, not merely missing terminology.

The graph has 21 nodes: three objectives, nine hypotheses, six capabilities, and three programs. All three programs are long-horizon proposals. There are 46 research-area labels, but each maps to a strategy node and a reference heading; these are a catalogue, not executable initiatives or projects. PlanNode has dependencies and directive labels but no parent decision, contribution rationale, missing-evidence register, alternatives, or stop condition. InterventionCandidate is a small execution checklist; its splitter returns transient leaves without building a persisted contribution/evidence graph. [types.ts:4–83,341–359][node-types]; [research-areas.json:1–53][research-areas]; [decomposition.ts:22–65][decomposition].

Dependency DAG validation is useful, but an untyped dependency does not distinguish “supports this goal,” “requires this result,” “tests this claim,” “contradicts this assumption,” and “is being performed elsewhere.” Current packets point directly to broad capabilities or hypotheses and use asserted directive deltas. A populated string is not a causal trace to the mission.

**Consequence:** the system can select among five existing series but cannot represent why a new research initiative wins over another, decompose its unanswered questions, or propagate a contribution's negative finding into a revised project case. Adding more templates would enlarge the loop without correcting this.

**Design requirement:** a shared decision contract at initiative, project/question, and contribution levels; typed cross-links; explicit external dependencies; and a bounded planner that proposes useful next contributions rather than new copies of existing templates. The four existing portfolio domains may remain tags or provisional allocation categories alongside the three contribution pillars.

### F4 — P1: Source monitoring does not yet supply an auditable research synthesis pipeline

**Classification:** incomplete integration and provenance loss; persisted external outcomes remain unverified.

The observer and guarded adjudicator are useful starting points. They bound input sizes, fingerprint canonical metadata, and instruct the model to treat source content as data. However, the configured consciousness feed selects only DOI, title, indexing timestamp, and URL for twenty results. The vulnerability feed supplies IDs, dates, and status, without descriptions of failure mechanisms. HTML processing keeps the first hundred cleaned lines before sorting. These inputs can signal that something deserves inspection; they cannot adjudicate substantive scientific claims. [observation-sources.json:9–65][observation-config]; [public-source-observation.ts:161–208][public-observer].

The evidence ledger retains the digest but drops the canonical records, item-level provenance, model explanation, and model-provided limitations. It stores the configured URL, which can be a moving page or unresolved time template. Adjudication errors silently fall back to a metadata snapshot. A future reader therefore cannot reconstruct exactly which source records produced a signal or distinguish all adjudication failures from ordinary no-signal operation. [public-source-observation.ts:247–302][public-observer]. The verifier name “checksum-pinned-guarded-agent-adjudicator” is assigned here, but these methods do not verify a model checksum; the CLI accepts an endpoint and model name. [observe-repository-main.ts:25–36][observe-cli].

Even a valid new signal reaches a handler that ignores its content and rereads a baseline. The host sequence does not ensure the observer runs at all. This breaks both discovery-to-analysis and analysis-to-decision.

**Design requirement:** stable source identity and versions, query and selection logs, retrievable item-level records, licensed evidence snapshots or durable references, source passages/locators, correction/retraction relationships, and explicit review of contradictory interpretations. Keep untrusted content separate from executable instructions; deleting the audit basis is not the only way to preserve that boundary. Expose source failure and coverage gaps. Expand coverage from explicit research questions, not generic keyword feeds.

### F5 — P1: Simulated consciousness assumptions leak into advocacy conclusions

**Classification:** unsupported scientific assumptions and observed overclaim; not evidence of consciousness creation.

MindSeedActivator explicitly acknowledges synthetic metrics, but its formulas guarantee comfortable threshold margins for ordinary finite inputs. Phi is floored at threshold+2; workspace score starts above threshold; self-model coherence remains between 0.87 and 0.92 for finite nonfuture timestamps, above the 0.8 threshold. Data size and age are not measurements of subjective experience. The code then validates those generated metrics and calls the agents operational. It also reads ambient time despite the repository's injection rule. [mind-seed-activator.ts:128–168,287–328][mind-activator]; [colony-seeding/types.ts:330–334][conscious-thresholds].

A controlled probe directly supplied an unverified manifest containing one zero-byte archive, without calling loadArchive. The cohort passed all consciousness metrics. This also exposes a local precondition gap; the more fundamental scientific problem would remain even if archive integrity checks were perfect. Existing tests expect automatically instantiated cohorts to pass these metrics. [bootstrap-sequence.test.ts:506–521][colony-tests].

**Isolation finding:** no direct import of MindSeedActivator into the strategic controller or reference to its metrics in strategy outcome records was found. Its direct consumer in the inspected source is the colony test suite. The space dossier clearly warns that these are speculative models. Thus the preliminary concern about this particular activator driving controller progress is **not established**.

**Leakage finding:** the advocacy registry imports colony threshold constants and constructs a successful civilization narrative from resource comparisons. Its default COLONY_BOOTSTRAP return says “The doctrine's reproducible colonisation pipeline is confirmed.” The code also says a viable site will instantiate conscious agents and become self-sustaining. These outputs were executed in the review. [scenario-registry.ts:85–94,907–952][advocacy-colony]. An interstellar scenario likewise claims its simulation demonstrates physical achievability. [scenario-registry.ts:132–146][advocacy-interstellar]. No production UI consumer or evidence of external distribution of this module was found; the overclaim exists in its callable output.

**Design requirement:** retire these scientific claims and segregate toy models from evidential software. Preserve a simulation only with an explicit analytical question, input provenance, alternatives, sensitivity limits, and a conclusion constrained to what the computation actually establishes. Do not use consciousness status as an engineering convenience variable in the research pipeline.

### F6 — P2: Ranking and reporting measure declared importance and activity, not demonstrated value

**Classification:** observed measurement gap and static prioritization.

Ranking sums fixed packet factors and adds target-minus-recorded portfolio effort. Preservation priority is an asserted Boolean on the packet. All default handlers copy the old effort vector unchanged; it equals the target weights in the checked-in state. The weekly review therefore declares perfect balance without measured execution costs. Packet counts are not a substitute for effort either, but they show why equality cannot simply be assumed. [controller.ts:31–43,138–154][controller-rank]; [portfolio.json:2–23][portfolio]; [periodic-reviews.json:8–37][periodic-review-state].

For example, the mitigation template retains impact 0.95 and information value 0.8 on every repetition. The indicator template retains information value 1. The score does not incorporate repeated results, external demand, source independence, or the expected decision change. [packet-templates.json:57–64,130–137][template-ratings]. Guardian's summary explains selection by saying it ranked first, without the substantive tradeoff or evidence change. [guardian-conversation.ts:154–167][summary-code].

**Design requirement:** record observed resource use, expected and realized information gain in decision terms, external demand, neglected questions, and costs of delay. Use uncertain ranking arguments and sensitivity analysis rather than false precision. Report “what changed our understanding or action, and why this contribution beat alternatives.” Keep activity counts diagnostic, never mission-success measures.

### F7 — P1: Scientific and strategic feedback cannot reliably revise current eligibility

**Classification:** incomplete state transition model; a latent gate defect reproduced in a fixture.

Negative evidence can lower a hypothesis's confidence and create a proposed superseding assessment if the node was verified. Preserving the old assessment is correct. But dependency gates look only at the old node's verified lifecycle and do not consult the new contradiction or assessment. There is no implemented assessment-resolution path in the inspected controller. An in-memory probe marked a parent verified, added a strong contradiction, and observed that its dependent's dependencies-verified gate still passed. [evidence.ts:73–93][evidence-integration]; [gates.ts:25–60][gates]. **No current strategy node is verified**, so this probe demonstrates a future-state defect, not a currently activated unsafe program.

More broadly, successful packet completion marks the packet verified; it does not establish or revise a parent capability through a decision record. Periodic review generates recommendations but does not apply or queue a strategic response. Most local handler results are null with no supported or falsified hypothesis, even when a numerical recovery budget fails. [controller.ts:228–278][controller-advance]; [periodic-review.ts:154–181,228–257][periodic-review-code]. Repository verification also explicitly requires all three deferred programs to remain proposed. This is a useful present containment rule, but confirms that the current verifier is a fixed baseline contract rather than a complete future activation mechanism. [repository-strategy.ts:296–300][deferred-validation].

**Design requirement:** immutable historical assessments plus an explicit current disposition: contested, supported within scope, rejected, suspended, or pending external evidence. New contradictions should identify affected decisions and contributions and trigger re-evaluation within a bounded cycle. Gating should refer to the current scoped assessment, not an eternally verified label. This is decision validity, not a new repository merge gate.

### F8 — P2: Outcome contracts are useful bounds but neither authenticate evidence nor measure the full contribution chain

**Classification:** incomplete validation and outcome design; no observed fabricated external metric in persisted state.

Metric admission checks positive evidence, timestamps, strength, a URL prefix, a verifier-name prefix, and numeric bounds. It does not verify that the source exists, contains the measurement, or was reviewed by the named verifier. In a cloned fixture, synthetic evidence with matching strings set indicator validation to two and externallyDemonstrated=true without any external lookup. This does not allege an exploit or a real measurement; it establishes the validator's actual trust boundary. A pure validator can reasonably rely on an upstream trusted measurement process, but that process must exist and be auditable; no complete production path establishing that boundary was found here. [outcome-contracts.ts:89–143][metric-validation].

Every metric requires external demonstration, including process-like material-update signals and register coverage. Contracts for institutional partners accept only UNESCO/OECD source prefixes, which would exclude many legitimate university, nonprofit, or project-maintainer records. Existing software reproducibility, decision correction, and project-specific uptake lack distinct contracts. All current contracts retain a GitHub-hosted-agent-review prefix even though the default executor uses a different verifier and the current update policy requires no such agent-review gate. [outcome-contracts.json:2–22][contracts].

**Design requirement:** separate research quality, software behavior, uptake, externally demonstrated capability, and ultimate mission outcomes. Define an authenticated provenance/measurement boundary and auditable attribution. Allow evidence from relevant independent actors through explicit rules, not arbitrary prestigious-domain restrictions. Negative evidence must be able to reduce or contest a previously recorded outcome. Independent reproduction and scientific review may supply evidence; they should not be confused with an additional classifier deciding whether ordinary repository changes may merge.

### F9 — P1: Advocacy and collaboration lack an operational project-specific path

**Classification:** missing implementation and unverified external results, plus misdirected existing content.

The institutions dossier usefully discusses voluntary participation, accurate communication, funding, succession, and adoption. It does not become an operational pathway merely by being present. The only current institutional handler explicitly performs no outreach and raises no funds. The advocacy library offers five far-future doctrine/simulation scenarios. Its types connect scenarios to credo and narrative, with no project-specific research case, recipient needs, independent engagement evidence, or resource-allocation outcome. [institutions-and-transmission.md:11–30,80–98][institution-doc]; [repository-packet-handlers.ts:329–377][handlers]; [interactive-advocacy/types.ts:19–66][advocacy-types]; [scenario-registry.ts:1–12][advocacy-scenarios].

The absence of external uptake here is not proof that no person has ever benefited from the repository. It is a missing measured pathway. Producing more persuasive internal documents would not fix it.

**Design requirement:** for each viable project, identify beneficiaries and plausible contributors; record why the specific investigation is valuable, competing allocations, proposed executor, required resources, measurable outputs, objections, and decision deadlines. Support both mission advocacy and stand-alone project support. Track qualified responses, actual reuse, collaboration, commitments, and reasons for rejection. External contact or spending must follow applicable authorization; it is not authorized by this review.

### F10 — P2: The current host path cannot reliably recover interrupted evidence integration

**Classification:** reproduced implementation defect and operational integration gap.

The executor writes artifact and result files before updating the multi-file strategy state. On retry it compares existing output, including its verification field, with newly prepared output that lacks that field. An injected failure on the first graph write left both output files present; retry failed with “Execution artifacts … differ from deterministic output.” [repository-packet-execution.ts:46–65,164–196][execution-recovery]; [repository-result-integration.ts:93–106][result-integration].

The repository integrator also throws unless advancement returns packet-verified, so it does not persist the generic controller's blocked/retry outcomes. The shell entry refuses any dirty checkout before executing; a failed cycle that leaves tracked changes can therefore prevent the next scheduled attempt from reaching recovery. [repository-result-integration.ts:53–64][result-integration]; [run-host-guardian-cycle.sh:13–49][host-shell]. The supervisor's model pass is not a substitute for this missing recovery path, because the shell can reject before it runs.

**Design requirement:** transactional or journaled state updates, content-addressed idempotency, persisted failed attempts, and tested restart at every write boundary. One operating entry point should own observation, bounded selection, execution, integration, recovery, review scheduling, and status. Do not fix this by making the human the routine retry operator.

## 5. Choice among salvage, redesign, and replacement

| Option | Strongest case for it | Why it is or is not sufficient |
|---|---|---|
| Selective salvage with local fixes to today's loop | Cheapest route to stop duplicate confidence, repair retries, and wire observation; useful if the product were a small monitored registry | Necessary containment, but insufficient for recursive initiatives, meaningful contribution generation, source-level reasoning, and uptake. More templates would preserve the central mismatch. |
| **Execution-layer redesign with selective retention** | Preserves the mission, useful research records, tests, and adapters while changing what work and evidence mean | **Recommended.** Introduce the missing decision/contribution contract and prove it on one real initiative before expanding. Migrate incrementally with explicit provenance and rollback. |
| Full replacement | Could eliminate vocabulary and coupling inherited from speculative civilizational engineering | Not justified by this audit. It would discard useful research and engineering, create migration risk, and can reproduce the same activity incentives in a cleaner codebase. Reconsider only if the pilot shows the retained components obstruct a small coherent implementation. |

### Disposition of existing assets

| Retain and adapt | Retire or archive from the active path | Add or replace |
|---|---|---|
| Mission, constitutional constraints, canonical document structure | Repetitive series as a source of purported research progress | Initiative/project/question/contribution decision contract |
| Source-limited consciousness and preservation findings, after claim audit | Duplicate result bodies; preserve history and a deduplicated provenance index | Versioned source records, claim locators, contradictions, evidence-dependence links |
| Ports, pure graph checks, explicit timestamps, useful deterministic tests | Synthetic consciousness validators and their scientific/advocacy claims | Scoped assessments and decision revision propagation |
| Outcome/artifact distinction and historical assessments | Automatic confidence accumulation from derivative records | Measurement and attribution appropriate to research, software, and uptake |
| Small useful analysis/reproduction tools, where an external need is demonstrated | Unjustified long-horizon simulation expansion as default work | Contribution selection with expected decision value, costs, exhaustion, and stop rules |
| General runtime, memory, and storage components as candidates for reuse | Assumption that the cognitive runtime is needed to operate the strategy | One observable, recoverable operating entry point and project-specific collaboration support |

The 610 files under src/, including tests, span many domains. This review is not a per-module retention certification. Keep a module active only when a current contribution needs it and it has a defensible interface and validation boundary. Archiving means preserving retrievable history and explaining its status; it does not mean erasing negative results or deleting the mission's long-term possibilities.

## 6. Staged transition proposal

These are proposed future work stages. They have not been implemented or dispatched.

1. **Contain misleading accumulation.** Under separate implementation authorization, freeze exhausted series, prevent derivative evidence from increasing scientific confidence, and remove unsupported advocacy conclusions from any active publication path. Preserve old records and publish a scoped correction, not a silent historical rewrite. Add failing behavioral tests first, then the smallest fixes; use only deterministic CI as the repository update gate.
2. **Establish the minimal decision model.** Represent one initiative, two competing projects/questions, their assumptions and evidence, a shared dependency, and at most five actionable contributions. Migrate only evidence needed for that pilot. Link the previous records as historical provenance; do not import a 0.989 confidence as an empirically calibrated belief.
3. **Connect one complete learning loop.** Ingest versioned external sources, conduct one synthesis or analysis, record its effect on a parent decision, and select the next contribution. Include unchanged input, contradiction, failed analysis, and interruption/restart cases. All environmental effects cross injectable ports; all referenced times are supplied. Apply strict TDD to implementation changes.
4. **Test usefulness beyond the repository.** Use the pilot below to test reproducibility and whether independent users can make better decisions with the result. Prepare project-specific advocacy and obtain any required authorization before contact. External unavailability must be represented as a dependency, not filled with invented engagement.
5. **Expand only after acceptance.** Add another initiative in a different domain only if the pilot meets both learning and uptake criteria. Reassess allocation using measured costs and needs. Archive dormant modules, retire weak projects, and retain a clear rollback to the previous records. If no useful outcome emerges within the pilot bound, stop expanding the operating framework and reassess the project selection before considering a rewrite.

## 7. A small falsifiable pilot

**Proposed initiative:** Improve the reliability of research decisions about consciousness indicators without claiming to diagnose consciousness.

**Question:** Which distinctions in the existing theory-linked prediction registry survive scrutiny against the source studies and their limitations, and which next investigation would most improve a practical research decision?

This is intentionally a knowledge and software contribution. It does not require hardware, participants, intentional consciousness creation, or a speculative colony simulation. The existing registry provides a baseline to audit rather than an assumption to accept.

**Bound:** three calendar weeks; at most 20 primary source items, 12 consequential claims, five contributions, and a recorded 30-hour operating-effort budget. Set actual start/end timestamps and compute-cost limits when commissioned. No automatic extension after nonacceptance.

**Two competing project paths:** (A) improve prediction/source/interpretation traceability; (B) reproduce a published, accessible analysis that resolves a consequential uncertainty. Both depend on source/data access and a clear account of what the measurement can establish. Select B only if the data and method are accessible and the analysis has value beyond a table reformat; otherwise record why A is the useful next step. An external experiment with no accessible data becomes a tracked dependency, not a simulation invented to substitute for it.

**At most five contributions:** audit source claims and contradictions; produce a source-linked comparison; implement the smallest reproducible analysis or auditing tool warranted by the selected path; record the parent decision and next experimental recommendation; prepare and evaluate a stand-alone research support case. The research case must name the question, relevant executor, resource assumptions, alternatives, and stopping conditions. It must remain intelligible and supportable without adopting the full credo.

### Preregistered acceptance criteria

| Criterion | Measurement and threshold |
|---|---|
| Provenance | All 12 decision-relevant claims have source/version, exact locator, scope, limitations, and derivation links. No unresolved material misquotation or conflation of study, theory, and consciousness verdict. |
| Useful correction | At least one consequential baseline claim or project priority is corrected, narrowed, retired, or retained through a documented comparison with a credible alternative. “Retained” counts only if the comparison resolved a previously explicit uncertainty; writing a new explanation alone does not count. |
| Contribution reproducibility | A separate run/operator reproduces the analysis or claim-audit outputs from pinned inputs. Any numerical tolerances and exclusions are fixed before confirmatory execution. |
| Feedback | A withheld real contradiction or clearly marked test fixture changes the appropriate current assessment and causes a bounded parent-decision re-evaluation within one cycle, while preserving history. Synthetic fixtures never enter the scientific evidence ledger. |
| No activity inflation | Three cycles with identical evidence and exhausted local options create zero new substantive contributions and zero confidence/achievement increments; they produce only operational status or an explicit bounded cooldown. A different justified experiment remains eligible. |
| External usefulness | Two independent, relevant researchers or practitioners examine the result; at least one independently reuses it, requests a concrete collaboration, or explicitly commits resources to the proposed investigation. Politeness, page views, generated outreach, or internal agent approval do not satisfy this. |
| Decision aid quality | Using a small fixed set of source/limitation questions, external evaluators make no material error attributable to the tool and can trace every answer. Record time and errors against the existing registry as a baseline; a shorter retrieval time is useful evidence, not proof of scientific correctness. |

No physical experiment or funding is required for this small pilot to pass, but **some substantive external uptake is**. If external evaluation is not authorized or available, the internal engineering criteria can be reported separately; do not declare the full pilot successful.

### Stopping and revision rules

- Stop the selected analysis path if source/data access or a meaningful decision use cannot be established after two bounded alternatives. Record the dependency and choose a different viable contribution; do not require the human to perform routine search or retries.
- Stop repetition after two completed contributions with no new decision-relevant information. Reassess the question or archive that path.
- Quarantine any material provenance error or unsupported consciousness assertion; correct it before external use and mark affected conclusions contested.
- At the time/effort cap, classify the pilot as accepted, partially demonstrated, or rejected against the table. No external uptake means the full pilot is not accepted. Use objections and nonuse to revise or retire the proposed contribution, not to generate another advocacy document automatically.
- Escalate only a qualified intrinsic human boundary under the existing policy, with documented alternatives. No such escalation is needed to complete this review.

## 8. Verification, external spot checks, and limitations

### Checks performed

- Read the canonical documentation, controller domain logic, host and CLI orchestration, source observation/adjudication, evidence and metric admission, generation/decomposition, ranking, reviews, and result integration.
- Enumerated all tracked strategy nodes, packets, evidence, results, assessments, and periodic reviews; compared all 90 result artifacts under a documented normalization.
- Inspected the four consolidated findings and representative outputs, including the consciousness prediction registry, preservation risks, institutional dependencies, and durable-compute scenarios.
- Traced the sampled colony activator, its tests and thresholds, advocacy scenario imports and returned conclusions, and the separate cognitive runtime entry point. Broader modules were inventoried and tested, not exhaustively scientifically audited.
- Ran isolated production-function probes for eleven cycles with no new external inputs; contradiction and dependency gating; prefix-only metric acceptance; zero-byte synthetic cohort validation; default advocacy output; and interruption/retry behavior. Only the review annex was written to disk; strategy mutations occurred in existing in-memory adapters or cloned states.
- Installed lockfile dependencies locally with npm ci --ignore-scripts after the initial checkout lacked tsc and vitest. Type checking, strategy verification, and five documentation checks passed. The focused controller/colony run passed 260 tests. The baseline full suite passed 4,823 tests in 235 files, with seven todo.

An initial full-suite run **with the new review evidence under docs/** failed two candidate-generation tests. The test helper scans timestamps in every docs/ and strategy/ file to choose its fixture time; the review's synthetic September timestamp aged out an August test signal. Moving review-only artifacts to reviews/ restored the baseline full-suite pass without changing code. This is evidence of fixture coupling to unrelated document contents, not evidence that the untouched baseline's full suite fails. [repository-candidate-generation.test.ts:9–45,49–64][candidate-tests]; [repository-test-time.ts:1–12][test-time].

### Limited source verification

The review independently opened selected primary publication records. The 2023 AI-indicator report's scope and date match the baseline's broad description; it is a theory-derived assessment, not an empirical validation of the repository's repeated tables. [Butlin et al., arXiv record](https://arxiv.org/abs/2308.08708). The recurrent-processing critique's title and September 2010 publication date match the registry. [Tsuchiya and van Boxtel, PubMed record](https://pubmed.ncbi.nlm.nih.gov/24168345/). COGITATE's publication identity and April 2025 online date were verified through its publication record after direct Nature access failed. This review did not reproduce its experimental analysis. [COGITATE, PubMed record](https://pubmed.ncbi.nlm.nih.gov/40307561/).

The sampled 2024 PFC article also has a linked June 2024 correction, which changes introductory wording. The registry records the article but no explicit correction relationship. This is a provenance-model gap, **not** evidence that the correction overturns the repository's interpretation. [Publisher correction](https://academic.oup.com/nc/article/2024/1/niae030/7700274). These spot checks support retaining the baseline for audit; they do not certify the entire literature synthesis.

### Limits on the verdict

This review covers the named commit and its persisted state. It did not inspect private host logs, credentials, live cron installation, external funding or partnerships, all Git history, or every scientific module. It did not operate the live Guardian, contact researchers, publish advocacy, or alter repository governance. Actual uptake outside the ledger remains unknown. The Codex host pass can potentially improve documents and strategy in ways not captured by the deterministic handlers; its effectiveness was not measured here. Passing the complete test suite does not establish consciousness, physics, welfare, or institutional readiness. No benchmark compared a completed alternative architecture with the current one; the redesign recommendation is a reasoned inference from the reproduced failures and missing contracts, to be tested by the proposed pilot.

## Source locations at the reviewed commit

Links below pin repository evidence to the reviewed commit. The local machine-readable census and probe outputs are in [evidence.json](evidence.json). Line spans in link labels refer to that commit, not a future checkout.

[readme]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/README.md#L5-L28
[plan-invariants]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/docs/PLAN.md#L39-L58
[plan-failure]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/docs/PLAN.md#L173-L196
[ports]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/ports.ts#L14-L95
[graph-validation]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/graph.ts#L160-L204
[packet-type]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/types.ts#L175-L201
[research-baseline]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/strategy/findings/consciousness-assessment.json#L9-L230
[baseline-evidence]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/strategy/evidence.json#L82-L100
[contracts]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/strategy/outcome-contracts.json#L2-L22
[space-caveats]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/docs/reference/space-and-longevity.md#L89-L109
[constitution]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/strategy/constitution.json#L4-L25
[observation-config]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/strategy/observation-sources.json#L9-L65
[institution-doc]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/docs/reference/institutions-and-transmission.md#L11-L109
[operations-policy]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/docs/OPERATIONS.md#L102-L109
[runner]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/runner.ts#L68-L186
[decomposition]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/decomposition.ts#L22-L65
[host]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/host-guardian-supervisor.ts#L54-L75
[package]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/package.json#L7-L29
[runtime-entry]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/agent-runtime/main.ts#L5-L24
[indicator-handler]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/repository-packet-execution.ts#L74-L135
[evidence-integration]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/evidence.ts#L55-L100
[indicator-state]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/strategy/graph.json#L167-L205
[diagnosis]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/diagnosis.ts#L35-L46
[gates]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/gates.ts#L25-L60
[generation]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/packet-generation.ts#L175-L311
[candidate-generation]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/repository-candidate-generation.ts#L33-L53
[handlers]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/repository-packet-handlers.ts#L60-L377
[tabletop-result]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/strategy/results/preservation-mitigation-tabletop-run-19.json#L16-L32
[fault-baseline]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/strategy/findings/durable-compute.json#L16-L44
[fault-result]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/strategy/results/durable-compute-fault-model-extension-run-17.json#L20-L64
[node-types]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/types.ts#L4-L359
[research-areas]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/strategy/research-areas.json#L1-L53
[public-observer]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/public-source-observation.ts#L161-L302
[observe-cli]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/cli/observe-repository-main.ts#L25-L36
[mind-activator]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/colony-seeding/mind-seed-activator.ts#L128-L328
[conscious-thresholds]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/colony-seeding/types.ts#L330-L334
[colony-tests]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/colony-seeding/__tests__/bootstrap-sequence.test.ts#L506-L521
[advocacy-colony]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/interactive-advocacy/scenario-registry.ts#L907-L952
[advocacy-interstellar]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/interactive-advocacy/scenario-registry.ts#L132-L146
[controller-rank]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/controller.ts#L31-L154
[portfolio]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/strategy/portfolio.json#L2-L23
[periodic-review-state]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/strategy/periodic-reviews.json#L8-L37
[template-ratings]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/strategy/packet-templates.json#L57-L137
[summary-code]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/guardian-conversation.ts#L154-L167
[controller-advance]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/controller.ts#L228-L278
[periodic-review-code]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/periodic-review.ts#L154-L257
[metric-validation]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/outcome-contracts.ts#L89-L143
[advocacy-types]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/interactive-advocacy/types.ts#L19-L66
[advocacy-scenarios]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/interactive-advocacy/scenario-registry.ts#L1-L12
[execution-recovery]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/repository-packet-execution.ts#L46-L196
[result-integration]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/repository-result-integration.ts#L53-L106
[host-shell]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/scripts/run-host-guardian-cycle.sh#L13-L49
[candidate-tests]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/__tests__/repository-candidate-generation.test.ts#L9-L64
[test-time]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/__tests__/repository-test-time.ts#L1-L12
[deferred-validation]: https://github.com/lbsa71/MASTER_PLAN/blob/5bcbb29a5da37053a046d6bf8bc0b020da9aebf2/src/master-plan-controller/repository-strategy.ts#L296-L300
