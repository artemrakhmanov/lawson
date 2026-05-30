// GET /api/session/[id] → { turns: StoredTurn[], signature: VoiceBrief | null }
// (R6 / U5). The cleave's read-and-flip source: a PURE read of the session store
// plus the matched lawyer's brief. NO model call, no conditioning — both
// registers + per-turn stats were produced during intake and only get unhidden
// here (invariant 2). Baseline reaches the client for the first time at this
// endpoint, by design.

import { store } from "@/lib/services/session/store";
import { Lawguistics } from "@/lib/services/lawguistics";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rec = store.get(id);
  if (!rec) {
    return Response.json({ error: `unknown session ${id}` }, { status: 404 });
  }

  // The matched lawyer's frozen brief (names the voice the right panel bent
  // toward). Tolerate a missing/neutral match — the cleave degrades gracefully.
  let signature = null;
  const lawyerId = rec.caseState.lawyerMatch?.lawyerId;
  if (lawyerId) {
    try {
      signature = Lawguistics.getSignature(lawyerId).brief;
    } catch {
      signature = null;
    }
  }

  return Response.json({ turns: rec.turns, signature });
}
