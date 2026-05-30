import { describe, it, expect, beforeEach } from "vitest";
import { emit, slotsPreserved } from "./emit";
import { store } from "@/lib/services/session/store";
import { slotTokens } from "./slots/encode";
import type { RawTurn, RawSummary } from "./contracts";

// Mint a session and pin a matched lawyer, the way Lawson/Triage will later.
function seedSession(): string {
  const rec = store.create("I got pulled over last night and I'm scared.");
  const id = rec.caseState.sessionId;
  store.putCaseState(id, {
    ...rec.caseState,
    matter: { hypothesis: "Criminal — traffic stop", confidence: 0.6 },
    lawyerMatch: { lawyerId: "stub-criminal", rationale: "fear + police contact" },
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

describe("emit — stage-0 identity gateway (C1)", () => {
  beforeEach(() => store.clear());

  it("conditions a RawTurn: conditioned == baseline, both stored, slots intact, shape correct", async () => {
    const id = seedSession();
    const raw = rawTurn();
    const view = await emit(id, raw);

    // shape (contracts §1.8)
    expect(view.kind).toBe("turn");
    if (view.kind !== "turn") throw new Error("expected turn");
    expect(view.agentId).toBe("criminal");
    expect(view.stage).toBe("q1");
    expect(view.turnId).toBeTruthy();

    // stage-0 identity: every conditioned field equals the raw substance
    expect(view.preamble).toBe(raw.preamble);
    expect(view.question).toBe(raw.question);
    expect(view.framing).toBe(raw.framing);
    expect(view.scaffolds).toEqual(raw.scaffolds);
    expect(view.reassurance).toBe(raw.reassurance);
    expect(view.freeform.placeholder).toBe(raw.freeform.placeholder);

    // slots survived in the scaffolds
    expect(slotTokens(view.scaffolds[0])).toEqual(["[[reason:select:speeding|a broken light|no reason given]]"]);

    // store holds BOTH registers per field, equal at stage-0, and no stats
    const rec = store.get(id)!;
    expect(rec.turns).toHaveLength(1);
    const turn = rec.turns[0];
    expect(turn.turnId).toBe(view.turnId);
    expect(turn.stats).toBeUndefined();
    for (const f of Object.values(turn.fields)) {
      expect(f.conditioned).toBe(f.baseline); // baseline == conditioned, and that is correct
    }
    // one stored field per conditioned field (preamble,question,framing,3 scaffolds,reassurance,freeform.placeholder)
    expect(Object.keys(turn.fields)).toHaveLength(8);
  });

  it("conditions a RawSummary into a ConditionedSummary with both registers stored", async () => {
    const id = seedSession();
    const raw = rawSummary();
    const view = await emit(id, raw);

    expect(view.kind).toBe("summary");
    if (view.kind !== "summary") throw new Error("expected summary");
    expect(view.matterType).toBe(raw.matterType);
    expect(view.keyFacts).toBe(raw.keyFacts);
    expect(view.parties).toBe(raw.parties);
    expect(view.theAsk).toBe(raw.theAsk);
    expect(slotTokens(view.keyFacts)).toEqual(["[[date:free:when]]", "[[reason:free:why]]"]);

    const turn = store.get(id)!.turns[0];
    expect(Object.keys(turn.fields).sort()).toEqual(["keyFacts", "matterType", "parties", "theAsk"]);
    expect(turn.stats).toBeUndefined();
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
