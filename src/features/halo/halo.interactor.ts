"use client";

// halo.interactor.ts — Halo's client-facing surface (the canonical successor to
// the throwaway tester interactor). The ONLY caller of the Lawson routes; holds
// the navigable view history + the local fills map. fillSlot mutates local state
// instantly (no network); refreshSummary posts accumulated fills — the single
// "model beat" on the one-pager.
//
// Advancing is two-phase and user-driven: start/answer fetch the next view and
// STAGE it (without committing) — its preamble shimmers in under the current
// step; the user clicks Next (proceed) to slide into it. The harness is
// forward-only (answer advances caseState and can't rewind a turnId), so
// Back/Forward navigate the CACHED view history client-side — past steps are
// revisited read-only; only the tip turn drives the harness. Reset wipes the
// session. A localStorage mirror of {stack, cursor} keeps a mid-rehearsal
// refresh from losing the demo (Spec 04 §6).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AnswerPayload,
  ConditionedSummary,
  ConditionedView,
} from "@/lib/services/harness/contracts";
import type { StoredTurn } from "@/lib/services/session/store";
import type { VoiceBrief } from "@/lib/services/lawguistics/types";

type View = ConditionedView | ConditionedSummary;
interface Nav {
  stack: View[];
  cursor: number; // -1 = opening prompt (no view yet)
}

// The cleave's read-and-flip payload: both registers per turn + per-turn stats
// + the matched lawyer's brief. Read from the store, never generated.
export type CleaveLawyer = { name: string; title: string; practiceArea: string };

export interface CleaveData {
  turns: StoredTurn[];
  signature: VoiceBrief | null;
  lawyer: CleaveLawyer | null;
  focusTurnId: string;
}

const MIRROR_KEY = "lawson.halo.v1";
const EMPTY: Nav = { stack: [], cursor: -1 };

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? res.statusText);
  return json as T;
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? res.statusText);
  return json as T;
}

export interface HaloState {
  current: View | null;
  fills: Record<string, string>;
  /** A request is in flight (the preamble is still shimmering / summary refreshing). */
  pending: boolean;
  error: string | null;
  /** When set, the cleave is open (read-and-flip payload from the store). */
  cleaved: CleaveData | null;
  /** The next view, fetched but not yet committed — its preamble bridges below. */
  staged: View | null;
  /** True from the moment an advance begins until the user proceeds (drives the bridge). */
  advancing: boolean;
  /** advancing OR refreshing — input + navigation are locked. */
  busy: boolean;
  /** Are we on the latest (live) view? Only then does the harness accept input. */
  atTip: boolean;
  canBack: boolean;
  canForward: boolean;
  /** Last navigation direction — drives the slide (1 = forward/down, -1 = back/up). */
  direction: 1 | -1;
}

export function useHaloInteractor() {
  const [nav, setNav] = useState<Nav>(EMPTY);
  const [fills, setFills] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staged, setStaged] = useState<View | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [cleaved, setCleaved] = useState<CleaveData | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const hydrated = useRef(false);

  // Rehearsal refresh-safety: restore the whole navigable history.
  useEffect(() => {
    hydrated.current = true;
    try {
      const raw = window.localStorage.getItem(MIRROR_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Nav;
        if (saved?.stack?.length) setNav(saved);
      }
    } catch {
      /* ignore a corrupt mirror */
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      if (nav.stack.length) window.localStorage.setItem(MIRROR_KEY, JSON.stringify(nav));
      else window.localStorage.removeItem(MIRROR_KEY);
    } catch {
      /* localStorage may be unavailable; the mirror is best-effort */
    }
  }, [nav]);

  const current = nav.cursor >= 0 ? nav.stack[nav.cursor] : null;
  const atTip = nav.cursor === nav.stack.length - 1;

  // Fetch the next view and stage it under the current step (no commit yet).
  const advance = useCallback(async (run: () => Promise<View>) => {
    setError(null);
    setAdvancing(true);
    setStaged(null);
    setPending(true);
    try {
      const view = await run();
      setStaged(view); // bridge now shows its preamble + a Next button
    } catch (e) {
      setError((e as Error).message);
      setAdvancing(false);
    } finally {
      setPending(false);
    }
  }, []);

  const start = useCallback(
    (seed: string) => {
      setFills({});
      return advance(() => post<ConditionedView>("/api/lawson/start", { seed }));
    },
    [advance],
  );

  const answer = useCallback(
    (payload: AnswerPayload) => {
      if (!current) return;
      return advance(() =>
        post<View>("/api/lawson/answer", {
          sessionId: current.sessionId,
          turnId: current.turnId,
          payload,
        }),
      );
    },
    [current, advance],
  );

  // Commit the staged view — slide into the next step (Next button).
  const proceed = useCallback(() => {
    setStaged((view) => {
      if (!view) return null;
      setFills({});
      setDirection(1);
      setNav((n) =>
        n.stack.length === 0
          ? { stack: [view], cursor: 0 } // first turn — fresh session
          : { stack: [...n.stack, view], cursor: n.stack.length },
      );
      setAdvancing(false);
      return null;
    });
  }, []);

  // LOCAL only — instant, no network (the fill-in-the-blank gesture).
  const fillSlot = useCallback((key: string, value: string) => {
    setFills((f) => ({ ...f, [key]: value }));
  }, []);

  const refreshSummary = useCallback(async () => {
    if (!current) return;
    setPending(true);
    setError(null);
    try {
      const view = await post<ConditionedSummary>("/api/lawson/refresh-summary", {
        sessionId: current.sessionId,
        fills,
      });
      // Replace the summary in place — a refresh isn't a new history step.
      setNav((n) => {
        const stack = [...n.stack];
        stack[n.cursor] = view;
        return { ...n, stack };
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }, [current, fills]);

  // ── client-side history navigation (no network) ───────────────────────────
  const back = useCallback(() => {
    setDirection(-1);
    setNav((n) => ({ ...n, cursor: Math.max(0, n.cursor - 1) }));
  }, []);

  const forward = useCallback(() => {
    setDirection(1);
    setNav((n) => ({ ...n, cursor: Math.min(n.stack.length - 1, n.cursor + 1) }));
  }, []);

  const reset = useCallback(() => {
    setDirection(-1);
    setNav(EMPTY);
    setStaged(null);
    setAdvancing(false);
    setCleaved(null);
    setFills({});
    setError(null);
  }, []);

  // ── the cleave: read-and-flip, no generation (Spec 04 §5.1) ───────────────
  const cleave = useCallback(async () => {
    if (!current) return;
    try {
      const data = await getJSON<{
        turns: StoredTurn[];
        signature: VoiceBrief | null;
        lawyer: CleaveLawyer | null;
      }>(`/api/session/${current.sessionId}`);
      setCleaved({
        turns: data.turns,
        signature: data.signature,
        lawyer: data.lawyer,
        focusTurnId: current.turnId,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [current]);

  const uncleave = useCallback(() => setCleaved(null), []);

  const state: HaloState = useMemo(
    () => ({
      current,
      fills,
      pending,
      error,
      cleaved,
      staged,
      advancing,
      busy: advancing || pending,
      atTip,
      canBack: nav.cursor > 0,
      canForward: nav.cursor >= 0 && nav.cursor < nav.stack.length - 1,
      direction,
    }),
    [current, fills, pending, error, cleaved, staged, advancing, atTip, nav.cursor, nav.stack.length, direction],
  );

  return {
    state,
    actions: { start, answer, fillSlot, refreshSummary, proceed, back, forward, reset, cleave, uncleave },
  };
}
