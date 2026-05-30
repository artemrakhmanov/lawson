"use client";

// count-up.tsx — animates an integer from 0 to `to` (framer-motion's animate()).

import { useEffect, useState } from "react";
import { animate } from "framer-motion";

export function CountUp({
  to,
  delay = 0,
  duration = 1.4,
}: {
  to: number;
  delay?: number;
  duration?: number;
}) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const controls = animate(0, to, {
      duration,
      delay,
      ease: "easeOut",
      onUpdate: (v) => setN(v),
    });
    return () => controls.stop();
  }, [to, delay, duration]);

  return <>{Math.round(n)}</>;
}
