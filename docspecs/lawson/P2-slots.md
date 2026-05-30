# P2 — Slot Encoding

> Session brief. Depends on P0. Pure TS, zero-dep, UI-free. No model calls. Parallelizable with P1.

## Goal
The one slot syntax + parser/serializer shared by scaffolds, the summary, and (later) the Spec 04 renderer. Get it exactly right — three teams depend on it.

## Files touched
- `src/lib/services/harness/slots/encode.ts` — `parse()` / `serialize()` + the regex.
- `src/lib/services/harness/slots/encode.test.ts` — unit tests.
- `package.json` + `vitest.config.ts` — add `vitest` and a `test` script (B5).

## The syntax (contracts §1.2)
```
free-text:  [[key:free:placeholder text]]
select:     [[key:select:option a|option b|option c]]
```
- `key`: `[a-z0-9_-]+`, stable within a turn.
- One regex, no nesting, no other types in v1.
- `select` options split on `|`.

## API
```ts
export type Run =
  | { kind: 'text'; text: string }
  | { kind: 'slot'; key: string; type: 'free'; placeholder: string }
  | { kind: 'slot'; key: string; type: 'select'; options: string[] };

export function parse(text: string): Run[];
export function serialize(runs: Run[]): string;   // round-trips parse()
```
Filling values into a final answer is a **caller** concern, not here.

## Tests (the point of this phase)
- Round-trip: `serialize(parse(x)) === x` for representative scaffolds (incl. the §4.1 police-stop example).
- Mixed prose + multiple slots in one string, slots adjacent to punctuation.
- Both types; `select` with 2 and 3+ options.
- Malformed/partial tokens treated as literal text (no throw).
- **Conditioning-survival probe:** a helper-level test asserting tokens are recoverable after arbitrary surrounding-prose edits — the property `emit` will enforce at runtime (contracts §2.1).

## Entry criteria
- P0 complete.

## Exit criteria
- `npm test` runs and all `encode` tests pass.
- Round-trip property holds on the example set.
- Zero deps imported beyond the standard library.

## Invariants to preserve
- (3) Slot tokens are the survival contract — the parser must be robust enough that `emit`'s regex validation has a stable target.
- (5) UI-free, framework-agnostic.

## Contract / blocker references
- Contracts: §1.2 (slot encoding).
- Blockers: **B5** (this phase adds the test runner).
