# Stage 0 — The Contract (`types.ts` + stubbed `index.ts`)

> **Build this first. It blocks everything.** ~15 min. Once it lands, harness/UI agents import the real shape and stop being blocked; every other Lawguistics stage codes against these types. See `00-overview.md` for isolation rules. Spec refs → `docspecs/03-lawguistics-module.md`.

## Goal

Pin the module's type contract and a stubbed public surface so:
1. parallel agents (1a/1b/1c) build against fixed types with no churn;
2. harness/UI agents can `import { Lawguistics } from "@/lib/services/lawguistics"` immediately (functions exist, throw "not implemented", but type-check).

## Files to create

- `src/lib/services/lawguistics/types.ts` — zero runtime, all shared types.
- `src/lib/services/lawguistics/index.ts` — the `Lawguistics` brand object + re-exports. Stubs throw until later stages wire real impls.
- `src/lib/services/lawguistics/ai.ts` — **signatures only** at this stage (function shapes that 1b/1c/2 will fill). Keeps the AI boundary fixed early.

## `types.ts` — exact shapes (§3.2, §4.1, Spec 00/01)

```ts
// cadence / lexical / stance / function-word / punctuation — ~14 numbers, fixed shape (§3.2)
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

// per-dimension min/max across the roster, for fair normalisation (§3.5). Frozen into signatures.json.
export type MetricRanges = { min: MetricVector; max: MetricVector };

export type Stage = "opening" | "q1" | "q2" | "q3" | "summary";

export type ConditionResult = { conditioned: string; baseline: string };

export type FidelityResult = { faithful: boolean; drift_notes?: string };

// the union of metric keys — handy for iterating dimensions in metrics/stats/interpolation
export const METRIC_KEYS = [
  "meanSentenceLen","sentenceLenVariance","ttr","hedgeRatio","directness","youDensity",
  "fnPronoun","fnArticle","fnPrep","fnConj","fnAux","commaRate","questionRate","dashRate",
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

// the 5 function-word categories used by LSM (§7.2)
export const FN_KEYS = ["fnPronoun","fnArticle","fnPrep","fnConj","fnAux"] as const;
export type FnKey = (typeof FN_KEYS)[number];
```

> Note: `METRIC_KEYS`/`FN_KEYS` are `const` arrays (erasable-safe) — **not** enums. Every later stage iterates dimensions via these so adding/removing a metric is one edit.

## `index.ts` — the brand object (stub now, wired in Stage 3)

```ts
import type {
  MetricVector, VoiceSignature, Lawyer, Stage, ConditionResult, FidelityResult,
} from "./types";

const NOT_IMPL = (n: string) => { throw new Error(`Lawguistics.${n} not implemented yet`); };

export const Lawguistics = {
  condition(_text: string, _target: VoiceSignature, _drift: number, _origin?: MetricVector): Promise<ConditionResult> {
    return NOT_IMPL("condition");
  },
  judgeFidelity(_substance: string, _baseline: string, _conditioned: string): Promise<FidelityResult> {
    return NOT_IMPL("judgeFidelity");
  },
  drift: {
    forStage(_stage: Stage): number { return NOT_IMPL("drift.forStage"); },
  },
  measure(_text: string): MetricVector { return NOT_IMPL("measure"); },
  convergence(_output: MetricVector, _lawyer: MetricVector): number { return NOT_IMPL("convergence"); },
  lsm(_a: MetricVector, _b: MetricVector): number { return NOT_IMPL("lsm"); },
  getSignature(_lawyerId: string): VoiceSignature { return NOT_IMPL("getSignature"); },
  getLawyer(_id: string): Lawyer { return NOT_IMPL("getLawyer"); },
  matchTarget(_lawyerId: string): VoiceSignature { return NOT_IMPL("matchTarget"); },
};

export type {
  MetricVector, VoiceSignature, VoiceBrief, Lawyer, PracticeArea,
  Stage, ConditionResult, FidelityResult, MetricRanges, MetricKey, FnKey,
} from "./types";
```

> `condition`/`judgeFidelity` are **async** (they call a model). `measure`/`convergence`/`lsm`/`drift.forStage` are sync (pure). Decide this now so the harness types its calls correctly — `emit` will `await condition`.

## `ai.ts` — signatures only (filled in 1b)

Declare the function shapes the AI-using stages depend on, so 1b/1c/2 import stable names:

```ts
// thin wrapper over the `ai` SDK; real impl in Stage 1b. Server-only.
export async function generateJSON<T>(opts: { system?: string; prompt: string; schema: unknown; temperature?: number }): Promise<T> {
  throw new Error("ai.generateJSON not implemented yet");
}
// model id from one constant (read env); keep here so it's swappable in one place.
export const MODEL = process.env.LAWGUISTICS_MODEL ?? "claude-opus-4-8";
```

> The `schema` is typed `unknown` here to avoid importing `zod` before it's installed; Stage 1b narrows it to a Zod schema. Keep the public name `generateJSON` stable.

## Decisions to lock here (don't churn later)

- **`condition` is `async` and returns `Promise<ConditionResult>`.** Harness `await`s it.
- **`origin?: MetricVector` is part of the signature** (the contract gap fix). Document in the JSDoc that omission ⇒ roster-median origin.
- **`METRIC_KEYS`/`FN_KEYS` are the canonical dimension lists** — all iteration goes through them.

## Dependencies / what it gates

- Gates on: nothing.
- Gated by it: **everything** (1a, 1b, 1c, 2, 3) and the harness/UI agents.

## Done-check

- `npx tsc --noEmit` (or the harness's typecheck) passes with `index.ts`/`types.ts`/`ai.ts` present.
- A throwaway `import { Lawguistics } from "@/lib/services/lawguistics"` type-checks and autocompletes all nine surface members.
- No edits outside `src/lib/services/lawguistics/`.
