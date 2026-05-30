# Stage 2 — Signature Build (`build-signatures.ts` + `signatures.ts`)

> Turn `firm.json` into frozen `VoiceSignature`s: the deterministic metric vector + the LLM-distilled brief, plus the roster-wide normalisation ranges. Gates on **both** `firm.json` (1b) and `metrics.ts` (1a). Spec refs → §4, §3.5.

## Goal

1. Offline: for each lawyer, compute `metrics` (from corpus, via `metrics.ts`) + distill `brief` (one LLM call), compute roster-wide `MetricRanges`, and the roster-median origin → write `data/signatures.json`.
2. Runtime: `signatures.ts` loaders exposed to the app (`getLawyer`, `getSignature`, `matchTarget`).

## Files to create

- `src/lib/services/lawguistics/scripts/build-signatures.ts` — offline builder.
- `src/lib/services/lawguistics/data/signatures.json` — **committed output** (frozen).
- `src/lib/services/lawguistics/signatures.ts` — runtime loaders/accessors.

## `scripts/build-signatures.ts` (§4.2)

For each lawyer in `firm.json`:

### `metrics` — deterministic (§4.2)
Run `measure()` over the lawyer's corpus. **Concatenate** the emails into one string (or measure each and average — pick concatenation for simplicity unless variance looks off; document the choice). Pure computation.

### `brief` — LLM-distilled, frozen (§4.2)
One `generateJSON` call per lawyer: *"given these emails, distill the voice into label / cadence / moves / lexicalFingerprint / hedgingPosture / exemplarLine."* Nondeterministic but **stored once and frozen** — stable at conditioning time. Zod schema = the `VoiceBrief` shape (Stage 0). Temperature moderate; pass the lawyer's corpus as context.

### Roster-wide ranges (§3.5) — **freeze them**
After all 14-dim vectors exist: `computeRanges(allVectors)` → `MetricRanges`. **Bake into `signatures.json`** so normalisation (and therefore convergence + LSM) is reproducible across runs and offline. This is mandatory — without frozen ranges the reveal numbers would shift if recomputed.

### Roster-median origin
Compute the per-dimension median across all lawyer vectors → `rosterMedian: MetricVector`. This is the default `origin` for `condition` when the harness passes none (the contract-gap fix). Store it in `signatures.json`.

## Output shape (`data/signatures.json`)

```jsonc
{
  "ranges": { "min": { /* MetricVector */ }, "max": { /* MetricVector */ } },
  "rosterMedian": { /* MetricVector */ },
  "signatures": [
    {
      "lawyerId": "criminal-risk-01",
      "metrics": { /* MetricVector */ },
      "brief": {
        "label": "risk-first, clipped, directive",
        "cadence": "...",
        "moves": ["leads with risk", "no reassurance opener"],
        "lexicalFingerprint": ["exposure", "immediately"],
        "hedgingPosture": "directive — states plainly",
        "exemplarLine": "Your exposure is real. Act now."
      }
    }
    // ... one per lawyer
  ]
}
```

## `signatures.ts` — runtime loaders

```ts
import firm from "./data/firm.json";          // roster (strip corpus when exposing Lawyer)
import sig from "./data/signatures.json";      // signatures + ranges + rosterMedian

export function getLawyer(id: string): Lawyer { /* from firm.lawyers, omit corpus */ }
export function getSignature(lawyerId: string): VoiceSignature { /* from sig.signatures */ }
export function matchTarget(lawyerId: string): VoiceSignature { /* alias: the matched lawyer's signature */ }
export const RANGES: MetricRanges = sig.ranges;
export const ROSTER_MEDIAN: MetricVector = sig.rosterMedian;
export function listLawyers(): Lawyer[] { /* roster sans corpus — for Lawson matching */ }
```

- **JSON import:** Next/TS supports JSON imports (`resolveJsonModule`); confirm it resolves in both the app build and Node-run scripts. These are **extensionless** imports of `.json` in the app graph (`signatures.ts` is imported by `index.ts`).
- `getLawyer`/`listLawyers` must **strip `corpus`** — the app-facing `Lawyer` type has no corpus; corpus is feedstock only.
- `matchTarget` here is the signature accessor; the actual *matching decision* (which lawyer) is Lawson's job (Spec 01 §6) — this just returns the chosen lawyer's signature. `RANGES`/`ROSTER_MEDIAN` are consumed by `condition`/`stats` wire-up in Stage 3.

## Run

```
node --env-file=.env src/lib/services/lawguistics/scripts/build-signatures.ts
```
Reads `firm.json`, writes `signatures.json`. `.ts`/`.json` relative imports allowed in this script.

## Dependencies / what it gates

- Gates on: `firm.json` (Stage 1b) **and** `metrics.ts` + `computeRanges` (Stage 1a).
- Gated by it: Stage 3 wire-up (`index.ts` loads these), `condition` (needs `RANGES`/`ROSTER_MEDIAN` + per-lawyer `metrics`/`brief`), reveal stats.

## Done-check

- `signatures.json` committed: one entry per lawyer with a complete non-empty `brief`, a `ranges` block, and `rosterMedian`.
- `getSignature(heroId).metrics` reflects the hero's clipped/directive corpus (short `meanSentenceLen`, low `hedgeRatio`, high `directness`).
- `getLawyer(id)` returns no `corpus` field.
- Re-running the script reproduces consistent `metrics`/`ranges` (deterministic half); only `brief` text varies. No edits outside the module dir.
