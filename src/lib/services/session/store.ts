// session/store.ts — the canonical server-side session state (contracts §1.12,
// Spec 00 §2). An in-memory module-singleton Map; localhost only, no DB/auth.
// Holds BOTH registers per field per turn — produced during intake, never at
// cleave time. Stashed on globalThis so the singleton survives Next dev HMR.

import type { CaseState, Stage } from "@/lib/services/harness/contracts";
import { config } from "@/lib/services/config";

export type StoredField = { conditioned: string; baseline: string };

// R5: `stats` is populated by emit only once Lawguistics is real (Phase D);
// absent at stage-0, where the two panels are identical by design.
export type StoredTurn = {
  turnId: string;
  stage: Stage;
  fields: Record<string, StoredField>;
  stats?: { convergence: number; lsm: number };
};

export type SessionRecord = { caseState: CaseState; turns: StoredTurn[] };

const g = globalThis as typeof globalThis & {
  __lawsonSessions?: Map<string, SessionRecord>;
};
const sessions = g.__lawsonSessions ?? (g.__lawsonSessions = new Map<string, SessionRecord>());

/** Mint a session with a skeleton CaseState (Triage.bootstrap fills it in P6). */
function create(seed: string): SessionRecord {
  const sessionId = crypto.randomUUID();
  const caseState: CaseState = {
    sessionId,
    seed,
    transcript: [],
    matter: { hypothesis: "", confidence: 0 },
    activeSpecialist: null,
    lawyerMatch: { lawyerId: "", rationale: "" },
    turnsTaken: 0,
    turnBudget: config.turnBudget,
  };
  const rec: SessionRecord = { caseState, turns: [] };
  sessions.set(sessionId, rec);
  return rec;
}

function get(sessionId: string): SessionRecord | undefined {
  return sessions.get(sessionId);
}

function putCaseState(sessionId: string, s: CaseState): void {
  const rec = sessions.get(sessionId);
  if (!rec) throw new Error(`store.putCaseState: unknown session ${sessionId}`);
  rec.caseState = s;
}

function putTurn(sessionId: string, t: StoredTurn): void {
  const rec = sessions.get(sessionId);
  if (!rec) throw new Error(`store.putTurn: unknown session ${sessionId}`);
  rec.turns.push(t);
}

/** Test/rehearsal helper — clears all sessions. */
function clear(): void {
  sessions.clear();
}

export const store = { create, get, putCaseState, putTurn, clear };
