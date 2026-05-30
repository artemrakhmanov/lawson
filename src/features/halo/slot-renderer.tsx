"use client";

// slot-renderer.tsx — Halo's inline fill-in-the-blank renderer (Spec 04 §3, G3).
// Parses a CONDITIONED, slot-bearing string with the P2 parse() and renders it as
// a sentence: text → prose, free → inline auto-sizing input, select → inline
// dropdown. Controlled — the parent owns `values` and gets instant onChange (no
// network; the fillSlot gesture). Greyscale states only (G3): empty reads as a
// dashed blank to fill, hover/focus thickens the underline, a filled slot reads
// at full foreground weight so the finished scaffold is a clean sentence. The
// free input auto-grows via a hidden sizer span (inline-grid) so the sentence
// reflows naturally. `readOnly` powers the cleave's static panels (G5).

import { parse } from "@/lib/services/harness/slots/encode";
import { cn } from "@/lib/utils";

function FreeSlot({
  id,
  value,
  placeholder,
  readOnly,
  onChange,
}: {
  id: string;
  value: string;
  placeholder: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    // inline-grid overlay: the sizer span and the input share one cell, so the
    // input's width tracks the rendered text (proportional fonts included).
    <span className="relative mx-1 inline-grid align-baseline">
      <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre px-1">
        {value || placeholder || " "}
      </span>
      <input
        id={id}
        name={id}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "col-start-1 row-start-1 w-full bg-transparent px-1 text-center outline-none transition-colors",
          "border-b placeholder:text-muted-foreground/40",
          value ? "border-foreground/70 text-foreground" : "border-dashed border-muted-foreground/50",
          !readOnly && "hover:border-foreground/60 focus:border-foreground",
        )}
      />
    </span>
  );
}

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
          return (
            <FreeSlot
              key={i}
              id={domId}
              value={val}
              placeholder={r.placeholder}
              readOnly={readOnly}
              onChange={(v) => onChange?.(sk, v)}
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
              "mx-1 inline cursor-pointer border-b bg-transparent align-baseline outline-none transition-colors",
              val ? "border-foreground/70 text-foreground" : "border-dashed border-muted-foreground/50 text-muted-foreground/70",
              !readOnly && "hover:border-foreground/60 focus:border-foreground",
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
