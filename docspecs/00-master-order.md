# Lawson — 00 · Master Build Order

> **The one list you follow.** This consolidates the three lane plans — `lawson/` (harness), `lawguistics/` (voice), `ux/` (polish) — into a single waterfall sequence with the cross-lane conflicts already resolved. Each row is a tickable deliverable; tick it when the code lands and its done-check passes. Lane docs remain the detailed spec for each row — this file owns **order, conflict resolutions, and the integration seams** between lanes.
>
> **How to use:** work top-to-bottom. Don't start a row until every row above it is ticked (a few explicitly-marked rows may float earlier — noted inline). Commit at the marked points so progress is legible in git history.

---

## Why the order isn't "harness, then lawguistics, then ux"

A pure lane-by-lane waterfall is impossible: the harness's spine (P3 `emit`) calls the `Lawguistics` interface, so the **Lawguistics contract (Stage 0) must precede harness P3**. And the demo isn't real until Lawguistics stage-1 conditioning exists. So the true order interleaves:

```
foundation ─► Lawguistics CONTRACT ─► harness spine (on identity) ─► full harness e2e
                                                                          │
                                            ┌─────────────────────────────┘
                                            ▼
                              Lawguistics REAL VOICE ─► emit computes stats ─► UX polish + cleave
```

The harness runs **end-to-end on a stage-0 identity passthrough** (baseline == conditioned, and that is *correct*) before any real voice exists — "pipes before water." Then Lawguistics swaps real internals behind the same interface with zero harness changes, and UX polish lands on top.

---

## Resolved cross-lane conflicts (binding — these override the lane docs where they differ)

| # | Conflict | Resolution (authoritative) |
|---|---|---|
| **R1** | `condition` signature: harness wanted `condition(text, {lawyerId}, drift)`; Lawguistics authored `condition(text, VoiceSignature, drift, origin?)`. | **Lawguistics's signature wins.** `condition(text, target: VoiceSignature, drift, origin?: MetricVector)`. `emit` resolves `lawyerMatch.lawyerId → VoiceSignature` via `Lawguistics.matchTarget()` and passes the signature; omits `origin` (defaults to `ROSTER_MEDIAN`). The 4th arg is optional, so emit's 3-arg call type-checks. **This is the B2 ack.** Supersedes harness `01-contracts.md §2.1/§2.2` and the `P3` emit snippet's `target = { lawyerId }`. |
| **R2** | Both lanes claimed to ship `lawguistics/index.ts`; P3 also assumed a `mock.ts` that the Lawguistics layout doesn't have. | **Lawguistics owns the whole `lawguistics/` dir and ships it first (Stage 0).** No `mock.ts` — the stage-0 identity lives in `index.ts.condition`. Harness P3 shrinks to **`store.ts` + `emit.ts` only** and consumes the already-present `Lawguistics`. The harness never edits `lawguistics/**`. |
| **R3** | Stage-0 stubs `throw NOT_IMPL`, but `emit` (per R1) calls `matchTarget`, and the harness must run e2e on identity. | At Stage 0, **`condition` returns identity** `{conditioned:text, baseline:text}`, **`drift.forStage` returns `0`**, and **`matchTarget`/`getSignature` return a frozen neutral stub `VoiceSignature`** (do not throw). The remaining methods (`measure`/`convergence`/`lsm`/`judgeFidelity`/`getLawyer`) may throw until their stages land — the harness doesn't call them during stage-0 intake. |
| **R4** | Canonical type ownership: harness P0 stubs `Stage`/`Lawyer`; Lawguistics `types.ts` defines them too, with `PracticeArea` PascalCase vs. harness's lowercase `'criminal'`. | **Canonical in `lawguistics/types.ts` (Stage 0):** `Stage`, `Lawyer`, `PracticeArea`, `MetricVector`, `VoiceSignature`, `VoiceBrief`, `ConditionResult`, `MetricRanges`. The harness **imports** these (adopt PascalCase `PracticeArea`). **Harness-owned** (stay in harness lane): `RawTurn`, `RawSummary`, `CaseState`, `Turn`, `AgentId`, `Agent`, `ConditionedView`, `ConditionedSummary`, `AnswerPayload`, `Run`. |
| **R5** | Reveal stats (convergence/lsm) must be "persisted during intake," but harness `emit` predates `Lawguistics.measure/convergence`. | Extend `StoredTurn` with optional `stats?: { convergence: number; lsm: number }`. `emit` populates it (`measure(conditioned)` → `convergence`/`lsm` vs. `target.metrics`) **only once Lawguistics is real (Phase D)**. Stage-0 stores **no** stats — panels are identical by design, nothing to measure. |
| **R6** | The cleave needs a no-generation read of baselines+stats, but routes (§1.14) only define start/answer/refresh. | Add **`GET /api/session/[id]`** → `{ turns: StoredTurn[], signature: VoiceBrief }` (pure read of the store + `getSignature().brief`; **no model call**). Owned by the UX cleave row (U5). |
| **R7** | Two test runners (harness `vitest` vs. Lawguistics `node --test`); two model constants (harness `ai/client.ts` vs. Lawguistics `ai.ts`). | **Both intentional, both kept.** Lawguistics stays self-contained (`node --test`, its own `ai.ts` importing the SDK directly) so it never edits shared files. Harness uses `vitest` for its pure-TS modules. The documented one-file swap path (Lawguistics `ai.ts` → delegate to `@/lib/services/ai`) is a post-demo nicety, not on this critical path. |

