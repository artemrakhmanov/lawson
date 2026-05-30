"use client";

// codex.tsx — the explainer. A single-screen bento that names the two halves of
// the product and states the core principle in a few large words: Lawson is the
// delightful intake that helps you explain your case; Lawguistics quietly bends
// the *sound* of every reply toward the lawyer's voice, deepening turn by turn,
// so familiarity is already in place by the first real conversation. Triggered
// from anywhere with ⌘/Ctrl + ? (same chord, or Escape, dismisses). Pure
// presentation + a local hotkey — no networking, no model calls, no scroll.
// Fits the viewport; type is large enough to read from across the room. Strict
// monochrome.

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowRight } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

// The drift ladder — bend deepens turn over turn. Shape, not data: relative
// heights only, no numbers.
const DRIFT = [18, 38, 60, 80, 96];

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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay }}
      className={`flex min-h-0 flex-col rounded-2xl border border-border bg-card p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{children}</span>
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
          className="fixed inset-0 z-[60] h-[100dvh] overflow-hidden bg-background/95 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto flex h-full max-w-6xl flex-col px-6 py-6"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-4 flex shrink-0 items-center justify-between">
              <Eyebrow>How it works</Eyebrow>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto] gap-4 md:grid-cols-6 md:grid-rows-5">
              {/* LAWSON — the delightful intake. */}
              <Cell className="justify-center gap-4 md:col-span-4 md:row-span-2" delay={0.02}>
                <Eyebrow>The intake</Eyebrow>
                <h2 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
                  <span className="font-bold">Lawson</span> makes explaining your case feel easy.
                </h2>
                <p className="text-lg text-muted-foreground">
                  A warm, guided conversation — not a form.
                </p>
              </Cell>

              {/* THE BEND — your voice → their voice. */}
              <Cell className="justify-center gap-5 md:col-span-2 md:row-span-2" delay={0.06}>
                <Eyebrow>The bend</Eyebrow>
                <div className="flex flex-col items-start gap-3 text-lg">
                  <span className="rounded-lg border border-border px-3 py-1.5 text-muted-foreground">
                    Your voice
                  </span>
                  <ArrowRight className="size-6 rotate-90 text-muted-foreground" />
                  <span className="rounded-lg border border-foreground bg-foreground px-3 py-1.5 font-medium text-background">
                    Their voice
                  </span>
                </div>
              </Cell>

              {/* LAWGUISTICS — the principle. */}
              <Cell className="justify-center gap-4 md:col-span-3 md:row-span-3" delay={0.1}>
                <Eyebrow>Underneath · Lawguistics</Eyebrow>
                <p className="text-balance text-3xl font-medium leading-tight tracking-tight md:text-[2.1rem]">
                  Every reply is re-sounded toward the voice of the lawyer you’ll meet.
                </p>
                <p className="text-lg text-muted-foreground">Same facts. Only the sound changes.</p>
              </Cell>

              {/* DRIFT — deepens turn by turn. */}
              <Cell className="justify-between gap-4 md:col-span-3 md:row-span-3" delay={0.14}>
                <Eyebrow>Drift · turn by turn</Eyebrow>
                <div className="flex flex-1 items-end gap-3">
                  {DRIFT.map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.7, ease: EASE, delay: 0.3 + i * 0.08 }}
                      className="flex-1 rounded-md bg-foreground"
                    />
                  ))}
                </div>
                <p className="text-balance text-xl font-medium leading-snug">
                  The bend deepens so gently no single turn is noticed.
                </p>
              </Cell>
            </div>

            <footer className="mt-4 flex shrink-0 items-center justify-center gap-2 text-base text-muted-foreground">
              <span className="font-medium text-foreground">The result:</span>
              <span>by your first real conversation, they already feel familiar.</span>
            </footer>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
