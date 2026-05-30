"use client";

// halo.tsx — the Halo intake surface (Spec 04). Dumb-ish orchestration: it owns
// no networking (that is the interactor) — it routes between the three screens
// (opening → turn → one-pager) and renders interactor state. Each screen is a
// full-viewport vertical SECTION; when advancing, the next turn's preamble
// shimmers in UNDER the current component (the StepBridge), the view scrolls down
// to it, and a Next button slides into the new section. Back reverses the slide.
// A sticky 3-dot progress capsule rides the top through the question ladder. Past
// steps are revisited read-only (interactive only at the tip).

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, ChevronDown, RotateCcw } from "lucide-react";
import { config } from "@/lib/services/config";
import type { Stage } from "@/lib/services/harness/contracts";
import { useHaloInteractor } from "./halo.interactor";
import { OpeningPrompt } from "./opening-prompt";
import { TurnView } from "./turn-view";
import { OnePager } from "./one-pager";
import { ProgressCapsule } from "./progress-capsule";
import { StepBridge } from "./step-bridge";
import { Cleave } from "./cleave/cleave";
import { Button } from "@/components/ui/button";

// A calm, weighty ease — slow-out so each section settles rather than snaps.
const SLIDE = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };

// Direction-aware vertical slide: forward (1) rises from below and exits up;
// back (-1) drops in from above and exits down.
const variants = {
  enter: (d: 1 | -1) => ({ y: d > 0 ? "100%" : "-100%" }),
  center: { y: 0 },
  exit: (d: 1 | -1) => ({ y: d > 0 ? "-100%" : "100%" }),
};

// Which dot the current turn lights up (the q-ladder is opening → q1 → q2 …).
const STAGE_STEP: Record<Stage, number> = { opening: 0, q1: 1, q2: 2, q3: 3, summary: config.turnBudget };

export function Halo() {
  const { state, actions } = useHaloInteractor();
  const { current, fills, error, cleaved, staged, advancing, busy, atTip, canBack, canForward, direction } =
    state;

  // Key the slide by screen identity so each new turn animates in.
  const screenKey = current ? `${current.kind}:${current.turnId}` : "opening";
  const hasSession = current !== null;

  // ⌘/Ctrl + . cleaves the reading panel; Escape (or the same chord) reverses.
  const { cleave, uncleave } = actions;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        if (!hasSession || busy) return;
        if (cleaved) uncleave();
        else cleave();
      } else if (e.key === "Escape" && cleaved) {
        uncleave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasSession, busy, cleaved, cleave, uncleave]);

  const isSummary = current?.kind === "summary";
  const activeStep = current?.kind === "turn" ? STAGE_STEP[current.stage] : 0;
  const stagedPreamble = staged?.kind === "turn" ? staged.preamble : undefined;

  return (
    <main className="relative h-[100dvh] overflow-hidden">
      {/* Sticky progress capsule — appears once the question ladder begins. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center pt-4">
        <AnimatePresence>
          {hasSession && (
            <ProgressCapsule total={config.turnBudget} activeStep={activeStep} complete={isSummary} />
          )}
        </AnimatePresence>
      </div>

      {/* Navigation furniture — quiet, monochrome, only once a session exists. */}
      {hasSession && (
        <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={!canBack || busy} onClick={actions.back}>
              <ChevronUp className="size-4" /> Previous
            </Button>
            <Button variant="ghost" size="sm" disabled={!canForward || busy} onClick={actions.forward}>
              <ChevronDown className="size-4" /> Next
            </Button>
          </div>
          <Button variant="ghost" size="sm" disabled={busy} onClick={actions.reset}>
            <RotateCcw className="size-4" /> Start over
          </Button>
        </div>
      )}

      <AnimatePresence initial={false} custom={direction}>
        <motion.section
          key={screenKey}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={SLIDE}
          className="absolute inset-0 overflow-y-auto"
        >
          {/* The current step — centered when short, scrolls from the top when
              taller than the viewport (m-auto, not justify-center). */}
          <div className="flex min-h-[100dvh] w-full flex-col">
            <div className="m-auto w-full px-6 py-24">
              {!current && <OpeningPrompt onStart={actions.start} pending={busy} />}

              {current?.kind === "turn" && (
                <TurnView view={current} pending={busy} interactive={atTip} onAnswer={actions.answer} />
              )}

              {current?.kind === "summary" && (
                <OnePager
                  summary={current}
                  fills={fills}
                  pending={busy}
                  interactive={atTip}
                  onFillSlot={actions.fillSlot}
                  onRefresh={actions.refreshSummary}
                />
              )}
            </div>
          </div>

          {/* The next turn's preamble, shimmering in beneath the current step. */}
          {advancing && (
            <div className="flex min-h-[100dvh] w-full flex-col">
              <div className="m-auto w-full px-6 py-24">
                <StepBridge loading={!staged} preamble={stagedPreamble} onProceed={actions.proceed} />
              </div>
            </div>
          )}
        </motion.section>
      </AnimatePresence>

      {/* Cleave hint — only on the summary, only before the reveal. */}
      <AnimatePresence>
        {isSummary && !cleaved && !busy && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.6 }}
            className="pointer-events-none absolute inset-x-0 bottom-6 z-30 text-center text-xs text-muted-foreground"
          >
            Press ⌘ + . to compare voices
          </motion.p>
        )}
      </AnimatePresence>

      {/* The cleave — a full-screen read-and-flip overlay; nothing generates here. */}
      <AnimatePresence>
        {cleaved && (
          <Cleave
            turns={cleaved.turns}
            signature={cleaved.signature}
            focusTurnId={cleaved.focusTurnId}
            onClose={uncleave}
          />
        )}
      </AnimatePresence>

      {/* Error affordance, overlaid so it doesn't shift the sliding sections. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-8 z-30 flex justify-center px-6">
        <AnimatePresence>
          {error && (
            <motion.p
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-auto rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
