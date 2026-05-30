// lawguistics/wireup.test.ts — Stage 3 (D5) LIVE end-to-end checks against the
// real model + frozen signatures.json. Makes real API calls — run on demand:
//   node --test --env-file=.env src/lib/services/lawguistics/wireup.test.ts
// (NOT part of the pure-TS `metrics.test.ts` lane; needs ANTHROPIC_API_KEY.)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Lawguistics } from "./index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "data");
const firm = JSON.parse(readFileSync(join(dataDir, "firm.json"), "utf8"));
const heroId = firm.lawyers.find((l: { hero?: boolean }) => l.hero).id;

const slots = (s: string) => s.match(/\[\[[^\]]+\]\]/g) ?? [];
const SLOT = "[[when:free:approximate date or time]]";
// representative of a real high-drift turn: factual intake content (the kind the
// bench agent emits and the summary carries), multi-sentence so there is cadence
// to bend. High drift coincides with factual content in the real flow — warm
// preamble sits at low drift — so this is the honest combination to test.
const SUBSTANCE =
  "You were arrested last night and charged with possession. The police have seized your phone " +
  "and a search of your flat is scheduled. There is a bail hearing on Monday and an interview " +
  "under caution before then. I need to know what the officers asked you and whether you answered " +
  `any questions, and roughly when they first made contact. ${SLOT}`;

const measureConv = (text: string, sig: { metrics: import("./types.ts").MetricVector }) =>
  Lawguistics.convergence(Lawguistics.measure(text), sig.metrics);

test("D5 live wire-up: slots, fidelity, voiced-closer-than-baseline, voice bends", async () => {
  const sig = Lawguistics.getSignature(heroId);
  assert.ok(sig.brief.label, "hero has a brief");

  const high = await Lawguistics.condition(SUBSTANCE, sig, 0.85); // q3-band, reliably kept
  const low = await Lawguistics.condition(SUBSTANCE, sig, 0.15); // opening-band, near-mirror

  // (1) slot token survives verbatim in both registers, at both drifts
  for (const r of [high, low]) {
    assert.deepEqual(slots(r.conditioned), [SLOT]);
    assert.deepEqual(slots(r.baseline), [SLOT]);
  }

  // (2) the bold high-drift voice survived the fidelity gate (facts held → kept)
  assert.notEqual(high.conditioned, high.baseline, "high-drift voice should be kept, not fallback");
  const verdict = await Lawguistics.judgeFidelity(SUBSTANCE, high.baseline, high.conditioned);
  assert.equal(verdict.faithful, true, `fidelity: ${verdict.drift_notes ?? ""}`);

  // (3) THE convergence claim: the voiced output sits CLOSER to the lawyer than
  // the flat baseline does — what the reveal bar asserts ("watch the gap close").
  const cCond = measureConv(high.conditioned, sig);
  const cBase = measureConv(high.baseline, sig);
  console.log(`  convergence: voiced=${cCond.toFixed(3)}  baseline=${cBase.toFixed(3)}`);
  assert.ok(cCond < cBase, `voiced (${cCond}) should be nearer the lawyer than baseline (${cBase})`);

  // (4) the voice genuinely bends: high drift clips harder than low drift toward
  // the hero's short cadence (hero meanSentenceLen ~8.8).
  const hiLen = Lawguistics.measure(high.conditioned).meanSentenceLen;
  const loLen = Lawguistics.measure(low.conditioned).meanSentenceLen;
  console.log(`  meanSentenceLen: high=${hiLen.toFixed(1)}  low=${loLen.toFixed(1)}  hero=${sig.metrics.meanSentenceLen.toFixed(1)}`);
  assert.ok(hiLen < loLen, `high-drift should clip shorter (${hiLen}) than low-drift (${loLen})`);

  // (5) lsm is a real 0..1 number
  const l = Lawguistics.lsm(Lawguistics.measure(high.conditioned), sig.metrics);
  assert.ok(l >= 0 && l <= 1, `lsm in [0,1]: ${l}`);
  console.log(`  lsm(high)=${(l * 100).toFixed(0)}%`);
});
