# Lawson — Spec 02: Harness Architecture, Supporting-Text Generation & the Conditioning Gateway

> **Read 00 and 01 first.** This spec goes deep on *how the harness is built* — the AI SDK decisions, the agent architecture, the supporting-text surface that gives Lawguistics something to bend, the single conditioning gateway every output is forced through, the typed slot encoding, and the **MVP UI integration seam** (just enough for the UI to consume — full UX is Spec 03).

> **Lawguistics here is a mock.** The real conditioning tool isn't built yet. This spec defines the *seam, the contract, and the invariant* so the real tool drops in later without touching the harness. The mock is a deliberate, swappable implementation behind a fixed interface.

---

## 1. Three architectural commitments (the spine of this spec)

1. **Supporting text is a first-class output.** Each turn emits not just a functional question but a *surface* of language — preamble, framing/description, connective tissue, micro-reassurance — designed to be register-rich. This is the material the cleave bends. Terse questions give the eye nothing to diff; **the supporting text is where Lawguistics shines.**
2. **Conditioning is the last step, always, structurally enforced.** The harness exposes a single **emit gateway**. Every renderable — question, supporting text, scaffolds, summary — leaves through it, and the gateway conditions it. There is no code path that returns unconditioned text to the UI. "Condition as final step" is an *invariant*, not a convention.
3. **The harness is AI-SDK-native and provider-thin.** All model work goes through one wrapped client using the Vercel AI SDK's structured-generation primitives. Agents are prompt+schema modules; the SDK does the structure. Provider is swappable behind the wrapper.

---

## 2. AI SDK decisions (deep)

### 2.1 One wrapped client, server-only
- A single `services/ai/client.ts` wraps the Vercel AI SDK + Anthropic provider. **Nothing else in the codebase imports the SDK directly.** Model id, temperature defaults, and retry policy live here (Spec 00 config).
- All calls run in **Route Handlers** (server). The browser never holds a key and never calls a model. The interactor (UI side) talks to our routes; routes talk to the client wrapper.

### 2.2 Structured generation is the default; free-text is the exception
- Use the SDK's **`generateObject`** (schema-constrained) for everything with shape: triage selection, recalibration, the per-turn output (question + supporting text + typed scaffolds), the summary, and lawyer matching. Schemas are **Zod**, colocated with each agent/step.
- Reserve **`generateText`** only for genuinely free-form prose where no structure is needed — in practice, rare, because even the supporting text is returned as fields of a structured object (so we can place it deterministically in the UI).
- **Why object-first:** it makes outputs *positionally reliable* (the UI knows exactly where the preamble vs. the question vs. each scaffold goes), it makes the slot encoding enforceable per-field, and it makes the conditioning gateway able to walk known fields rather than parse a blob.

### 2.3 No streaming in v1 (deliberate)
- Outputs are short and we **need both registers fully materialised before the cleave**. Streaming a half-conditioned turn risks the reveal. Generate-complete-then-render. Streaming is a post-demo stretch, explicitly out of scope.

### 2.4 Determinism knobs (steerability)
- **Low temperature** for triage `selectAgent`, `recalibrate`, and lawyer matching → steerable, the seed reliably lands the hero. **Moderate** for question/supporting-text/scaffold composition → natural, warm language. Centralised in the client wrapper + config, not scattered in prompts.

### 2.5 Agents as (prompt + schema) modules
- Each agent and each triage step is a module exposing a pure async function: `(typedInput) → typedOutput`, internally one `generateObject` call against the wrapper. No agent holds state, no agent imports UI, no agent calls the provider directly. This is what makes the bench swappable and unit-testable with a stubbed client.

---

## 3. The harness architecture (modules & flow)

All of this lives in `services/harness/` (framework-agnostic, no UI imports — Spec 00 §3.2).

```
services/
  ai/
    client.ts          # the only SDK importer; generateObject/generateText wrappers
  harness/
    loop.ts            # orchestration; holds caseState; the ONLY caller of emit()
    triage.ts          # bootstrap, selectAgent, recalibrate, composeSummaryPlan
    emit.ts            # THE GATEWAY — see §5. Every output passes through here.
    agents/
      claim-quant.ts   # agnostic: value / viability
      merits-analyst.ts# agnostic: is there a claim (elements, proof)
      criminal.ts      # specialist
      real-estate.ts   # specialist
      commercial.ts    # specialist
    slots/
      encode.ts        # typed slot syntax + parse/serialize (shared w/ summary & UI)
  lawguistics/
    index.ts           # the conditioning interface (real tool plugs in here)
    mock.ts            # the swappable mock implementation (this spec)
    drift.ts           # the drift schedule
  signatures/          # voice signatures / match target descriptors (provisional)
  session/
    store.ts           # canonical server-side session state (in-memory Map)
```

