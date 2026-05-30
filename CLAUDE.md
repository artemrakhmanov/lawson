# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Read this first

- **`AGENTS.md` is binding** (imported above): this is a modified Next.js (16.2.6, React 19.2.4) with breaking changes vs. your training data. Read the relevant guide under `node_modules/next/dist/docs/` (`01-app/`, `02-pages/`, `03-architecture/`) before writing Next.js code, and heed deprecation notices.
- **`docspecs/` is the build plan and the source of truth.** The five specs (00→04) define the entire intended product; `demo.md` is the 3-minute showcase they serve. The repo is currently create-next-app boilerplate — `src/app/page.tsx` and `layout.tsx` are unmodified, and almost nothing in the specs is built yet. When implementing, read the relevant spec and follow its build order; the specs are precise about conventions and invariants.
  - 00 — stack, conventions, monochrome law, lawyer model · 01 — agent harness (discovery Q&A engine) · 02 — harness architecture + `emit` gateway + Lawguistics mock + slots + MVP UI seam · 03 — Lawguistics module (metrics, signatures, conditioning) · 04 — Halo UX + the cleave (side-by-side reveal).
- **Reading order to build:** 00 → 01 → 02 → 03 → 04. But the *first runnable end-to-end system* is Spec 02's **stage-0 identity mock** (`Lawguistics.condition` returns `{conditioned: text, baseline: text}`); build the plumbing on it before any real voice (Spec 03) exists.

## What Lawson is (one paragraph)

A warm legal intake (**Halo**) that, under the hood, runs every generated output through **Lawguistics** — a tool that bends the *sound* of the text from mirroring the user toward the voice of the matched lawyer. A hotkey (`Ctrl/⌘ + .`) **cleaves** the screen into two synced panels — flat baseline (left) vs. what the user was actually reading (right) — proving the bend with measured convergence numbers. Same facts in both panels; only the *sound* differs.

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` / `npm run start` — production build / serve
- **No test or lint script is configured.** Spec 03's pure-TS metric core and slot parser are explicitly "unit-testable" — if you add tests, also add the runner and script; don't assume one exists.
- Requires `ANTHROPIC_API_KEY` in `.env` (present). The AI SDK (`ai`, `@ai-sdk/anthropic`) is **not yet installed** despite being required by Spec 02 — install it when you start the harness. `zod` is already present (schemas are Zod per Spec 02 §2.2).

## Architecture — the hard rules (Spec 00 §3, Spec 02)

These are invariants, not style preferences. Every spec assumes them.

1. **Dumb component / interactor split.** For any non-trivial component `foo`, split `foo.tsx` (presentation only — renders props, fires callbacks, no `fetch`/model calls/orchestration) from `foo.interactor.ts` (all logic + networking, exposes a hook/functions). A reviewer should be able to delete the interactor and see an inert-but-valid UI.
2. **Reusable / infra logic lives in `services/`** — plain, framework-agnostic, UI-free modules (AI client, session store, signatures, harness). Interactors consume services; services never import UI.
3. **The raw/conditioned seam is sacred.** Anything that produces screen text returns **both** registers (`{baseline, conditioned}`) and goes through one service. The UI never calls a model directly and never sees only one register for a live turn.
4. **One `emit` gateway, structurally enforced (Spec 02 §5).** Agents/Triage return *raw substance*; `loop.ts` (`Lawson`) is the **only** caller of `emit`; `emit` is the **only** caller of `Lawguistics.condition`. There is no code path that returns unconditioned text to the UI. "Condition as the final step" is provable by inspecting one file.
5. **No file does two of {present, orchestrate, be-reusable-infra}.** If it does, split it.

### Intended module layout (Spec 02 §3 — the target, mostly unbuilt)

```
services/
  ai/client.ts          # the ONLY Vercel AI SDK importer; generateObject/generateText, temps, retries
  harness/
    loop.ts             # Lawson — orchestration, holds caseState, the ONLY caller of emit()
    triage.ts           # Triage — bootstrap / selectAgent / recalibrate / composeSummary
    emit.ts             # THE GATEWAY — conditions every field, persists both registers
    agents/             # ClaimQuant, MeritsAnalyst, CriminalCounsel, RealEstateCounsel, CommercialCounsel
    slots/encode.ts     # typed slot syntax + parse()/serialize() — shared by scaffolds, summary, UI
  lawguistics/
    index.ts            # the Lawguistics interface (real tool plugs in here)
    mock.ts             # swappable mock — stage 0 (identity) first, then stage 1 (model-backed)
    metrics.ts          # pure-TS, zero-dep MetricVector core (Spec 03 §3)
    drift.ts            # stage→drift schedule
  signatures/           # VoiceSignature per lawyer (metric vector + LLM-distilled brief) + data/firm.json
  session/store.ts      # canonical server-side state — in-memory module-singleton Map
