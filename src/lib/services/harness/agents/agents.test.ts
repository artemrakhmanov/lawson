import { describe, it, expect } from "vitest";
import { agents, getAgent } from "./index";
import { parse, serialize, slotTokens } from "../slots/encode";
import type { AgentId, CaseState } from "../contracts";

const ALL: AgentId[] = ["claim-quant", "merits-analyst", "criminal", "real-estate", "commercial"];
const live = it.skipIf(!process.env.ANTHROPIC_API_KEY);

const caseState = (): CaseState => ({
  sessionId: "s1",
  seed: "I was pulled over and arrested for DUI last night.",
  transcript: [],
  matter: { hypothesis: "Criminal — DUI traffic stop", confidence: 0.7 },
  activeSpecialist: "criminal",
  lawyerMatch: { lawyerId: "criminal-risk-01", rationale: "police contact + arrest" },
  turnsTaken: 0,
  turnBudget: 3,
});

describe("bench registry (offline)", () => {
  it("resolves every AgentId to an agent whose id matches", () => {
    for (const id of ALL) {
      expect(agents[id]).toBeTruthy();
      expect(getAgent(id).id).toBe(id);
    }
    expect(Object.keys(agents).sort()).toEqual([...ALL].sort());
  });
});

describe("bench agents compose well-formed RawTurns (live)", () => {
  for (const id of ALL) {
    live(`${id} → schema-valid RawTurn with 3 round-tripping slot scaffolds`, async () => {
      const turn = await getAgent(id).composeTurn({ caseState: caseState(), transcript: [] });

      expect(turn.agentId).toBe(id);
      expect(["q1", "q2", "q3"]).toContain(turn.stage);
      expect(typeof turn.question).toBe("string");
      expect(turn.question.length).toBeGreaterThan(0);
      expect(turn.freeform.placeholder.length).toBeGreaterThan(0);

      // exactly 3 scaffolds, each parses + round-trips
      expect(turn.scaffolds).toHaveLength(3);
      for (const sc of turn.scaffolds) {
        expect(serialize(parse(sc))).toBe(sc);
      }
      // scaffolds collectively carry at least one well-formed slot token
      const tokens = turn.scaffolds.flatMap(slotTokens);
      expect(tokens.length).toBeGreaterThan(0);
    }, 30_000);
  }
});
