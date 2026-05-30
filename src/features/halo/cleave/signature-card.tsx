"use client";

// signature-card.tsx — reveal furniture (G7). Names the voice the right panel
// bent toward: the matched lawyer's brief label, an animated "voice adopted"
// meter (0 → final), characteristic moves, and one exemplar line. Quiet,
// authoritative, greyscale. Fed by the stored brief + stats.

import { motion } from "framer-motion";
import type { VoiceBrief } from "@/lib/services/lawguistics/types";
import { CountUp } from "./count-up";

export function SignatureCard({
  brief,
  score,
  scoreDelay = 0,
}: {
  brief: VoiceBrief;
  score: number; // final % the meter animates to
  scoreDelay?: number;
}) {
  return (
    <div className="flex h-full flex-col gap-4 rounded-lg border border-border p-5">
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Bending toward</span>
        <p className="text-sm font-medium leading-snug">{brief.label}</p>
      </div>

      {/* "Voice adopted" meter — animates from 0 to the final value. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Voice adopted</span>
          <span className="text-sm font-medium tabular-nums">
            <CountUp to={score} delay={scoreDelay} />%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1.4, delay: scoreDelay, ease: "easeOut" }}
            className="h-full rounded-full bg-foreground"
          />
        </div>
      </div>

      <ul className="flex flex-col gap-1">
        {brief.moves.slice(0, 4).map((m, i) => (
          <li key={i} className="text-xs text-muted-foreground">
            — {m}
          </li>
        ))}
      </ul>

      <p className="mt-auto border-t border-border pt-2 text-xs italic leading-relaxed text-muted-foreground">
        “{brief.exemplarLine}”
      </p>
    </div>
  );
}
