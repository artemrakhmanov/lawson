// services/config.ts
// Central, one-line-swappable configuration for Lawson (Spec 00 §2, §7).
// Provisional values only — Spec 02/03 finalise the harness + Lawguistics.

/** The single model id for the whole harness. One-line swap (Spec 00 §2). */
export const MODEL_ID = "claude-sonnet-4-6" as const;

/**
 * Drift schedule PLACEHOLDER (Spec 00 §8). Maps an intake stage index to a
 * drift amount in [0,1]: 0 = flat baseline (mirror the user), 1 = full
 * convergence toward the matched lawyer's voice. Spec 03 replaces this with
 * real interpolation behind `Lawguistics.drift.forStage(stage)`.
 */
export const DRIFT_SCHEDULE: readonly number[] = [0, 0.25, 0.5, 0.75, 1];

/** Demo-safety feature flags (Spec 00 §7). */
export const FLAGS = {
  /** Routing is live, but the demo seed prompt deterministically lands the hero lawyer. */
  seedSteering: true,
  /** Worst-case deterministic override: a lawyer id to force-match. `null` = off. */
  fixedFallbackLawyerId: null as string | null,
} as const;
