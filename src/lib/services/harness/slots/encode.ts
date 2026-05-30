// harness/slots/encode.ts — the ONE slot syntax + parser/serializer, shared by
// scaffolds, the summary, and (later) the Spec 04 renderer (contracts §1.2).
// Pure, zero-dep, UI-free. Filling values into a final answer is a CALLER
// concern (interactor/tester), never here.
//
// Syntax (v1 — no nesting, no other types):
//   free-text:  [[key:free:placeholder text]]
//   select:     [[key:select:option a|option b|option c]]
//   - key: [a-z0-9_-]+, stable within a turn.
//   - select options split on '|'.
//
// Invariant (3): these tokens are the survival contract. `emit` revalidates the
// same shape at runtime and falls back to baseline if conditioning mangles a
// token — so this parser must be robust and its serialize the exact inverse.

export type Run =
  | { kind: "text"; text: string }
  | { kind: "slot"; key: string; type: "free"; placeholder: string }
  | { kind: "slot"; key: string; type: "select"; options: string[] };

// One regex. key is lowercase-strict; the body is non-greedy up to the first
// `]]`, so anything malformed (uppercase key, unknown type, single bracket,
// missing `]]`) simply never matches and survives as literal text — no throw.
const SLOT_RE = /\[\[([a-z0-9_-]+):(free|select):(.*?)\]\]/g;

export function parse(text: string): Run[] {
  const runs: Run[] = [];
  let last = 0;
  SLOT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SLOT_RE.exec(text)) !== null) {
    if (m.index > last) runs.push({ kind: "text", text: text.slice(last, m.index) });
    const key = m[1];
    const body = m[3];
    if (m[2] === "select") {
      runs.push({ kind: "slot", key, type: "select", options: body.split("|") });
    } else {
      runs.push({ kind: "slot", key, type: "free", placeholder: body });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({ kind: "text", text: text.slice(last) });
  return runs;
}

export function serialize(runs: Run[]): string {
  return runs
    .map((r) => {
      if (r.kind === "text") return r.text;
      if (r.type === "free") return `[[${r.key}:free:${r.placeholder}]]`;
      return `[[${r.key}:select:${r.options.join("|")}]]`;
    })
    .join("");
}

/** The slot tokens in a string, each re-serialized — the unit `emit` must keep
 *  byte-identical through conditioning. Handy for the survival check. */
export function slotTokens(text: string): string[] {
  return parse(text)
    .filter((r): r is Extract<Run, { kind: "slot" }> => r.kind === "slot")
    .map((r) => serialize([r]));
}
