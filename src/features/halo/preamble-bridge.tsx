"use client";

// preamble-bridge.tsx — the transitional beat between steps. When the next turn
// is generated, its preamble lingers here over the step just answered (a calm
// word-by-word reveal) before the new question slides in. The new step itself
// shows no preamble — this is where it lives. Dumb component.

import { motion } from "framer-motion";
import { TextGenerateEffect } from "@/components/custom/text-generate-effect";

export function PreambleBridge({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-background px-6"
    >
      <div className="measure">
        <TextGenerateEffect
          words={text}
          textClassName="text-xl font-normal leading-relaxed tracking-tight text-foreground md:text-2xl"
        />
      </div>
    </motion.div>
  );
}
