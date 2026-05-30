"use client";

// slot-fill.tsx — THROWAWAY inline-fill rendering for the harness tester. NOT
// Spec 04's canonical slot-renderer (features/halo/). Parses a slot-bearing
// string with P2 parse() and renders free → inline input, select → inline
// dropdown, using shadcn primitives. Controlled: the parent owns the values
// map. Strictly monochrome.

import { parse } from "@/lib/services/harness/slots/encode";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export function SlotFill({
  text,
  values,
  onChange,
}: {
  text: string;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <span className="leading-10">
      {parse(text).map((r, i) => {
        if (r.kind === "text") return <span key={i}>{r.text}</span>;
        if (r.type === "free") {
          return (
            <Input
              key={i}
              value={values[r.key] ?? ""}
              placeholder={r.placeholder}
              onChange={(e) => onChange(r.key, e.target.value)}
              className="mx-1 inline-flex h-7 w-auto min-w-28 align-baseline"
            />
          );
        }
        return (
          <Select key={i} value={values[r.key] || undefined} onValueChange={(v) => onChange(r.key, v)}>
            <SelectTrigger className="mx-1 inline-flex h-7 w-auto align-baseline">
              <SelectValue placeholder="choose…" />
            </SelectTrigger>
            <SelectContent>
              {r.options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })}
    </span>
  );
}
