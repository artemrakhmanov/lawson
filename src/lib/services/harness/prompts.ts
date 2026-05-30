// harness/prompts.ts — the prompt-template registry. One named template per
// model-backed step (Spec 02 §2); each is a PURE function `(typedInput) →
// { system, prompt }`. No SDK import here — just strings — so all tuning lives
// in one place and the client stays the sole provider importer. Real tuning
// lands with the steps that consume these (P4 triage, P5 agents); these are
// the frozen-shape starter templates.

import type { AgentId, CaseState, Roster, Turn } from "./contracts";

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

/** composeSummary(s) → RawSummary: the one-pager substance, each field slot-bearing. */
export function composeSummary(input: { caseState: CaseState }): PromptTemplate {
  const s = input.caseState;
  return {
    system: HALO_SYSTEM,
    prompt:
      `Compose a one-page intake summary from the full transcript.\n\n` +
      `Matter: "${s.matter.hypothesis}".\n` +
      `Transcript:\n${transcriptLines(s.transcript)}\n\n` +
      `Produce: matterType, keyFacts, parties, theAsk. Where a detail is uncertain or ` +
      `still needs the user's confirmation, leave an inline slot token ` +
      `[[key:free:placeholder]] rather than guessing. Slots must survive verbatim.`,
  };
}

// ── Bench agents (moderate temp) ─────────────────────────────────────────────

// Each agent's distinct character. The composeTurn template injects the role so
// every agent asks in its own register while sharing one frozen prompt shape.
const AGENT_ROLES: Record<AgentId, string> = {
  "claim-quant":
    "the numbers analyst — you quantify: amounts, dates, durations, losses, what a claim is worth.",
  "merits-analyst":
    "the merits analyst — you weigh whether a grievance is worth pursuing and where it is strong or weak.",
  criminal:
    "the criminal-defense specialist — you move fast on exposure, custody, what was said, and what happens next.",
  "real-estate":
    "the real-estate specialist — you pin down the property, the contract, the deadlines, and the parties to it.",
  commercial:
    "the commercial specialist — you read the business arrangement, its terms, and the commercial risk first.",
};

/** composeTurn(agentId, {caseState, transcript}) → RawTurn substance for the next question. */
export function composeTurn(
  agentId: AgentId,
  input: { caseState: CaseState; transcript: Turn[] },
): PromptTemplate {
  const s = input.caseState;
  return {
    system: HALO_SYSTEM,
    prompt:
      `You are ${AGENT_ROLES[agentId]}\n\n` +
      `Matter: "${s.matter.hypothesis}". Stage budget left: ${s.turnBudget - s.turnsTaken}.\n` +
      `Transcript:\n${transcriptLines(input.transcript)}\n\n` +
      `Compose ONE intake turn: an optional warm preamble, exactly one question, ` +
      `optional framing, exactly 3 short scaffold answers (each may carry ` +
      `[[key:free:placeholder]] or [[key:select:a|b|c]] slot tokens), an optional ` +
      `reassurance line, and a freeform placeholder. Ask only what you don't yet know.`,
  };
}
