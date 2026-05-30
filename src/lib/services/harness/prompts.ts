// harness/prompts.ts — the prompt-template registry. One named template per
// model-backed step (Spec 02 §2); each is a PURE function `(typedInput) →
// { system, prompt }`. No SDK import here — just strings — so all tuning lives
// in one place and the client stays the sole provider importer. Real tuning
// lands with the steps that consume these (P4 triage, P5 agents); these are
// the frozen-shape starter templates.

import type { CaseState, Roster, Turn } from "./contracts";

export type PromptTemplate = { system: string; prompt: string };

// Shared voice for the whole intake — plain, terse, never lawyerly-cold. The
// register bend toward a specific lawyer happens later in Lawguistics, never
// here; these prompts produce neutral *substance*.
const HALO_SYSTEM =
  "You are the reasoning core of Halo, a terse legal-intake assistant. You produce " +
  "the substance of a single intake step as strict JSON matching the requested schema. " +
  "Be concise, concrete, and plain-spoken — short sentences, no filler, no reassurance, " +
  "no throat-clearing. Each step tells you who is speaking and in which grammatical " +
  "person — follow it exactly. Never invent facts the user did not give; ask, don't " +
  "assume. Output substance only — tone is applied downstream.";

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
      `Write the client's OWN STATEMENT of their matter — as if THEY are telling it, ` +
      `in the first person ("I", "my", "we" as the client). It is their plain account ` +
      `of what happened and what they want; it is NOT a third-person case note, NOT ` +
      `legal analysis, and NOT an answer. Every sentence in keyFacts/parties/theAsk ` +
      `should sound like the client speaking ("I paid…", "My landlord…", "I want…").\n\n` +
      `Matter type (working hypothesis): "${s.matter.hypothesis}".\n` +
      `The person's initial description:\n"""${s.seed}"""\n` +
      `Transcript:\n${transcriptLines(s.transcript)}\n\n` +
      `Produce four fields, drawn only from what the person actually gave:\n` +
      `- matterType: a SHORT noun-phrase LABEL only — 3 to 6 words, e.g. "Tenancy ` +
      `deposit dispute". NOT a sentence: no analysis, no penalties, no next steps, ` +
      `no slot tokens.\n` +
      `- keyFacts: what happened, in the client's own first person ("I paid…", ` +
      `"My landlord…"), plain and brief.\n` +
      `- parties: who is involved, in the client's first person ("I'm the tenant; ` +
      `my landlord…").\n` +
      `- theAsk: what the client wants, in their own first-person words ("I want to…").\n\n` +
      `Example of the required first-person voice (a DIFFERENT matter — copy the voice, not the facts):\n` +
      `  matterType: "Commercial deposit dispute"\n` +
      `  keyFacts: "I paid a £2,000 deposit on 5 Jan 2023 when I leased the shop unit. ` +
      `When I left, my landlord kept it claiming repairs, but never gave me receipts."\n` +
      `  parties: "I'm the former commercial tenant; my landlord owns the unit."\n` +
      `  theAsk: "I want my full deposit back, minus only repairs they can actually prove."\n\n` +
      `Hard rules:\n` +
      `- Be concise: one to three short sentences per field. No padding, no hedging, ` +
      `no reassurance, no throat-clearing.\n` +
      `- This is the CLIENT's own account, not the bench's analysis. Do NOT quantify ` +
      `the case (no dollar values, damages, odds, or "what it's worth"), do NOT ` +
      `assess the merits or how strong it is, and do NOT state next steps or ` +
      `advise a course of action. State the position; don't answer it.\n` +
      `- Voice (keyFacts/parties/theAsk): the CLIENT speaking in the FIRST PERSON ` +
      `("I", "my") — this is the one place the first person is REQUIRED. It is NOT ` +
      `the firm's or a lawyer's "I", and never "you should" or "we recommend". ` +
      `(matterType stays a bare label.)\n` +
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
      `Compose ONE intake turn as JSON. Be terse — no filler, no reassurance, no pleasantries.\n` +
      `- question: the single highest-value thing STILL UNKNOWN, as ONE short question. ` +
      `The firm voice is impersonal or "we" — never first-person "I", never a named lawyer.\n` +
      `- preamble (optional): at most one short, plain sentence of context, in the firm ` +
      `voice ("we"/impersonal). Omit it if it adds nothing.\n` +
      `- framing (optional): at most one short sentence — facts only, never reassurance.\n` +
      `- scaffolds: exactly 3. Each BEGINS from the client's perspective and is the ` +
      `CLIENT's own reply in the FIRST PERSON ("I…", "My…", "We…") — a distinct, ` +
      `plausible, concrete answer that MOVES THE CONVERSATION FORWARD. It must read ` +
      `like the client talking. Do NOT write impersonal statements ("The tenancy ` +
      `started…") or procedural notes ("Confirmation requires checking…"), and do ` +
      `NOT restate the question. Leave the specific detail blank as a slot token — ` +
      `[[key:free:placeholder]] or [[key:select:a|b|c]], where key is [a-z0-9_-]+. ` +
      `One short sentence each.\n` +
      `- freeform.placeholder: a brief, neutral prompt to answer in their own words.\n` +
      `Do NOT produce a reassurance line. Surface text introduces NO facts the person ` +
      `hasn't given. Do NOT ask for anything the person already stated in their initial ` +
      `description or the transcript — build on what they gave.`,
  };
}
