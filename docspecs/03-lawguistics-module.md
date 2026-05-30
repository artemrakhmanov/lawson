# Lawson — Spec 03: Lawguistics Module (Signatures, Metrics & Conditioning)

> **Read 00, 01, 02 first.** This spec fills in the `Lawguistics` interface that Spec 02 defined as a seam (`Lawguistics.condition(text, target, drift) → {conditioned, baseline}`). It also owns what comes *before* conditioning can exist: the synthetic corpus, the lawyer roster, and the signature analysis. This is built **first in wall-clock terms** because Lawson needs lawyers to pick and signatures to bend toward — but it slots behind the same interface, so the harness (Spec 02) never changes.

> **The thesis of this module:** a voice signature is a **coupled pair** — a *deterministic metric vector* (computed, science-named, driftable on a number line) and a *nondeterministic style brief* (LLM-distilled, prose-guiding). The metric vector **constrains**; the style brief **flavours**. Drift is literal interpolation through metric-space from the client's own vector to the lawyer's. Because the metrics are *real measurements*, the reveal can show a genuine convergence number, not a vibe.

> **Science basis (from `references.md`):** Linguistic Style Matching operates on *function words* — content-free, measurable, and *undetectable yet effective*. Our deterministic core is, in part, literally the Pennebaker function-word formula. We are honest to the mechanism (Communication Accommodation Theory / stylistic convergence); the pun is only in the name.

---

## 1. Build order within this module (leads the whole project)

1. **Synthetic data generation** — roster + corpus in one pass. Gives Lawson lawyers to match and gives us text to measure/distill.
2. **Metric core** — pure-TS, zero-dep measurement of any text → `MetricVector`.
3. **Signature build** — per lawyer: compute the metric vector from their corpus + LLM-distill the style brief. Store both as the signature.
4. **Client vector capture** — measure the opening prompt into the same vector shape (the drift origin).
5. **Drift** — interpolate client→lawyer vectors by a 0..1 value; map stage→drift.
6. **Conditioning** — `Lawguistics.condition`: dual generation guided by interpolated metric targets + style brief; preserves slot tokens; tone-only.
7. **Reveal stats** — normalised-Euclidean convergence score + LSM% (both computed from vectors already on hand).

Stage 0 of the Spec 02 mock (identity passthrough) exists independently and earlier; this module is what stage 1 swaps in.

---

## 2. Synthetic data generation (`scripts/generate-firm.ts`)

One offline script, run once, produces the firm. Output committed as JSON so the demo is deterministic and offline-safe.

### 2.1 What it generates (one pass)
- **The roster** — one firm, a small set of lawyers (e.g. 2 per practice area across Criminal / Real Estate / Commercial, plus the area each agnostic role tends to surface). Each lawyer: `meta` (name, title), `practiceArea`, and a `summary` (the prose Lawson matches against — Spec 00 §6, Spec 01 §6).
- **The corpus** — per lawyer, a small set (3–5) of **synthetic emails/letters** to a hypothetical client. This is the text we measure and distill. Not shipped to the UI; it's signature feedstock + provenance.

### 2.2 Exaggerate per archetype (deliberately)
Each lawyer's corpus is generated with an **archetype brief** that pushes the tells hard, so the resulting signatures are clean and the cleave pops:
- **Criminal — "risk-first, clipped, directive."** Short sentences. Leads with exposure. No reassurance opener. Imperatives. Low hedging.
- **Real Estate — "measured, procedural, reassuring."** Longer flowing sentences, subordinate clauses, step-by-step, warm openers, moderate hedging.
- **Commercial — "precise, figure-led, formal."** Dense vocabulary, defined terms, references to clauses/amounts, balanced hedging, low warmth.

Exaggeration at the source = clean distillation = bold conditioning. (Demo-safety, `lawguistics.md`: the contrast is the product.)

### 2.3 Hero designation
One lawyer is the **hero** — the one the demo seed reliably lands. Pick the boldest voice (Criminal "risk-first" diffs hardest against a bland baseline). Mark it in the roster so the seed prompt and fallback flag can target it (Spec 00 §7).

### 2.4 Generation method
- LLM call(s) producing roster + per-lawyer corpus to schema (`generateObject`, Zod). Temperature moderate-high for stylistic variety; the archetype brief is the system instruction.
- Output: `services/signatures/data/firm.json` (roster + corpus). Re-runnable; committed result is the demo's source of truth.

---

## 3. The metric core (pure TS, zero deps) — `services/lawguistics/metrics.ts`

