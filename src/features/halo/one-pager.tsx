"use client";

// one-pager.tsx — the conditioned summary, the last (highest-drift) screen
// before the cleave (Spec 04 §4). Rendered through the SAME slot-renderer as the
// scaffolds, so inline fills behave identically (instant, local). The explicit
// Refresh is the ONLY thing that hits the model here — the single deliberate
// "model beat"; never auto-refresh on keystroke. Dumb component.

import type { ConditionedSummary } from "@/lib/services/harness/contracts";
import { SlotRenderer } from "./slot-renderer";
import { Button } from "@/components/ui/button";

const FIELDS = [
  { key: "keyFacts", label: "Key facts" },
  { key: "parties", label: "Parties" },
  { key: "theAsk", label: "The ask" },
] as const;

export function OnePager({
  summary,
  fills,
  pending,
  onFillSlot,
  onRefresh,
}: {
  summary: ConditionedSummary;
  fills: Record<string, string>;
  pending: boolean;
  onFillSlot: (key: string, value: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="measure flex w-full flex-col gap-8">
      <header className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Your matter</span>
        <h2 className="text-2xl font-medium tracking-tight md:text-3xl">{summary.matterType}</h2>
      </header>

      <dl className="flex flex-col gap-6">
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-2">
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
            <dd className="text-lg">
              <SlotRenderer text={summary[key]} values={fills} onChange={onFillSlot} namespace={key} />
            </dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-border pt-6">
        <Button variant="ghost" size="sm" disabled={pending} onClick={onRefresh}>
          Refresh this summary
        </Button>
      </div>
    </div>
  );
}
