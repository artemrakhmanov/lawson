// lawguistics/condition.test.ts — Stage 1c skeleton invariants (`node --test`),
// using a stubbed `ai` (no network). Full end-to-end checks land in Stage 3.
// Run: node --test --env-file=.env src/lib/services/lawguistics/condition.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { measure, computeRanges } from "./metrics.ts";
import { condition } from "./condition.ts";
import type { GenerateFn, JudgeFn } from "./condition.ts";
import { judgeFidelity } from "./fidelity.ts";
import type { GenerateFn as FidGenerateFn } from "./fidelity.ts";
import type { VoiceSignature, ConditionResult } from "./types.ts";

// ── Fixtures (Stage-1c codes against fixtures until Stage 2 freezes the real
// signatures.json) ──
const lawyerMetrics = measure("File now. Do not wait. The exposure is real. Act today.");
const clientMetrics = measure("hey, i think maybe we could possibly chat about this sometime soon?");
const ranges = computeRanges([lawyerMetrics, clientMetrics]);
const rosterMedian = clientMetrics;

const fixtureSig: VoiceSignature = {
  lawyerId: "fixture-criminal",
  metrics: lawyerMetrics,
  brief: {
    label: "risk-first, clipped, directive",
    cadence: "short, clipped",
    moves: ["lead with risk", "no reassurance opener"],
    lexicalFingerprint: ["exposure", "immediately"],
    hedgingPosture: "directive",
    exemplarLine: "Do not wait.",
  },
};

const slots = (s: string): string[] => s.match(/\[\[[^\]]+\]\]/g) ?? [];
const asGen = (impl: () => Promise<ConditionResult>): GenerateFn =>
  impl as unknown as GenerateFn;

// ── Rail 1: slot violation → fall back to baseline ──
test("slot-dropping conditioned falls back to baseline; slots survive", async () => {
  const text = "Please confirm [[date:free:your date]] and pick [[plan:select:a|b|c]].";
  const gen = asGen(async () => ({
    conditioned: "Confirm and pick — now.", // DROPS both slots
    baseline: text,
  }));
  const r = await condition(text, fixtureSig, 0.85, undefined, {
    ranges,
    rosterMedian,
    gen,
    dev: false,
  });
  assert.equal(r.conditioned, r.baseline); // conditioned fell back
  assert.deepEqual(slots(r.conditioned).sort(), slots(text).sort());
  assert.deepEqual(slots(r.baseline).sort(), slots(text).sort());
});

// ── Rail 2: fidelity failure → fall back to baseline ──
test("fact-altering conditioned (judge=false) falls back to baseline", async () => {
  const text = "Your hearing is on [[date:free:date]].";
  const gen = asGen(async () => ({
    conditioned: "Your hearing is on [[date:free:date]]. Bail has been granted.", // ADDED fact
    baseline: "Your hearing is on [[date:free:date]].",
  }));
  const judge: JudgeFn = async () => ({ faithful: false, drift_notes: "added 'bail granted'" });
  const r = await condition(text, fixtureSig, 0.85, undefined, {
    ranges,
    rosterMedian,
    gen,
    judge,
    dev: false,
    fidelityScope: "all",
  });
  assert.equal(r.conditioned, r.baseline);
});

// ── Faithful, slot-clean content is KEPT distinct ──
test("faithful, slot-preserving conditioned is kept (distinct from baseline)", async () => {
  const text = "Your hearing is on [[date:free:date]].";
  const gen = asGen(async () => ({
    conditioned: "Hearing: [[date:free:date]]. Be there.",
    baseline: "Your hearing is on [[date:free:date]].",
  }));
  const judge: JudgeFn = async () => ({ faithful: true });
  const r = await condition(text, fixtureSig, 0.85, undefined, {
    ranges,
    rosterMedian,
    gen,
    judge,
    dev: false,
    fidelityScope: "all",
  });
  assert.notEqual(r.conditioned, r.baseline);
  assert.ok(r.conditioned.includes("[[date:free:date]]"));
});

// ── Scope gating: highdrift scope skips the fidelity call at low drift ──
test("fidelity gate does not run below the high-drift threshold", async () => {
  let judged = false;
  const gen = asGen(async () => ({ conditioned: "A restatement.", baseline: "B restatement." }));
  const judge: JudgeFn = async () => {
    judged = true;
    return { faithful: false };
  };
  await condition("Original sentence.", fixtureSig, 0.15, undefined, {
    ranges,
    rosterMedian,
    gen,
    judge,
    dev: false,
    fidelityScope: "highdrift",
  });
  assert.equal(judged, false);
});

// ── judgeFidelity returns the boolean shape; faithful content → true ──
test("judgeFidelity returns { faithful } and passes faithful content", async () => {
  const stub = (async () => ({ faithful: true })) as unknown as FidGenerateFn;
  const r = await judgeFidelity("same facts", "same facts, plainly", "SAME facts — boldly", stub);
  assert.equal(r.faithful, true);
});
