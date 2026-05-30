// POST /api/lawson/start  { seed } → ConditionedView  (contracts §1.14)
// Thin: parse body, call Lawson, return conditioned-only JSON. All model work
// runs here, server-side; the browser never holds a key (invariant 5). Baseline
// stays in the store until the cleave reads it (invariant 2).

import { Lawson } from "@/lib/services/harness/loop";

export async function POST(request: Request) {
  try {
    const { seed } = (await request.json()) as { seed?: unknown };
    if (typeof seed !== "string" || !seed.trim()) {
      return Response.json({ error: "seed (non-empty string) required" }, { status: 400 });
    }
    const view = await Lawson.start(seed);
    return Response.json(view);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
