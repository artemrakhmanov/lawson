"use client";

// halo.interactor.ts — Halo's client-facing surface (the canonical successor to
// the throwaway tester interactor). The ONLY caller of the Lawson routes; holds
// stage + current conditioned view + the local fills map. fillSlot mutates local
// state instantly (no network); refreshSummary posts accumulated fills — the
// single "model beat" on the one-pager. No cleave/uncleave here (that is U4).
// Lives in features/ because it owns client state + networking; the dumb
// components consume it. A localStorage mirror of {sessionId, current} keeps a
// mid-rehearsal refresh from losing the demo (Spec 04 §6).

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AnswerPayload,
  ConditionedSummary,
  ConditionedView,
} from "@/lib/services/harness/contracts";

type Current = ConditionedView | ConditionedSummary | null;

const MIRROR_KEY = "lawson.halo.v1";

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
  current: Current;
  fills: Record<string, string>;
  pending: boolean;
  done: boolean;
  error: string | null;
}

export function useHaloInteractor() {
  const [current, setCurrent] = useState<Current>(null);
  const [fills, setFills] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(false);

  // Rehearsal refresh-safety: restore the last rendered conditioned view.
  useEffect(() => {
    hydrated.current = true;
    try {
      const raw = window.localStorage.getItem(MIRROR_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Current;
        if (saved) {
          setCurrent(saved);
          if (saved.kind === "summary") setDone(true);
        }
      }
    } catch {
      /* ignore a corrupt mirror */
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      if (current) window.localStorage.setItem(MIRROR_KEY, JSON.stringify(current));
      else window.localStorage.removeItem(MIRROR_KEY);
    } catch {
      /* localStorage may be unavailable; the mirror is best-effort */
    }
  }, [current]);

  const start = useCallback(async (seed: string) => {
    setPending(true);
    setError(null);
    setDone(false);
    setFills({});
    try {
      setCurrent(await post<ConditionedView>("/api/lawson/start", { seed }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }, []);

  const answer = useCallback(
    async (payload: AnswerPayload) => {
      if (!current) return;
      setPending(true);
      setError(null);
      try {
        const view = await post<ConditionedView | ConditionedSummary>("/api/lawson/answer", {
          sessionId: current.sessionId,
          turnId: current.turnId,
          payload,
        });
        setCurrent(view);
        setFills({});
        if (view.kind === "summary") setDone(true);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setPending(false);
      }
    },
    [current],
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
      setCurrent(view);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }, [current, fills]);

  const state: HaloState = { current, fills, pending, done, error };
  return { state, actions: { start, answer, fillSlot, refreshSummary } };
}
