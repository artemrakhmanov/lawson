# Stage 3 — Wire-up + Tune

> Replace the Stage-0 stubs with the real implementations, close the loops over the frozen data, run the end-to-end smoke, and tune until the cleave pops. Gates on all prior stages. Spec refs → §6, §7, §8, §9 step 8.

## Goal

Make `Lawguistics` (the brand object in `index.ts`) fully live: every public method backed by real impls, reading `signatures.json` for metrics/brief/ranges/median. Then tune the contrast so the demo lands.

## Files to edit

- `src/lib/services/lawguistics/index.ts` — point the brand methods at real impls (replace `NOT_IMPL`).
- `src/lib/services/lawguistics/README.md` — write it (caveat + run/regenerate instructions).
- Touch-ups only in `condition.ts` / `stats.ts` to bind the frozen `RANGES`/`ROSTER_MEDIAN` from `signatures.ts`.

## Wire `index.ts`

```ts
import { measure } from "./metrics";
import { convergence as _convergence, lsm } from "./stats";
import { forStage } from "./drift";
import { condition as _condition } from "./condition";
import { judgeFidelity } from "./fidelity";
import { getLawyer, getSignature, matchTarget, RANGES } from "./signatures";

export const Lawguistics = {
  condition: _condition,                                  // (text, target, drift, origin?) -> Promise<{conditioned,baseline}>
  judgeFidelity,                                          // exposed for testing/audit; condition runs it internally
  drift: { forStage },
  measure,
  convergence: (out, lawyer) => _convergence(out, lawyer, RANGES),  // close over frozen ranges → public 2-arg sig
  lsm,
  getSignature, getLawyer, matchTarget,
};
```

Bind the frozen data where the public signatures hide `ranges`:
- `Lawguistics.convergence(output, lawyer)` closes over `RANGES` (Stage 0's 2-arg contract; `stats.convergence` takes ranges internally).
- `condition` reads `RANGES` + `ROSTER_MEDIAN` from `signatures.ts` for `targetVector` and the `origin ?? ROSTER_MEDIAN` default.

## End-to-end smoke (Stage 0 verification, now real)

Write a throwaway `*.test.ts` (or script) and run with `node --test --env-file=.env`:

1. `node --test` green on `metrics.test.ts`.
2. `firm.json`: 6 lawyers (2× each area), 3–5 corpus emails each, exactly one `hero:true`.
3. `signatures.json`: one `VoiceSignature` per lawyer with non-empty `brief` + `ranges` + `rosterMedian`.
4. With `heroId = the hero lawyer`:
   ```ts
   const sig = Lawguistics.getSignature(heroId);
   const r1 = await Lawguistics.condition("Your exposure is significant. [[next:free:describe]]", sig, 1.0);
   const r015 = await Lawguistics.condition("Your exposure is significant. [[next:free:describe]]", sig, 0.15);
   ```
   - both `r1.conditioned`/`r1.baseline` retain `[[next:free:describe]]` verbatim;
   - `(await Lawguistics.judgeFidelity(substance, r1.baseline, r1.conditioned)).faithful === true`;
   - `Lawguistics.convergence(measure(r1.conditioned), sig.metrics)` **<** `Lawguistics.convergence(measure(r015.conditioned), sig.metrics)` (gap closes as drift rises);
   - `Lawguistics.lsm(measure(r1.conditioned), sig.metrics)` is a 0..1 number.
5. `git status` shows changes **only** under `src/lib/services/lawguistics/`.

## Tune until the cleave pops (§9 step 8)

Iterate in this order (cheapest knob last):
1. **Corpus exaggeration** (`generate-firm` archetype briefs) — boldest tells. Re-run 1b → 2 if changed.
2. **Signature boldness** (`build-signatures` distill prompt) — sharper `moves`/`exemplarLine`.
3. **Drift spread** (`drift.ts` `DRIFT_BY_STAGE`) — if contrast is weak, **lower the floor / widen the spread**, don't lengthen the schedule (§5.3).
4. **Surface-text prompts** (`condition.ts` assembly wording).

Target: the side-by-side cleave (Spec 04) shows an obvious voice difference at high drift, and the convergence bar **visibly falls** turn-over-turn while staying sub-threshold (imperceptible jump-to-jump).

## `README.md` content

- One-line honest caveat (§3.4): naive sentence splitter mis-handles abbreviations; fine because both sides use the identical splitter.
- How to regenerate: run `generate-firm` then `build-signatures` (order matters); commit both JSONs.
- How to run tests: the `node --test --env-file=.env ...` command.
- Node ≥ 22.6 requirement (native TS strip + `node --test`); older Node would need `tsx` (don't install — note only).
- The `condition(..., origin?)` contract-gap note for the harness team.

## What this module exposes (§8) — confirm all live

`Lawguistics.condition`, `.judgeFidelity`, `.drift.forStage`, `.measure`, `.convergence`, `.lsm`, `.getSignature`, `.getLawyer`, `.matchTarget`. Swapping mock→real changes only these internals; harness + UI untouched.

## Hand-off note to the harness/Spec-02 team

- `condition` is **async**; `emit` must `await` it.
- `condition` accepts optional `origin?: MetricVector` (the captured client vector). Until the harness captures it, the module uses `ROSTER_MEDIAN` — pass the real client vector when available to make drift truly client→lawyer.
- The reveal (Spec 04) reads `getSignature(id).brief` (label/moves/exemplarLine) + `convergence`/`lsm`. Both registers must be produced and persisted **during intake** — never generate at cleave time.

## Done-check

- All five end-to-end checks pass.
- `index.ts` has no remaining `NOT_IMPL`.
- Cleave contrast is obvious at high drift; convergence bar falls across stages.
- No edits outside `src/lib/services/lawguistics/`.
