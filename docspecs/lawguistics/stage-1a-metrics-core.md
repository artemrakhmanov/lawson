# Stage 1a — Metrics Core (pure TS, zero AI/network)

> The deterministic spine. Fully testable in isolation — no model, no network, no `firm.json` needed. Build in parallel with 1b and 1c. Gates only on Stage 0 types. Spec refs → `docspecs/03-lawguistics-module.md` §3, §5, §6.2, §7.

## Goal

Implement every **computed** number and the deterministic transforms that ride on top of it: measurement, normalisation, the stage→drift schedule + interpolation, the vector→directives translator, and the two reveal stats. All pure functions over the Stage-0 types.

## Files to create

- `src/lib/services/lawguistics/metrics.ts` — `measure`, `normalise`, `denormalise`, `computeRanges`.
- `src/lib/services/lawguistics/stats.ts` — `convergence`, `lsm`.
- `src/lib/services/lawguistics/directives.ts` — `metricsToDirectives`.
- `src/lib/services/lawguistics/drift.ts` — `forStage`, `targetVector`.
- `src/lib/services/lawguistics/metrics.test.ts` — `node --test` unit tests.

## `metrics.ts` (§3)

### Tokenization — naive, deterministic (§3.1). **This exact splitter is used for BOTH client text and lawyer corpus** — that invariant is what makes distances meaningful.

```ts
const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
const words = text.toLowerCase().match(/\b[\w']+\b/g) ?? [];
```

### `measure(text) -> MetricVector` (§3.3) — counts-and-divisions only:
- `meanSentenceLen` / `sentenceLenVariance` — word-count per sentence; mean and **population** variance.
- `ttr` — `new Set(words).size / words.length`.
- `hedgeRatio` — count from a hardcoded hedge list `[may, might, could, perhaps, possibly, generally, typically, arguably, relatively, somewhat, likely, tend to, it seems]` / `words.length`.
- `directness` — sentences whose first word ∈ imperative-starter list `[call, send, file, do, get, bring, stop, sign, review, check, …]` / sentence count.
- `youDensity` — occurrences of `you` / `words.length`.
- `fnPronoun/fnArticle/fnPrep/fnConj/fnAux` — five **closed-set** categories (hardcoded constant arrays); each = category matches / `words.length`.
- `commaRate` / `questionRate` / `dashRate` — punctuation counts normalised **per sentence** (questionRate = `?`-ending sentences / sentences; dashRate = em-dashes / sentence).

> Guard divide-by-zero (empty text → all zeros). Closed sets live as `const` arrays at top of file.

### Normalisation (§3.5)
```ts
computeRanges(vectors: MetricVector[]): MetricRanges   // per-dim min/max across roster
normalise(v: MetricVector, ranges: MetricRanges): MetricVector   // each dim → 0..1
denormalise(v: MetricVector, ranges: MetricRanges): MetricVector // inverse, for readable targets
```
Iterate dimensions via `METRIC_KEYS`. Normalisation is **mandatory** before any Euclidean distance or interpolation — raw dims have wildly different ranges (sentence length ~8–28 vs. hedgeRatio ~0–0.05). Clamp normalised values to [0,1]; if `max==min` for a dim, map to 0.5.

## `drift.ts` (§5)

```ts
const DRIFT_BY_STAGE: Record<Stage, number> = { opening: 0.15, q1: 0.4, q2: 0.65, q3: 0.85, summary: 1.0 };
export function forStage(stage: Stage): number { return DRIFT_BY_STAGE[stage] ?? 0.15; }

// per-dimension lerp in NORMALISED space, then de-normalise for human-readable targets (§5.2)
export function targetVector(origin: MetricVector, lawyer: MetricVector, drift: number, ranges: MetricRanges): MetricVector {
  const o = normalise(origin, ranges), l = normalise(lawyer, ranges);
  const t = {} as MetricVector;
  for (const k of METRIC_KEYS) t[k] = o[k] + (l[k] - o[k]) * drift;
  return denormalise(t, ranges);
}
```
`drift=0` → origin's own style (mirror); `drift=1` → lawyer's measured style; between → smooth sub-threshold path. Schedule is tunable: if contrast is weak, widen the spread (lower the floor) — don't lengthen it (§5.3).

