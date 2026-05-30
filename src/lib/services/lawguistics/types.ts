// lawguistics/types.ts — CANONICAL shared types (R4). Zero runtime except the
// two `const` dimension lists. The harness imports/re-exports these; it never
// redeclares them. Erasable-only TS (no enum/namespace) — Node strips types
// natively in this module (see CLAUDE.md isolation rules).

// cadence / lexical / stance / function-word / punctuation — ~14 numbers,
// fixed shape (Spec 03 §3.2).
export type MetricVector = {
  meanSentenceLen: number;
  sentenceLenVariance: number;
  ttr: number;
  hedgeRatio: number;
  directness: number;
  youDensity: number;
  fnPronoun: number;
  fnArticle: number;
  fnPrep: number;
  fnConj: number;
  fnAux: number;
  commaRate: number;
  questionRate: number;
  dashRate: number;
};

export type PracticeArea = "Criminal" | "RealEstate" | "Commercial";

export type Lawyer = {
  id: string;
  meta: { name: string; title: string };
  practiceArea: PracticeArea;
  summary: string;        // prose Lawson matches against (Spec 01 §6)
  hero?: boolean;         // exactly one true in the roster (§2.3)
};

export type VoiceBrief = {
  label: string;                 // "risk-first, clipped, directive"
  cadence: string;               // prose description of rhythm
  moves: string[];               // ["leads with risk","no reassurance opener", ...]
  lexicalFingerprint: string[];  // characteristic words/connectives
  hedgingPosture: string;        // "directive" | "balanced" | "hedged" + gloss
  exemplarLine: string;          // one short unmistakable line
};

export type VoiceSignature = {
  lawyerId: string;
  metrics: MetricVector;   // deterministic (§3)
  brief: VoiceBrief;       // LLM-distilled, frozen (§4.2)
};

// per-dimension min/max across the roster, for fair normalisation (§3.5).
// Frozen into signatures.json.
export type MetricRanges = { min: MetricVector; max: MetricVector };

export type Stage = "opening" | "q1" | "q2" | "q3" | "summary";

export type ConditionResult = { conditioned: string; baseline: string };

export type FidelityResult = { faithful: boolean; drift_notes?: string };

// the union of metric keys — handy for iterating dimensions in
// metrics/stats/interpolation
export const METRIC_KEYS = [
  "meanSentenceLen", "sentenceLenVariance", "ttr", "hedgeRatio", "directness", "youDensity",
  "fnPronoun", "fnArticle", "fnPrep", "fnConj", "fnAux", "commaRate", "questionRate", "dashRate",
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

// the 5 function-word categories used by LSM (§7.2)
export const FN_KEYS = ["fnPronoun", "fnArticle", "fnPrep", "fnConj", "fnAux"] as const;
export type FnKey = (typeof FN_KEYS)[number];
