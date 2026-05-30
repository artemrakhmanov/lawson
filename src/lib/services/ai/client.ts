// services/ai/client.ts — THE ONLY harness-side importer of the Vercel AI SDK
// (Spec 02 §3, invariant 5). Server-only: never import this into a client
// bundle. The Anthropic provider reads ANTHROPIC_API_KEY from the environment
// (present in .env). Structured-first: everything with shape goes through
// `generateObject`; `generateText` is the rare free-text escape hatch. No
// streaming in v1 — both registers must be fully materialized before the cleave.

import { generateObject as aiGenerateObject, generateText as aiGenerateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ZodType } from "zod";
import { config } from "@/lib/services/config";

// One model id for the whole harness (config.ts). One-line swap (Spec 00 §2).
const model = anthropic(config.modelId);

// Retries on transient failure; deterministic surface. Temperature is a
// per-call knob (config.temps.triage for selection/matching, .compose for
// composition) — the caller passes which.
const MAX_RETRIES = 2;

/** Structured-output call (schema-constrained). The default for anything with shape. */
export async function generateObject<T>(args: {
  schema: ZodType<T>;
  system: string;
  prompt: string;
  temperature: number;
}): Promise<T> {
  const { object } = await aiGenerateObject({
    model,
    schema: args.schema,
    system: args.system,
    prompt: args.prompt,
    temperature: args.temperature,
    maxRetries: MAX_RETRIES,
  });
  return object;
}

/** Free-text call. Rare — only where no schema fits. */
export async function generateText(args: {
  system: string;
  prompt: string;
  temperature: number;
}): Promise<string> {
  const { text } = await aiGenerateText({
    model,
    system: args.system,
    prompt: args.prompt,
    temperature: args.temperature,
    maxRetries: MAX_RETRIES,
  });
  return text;
}
