// lawguistics/stats.ts — Stage 1a. The two reveal numbers, computed from
// vectors already on hand. Pure TS. Imports only ./types and ./metrics.

import { METRIC_KEYS, FN_KEYS } from "./types.ts";
import type { MetricVector, MetricRanges } from "./types.ts";
import { normalise } from "./metrics.ts";

// §7.1 — normalised Euclidean distance → 0 as output approaches the lawyer
// ("watch the gap close"). Normalisation is MANDATORY: raw dims have wildly
// different scales, so an un-normalised distance is dominated by sentence length.
export function convergence(
  output: MetricVector,
  lawyer: MetricVector,
  ranges: MetricRanges,
): number {
  const o = normalise(output, ranges);
  const l = normalise(lawyer, ranges);
  return Math.sqrt(
    METRIC_KEYS.reduce((s, k) => s + (o[k] - l[k]) ** 2, 0),
  );
}

// §7.2 — Pennebaker Linguistic Style Matching → 1 ("LSM 91%"). Mean over the
// five function-word categories of 1 - |a-b|/(a+b). Operates on raw ratios
// (the formula is scale-free), NOT normalised values.
export function lsm(a: MetricVector, b: MetricVector): number {
  const eps = 1e-9;
  return (
    FN_KEYS.reduce(
      (s, k) => s + (1 - Math.abs(a[k] - b[k]) / (a[k] + b[k] + eps)),
      0,
    ) / FN_KEYS.length
  );
}
