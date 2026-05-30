# Stage 1c — Conditioning (`condition.ts` + `fidelity.ts`)

> The conditioner: turn the coupled signature (vector + brief) into dual-register output, preserve slots, and enforce "tone only, never facts." Build the skeleton in parallel with 1a/1b against the Stage-0 types + a fixture signature; final wiring lands in Stage 3. Spec refs → §6.

## Goal

Implement `Lawguistics.condition` and `Lawguistics.judgeFidelity`:
- `condition(text, target, drift, origin?)` → `{ conditioned, baseline }` — same substance, two registers; **slot tokens preserved; facts unchanged**.
- `judgeFidelity(substance, baseline, conditioned)` → `{ faithful, drift_notes? }` — the LLM-as-judge semantic gate.

## Files to create

- `src/lib/services/lawguistics/condition.ts` — the 4-stage conditioner (§6.1–6.4) + validation rails (§6.5).
- `src/lib/services/lawguistics/fidelity.ts` — `judgeFidelity` LLMaaJ (§6.4b).

Depends on (import, don't reimplement): `metrics.ts` (`measure`, `targetVector` via `drift.ts`), `directives.ts` (`metricsToDirectives`), `stats.ts` (`convergence`), `ai.ts` (`generateJSON`). Until 1a/1b land, code against the type signatures and a hardcoded fixture `VoiceSignature` + `MetricRanges`.

## The four stages of `condition` (§6.1–6.4)

### 1. Interpolate (§6.1)
```ts
const drift = clamp01(driftArg);
const origin = originArg ?? ROSTER_MEDIAN;      // contract-gap fix: median when harness gives no client vector
const tgt = targetVector(origin, target.metrics, drift, ranges);   // 14-number goal for this turn
```

### 2. Translate the vector → directives (§6.2)
```ts
const directives = metricsToDirectives(tgt);    // deterministic, banded bullets — from directives.ts (1a)
```
The vector never literally appears in the prompt; **its meaning does.** Function-word dims are intentionally not verbalised (measured later for LSM).

### 3. Assemble the dual-generation prompt (§6.3)
One `generateObject` call returning **both** registers. Both halves of the signature inject by different routes: the **vector** via `directives` (deterministic bullets); the **brief** via direct templating (already prose). **Drift controls the weight** on the brief block and whether the client-mirror line appears.

```
SYSTEM:
Render the SAME content in two registers. Change only the SOUND, never the facts.
Keep every [[slot]] token exactly as written.

CONDITIONED — style directives (follow precisely):
{directives as bullets}

Voice character (weight: {drift}):
- Moves: {brief.moves}
- Prefer lexicon: {brief.lexicalFingerprint}
- Hedging posture: {brief.hedgingPosture}
- It should sound like: "{brief.exemplarLine}"

{drift < 0.3 ? "Mostly mirror the user's plain, informal rhythm." : ""}

BASELINE — flat, administrative, neutral. No personality. Plainest phrasing.

CONTENT TO RENDER (slot tokens intact):
{text}

Return { conditioned, baseline }.
```
Zod schema: `{ conditioned: string, baseline: string }`. Temperature moderate.

### 4. Verify (style) + gate (meaning) (§6.4)
- **(a) Style verification — deterministic (the convergence check).** `convergence(measure(result.conditioned), tgt, ranges)`. **DEV:** if gap > `STYLE_TOLERANCE`, regenerate once with a sharpened directive. **LIVE: skip the regen** (latency) — but the measurement still feeds the reveal bar (§7), so the on-screen number is the same signal that gated quality in dev.
- **(b) Semantic-fidelity gate — `judgeFidelity` (the meaning guardrail).** See `fidelity.ts` below. Style says nothing about meaning; this is what enforces "tone only, never facts."

## Validation rails — in order (§6.5)

1. **Slot-token regex check** on **both** outputs. Extract all `[[...]]` tokens from `text`; assert the same multiset appears in `conditioned` and `baseline`. On violation → **fall back to baseline** for that field.
   - Slot syntax (Spec 02 §6): `[[key:free:placeholder]]` and `[[key:select:a|b|c]]`. Match with a regex like `/\[\[[^\]]+\]\]/g` and compare token sets exactly (verbatim, order-independent or order-checked per the slot spec — confirm against the harness's `slots/encode.ts` if available, else verbatim multiset).
2. **Semantic-fidelity gate** (6.4b). On `faithful:false` → discard `conditioned`, **fall back to baseline**, log the departure (`drift_notes`).
3. **Style convergence** (6.4a). Dev-gates a regen; live feeds the reveal bar.

**Order matters:** a structurally broken or meaning-drifted output is rejected before we care how stylish it is. The fallback is always `baseline` (never ship meaning-drifted or slot-broken text).

## `fidelity.ts` — `judgeFidelity` (§6.4b)

```ts
// Lawguistics.judgeFidelity(substance, baseline, conditioned) -> { faithful, drift_notes? }
```
One cheap structured LLM call (`generateJSON` with a `{ faithful: boolean, drift_notes?: string }` schema). Prompt narrowly:

> "Do these convey identical facts, claims, commitments, and asks? Ignore tone, warmth, length, phrasing. Flag ONLY semantic departures — added/removed/altered facts, changed strength of a claim, new implications." Return a boolean + (on failure) what departed.

- **Why load-bearing, not optional:** "tone only, never facts" is the entire compliance posture and the cleave's integrity claim. This gate makes it **enforced**.
- **Cost control:** one small call per conditioned field. For the demo, run it at minimum on the **summary and any high-drift turn**; config flag to run on all fields. It can run before storage with nothing blocking the user (both registers are pre-rendered).

## Config flags (module-local consts; no env churn)

- `DEV` (default `process.env.NODE_ENV !== "production"`) — gates the style regen.
- `STYLE_TOLERANCE` — convergence gap above which dev regenerates.
- `FIDELITY_SCOPE` — `"highdrift"` (summary + drift ≥ threshold) | `"all"`.

## Dependencies / what it gates

- Gates on: Stage 0 types; logically on 1a (`directives`/`drift`/`stats`/`metrics`) and `ai.ts` (1b). Skeleton can proceed with fixtures.
- Final values gate on Stage 2 (`signatures.json` supplies real `metrics`, `brief`, frozen `ranges`, and `ROSTER_MEDIAN`).
- Gated by it: Stage 3 wire-up and the harness `emit` (the only caller of `condition`).

## Done-check (skeleton now, full in Stage 3)

- `condition` returns `{conditioned, baseline}`; both retain all `[[slot]]` tokens verbatim from input.
- Slot violation and fidelity failure both fall back to `baseline` (unit-test with a deliberately slot-dropping fixture and a fact-altering fixture, using a stubbed `ai`).
- `judgeFidelity` returns the boolean shape; on faithful content → `true`.
- No edits outside the module dir; `ai.ts` remains the only provider importer.