**Lane geography (unchanged):** harness → `src/lib/services/harness/**`, `services/ai/**`, `services/session/**`, `src/app/api/**`, `features/harness-tester/**`. Voice → `src/lib/services/lawguistics/**` (and **only** there). UX → `features/halo/**` + `globals.css` hue-strip. The `globals.css` hue-strip is a UX/harness-lane edit — Lawguistics must never touch it.

---

## Phase A — Foundation

| ✅ | ID | Deliverable | Lane doc | Done when | Commit |
|----|----|-------------|----------|-----------|--------|
| ☑ | **A1** | **Harness P0** — install `ai` + `@ai-sdk/anthropic` (zod already present), scaffold `src/lib/services/{harness,ai,session}/` + `features/`, `config.ts` (model id, turn budget N≈3, flags), harness-owned type stubs (**not** the R4-canonical shared types — those come in A2). | `lawson/P0-foundations.md` | `npm run dev` boots clean; deps in `package.json`; dirs + `config.ts` exist. | ✦ commit |
| ☑ | **A2** | **Lawguistics Stage 0 — the contract.** `types.ts` (R4-canonical shared types), `index.ts` (brand object: `condition`=identity, `drift.forStage`=0, `matchTarget`/`getSignature`=neutral stub sig per R3; rest throw), `ai.ts` (signatures-only stub). | `lawguistics/stage-0-contract.md` | `npx tsc --noEmit` passes; `import { Lawguistics } from "@/lib/services/lawguistics"` type-checks all 9 members; harness can import the shared types. **This is the B2 ack — R1 signature is now frozen.** | ✦ commit |

> A2 is the gate the whole build pivots on. ~15 min of work; do it deliberately because every later row codes against it.

## Phase B — Harness, interface-independent (gate: A1)

| ✅ | ID | Deliverable | Lane doc | Done when | Commit |
|----|----|-------------|----------|-----------|--------|
| ☑ | **B1** | **Harness P1** — `services/ai/client.ts` (the sole harness-side SDK importer) + prompt registry. Read `node_modules/next/dist/docs/01-app/.../route-handlers.md` first (B7). | `lawson/P1-ai-client.md` | A `generateObject`/`generateText` call returns; model id from one constant. | ✦ commit |
| ☑ | **B2** | **Harness P2** — `slots/encode.ts` (`parse`/`serialize` for `[[key:free:ph]]` + `[[key:select:a\|b\|c]]`) + add `vitest` + `test` script + unit tests. | `lawson/P2-slots.md` | `parse∘serialize` round-trips; `npm test` green on slots. | ✦ commit |

## Phase C — Harness spine on stage-0 identity (gate: A2 + B1 + B2)

