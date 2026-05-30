# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Read this first

- **`AGENTS.md` is binding** (imported above): this is a modified Next.js (16.2.6, React 19.2.4) with breaking changes vs. your training data. Read the relevant guide under `node_modules/next/dist/docs/` (`01-app/`, `02-pages/`, `03-architecture/`) before writing Next.js code — **especially Route Handlers** — and heed deprecation notices.
- **`docspecs/00-master-order.md` is THE build plan and the authoritative source of truth.** It is the single ordered, tickable sequence across all three lanes (harness → voice → UX) and it **resolves every cross-lane conflict (R1–R7)**. Where it differs from any other spec, it wins. Work it top-to-bottom; tick rows as code lands; commit at the marked points.
- **The conceptual specs (`docspecs/00`→`04`) are the design reference**; the lane folders decompose them into build sessions:
  - `docspecs/00`–`04` — product design: 00 stack/monochrome/lawyer model · 01 agent harness · 02 harness architecture + `emit` gateway + slots + UI seam · 03 Lawguistics (metrics/signatures/conditioning) · 04 Halo UX + the cleave.
  - `docspecs/lawson/` — harness phases (P0–P8) + `01-contracts.md` (the frozen type surface) + `02-seams-and-blockers.md`. `docspecs/lawguistics/` — voice stages (0, 1a/1b/1c, 2, 3). `docspecs/ux/` — polish gates (G1–G9). `demo.md` — the 3-minute showcase.
  - ⚠️ **Specs 02 and 03 carry superseded specifics** (a separate `mock.ts`, bare `services/` paths, a separate `signatures/` dir, a 3-arg `condition`). They have banners pointing at the master order — trust its resolved layout/seam over the prose in those two specs.
- The repo is still create-next-app boilerplate — `src/app/page.tsx`/`layout.tsx` unmodified, almost nothing in the specs is built yet.

## The build sequence (phases — full detail in `00-master-order.md`)

This is **not** a clean "harness, then voice, then UX" waterfall: the harness spine calls the `Lawguistics` interface, so the **voice contract (Stage 0) lands before the harness spine**, and the demo isn't real until voice does. The order interleaves:

- **Phase A — Foundation.** A1 harness P0 (install `ai`/`@ai-sdk/anthropic`, scaffold dirs, `config.ts`). A2 **Lawguistics Stage 0** — the canonical type contract + brand object with *runnable* stage-0 stubs (this is the B2 ack; everything pivots on it).
- **Phase B — Harness, interface-independent.** AI client; slots (+ `vitest`).
- **Phase C — Harness spine on stage-0 identity.** Store + `emit` gateway + Triage + bench agents + `Lawson` loop + routes + interactor + throwaway tester. **Runs end-to-end on the stub roster + identity passthrough with zero synthetic data** — baseline == conditioned, and that is correct ("pipes before water").
- **Phase D — Lawguistics real voice.** metrics core → generate firm (the long pole) → conditioning → signatures → wire-up & tune. D6 swaps the stub roster → real `firm.json` and turns on per-turn stats. **This is where synthetic data is generated — it is NOT a harness prerequisite.**
- **Phase E — UX polish + the cleave.** Foundations/hue-strip, intake surface, slot renderer, wait state, the cleave + read route, reveal furniture, contrast tuning, drift cue.

**First runnable system = Phase C** on the stage-0 identity (`Lawguistics.condition` returns `{conditioned: text, baseline: text}`, shipped in A2). You do **not** need lawyers/firm/signatures to build or test the harness — Triage matches a hardcoded 3-lawyer **stub roster** and `emit`'s `matchTarget` returns a **neutral stub signature**. Divergence and real numbers only appear after Phase D.

## Resolved cross-lane decisions (R1–R7 — baked in; do not reintroduce the old forms)

- **R1 — the conditioning seam is `Lawguistics.condition(text, target: VoiceSignature, drift, origin?: MetricVector)`.** `emit` resolves `lawyerMatch.lawyerId → VoiceSignature` via `Lawguistics.matchTarget()` and passes the signature (omitting `origin` → roster-median). There is **no** `Target = { lawyerId }` and no 3-arg form.
- **R2 — the voice lane owns all of `src/lib/services/lawguistics/`.** There is **no `mock.ts`**: the stage-0 identity lives in `index.ts.condition`. The harness only imports `{ Lawguistics }`; it never edits that dir.
- **R3 — stage-0 stubs are runnable, not throwing.** `condition`→identity, `drift.forStage`→`0`, `matchTarget`/`getSignature`→a frozen neutral signature. The rest throw `not implemented` until their stages land.
- **R4 — shared types are canonical in `lawguistics/types.ts`** (`Stage`, `Lawyer`, `PracticeArea` [**PascalCase**: `"Criminal"|"RealEstate"|"Commercial"`], `MetricVector`, `VoiceSignature`, `ConditionResult`, `MetricRanges`); the harness imports/re-exports them. Harness-owned types (`RawTurn`, `RawSummary`, `CaseState`, `ConditionedView`, …) live in the harness lane.
- **R5 — per-turn reveal stats** (`convergence`/`lsm`) are computed by `emit` and persisted on `StoredTurn.stats` **during intake** — but only once voice is real (Phase D). Stage-0 stores none (panels identical by design).
- **R6 — the cleave read route is `GET /api/session/[id]`** (pure read of the store + `getSignature().brief`, **no model call**), built in the UX lane.
- **R7 — two test runners by lane:** `vitest` for harness pure-TS; `node --test` (native TS) for `lawguistics/`. The voice lane adds **no** deps and **no** `package.json` script keys.

