# Lawguistics — Module Overview & Build Charter

> Per-stage build plan for the **Lawguistics** module. Read `docspecs/03-lawguistics-module.md` first (the full design); this folder slices it into parallelizable stages, each handable to a fresh agent. Section refs below (§N) point into spec 03.

## What this module is

Lawguistics bends the *sound* of generated text from mirroring the user toward the voice of the matched lawyer, and proves it with **real measured numbers**. The thesis: a voice signature is a **coupled pair** — a deterministic *metric vector* (computed, driftable) that **constrains**, and a nondeterministic *style brief* (LLM-distilled) that **flavours**. Drift is literal interpolation through metric-space. Built **first in wall-clock terms** because Lawson needs lawyers to match and signatures to bend toward before the harness has anything real to condition.

## Isolation rules (every agent on this module obeys)

This module is built **in parallel with other agents who own the core app**. To avoid collisions:

- **Stay inside `src/lib/services/lawguistics/`.** Never edit `src/app/**`, `src/lib/services/lawson/**`, `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, or `globals.css`. If you think you must, stop and flag it.
- **Zero new dependencies, zero shared-file edits.** Use the `ai` SDK + `zod` (installed by the harness team). Do **not** add `tsx`, a test runner, or npm script keys.
- **Erasable-only TS** in our `.ts` files: no `enum`, no `namespace`, no constructor parameter-properties. Node 23 strips types natively and rejects non-erasable syntax. Use `const` objects + union types instead of enums.
- **`.ts`-extension relative imports only in `scripts/` and `*.test.ts`** (run under Node directly, outside the Next bundler graph). App-graph files (`index.ts` and its transitive imports) use **extensionless** imports so `next dev` resolution is untouched.
- **Server-only.** `ai.ts` and anything reading `ANTHROPIC_API_KEY` never ships to the browser.
- Imports use the existing alias: `@/lib/services/lawguistics/...` (`@/*` → `./src/*`, already configured).

## File layout (everything consolidated under one dir)

```
src/lib/services/lawguistics/
  types.ts            # CONTRACT: MetricVector, VoiceSignature, Lawyer, Stage, condition I/O. Zero runtime.
  index.ts            # CONTRACT: the `Lawguistics` brand object + re-exports (the only public surface)
  metrics.ts          # measure(text)->MetricVector, normalise(), computeRanges() — pure TS, zero-dep (§3)
  stats.ts            # convergence(out,lawyer)->number (Euclidean→0), lsm(a,b)->number (Pennebaker→1) (§7)
  directives.ts       # metricsToDirectives(v)->string[] — banded, deterministic (§6.2)
  drift.ts            # drift.forStage(stage)->number + targetVector(origin,lawyer,drift) lerp (§5)
  ai.ts               # module-local wrapper over `ai` SDK — the single AI boundary, swappable seam
  condition.ts        # condition(text,target,drift,origin?) dual-gen + slot-check + fidelity gate (§6)
  fidelity.ts         # judgeFidelity(substance,baseline,conditioned) LLMaaJ gate (§6.4b)
  signatures.ts       # getLawyer/getSignature/matchTarget + firm.json/signatures.json loaders
  data/firm.json      # GENERATED, committed: roster + exaggerated per-archetype corpus, hero marked (§2)
  data/signatures.json# GENERATED, committed: VoiceSignature per lawyer + frozen normalisation ranges (§4)
  scripts/generate-firm.ts     # offline: LLM → firm.json (§2.4)
  scripts/build-signatures.ts  # offline: firm.json + metrics + LLM brief → signatures.json (§4.2)
  metrics.test.ts     # node --test unit tests on the corpus
  README.md           # honest caveat (§3.4 naive splitter) + how to run/regenerate
```

## The public contract (what the harness/UI import)

The **only** surface other modules touch — the `Lawguistics` brand object plus re-exported types/helpers. Detailed in `stage-0-contract.md`:

- `Lawguistics.condition(text, target: VoiceSignature, drift: number, origin?: MetricVector) -> { conditioned, baseline }`
- `Lawguistics.judgeFidelity(substance, baseline, conditioned) -> { faithful, drift_notes? }`
- `Lawguistics.drift.forStage(stage) -> number`
- `Lawguistics.measure(text) -> MetricVector`
- `Lawguistics.convergence(output, lawyer) -> number`, `Lawguistics.lsm(a, b) -> number`
- `Lawguistics.getSignature(lawyerId) -> VoiceSignature`, `Lawguistics.getLawyer(id) -> Lawyer`, `Lawguistics.matchTarget(lawyerId) -> VoiceSignature`

**Contract gap surfaced (additive, non-breaking):** Spec 02's seam is `condition(text, target, drift)` but drift is defined as client→lawyer interpolation (§5), and this isolated module can't read the harness session store. Resolution: add optional `origin?: MetricVector`. Omitted → interpolate from a **frozen roster-median (neutral)** vector; when ready the harness passes the captured client vector. The 3-arg call stays valid. **Flag this to whoever owns the Spec 02 seam.**

## Stage DAG (for parallel agents)

| Stage | Doc | Gates on | Parallel with |
|---|---|---|---|
| 0 — contract | `stage-0-contract.md` | nothing (build first) | — (blocks all) |
| 1a — metrics core | `stage-1a-metrics-core.md` | Stage 0 types | 1b, 1c |
| 1b — data gen | `stage-1b-data-gen.md` | Stage 0 types + `ai` SDK installed | 1a, 1c |
| 1c — conditioning | `stage-1c-conditioning.md` | Stage 0 types + `directives`/`drift` shapes | 1a, 1b |
| 2 — signatures | `stage-2-signatures.md` | `firm.json` (1b) **and** `metrics.ts` (1a) | — |
| 3 — wire-up + tune | `stage-3-wireup-tune.md` | all above | — |

**Critical path:** Stage 0 → (`ai.ts` ∥ `metrics.ts`) → generate-firm → `firm.json` → build-signatures → `signatures.json` → condition wire-up. The two sequential LLM-gen steps (firm, then signatures) are the long pole — **front-load Stage 1b.**

## AI seam

`ai.ts` is the module's single AI boundary: a thin wrapper over the shared `ai` SDK (`generateObject` with zod schemas for firm/brief/judge; `generateText`/`generateObject` for dual-gen). It imports the SDK **directly**, not the harness's `services/ai/client.ts` (which may not exist yet) — keeping us decoupled. One-file swap path documented: later `ai.ts` can delegate to `@/lib/services/ai` without touching any caller. Offline scripts use it freely (dev-time, not subject to the runtime "provider behind services/ai" invariant).

## Running & testing (no shared edits — Node 23 native TS)

- **Unit tests:** `node --test --env-file=.env src/lib/services/lawguistics/metrics.test.ts`
- **Generate firm:** `node --env-file=.env src/lib/services/lawguistics/scripts/generate-firm.ts`
- **Build signatures:** `node --env-file=.env src/lib/services/lawguistics/scripts/build-signatures.ts`
- No `tsx`, no test framework, no package.json script keys. **Unavoidable shared edits: none.**
- Requires Node ≥ 22.6 (v23.x verified present) for native TS stripping + `node --test` on `.test.ts`. Older Node is the one case that would need `tsx` — note it in README, don't install.

## End-to-end verification (after Stage 3)

1. `node --test` green on `metrics.test.ts`.
2. `firm.json`: 6 lawyers (2× each of Criminal/RealEstate/Commercial) + 3–5 corpus emails each, exactly one `hero:true`.
3. `signatures.json`: one `VoiceSignature` per lawyer with non-empty `brief` + a frozen ranges block.
4. Smoke: `Lawguistics.condition("Your exposure is significant. [[next:free:...]]", getSignature(heroId), 1.0)` →
   - `{conditioned, baseline}` both retain `[[next:free:...]]` verbatim;
   - `judgeFidelity(substance, baseline, conditioned)` → `faithful:true`;
   - `convergence(measure(conditioned), heroMetrics)` at drift 1.0 **lower** than at drift 0.15;
   - `lsm` returns a 0..1 number.
5. `git status` shows changes **only** under `src/lib/services/lawguistics/`.

## Invariants this module upholds (§10)

- Same splitter for client and lawyer → distances are meaningful.
- Metrics computed, not estimated → reveal numbers are real.
- Drift = interpolation origin→lawyer → smooth, sub-threshold bend.
- Conditioning = metric targets (constrain) + brief (flavour).
- Vector translated to **banded directives**, never injected as raw floats.
- Semantic-fidelity gate runs **before storage**; failure falls back to baseline.
- Slot tokens preserved; facts unchanged.
- Everything behind the `Lawguistics` interface → harness/UI never change when the conditioner improves.
