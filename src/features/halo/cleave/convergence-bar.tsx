"use client";

// convergence-bar.tsx — reveal furniture (G7). One bar per turn showing the
// normalised-Euclidean gap to the target voice (→ 0). The bars visibly SHRINK
// across turns — proof the conditioned output measurably approached this
// lawyer's style. Greyscale; emphasis via length, not hue. Fed by stored stats.

import { motion } from "framer-motion";

export function ConvergenceBar({ series }: { series: number[] }) {
  if (!series.length) return null;
  const max = Math.max(...series, 0.0001);

  return (
    <div className="flex h-full flex-col gap-2 rounded-lg border border-border p-4">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">Gap to target voice → 0</span>
      <div className="flex flex-1 flex-col justify-center gap-2">
        {series.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-7 shrink-0 text-xs tabular-nums text-muted-foreground">Q{i + 1}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(3, (v / max) * 100)}%` }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.12, ease: "easeOut" }}
                className="h-full rounded-full bg-foreground"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
