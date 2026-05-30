// lawguistics/directives.ts — Stage 1a. The critical translator: a target
// MetricVector → plain-English style instructions, using BANDS not raw floats
// (a model can hit "short, ~6–11 words"; it cannot hit "fnPrep: 0.118").
// Pure TS. Imports only ./types. (Spec 03 §6.2.)

import type { MetricVector } from "./types.ts";

// threshold for "varies a lot" — population variance of per-sentence word counts
const HIGH_VARIANCE = 25;

// Verbalise ONLY consciously-controllable dimensions: cadence, hedging,
// directness, punctuation. Function-word metrics (fnPronoun…fnAux) are NEVER
// turned into targets — they ride along implicitly and are measured afterward
// for the LSM stat (§7.2).
export function metricsToDirectives(v: MetricVector): string[] {
  const d: string[] = [];

  // cadence
  if (v.meanSentenceLen < 11) {
    d.push("Use short, clipped sentences (~6–11 words).");
  } else if (v.meanSentenceLen > 20) {
    d.push("Use long, flowing sentences (~20–30 words) with subordinate clauses.");
  } else {
    d.push("Use medium sentences (~12–18 words).");
  }
  if (v.sentenceLenVariance > HIGH_VARIANCE) {
    d.push("Vary sentence length — mix very short sentences with longer ones.");
  }

  // stance — hedging
  if (v.hedgeRatio < 0.01) {
    d.push("Do not hedge. State things plainly and assertively.");
  } else if (v.hedgeRatio > 0.03) {
    d.push("Soften claims with hedging (may, might, generally).");
  }

  // stance — directness
  if (v.directness > 0.3) {
    d.push("Lead with imperatives — tell the reader what to do.");
  }
  if (v.youDensity > 0.04) {
    d.push("Address the reader directly and often as 'you'.");
  }

  // punctuation rhythm
  if (v.commaRate > 2) {
    d.push("Use commas freely; layer clauses.");
  }
  if (v.dashRate > 0.3) {
    d.push("Use em-dashes for emphasis.");
  }
  if (v.questionRate > 0.2) {
    d.push("Pose rhetorical questions to draw the reader in.");
  }

  return d;
}
