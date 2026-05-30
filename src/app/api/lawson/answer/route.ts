// POST /api/lawson/answer  { sessionId, turnId, payload }
//   → ConditionedView | ConditionedSummary  (contracts §1.14)
// The response's `kind` IS the done signal: kind === "summary" means intake is
// complete. Conditioned-only; baseline never crosses the wire during intake.

import { Lawson } from "@/lib/services/harness/loop";
import type { AnswerPayload } from "@/lib/services/harness/contracts";

export async function POST(request: Request) {
  try {
    const { sessionId, turnId, payload } = (await request.json()) as {
      sessionId?: string;
      turnId?: string;
      payload?: AnswerPayload;
    };
    if (!sessionId || !turnId || !payload) {
      return Response.json({ error: "sessionId, turnId, payload required" }, { status: 400 });
    }
    const view = await Lawson.answer(sessionId, turnId, payload);
    return Response.json(view);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
