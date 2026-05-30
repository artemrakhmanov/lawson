// harness/contracts.ts — the harness-owned frozen type surface (01-contracts.md
// §1). The R4-shared types (Stage, Lawyer, PracticeArea, MetricVector,
// VoiceSignature, VoiceBrief, ConditionResult, FidelityResult, MetricRanges)
// are CANONICAL in lawguistics/types.ts — re-exported here, never redeclared.
// The slot `Run` type + parse/serialize live in harness/slots/encode.ts (B2).

// ── R4-shared types (canonical in the voice lane) ────────────────────────────
export type {
  Stage, Lawyer, PracticeArea, MetricVector, VoiceSignature, VoiceBrief,
  ConditionResult, FidelityResult, MetricRanges,
} from "@/lib/services/lawguistics/types";

import type { Lawyer, Stage } from "@/lib/services/lawguistics/types";

// harness-local convenience alias (§1.3)
export type Roster = Lawyer[];

// ── Agents (§1.4) — stateless: receive state, return substance, persist nothing ─
export type AgentId =
  | "claim-quant" | "merits-analyst"            // practice-agnostic analysts
  | "criminal" | "real-estate" | "commercial";  // practice specialists

export interface Agent {
  id: AgentId;
  composeTurn(input: { caseState: CaseState; transcript: Turn[] }): Promise<RawTurn>;
}

// ── RawTurn (§1.5) — substance, pre-conditioning ────────────────────────────
// Surface fields carry voice (register-rich); functional fields carry facts.
export type RawTurn = {
  agentId: AgentId;
  stage: Stage;
  preamble?: string;            // surface — warm lead-in (register-rich)
  question: string;             // functional — the single ask
  framing?: string;             // surface — optional context/motivation
  scaffolds: string[];          // exactly 3, each plain prose with [[slot]] tokens
  reassurance?: string;         // surface — optional closing line
  freeform: { placeholder: string };  // always present — "say it your own way"
};

// ── RawSummary (§1.6) — the one-pager substance, each field register+slot-bearing ─
export type RawSummary = {
  stage: "summary";
  matterType: string;
  keyFacts: string;   // slot-bearing prose
  parties: string;    // slot-bearing prose
  theAsk: string;     // slot-bearing prose
};

// ── CaseState (§1.7) — the only global state; Triage owns it ─────────────────
export type Turn = { turnId: string; agentId: AgentId; stage: Stage; question: string; answer?: string };

export type CaseState = {
  sessionId: string;
  seed: string;
  transcript: Turn[];
  matter: { hypothesis: string; confidence: number };      // 0..1
  activeSpecialist: AgentId | null;
  lawyerMatch: { lawyerId: string; rationale: string };     // live — may move on recalibrate
  turnsTaken: number;
  turnBudget: number;
};

// ── ConditionedView / ConditionedSummary (§1.8) — what the UI receives ───────
// After emit, every surface/functional field is its conditioned register; the
// baseline pair is persisted server-side and never sent during intake.
export type ConditionedView = {
  kind: "turn";
  turnId: string;
  agentId: AgentId;
  stage: Stage;
  preamble?: string;
  question: string;
  framing?: string;
  scaffolds: string[];          // conditioned, slot tokens intact
  reassurance?: string;
  freeform: { placeholder: string };
};

export type ConditionedSummary = {
  kind: "summary";
  turnId: string;
  matterType: string;
  keyFacts: string;
  parties: string;
  theAsk: string;
};

// ── Orchestrator payload (§1.10) ─────────────────────────────────────────────
export type AnswerPayload =
  | { kind: "scaffold"; index: number; fills: Record<string, string> }
  | { kind: "freeform"; text: string };
