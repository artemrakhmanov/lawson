"use client";
import { useEffect } from "react";
import { motion, stagger, useAnimate } from "framer-motion";
import { cn } from "@/lib/utils";

export const TextGenerateEffect = ({
  words,
  className,
  textClassName,
  filter = true,
  duration = 0.5,
  staggerOverride
}: {
  words: string;
  className?: string;
  textClassName?: string;
  filter?: boolean;
  duration?: number;
  staggerOverride?: number;
}) => {
  const [scope, animate] = useAnimate();
  const wordsArray = words.split(" ");
  // Re-run the reveal whenever the text changes — keying on `scope.current`
  // alone never re-fires (the ref node is stable), so a reused instance with a
  // new `words` prop would render its spans stuck at opacity-0.
  useEffect(() => {
    animate(
      "span",
      {
        opacity: 1,
        filter: filter ? "blur(0px)" : "none",
      },
      {
        duration: duration ? duration : 1,
        delay: stagger(staggerOverride ? staggerOverride : 0.01),
      }
    );
  }, [words, animate, filter, duration, staggerOverride]);

  const renderWords = () => {
    return (
      <motion.div ref={scope}>
        {wordsArray.map((word, idx) => {
          return (
            <motion.span
              key={word + idx}
              className={cn("dark:text-white text-black opacity-0", textClassName)}
              style={{
                filter: filter ? "blur(10px)" : "none",
              }}
            >
              {word}{" "}
            </motion.span>
          );
        })}
      </motion.div>
    );
  };

  return (
    <div className={cn(className)}>
      <div className="">
        <div className={cn(" dark:text-white text-black text-2xl leading-snug tracking-wide", textClassName)}>
          {renderWords()}   
        </div>
      </div>
    </div>
  );
};
