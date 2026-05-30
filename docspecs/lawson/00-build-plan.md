# Lawson Harness — Build Plan (index)

> **What this is.** The waterfall decomposition of **Spec 01 (Agent Harness)** plus the harness-architecture half of **Spec 02** into nine self-contained Claude Code build sessions. Each phase below has its own file (`P0…P8`) that a session can pick up standalone. Read alongside:
> - **`01-contracts.md`** — the frozen type/interface surface every phase builds to.
> - **`02-seams-and-blockers.md`** — the cross-team dependency register (Lawguistics + Spec 04 UX).
>
> **Lane.** Harness home is `src/lib/services/harness/` (`@/*` → `src/`). The empty placeholder `src/lib/services/lawson/` is dropped in P0. Voice (Lawguistics) and Halo UX (Spec 04) are other teams' lanes — see the lane map in `02`.

## Guiding strategy

Build the **pipes before the water** (Spec 02): the whole harness runs end-to-end on a **stage-0 identity passthrough** behind the `Lawguistics` seam *before any real voice exists*. At stage-0, baseline == conditioned and that is *correct* — it proves every output flows through the one `emit` gateway, both registers are stored, slots parse, and the UI renders. The Lawguistics team later swaps real conditioning behind the same interface with **zero harness changes**.

## The hard gate

**P3 cannot start until Lawguistics Stage 0 (master-order row A2) has landed** — it ships `lawguistics/index.ts`/`types.ts`, the acked B2 interface (resolved in [`../00-master-order.md`](../00-master-order.md), **R1/R2**). Everything before P3 is interface-independent and can proceed immediately. Per **R2** the harness no longer ships any `lawguistics/**` file — the voice lane owns the whole dir, including the stage-0 identity.

## Phase ladder & dependencies

```
P0 Foundations ─┬─> P1 AI client ──────────┐
                ├─> P2 Slots (pure TS) ─────┤
                └─> (contracts as TS stubs) │
                                            ▼
                   [A2: Lawguistics Stage 0] ──> P3 Store + Gateway
                                            │
                                            ▼
                                         P4 Triage ──> P5 Bench ──> P6 Loop (Lawson)
                                                                      │
                                                                      ▼
                                                              P7 Routes + Interactor
                                                                      │
                                                                      ▼
                                                          P8 MVP Tester + e2e verify
```

| Phase | File | One line | Depends on |
|---|---|---|---|
| P0 | `P0-foundations.md` | Install deps, scaffold dirs, `config.ts`, contract type stubs | — |
| P1 | `P1-ai-client.md` | `ai/client.ts` (sole SDK importer) + prompt registry | P0 |
| P2 | `P2-slots.md` | `slots/encode.ts` typed slots + `parse`/`serialize` (+ tests) | P0 |
| P3 | `P3-seam-store-gateway.md` | `session/store.ts` + `emit.ts` gateway (consumes A2's `Lawguistics`; no `lawguistics/**` files, R2) | P0, P1, P2, **A2** |
| P4 | `P4-triage.md` | `triage.ts` bootstrap/select/recalibrate/composeSummary + matching | P1, P3 |
| P5 | `P5-bench.md` | Five `composeTurn` agent modules | P1, P3 |
| P6 | `P6-loop.md` | `loop.ts` (`Lawson`) — holds caseState, sole `emit` caller | P3, P4, P5 |
| P7 | `P7-routes-interactor.md` | Route handlers + interactor surface | P6, **B7** |
| P8 | `P8-mvp-tester.md` | Throwaway monochrome tester + end-to-end verification | P7 |

## Invariants every phase must preserve (carried from Spec 00 / 02 / 04)

1. `Lawson` is the **only** caller of `emit`; `emit` is the **only** caller of `Lawguistics.condition`. One provable choke point.
2. Everything renderable returns **both** registers and is persisted during intake — **never generate at cleave time**.
3. Slot tokens survive conditioning — `emit` validates, falls back to baseline on violation.
4. Substance is register-invariant — tone differs, facts don't.
5. Dumb-component / interactor split; `services/` is UI-free; provider only behind `services/ai`, conditioning only behind `Lawguistics`.
6. Strict monochrome — no colour unless a spec names one.

Each phase file restates the subset of these it is responsible for under **Invariants to preserve**.