## What Lawson is (one paragraph)

A warm legal intake (**Halo**) that, under the hood, runs every generated output through **Lawguistics** — a tool that bends the *sound* of the text from mirroring the user toward the voice of the matched lawyer. A hotkey (`Ctrl/⌘ + .`) **cleaves** the screen into two synced panels — flat baseline (left) vs. what the user was actually reading (right) — proving the bend with measured convergence numbers. Same facts in both panels; only the *sound* differs.

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` / `npm run start` — production build / serve
- `npm test` — `vitest` over the harness's pure-TS modules (slots, etc.). **Added in harness P2 (R7/B5)** — not in the boilerplate; don't assume it exists before then.
- **Lawguistics runs under Node's native TS** (no bundler, no test framework): tests `node --test --env-file=.env src/lib/services/lawguistics/metrics.test.ts`; generators `node --env-file=.env src/lib/services/lawguistics/scripts/generate-firm.ts` then `build-signatures.ts`. Requires **Node ≥ 22.6**.
- Requires `ANTHROPIC_API_KEY` in `.env` (present). The AI SDK (`ai`, `@ai-sdk/anthropic`) is installed in **A1/P0** — not in the boilerplate. `zod` is already present.

## Architecture — the hard rules (Spec 00 §3)

These are invariants, not style preferences.

1. **Dumb component / interactor split.** For any non-trivial component `foo`, split `foo.tsx` (presentation only — renders props, fires callbacks, no `fetch`/model calls/orchestration) from `foo.interactor.ts` (all logic + networking, exposes a hook/functions). A reviewer should be able to delete the interactor and see an inert-but-valid UI.
2. **Reusable / infra logic lives in `src/lib/services/`** — plain, framework-agnostic, UI-free modules (AI client, session store, the harness, the Lawguistics voice module). Interactors consume services; services never import UI.
3. **The raw/conditioned seam is sacred.** Anything that produces screen text returns **both** registers (`{baseline, conditioned}`) and goes through one service. The UI never calls a model directly and never sees only one register for a live turn.
4. **One `emit` gateway, structurally enforced.** Agents/Triage return *raw substance*; `loop.ts` (`Lawson`) is the **only** caller of `emit`; `emit` is the **only** caller of `Lawguistics.condition`. No code path returns unconditioned text to the UI. "Condition as the final step" is provable by inspecting one file.
5. **No file does two of {present, orchestrate, be-reusable-infra}.** If it does, split it.

### Module layout (resolved — replaces Spec 02 §3)

```
src/lib/services/
  config.ts             # model id, turn budget N≈3, temps, fixedFallback steering flag
  ai/client.ts          # the harness-side Vercel AI SDK importer; generateObject/generateText
  harness/              # HARNESS LANE
    contracts.ts        # harness-owned types + re-exports of the R4-shared types from lawguistics
    roster.stub.ts      # B1 stub roster (3 lawyers, one hero Criminal) — swapped for firm.json at D6
    loop.ts             # Lawson — orchestration, holds caseState, the ONLY caller of emit()
    triage.ts           # Triage — bootstrap / selectAgent / recalibrate / composeSummary + matching
    emit.ts             # THE GATEWAY — resolves target via matchTarget(R1), conditions every field,
                        #   persists both registers (+ stats in Phase D, R5)
    agents/             # claim-quant, merits-analyst, criminal, real-estate, commercial (stateless)
    slots/encode.ts     # typed slot syntax + parse()/serialize() — shared by scaffolds, summary, UI
  session/store.ts      # canonical server-side state — in-memory module-singleton Map;
                        #   holds {conditioned,baseline} (+ stats?) per field
  lawguistics/          # VOICE LANE — owns this WHOLE dir; harness only imports { Lawguistics } (R2)
    types.ts            # CANONICAL shared types (R4); zero runtime
    index.ts            # the Lawguistics brand object; stage-0 identity lives in .condition — NO mock.ts
    metrics.ts stats.ts directives.ts drift.ts   # pure-TS metric core, reveal stats, vector→directives, drift schedule
    condition.ts fidelity.ts ai.ts               # dual-gen conditioner, LLMaaJ gate, module-local AI wrapper
    signatures.ts       # getLawyer/getSignature/matchTarget + loaders (consolidated here — NO separate signatures/ dir)
    data/firm.json data/signatures.json          # GENERATED + committed (Phase D)
    scripts/ metrics.test.ts README.md
