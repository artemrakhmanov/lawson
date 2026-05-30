# Stage 1b — AI Wrapper + Synthetic Firm Generation

> The critical-path long pole (LLM generation). **Front-load this.** Produces `data/firm.json` — the roster + exaggerated corpus that Lawson matches against and that Stage 2 measures/distills. Gates on Stage 0 types + the `ai` SDK being installed. Spec refs → §2, §2.4.

## Goal

1. Flesh out `ai.ts` into a real wrapper over the `ai` SDK (the module's single AI boundary).
2. Write `scripts/generate-firm.ts` — one offline run that produces the firm (roster + per-lawyer corpus) and **commit** the result to `data/firm.json` so the demo is deterministic and offline-safe.

## Files to create / fill

- `src/lib/services/lawguistics/ai.ts` — real `generateJSON` over `ai` SDK + `MODEL` constant (replaces Stage 0 stub).
- `src/lib/services/lawguistics/scripts/generate-firm.ts` — offline generator.
- `src/lib/services/lawguistics/data/firm.json` — **committed output**.

## `ai.ts` — the AI boundary

Wrap the shared `ai` SDK directly (imports `ai` + `@ai-sdk/anthropic`), **not** the harness's `services/ai/client.ts` (may not exist yet). Keep it the only file in the module that imports a provider.

```ts
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { z } from "zod";

export const MODEL = process.env.LAWGUISTICS_MODEL ?? "claude-opus-4-8";

export async function generateJSON<T>(opts: {
  system?: string;
  prompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
}): Promise<T> {
  const { object } = await generateObject({
    model: anthropic(MODEL),
    schema: opts.schema,
    system: opts.system,
    prompt: opts.prompt,
    temperature: opts.temperature ?? 0.7,
  });
  return object;
}
```

> **Server-only.** Reads `ANTHROPIC_API_KEY` from env (the `--env-file=.env` flag supplies it for scripts; in the app it's already in `process.env`). Confirm the installed `ai`/`@ai-sdk/anthropic` API surface before finalizing — version differs from training data (AGENTS.md). If `generateObject` signature changed, adapt here only; callers are insulated.
>
> **Swap path (documented):** later, replace the SDK import block with a delegate to `@/lib/services/ai` — no caller changes.

## `scripts/generate-firm.ts` — one pass, two outputs (§2.1)

Generate in one script (may be several LLM calls):

### The roster (§2.1)
One firm; **2 lawyers per practice area** across Criminal / Real Estate / Commercial (6 total). Each lawyer: `meta {name, title}`, `practiceArea`, `summary` (the prose Lawson matches against — keep summaries **distinct** for unambiguous selection, Spec 00 §6 / 01 §6).

### The corpus (§2.1)
Per lawyer, **3–5 synthetic emails/letters** to a hypothetical client. This is signature feedstock — not shipped to UI. Generate each lawyer's corpus under an **archetype brief** that pushes the tells hard (§2.2):
- **Criminal — "risk-first, clipped, directive."** Short sentences, leads with exposure, no reassurance opener, imperatives, low hedging.
- **Real Estate — "measured, procedural, reassuring."** Longer flowing sentences, subordinate clauses, step-by-step, warm openers, moderate hedging.
- **Commercial — "precise, figure-led, formal."** Dense vocabulary, defined terms, clause/amount references, balanced hedging, low warmth.

Exaggeration at the source = clean distillation = bold conditioning (the contrast is the product). Temperature moderate-high for stylistic variety; the archetype brief is the system instruction.

### Hero designation (§2.3)
Mark exactly **one** lawyer `hero: true` — the boldest voice. Pick a **Criminal "risk-first"** lawyer (diffs hardest against a bland baseline). The seed prompt + fallback flag target it.

## Output shape (`data/firm.json`)

```jsonc
{
  "firm": { "name": "..." },
  "lawyers": [
    {
      "id": "criminal-risk-01",
      "meta": { "name": "...", "title": "..." },
      "practiceArea": "Criminal",
      "summary": "...",            // matched against
      "hero": true,
      "corpus": ["email 1 text", "email 2 text", "..."]  // 3–5 entries, NOT shipped to UI
    }
    // ... 5 more
  ]
}
```

> `corpus` lives in `firm.json` (Stage 2 reads it); the `Lawyer` type exposed to the app (Stage 0) does **not** include `corpus` — the signature pipeline strips it. Keep that separation.

## Schemas (zod)

Define Zod schemas in the script for `generateObject`: roster schema (array of lawyer meta+summary+area) and per-lawyer corpus schema (array of strings, length 3–5). Validate exactly one `hero:true` after generation; if the model didn't set it, set it deterministically on the chosen Criminal lawyer.

## Determinism

Re-runnable, but the **committed** `firm.json` is the demo's source of truth — don't regenerate casually before the demo. If regenerated, re-run Stage 2 (`build-signatures`) so `signatures.json` stays consistent.

## Run

```
node --env-file=.env src/lib/services/lawguistics/scripts/generate-firm.ts
```
(Node 23 native TS stripping. `.ts` relative imports allowed in this script file.)

## Dependencies / what it gates

- Gates on: Stage 0 types + `ai`/`@ai-sdk/anthropic`/`zod` installed (harness team in progress). If not yet resolvable, write the script + `ai.ts` against the types and run once the install lands.
- Gated by it: **Stage 2** (`build-signatures` reads `firm.json`) and Lawson matching (reads roster).

## Done-check

- `firm.json` committed: 6 lawyers, 2 per area, 3–5 corpus emails each, exactly one `hero:true`.
- Summaries are distinct enough that a human can tell the areas apart.
- Corpus visibly exhibits each archetype's tells (Criminal clipped/directive, RE flowing/warm, Commercial dense/figure-led).
- `ai.ts` is the only module file importing a provider SDK. No edits outside the module dir.
