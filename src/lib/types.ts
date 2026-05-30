// lib/types.ts — shared types. DELIBERATELY THIN & PROVISIONAL (Spec 00 §5).
//
// Only two things are concrete here:
//   1. the Lawyer roster shape — Spec 00 §6 fully specifies it (the roster needs it), and
//   2. the raw/conditioned seam pair — Spec 00 §3.3, an opaque dual-register unit.
//
// Do NOT add Turn / CaseState / Session fields yet — those crystallise once
// Lawguistics exists (Spec 03 drives them). `Session` stays an open bag here.

/** Practice areas across the single firm (Spec 00 §6). */
export type PracticeArea =
  | "personal-injury"
  | "litigation"
  | "criminal"
  | "real-estate"
  | "commercial";

/** A lawyer in the firm roster (Spec 00 §6): meta + practice area + summary. */
export interface Lawyer {
  id: string;
  name: string;
  /** Light display field (title / role). */
  title: string;
  practiceArea: PracticeArea;
  /** Short prose: what they do / who they're for — the LLM match target. */
  summary: string;
}

/**
 * The sacred seam (Spec 00 §3.3): every screen-bound unit of text carries BOTH
 * a flat baseline register and a conditioned register. Opaque by design.
 * Generic so later specs can enrich `T` without churning call sites.
 */
export interface ConditionedPair<T = string> {
  baseline: T;
  conditioned: T;
}

/**
 * Provisional session shape (Spec 00 §5 — intentionally loose). The harness
 * (Spec 01/02) adds real fields (turns, summary, matched lawyer, drift cursor).
 */
export interface Session {
  id: string;
  [key: string]: unknown;
}
