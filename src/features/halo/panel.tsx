"use client";

// panel.tsx — the register-parameterized presentation shell for one turn's
// "pure register" body (Spec 04 §3 / G5). It renders ONLY the fields that carry
// voice and diverge across registers — preamble · question · framing · scaffolds
// · reassurance — at the canonical type scale + measure (01 foundations). It is
// deliberately split-ready: the cleave (U4/G5) mounts two of these side by side
// (left = baseline, right = conditioned) with identical typography, which is a
// cleave invariant. Interaction chrome (freeform field, submit controls) is NOT
// here — it lives in turn-view's `footer` so the panel stays a pure, reusable,
// register-invariant frame. Dumb component: no fetch, no logic.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  preamble,
  question,
  framing,
  scaffolds,
  reassurance,
  renderScaffold,
  footer,
  className,
}: {
  preamble?: string;
  question: string;
  framing?: string;
  scaffolds: string[];
  reassurance?: string;
  // How each scaffold string renders — the intake passes an interactive
  // slot-renderer; the cleave will pass a read-only one. Index lets the caller
  // scope per-scaffold fill state.
  renderScaffold: (text: string, index: number) => ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("measure flex w-full flex-col gap-8", className)}>
      {preamble && <p className="text-muted-foreground">{preamble}</p>}

      <h2 className="text-2xl font-medium tracking-tight text-balance md:text-3xl">{question}</h2>

      {framing && <p className="text-muted-foreground">{framing}</p>}

      {scaffolds.length > 0 && (
        <ul className="flex flex-col gap-5">
          {scaffolds.map((sc, i) => (
            <li key={i}>{renderScaffold(sc, i)}</li>
          ))}
        </ul>
      )}

      {footer}

      {reassurance && <p className="text-sm italic text-muted-foreground">{reassurance}</p>}
    </article>
  );
}
