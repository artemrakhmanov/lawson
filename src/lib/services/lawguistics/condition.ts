// lawguistics/condition.ts — the conditioner (§6.1–6.5). Turns the coupled
// signature (vector + brief) into dual-register output, preserves slot tokens
// byte-identical, and enforces "tone only, never facts" via the fidelity gate.
//
// The four stages: interpolate → translate vector to directives → dual-gen →
// verify(style)+gate(meaning). Then the ordered validation rails: slots →
// fidelity → style. The fallback is ALWAYS baseline (never ship slot-broken or
// meaning-drifted text).
//
// `ranges`/`rosterMedian` are passed in via ctx so this stays testable against
// fixtures now; Stage 3's index.ts closes over the frozen signatures.json values.

import { z } from "zod";
import type {
  VoiceSignature, VoiceBrief, MetricVector, MetricRanges, ConditionResult, FidelityResult,
} from "./types.ts";
import { measure } from "./metrics.ts";
import { targetVector } from "./drift.ts";
import { metricsToDirectives } from "./directives.ts";
import { convergence } from "./stats.ts";
import { generateJSON } from "./ai.ts";
import { judgeFidelity } from "./fidelity.ts";

// ── Module-local config (no env churn) ──────────────────────────────────────
const DEV = process.env.NODE_ENV !== "production";
// Normalised Euclidean over 14 dims for a single SHORT field vs a full-corpus
// signature is inherently large (~1.5–1.9 even on-voice), so this is a coarse
// safety net for egregious misses only — not a per-turn tax. LIVE skips the
// regen entirely (spec §6.4a); the measurement still feeds the reveal bar.
const STYLE_TOLERANCE = 2.6;
const FIDELITY_SCOPE: "highdrift" | "all" = "highdrift";
const FIDELITY_HIGHDRIFT = 0.6; // run the fidelity gate at/above this drift (summary=1.0 always)

export type GenerateFn = <T>(opts: {
  system?: string;
  prompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
}) => Promise<T>;
export type JudgeFn = (
  substance: string,
  baseline: string,
  conditioned: string,
) => Promise<FidelityResult>;

// Injected so condition() is testable with a stubbed AI; Stage 3 binds the real
// ranges/rosterMedian from signatures.json.
export type ConditionContext = {
  ranges: MetricRanges;
  rosterMedian: MetricVector;
  gen?: GenerateFn;
  judge?: JudgeFn;
  dev?: boolean;
  fidelityScope?: "highdrift" | "all";
};

const DualSchema = z.object({
  conditioned: z.string(),
  baseline: z.string(),
});

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

// ── Slot survival (Spec 02 §6 syntax; matches harness/slots/encode.ts). The
// voice lane must not import the harness, so the regex is mirrored locally. ──
const SLOT_RE = /\[\[([a-z0-9_-]+):(free|select):(.*?)\]\]/g;
function slotMultiset(text: string): string[] {
  const out: string[] = [];
  SLOT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SLOT_RE.exec(text)) !== null) out.push(m[0]);
  return out.sort();
}
function sameSlots(a: string, b: string): boolean {
  const x = slotMultiset(a);
  const y = slotMultiset(b);
  return x.length === y.length && x.every((t, i) => t === y[i]);
}

// ── §6.3 prompt assembly ─────────────────────────────────────────────────────
function buildSystem(directives: string[], brief: VoiceBrief, drift: number): string {
  const lines = [
    "Render the SAME content in two registers. Change only the SOUND, never the facts.",
    "",
    "HARD RULES (both registers) — protect the FACTS, free to change the SOUND:",
    "- Preserve every fact, number, name, date, party, substantive claim, commitment, recommendation,",
    "  and request. Do NOT add information or commitments that are not already in the content.",
    "- Do not alter the substance of the ask (you may re-voice it directly: 'could you tell me about X'",
    "  → 'Tell me about X' is fine; asking for something DIFFERENT is not).",
    "- Do not change a legal characterisation (keep 'significant' as 'significant', not 'serious').",
    "- PRESERVE GRAMMATICAL PERSON exactly. NEVER introduce the first person singular ('I', 'me', 'my')",
    "  that is not already in the content — the firm's voice is 'we' or impersonal. If the content is",
    "  already in the first person (the client's own words), keep it in the first person. Do not flip",
    "  person in either direction. Do not address the reader as a lawyer would ('I want to be straightforward",
    "  with you', 'I would gently flag').",
    "- BE CONCISE. The conditioned register must be NO LONGER than the baseline. Cut filler. NEVER add",
    "  reassurance, pleasantries, transparency-signalling, or throat-clearing openers — drop them if present.",
    "- You MAY change rhythm, sentence order, directness, urgency, and word choice — but borrow the voice's",
    "  RHYTHM and DIRECTNESS, not its stock phrases. Do NOT copy the lexicon or exemplar wording verbatim,",
    "  and do NOT open with a signature catchphrase.",
    "- Keep every [[slot]] token exactly as written, byte-for-byte.",
    "",
    "CONDITIONED — style directives (follow precisely):",
    ...directives.map((d) => `- ${d}`),
    "",
    `Voice character (weight: ${drift.toFixed(2)}) — borrow texture only, never copy words or persona:`,
    `- Moves: ${brief.moves.join("; ")}`,
    `- Lexical flavour (use sparingly, never as verbatim stacks): ${brief.lexicalFingerprint.join(", ")}`,
    `- Hedging posture: ${brief.hedgingPosture}`,
    `- Rhythm reference only (do NOT copy its words or persona): "${brief.exemplarLine}"`,
  ];
  if (drift < 0.3) {
    lines.push("", "Mostly mirror the user's plain, informal rhythm.");
  }
  lines.push(
    "",
    "BASELINE — flat, administrative, neutral. No personality. Plainest phrasing.",
    "",
    "Return { conditioned, baseline } rendering the CONTENT exactly, slot tokens intact.",
  );
  return lines.join("\n");
}

