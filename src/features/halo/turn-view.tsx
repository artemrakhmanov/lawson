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
  onAnswer,
}: {
  view: ConditionedView;
  pending: boolean;
  onAnswer: (payload: AnswerPayload) => void;
}) {
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
      preamble={view.preamble}
      question={view.question}
      framing={view.framing}
      scaffolds={view.scaffolds}
      reassurance={view.reassurance}
      renderScaffold={(sc, idx) => (
        <div className="group flex flex-col gap-3">
          <div className="text-lg">
            <SlotRenderer
              text={sc}
              values={scaffoldFills[idx] ?? {}}
              onChange={(k, v) => setScaffoldFill(idx, k, v)}
              namespace={`sc-${idx}`}
            />
          </div>
          <div>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => onAnswer({ kind: "scaffold", index: idx, fills: scaffoldFills[idx] ?? {} })}
            >
              Use this
            </Button>
          </div>
        </div>
      )}
      footer={
        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <label className="text-sm text-muted-foreground">{view.freeform.placeholder}</label>
          <Textarea
            value={freeform}
            onChange={(e) => setFreeform(e.target.value)}
            disabled={pending}
            rows={2}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && freeform.trim()) {
                onAnswer({ kind: "freeform", text: freeform.trim() });
              }
            }}
          />
          <div>
            <Button
              disabled={pending || !freeform.trim()}
              onClick={() => onAnswer({ kind: "freeform", text: freeform.trim() })}
            >
              Continue
            </Button>
          </div>
        </div>
      }
    />
  );
}
