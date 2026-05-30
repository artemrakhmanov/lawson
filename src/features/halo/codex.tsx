"use client";

// codex.tsx — the explainer. A bento-grid summary of what Lawson + Lawguistics
// actually do under the warm intake: bend the *sound* of every output from
// mirroring the user toward the matched lawyer's voice, on a per-turn drift
// schedule, so familiarity and rapport accrue imperceptibly and are already in
// place by the first real interaction. Triggered from anywhere with ⌘/Ctrl + ?
// (and the same chord, or Escape, dismisses). Pure presentation + a local
// hotkey + open-state — no networking, no model calls; safe to mount once at
// the surface. Strict monochrome, like the rest of the surface.

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { CountUp } from "./cleave/count-up";

const EASE = [0.22, 1, 0.36, 1] as const;

// The drift ladder — bend deepens turn over turn; each step's delta stays under
// the threshold of notice, which is the whole point.
const DRIFT = [
  { stage: "Opening", bend: 12 },
  { stage: "Q1", bend: 31 },
  { stage: "Q2", bend: 54 },
  { stage: "Q3", bend: 73 },
  { stage: "Summary", bend: 88 },
];

// One reusable bento cell.
function Cell({
  className = "",
  delay = 0,
  children,
}: {
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className={`flex flex-col rounded-2xl border border-border bg-card p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">{children}</span>
  );
}

export function Codex() {
  const [open, setOpen] = useState(false);

  // ⌘/Ctrl + ? toggles; Escape closes. "?" is what Shift + / yields on the chord.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "?" || (e.shiftKey && e.key === "/"))) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] overflow-y-auto bg-background/95 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto flex min-h-full max-w-6xl flex-col px-6 py-10"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-8 flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <Eyebrow>How it works</Eyebrow>
                <h1 className="text-2xl font-semibold tracking-tight">Lawson × Lawguistics</h1>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="grid auto-rows-[minmax(0,1fr)] grid-cols-1 gap-4 md:grid-cols-6">
              {/* HERO — the one-paragraph thesis. */}
              <Cell className="md:col-span-4 md:row-span-2 justify-between gap-6" delay={0.02}>
                <Eyebrow>The premise</Eyebrow>
                <p className="text-balance text-2xl font-medium leading-snug tracking-tight md:text-[1.75rem]">
                  A warm legal intake that quietly bends the{" "}
                  <span className="underline decoration-border decoration-2 underline-offset-4">
                    sound
                  </span>{" "}
                  of every reply from mirroring you toward the voice of the lawyer you’ll meet —
                  so by the first real conversation, they already feel familiar.
                </p>
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                  The facts never change. Only the register does. Rapport is engineered before it’s
                  ever spoken.
                </p>
              </Cell>

              {/* THE BEND — mirror → lawyer. */}
              <Cell className="md:col-span-2 md:row-span-2 justify-between gap-6" delay={0.06}>
                <Eyebrow>The bend</Eyebrow>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="rounded-md border border-border px-2.5 py-1 text-muted-foreground">
                      Your voice
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                    <span className="rounded-md border border-foreground bg-foreground px-2.5 py-1 font-medium text-background">
                      Their voice
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Lawguistics conditions each output along a vector between two registers,
                    interpolating the cadence, function-word rhythm and phrasing toward the matched
                    lawyer’s signature.
                  </p>
                </div>
                <p className="text-xs italic leading-relaxed text-muted-foreground">
                  Same substance, re-sounded. The bend is the product.
                </p>
              </Cell>

              {/* DRIFT — the schedule, visualized. */}
              <Cell className="md:col-span-3" delay={0.1}>
                <div className="mb-4 flex items-baseline justify-between">
                  <Eyebrow>Drift schedule</Eyebrow>
                  <span className="text-xs text-muted-foreground">per turn · imperceptible delta</span>
                </div>
                <div className="flex items-end gap-2">
                  {DRIFT.map((d, i) => (
                    <div key={d.stage} className="flex flex-1 flex-col items-center gap-2">
                      <div className="relative flex h-24 w-full items-end overflow-hidden rounded-md bg-muted">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${d.bend}%` }}
                          transition={{ duration: 0.8, ease: EASE, delay: 0.3 + i * 0.08 }}
                          className="w-full rounded-md bg-foreground"
                        />
                      </div>
                      <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                        {d.stage}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Early turns mirror you almost exactly; the bend deepens as trust builds. No single
                  step crosses the threshold of notice — only the arc does.
                </p>
              </Cell>

              {/* MEASURED — real numbers. */}
              <Cell className="md:col-span-3" delay={0.14}>
                <Eyebrow>Measured, not vibed</Eyebrow>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-4xl font-semibold tracking-tight tabular-nums">
                      <CountUp to={88} delay={0.4} />%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      LSM — Pennebaker function-word synchrony
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-4xl font-semibold tracking-tight tabular-nums">→ 0</span>
                    <span className="text-xs text-muted-foreground">
                      convergence — normalised Euclidean distance
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  The same naive splitter measures your text and the lawyer’s corpus, so the reveal’s
                  numbers are computed — not estimated.
                </p>
              </Cell>

              {/* RAPPORT — the why. */}
              <Cell className="md:col-span-2" delay={0.18}>
                <Eyebrow>Why it matters</Eyebrow>
                <p className="mt-3 text-sm leading-relaxed text-foreground">
                  High linguistic style-match reads to the brain as{" "}
                  <span className="font-medium">familiarity</span>.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Build it imperceptibly during intake and the first real interaction starts warm —
                  rapport already in the bank.
                </p>
              </Cell>

              {/* INTEGRITY — the seam. */}
              <Cell className="md:col-span-2" delay={0.22}>
                <Eyebrow>The integrity claim</Eyebrow>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Every turn carries both registers. An LLM-as-judge gate verifies the facts are
                  identical and falls back to flat baseline on any semantic drift.
                </p>
                <p className="mt-auto pt-3 text-xs italic text-muted-foreground">
                  Two panels. Same facts. Only the sound differs.
                </p>
              </Cell>

              {/* THE CLEAVE — the proof + chord. */}
              <Cell className="md:col-span-2 justify-between gap-4" delay={0.26}>
                <Eyebrow>See the proof</Eyebrow>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Split the screen into baseline vs. what you actually read — measured side by side.
                </p>
                <kbd className="w-fit rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs text-foreground">
                  ⌘ + .
                </kbd>
              </Cell>
            </div>

            <footer className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>Press</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-foreground">
                Esc
              </kbd>
              <span>to close ·</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-foreground">
                ⌘ + ?
              </kbd>
              <span>anytime to reopen</span>
            </footer>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