src/app/api/lawson/{start,answer,refresh-summary}/route.ts   # POST, 1:1 with Lawson, conditioned-only
src/app/api/session/[id]/route.ts                            # GET, cleave read (R6) — UX lane, no model call
features/harness-tester/   # throwaway MVP tester (harness P8) — deletable once Halo lands
features/halo/             # the UX surface (Spec 04): halo.tsx + interactor, slot-renderer, cleave/
```

All model work runs **server-side in Route Handlers**; the browser never holds a key or calls a model. Intake routes (`start`/`answer`/`refreshSummary`) return only the **conditioned** view; baseline + stats are pulled from the store at cleave time via `GET /api/session/[id]`.

### Domain language is the API (Spec 02 §9)

Use the product's own names so the code narrates the demo: **`Lawson`** (orchestrator), **`Triage`** (conductor), **`Lawguistics`** (`.condition(text, target: VoiceSignature, drift, origin?)`, `.matchTarget(lawyerId)`, `.drift.forStage(stage)`, `.measure`/`.convergence`/`.lsm`/`.getSignature`), and the bench agents as roles. `emit` stays lowercase — it's the deliberately-unglamorous choke point.

## Invariants you must not break

- **Never generate at cleave time.** Both registers for every turn + the summary (and, in Phase D, the per-turn stats) are produced and persisted to the session store *during intake*. The cleave only unhides (`GET /api/session/[id]`). Any design needing model output at reveal time is wrong.
- **Substance is register-invariant** — the two panels differ only in *sound*, never in facts. `Lawguistics.judgeFidelity` (LLM-as-judge) enforces this and falls back to baseline on any semantic drift. This is the compliance posture and the demo's integrity claim.
- **Slot tokens survive conditioning.** Slots are regex-delimited inline tokens (`[[key:free:placeholder]]`, `[[key:select:a|b|c]]`) used identically in scaffolds and the summary. `Lawguistics.condition` may reword prose but must return slot tokens byte-identical; `emit` validates this and falls back to baseline on violation.
- **Provider only behind `src/lib/services/ai` (harness) and the module-local `lawguistics/ai.ts` (voice); conditioning only behind `Lawguistics`** — server-only, swappable. Promoting stage 0 → 1 → real changes only internals of `lawguistics/` (`index.ts`/`condition.ts`); the harness and UI never move.
- **Metrics are computed, not estimated** — the same naive splitter measures client text and lawyer corpus, so the reveal's convergence (normalised Euclidean → 0) and LSM% (Pennebaker function-word formula) are real numbers, not vibes.

## Styling law — strict monochrome (Spec 00 §4)

**No colour anywhere unless a spec explicitly names one.** Black, white, and a greyscale ramp only — contrast comes from greyscale + weight + space, never hue. shadcn/ui + Tailwind v4 are the component layer (`components.json`: style `radix-luma`, base `zinc`; tokens in `src/app/globals.css` as oklch CSS variables). `globals.css` still ships shadcn's default theme **including a hued `--destructive` red** (+ a blue dark `--sidebar-primary`) — these are stripped in UX row **U0 (G1)**; map primary/secondary/accent onto greyscale. Motion is reserved essentially for the cleave gesture. Self-check: if you typed a colour name or hued hex and no spec told you to, delete it.

## Conventions

- TypeScript, App Router, `strict` mode. Path alias `@/*` → `./src/*`.
- `cn()` (`src/lib/utils.ts`) merges Tailwind classes via `clsx` + `tailwind-merge`.
- Storage is **localhost only**: in-memory server-side `Map` is canonical; `localStorage` is a client mirror for rehearsal refresh-safety. No DB, no auth.
- **Shared data contracts are FROZEN** (resolved by the master order R1–R7) — the conditioned unit is the `{baseline, conditioned}` pair behind the seam; the R4-shared types live canonically in `lawguistics/types.ts` and the harness imports them. Leaf field names in `RawTurn`/`RawSummary` are ~90% stable; the seam boundaries are fixed. (This supersedes Spec 00 §5's "deliberately provisional" framing.)
- **Inside `lawguistics/` only:** erasable-only TS (no `enum`/`namespace`/constructor param-properties — Node strips types natively); app-graph imports are extensionless, `.ts`-extension relative imports only in its `scripts/` + `*.test.ts`.
