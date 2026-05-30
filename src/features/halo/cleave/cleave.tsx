"use client";

// cleave.tsx — the payload. The reading panel mitoses at its centerline into two
// synced panels: left = baseline (flat), right = conditioned (what they read).
// Choreography is load-bearing (Spec 04 §5 / ux 03):
//   1. mitosis — fast, clean, ~500ms ease-out, both halves arrive settled;
//   2. a beat later, a hand-drawn circle annotates "What you read";
//   3. furniture after the hold — signature card (with a 0→final "voice adopted"
//      meter) + the LSM badge, circled and captioned with the matched lawyer.
// Nothing generates here — it renders stored registers + stats only. Synced
// scroll is structural: one scroll container, two columns.

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { StoredTurn } from "@/lib/services/session/store";
import type { VoiceBrief } from "@/lib/services/lawguistics/types";
import { CleavePanel } from "./cleave-panel";
import { SignatureCard } from "./signature-card";
import { LsmBadge } from "./lsm-badge";
import { AnnotationCircle } from "./annotation-circle";

const EASE = [0.22, 1, 0.36, 1] as const;
const ANNOTATE_MS = 1500; // a beat after the mitosis settles
const HOLD_MS = 3500; // mitosis (~500ms) + ~3s of silence before furniture

export type CleaveLawyer = { name: string; title: string; practiceArea: string };

export function Cleave({
  turns,
  signature,
  lawyer,
  focusTurnId,
  onClose,
}: {
  turns: StoredTurn[];
  signature: VoiceBrief | null;
  lawyer: CleaveLawyer | null;
  focusTurnId: string;
  onClose: () => void;
}) {
  const focus = turns.find((t) => t.turnId === focusTurnId) ?? turns[turns.length - 1];
  const lsm = focus?.stats?.lsm;
  const score = lsm != null ? Math.round(lsm * 100) : 0;

  const [annotateRead, setAnnotateRead] = useState(false);
  const [showFurniture, setShowFurniture] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setAnnotateRead(true), ANNOTATE_MS);
    const f = setTimeout(() => setShowFurniture(true), HOLD_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(f);
    };
  }, []);

  if (!focus) return null;

  const hasFurniture = !!signature || lsm != null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Same facts · different voice
        </span>
        <button
          onClick={onClose}
          aria-label="Close comparison"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </header>

      {/* Synced scroll: a single container, two columns. */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="relative mx-auto grid max-w-6xl grid-cols-2">
          {/* Center seam, drawn from the top as the panels part. */}
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="pointer-events-none absolute inset-y-0 left-1/2 w-px origin-top -translate-x-1/2 bg-border"
          />

          <motion.div
            initial={{ x: "50%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="px-8 py-16"
          >
            <span className="mb-8 block text-xs uppercase tracking-widest text-muted-foreground">
              Baseline
            </span>
            <CleavePanel turn={focus} register="baseline" />
          </motion.div>

          <motion.div
            initial={{ x: "-50%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="px-8 py-16"
          >
            <div className="mb-8 w-fit text-xs uppercase tracking-widest text-foreground">
              {annotateRead ? <AnnotationCircle>What you read</AnnotationCircle> : "What you read"}
            </div>
            <CleavePanel turn={focus} register="conditioned" />
          </motion.div>
        </div>
      </div>

      {/* Furniture — only after the hold (never fade it in with the panels). */}
      <AnimatePresence>
        {showFurniture && hasFurniture && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="border-t border-border px-6 pb-6 pt-5"
          >
            <div className="mx-auto flex max-w-6xl flex-wrap items-stretch gap-8">
              {signature && (
                <div className="min-w-72 flex-[2]">
                  <SignatureCard brief={signature} score={score} scoreDelay={0.3} />
                </div>
              )}

              {lsm != null && (
                <div className="flex min-w-56 flex-1 flex-col items-center justify-center gap-3 py-2">
                  <AnnotationCircle delay={0.6} className="text-foreground">
                    <LsmBadge value={lsm} />
                  </AnnotationCircle>
                  {lawyer && (
                    <p className="text-center text-sm italic text-muted-foreground">
                      Most likely lawyer match —{" "}
                      <span className="font-medium not-italic text-foreground">{lawyer.name}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
