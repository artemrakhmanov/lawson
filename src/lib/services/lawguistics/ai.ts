// lawguistics/ai.ts — the module-local AI boundary (R7). The ONLY file in the
// voice module that imports a provider SDK. Server-only: reads ANTHROPIC_API_KEY
// from env (scripts get it via `--env-file=.env`; the app already has it in
// process.env). Kept module-local so the voice lane never edits shared harness
// files; the documented one-file swap to delegate to @/lib/services/ai is a
// post-demo nicety, not on the critical path.

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { z } from "zod";

// Model id from one constant (env-overridable). Swappable in one place.
export const MODEL = process.env.LAWGUISTICS_MODEL ?? "claude-opus-4-8";

const MAX_RETRIES = 2;

/**
 * Structured-output call — schema-constrained JSON. The module's single AI
 * entry point. Callers are insulated from the SDK surface: if `generateObject`
 * changes, adapt here only.
 */
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
    maxRetries: MAX_RETRIES,
  });
  return object;
}
