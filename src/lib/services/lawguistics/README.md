# Lawguistics

The voice module. It bends the *sound* of generated text from mirroring the user
toward the measured voice of a matched lawyer — same facts, different register —
and produces the numbers the cleave reveals. The harness imports only
`{ Lawguistics }` from `index.ts` and the shared types from `types.ts`; it never
reaches into this directory.

## The seam

```ts
Lawguistics.condition(text, target: VoiceSignature, drift, origin?: MetricVector)
  -> Promise<{ conditioned, baseline }>
```

- **Both registers, always.** `conditioned` is the lawyer-voiced text; `baseline`
  is flat/administrative. Substance is identical — only the sound differs.
- **Slot tokens survive byte-identical** (`[[key:free:ph]]`, `[[key:select:a|b|c]]`);
  a violation falls back to baseline.
- **Facts are gated.** `judgeFidelity` (LLM-as-judge) confirms no fact, number,
  ask, or commitment changed; on failure the field falls back to baseline. Tone,
  warmth, urgency, directness, and pleasantries are free to change — facts are not.
- **`origin?` is the contract-gap fix for the harness:** omit it and conditioning
  interpolates from the roster-median origin (`ROSTER_MEDIAN`). When the harness
  captures the client's own metric vector, pass it as `origin` so the bend is
  truly client → lawyer. **`condition` is async — `emit` must `await` it.**

## How the numbers are real (not vibes)

One naive splitter (`metrics.ts`) measures **both** client text and lawyer corpus,
so distances compare like with like. `convergence` is a normalised Euclidean
distance → 0 as the output approaches the lawyer; `lsm` is the Pennebaker
function-word formula → 1. Normalisation ranges are **frozen** in
`signatures.json`, so the reveal numbers are reproducible across runs.

> **Honest caveat (§3.4):** the naive sentence splitter mishandles abbreviations
> ("Dr.", "U.S."). Fine for the synthetic corpus + demo — and because *both* sides
> use the identical splitter, the comparison stays valid.

## Regenerating the data (order matters)

The committed JSON under `data/` is the demo's source of truth — offline and
deterministic. Don't regenerate casually before a demo. If you do, run both, in order,
and commit both:

```sh
node --env-file=.env src/lib/services/lawguistics/scripts/generate-firm.ts      # → data/firm.json
node --env-file=.env src/lib/services/lawguistics/scripts/build-signatures.ts   # → data/signatures.json
```

`build-signatures` reads `firm.json`; regenerating the firm without rebuilding
signatures leaves them inconsistent. The deterministic half (metrics, ranges,
median) reproduces exactly; only the LLM-distilled `brief` text varies.

## Tests

Pure-TS metric core (no network):

```sh
node --test --env-file=.env src/lib/services/lawguistics/metrics.test.ts
node --test --env-file=.env src/lib/services/lawguistics/condition.test.ts
```

Live end-to-end (real API calls, needs `ANTHROPIC_API_KEY`):

```sh
node --test --env-file=.env src/lib/services/lawguistics/wireup.test.ts
```

## Requirements

Node **≥ 22.6** (v23.x verified) for native TS stripping + `node --test` on
`.test.ts`. The module adds no test framework and no `package.json` script keys.
Older Node would need `tsx` — don't install it, just note it here.

## Module-local rules

- Erasable-only TS (no `enum`/`namespace`/param-properties — Node strips types).
- Relative imports use `.ts` extensions (Node runs these files directly;
  `allowImportingTsExtensions` is set so `tsc` and the bundler agree).
- `ai.ts` is the **only** file that imports a provider SDK.
- Tuning order if the cleave is weak (cheapest knob last): corpus exaggeration
  (`generate-firm`) → signature boldness (`build-signatures`) → drift spread
  (`drift.ts`, lower the floor / widen — don't lengthen) → surface prompts
  (`condition.ts`). The summary drift tops out at **0.9** (not 1.0): full voice
  over-reaches into invented characterisations that the fidelity gate kills.
