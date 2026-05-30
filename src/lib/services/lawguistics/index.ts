// lawguistics/index.ts — the `Lawguistics` brand object. The harness imports
// ONLY this (and the shared types). Stage-0 ships RUNNABLE stubs (R3) so the
// harness runs end-to-end on identity before any real voice exists:
//   - condition        → identity passthrough (baseline == conditioned)
//   - drift.forStage    → 0 (no convergence yet)
//   - matchTarget/getSignature → a frozen neutral VoiceSignature
// The rest throw NOT_IMPL until their stages land; stage-0 intake never calls
// them. Real impls are wired in Stage 3 (D5) with zero changes to this surface.

import type {
  MetricVector, VoiceSignature, Lawyer, Stage, ConditionResult, FidelityResult,
} from "./types";
import { METRIC_KEYS } from "./types";   // runtime value — for the neutral metric vector below

const NOT_IMPL = (n: string): never => { throw new Error(`Lawguistics.${n} not implemented yet`); };

// R3 — a frozen neutral signature returned by matchTarget/getSignature so the
// harness's emit can resolve a target and call condition; stage-0 condition
// ignores target/drift and identity-passes. Real signatures land in Stage 2/3.
const NEUTRAL_METRICS = Object.fromEntries(METRIC_KEYS.map((k) => [k, 0])) as MetricVector;
const NEUTRAL_SIGNATURE: VoiceSignature = {
  lawyerId: "__neutral__",
  metrics: NEUTRAL_METRICS,
  brief: { label: "neutral", cadence: "", moves: [], lexicalFingerprint: [], hedgingPosture: "balanced", exemplarLine: "" },
};

export const Lawguistics = {
  /**
   * Bend `text` from the user's register toward `target`'s voice by `drift`.
   * `origin` is the starting metric vector; OMIT it to default to the
   * roster-median origin (ROSTER_MEDIAN, wired in Stage 2/3).
   * Stage 0: identity passthrough — baseline == conditioned, slots trivially
   * preserved. Async because the real impl calls a model; `emit` awaits it.
   */
  condition(text: string, _target: VoiceSignature, _drift: number, _origin?: MetricVector): Promise<ConditionResult> {
    return Promise.resolve({ conditioned: text, baseline: text });
  },
  judgeFidelity(_substance: string, _baseline: string, _conditioned: string): Promise<FidelityResult> {
    return NOT_IMPL("judgeFidelity");
  },
  drift: {
    forStage(_stage: Stage): number { return 0; },   // stage-0 ignores drift
  },
  measure(_text: string): MetricVector { return NOT_IMPL("measure"); },
  convergence(_output: MetricVector, _lawyer: MetricVector): number { return NOT_IMPL("convergence"); },
  lsm(_a: MetricVector, _b: MetricVector): number { return NOT_IMPL("lsm"); },
  getSignature(_lawyerId: string): VoiceSignature { return NEUTRAL_SIGNATURE; },   // R3 neutral stub
  getLawyer(_id: string): Lawyer { return NOT_IMPL("getLawyer"); },
  matchTarget(_lawyerId: string): VoiceSignature { return NEUTRAL_SIGNATURE; },     // R3 neutral stub
};

export type {
  MetricVector, VoiceSignature, VoiceBrief, Lawyer, PracticeArea,
  Stage, ConditionResult, FidelityResult, MetricRanges, MetricKey, FnKey,
} from "./types";
