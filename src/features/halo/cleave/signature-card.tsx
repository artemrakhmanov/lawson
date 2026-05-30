"use client";

// signature-card.tsx — reveal furniture (G7). Names the voice the right panel
// bent toward: the matched lawyer's brief label, characteristic moves, and one
// exemplar line. Quiet, authoritative, greyscale. Fed by the stored brief.

import type { VoiceBrief } from "@/lib/services/lawguistics/types";

export function SignatureCard({ brief }: { brief: VoiceBrief }) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Bending toward</span>
        <p className="text-sm font-medium leading-snug">{brief.label}</p>
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
