"use client";

// annotation-circle.tsx — a hand-drawn pencil circle that draws itself around its
// children (the "Sequoia"/marker-annotation look). A rough, slightly-overshooting
// ellipse path, roughened by an feTurbulence displacement filter and animated on
// via framer-motion's pathLength. Monochrome (stroke = currentColor). Wrap any
// inline element to circle it.

import { useId, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// A loose, hand-drawn loop that overshoots its start — reads as a sketched circle
// rather than a perfect ellipse. Stretched to the wrapped box (preserveAspectRatio
// none), so the same path frames words of any width.
const SKETCH =
  "M 36 40 C 16 24, 64 9, 104 9 C 168 9, 192 24, 178 38 C 162 53, 96 56, 54 50 C 20 45, 12 28, 42 19";

export function AnnotationCircle({
  children,
  delay = 0,
  duration = 0.9,
  className,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const filterId = `rough-${id}`;

  return (
    <div className={cn("relative inline-block", className)}>
      {children}
      <svg
        aria-hidden
        viewBox="0 0 200 60"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -left-5 -top-2.5 h-[calc(100%+1.25rem)] w-[calc(100%+2.5rem)] overflow-visible text-foreground"
      >
        <defs>
          <filter id={filterId}>
            <feTurbulence type="turbulence" baseFrequency="0.018" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" />
          </filter>
        </defs>
        <motion.path
          d={SKETCH}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${filterId})`}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration, delay, ease: "easeInOut" },
            opacity: { duration: 0.15, delay },
          }}
        />
      </svg>
    </div>
  );
}
