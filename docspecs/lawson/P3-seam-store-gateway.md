# P3 — Voice Seam + Session Store + emit Gateway

> Session brief. Depends on P0, P1, P2. **HARD GATE: do not start until the Lawguistics workers have acked the `Lawguistics` interface (`01-contracts.md §2.1`, blocker B2).** This is the spine of the whole architecture.

## Goal
Stand up the seam, the canonical store, and the single conditioning choke point so the harness can run end-to-end on a stage-0 identity passthrough. After this phase, "condition as the final step" is provable by inspecting one file.

## Files touched
- `src/lib/services/lawguistics/index.ts` — the `Lawguistics` interface + wiring to the mock. **Shared file (B2)** — ship minimal; voice team owns thereafter.
- `src/lib/services/lawguistics/mock.ts` — stage-0 identity `condition()`.
- `src/lib/services/lawguistics/drift.ts` — `forStage = () => 0` (stage-0 ignores drift; real values are voice-owned, B3).
- `src/lib/services/session/store.ts` — canonical in-memory store.
- `src/lib/services/harness/emit.ts` — THE GATEWAY.

## Stage-0 Lawguistics (the identity passthrough)
```ts
// mock.ts
export const mock: Lawguistics = {
  condition: async (text) => ({ conditioned: text, baseline: text }),
  drift: { forStage: () => 0 },
};
```
No model call, tokens trivially preserved. At stage-0, baseline == conditioned **and that is correct** — it proves the plumbing. The voice team replaces `mock.ts` internals (stage 1 → real) behind the same `index.ts` interface with zero harness changes.

## Session store (contracts §1.12)
Module-singleton `Map<sessionId, SessionRecord>`. Holds **both** registers per field per turn. `create`/`get`/`putCaseState`/`putTurn`.

## The emit gateway (contracts §1.11) — the invariant
```ts
export async function emit(sessionId, raw: RawTurn | RawSummary) {
  const rec = store.get(sessionId)!;
  const target = { lawyerId: rec.caseState.lawyerMatch.lawyerId };  // §2.2
  const drift = Lawguistics.drift.forStage(raw.stage);
  const fields = registerBearingFields(raw);          // walk known fields only
  const out = {}, stored = {};
  for (const [name, text] of fields) {
    const { conditioned, baseline } = await Lawguistics.condition(text, target, drift);
    assertSlotsPreserved(text, conditioned, baseline);  // regex check → throw/fallback
    out[name] = conditioned;
    stored[name] = { conditioned, baseline };
  }
  store.putTurn(sessionId, { turnId, stage: raw.stage, fields: stored });
  return assembleConditionedView(raw, out);            // conditioned only
}
```
Properties that make it an invariant:
- **Only `emit` calls `Lawguistics.condition`** (grep-provable). Only `Lawson` will call `emit` (P6).
- **Field-aware** — walks known register-bearing fields; leaves non-text (e.g. `freeform.placeholder`? treat per contract) handled explicitly.
- **Both registers always produced and persisted now**, during intake.
- **Slot-preservation check** — compare slot-token multiset of input vs. each output (reuse P2 `parse`); on violation, fall back to `baseline` for that field and log. (Stage-0 never trips this.)

## Entry criteria
- P0, P1, P2 complete.
- **B2 ack received** — Lawguistics workers confirmed the §2.1 interface signature.

## Exit criteria
- A unit/integration test feeds a hand-built `RawTurn` and `RawSummary` through `emit` on the stage-0 mock and asserts: conditioned == baseline, both stored, slot tokens intact, conditioned view shape matches contracts §1.8.
- Grep confirms `emit.ts` is the only caller of `Lawguistics.condition`.
- Store holds the `{conditioned, baseline}` pair for every field of the emitted units.

## Invariants to preserve
- (1) `emit` is the sole `Lawguistics.condition` caller. (2) Both registers persisted during intake. (3) Slot tokens validated. (4) Substance register-invariant. (5) Conditioning only behind `Lawguistics`.

## Contract / blocker references
- Contracts: §1.8, §1.11, §1.12, §2.1, §2.2.
- Blockers: **B2** (gate), **B3** (drift = 0 stub), **B4** (target from lawyerId).
