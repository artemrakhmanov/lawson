// harness/emit.ts — THE GATEWAY (contracts §1.11). The ONLY caller of
// Lawguistics.condition (grep-provable); the only path that turns raw substance
// into screen text. It resolves the target (R1), conditions every register-
// bearing field, validates slot survival (invariant 3), persists BOTH registers
// during intake (invariant 2), and returns the conditioned view only.
//
// "Condition as the final step" is provable by inspecting this one file.

import { Lawguistics } from "@/lib/services/lawguistics";
import type { VoiceSignature } from "@/lib/services/lawguistics";
import { store, type StoredField, type StoredTurn } from "@/lib/services/session/store";
import { slotTokens } from "./slots/encode";
import type {
  RawTurn, RawSummary, ConditionedView, ConditionedSummary,
} from "./contracts";

// ── slot-survival check (invariant 3) ────────────────────────────────────────
// The slot-token multiset must be identical before and after conditioning.
export function slotsPreserved(input: string, output: string): boolean {
  const a = [...slotTokens(input)].sort();
  const b = [...slotTokens(output)].sort();
  return a.length === b.length && a.every((t, i) => t === b[i]);
}

// Pick the register to ship for one field. Conditioned wins if it preserves the
// input's slots; else fall back to baseline; else to the raw input (which is
// slot-identical by construction). Stage-0 identity never trips the fallback.
function reconcile(input: string, conditioned: string, baseline: string): StoredField {
  if (slotsPreserved(input, conditioned)) return { conditioned, baseline };
  if (slotsPreserved(input, baseline)) {
    console.warn("[emit] conditioned dropped a slot token — falling back to baseline");
    return { conditioned: baseline, baseline };
  }
  console.warn("[emit] both registers dropped a slot token — falling back to raw input");
  return { conditioned: input, baseline: input };
}

// ── field walkers — known fields only, handled explicitly ────────────────────
function turnFields(t: RawTurn): [string, string][] {
  const f: [string, string][] = [];
  if (t.preamble !== undefined) f.push(["preamble", t.preamble]);
  f.push(["question", t.question]);
  if (t.framing !== undefined) f.push(["framing", t.framing]);
  t.scaffolds.forEach((s, i) => f.push([`scaffold.${i}`, s]));
  if (t.reassurance !== undefined) f.push(["reassurance", t.reassurance]);
  f.push(["freeform.placeholder", t.freeform.placeholder]);
  return f;
}

function summaryFields(s: RawSummary): [string, string][] {
  return [
    ["matterType", s.matterType],
    ["keyFacts", s.keyFacts],
    ["parties", s.parties],
    ["theAsk", s.theAsk],
  ];
}

function assembleTurn(t: RawTurn, sessionId: string, turnId: string, out: Record<string, string>): ConditionedView {
  return {
    kind: "turn",
    sessionId,
    turnId,
    agentId: t.agentId,
    stage: t.stage,
    ...(t.preamble !== undefined ? { preamble: out.preamble } : {}),
    question: out.question,
    ...(t.framing !== undefined ? { framing: out.framing } : {}),
    scaffolds: t.scaffolds.map((_, i) => out[`scaffold.${i}`]),
    ...(t.reassurance !== undefined ? { reassurance: out.reassurance } : {}),
    freeform: { placeholder: out["freeform.placeholder"] },
  };
}

function assembleSummary(sessionId: string, turnId: string, out: Record<string, string>): ConditionedSummary {
  return {
    kind: "summary",
    sessionId,
    turnId,
    matterType: out.matterType,
    keyFacts: out.keyFacts,
    parties: out.parties,
    theAsk: out.theAsk,
  };
}

// R5 — per-turn reveal stats. At stage-0 the target is the neutral stub and
// measure/convergence/lsm aren't real yet, so there is nothing to measure and
// we persist no stats (panels are identical by design). Phase D (D6) wires the
// real computation here, still DURING intake — never at cleave time.
function computeStatsIfReal(_target: VoiceSignature, _out: Record<string, string>): StoredTurn["stats"] {
  return undefined;
}

export async function emit(
  sessionId: string,
  raw: RawTurn | RawSummary,
): Promise<ConditionedView | ConditionedSummary> {
  const rec = store.get(sessionId);
  if (!rec) throw new Error(`emit: unknown session ${sessionId}`);

  // R1 — resolve the lawyerId to a VoiceSignature; origin omitted ⇒ ROSTER_MEDIAN.
  const target = Lawguistics.matchTarget(rec.caseState.lawyerMatch.lawyerId);
  const drift = Lawguistics.drift.forStage(raw.stage);

  const fields = "agentId" in raw ? turnFields(raw) : summaryFields(raw);
  const out: Record<string, string> = {};
  const stored: Record<string, StoredField> = {};

  for (const [name, text] of fields) {
    // emit is the SOLE caller of Lawguistics.condition.
    const { conditioned, baseline } = await Lawguistics.condition(text, target, drift);
    const field = reconcile(text, conditioned, baseline);
    out[name] = field.conditioned;
    stored[name] = field;
  }

  const turnId = crypto.randomUUID();
  store.putTurn(sessionId, {
    turnId,
    stage: raw.stage,
    fields: stored,
    stats: computeStatsIfReal(target, out),
  });

  return "agentId" in raw ? assembleTurn(raw, sessionId, turnId, out) : assembleSummary(sessionId, turnId, out);
}
