"use client";

// tester.tsx — THROWAWAY harness tester (dumb component). Presentation only:
// renders interactor state, fires callbacks, no fetch/logic. Exercises the full
// harness through the interactor — seed → adaptive turns (one at a time) →
// summary with explicit refresh. NOT Spec 04's Halo; deletable without touching
// features/halo/. Strictly monochrome.

import { useEffect, useState } from "react";
import { useTesterInteractor } from "./tester.interactor";
import { SlotFill } from "./slot-fill";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Tester() {
  const { state, actions } = useTesterInteractor();
  const { current, fills, pending, done, error } = state;

  const [seed, setSeed] = useState("I got pulled over and arrested for DUI last night, I'm scared.");
  const [freeform, setFreeform] = useState("");
  // per-scaffold local fills, reset on each new turn
  const [scaffoldFills, setScaffoldFills] = useState<Record<number, Record<string, string>>>({});

  const turnKey = current?.turnId;
  useEffect(() => {
    setScaffoldFills({});
    setFreeform("");
  }, [turnKey]);

  const setScaffoldFill = (idx: number, key: string, value: string) =>
    setScaffoldFills((s) => ({ ...s, [idx]: { ...(s[idx] ?? {}), [key]: value } }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="flex items-baseline justify-between border-b border-border pb-4">
        <h1 className="text-xl font-semibold tracking-tight">Harness Tester</h1>
        <span className="text-xs text-muted-foreground">stage-0 identity · baseline == conditioned</span>
      </header>

      {/* seed */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-muted-foreground">Seed</label>
        <Textarea value={seed} onChange={(e) => setSeed(e.target.value)} rows={2} disabled={pending} />
        <div>
          <Button onClick={() => actions.start(seed)} disabled={pending || !seed.trim()}>
            {current ? "Restart" : "Start intake"}
          </Button>
        </div>
      </div>

      {pending && <p className="animate-pulse text-sm text-muted-foreground">thinking…</p>}
      {error && (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground">{error}</p>
      )}

      {/* turn */}
      {current?.kind === "turn" && (
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Badge variant="outline">{current.agentId}</Badge>
            <Badge variant="secondary">{current.stage}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {current.preamble && <p className="text-muted-foreground">{current.preamble}</p>}
            <p className="text-lg font-medium">{current.question}</p>
            {current.framing && <p className="text-sm text-muted-foreground">{current.framing}</p>}

            <div className="flex flex-col gap-3">
              {current.scaffolds.map((sc, idx) => (
                <div key={idx} className="rounded-md border border-border p-3">
                  <SlotFill
                    text={sc}
                    values={scaffoldFills[idx] ?? {}}
                    onChange={(k, v) => setScaffoldFill(idx, k, v)}
                  />
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => actions.answer({ kind: "scaffold", index: idx, fills: scaffoldFills[idx] ?? {} })}
                    >
                      Use this
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <label className="text-sm text-muted-foreground">{current.freeform.placeholder}</label>
              <Input
                value={freeform}
                onChange={(e) => setFreeform(e.target.value)}
                disabled={pending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && freeform.trim()) actions.answer({ kind: "freeform", text: freeform });
                }}
              />
              <div>
                <Button
                  disabled={pending || !freeform.trim()}
                  onClick={() => actions.answer({ kind: "freeform", text: freeform })}
                >
                  Send
                </Button>
              </div>
            </div>

            {current.reassurance && (
              <p className="text-sm italic text-muted-foreground">{current.reassurance}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* summary */}
      {current?.kind === "summary" && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{current.matterType}</CardTitle>
            {done && <Badge variant="outline">complete</Badge>}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {(["keyFacts", "parties", "theAsk"] as const).map((field) => (
              <div key={field} className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{field}</span>
                <SlotFill text={current[field]} values={fills} onChange={actions.fillSlot} />
              </div>
            ))}
            <div className="border-t border-border pt-3">
              <Button variant="outline" disabled={pending} onClick={() => actions.refreshSummary()}>
                Refresh one-pager
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
