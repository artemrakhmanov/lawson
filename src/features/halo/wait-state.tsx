"use client";

// wait-state.tsx — G4 (U3). Functional cover for the ~10s routing/agent-resolve
// latency. A greyscale shimmer skeleton stands where the next turn will land,
// with erudite status phrases crossfading beneath it (~2s). No spinner, no
// colour — it reads as "a thoughtful person is considering this," not a loader.

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Vocabulary of a well-read lawyer — dignified, never cute (Spec 04 / ux 02).
const PHRASES = [
  "Apprehending the particulars…",
  "Conferring with the appropriate desk…",
  "Marshalling the relevant questions…",
  "Construing the matter…",
  "Consulting the bench…",
  "Weighing the most apposite line of inquiry…",
];

export function WaitState() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % PHRASES.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-12 bg-background px-6"
    >
      {/* Skeleton of a forthcoming turn: a question line + two option rows. */}
      <div className="measure w-full space-y-4">
        <div className="h-6 w-1/3 rounded bg-muted shimmer" />
        <div className="h-8 w-5/6 rounded-md bg-muted shimmer" />
        <div className="h-12 w-full rounded-md bg-muted shimmer" style={{ marginTop: "1.75rem" }} />
        <div className="h-12 w-full rounded-md bg-muted shimmer" />
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="text-sm tracking-wide text-muted-foreground"
        >
          {PHRASES[i]}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}
