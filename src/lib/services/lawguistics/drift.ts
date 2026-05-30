// lawguistics/drift.ts — Stage 1a. The stage→drift schedule and per-dimension
// interpolation toward the lawyer's voice. Pure TS. Imports ./types + ./metrics.

import { METRIC_KEYS } from "./types.ts";
import type { MetricVector, MetricRanges, Stage } from "./types.ts";
import { normalise, denormalise } from "./metrics.ts";

// §5.1 — sub-threshold ramp: opening barely bends, summary lands on the voice.
// Tunable: if contrast is weak, widen the spread (lower the floor) — don't
// lengthen it (§5.3).
// Wide spread, floor at 0.15. Summary tops out at 0.8 (not 1.0): at full lawyer
// voice the conditioner over-reaches and invents risk characterisations, which
// the fidelity gate correctly kills → a flat summary. The top was eased from
// 0.9→0.8 (q3 0.85→0.7) to dial back over-stylisation while the money-shot
// panel still pops — the voice contrast now comes from cleaner directives and
// depersonalised briefs, not raw drift intensity.
const DRIFT_BY_STAGE: Record<Stage, number> = {
  opening: 0.15,
  q1: 0.4,
  q2: 0.65,
  q3: 0.7,
  summary: 0.8,
};

export function forStage(stage: Stage): number {
  return DRIFT_BY_STAGE[stage] ?? 0.15;
}

// §5.2 — per-dimension lerp in NORMALISED space, then de-normalise for a
// human-readable target vector. drift=0 → origin (mirror the client);
// drift=1 → the lawyer's measured style; between → a smooth sub-threshold path.
export function targetVector(
  origin: MetricVector,
  lawyer: MetricVector,
  drift: number,
  ranges: MetricRanges,
): MetricVector {
  const o = normalise(origin, ranges);
  const l = normalise(lawyer, ranges);
  const t = {} as MetricVector;
  for (const k of METRIC_KEYS) t[k] = o[k] + (l[k] - o[k]) * drift;
  return denormalise(t, ranges);
}
