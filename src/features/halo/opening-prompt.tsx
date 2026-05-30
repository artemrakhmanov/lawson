"use client";

// opening-prompt.tsx — the first screen (Spec 04 §4), Typeform-style: a large
// animated title over a single large borderless input on a near-empty field — no
// message bubble, no card. Submit → start(seed). Dumb component.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextGenerateEffect } from "@/components/custom/text-generate-effect";
import { Stagger, Item } from "./reveal";

export function OpeningPrompt({
  onStart,
  pending,
}: {
  onStart: (seed: string) => void;
  pending: boolean;
}) {
  const [seed, setSeed] = useState("");

  const submit = () => {
    if (seed.trim()) onStart(seed.trim());
  };

  return (
    <div className="measure flex w-full flex-col gap-10">
      <TextGenerateEffect
        words="How can Lawhive help you?"
        textClassName="text-3xl font-medium leading-tight tracking-tight text-foreground md:text-4xl"
      />

      <Stagger className="flex flex-col gap-6">
        <Item>
          <textarea
            autoFocus
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            disabled={pending}
            rows={2}
            placeholder="Start anywhere — a sentence is enough."
            className="w-full resize-none border-0 border-b border-border bg-transparent pb-3 text-xl leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-foreground"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
          />
        </Item>
        <Item className="flex items-center gap-4">
          <Button onClick={submit} disabled={pending || !seed.trim()}>
            Begin
          </Button>
          <span className="text-xs text-muted-foreground">⌘ + ↵</span>
        </Item>
      </Stagger>
    </div>
  );
}
