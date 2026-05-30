// services/session/store.ts
// Canonical server-side session state (Spec 00 §2, Spec 02 §3): an in-memory
// module-singleton Map. localhost only — no DB, no auth. The `localStorage`
// client mirror lives elsewhere (rehearsal refresh-safety). Both registers +
// the summary are persisted here DURING intake; the cleave only reads.
//
// Stashed on globalThis so the singleton survives Next dev hot-reload.

import type { Session } from "@/lib/types";

const g = globalThis as typeof globalThis & {
  __lawsonSessions?: Map<string, Session>;
};

const store = g.__lawsonSessions ?? (g.__lawsonSessions = new Map<string, Session>());

export function getSession(id: string): Session | undefined {
  return store.get(id);
}

export function setSession(session: Session): Session {
  store.set(session.id, session);
  return session;
}

export function deleteSession(id: string): boolean {
  return store.delete(id);
}

/** Test/rehearsal helper — clears all sessions. */
export function clearSessions(): void {
  store.clear();
}