features/halo/          # the UX surface (Spec 04): halo.tsx + halo.interactor.ts, slot-renderer, cleave/
```

All model work runs **server-side in Route Handlers**; the browser never holds a key or calls a model. Routes map 1:1 to `Lawson` methods (`start`/`answer`/`refreshSummary`) and return only the **conditioned** view during intake (baseline is pulled from the store at cleave time only).

### Domain language is the API (Spec 02 §9)

Use the product's own names so the code narrates the demo: **`Lawson`** (orchestrator), **`Triage`** (conductor), **`Lawguistics`** (`.condition(text, target, drift)`, `.drift.forStage(stage)`), and the bench agents as roles. `emit` stays lowercase — it's the deliberately-unglamorous choke point.

## Invariants you must not break (carried across specs)

- **Never generate at cleave time.** Both registers for every turn + the summary are produced and persisted to the session store *during intake*. The cleave only unhides. Any design needing model output at reveal time is wrong.
- **Substance is register-invariant** — the two panels differ only in *sound*, never in facts. Spec 03's `judgeFidelity` LLM-as-judge enforces this and falls back to baseline on any semantic drift. This is the compliance posture and the demo's integrity claim.
- **Slot tokens survive conditioning.** Slots are regex-delimited inline tokens (`[[key:free:placeholder]]`, `[[key:select:a|b|c]]`) used identically in scaffolds and the summary. `Lawguistics.condition` may reword prose but must return slot tokens unchanged; `emit` validates this and falls back to baseline on violation.
- **Provider only behind `services/ai`; conditioning only behind `Lawguistics`** — both swappable, server-only. Swapping the mock stages (0 → 1 → real) changes only `mock.ts`/`index.ts` internals; the harness and UI never move.
- **Metrics are computed, not estimated** (Spec 03) — the same naive splitter measures client text and lawyer corpus, so the reveal's convergence (normalised Euclidean → 0) and LSM% (Pennebaker function-word formula) are real numbers, not vibes.

## Styling law — strict monochrome (Spec 00 §4)

**No colour anywhere unless a spec explicitly names one.** Black, white, and a greyscale ramp only — contrast comes from greyscale + weight + space, never hue. shadcn/ui + Tailwind v4 are the component layer (`components.json`: style `radix-luma`, base `zinc`; tokens in `src/app/globals.css` as oklch CSS variables). The current `globals.css` still ships shadcn's default theme **including a hued `--destructive` red** — strip remaining hues when implementing per Spec 00 §4 (map primary/secondary/accent onto greyscale). Motion is reserved essentially for the cleave gesture. Self-check: if you typed a colour name or hued hex and no spec told you to, delete it.

## Conventions

- TypeScript, App Router, `strict` mode. Path alias `@/*` → `./src/*`.
- `cn()` (`src/lib/utils.ts`) merges Tailwind classes via `clsx` + `tailwind-merge`.
- Storage is **localhost only**: in-memory server-side `Map` is canonical; `localStorage` is a client mirror for rehearsal refresh-safety. No DB, no auth.
- Data contracts are **deliberately provisional** (Spec 00 §5) until Lawguistics finalises them — keep shared types thin; treat the conditioned unit as an opaque `{baseline, conditioned}` pair behind the seam.
