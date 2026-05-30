# P1 — AI Client + Prompt Registry

> Session brief. Depends on P0. This is the **only** module allowed to import the Vercel AI SDK.

## Goal
A single wrapped model client that every model-backed harness step calls, plus one central place for all prompt templates so tuning is centralized.

## Files touched
- `src/lib/services/ai/client.ts` — the sole AI SDK importer.
- `src/lib/services/harness/prompts.ts` — prompt-template registry (one export per model step).

## Design (Spec 02 §2)
- **Structured-first.** Expose thin wrappers over `generateObject` (schema-constrained, Zod) and `generateText` (rare). Everything with shape goes through `generateObject`.
- **Server-only.** This module must never be importable into a client bundle; it reads `ANTHROPIC_API_KEY` from the environment (present in `.env`).
- **No streaming in v1** — both registers must be materialized before the cleave; streaming would break that.
- **Determinism knobs centralized here + `config.ts`:** low temperature for triage selection/matching/recalibrate (`config.temps.triage`), moderate for question/scaffold composition (`config.temps.compose`). Caller passes which.
- **Retries** on transient failure; deterministic surface.

Suggested surface:
```ts
export async function generateObject<T>(args: {
  schema: ZodSchema<T>; system: string; prompt: string; temperature: number;
}): Promise<T>;
export async function generateText(args: {
  system: string; prompt: string; temperature: number;
}): Promise<string>;
```

- **Prompt registry** (`prompts.ts`): one named template per step — `bootstrap`, `selectAgent`, `recalibrate`, `composeSummary`, and one per agent's `composeTurn`. Each is a pure function `(typedInput) → { system, prompt }`. No SDK import here; just strings.

## Entry criteria
- P0 complete (deps installed, `config.ts` present).
- Before writing any server-touching code, skim `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` (B7) — though routes land in P7, confirm the server-only import boundary now.

## Exit criteria
- `client.ts` is the only file importing `ai` / `@ai-sdk/anthropic` (grep to confirm).
- A trivial smoke call (`generateObject` with a 1-field Zod schema) returns a typed object against the live key.
- `prompts.ts` exports a stub template for each model step; no SDK import in it.

## Invariants to preserve
- (5) Provider only behind `services/ai`; server-only; UI-free.

## Contract / blocker references
- Contracts: §1.9–§1.11 (the steps that will call this).
- Blockers: **B7** (read Next docs before server code).
