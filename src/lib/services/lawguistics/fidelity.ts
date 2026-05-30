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

const SYSTEM = [
  "You are a fidelity auditor for a legal-intake system. Two texts render the same content",
  "in different registers (one flat, one in a lawyer's voice). The voice is ALLOWED to differ;",
  "your job is to protect the FACTS, not the tone.",
  "",
  "IGNORE entirely (these are register, not meaning): warmth, urgency, directness, politeness,",
  "formality, length, sentence order, word choice, hedging, and the presence or absence of",
  "purely emotional pleasantries or reassurance ('don't worry', 'you're in good hands', 'I",
  "understand this is stressful'). Re-voicing an existing request more or less directly",
  "(e.g. 'could you tell me about X' → 'Tell me about X') is tone, NOT a change of ask.",
  "",
  "Flag faithful=false ONLY for a genuine departure in INFORMATION: a fact, number, name, date,",
  "or party added / dropped / altered; the substance of a request changed (asking for something",
  "different); a substantive claim, commitment, recommendation, or legal characterisation added,",
  "dropped, or reversed. Intensity adjectives that don't change a factual claim are fine.",
  "If only tone/phrasing changed and every fact, ask, and substantive claim survives, return true.",
].join("\n");

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
