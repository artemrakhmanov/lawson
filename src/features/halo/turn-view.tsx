"use client";

// turn-view.tsx — renders one conditioned turn at a time (Spec 04 §4 / G2). The
// "pure register" body (preamble/question/framing/scaffolds/reassurance) is the
// split-ready Panel; the interaction chrome (per-scaffold submit + the freeform
// escape hatch) is the Panel's `footer`. Selecting a scaffold or typing freeform
// then submitting → answer(payload). Per-scaffold + freeform fill state is local
// and resets on each new turn. Dumb component: it renders interactor state and
// fires callbacks only.

import { useEffect, useState } from "react";
import type { ConditionedView, AnswerPayload } from "@/lib/services/harness/contracts";
import { Panel } from "./panel";
import { SlotRenderer } from "./slot-renderer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function TurnView({
  view,
  pending,
  interactive = true,
  onAnswer,
}: {
  view: ConditionedView;
  pending: boolean;
  // false when revisiting a past step — render read-only, no harness input.
  interactive?: boolean;
  onAnswer: (payload: AnswerPayload) => void;
}) {
  const locked = pending || !interactive;
  const [scaffoldFills, setScaffoldFills] = useState<Record<number, Record<string, string>>>({});
  const [freeform, setFreeform] = useState("");

  // Reset per-turn local state whenever a new turn lands.
  useEffect(() => {
    setScaffoldFills({});
    setFreeform("");
  }, [view.turnId]);

  const setScaffoldFill = (idx: number, key: string, value: string) =>
    setScaffoldFills((s) => ({ ...s, [idx]: { ...(s[idx] ?? {}), [key]: value } }));

  return (
    <Panel
      question={view.question}
      framing={view.framing}
      scaffolds={view.scaffolds}
      reassurance={view.reassurance}
      renderScaffold={(sc, idx) => (
        <div className="group flex items-center justify-between gap-4 rounded-lg border border-border/70 px-4 py-3 transition-colors hover:border-foreground/30">
          <div className="text-base">
            <SlotRenderer
              text={sc}
              values={scaffoldFills[idx] ?? {}}
              onChange={(k, v) => setScaffoldFill(idx, k, v)}
              namespace={`sc-${idx}`}
              readOnly={locked}
            />
          </div>
          {interactive && (
            <button
              type="button"
              disabled={locked}
              onClick={() => onAnswer({ kind: "scaffold", index: idx, fills: scaffoldFills[idx] ?? {} })}
              className="shrink-0 text-sm text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-0"
            >
              Use this →
            </button>
          )}
        </div>
      )}
      footer={
        interactive ? (
          <div className="flex flex-col gap-3 pt-2">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Or answer in your own words
            </label>
            <Textarea
              value={freeform}
              onChange={(e) => setFreeform(e.target.value)}
              disabled={locked}
              rows={2}
              placeholder={view.freeform.placeholder}
              className="resize-none border-0 border-b border-border bg-transparent px-0 text-base leading-relaxed shadow-none focus-visible:border-foreground focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && freeform.trim()) {
                  onAnswer({ kind: "freeform", text: freeform.trim() });
                }
              }}
            />
            <div className="flex items-center gap-4">
              <Button
                disabled={locked || !freeform.trim()}
                onClick={() => onAnswer({ kind: "freeform", text: freeform.trim() })}
              >
                Continue
              </Button>
              <span className="text-xs text-muted-foreground">⌘ + ↵</span>
            </div>
          </div>
        ) : null
      }
    />
  );
}