Every number is counts-and-divisions over a regex-split string. No tokenizer model, no embeddings, no NLP lib. Identical computation for lawyer corpus **and** client text — we compare like with like.

### 3.1 Tokenization (naive, deterministic)
```ts
const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
const words = text.toLowerCase().match(/\b[\w']+\b/g) ?? [];
```

### 3.2 The vector (≈14 numbers, fixed shape)
```ts
type MetricVector = {
  // cadence
  meanSentenceLen: number;       // mean words/sentence
  sentenceLenVariance: number;   // rhythm
  // lexical
  ttr: number;                   // type-token ratio (vocabulary variety)
  // stance
  hedgeRatio: number;            // hedge terms / words
  directness: number;            // imperative-led sentences / sentences
  youDensity: number;            // "you" / words
  // function-word profile (the LSM signal — Pennebaker categories)
  fnPronoun: number; fnArticle: number; fnPrep: number; fnConj: number; fnAux: number;
  // punctuation rhythm
  commaRate: number;             // commas / sentence
  questionRate: number;          // '?'-ending sentences / sentences
  dashRate: number;              // em-dashes / sentence
};
```

### 3.3 How each is computed (precise)
- **meanSentenceLen / variance** — word-count per sentence; mean and population variance.
- **ttr** — `new Set(words).size / words.length`.
- **hedgeRatio** — count of a hardcoded hedge list (`may, might, could, perhaps, possibly, generally, typically, arguably, relatively, somewhat, likely, tend to, it seems`) / `words.length`. This is the "it may be worth considering" vs. "you should" axis as a number.
- **directness** — sentences whose first word is in an imperative-starter list (`call, send, file, do, get, bring, stop, sign, review, check, …`) / sentence count.
- **youDensity** — occurrences of `you` / `words.length`.
- **function words** — five closed-set categories (pronouns, articles, prepositions, conjunctions, aux verbs); each = category matches / `words.length`. Closed sets are hardcoded constants.
- **commaRate / questionRate / dashRate** — punctuation counts normalised per sentence.

### 3.4 Honest caveat (disclose in README)
Naive sentence splitting mis-handles abbreviations ("Dr.", "U.S."). Fine for synthetic corpus + demo text; production would need a real splitter. One-line disclosure; does not affect the demo's validity because both sides use the identical splitter.

### 3.5 Normalisation helper
Compute roster-wide min/max per dimension once (from all lawyer vectors) → a `normalise(vector)` that maps each dim to 0..1. Needed for fair Euclidean distance (§7) and stable interpolation (§5), because raw dims have wildly different ranges (sentence length ~8–28 vs. hedgeRatio ~0–0.05).

---

## 4. The signature = deterministic vector + nondeterministic brief

`services/signatures/` builds and exposes one signature per lawyer.

### 4.1 Shape (provisional fields, intent fixed)
```ts
type VoiceSignature = {
  lawyerId: string;
  // deterministic — computed from corpus (§3)
  metrics: MetricVector;
  // nondeterministic — LLM-distilled from the same corpus
  brief: {
    label: string;              // "risk-first, clipped, directive"
    cadence: string;            // prose description of rhythm
    moves: string[];            // ["leads with risk","no reassurance opener", ...]
    lexicalFingerprint: string[];// characteristic words/connectives
    hedgingPosture: string;     // "directive" | "balanced" | "hedged" + gloss
    exemplarLine: string;       // one short line that sounds unmistakably like this voice
  };
};
```

### 4.2 How each half is built
- **`metrics`** — run §3 over the lawyer's corpus (concatenated or averaged across their emails). Pure computation, deterministic.
- **`brief`** — one `generateObject` call: "given these emails, distill the voice into label/moves/lexicon/exemplar." LLM-distilled (nondeterministic), but stored once and frozen — stable at conditioning time.

### 4.3 Why coupled
- The **vector constrains**: it gives the conditioner *hard, numeric targets* ("aim for ~9-word sentences, hedgeRatio near 0.01, high directness").
- The **brief flavours**: it gives the conditioner *qualitative guidance* ("lead with risk, no warm opener, use these connectives").
- Numbers alone produce robotic prose; brief alone drifts vague. Together: prose that *hits the measurements* and *carries the voice*. And because the numbers are real, the reveal can prove convergence (§7).

### 4.4 Showable on the reveal
The `brief.label`, `brief.moves`, and `exemplarLine` render on the cleave (Spec 04) as "what the conditioned panel is bending toward." The `metrics` feed the convergence number. Both halves earn their place on screen.

---

## 5. Client vector + drift

