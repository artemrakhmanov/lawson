import { describe, it, expect } from "vitest";
import { Triage } from "./triage";
import type { CaseState } from "./contracts";

// Live tests hit the model — opt-in only (run with the key in env), so the
// default offline `npm test` suite stays fast/free/deterministic.
const live = it.skipIf(!process.env.ANTHROPIC_API_KEY);

const baseState = (over: Partial<CaseState> = {}): CaseState => ({
  sessionId: "s1",
  seed: "seed",
  transcript: [],
  matter: { hypothesis: "Criminal — traffic stop", confidence: 0.6 },
  activeSpecialist: "criminal",
  lawyerMatch: { lawyerId: "stub-criminal", rationale: "police contact" },
  turnsTaken: 0,
  turnBudget: 3,
  ...over,
});

describe("Triage — routing (offline, pure)", () => {
  it("hands the final turn to the matched specialist with no model call", async () => {
    const s = baseState({ lawyerMatch: { lawyerId: "stub-realestate", rationale: "" }, turnsTaken: 2 });
    await expect(Triage.selectAgent(s, 1)).resolves.toBe("real-estate");
  });

  it("maps each matched practice area to its specialist on the final turn", async () => {
    await expect(Triage.selectAgent(baseState({ lawyerMatch: { lawyerId: "stub-criminal", rationale: "" } }), 1)).resolves.toBe("criminal");
    await expect(Triage.selectAgent(baseState({ lawyerMatch: { lawyerId: "stub-commercial", rationale: "" } }), 1)).resolves.toBe("commercial");
  });
});

describe("Triage — matching (live)", () => {
  live("bootstrap matches clearly-different seeds to different lawyers", async () => {
    const dui = await Triage.bootstrap("I got arrested for a DUI last night and I have a court date.");
    const deal = await Triage.bootstrap("My business partner breached our shareholder agreement and is trying to force me out.");

    // well-formed CaseState
    expect(dui.lawyerMatch.lawyerId).toBeTruthy();
    expect(dui.lawyerMatch.rationale).toBeTruthy();
    expect(dui.matter.confidence).toBeGreaterThanOrEqual(0);
    expect(dui.matter.confidence).toBeLessThanOrEqual(1);
    expect(dui.turnBudget).toBe(3);

    // matching genuinely discriminates (not constant)
    expect(dui.lawyerMatch.lawyerId).toBe("stub-criminal");
    expect(deal.lawyerMatch.lawyerId).toBe("stub-commercial");
    expect(dui.lawyerMatch.lawyerId).not.toBe(deal.lawyerMatch.lawyerId);
  }, 30_000);

  live("recalibrate moves the matter and lawyer on a re-routing answer", async () => {
    const start = baseState();
    const next = await Triage.recalibrate(
      start,
      "Honestly this isn't criminal at all — it's about my landlord refusing to return my security deposit on the apartment lease.",
    );
    expect(next.lawyerMatch.lawyerId).not.toBe("stub-criminal");
    expect(next.lawyerMatch.lawyerId).toBe("stub-realestate");
    expect(next.matter.hypothesis).not.toBe(start.matter.hypothesis);
    expect(next.activeSpecialist).toBe("real-estate");
  }, 30_000);

  live("selectAgent front-loads an agnostic analyst on the opening turn", async () => {
    const agent = await Triage.selectAgent(baseState({ turnsTaken: 0 }), 3);
    expect(["claim-quant", "merits-analyst"]).toContain(agent);
  }, 30_000);

  live("composeSummary returns a well-formed slot-bearing RawSummary", async () => {
    const s = baseState({
      transcript: [
        { turnId: "t1", agentId: "criminal", stage: "q1", question: "What were you stopped for?", answer: "Speeding, 20 over." },
      ],
    });
    const sum = await Triage.composeSummary(s);
    expect(sum.stage).toBe("summary");
    expect(sum.matterType).toBeTruthy();
    expect(typeof sum.keyFacts).toBe("string");
    expect(typeof sum.parties).toBe("string");
    expect(typeof sum.theAsk).toBe("string");
  }, 30_000);
});
