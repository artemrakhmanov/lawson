"use client";

// opening-prompt.tsx — the first screen (Spec 04 §4). A single calm, centered
// free-text box on a near-empty field with one line of warm prompting above it.
// Submit → start(seed). Dumb component: presentation + a callback, no logic.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
    <div className="measure flex w-full flex-col gap-6">
      <p className="text-center text-muted-foreground">
        Tell us, in your own words, what brings you here.
      </p>
      <Textarea
        autoFocus
        value={seed}
        onChange={(e) => setSeed(e.target.value)}
        disabled={pending}
        rows={4}
        placeholder="Start anywhere — a sentence is enough."
        className="resize-none text-base leading-relaxed"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
      />
      <div className="flex justify-center">
        <Button onClick={submit} disabled={pending || !seed.trim()}>
          Begin
        </Button>
      </div>
    </div>
  );
}
