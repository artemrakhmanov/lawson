"use client";

// slot-renderer.tsx — Halo's inline fill-in-the-blank renderer (Spec 04 §3).
// Parses a CONDITIONED, slot-bearing string with the P2 parse() and renders it
// as a sentence: text → prose <span>, free → inline auto-sizing input, select →
// inline native dropdown. Controlled — the parent owns the `values` map and gets
// instant onChange (no network; the fillSlot gesture). Strictly monochrome; the
// interaction states are greyscale only. `readOnly` powers the cleave's static
// panels later (G5). The richer micro-interactions land in U2 (G3); this is the
// functional base the intake surface (U1) needs to be answerable.

import { parse } from "@/lib/services/harness/slots/encode";
import { cn } from "@/lib/utils";

export function SlotRenderer({
  text,
  values,
  onChange,
  namespace,
  readOnly,
}: {
  text: string;
  values: Record<string, string>;
  onChange?: (key: string, value: string) => void;
  // Scopes slot state so the same key in two fields doesn't collide; also keys DOM ids.
  namespace?: string;
  readOnly?: boolean;
}) {
  const stateKey = (key: string) => (namespace ? `${namespace}:${key}` : key);

  return (
    <span className="leading-loose">
      {parse(text).map((r, i) => {
        if (r.kind === "text") return <span key={i}>{r.text}</span>;
        const sk = stateKey(r.key);
        const val = values[sk] ?? "";
        const domId = `${namespace ?? "slot"}-${r.key}-${i}`;

        if (r.type === "free") {
          const ch = Math.max(val.length, r.placeholder.length, 6) + 1;
          return (
            <input
              key={i}
              id={domId}
              name={domId}
              value={val}
              placeholder={r.placeholder}
              readOnly={readOnly}
              onChange={(e) => onChange?.(sk, e.target.value)}
              style={{ width: `${ch}ch` }}
              className={cn(
                "mx-1 inline border-0 border-b bg-transparent text-center align-baseline outline-none transition-colors",
                "placeholder:text-muted-foreground/50",
                val ? "border-foreground/70 text-foreground" : "border-muted-foreground/40",
                !readOnly && "focus:border-foreground",
              )}
            />
          );
        }

        return (
          <select
            key={i}
            id={domId}
            name={domId}
            value={val}
            disabled={readOnly}
            onChange={(e) => onChange?.(sk, e.target.value)}
            className={cn(
              "mx-1 inline cursor-pointer border-0 border-b bg-transparent align-baseline outline-none transition-colors",
              val ? "border-foreground/70 text-foreground" : "border-muted-foreground/40 text-muted-foreground/60",
              !readOnly && "focus:border-foreground",
            )}
          >
            <option value="" disabled>
              choose…
            </option>
            {r.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      })}
    </span>
  );
}
