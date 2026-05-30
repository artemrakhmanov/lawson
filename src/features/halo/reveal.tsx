"use client";

// reveal.tsx — the "simple opacity reveal with staggered items" used for
// everything that isn't a title (titles use TextGenerateEffect). Wrap a group in
// <Stagger> and each block in <Item>; children fade + rise in sequence. Quiet and
// fast — supporting motion, not decoration.

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const itemV: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

export function Item({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={itemV} className={className}>
      {children}
    </motion.div>
  );
}
