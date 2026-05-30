import { describe, it, expect, beforeEach, vi } from "vitest";

// D6: emit now drives the REAL Lawguistics (matchTarget resolves real ids,
// condition bends the voice, emit computes per-turn stats). Mock the module so
// this stays a fast, deterministic, network-free unit test of the GATEWAY's
// contract: distinct registers stored, slots preserved, stats persisted.
vi.mock("@/lib/services/lawguistics", () => {
  const metrics = Object.fromEntries(
    ["meanSentenceLen","sentenceLenVariance","ttr","hedgeRatio","directness","youDensity",
     "fnPronoun","fnArticle","fnPrep","fnConj","fnAux","commaRate","questionRate","dashRate"]
      .map((k) => [k, 0.1]),
  );
  const sig = { lawyerId: "criminal-risk-01", metrics, brief: { label: "x", cadence: "", moves: [], lexicalFingerprint: [], hedgingPosture: "", exemplarLine: "" } };
  return {
    Lawguistics: {
      matchTarget: () => sig,
      drift: { forStage: () => 0.5 },
      // conditioned: distinct from baseline but slot-tokens preserved (prefix only)
      condition: async (text: string) => ({ conditioned: `» ${text}`, baseline: text }),
      measure: () => metrics,
      convergence: () => 0.42,
      lsm: () => 0.91,
    },
  };
});

import { emit, slotsPreserved } from "./emit";
import { store } from "@/lib/services/session/store";
import { slotTokens } from "./slots/encode";
import type { RawTurn, RawSummary } from "./contracts";

function seedSession(): string {
  const rec = store.create("I got pulled over last night and I'm scared.");
  const id = rec.caseState.sessionId;
  store.putCaseState(id, {
    ...rec.caseState,
    matter: { hypothesis: "Criminal — traffic stop", confidence: 0.6 },
    lawyerMatch: { lawyerId: "criminal-risk-01", rationale: "fear + police contact" },
  });
  return id;
}

const rawTurn = (): RawTurn => ({
  agentId: "criminal",
  stage: "q1",
  preamble: "Thanks for telling me. Let's take this one step at a time.",
  question: "What were you stopped for?",
  framing: "Even a rough sense helps.",
  scaffolds: [
    "I was stopped for [[reason:select:speeding|a broken light|no reason given]].",
    "It happened at about [[time:free:e.g. 11pm]].",
    "The officer [[searched:select:did|did not]] search the car.",
  ],
  reassurance: "Whatever it was, we can work with it.",
  freeform: { placeholder: "Tell me what happened, your own way." },
});

const rawSummary = (): RawSummary => ({
  stage: "summary",
  matterType: "Criminal defense — traffic stop",
  keyFacts: "Stopped on [[date:free:when]] for [[reason:free:why]].",
  parties: "You and the [[agency:free:which department]].",
  theAsk: "Understand exposure and next steps.",
});

describe("emit — real-voice gateway (D6)", () => {
  beforeEach(() => store.clear());

  it("conditions a RawTurn: registers diverge, both stored, slots intact, stats persisted", async () => {
    const id = seedSession();
    const raw = rawTurn();
    const view = await emit(id, raw);

    expect(view.kind).toBe("turn");
    if (view.kind !== "turn") throw new Error("expected turn");
    expect(view.sessionId).toBe(id);
    expect(view.agentId).toBe("criminal");
    expect(view.stage).toBe("q1");
    expect(view.turnId).toBeTruthy();

    // the view ships the CONDITIONED register (the gateway's job)
    expect(view.preamble).toBe(`» ${raw.preamble}`);
    expect(view.question).toBe(`» ${raw.question}`);
    expect(view.scaffolds).toEqual(raw.scaffolds.map((s) => `» ${s}`));

    // slots survived in the conditioned scaffolds
    expect(slotTokens(view.scaffolds[0])).toEqual(["[[reason:select:speeding|a broken light|no reason given]]"]);

    // store holds BOTH registers, now DISTINCT, + real per-turn stats
    const rec = store.get(id)!;
    expect(rec.turns).toHaveLength(1);
    const turn = rec.turns[0];
    expect(turn.turnId).toBe(view.turnId);
    for (const f of Object.values(turn.fields)) {
      expect(f.conditioned).not.toBe(f.baseline); // voice diverges from baseline
      expect(f.conditioned).toBe(`» ${f.baseline}`);
    }
    expect(Object.keys(turn.fields)).toHaveLength(8);
    expect(turn.stats).toEqual({ convergence: 0.42, lsm: 0.91 });
  });

  it("conditions a RawSummary into a ConditionedSummary with stats stored", async () => {
    const id = seedSession();
    const raw = rawSummary();
    const view = await emit(id, raw);

    expect(view.kind).toBe("summary");
    if (view.kind !== "summary") throw new Error("expected summary");
    expect(view.matterType).toBe(`» ${raw.matterType}`);
    expect(view.keyFacts).toBe(`» ${raw.keyFacts}`);
    expect(slotTokens(view.keyFacts)).toEqual(["[[date:free:when]]", "[[reason:free:why]]"]);

    const turn = store.get(id)!.turns[0];
    expect(Object.keys(turn.fields).sort()).toEqual(["keyFacts", "matterType", "parties", "theAsk"]);
    expect(turn.stats).toEqual({ convergence: 0.42, lsm: 0.91 });
  });

  it("throws on an unknown session", async () => {
    await expect(emit("nope", rawTurn())).rejects.toThrow(/unknown session/);
  });
});

describe("emit — slot-survival predicate (the fallback trigger)", () => {
  it("true when tokens are identical, false when dropped or mutated", () => {
    const input = "Pick [[a:select:x|y]] and [[b:free:note]].";
    expect(slotsPreserved(input, "Choose [[a:select:x|y]], then [[b:free:note]] please.")).toBe(true);
    expect(slotsPreserved(input, "Choose [[a:select:x|y]] only.")).toBe(false); // dropped
    expect(slotsPreserved(input, "Pick [[a:select:x|z]] and [[b:free:note]].")).toBe(false); // mutated
  });
});
