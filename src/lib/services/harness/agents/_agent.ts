// harness/agents/_agent.ts — the shared bench-agent factory. Every agent is a
// stateless worker: (caseState, transcript) → RawTurn via one moderate-temp
// generateObject call. The area-true persona lives in each agent file as
// `guidance`; this factory holds the frozen RawTurn schema and the q-ladder
// stage derivation. No persistence, no UI imports (invariant: stateless).

import { z } from "zod";
import { generateObject } from "@/lib/services/ai/client";
import { config } from "@/lib/services/config";
import * as prompts from "../prompts";
import type { Agent, AgentId, Stage } from "../contracts";

// The model returns the inner substance; agentId + stage are set by the agent.
const TurnSchema = z.object({
  preamble: z.string().optional(),
  question: z.string(),
  framing: z.string().optional(),
  scaffolds: z.array(z.string()).length(3),
  reassurance: z.string().optional(),
  freeform: z.object({ placeholder: z.string() }),
});

// Agents emit question turns (q1..q3); 'opening' and 'summary' are owned
// elsewhere. Stage follows the matter's position in the q-ladder.
function stageForTurn(turnsTaken: number): Stage {
  const n = Math.min(Math.max(turnsTaken + 1, 1), 3);
  return `q${n}` as Stage;
}

export function makeAgent(id: AgentId, guidance: string): Agent {
  return {
    id,
    async composeTurn({ caseState, transcript }) {
      const { system, prompt } = prompts.composeTurn({ caseState, transcript }, guidance);
      const r = await generateObject({
        schema: TurnSchema,
        system,
        prompt,
        temperature: config.temps.compose,
      });
      return { agentId: id, stage: stageForTurn(caseState.turnsTaken), ...r };
    },
  };
}