| ✅ | ID | Deliverable | Lane doc | Done when | Commit |
|----|----|-------------|----------|-----------|--------|
| ☑ | **C1** | **Harness P3 (reduced per R2)** — `session/store.ts` (canonical `Map`, holds `{conditioned,baseline}` per field; `StoredTurn` carries the optional `stats?` slot from R5, unused now) + `emit.ts` gateway. emit resolves the signature via `matchTarget` (R1), walks register-bearing fields, validates slot preservation, persists both registers. **Does not create `index.ts`/`mock.ts`.** | `lawson/P3-seam-store-gateway.md` (+R1/R2/R5) | Hand-built `RawTurn`/`RawSummary` through `emit` on identity: conditioned==baseline, both stored, slots intact. Grep proves `emit.ts` is the only `Lawguistics.condition` caller. | ✦ commit |
| ☑ | **C2** | **Harness P4** — `triage.ts` (`bootstrap`/`selectAgent`/`recalibrate`/`composeSummary`) + LLM lawyer-matching against the **stub roster** (B1 unblock-stub: 3 distinct lawyers behind the canonical `Lawyer` shape, one `hero:true` Criminal). | `lawson/P4-triage.md` | Seed → `CaseState` with a matched `lawyerId` + rationale; matching genuinely discriminates the stub summaries. | ✦ commit |
| ☑ | **C3** | **Harness P5** — five bench agents (`claim-quant`, `merits-analyst`, `criminal`, `real-estate`, `commercial`), each `composeTurn → RawTurn` (3 scaffolds w/ slots, freeform always present). Stateless. | `lawson/P5-bench.md` | Each agent returns a well-formed `RawTurn` for a given `CaseState`. | ✦ commit |
| ☑ | **C4** | **Harness P6** — `loop.ts` (`Lawson`): `start`/`answer`/`refreshSummary`, holds `caseState`, **the only `emit` caller**. | `lawson/P6-loop.md` | Grep proves `loop.ts` is the sole `emit` caller; a scripted seed→answers→summary run produces conditioned views. | ✦ commit |
| ☑ | **C5** | **Harness P7** — route handlers (`POST /api/lawson/start\|answer\|refresh-summary`, 1:1 with `Lawson`, return conditioned only) + interactor surface (`start`/`answer`/`fillSlot` local-only/`refreshSummary`). | `lawson/P7-routes-interactor.md` | Routes return conditioned views; interactor drives a full intake from the client. | ✦ commit |
| ☐ | **C6** | **Harness P8** — throwaway monochrome tester under `features/harness-tester/` (NOT Halo) + end-to-end verify on identity. | `lawson/P8-mvp-tester.md` | Full seed→turns→summary runs in-browser; baseline==conditioned everywhere; both registers in the store. **Plumbing proven.** | ✦ commit + tag `stage-0-e2e` |

> **Milestone after C6:** the entire harness runs end-to-end. The demo's skeleton is real; only the *voice* is still identity.
>
> **No synthetic data needed to run or test Phase C.** This is the "pipes before water" guarantee, so it's worth stating outright: the harness is fully exercisable — seed → adaptive turns → summary, slots, store, routes — on **zero generated data**. Triage matches against the **B1 stub roster** (`roster.stub.ts`: 3 hand-written lawyers, distinct summaries, one `hero` Criminal). `emit`'s `matchTarget` returns the **neutral stub signature** (R3) and ignores the id, so there's no `signatures.json` lookup and no crash on stub ids. `condition` identity-passes. Synthetic firm/signature generation (**D2/D4**) is a **voice-lane step in Phase D, not a harness prerequisite** — the only things it unlocks are panel *divergence* and *real* convergence/LSM numbers. The handoff is **D6** (swap stub roster → `listLawyers()` + enable emit stats), where Triage and `matchTarget` flip to real ids together so they stay consistent.

## Phase D — Lawguistics real voice (gate: A2; needs `ai`/zod from A1)

Build 1a/1b/1c against the Stage-0 types; 1b is the long pole (two sequential LLM-gen steps) — **front-load D2**.

