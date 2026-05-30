// services/config.ts — central, one-line-swappable harness configuration
// (Spec 00 §2, §7). The single source for the model id, the turn budget, the
// composition temperatures, and the demo-safety steering pin.

export const config = {
  /** The single model id for the whole harness. One-line swap (Spec 00 §2). */
  modelId: "claude-sonnet-4-6",
  /** N — small, demo-sized turn budget (the q1/q2/q3 ladder). */
  turnBudget: 3,
  /** Low temp for selection/matching; moderate for composition. */
  temps: { triage: 0.1, compose: 0.6 },
  /**
   * Worst-case deterministic override (Spec 00 §7): force-match a lawyer id.
   * Off by default — routing is live. Flip `enabled` to pin the hero in a demo.
   */
  fixedFallback: { enabled: false, lawyerId: "" },
} as const;
