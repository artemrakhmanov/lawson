"use client";

// example.tsx — the PRESENTATION half of the convention (Spec 00 §3.1).
// Renders interactor state, fires callbacks. No logic, no networking. Delete
// the interactor and this stays a valid (inert) UI. Strict monochrome (§4).

import { cn } from "@/lib/utils";
import { useExampleInteractor } from "./example.interactor";

export function Example() {
  const { state, actions } = useExampleInteractor();

  return (
    <div className="flex items-center gap-4">
      <span className="w-6 text-center text-sm tabular-nums text-muted-foreground">
        {state.count}
      </span>
      <button
        type="button"
        onClick={actions.increment}
        className={cn(
          "rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted",
        )}
      >
        increment
      </button>
      <button
        type="button"
        onClick={actions.reset}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
        )}
      >
        reset
      </button>
    </div>
  );
}
