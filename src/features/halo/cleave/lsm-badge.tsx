"use client";

// lsm-badge.tsx — reveal furniture (G7). The Pennebaker Linguistic Style Match
// (function-word synchrony) as a single number with citation — the one that
// comes "from the papers," against the bar's one that people feel. Greyscale.

export function LsmBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex h-full flex-col justify-center gap-1 rounded-lg border border-border p-4">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">Linguistic Style Match</span>
      <p className="text-3xl font-medium tabular-nums leading-none">{pct}%</p>
      <p className="text-[10px] leading-tight text-muted-foreground">
        function-word synchrony · Ireland &amp; Pennebaker, 2010
      </p>
    </div>
  );
}
