# P3 — Voice Seam + Session Store + emit Gateway

> Session brief. Depends on P0, P1, P2. **HARD GATE: do not start until Lawguistics Stage 0 (build row A2) has landed** — it ships `lawguistics/index.ts`/`types.ts` (the acked B2 interface). This is the spine of the whole architecture.
>
> **R1/R2/R5 resolved here — see [`../00-master-order.md`](../00-master-order.md) (authoritative).** Per **R2** the harness does **not** create or own `lawguistics/**`; A2 already shipped the identity `condition`. This phase is **`store.ts` + `emit.ts` only**.

## Goal
Stand up the canonical store and the single conditioning choke point so the harness can run end-to-end on the stage-0 identity passthrough (shipped by A2). After this phase, "condition as the final step" is provable by inspecting one file.

## Files touched
- `src/lib/services/session/store.ts` — canonical in-memory store.
- `src/lib/services/harness/emit.ts` — THE GATEWAY.

> **Not touched (R2):** `lawguistics/index.ts`, `lawguistics/mock.ts` (no such file in the voice layout), `lawguistics/drift.ts`. The voice lane owns all of `lawguistics/**` and shipped the stage-0 identity in A2. The harness only *imports* `{ Lawguistics }` from it.

## Stage-0 Lawguistics (the identity passthrough — shipped by A2, **not** this phase)
At stage-0, `Lawguistics.condition` returns `{ conditioned: text, baseline: text }`, `drift.forStage` returns `0`, and `matchTarget`/`getSignature` return a frozen neutral signature (R3). No model call, tokens trivially preserved. baseline == conditioned **and that is correct** — it proves the plumbing. The voice lane swaps real internals (Phase D) behind the same interface with zero harness changes.

## Session store (contracts §1.12)
Module-singleton `Map<sessionId, SessionRecord>`. Holds **both** registers per field per turn. `create`/`get`/`putCaseState`/`putTurn`.

## The emit gateway (contracts §1.11) — the invariant
```ts
export async function emit(sessionId, raw: RawTurn | RawSummary) {
  const rec = store.get(sessionId)!;
  const target = Lawguistics.matchTarget(rec.caseState.lawyerMatch.lawyerId);  // R1 — resolve to VoiceSignature
  const drift = Lawguistics.drift.forStage(raw.stage);
  const fields = registerBearingFields(raw);          // walk known fields only
  const out = {}, stored = {};
  for (const [name, text] of fields) {
    const { conditioned, baseline } = await Lawguistics.condition(text, target, drift);  // origin omitted → ROSTER_MEDIAN
    assertSlotsPreserved(text, conditioned, baseline);  // regex check → throw/fallback
    out[name] = conditioned;
    stored[name] = { conditioned, baseline };
  }
  // R5 — once Lawguistics is real (Phase D), compute & persist per-turn reveal stats; skip at stage-0.
  const stats = computeStatsIfReal(out, target);      // measure→convergence/lsm vs target.metrics; undefined at stage-0
  store.putTurn(sessionId, { turnId, stage: raw.stage, fields: stored, stats });
  return assembleConditionedView(raw, out);            // conditioned only
}
```
> **R1:** `target` is the resolved `VoiceSignature` (via `matchTarget`), not `{ lawyerId }`. At stage-0 `matchTarget` returns the neutral stub and `condition` identity-passes (R3), so this compiles and runs before real voice exists.
> **R5:** `stats` stays `undefined` at stage-0 (no `measure`/`convergence` yet, panels identical by design). When Phase D lands real Lawguistics, `computeStatsIfReal` populates `{ convergence, lsm }` on the `StoredTurn` — still **during intake**, honoring "never generate at cleave time."
Properties that make it an invariant:
- **Only `emit` calls `Lawguistics.condition`** (grep-provable). Only `Lawson` will call `emit` (P6).
- **Field-aware** — walks known register-bearing fields; leaves non-text (e.g. `freeform.placeholder`? treat per contract) handled explicitly.
- **Both registers always produced and persisted now**, during intake.
- **Slot-preservation check** — compare slot-token multiset of input vs. each output (reuse P2 `parse`); on violation, fall back to `baseline` for that field and log. (Stage-0 never trips this.)

## Entry criteria
- P0, P1, P2 complete.
- **A2 (Lawguistics Stage 0) landed** — `lawguistics/index.ts`/`types.ts` present with the runnable identity stubs (R3). This *is* the B2 ack.

## Exit criteria
- A unit/integration test feeds a hand-built `RawTurn` and `RawSummary` through `emit` on the stage-0 mock and asserts: conditioned == baseline, both stored, slot tokens intact, conditioned view shape matches contracts §1.8.
- Grep confirms `emit.ts` is the only caller of `Lawguistics.condition`.
- Store holds the `{conditioned, baseline}` pair for every field of the emitted units.

## Invariants to preserve
- (1) `emit` is the sole `Lawguistics.condition` caller. (2) Both registers persisted during intake. (3) Slot tokens validated. (4) Substance register-invariant. (5) Conditioning only behind `Lawguistics`.

## Contract / blocker references
- Contracts: §1.8, §1.11, §1.12, §2.1, §2.2.
- Resolutions: **R1** (target = VoiceSignature via `matchTarget`), **R2** (voice lane owns `lawguistics/**`), **R5** (stats persisted by emit in Phase D).
- Blockers: **B2** (gate — satisfied by A2), **B3** (drift = 0 stub), **B4** (resolved by R1).
