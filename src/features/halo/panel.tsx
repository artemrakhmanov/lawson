"use client";

// panel.tsx — the register-parameterized presentation shell for one turn's
// "pure register" body (Spec 04 §3 / G5). The question is the hero (an animated
// TextGenerateEffect title); the framing is tucked behind a quiet "Why is this
// important?" disclosure so the step reads as title → straight into the questions.
// The preamble is NOT shown here — it plays as a bridge on the previous step (see
// preamble-bridge). Split-ready: the cleave (U4/G5) mounts two of these with
// identical typography. Interaction chrome lives in turn-view's `footer`.

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TextGenerateEffect } from "@/components/custom/text-generate-effect";
import { Stagger, Item } from "./reveal";

export function Panel({
  question,
  framing,
  scaffolds,
  reassurance,
  renderScaffold,
  footer,
  className,
}: {
  question: string;
  framing?: string;
  scaffolds: string[];
  reassurance?: string;
  renderScaffold: (text: string, index: number) => ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const [showWhy, setShowWhy] = useState(false);

  return (
    <Stagger className={cn("measure flex w-full flex-col gap-7", className)}>
      <TextGenerateEffect
        words={question}
        textClassName="text-xl font-medium leading-snug tracking-tight text-foreground md:text-2xl"
      />

      {framing && (
        <Item className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            className="self-start text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Why is this important?
          </button>
          <AnimatePresence initial={false}>
            {showWhy && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="overflow-hidden text-sm leading-relaxed text-muted-foreground"
              >
                {framing}
              </motion.p>
            )}
          </AnimatePresence>
        </Item>
      )}

      {scaffolds.length > 0 && (
        <div className="flex flex-col gap-3">
          {scaffolds.map((sc, i) => (
            <Item key={i}>{renderScaffold(sc, i)}</Item>
          ))}
        </div>
      )}

      {footer && <Item>{footer}</Item>}

      {reassurance && (
        <Item>
          <p className="text-xs italic leading-relaxed text-muted-foreground">{reassurance}</p>
        </Item>
      )}
    </Stagger>
  );
}