> `targetVector` needs `ranges`. Decide signature: pass `ranges` in (cleaner, testable) — Stage 1c/3 supply the frozen ranges from `signatures.json`.

## `directives.ts` (§6.2) — the critical translator

Deterministic map from a `MetricVector` to plain-English instructions using **bands/thresholds, not raw floats** (a model can hit "short, ~6–11 words"; it can't hit "fnPrep: 0.118").

```ts
export function metricsToDirectives(v: MetricVector): string[] { /* see §6.2 example */ }
```
- **Verbalise only consciously-controllable dims:** cadence (`meanSentenceLen`, `sentenceLenVariance`), hedging (`hedgeRatio`), directness (`directness`, `youDensity`), punctuation (`commaRate`, `dashRate`, `questionRate`).
- **Do NOT** turn function-word metrics (`fnPronoun…fnAux`) into targets — "use more prepositions" is nonsense to instruct. They ride along implicitly and are **measured afterward** for the LSM stat (§7.2).
- Follow the spec's banded thresholds (e.g. `<11` clipped, `>20` flowing; `hedgeRatio<0.01` "do not hedge", `>0.03` "soften"; `directness>0.3` "lead with imperatives"; etc.).

## `stats.ts` (§7) — both numbers, computed from vectors already on hand

```ts
// §7.1 normalised Euclidean → 0 ("watch the gap close"); normalisation MANDATORY
export function convergence(output: MetricVector, lawyer: MetricVector, ranges: MetricRanges): number {
  const o = normalise(output, ranges), l = normalise(lawyer, ranges);
  return Math.sqrt(METRIC_KEYS.reduce((s, k) => s + (o[k] - l[k]) ** 2, 0));
}

// §7.2 Pennebaker LSM → 1 ("Linguistic Style Match 91%"), mean over the 5 fn-word categories
export function lsm(a: MetricVector, b: MetricVector): number {
  const eps = 1e-9;
  return FN_KEYS.reduce((s, k) => s + (1 - Math.abs(a[k] - b[k]) / (a[k] + b[k] + eps)), 0) / FN_KEYS.length;
}
```
> The public `Lawguistics.convergence(output, lawyer)` (Stage 0 sig) takes 2 args; this impl needs `ranges`. Resolve by closing over the frozen ranges in Stage 3's wire-up (the brand method captures `signatures.json` ranges), while the underlying `stats.ts` fn takes `ranges` explicitly for testability.

## `metrics.test.ts` (`node --test`)

Cover the invariants that make the reveal numbers defensible:
- Fixed sample strings → assert exact metric values (hand-compute a few).
- **Same-splitter invariant:** measuring the same text twice is identical; client-style and lawyer-style text run through the identical path.
- `normalise` maps min→0, max→1, midpoint→~0.5; `denormalise∘normalise ≈ identity`.
- `targetVector(o, l, 0) ≈ o` and `targetVector(o, l, 1) ≈ l` (within float tolerance).
- `convergence(v, v) === 0`; `lsm(v, v) ≈ 1`.
- `metricsToDirectives` returns clipped-sentence directive for short text, flowing for long.

Run: `node --test --env-file=.env src/lib/services/lawguistics/metrics.test.ts` (no env actually needed here, but the flag is harmless). Use only erasable TS; `.ts` extension on relative imports is allowed **in this test file** (Node runs it directly).

## Honest caveat to record (§3.4)

Naive sentence splitting mis-handles abbreviations ("Dr.", "U.S."). Fine for synthetic corpus + demo; production needs a real splitter. **Both sides use the identical splitter, so the demo's comparison stays valid.** Put this one-liner in `README.md`.

## Dependencies / what it gates

- Gates on: Stage 0 (`types.ts`).
- Gated by it: Stage 2 (`build-signatures` calls `measure`/`computeRanges`), Stage 3 (wire-up), and `condition` (uses `targetVector`/`directives`/style-convergence check).

## Done-check

- `node --test` green on `metrics.test.ts`.
- Every function pure (no imports beyond `./types`); no AI, no `fs`, no network.
- No edits outside the module dir.
