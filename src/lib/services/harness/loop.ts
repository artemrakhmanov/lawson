// harness/loop.ts — Lawson, the orchestrator (contracts §1.10). Holds caseState
// (via the store), runs the turn loop, assigns each unit's stage, and is the
// ONLY module that imports/calls emit (invariant 1, grep-provable). After this
// phase the harness runs end-to-end in-process — no HTTP yet (P7).
//
// Everything renderable is produced HERE, during intake, and persisted through
// emit. Nothing is generated at cleave time.

import { store } from "@/lib/services/session/store";
import type { StoredTurn } from "@/lib/services/session/store";
import { emit } from "./emit";
import { Triage } from "./triage";
import { getAgent } from "./agents";
import { parse, serialize } from "./slots/encode";
import type {
  AnswerPayload, CaseState, ConditionedSummary, ConditionedView, Stage,
} from "./contracts";

// opening (turn 0) → q1..qN (turns 1..N-1) → summary. Lawson owns this, not the
// agent — only the loop knows a turn's position in the ladder.
function stageFor(turnsTaken: number): Stage {
  return turnsTaken === 0 ? "opening" : (`q${turnsTaken}` as Stage);
}

// Fold a user value into a scaffold: replace each slot with its fill (free →
// placeholder fallback, select → first option), yielding a plain answer string.
export function fillSlots(text: string, fills: Record<string, string>): string {
  return serialize(
    parse(text).map((r) => {
      if (r.kind === "text") return r;
      const value = fills[r.key] ?? (r.type === "free" ? r.placeholder : r.options[0]);
      return { kind: "text", text: value } as const;
    }),
  );
}

// AnswerPayload → a single answer string (contracts §1.10). For a scaffold we
// reconstruct from the stored (baseline) scaffold text and fold the fills in.
function foldPayload(payload: AnswerPayload, stored?: StoredTurn): string {
  if (payload.kind === "freeform") return payload.text;
  const scaffold = stored?.fields[`scaffold.${payload.index}`]?.baseline ?? "";
  return fillSlots(scaffold, payload.fills);
}

// Select → compose → (stage-stamp) → emit → record the turn. Shared by start
// and answer's "ask another" branch.
async function ask(sessionId: string): Promise<ConditionedView> {
  const cs = store.get(sessionId)!.caseState;
  const turnsRemaining = cs.turnBudget - cs.turnsTaken;
  const agentId = await Triage.selectAgent(cs, turnsRemaining);
  const raw = await getAgent(agentId).composeTurn({ caseState: cs, transcript: cs.transcript });
  const stage = stageFor(cs.turnsTaken);

  const view = (await emit(sessionId, { ...raw, stage })) as ConditionedView;

  store.putCaseState(sessionId, {
    ...cs,
    transcript: [...cs.transcript, { turnId: view.turnId, agentId, stage, question: raw.question }],
    turnsTaken: cs.turnsTaken + 1,
  });
  return view;
}

export const Lawson = {
  /** Seed → matched matter → the opening turn (conditioned). */
  async start(seed: string): Promise<ConditionedView> {
    const rec = store.create(seed);
    const sessionId = rec.caseState.sessionId;
    const cs = await Triage.bootstrap(seed);
    store.putCaseState(sessionId, { ...cs, sessionId });
    return ask(sessionId);
  },

  /** Fold the answer, recalibrate, then either ask the next turn or summarize. */
  async answer(
    sessionId: string,
    turnId: string,
    payload: AnswerPayload,
  ): Promise<ConditionedView | ConditionedSummary> {
    const rec = store.get(sessionId);
    if (!rec) throw new Error(`Lawson.answer: unknown session ${sessionId}`);

    const stored = rec.turns.find((t) => t.turnId === turnId);
    const answerText = foldPayload(payload, stored);

    const transcript = rec.caseState.transcript.map((t) =>
      t.turnId === turnId ? { ...t, answer: answerText } : t,
    );
    const recalibrated = await Triage.recalibrate({ ...rec.caseState, transcript }, answerText);
    store.putCaseState(sessionId, recalibrated);

    if (recalibrated.turnsTaken < recalibrated.turnBudget) {
      return ask(sessionId);
    }
    const rawSummary = await Triage.composeSummary(recalibrated);
    return emit(sessionId, rawSummary);
  },

  /** Explicit one-pager refresh — fold the user's slot fills in and regenerate. */
  async refreshSummary(
    sessionId: string,
    fills: Record<string, string>,
  ): Promise<ConditionedSummary> {
    const rec = store.get(sessionId);
    if (!rec) throw new Error(`Lawson.refreshSummary: unknown session ${sessionId}`);

    const folded = Object.entries(fills)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    const cs: CaseState = folded
      ? {
          ...rec.caseState,
          transcript: [
            ...rec.caseState.transcript,
            {
              turnId: "fills",
              agentId: rec.caseState.activeSpecialist ?? "merits-analyst",
              stage: "summary",
              question: "Confirmed details",
              answer: folded,
            },
          ],
        }
      : rec.caseState;

    const rawSummary = await Triage.composeSummary(cs);
    return (await emit(sessionId, rawSummary)) as ConditionedSummary;
  },
};
