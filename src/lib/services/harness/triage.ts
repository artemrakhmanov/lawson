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
import { stubRoster } from "./roster.stub";
import * as prompts from "./prompts";
import type {
  AgentId, CaseState, PracticeArea, RawSummary, Roster,
} from "./contracts";

// Swapped for Lawguistics.listLawyers() at D6; Triage code is roster-source-agnostic.
const roster: Roster = stubRoster;

const AGNOSTIC: AgentId[] = ["claim-quant", "merits-analyst"];
const SPECIALIST: Record<PracticeArea, AgentId> = {
  Criminal: "criminal",
  RealEstate: "real-estate",
  Commercial: "commercial",
};

const heroId = (): string => roster.find((l) => l.hero)?.id ?? roster[0].id;

/** Steering pin (Spec 00 §7) then clamp to a real roster id — the model never
 *  invents an id the rest of the harness can't resolve. */
function resolveLawyerId(modelChoice: string): string {
  if (config.fixedFallback.enabled) return config.fixedFallback.lawyerId;
  return roster.some((l) => l.id === modelChoice) ? modelChoice : heroId();
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
  matterType: z.string(),
  keyFacts: z.string().describe("slot-bearing prose; leave [[key:free:...]] where uncertain"),
  parties: z.string(),
  theAsk: z.string(),
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