| ✅ | ID | Deliverable | Lane doc | Done when | Commit |
|----|----|-------------|----------|-----------|--------|
| ☐ | **D1** | **Stage 1a — metrics core.** `metrics.ts` (`measure`/`normalise`/`denormalise`/`computeRanges`), `stats.ts` (`convergence`/`lsm`), `directives.ts` (`metricsToDirectives`), `drift.ts` (`forStage` real values + `targetVector`), `metrics.test.ts`. Pure TS, zero AI. | `lawguistics/stage-1a-metrics-core.md` | `node --test` green; `convergence(v,v)===0`, `lsm(v,v)≈1`, `targetVector` endpoints check out. | ✦ commit |
| ☐ | **D2** | **Stage 1b — data gen (LONG POLE).** Real `ai.ts` (`generateJSON` over the SDK; confirm the modified-Next/SDK surface) + `scripts/generate-firm.ts` → committed `data/firm.json` (6 lawyers, 2/area, 3–5 archetype-exaggerated corpus emails each, exactly one `hero:true` Criminal). | `lawguistics/stage-1b-data-gen.md` | `firm.json` committed; summaries distinct; corpus shows each archetype's tells; `ai.ts` is the only provider importer in the module. | ✦ commit |
| ☐ | **D3** | **Stage 1c — conditioning.** `condition.ts` (interpolate→directives→dual-gen→verify+gate, slot rails, baseline fallback) + `fidelity.ts` (`judgeFidelity` LLMaaJ). Code against fixtures until D2 lands. | `lawguistics/stage-1c-conditioning.md` | Slot-drop fixture and fact-altering fixture both fall back to baseline (stubbed `ai`); faithful content → `true`. | ✦ commit |
| ☐ | **D4** | **Stage 2 — signatures.** `scripts/build-signatures.ts` → committed `data/signatures.json` (per-lawyer `metrics`+`brief`, frozen `ranges`, `rosterMedian`) + `signatures.ts` loaders (`getLawyer`/`getSignature`/`matchTarget`/`listLawyers`, corpus stripped; `RANGES`/`ROSTER_MEDIAN`). | `lawguistics/stage-2-signatures.md` | `signatures.json` committed; hero metrics reflect clipped/directive corpus; `getLawyer` has no `corpus`; deterministic half reproduces. | ✦ commit |
| ☐ | **D5** | **Stage 3 — wire-up + tune.** Point `index.ts` brand methods at real impls (replace all `NOT_IMPL`, incl. neutral-stub `matchTarget`/`getSignature` → real); close `convergence` over frozen `RANGES`; bind `ROSTER_MEDIAN`. Write `README.md`. **Tune** corpus/signature/drift until the cleave pops. | `lawguistics/stage-3-wireup-tune.md` | All 5 end-to-end checks pass; no `NOT_IMPL` left; convergence falls as drift rises; changes only under `lawguistics/`. | ✦ commit + tag `voice-live` |
| ☐ | **D6** | **Integration: swap stub roster → `firm.json` + emit computes stats (R5).** Harness `Triage` matching now reads `Lawguistics.listLawyers()` instead of the stub roster; `emit` populates `StoredTurn.stats` via `measure`→`convergence`/`lsm` vs. `target.metrics`. | this doc (R1/R5) + `lawson/P4`,`P3` | Live intake matches against the real 6-lawyer roster; each stored turn carries real `stats`; baseline≠conditioned now visible in the store. | ✦ commit |

> **Milestone after D6:** real voice flows through the unchanged harness; both registers diverge; per-turn stats are persisted. The product is functionally complete — what remains is making it *land*.

## Phase E — UX polish + the cleave

`U0` (hue-strip + foundations) and `U6` (slide overlay) have near-zero gates and **may float earlier** (any time after A1 boots the app shell) — do them whenever convenient. Everything else follows the gates.

