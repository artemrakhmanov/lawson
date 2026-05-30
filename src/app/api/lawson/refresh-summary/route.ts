// POST /api/lawson/refresh-summary  { sessionId, fills } → ConditionedSummary
// The explicit one-pager refresh (contracts §1.14): fold the accumulated slot
// fills in and regenerate. Conditioned-only.

import { Lawson } from "@/lib/services/harness/loop";

export async function POST(request: Request) {
  try {
    const { sessionId, fills } = (await request.json()) as {
      sessionId?: string;
      fills?: Record<string, string>;
    };
    if (!sessionId) {
      return Response.json({ error: "sessionId required" }, { status: 400 });
    }
    const view = await Lawson.refreshSummary(sessionId, fills ?? {});
    return Response.json(view);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