### 5.1 Client signature (the drift origin)
- On session start, run §3 over the **opening prompt** → `clientMetrics: MetricVector`.
- The opening prompt is short, so the vector is noisy — acceptable: at drift≈0 we want a *gesture* toward the client's own rhythm/formality, not a precise match. Optionally smooth toward roster-median for stability (config flag).
- The client has **no brief** — at drift≈0 the conditioner is told to "mirror the user's plain rhythm and formality," using `clientMetrics` as the target and minimal qualitative guidance.

### 5.2 Drift as interpolation
```ts
function targetVector(client: MetricVector, lawyer: MetricVector, drift: number): MetricVector {
  // per-dimension lerp in NORMALISED space, then de-normalise for human-readable targets
  return lerp(normalise(client), normalise(lawyer), drift);
}
```
- `drift = 0` → client's own measured style (mirror). `drift = 1` → lawyer's measured style (full voice). In between → a smooth path through metric-space. This is what makes the bend *gradual and sub-threshold* (the imperceptibility requirement) rather than a jump.
- The **brief blend** rides alongside: at low drift, suppress the brief (mirror); as drift rises, introduce the lawyer's `moves`/`lexicon`/`hedgingPosture` with increasing weight. (Qualitative analogue of the vector lerp.)

### 5.3 Stage → drift schedule (`services/lawguistics/drift.ts`)
```ts
const DRIFT_BY_STAGE = { opening: 0.15, q1: 0.4, q2: 0.65, q3: 0.85, summary: 1.0 };
```
- Summary is most-conditioned / most-divergent (the natural trap-line screen).
- Tunable. If contrast is weak, widen the spread (lower floor) and bolden the hero brief — don't lengthen the schedule. (Matches `lawguistics.md` cut-line logic.)

---

## 6. Conditioning — `Lawguistics.condition(text, target, drift)`

The Spec 02 gateway calls this per register-bearing field. `target` resolves to the matched lawyer's `VoiceSignature`; the client vector is read from session state. **Output contract (unchanged):** `{ conditioned, baseline }` — same substance, two registers; **slot tokens preserved**; **facts unchanged** (tone only).

The non-obvious part is *how the signature pair gets into the prompt*. Numeric metrics are not natively promptable — an LLM cannot meaningfully aim for "fnPrep: 0.118". The mechanism must **translate the vector into language the model can act on**, then **verify** (style) and **gate** (meaning). Four stages.

### 6.1 Stage 1 — interpolate
`targetVector(clientMetrics, lawyer.metrics, drift)` → the 14-number goal for this turn (§5.2).

### 6.2 Stage 2 — translate the vector into natural-language directives (`metricsToDirectives`)
The critical mechanism. A **deterministic** function maps each metric (or cluster) to a plain-English instruction using **bands/thresholds, not raw floats** — because bands are what a model can actually hit, and exact-float targeting is false precision.

```ts
function metricsToDirectives(v: MetricVector): string[] {
  const d: string[] = [];
  // cadence
  if (v.meanSentenceLen < 11)      d.push("Use short, clipped sentences (~6–11 words).");
  else if (v.meanSentenceLen > 20) d.push("Use long, flowing sentences (~20–30 words) with subordinate clauses.");
  else                              d.push("Use medium sentences (~12–18 words).");
  if (v.sentenceLenVariance > HIGH) d.push("Vary sentence length — mix very short with longer.");
  // stance
  if (v.hedgeRatio < 0.01)          d.push("Do not hedge. State things plainly and assertively.");
  else if (v.hedgeRatio > 0.03)     d.push("Soften claims with hedging (may, might, generally).");
  if (v.directness > 0.3)           d.push("Lead with imperatives — tell the reader what to do.");
  if (v.youDensity > 0.04)          d.push("Address the reader directly and often as 'you'.");
  // punctuation rhythm
  if (v.commaRate > 2)              d.push("Use commas freely; layer clauses.");
  if (v.dashRate > 0.3)             d.push("Use em-dashes for emphasis.");
  // ...one mapping per controllable dimension
  return d;
}
```

**Which dimensions get verbalised:** only the ones a writer can *consciously control* (cadence, hedging, directness, punctuation). The **function-word metrics are deliberately NOT turned into targets** ("use more prepositions" is nonsense to instruct) — they ride along implicitly through cadence/register and are *measured afterward* for the LSM stat (§7). So the translator focuses the model's effort where it can act, and lets the function-word signal emerge.