| ✅ | ID | Deliverable | Gate | Lane doc | Done when |
|----|----|-------------|------|----------|-----------|
| ☐ | **U0** | **G1 Foundations** — type scale, spacing/measure (one ~60–68ch centered column), motion policy, **hue-strip** `globals.css` (remap red `--destructive` ×2 + blue dark `--sidebar-primary`; `.dark` may be deleted). | shadcn theme present (done) | `ux/01-foundations.md` | No hued oklch remains; type/spacing tokens established. *(May float early.)* |
| ☐ | **U1** | **G2 Intake surface** — `opening-prompt.tsx`, `turn-view.tsx` (preamble/question/framing/scaffolds/freeform/reassurance), `one-pager.tsx`. Replaces the throwaway tester (C6). Build the turn panel **split-ready** (a `panel.tsx` parameterized by register) per G5. | C6 (stage-0 e2e) + U0 | `ux/02-intake-surface.md` | Seed→turns render one-at-a-time, conditioned; one-pager via same renderer; tester deletable. |
| ☐ | **U2** | **G3 Slot-renderer** — inline free-text + select runs rendered as a fill-in-the-blank sentence; `fillSlot` local/instant; `serialize` on submit. | U1 + `slots/encode.ts` (B2) | `ux/02-intake-surface.md` | Inline slots fill instantly with no network; submit folds fills into the answer. |
| ☐ | **U3** | **G4 Wait state** — greyscale shimmer + crossfading erudite status phrases where the next turn lands (functional cover for routing latency). | U1 + interactor pending phase (C5) | `ux/02-intake-surface.md` | Routing wait reads as a calm "thinking" beat, no spinner. |
| ☐ | **U4** | **G5 Cleave choreography + synced panels** — `Ctrl/⌘+.` mitosis (~400–600ms) → ~3s hold → furniture; symmetric split, synced scroll, identical typography (left=baseline, right=conditioned). Reads stored registers only. | U1 split-ready + both registers persisted (C1) + **U5 read route** | `ux/03-the-cleave.md` | Cleave splits into two synced panels; nothing generates at reveal. |
| ☐ | **U5** | **R6 read route** — `GET /api/session/[id]` returning stored turns (both registers + `stats`) + `getSignature().brief`. Pure read, no model. | C5 routes scaffold + D4 (`brief`) | this doc (R6) | Endpoint returns baselines+stats+brief with zero model calls. |
| ☐ | **U6** | **G8 Slide overlay** — `Option/Alt+Ctrl+<n>` toggles a paint-only full-screen slide (content from `demo.md`); inert, guards against firing while typing. | app shell renders | `ux/04-slide-overlay-and-drift.md` | Overlay shows/dismisses; never mutates intake/cleave state. *(May float early.)* |
| ☐ | **U7** | **G7 Reveal furniture** — `signature-card.tsx` (brief label/moves/exemplarLine), `convergence-bar.tsx` (per-turn series shrinking), `lsm-badge.tsx` (NN% + citation). Fed by stored stats (R5) via U5. | D6 (real stats) + U4 + U5 | `ux/03-the-cleave.md` | Card names the voice; bar shrinks toward 0; LSM% shows with citation. |
| ☐ | **U8** | **G6 Contrast tuning** — verify panels diverge meaningfully on the real conditioner; if weak, fix **upstream** (D5 tuning knobs), never with UI/colour. | D5 (`voice-live`) + U4 | `ux/03-the-cleave.md` | Side-by-side voice difference is obvious in <5s; contrast is real, not faked. |
| ☐ | **U9** | **G9 Per-turn drift cue (optional)** — greyscale 0→1 indicator along the synced rows. **First cut-line if time is short.** | U4 + `drift.forStage` (D1) | `ux/04-slide-overlay-and-drift.md` | Drift ramp visible per row, greyscale only. *(Drop before anything core.)* |

> **Phase exit (Spec 04 §8 Definition of Done):** seed→adaptive conditioned turns with working inline slots; instant-local one-pager + explicit Refresh; calm thinking beat; `Ctrl/⌘+.` cleaves into two synced panels diffable in <5s; furniture sequencing (panels → ~3s hold → card+bar+badge); nothing generates at cleave time; no hue, no decorative motion outside the cleave; localStorage rehearsal mirror intact.

---

## Invariants carried through every row (never break)

1. `Lawson` is the only `emit` caller; `emit` is the only `Lawguistics.condition` caller — one provable choke point.
2. Everything renderable returns **both** registers and is persisted **during intake** — never generate at cleave time.
3. Slot tokens survive conditioning byte-identical — `emit` validates, falls back to baseline on violation.
4. Substance is register-invariant — tone differs, facts never do (`judgeFidelity` enforces; falls back to baseline on drift).
5. Dumb-component / interactor split; `services/` is UI-free; provider only behind `services/ai`, conditioning only behind `Lawguistics`.
6. Strict monochrome — no colour unless a spec explicitly names and unlocks one (none does).

## Critical path (the long pole)

```
A1 ─► A2 ─► C1…C6 (stage-0 e2e)
       └─► D1 ∥ [D2 ─► D4] ─► D3 ─► D5 ─► D6 ─► U7/U8
                  ▲ front-load D2: two sequential LLM-gen steps (firm → signatures)
```
D2 (generate-firm) → D4 (build-signatures) is two serial model-generation steps and the slowest chain in the build. Start it the moment A1's deps install, in parallel with the harness spine if you have the bandwidth.
