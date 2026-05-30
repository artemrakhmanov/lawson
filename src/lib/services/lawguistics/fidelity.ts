// lawguistics/fidelity.ts — the semantic-fidelity gate (§6.4b). The meaning
// guardrail: style proves the SOUND moved; this proves the FACTS held. One
// cheap structured LLM call. "Tone only, never facts" is the compliance
// posture and the cleave's integrity claim — this is what makes it ENFORCED.

import { z } from "zod";
import { generateJSON } from "./ai.ts";
import type { FidelityResult } from "./types.ts";

// Injectable for tests; defaults to the real module AI boundary.
export type GenerateFn = <T>(opts: {
  system?: string;
  prompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
}) => Promise<T>;

const FidelitySchema = z.object({
  faithful: z
    .boolean()
    .describe("true iff conditioned conveys identical facts/claims/asks to baseline"),
  drift_notes: z
    .string()
    .optional()
    .describe("on failure, the specific semantic departure(s)"),
});

const SYSTEM =
  "You are a strict fidelity auditor for a legal-intake system. Two texts render the " +
  "same content in different registers. Your ONLY job is to confirm they convey " +
  "IDENTICAL facts, claims, commitments, and asks. IGNORE tone, warmth, length, " +
  "formality, and phrasing entirely. Flag ONLY semantic departures: a fact added, " +
  "dropped, or altered; the strength of a claim changed; a new implication, promise, " +
  "or recommendation introduced. When in doubt that meaning held, return faithful=false.";

/**
 * judgeFidelity(substance, baseline, conditioned) -> { faithful, drift_notes? }.
 * 4th arg is an injectable generator (tests); production omits it. The public
 * Lawguistics.judgeFidelity is the 3-arg form.
 */
export async function judgeFidelity(
  substance: string,
  baseline: string,
  conditioned: string,
  gen: GenerateFn = generateJSON,
): Promise<FidelityResult> {
  return gen({
    schema: FidelitySchema,
    system: SYSTEM,
    temperature: 0,
    prompt: [
      "Do the CONDITIONED and BASELINE texts below convey identical facts, claims, commitments, and asks?",
      "(SUBSTANCE is the original source, for reference.)",
      "",
      "SUBSTANCE:",
      substance,
      "",
      "BASELINE:",
      baseline,
      "",
      "CONDITIONED:",
      conditioned,
    ].join("\n"),
  });
}
