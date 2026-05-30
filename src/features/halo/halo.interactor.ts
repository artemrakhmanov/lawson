"use client";

// halo.interactor.ts — Halo's client-facing surface (the canonical successor to
// the throwaway tester interactor). The ONLY caller of the Lawson routes; holds
// the navigable view history + the local fills map. fillSlot mutates local state
// instantly (no network); refreshSummary posts accumulated fills — the single
// "model beat" on the one-pager.
//
// Navigation: the harness is forward-only (answer advances caseState and can't
// rewind a turnId), so Back/Forward navigate the CACHED view history client-side
// — past steps are revisited read-only; only the tip turn drives the harness.
// Reset wipes the session back to the opening prompt. A localStorage mirror of
// {stack, cursor} keeps a mid-rehearsal refresh from losing the demo (Spec 04 §6).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AnswerPayload,
  ConditionedSummary,
  ConditionedView,
} from "@/lib/services/harness/contracts";

type View = ConditionedView | ConditionedSummary;
interface Nav {
  stack: View[];
  cursor: number; // -1 = opening prompt (no view yet)
}

const MIRROR_KEY = "lawson.halo.v1";
const EMPTY: Nav = { stack: [], cursor: -1 };

// How long the incoming preamble lingers on the previous step before we slide
// into the new question — reading time for a calm lead-in sentence.
const BRIDGE_MS = 2400;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

export interface HaloState {
  current: View | null;
  fills: Record<string, string>;
  pending: boolean;
  error: string | null;
  /** The incoming turn's preamble, shown on the PREVIOUS step before we advance. */
  bridge: string | null;
  /** pending OR mid-bridge — input + navigation are locked. */
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
  const [bridge, setBridge] = useState<string | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const hydrated = useRef(false);

  // Play the incoming turn's preamble as a bridge on the current step, then hand
  // back so the caller can commit the new view (which slides in preamble-free).
  const playBridge = useCallback(async (view: View) => {
    if (view.kind === "turn" && view.preamble?.trim()) {
      setBridge(view.preamble.trim());
      await sleep(BRIDGE_MS);
      setBridge(null);
    }
  }, []);

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

  const start = useCallback(
    async (seed: string) => {
      setPending(true);
      setError(null);
      setFills({});
      try {
        const view = await post<ConditionedView>("/api/lawson/start", { seed });
        setPending(false);
        await playBridge(view); // preamble lingers on the opening screen
        setDirection(1);
        setNav({ stack: [view], cursor: 0 }); // fresh session
      } catch (e) {
        setError((e as Error).message);
        setPending(false);
      }
    },
    [playBridge],
  );

  const answer = useCallback(
    async (payload: AnswerPayload) => {
      if (!current) return;
      setPending(true);
      setError(null);
      try {
        const view = await post<View>("/api/lawson/answer", {
          sessionId: current.sessionId,
          turnId: current.turnId,
          payload,
        });
        setPending(false);
        await playBridge(view); // preamble lingers on the step just answered
        setFills({});
        setDirection(1);
        // Append after the tip (we only answer from the tip, so nothing to truncate).
        setNav((n) => {
          const stack = [...n.stack, view];
          return { stack, cursor: stack.length - 1 };
        });
      } catch (e) {
        setError((e as Error).message);
        setPending(false);
      }
    },
    [current, playBridge],
  );

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
    setFills({});
    setError(null);
  }, []);

  const state: HaloState = useMemo(
    () => ({
      current,
      fills,
      pending,
      error,
      bridge,
      busy: pending || bridge !== null,
      atTip,
      canBack: nav.cursor > 0,
      canForward: nav.cursor >= 0 && nav.cursor < nav.stack.length - 1,
      direction,
    }),
    [current, fills, pending, error, bridge, atTip, nav.cursor, nav.stack.length, direction],
  );

  return { state, actions: { start, answer, fillSlot, refreshSummary, back, forward, reset } };
}
