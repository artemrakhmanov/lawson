// lawguistics/metrics.test.ts — Stage 1a invariants (`node --test`).
// Run: node --test --env-file=.env src/lib/services/lawguistics/metrics.test.ts
// (no env needed here; flag is harmless). `.ts` relative imports are allowed in
// this file because Node runs it directly.

import { test } from "node:test";
import assert from "node:assert/strict";
import { measure, computeRanges, normalise, denormalise } from "./metrics.ts";
import { convergence, lsm } from "./stats.ts";
import { forStage, targetVector } from "./drift.ts";
import { metricsToDirectives } from "./directives.ts";
import { METRIC_KEYS } from "./types.ts";

const approx = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b} (Δ=${Math.abs(a - b)})`);

// ── measure: hand-computed exact values ─────────────────────────────────────
test("measure: hand-computed metrics on a known sample", () => {
  // "Call me. You should sign now."
  //   sentences: ["Call me.", "You should sign now."]            → 2
  //   words: [call, me, you, should, sign, now]                  → 6
  const v = measure("Call me. You should sign now.");
  approx(v.meanSentenceLen, 3); // (2 + 4) / 2
  approx(v.sentenceLenVariance, 1); // ((2-3)^2 + (4-3)^2) / 2
  approx(v.ttr, 1); // all 6 words distinct
  approx(v.hedgeRatio, 0); // no hedges
  approx(v.directness, 0.5); // "Call" is imperative, "You" is not
  approx(v.youDensity, 1 / 6);
  approx(v.fnPronoun, 2 / 6); // me, you
  approx(v.fnAux, 1 / 6); // should
  approx(v.commaRate, 0);
  approx(v.dashRate, 0);
  approx(v.questionRate, 0);
});

test("measure: hedges, questions and commas register", () => {
  // "It may, perhaps, generally work. Is that right?"
  const v = measure("It may, perhaps, generally work. Is that right?");
  // words: it,may,perhaps,generally,work,is,that,right → 8
  approx(v.hedgeRatio, 3 / 8); // may, perhaps, generally
  approx(v.questionRate, 0.5); // one of two sentences ends in ?
  approx(v.commaRate, 1); // 2 commas / 2 sentences
});

test("measure: multi-word hedge phrases count", () => {
  const v = measure("Things tend to drift. It seems clear.");
  // words: things,tend,to,drift,it,seems,clear → 7; phrases: "tend to","it seems"
  approx(v.hedgeRatio, 2 / 7);
});

test("measure: empty / wordless text → all zeros", () => {
  for (const k of METRIC_KEYS) {
    approx(measure("")[k], 0);
    approx(measure("   ")[k], 0);
  }
});

// ── same-splitter invariant ─────────────────────────────────────────────────
test("measure is deterministic — identical text → identical vector", () => {
  const t = "File the motion today. The deadline is firm — do not wait.";
  const a = measure(t);
  const b = measure(t);
  for (const k of METRIC_KEYS) assert.equal(a[k], b[k]);
});

// ── normalisation ───────────────────────────────────────────────────────────
test("normalise maps min→0, max→1, midpoint→~0.5; denormalise inverts", () => {
  const lo = measure("Go now."); // short, clipped
  const hi = measure(
    "Although the matter is genuinely complicated, we should, in the fullness of time, consider every available avenue with patience and care.",
  );
  const ranges = computeRanges([lo, hi]);
  const nlo = normalise(lo, ranges);
  const nhi = normalise(hi, ranges);
  for (const k of METRIC_KEYS) {
    if (ranges.max[k] === ranges.min[k]) {
      approx(nlo[k], 0.5);
      approx(nhi[k], 0.5);
    } else {
      // lo/hi are not guaranteed per-dim extremes, but each must be in [0,1]
      assert.ok(nlo[k] >= 0 && nlo[k] <= 1);
      assert.ok(nhi[k] >= 0 && nhi[k] <= 1);
    }
  }
  // a true midpoint vector normalises near 0.5 on non-degenerate dims
  const mid = {} as typeof lo;
  for (const k of METRIC_KEYS) mid[k] = (ranges.min[k] + ranges.max[k]) / 2;
  const nmid = normalise(mid, ranges);
  for (const k of METRIC_KEYS) approx(nmid[k], ranges.max[k] === ranges.min[k] ? 0.5 : 0.5);
  // denormalise ∘ normalise ≈ identity (within range)
  const round = denormalise(normalise(lo, ranges), ranges);
  for (const k of METRIC_KEYS) {
    if (ranges.max[k] !== ranges.min[k]) approx(round[k], lo[k], 1e-9);
  }
});

// ── drift / interpolation endpoints ─────────────────────────────────────────
test("targetVector(o,l,0)≈o and targetVector(o,l,1)≈l", () => {
  const o = measure("Go now. Sign it.");
  const l = measure(
    "We might, generally speaking, wish to revisit the agreement in due course, taking care to weigh each consideration.",
  );
  const ranges = computeRanges([o, l]);
  const at0 = targetVector(o, l, 0, ranges);
  const at1 = targetVector(o, l, 1, ranges);
  for (const k of METRIC_KEYS) {
    if (ranges.max[k] !== ranges.min[k]) {
      approx(at0[k], o[k], 1e-9);
      approx(at1[k], l[k], 1e-9);
    }
  }
});

test("forStage ramps opening→summary and falls back to floor", () => {
  assert.equal(forStage("opening"), 0.15);
  assert.equal(forStage("summary"), 1.0);
  assert.ok(forStage("q1") < forStage("q2") && forStage("q2") < forStage("q3"));
  // @ts-expect-error — unknown stage hits the ?? floor
  assert.equal(forStage("nope"), 0.15);
});

// ── reveal stats ────────────────────────────────────────────────────────────
test("convergence(v,v) === 0 and lsm(v,v) ≈ 1", () => {
  const v = measure("File the motion. Do not wait. The exposure is real.");
  const w = measure(
    "We would, perhaps, prefer to consider the procedural options available before committing to any particular course.",
  );
  const ranges = computeRanges([v, w]);
  assert.equal(convergence(v, v, ranges), 0);
  approx(lsm(v, v), 1, 1e-6);
  // distinct voices → positive distance, sub-perfect LSM
  assert.ok(convergence(v, w, ranges) > 0);
  assert.ok(lsm(v, w) <= 1);
});

// ── directives translator ───────────────────────────────────────────────────
test("metricsToDirectives: clipped for short text, flowing for long", () => {
  const short = metricsToDirectives(measure("Go now. Sign it. File today."));
  assert.ok(short.some((s) => /short, clipped/.test(s)));

  const long = metricsToDirectives(
    measure(
      "Although the underlying matter remains genuinely intricate, we should, in the fullness of time and with appropriate diligence, weigh every available avenue before reaching any firm conclusion.",
    ),
  );
  assert.ok(long.some((s) => /long, flowing/.test(s)));
});

test("metricsToDirectives never verbalises function-word dims", () => {
  const d = metricsToDirectives(measure("File the motion now. Do it today."));
  assert.ok(!d.some((s) => /preposition|pronoun|article|conjunction|auxiliar/i.test(s)));
});
