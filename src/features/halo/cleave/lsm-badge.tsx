"use client";

// lsm-badge.tsx — reveal furniture (G7). The Pennebaker Linguistic Style Match
// (function-word synchrony) as a single number with citation. Borderless — the
// hand-drawn annotation circle is its only frame. Greyscale.

export function LsmBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex flex-col items-center gap-1 px-5 py-2 text-center">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">Linguistic Style Match</span>
      <p className="text-4xl font-medium tabular-nums leading-none">{pct}%</p>
      <p className="text-[10px] leading-tight text-muted-foreground">
        function-word synchrony · Ireland &amp; Pennebaker, 2010
      </p>
    </div>
  );
}