// ── The conditioner ──────────────────────────────────────────────────────────
export async function condition(
  text: string,
  target: VoiceSignature,
  driftArg: number,
  origin: MetricVector | undefined,
  ctx: ConditionContext,
): Promise<ConditionResult> {
  const gen = ctx.gen ?? (generateJSON as GenerateFn);
  const judge = ctx.judge ?? judgeFidelity;
  const dev = ctx.dev ?? DEV;
  const fidelityScope = ctx.fidelityScope ?? FIDELITY_SCOPE;

  // 1. interpolate (§6.1) — 14-number goal for this turn
  const drift = clamp01(driftArg);
  const originVec = origin ?? ctx.rosterMedian;
  const tgt = targetVector(originVec, target.metrics, drift, ctx.ranges);

  // 2. translate vector → directives (§6.2). The vector never appears literally.
  const directives = metricsToDirectives(tgt);
  const system = buildSystem(directives, target.brief, drift);

  // 3. dual-generation (§6.3) — one call, both registers
  const runGen = () =>
    gen({ schema: DualSchema, system, prompt: `CONTENT TO RENDER:\n${text}`, temperature: 0.6 });
  let { conditioned, baseline } = await runGen();

  // ── Validation rails, IN ORDER (§6.5) ──
  const applyRails = async (): Promise<void> => {
    // Rail 1 — slot survival on BOTH outputs. Baseline falls back to the
    // original substance (the only guaranteed-correct slot source); conditioned
    // falls back to baseline.
    if (!sameSlots(baseline, text)) baseline = text;
    if (!sameSlots(conditioned, text)) {
      conditioned = baseline;
      return; // already safe; nothing stylistic to gate
    }

    // Rail 2 — semantic fidelity. Skip when there's nothing to compare (already
    // == baseline) or when scope/drift says we don't audit this field.
    const shouldJudge =
      conditioned !== baseline && (fidelityScope === "all" || drift >= FIDELITY_HIGHDRIFT);
    if (shouldJudge) {
      const verdict = await judge(text, baseline, conditioned);
      if (!verdict.faithful) {
        if (dev && verdict.drift_notes) {
          // log the departure (visible in dev runs)
          console.warn(`[condition] fidelity fallback → baseline: ${verdict.drift_notes}`);
        }
        conditioned = baseline; // never ship meaning-drifted text
      }
    }
  };

  await applyRails();

  // Rail 3 — style convergence (§6.4a). DEV: regenerate once with a sharpened
  // directive if the gap is wide. LIVE: skip the regen (latency) — but the
  // measurement still feeds the reveal bar, so the on-screen number is the same
  // signal that gated quality in dev.
  if (dev && conditioned !== baseline) {
    const gap = convergence(measure(conditioned), tgt, ctx.ranges);
    if (gap > STYLE_TOLERANCE) {
      const sharpen =
        "\n\nThe previous attempt did not move far enough toward the target voice. " +
        "Follow the style directives MORE aggressively this time.";
      const retry = await gen({
        schema: DualSchema,
        system: system + sharpen,
        prompt: `CONTENT TO RENDER:\n${text}`,
        temperature: 0.6,
      });
      // re-run the rails on the regenerated output; keep it only if it survives
      const prev = { conditioned, baseline };
      conditioned = retry.conditioned;
      baseline = retry.baseline;
      await applyRails();
      // if the retry collapsed to baseline but the first pass was a kept,
      // distinct, faithful output, prefer the first pass.
      if (conditioned === baseline && prev.conditioned !== prev.baseline) {
        conditioned = prev.conditioned;
        baseline = prev.baseline;
      }
    }
  }

  return { conditioned, baseline };
}