### 6.3 Stage 3 — assemble the dual-generation prompt
Both halves of the signature inject through one prompt, by different routes: the **vector** via `metricsToDirectives` (numbers → directive bullets, deterministic); the **brief** via direct templating (already prose, nondeterministic). **Drift controls the weight** language on the brief block and whether the client-mirror line appears.

```
SYSTEM:
Render the SAME content in two registers. Change only the SOUND, never the facts.
Keep every [[slot]] token exactly as written.

CONDITIONED — style directives (follow precisely):
{metricsToDirectives(targetVector) as bullets}              // ← deterministic, from the vector

Voice character (weight: {drift}):                          // ← nondeterministic, from the brief
- Moves: {brief.moves}
- Prefer lexicon: {brief.lexicalFingerprint}
- Hedging posture: {brief.hedgingPosture}
- It should sound like: "{brief.exemplarLine}"

{drift < 0.3 ? "Mostly mirror the user's plain, informal rhythm." : ""}   // ← client-mirror at low drift

BASELINE — flat, administrative, neutral. No personality. Plainest phrasing.

CONTENT TO RENDER (slot tokens intact):
{substance}

Return { conditioned, baseline }.
```

The vector never literally appears in the prompt — *its meaning does*. One `generateObject` call returns both registers; the deterministic targets keep it on-style, the LLM does the wording (the nondeterministic half).

### 6.4 Stage 4 — verify (style) and gate (meaning)
Two distinct post-generation checks. They answer different questions and **both** must pass.

**(a) Style verification — deterministic, the convergence check.** Measure the produced `conditioned` with §3 and confirm it moved *toward* target:
```ts
const gap = convergence(measure(result.conditioned), targetVector);  // same Euclidean fn as the reveal
if (DEV && gap > STYLE_TOLERANCE) { /* regenerate once with a sharpened directive */ }
```
This closes the deterministic/nondeterministic loop on itself: deterministic targets → LLM generates → deterministic measurement checks → optional corrective nudge. **Live, skip the regen** (latency); the *measurement still feeds the convergence bar on the reveal* (§7), so the on-screen number is the same signal that (in dev) gated quality — defensible, not decorative.

**(b) Semantic-fidelity gate — LLM-as-judge, the meaning guardrail.** Style convergence proves the *sound* moved; it says nothing about whether the *meaning* held. A separate, cheap **LLMaaJ** call checks that `conditioned` did not add, drop, soften, or distort any fact relative to `baseline` (and the original substance):
```ts
// Lawguistics.judgeFidelity(substance, baseline, conditioned) -> { faithful: boolean, drift_notes?: string }
```
- The judge is prompted narrowly: *"Do these convey identical facts, claims, commitments, and asks? Ignore tone, warmth, length, phrasing. Flag ONLY semantic departures — added/removed/altered facts, changed strength of a claim, new implications."* Returns a boolean + (on failure) what departed.
- **On failure:** discard the `conditioned`, **fall back to `baseline`** for that field (never ship a meaning-drifted output), and log the departure. In dev, optionally regenerate once with the judge's note appended as a constraint.
- **Why it's load-bearing, not optional:** "tone only, never facts" is the entire compliance posture (`compliance.md`: *adapt tone, never withhold information, fabricate, or pressure*) and the demo's integrity claim (*same facts, different sound* — the thing the cleave asserts). The LLMaaJ gate is what makes that claim **enforced** rather than hoped-for. It is the mechanism behind "no autonomy subversion."
- **Cost control:** it's one small structured call per conditioned field. For the demo, run it on the **summary and any high-drift turn** at minimum (the outputs most likely to drift and most scrutinised on the reveal); config flag to run on all fields. It can run in parallel with nothing blocking the user since both registers are pre-rendered (Spec 02 §5) — fidelity is checked before storage, well before any cleave.

### 6.5 Validation rails (inherited + new), in order
1. **Slot-token regex check** on both outputs; on violation → fall back to baseline for that field (Spec 02 §5).
2. **Semantic-fidelity gate** (6.4b); on failure → fall back to baseline, log departure.
3. **Style convergence** (6.4a); dev-gates a regen, live feeds the reveal bar.

Order matters: a structurally broken or meaning-drifted output is rejected *before* we bother caring how stylish it is.

---

## 7. Reveal stats (two numbers, two jobs)

Both computed from vectors already on hand — nearly free once §3 exists.

