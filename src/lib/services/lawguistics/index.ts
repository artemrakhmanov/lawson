// lawguistics/index.ts — the `Lawguistics` brand object. The harness imports
// ONLY this (and the shared types). Stage 3 (D5): every public method is now
// backed by a real implementation reading the frozen signatures.json. The
// stage-0 stubs (identity condition, drift=0, neutral matchTarget/getSignature)
// are gone — swapping stub→real changed ONLY this file's internals; the harness
// and UI never move.
//
// Where the public signature hides `ranges`/`origin`, this file closes over the
// frozen RANGES / ROSTER_MEDIAN from signatures.ts:
//   - convergence(out, lawyer)        → _convergence(out, lawyer, RANGES)
//   - condition(text, target, drift, origin?) → injects {RANGES, ROSTER_MEDIAN}

import { measure } from "./metrics.ts";
import { convergence as _convergence, lsm } from "./stats.ts";
import { forStage } from "./drift.ts";
import { condition as _condition } from "./condition.ts";
import { judgeFidelity } from "./fidelity.ts";
import { getLawyer, getSignature, matchTarget, listLawyers, RANGES, ROSTER_MEDIAN } from "./signatures.ts";
import type { MetricVector, VoiceSignature, ConditionResult } from "./types.ts";

export const Lawguistics = {
  /**
   * Bend `text` from the user's register toward `target`'s voice by `drift`.
   * `origin` is the client's starting vector; OMIT it to default to the
   * roster-median (ROSTER_MEDIAN). Async — `emit` awaits it. Returns both
   * registers; slot tokens preserved; facts unchanged (fidelity-gated).
   */
  condition(
    text: string,
    target: VoiceSignature,
    drift: number,
    origin?: MetricVector,
  ): Promise<ConditionResult> {
    return _condition(text, target, drift, origin, {
      ranges: RANGES,
      rosterMedian: ROSTER_MEDIAN,
    });
  },
  // exposed for testing/audit; condition runs it internally as the meaning gate
  judgeFidelity,
  drift: { forStage },
  measure,
  // public 2-arg contract closes over the frozen ranges
  convergence(output: MetricVector, lawyer: MetricVector): number {
    return _convergence(output, lawyer, RANGES);
  },
  lsm,
  getSignature,
  getLawyer,
  matchTarget,
  // the real 6-lawyer roster (corpus stripped) — what Lawson's matching reads (D6)
  listLawyers,
};

export type {
  MetricVector, VoiceSignature, VoiceBrief, Lawyer, PracticeArea,
  Stage, ConditionResult, FidelityResult, MetricRanges, MetricKey, FnKey,
} from "./types";
