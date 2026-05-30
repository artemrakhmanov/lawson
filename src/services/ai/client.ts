// services/ai/client.ts
// THE ONLY intended importer of the Vercel AI SDK (Spec 02 §3) — server-only.
//
// Stage 0 (Spec 00): the SDK (`ai`, `@ai-sdk/anthropic`) is intentionally NOT
// installed yet — it lands when the harness starts (Spec 02). This stub fixes
// the seam and the single model-id source so callers can be written against it
// now. Implementing this wrapper (generateObject/generateText, temps, retries)
// is a Spec 02 task; do not call these before then.

import { MODEL_ID } from "@/services/config";

export { MODEL_ID };

const NOT_WIRED =
  "services/ai/client: the AI SDK is not wired yet (Spec 02). Install " +
  "`ai` + `@ai-sdk/anthropic` and implement this wrapper before calling.";

/** Structured-output call (generateObject). Wired in Spec 02. */
export async function generateObject(): Promise<never> {
  throw new Error(NOT_WIRED);
}

/** Free-text call (generateText). Wired in Spec 02. */
export async function generateText(): Promise<never> {
  throw new Error(NOT_WIRED);
}