### 7.1 Convergence score — normalised Euclidean (the headline)
```ts
// measure the conditioned output, normalise, distance to the lawyer's normalised vector
dist = sqrt( Σ (normalise(O)[i] - normalise(L)[i])² )
```
- **Story:** "watch the gap close." Falls toward **0** across turns as drift ramps — the output is converging on the lawyer's *measured* style. Intuitive; any audience gets "smaller = closer = now sounds like them."
- Normalisation (§3.5) is mandatory or `meanSentenceLen` swamps everything. Render as a shrinking bar per turn on the reveal (Spec 04).

### 7.2 Linguistic Style Match — the Pennebaker formula (the credibility stat)
Per function-word category, then averaged:
```ts
LSM_cat = 1 - |rateA - rateB| / (rateA + rateB + ε)
LSM = mean over the 5 function-word categories
```
- **Story:** "Linguistic Style Match: 91%" — this is *literally the metric from the LSM papers* (Niederhoffer & Pennebaker; Ireland & Pennebaker), the content-free function-word similarity that the research shows is *undetectable yet predictive of rapport*. Cite it on the reveal.
- Similarity-to-1 by nature; pairs perfectly with the convergence-to-0 bar. One number people *feel*, one number that's *from the papers*.

### 7.3 Why both
Euclidean = intuitive magnitude story (great for stage). LSM = named, cited, defensible (great for the sharp judge). Showing them together is the most "science-backed and impressive" beat — and `references.md` is the appendix that backs it.

---

## 8. What this module exposes (to Spec 02's seam + Spec 04's reveal)

- `Lawguistics.condition(text, target, drift) → {conditioned, baseline}` — the gateway's call (Spec 02).
- `Lawguistics.judgeFidelity(substance, baseline, conditioned) → {faithful, drift_notes?}` — the LLMaaJ semantic gate (§6.4b); `condition` runs it internally before returning, but it's exposed for testing/audit.
- `Lawguistics.drift.forStage(stage) → number` — the schedule.
- `measure(text) → MetricVector` — used for client capture and reveal stats.
- `convergence(output, lawyer) → number` and `lsm(a, b) → number` — the two reveal numbers (Spec 04 renders them).
- `getSignature(lawyerId) → VoiceSignature` — brief (for the reveal panel) + metrics (for the numbers).
- Roster access (`getLawyer`, `matchTarget`) shared with Lawson's matching (Spec 01 §6).

All behind the `Lawguistics` brand (Spec 02 §9). Swapping mock-stage-1 → a more sophisticated real conditioner later changes only the internals of `condition`; the harness and UI are untouched.

---

## 9. Build order (a Claude Code session)

1. `scripts/generate-firm.ts` → `firm.json` (roster + exaggerated corpus, hero marked).
2. `services/lawguistics/metrics.ts` — the pure-TS core (§3) + normalisation (§3.5). Unit-test on the corpus.
3. `services/signatures/` — build `VoiceSignature` per lawyer (compute metrics + distill brief), freeze to JSON.
4. Client capture (`measure` on opening prompt) wired into session start (Spec 02 store).
5. `drift.ts` (schedule) + `targetVector` interpolation (§5.2).
6. `Lawguistics.condition` stage-1 implementation (§6) — replaces the Spec 02 identity mock behind the same interface. Includes: `metricsToDirectives` translator (§6.2), the dual-generation prompt assembly (§6.3), the style-convergence check (§6.4a), and the **`judgeFidelity` LLMaaJ semantic gate (§6.4b)** with baseline-fallback on failure.
7. `convergence` + `lsm` (§7), exposed for Spec 04.
8. Tune: corpus exaggeration → signature boldness → drift spread → surface-text prompts, until the cleave pops and the convergence bar visibly falls.

---

## 10. Invariants this module upholds

- **Same splitter for client and lawyer** → distances are meaningful.
- **Metrics computed, not estimated** → the reveal numbers are real and defensible.
- **Drift = interpolation client→lawyer** → smooth, sub-threshold bend (imperceptibility).
- **Conditioning = metric targets (constrain) + brief (flavour)** → on-style *and* on-voice prose.
- **Vector is translated to banded directives, never injected as raw floats** → the model can actually act on it.
- **Semantic-fidelity gate (LLMaaJ) runs before storage; failure falls back to baseline** → "tone only, never facts" is enforced, not hoped-for. (Compliance + the cleave's integrity claim.)
- **Slot tokens preserved; facts unchanged** → renderer works; compliance posture holds.
- **Everything behind the `Lawguistics` interface** → harness/UI never change when the conditioner improves.

---

*Next: Spec 04 (UX surface + side rendering / the cleave) — renders the conditioned intake, then unhides the stored baseline alongside it, with the convergence bar + LSM% + signature brief on the reveal.*
