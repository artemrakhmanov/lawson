"use client";

// example.interactor.ts — the LOGIC half of the convention (Spec 00 §3.1).
// All state, derived values, and (eventually) networking live here. Exposes a
// small `{ state, actions }` hook the dumb component consumes. This feature is
// a reference scaffold only — Spec 04 (Halo) is the real surface.

import { useCallback, useState } from "react";

export interface ExampleState {
  count: number;
}

export interface ExampleActions {
  increment: () => void;
  reset: () => void;
}

export function useExampleInteractor(): {
  state: ExampleState;
  actions: ExampleActions;
} {
  const [count, setCount] = useState(0);

  const increment = useCallback(() => setCount((c) => c + 1), []);
  const reset = useCallback(() => setCount(0), []);

  return { state: { count }, actions: { increment, reset } };
}
