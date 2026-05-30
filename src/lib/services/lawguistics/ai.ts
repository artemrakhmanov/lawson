// lawguistics/ai.ts — the module-local AI boundary (R7). Signatures only at
// Stage 0; the real impl over the `ai` SDK lands in Stage 1b. Server-only.
// Kept module-local so the voice lane never edits shared harness files; the
// documented one-file swap to delegate to @/lib/services/ai is a post-demo
// nicety, not on the critical path.

// thin wrapper over the `ai` SDK; real impl in Stage 1b.
export async function generateJSON<T>(_opts: { system?: string; prompt: string; schema: unknown; temperature?: number }): Promise<T> {
  throw new Error("ai.generateJSON not implemented yet");
}

// model id from one constant (read env); keep here so it's swappable in one place.
export const MODEL = process.env.LAWGUISTICS_MODEL ?? "claude-opus-4-8";
