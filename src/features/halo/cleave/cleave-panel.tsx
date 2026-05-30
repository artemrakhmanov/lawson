"use client";

// cleave-panel.tsx — one register of a stored turn, rendered read-only and
// STATIC (no title generation, no stagger) so both halves arrive settled and
// diff cleanly. Identical typography to the intake Panel — the only difference
// between the two cleave panels is the language (monochrome law). Reads stored
// registers only; nothing generates here.

import type { StoredTurn } from "@/lib/services/session/store";
import { SlotRenderer } from "../slot-renderer";

type Register = "baseline" | "conditioned";

const SUMMARY_FIELDS = [
  ["Key facts", "keyFacts"],
  ["Parties", "parties"],
  ["The ask", "theAsk"],
] as const;

export function CleavePanel({ turn, register }: { turn: StoredTurn; register: Register }) {
  const f = (key: string) => turn.fields[key]?.[register] ?? "";

  if (turn.stage === "summary") {
    return (
      <div className="flex flex-col gap-6">
        {SUMMARY_FIELDS.map(([label, key]) => (
          <div key={key} className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
            <div className="text-base">
              <SlotRenderer text={f(key)} values={{}} readOnly />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const scaffoldKeys = Object.keys(turn.fields)
    .filter((k) => k.startsWith("scaffold."))
    .sort((a, b) => Number(a.slice(9)) - Number(b.slice(9)));

  const preamble = f("preamble");
  const framing = f("framing");
  const reassurance = f("reassurance");

  return (
    <div className="flex flex-col gap-6">
      {preamble && <p className="text-sm leading-relaxed text-muted-foreground">{preamble}</p>}

      <h2 className="text-xl font-medium leading-snug tracking-tight text-foreground md:text-2xl">
        {f("question")}
      </h2>

      {framing && <p className="text-sm leading-relaxed text-muted-foreground">{framing}</p>}

      {scaffoldKeys.length > 0 && (
        <div className="flex flex-col gap-3">
          {scaffoldKeys.map((k) => (
            <div key={k} className="rounded-lg border border-border/70 px-4 py-3 text-base">
              <SlotRenderer text={f(k)} values={{}} readOnly />
            </div>
          ))}
        </div>
      )}

      {reassurance && <p className="text-xs italic leading-relaxed text-muted-foreground">{reassurance}</p>}
    </div>
  );
}
