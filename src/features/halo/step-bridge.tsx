"use client";

// step-bridge.tsx — the in-flow transition between steps (replaces the skeleton
// overlay). It sits UNDER the current component: while the next turn generates,
// the preamble's place shimmers; once it resolves, the preamble reveals (word by
// word) and a Next button appears. The view scrolls down to it on appearance.
// Nothing auto-advances — the user clicks Next to slide into the new question.
// Dumb component.

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TextGenerateEffect } from "@/components/custom/text-generate-effect";
import { Button } from "@/components/ui/button";

export function StepBridge({
  loading,
  preamble,
  onProceed,
}: {
  loading: boolean;
  preamble?: string;
  onProceed: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Scroll the bridge into view when it appears and again once it resolves.
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading]);

  return (
    <div ref={ref} className="measure w-full">
      {loading ? (
        <div className="space-y-3" aria-label="composing">
          <div className="h-6 w-5/6 rounded bg-muted shimmer" />
          <div className="h-6 w-2/3 rounded bg-muted shimmer" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col gap-10"
        >
          {preamble && (
            <TextGenerateEffect
              words={preamble}
              textClassName="text-xl font-normal leading-relaxed tracking-tight text-foreground md:text-2xl"
            />
          )}
          <Button onClick={onProceed} className="self-start">
            Next
          </Button>
        </motion.div>
      )}
    </div>
  );
}
