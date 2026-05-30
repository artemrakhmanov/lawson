// harness/triage.ts — Triage, the conductor (contracts §1.9). The only holder
// of global state (CaseState), the router that decides who speaks next, and the
// live matter/lawyer matcher. Four model-backed methods, each its own prompt
// template + Zod-constrained generateObject call. Triage emits ONLY raw
// substance (invariant 4) — never conditioned text; Lawson emits it (P6).
//
// Matching is a single low-temp model selection (Spec 01 §6) — no embeddings.
// Reads the stub roster (B1) until firm.json lands (D6).

import { z } from "zod";
import { generateObject } from "@/lib/services/ai/client";
import { config } from "@/lib/services/config";
import { Lawguistics } from "@/lib/services/lawguistics";
import * as prompts from "./prompts";
import type {
  AgentId, CaseState, PracticeArea, RawSummary, Roster,
} from "./contracts";

// D6: the real 6-lawyer firm roster (firm.json, corpus stripped). Triage code is
// roster-source-agnostic — matching now discriminates real ids, and emit's
// matchTarget resolves those same ids to live signatures (they flip together).
const roster: Roster = Lawguistics.listLawyers();

const AGNOSTIC: AgentId[] = ["claim-quant", "merits-analyst"];
const SPECIALIST: Record<PracticeArea, AgentId> = {
  Criminal: "criminal",
  RealEstate: "real-estate",
  Commercial: "commercial",
};

const heroId = (): string => roster.find((l) => l.hero)?.id ?? roster[0].id;

/** Resolve to a real roster id. The demo-steering pin (Spec 00 §7) and the
 *  model's choice are BOTH clamped against the roster — neither can hand emit an
 *  id that matchTarget can't resolve (an empty/stale pin falls back to the hero,
 *  never crashes the turn). */
function resolveLawyerId(modelChoice: string): string {
  const choice = config.fixedFallback.enabled ? config.fixedFallback.lawyerId : modelChoice;
  return roster.some((l) => l.id === choice) ? choice : heroId();
}

const specialistFor = (lawyerId: string): AgentId | null => {
  const area = roster.find((l) => l.id === lawyerId)?.practiceArea;
  return area ? SPECIALIST[area] : null;
};

// ── schemas ──────────────────────────────────────────────────────────────────
const matchShape = {
  hypothesis: z.string().describe("one-line hypothesis of the legal matter"),
  confidence: z.number().min(0).max(1),
  lawyerId: z.string().describe("an id from the roster"),
  rationale: z.string().describe("one sentence on why this lawyer fits"),
};
const BootstrapSchema = z.object(matchShape);
const RecalibrateSchema = z.object(matchShape);
const SummarySchema = z.object({
  matterType: z.string().describe("short plain label for the kind of matter — no merits or verdict"),
  keyFacts: z.string().describe("plain prose of what happened, from the person's own account; a slot only where a detail is genuinely missing"),
  parties: z.string().describe("who is involved"),
  theAsk: z.string().describe("what the person is seeking, stated as their position — not advice, merits, or next steps"),
});

export const Triage = {
  /** Best-shot classification (allowed to be wrong; recalibration fixes it). */
  async bootstrap(seed: string): Promise<CaseState> {
    const { system, prompt } = prompts.bootstrap({ seed, roster });
    const r = await generateObject({
      schema: BootstrapSchema,
      system,
      prompt,
      temperature: config.temps.triage,
    });
    const lawyerId = resolveLawyerId(r.lawyerId);
    return {
      sessionId: "", // Lawson sets this from the store record
      seed,
      transcript: [],
      matter: { hypothesis: r.hypothesis, confidence: r.confidence },
      activeSpecialist: specialistFor(lawyerId),
      lawyerMatch: { lawyerId, rationale: r.rationale },
      turnsTaken: 0,
      turnBudget: config.turnBudget,
    };
  },

  /** Front-load agnostic analysts; force the matched specialist on the final turn. */
  async selectAgent(s: CaseState, turnsRemaining: number): Promise<AgentId> {
    // Final turn: hand it to the matched specialist (deterministic — no model call).
    if (turnsRemaining <= 1) {
      return specialistFor(s.lawyerMatch.lawyerId) ?? "merits-analyst";
    }
    // Early turns lean agnostic; the middle opens up to everyone.
    const pool: AgentId[] =
      s.turnsTaken === 0
        ? AGNOSTIC
        : ["claim-quant", "merits-analyst", "criminal", "real-estate", "commercial"];
    if (pool.length === 1) return pool[0];

    const { system, prompt } = prompts.selectAgent({ caseState: s, turnsRemaining });
    const { agentId } = await generateObject({
      schema: z.object({ agentId: z.enum(pool as [AgentId, ...AgentId[]]) }),
      system,
      prompt,
      temperature: config.temps.triage,
    });
    return agentId;
  },

  /** Fold the answer in; may sharpen the matter and move the lawyer match. */
  async recalibrate(s: CaseState, answer: string): Promise<CaseState> {
    const { system, prompt } = prompts.recalibrate({ caseState: s, answer, roster });
    const r = await generateObject({
      schema: RecalibrateSchema,
      system,
      prompt,
      temperature: config.temps.triage,
    });
    const lawyerId = resolveLawyerId(r.lawyerId);
    return {
      ...s,
      matter: { hypothesis: r.hypothesis, confidence: r.confidence },
      activeSpecialist: specialistFor(lawyerId),
      lawyerMatch: { lawyerId, rationale: r.rationale },
    };
  },

  /** The one-pager substance — slot-bearing fields, moderate temp. */
  async composeSummary(s: CaseState): Promise<RawSummary> {
    const { system, prompt } = prompts.composeSummary({ caseState: s });
    const r = await generateObject({
      schema: SummarySchema,
      system,
      prompt,
      temperature: config.temps.compose,
    });
    return { stage: "summary", ...r };
  },
};
