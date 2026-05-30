import { describe, it, expect } from "vitest";
import { Lawson, fillSlots } from "./loop";
import { store } from "@/lib/services/session/store";
import type { ConditionedSummary, ConditionedView } from "./contracts";

const live = it.skipIf(!process.env.ANTHROPIC_API_KEY);

describe("fillSlots (offline)", () => {
  it("folds fills into a scaffold, falling back to placeholder / first option", () => {
    const t = "I was stopped for [[reason:select:speeding|a broken light]] at [[time:free:e.g. 11pm]].";
    expect(fillSlots(t, { reason: "speeding", time: "around midnight" })).toBe(
      "I was stopped for speeding at around midnight.",
    );
    // missing fills → free uses placeholder, select uses first option
    expect(fillSlots(t, {})).toBe("I was stopped for speeding at e.g. 11pm.");
  });
});

describe("Lawson — end-to-end intake (live, stage-0 identity)", () => {
  live("start → answer × N → summary: conditioned-only, both registers stored, done flips", async () => {
    const first = await Lawson.start("I got pulled over and arrested for DUI last night, I'm scared.");
    expect(first.kind).toBe("turn");
    if (first.kind !== "turn") throw new Error("expected turn");
    expect(first.sessionId).toBeTruthy();
    expect(first.stage).toBe("opening");
    expect(first.question.length).toBeGreaterThan(0);
    expect(first.scaffolds).toHaveLength(3);

    const sessionId = first.sessionId;
    const answers = [
      "I was speeding, about 20 over, and the officer smelled alcohol.",
      "They had me do a breathalyzer and I blew over the limit. No prior record.",
      "I was held overnight and released on bail this morning. Court date is in three weeks.",
    ];

    let view: ConditionedView | ConditionedSummary = first;
    let turnId = first.turnId;
    let i = 0;
    let summary: ConditionedSummary | null = null;
    while (i < answers.length + 2) {
      view = await Lawson.answer(sessionId, turnId, { kind: "freeform", text: answers[Math.min(i, answers.length - 1)] });
      // every returned unit is conditioned-only and shape-valid
      expect(view.sessionId).toBe(sessionId);
      expect(view.turnId).toBeTruthy();
      if (view.kind === "summary") {
        summary = view;
        break;
      }
      expect(["q1", "q2", "q3"]).toContain(view.stage);
      turnId = view.turnId;
      i++;
    }

    // done flips on the summary
    expect(summary).not.toBeNull();
    expect(summary!.kind).toBe("summary");
    expect(summary!.matterType.length).toBeGreaterThan(0);

    // the store holds BOTH registers for every emitted unit; identical at stage-0
    const rec = store.get(sessionId)!;
    expect(rec.turns.length).toBeGreaterThanOrEqual(3); // opening + question(s) + summary
    for (const turn of rec.turns) {
      for (const f of Object.values(turn.fields)) {
        expect(f.conditioned).toBe(f.baseline); // baseline == conditioned, and that is correct
      }
      expect(turn.stats).toBeUndefined(); // no stats until Phase D
    }
    expect(rec.turns.at(-1)!.stage).toBe("summary");
  }, 90_000);

  live("a re-routing answer moves lawyerMatch mid-loop", async () => {
    const first = await Lawson.start("Someone is suing me and I need help, I'm not sure what to do.");
    if (first.kind !== "turn") throw new Error("expected turn");
    const sessionId = first.sessionId;

    await Lawson.answer(sessionId, first.turnId, {
      kind: "freeform",
      text: "Actually it's about a house — the seller is backing out of our signed purchase agreement two days before closing.",
    });

    const matched = store.get(sessionId)!.caseState.lawyerMatch.lawyerId;
    expect(matched).toBe("stub-realestate");
  }, 60_000);

  live("refreshSummary regenerates the one-pager with fills folded in", async () => {
    const first = await Lawson.start("I got arrested for a DUI and have a court date.");
    if (first.kind !== "turn") throw new Error("expected turn");
    const sessionId = first.sessionId;

    const refreshed = await Lawson.refreshSummary(sessionId, {
      court_date: "June 20, 2026",
      county: "Travis County",
    });
    expect(refreshed.kind).toBe("summary");
    expect(refreshed.sessionId).toBe(sessionId);
    expect(refreshed.matterType.length).toBeGreaterThan(0);
    // the refresh persisted a stored summary turn
    expect(store.get(sessionId)!.turns.at(-1)!.stage).toBe("summary");
  }, 60_000);
});
