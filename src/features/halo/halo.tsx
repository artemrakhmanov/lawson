"use client";

// halo.tsx — the Halo intake surface (Spec 04). Dumb-ish orchestration: it owns
// no networking (that is the interactor) — it only routes between the three
// screens (opening → turn → one-pager) and renders interactor state. Turn-to-turn
// transition is a very subtle, fast crossfade (framer-motion) per the 01 motion
// policy — the cleave (U4) is still the only moment that truly animates. The
// wait/"thinking" state is a quiet placeholder here; U3 (G4) replaces it with the
// shimmer + erudite status phrases.

import { AnimatePresence, motion } from "framer-motion";
import { useHaloInteractor } from "./halo.interactor";
import { OpeningPrompt } from "./opening-prompt";
import { TurnView } from "./turn-view";
import { OnePager } from "./one-pager";

export function Halo() {
  const { state, actions } = useHaloInteractor();
  const { current, fills, pending, error } = state;

  // Key the crossfade by the screen identity so each new turn fades in.
  const screenKey = current ? `${current.kind}:${current.turnId}` : "opening";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <AnimatePresence mode="wait">
        <motion.div
          key={screenKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex w-full flex-col items-center"
        >
          {!current && <OpeningPrompt onStart={actions.start} pending={pending} />}

          {current?.kind === "turn" && (
            <TurnView view={current} pending={pending} onAnswer={actions.answer} />
          )}

          {current?.kind === "summary" && (
            <OnePager
              summary={current}
              fills={fills}
              pending={pending}
              onFillSlot={actions.fillSlot}
              onRefresh={actions.refreshSummary}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Quiet, temporary wait + error affordances — U3 replaces the wait state. */}
      <div className="measure mt-8 w-full">
        {pending && <p className="animate-pulse text-center text-sm text-muted-foreground">Considering…</p>}
        {error && (
          <p className="rounded-md border border-border bg-muted px-3 py-2 text-center text-sm text-foreground">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
