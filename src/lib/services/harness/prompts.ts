// harness/prompts.ts — the prompt-template registry. One named template per
// model-backed step (Spec 02 §2); each is a PURE function `(typedInput) →
// { system, prompt }`. No SDK import here — just strings — so all tuning lives
// in one place and the client stays the sole provider importer. Real tuning
// lands with the steps that consume these (P4 triage, P5 agents); these are
// the frozen-shape starter templates.

import type { CaseState, Roster, Turn } from "./contracts";

export type PromptTemplate = { system: string; prompt: string };

// Shared voice for the whole intake — warm, plain, never lawyerly-cold. The
// register bend toward a specific lawyer happens later in Lawguistics, never
// here; these prompts produce neutral *substance*.
const HALO_SYSTEM =
  "You are the reasoning core of Halo, a warm legal-intake assistant. You produce " +
  "the substance of a single intake step as strict JSON matching the requested schema. " +
  "Be concise, concrete, and plain-spoken. Never invent facts the user did not give; " +
  "ask, don't assume. Output substance only — tone is applied downstream.";

const rosterLines = (roster: Roster): string =>
  roster
    .map((l) => `- ${l.id} · ${l.meta.name} (${l.practiceArea}): ${l.summary}`)
    .join("\n");

const transcriptLines = (transcript: Turn[]): string =>
  transcript.length === 0
    ? "(no turns yet)"
    : transcript
        .map((t, i) => `${i + 1}. [${t.stage}] Q: ${t.question}${t.answer ? `\n   A: ${t.answer}` : ""}`)
        .join("\n");

// ── Triage steps (low temp) ──────────────────────────────────────────────────

/** bootstrap(seed) → CaseState: hypothesize the matter and match a lawyer. */
export function bootstrap(input: { seed: string; roster: Roster }): PromptTemplate {
  return {
    system: HALO_SYSTEM,
    prompt:
      `A person just described why they're reaching out:\n"""${input.seed}"""\n\n` +
      `The firm roster:\n${rosterLines(input.roster)}\n\n` +
      `Form an initial hypothesis of the legal matter and a confidence in [0,1]. ` +
      `Pick the single best-fit lawyer id from the roster and give a one-sentence rationale.`,
  };
}

/** selectAgent(s, turnsRemaining) → AgentId: which bench role asks the next question. */
export function selectAgent(input: { caseState: CaseState; turnsRemaining: number }): PromptTemplate {
  const s = input.caseState;
  return {
    system: HALO_SYSTEM,
    prompt:
      `Current matter hypothesis: "${s.matter.hypothesis}" (confidence ${s.matter.confidence}).\n` +
      `Matched lawyer: ${s.lawyerMatch.lawyerId}. Turns remaining: ${input.turnsRemaining}.\n\n` +
      `Transcript so far:\n${transcriptLines(s.transcript)}\n\n` +
      `Choose the agent best placed to ask the most valuable next question: one of ` +
      `claim-quant, merits-analyst, criminal, real-estate, commercial.`,
  };
}

/** recalibrate(s, answer) → CaseState: fold the new answer in; matter/lawyerMatch may move. */
export function recalibrate(input: { caseState: CaseState; answer: string; roster: Roster }): PromptTemplate {
  const s = input.caseState;
  return {
    system: HALO_SYSTEM,
    prompt:
      `Matter so far: "${s.matter.hypothesis}" (confidence ${s.matter.confidence}). ` +
      `Matched lawyer: ${s.lawyerMatch.lawyerId}.\n\n` +
      `The firm roster:\n${rosterLines(input.roster)}\n\n` +
      `Transcript:\n${transcriptLines(s.transcript)}\n\n` +
      `The person just answered:\n"""${input.answer}"""\n\n` +
      `Update the matter hypothesis and confidence. If the evidence now points to a ` +
      `different lawyer id in the roster, move the match and explain why; otherwise keep it. ` +
      `Always return a lawyerId that exists in the roster above.`,
  };
}

/** composeSummary(s) → RawSummary: the CLIENT's one-pager — communicates their
 *  position, not the bench's analysis. Slot tokens only where a detail is
 *  genuinely missing; clean prose when the account is complete. */
export function composeSummary(input: { caseState: CaseState }): PromptTemplate {
  const s = input.caseState;
  return {
    system: HALO_SYSTEM,
    prompt:
      `Write the client's intake one-pager — a plain summary of THEIR situation ` +
      `and what they're seeking, written in their corner. It communicates their ` +
      `position; it is NOT legal analysis or an answer.\n\n` +
      `Matter type (working hypothesis): "${s.matter.hypothesis}".\n` +
      `The person's initial description:\n"""${s.seed}"""\n` +
      `Transcript:\n${transcriptLines(s.transcript)}\n\n` +
      `Produce four fields, drawn only from what the person actually gave:\n` +
      `- matterType: a short, plain label for the kind of matter (no verdict).\n` +
      `- keyFacts: what happened, in plain prose.\n` +
      `- parties: who is involved.\n` +
      `- theAsk: what the person wants help with — their goal, as their position.\n\n` +
      `Hard rules:\n` +
      `- This is the CLIENT's summary, not the bench's analysis. Do NOT quantify ` +
      `the case (no dollar values, damages, odds, or "what it's worth"), do NOT ` +
      `assess the merits or how strong it is, and do NOT state next steps or ` +
      `advise a course of action. Describe the position; don't answer it.\n` +
      `- Use ordinary, non-imperative language ("they want…", "the situation is…") ` +
      `— never "you should" or "we recommend".\n` +
      `- Prefer clean prose. ONLY when a specific factual detail is genuinely ` +
      `missing and would need the person to confirm it, leave one inline slot ` +
      `[[key:free:placeholder]] in its place. If the account is complete, use NO ` +
      `slots. Any slot tokens must survive verbatim.`,
  };
}

// ── Bench agents (moderate temp) ─────────────────────────────────────────────

/** composeTurn({caseState, transcript}, guidance) → RawTurn substance. The
 *  area-true persona is injected as `guidance` (owned by each agent file), so
 *  every agent asks in its own register while sharing one frozen prompt shape. */
export function composeTurn(
  input: { caseState: CaseState; transcript: Turn[] },
  guidance: string,
): PromptTemplate {
  const s = input.caseState;
  return {
    system: HALO_SYSTEM,
    prompt:
      `${guidance}\n\n` +
      `Matter: "${s.matter.hypothesis}". Turns taken: ${s.turnsTaken} of ${s.turnBudget}.\n` +
      `The person's own initial description (treat everything in here as ALREADY KNOWN):\n` +
      `"""${s.seed}"""\n\n` +
      `Transcript:\n${transcriptLines(input.transcript)}\n\n` +
      `Compose ONE intake turn as JSON: an optional warm preamble; exactly one ` +
      `question — the single highest-value thing STILL UNKNOWN; optional framing; ` +
      `exactly 3 short scaffold answers, each anticipating a likely answer and ` +
      `leaving the specifics blank as slot tokens — [[key:free:placeholder]] or ` +
      `[[key:select:a|b|c]], where key is [a-z0-9_-]+; an optional reassurance ` +
      `line; and a freeform placeholder. Surface fields (preamble/framing/` +
      `reassurance) are tone only — never introduce facts the person hasn't given. ` +
      `Do NOT ask for anything the person already stated in their initial ` +
      `description or the transcript — acknowledge what they gave and build on it.`,
  };
}
