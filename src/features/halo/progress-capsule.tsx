"use client";

// progress-capsule.tsx — the sticky top progress pill: one dot per question turn
// (turnBudget = 3). Answered dots fill solid, the current dot is emphasised,
// upcoming dots stay faint. On the summary every dot reads complete. Monochrome;
// dumb component (pure props).

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ProgressCapsule({
  total,
  activeStep,
  complete,
}: {
  total: number;
  activeStep: number;
  complete: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex items-center gap-2.5 rounded-full border border-border bg-background/80 px-3.5 py-2 backdrop-blur"
    >
      {Array.from({ length: total }).map((_, i) => {
        const done = complete || i < activeStep;
        const active = !complete && i === activeStep;
        return (
          <motion.span
            key={i}
            animate={{ scale: active ? 1.25 : 1 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "size-1.5 rounded-full transition-colors",
              done && "bg-foreground",
              active && "bg-foreground ring-2 ring-foreground/15",
              !done && !active && "bg-muted-foreground/30",
            )}
          />
        );
      })}
    </motion.div>
  );
}
