// harness/agents/index.ts — the bench registry: Record<AgentId, Agent>. The
// loop (P6) resolves the agent Triage selected through getAgent().

import type { Agent, AgentId } from "../contracts";
import { claimQuant } from "./claim-quant";
import { meritsAnalyst } from "./merits-analyst";
import { criminal } from "./criminal";
import { realEstate } from "./real-estate";
import { commercial } from "./commercial";

export const agents: Record<AgentId, Agent> = {
  "claim-quant": claimQuant,
  "merits-analyst": meritsAnalyst,
  criminal,
  "real-estate": realEstate,
  commercial,
};

export function getAgent(id: AgentId): Agent {
  return agents[id];
}
