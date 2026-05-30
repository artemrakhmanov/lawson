"use client";

// tester.interactor.ts — the client-facing surface (contracts §1.13). The ONLY
// caller of the Lawson routes; holds stage + current turn/summary + the local
// fills map. fillSlot mutates local state instantly (no network); refreshSummary
// posts the accumulated fills. No `cleave`/`uncleave` here — that is Spec 04.
// Lives in features/ (not services/) because it owns client state + networking.

import { useCallback, useState } from "react";
import type {
  AnswerPayload, ConditionedSummary, ConditionedView,
} from "@/lib/services/harness/contracts";

type Current = ConditionedView | ConditionedSummary | null;

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

export interface TesterState {
  current: Current;
  fills: Record<string, string>;
  pending: boolean;
  done: boolean;
  error: string | null;
}

export function useTesterInteractor() {
  const [current, setCurrent] = useState<Current>(null);
  const [fills, setFills] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // LOCAL only — instant, no network (the slot fill-in-the-blank gesture).
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

  const state: TesterState = { current, fills, pending, done, error };
  return { state, actions: { start, answer, fillSlot, refreshSummary } };
}