### 3.1 Flow (with the gateway made explicit)

```
Lawson.start(seed):                                // public entry (loop.start under the hood)
    caseState = Triage.bootstrap(seed)            // matter guess + lawyerMatch + opening agent
    return emit(openingTurn)                        // <- conditioned here, nowhere else

Lawson.answer(turnId, payload):                    // payload = chosen scaffold + filled slots, or freeform
    caseState = Triage.recalibrate(caseState, payload)   // may move matter + lawyerMatch
    if turnsRemaining:
        agent = Triage.selectAgent(caseState, transcript, turnsRemaining)
        rawTurn = agent.composeTurn(caseState, transcript)   // SUBSTANCE incl. supporting text
        return emit(rawTurn)                        // <- conditioned here
    else:
        rawSummary = Triage.composeSummary(caseState, transcript)
        return emit(rawSummary)                     // <- conditioned here

Lawson.refreshSummary(fills):
    rawSummary = Triage.composeSummary(caseState ⊕ fills, transcript)
    return emit(rawSummary)                         // <- conditioned here
```

- `Lawson` (the orchestrator, implemented in `loop.ts`) is the **only module that calls `emit`**, and `emit` is the **only caller of `Lawguistics.condition`**. Agents and `Triage` return *raw substance*; they cannot reach the UI. This is the structural guarantee behind commitment #2.
- `caseState` (matter hypothesis + confidence, active specialist, `lawyerMatch`, transcript, turn counters) lives only in the loop and the session store. Agents receive a read-only slice.

---

## 4. Supporting-text generation (the surface Lawguistics shines on)

Every `composeTurn` returns **substance in named fields**, of which several are *pure surface* — present specifically to give the conditioner register-rich material:

Provisional per-turn substance (field names not locked, intent fixed):
- `preamble` — a warm 1–2 sentence lead-in. Pure register. High-value bend material.
- `question` — the single functional ask.
- `framing` — an optional longer description/context that motivates the question (why we're asking, what it unlocks). Register-rich, fact-light.
- `scaffolds[]` — the three enriched suggested answers (typed slots — §6).
- `reassurance` — an optional short connective/closing line ("no wrong answer here"). Pure register.
- `freeform` — the always-present free-form affordance (an empty free-text slot).

Design rules:
- **Surface fields carry voice; functional fields carry facts.** The contrast at the cleave comes mostly from `preamble` / `framing` / `reassurance`. Agents are prompted to make these *say little but sound like someone* — exactly what bends visibly.
- **Substance invariant still holds:** surface text may be warm/voiced but must not assert facts that differ between registers. It's tone, not new information. (Compliance posture from 00/01.)
- The agent prompt explicitly requests these fields and instructs that surface text be natural, brief, and free of load-bearing claims. This is where the demo's "felt nothing, but the language was working on you" lives — so it's a deliberate generation target, tuned here, not incidental.

> Authoring note for prompts: the flat **baseline** of these surface fields should be deliberately administrative ("Please describe what happened."), while the **conditioned** version carries the matched lawyer's voice. The gap between those two is the product. Tune surface fields first when "the contrast isn't popping."

---

## 5. The conditioning gateway (`emit.ts`) — the invariant

A single function every output is forced through.

```
emit(rawOutput) -> conditionedOutput:
    target = caseState.lawyerMatch -> signature/descriptor   // who we bend toward
    drift  = drift.forStage(rawOutput.stage)                 // ramps across the intake
    for each register-bearing field in rawOutput:            // preamble, question, framing, scaffolds[], reassurance, summary body...
        { conditioned, baseline } = Lawguistics.condition(field, target, drift)
    persist both registers to session.store (canonical)
    return the conditioned view to the loop -> UI
```

Properties that make it an invariant, not a convention:
- **Single choke point.** Agents/triage return raw; only `emit` can produce something renderable; only `loop` calls `emit`. There is no other route to the UI. A reviewer can prove "nothing renders unconditioned" by inspecting one file.
- **Field-aware, not blob-aware.** Because outputs are structured (§2.2), `emit` walks known register-bearing fields and conditions each, leaving non-text fields (ids, types, slot keys) untouched.
- **Both registers always produced and stored.** `emit` writes the canonical `{conditioned, baseline}` pair per field to the session store *now*, during intake. This is the pre-render guarantee the cleave depends on (Spec 04) — the reveal only unhides what `emit` already stored. **No generation at cleave time.**
- **Slot-delimiter preservation is the gateway's contract on Lawguistics.** `condition()` must return text with the slot tokens intact (§6). `emit` validates this (cheap regex check) and, on violation, falls back to baseline for that field rather than shipping broken markup. Safety rail for the demo.

### 5.1 The Lawguistics interface (what the gateway calls)
The domain language is the API — see §10 on branding. The interface is the `Lawguistics` object:
```
Lawguistics.condition(text, target, drift) -> { conditioned, baseline }
```
- `text`: one register-bearing field (may contain slot tokens).
- `target`: the matched lawyer's voice descriptor (from `caseState.lawyerMatch`).
- `drift`: 0 (mirror the user) → 1 (full lawyer voice).
- Returns both registers of the *same substance*; **must preserve slot tokens**; **must not change facts** (tone only).

### 5.2 The mock (`mock.ts`) — swappable, built in stages
v1 ships a **mock** `Lawguistics` satisfying the interface so the whole harness runs end-to-end before the real tool exists. Build it in three stages; **stage 0 is mandatory and ships first.**

- **Stage 0 — identity passthrough (build this first).** `Lawguistics.condition` returns the **exact same string for both registers**: `{ conditioned: text, baseline: text }`. No model call, no transform, tokens trivially preserved. This is the first thing that exists behind the interface. Its entire job is to prove the *plumbing*: that every output flows through `emit`, both registers get produced and persisted canonically, the session store holds the pair, the slot parser runs on conditioned text, and the UI seam renders it. At this stage the eventual cleave would show **two identical panels — which is correct.** Identical panels mean the pipes are connected; voice is simply not turned on yet. Wire the pipes, then turn on the water.
- **Stage 1 — model-backed mock.** A `generateObject` call producing genuinely divergent `{conditioned, baseline}` from a lightweight voice descriptor (closest to the real tool; good enough to demo). This is where voice first appears and the cleave starts to *mean* something. Swapping stage 0 → stage 1 changes only `mock.ts`; nothing upstream moves.
- **Stage 1b — rule-based mock (optional).** Deterministic transforms (baseline = strip to neutral; conditioned = apply the descriptor's surface tics) for offline/no-latency local runs. Useful when iterating without burning calls.
- The **drift schedule** (`Lawguistics.drift` / `drift.ts`) ramps stage→value (opening mostly mirror, summary full voice). Inert at stage 0 (identity ignores drift), live from stage 1. Tunable; the summary is the most-conditioned, most-divergent output.
- When the **real Lawguistics** is ready, it replaces `mock.ts` behind the same `Lawguistics` interface. **The harness does not change** across any of stage 0 → 1 → real.

> Why identity-first matters for this demo: it cleanly separates two failure modes. If something is broken at stage 0, it's a *plumbing* bug (gateway, store, parser, render seam). If the contrast is weak at stage 1, it's a *voice* bug (descriptor, drift, surface-text prompts). You never debug both at once.

---

## 6. Typed slot encoding (free-form / select)

Promoted from Spec 01's plain-text-only to a **small typed set** — this is a strong demo beat (an inline `select` mid-sentence feels magical) and is cheap to support.

- **One regex-delimited syntax, used in scaffolds *and* the summary**, so one parser (`slots/encode.ts`) serves both.
- **Types in v1:**
  - **free-text** — inline editable text (default).
  - **select** — inline dropdown with a fixed option list.
  - (free-form answer option at the turn level is just a turn-level free-text slot.)
- Token shape (provisional, regex-simple): a delimited token carrying `type`, a stable `key`, and a payload that is a placeholder hint (free-text) or a `|`-separated option list (select). One delimiter pattern, no nesting.
  - free-text: `[[key:free:placeholder]]`
  - select: `[[key:select:option a|option b|option c]]`
- `encode.ts` exposes: `parse(text) -> runs[]` (ordered text-runs and typed input-runs) and `serialize(runs) -> text` (fold filled values back). The UI renderer (Spec 03) consumes `parse`; the loop uses `serialize` to read answers back for `recalibrate`.
- **Conditioning preserves tokens** (§5 contract): Lawguistics may reword the prose runs but returns the exact slot tokens unchanged, so `parse` still works on conditioned text. The gateway validates this.
- Keep the type set tight in v1 (free-text + select). Date/number/etc. are a named extension a later spec may add — not assumed.

---

## 7. MVP UI integration seam (scope: just enough)

Full UX is Spec 03. Here we define **only the seam** the UI consumes, so the harness is independently runnable and demoable behind a thin UI.

- **Interactor surface** (`*.interactor.ts`, Spec 00 §3.1) wraps three route calls and exposes to the dumb UI:
  - `start(seed)` → first conditioned turn.
  - `answer(turnId, payload)` → next conditioned turn, or the conditioned summary, + `done` flag.
  - `refreshSummary(fills)` → regenerated conditioned summary.
- **Route handlers** (server) map 1:1 to loop methods and own all model work. They read/write the canonical session store and return the **conditioned view** (UI does not receive `baseline` during intake — baseline is pulled from the store only at cleave, Spec 04).
- **MVP UI for this spec = a thin harness harness-tester**, not the real surface: a seed box, one turn rendered at a time (question + supporting text + parsed scaffolds with working typed inputs + free-form), an answer action, and a summary view with an explicit **refresh**. Monochrome, dumb component + interactor. Enough to *run and feel* the swarm and watch turns get produced; the polished intake is Spec 03.
- **What the MVP UI must prove:** (1) turns are adaptive and re-route, (2) scaffolds render with inline free-text and select inputs that fill correctly, (3) the summary is a live one-pager with explicit refresh, (4) every rendered string came through `emit` (conditioned). It does **not** need the cleave (Spec 04) or the final styling polish (Spec 03).

---

## 8. Build order (a Claude Code session)

1. `services/ai/client.ts` — the single SDK wrapper (`generateObject`/`generateText`, temps, retries).
2. `lawguistics/index.ts` — the `Lawguistics` interface + **`mock.ts` at stage 0 (identity passthrough: `{conditioned: text, baseline: text}`)** + `drift.ts` (inert at stage 0). Build stage 0 *only* here; voice comes later.
3. `slots/encode.ts` — typed token syntax + `parse`/`serialize` + the delimiter validator used by the gateway.
4. `harness/emit.ts` — the gateway: field-walk, call `Lawguistics.condition` per register-bearing field, persist both registers, validate slot preservation, return conditioned view.
5. `harness/triage.ts` (`Triage`) + `agents/*` — bootstrap/select/recalibrate/composeSummary and the five agents, each (prompt + Zod schema) producing substance incl. the supporting-text fields (§4).
6. `harness/loop.ts` (`Lawson`) — holds `caseState`, the only `emit` caller; wire the flow (§3.1).
7. Route handlers (1:1 with `Lawson` methods) + `session/store.ts`.
8. The **thin MVP UI** (§7) — interactor + dumb component to run the swarm end-to-end with working typed slots and summary refresh. **At this point the pipeline is fully verifiable on the stage-0 identity mock — both panels identical, all plumbing proven.**
9. **Only now: promote `mock.ts` to stage 1 (model-backed).** Voice appears; tune surface-text prompts (§4) and drift (§5.2) until the contrast pops. Plumbing is already trusted, so any weakness here is isolated to voice.

---

## 9. Branding in code (domain language is the API)

The code surface uses the product's own names so the codebase narrates the same story as the demo. This is intentional, not cosmetic — reading the call sites should *tell the story*.

- **`Lawson`** — the orchestrator (implemented in `harness/loop.ts`). Public methods: `Lawson.start(seed)`, `Lawson.answer(turnId, payload)`, `Lawson.refreshSummary(fills)`. The single protagonist; the only caller of `emit`.
- **`Triage`** — the conductor (`harness/triage.ts`): `Triage.bootstrap`, `Triage.selectAgent`, `Triage.recalibrate`, `Triage.composeSummary`.
- **`Lawguistics`** — the conditioning tool (`lawguistics/index.ts`): `Lawguistics.condition(text, target, drift)` and `Lawguistics.drift.forStage(stage)`. The mock and the eventual real tool both implement this surface.
- The bench agents read as roles: `ClaimQuant`, `MeritsAnalyst`, `CriminalCounsel`, `RealEstateCounsel`, `CommercialCounsel`.
- `emit` is the internal gateway (not branded — it's plumbing, deliberately unglamorous, so the reviewer sees exactly one choke point).

Convention: branded objects are the *public* surface of each service. Internal helpers stay lowercase/utility. A reader skimming `loop.ts` should see `Lawson` orchestrating `Triage` and the bench, with every output going through `emit` → `Lawguistics`. The architecture and the pitch line are the same sentence.

---

## 10. Invariants this spec hands forward (must not be violated downstream)

- **Stage 0 ships first** → identity passthrough proves all plumbing before any voice exists; identical panels at the cleave are *correct* at this stage.
- **Everything renderable passes through `emit`** → conditioned, both registers stored. (Cleave depends on it.)
- **`emit` is the only caller of `Lawguistics.condition`; `Lawson` is the only caller of `emit`.** One choke point, provable in one file.
- **Slot tokens survive conditioning** → `parse` works on conditioned text. (Renderer depends on it.)
- **Substance is register-invariant** → tone differs, facts don't. (Integrity + compliance.)
- **No model call at cleave time** → `emit` already stored both registers. (Spec 04's safety.)
- **Provider only behind `services/ai`; conditioning only behind `Lawguistics`** → both swappable, server-only.

---

*Next: Spec 03 (UX — the real intake surface, slot renderer, live one-pager, dumb-component/interactor split) and Spec 04 (side rendering — the cleave).*
