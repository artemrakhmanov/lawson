# Lawson Harness — Seams & Blockers (cross-team register)

> **Purpose:** every place the harness touches another team's lane, or depends on something not yet built. Each entry has an **owner**, a **status**, and the **unblock stub** the harness ships so it can proceed without waiting. Hand this doc to the Lawguistics workers; B2 is the gate.
>
> Two parallel efforts: **this** (the agent harness + non-voice plumbing) and the **Lawguistics module** (voice: conditioning, metrics, signatures, reveal stats). The Spec 04 UX worker is a later, third lane.

## Lane map (who owns what)

| Area | Owner | Notes |
|---|---|---|
| `src/lib/services/harness/**` | **Harness (me)** | loop, triage, agents, slots, emit |
| `src/lib/services/ai/client.ts` | **Harness (me)** | sole AI SDK importer |
| `src/lib/services/session/store.ts` | **Harness (me)** | canonical state |
| `src/app/api/**` route handlers | **Harness (me)** | 1:1 with Lawson methods |
| `features/harness-tester/**` (or `/dev`) | **Harness (me)** | throwaway MVP tester — NOT Spec 04 Halo |
| `src/lib/services/lawguistics/**` | **Shared → Lawguistics** | harness ships stage-0 stub; voice team owns thereafter |
| `src/lib/services/signatures/**`, `firm.json` | **Lawguistics** | metrics, VoiceSignature, roster generation |
| `features/halo/**`, slot-renderer, cleave | **Spec 04 UX** | harness must not pre-empt |

---

## Blockers

### B1 — Roster / `firm.json`
- **Owner of the real artifact:** Lawguistics (`scripts/generate-firm.ts` → `services/signatures/data/firm.json`, Spec 03).
- **Why it blocks the harness:** Triage matching and `emit` target resolution both read the roster (`Lawyer`/`Roster`, contracts §1.3).
- **Status:** unblocked by stub.
- **Unblock stub:** harness ships a tiny hardcoded roster behind the frozen `Lawyer` shape — one lawyer per specialist area (criminal / real-estate / commercial), each with **distinguishable `summary` prose** so matching is genuinely exercised (not just structurally present) in P8. Exactly one marked `hero: true` (Criminal — the boldest voice per demo.md). Swap point: replace the stub import with `firm.json` when delivered; the shape does not change.

### B2 — `Lawguistics` interface ownership — **TOP coordination item, hard gate**
- **Owner of the seam files:** shared (`lawguistics/index.ts`, `mock.ts`, `drift.ts`).
- **Why it blocks:** `emit` (P3) calls `Lawguistics.condition(text, target, drift)` and `drift.forStage(stage)`. I can't unilaterally freeze a shared contract while the Lawguistics plan is still in flight.
- **Status:** **PROPOSED — awaiting ack.** This is the entry gate for P3 *and* for the Lawguistics mock build.
- **Unblock stub:** harness ships the interface (contracts §2.1) + a stage-0 identity `condition()` + `drift.forStage = () => 0`. Lawguistics swaps real internals behind the same interface (stage 1 → real), harness untouched.
- **Surface now, on paper:** any disagreement on the `condition` signature, or on `target` being a `{ lawyerId }` vs. a pre-resolved `VoiceSignature`. Internal consistency review cannot catch a divergent counter-plan — only the ack can.

### B3 — `Stage` enum vs. drift values
- **Owner:** split. `Stage` labels (`opening|q1|q2|q3|summary`) = **harness-frozen** (contracts §1.1) since agents tag and `emit` reads them. The per-stage **drift values** (`{opening:0.15,…,summary:1.0}`) = **Lawguistics-owned** voice tuning.
- **Status:** labels frozen; values owned downstream.
- **Unblock stub:** `drift.forStage = () => 0` for stage-0 (identity ignores drift). No real schedule authored by the harness.

### B4 — `VoiceSignature` / `target` shape
- **Owner:** Lawguistics.
- **Why low-risk:** `emit` only needs `caseState.lawyerMatch.lawyerId → target` to be resolvable, and stage-0 ignores `target` entirely. Real resolution to a signature is internal to `condition`.
- **Status:** flagged for stage-1 handoff; not blocking. Harness does not author this shape.

### B5 — No test runner configured
- **Owner:** Harness (me).
- **Why it matters:** `slots/encode.ts` (and later the Lawguistics metric core) are spec-designated unit-testable, but no `test` script exists (CLAUDE.md §Commands).
- **Status:** decision defaultable.
- **Default:** add `vitest` + a `test` script during P2, scoped to pure-TS modules. Low risk; revisit if the team standardizes on something else.

### B6 — MVP tester vs. Spec 04 Halo
- **Owner:** Harness (me) for the tester; Spec 04 UX worker for Halo.
- **Why it matters:** the throwaway tester must not collide with `features/halo/` or pre-empt the canonical `slot-renderer.tsx`.
- **Status:** unblocked by namespacing.
- **Unblock:** tester lives under `features/harness-tester/` (or a `/dev` route). Its slot rendering is minimal throwaway inline-fill, explicitly **not** the canonical renderer. Delete-able without touching Halo.

### B7 — Modified Next.js (16.2.6 / React 19.2.4)
- **Owner:** Harness (me).
- **Why it matters:** AGENTS.md is binding — this Next.js has breaking changes vs. training data; the Route Handler API may differ.
- **Status:** mitigation baked into P1/P7.
- **Unblock:** read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` (and `06-fetching-data.md` / `07-mutating-data.md`) before writing any server code. Heed deprecation notices.

---

## Handshake checklist (before any harness code)

1. Lawguistics workers **ack contracts §2.1** (the `Lawguistics` interface signature) — gate for P3.
2. Agree the `Stage` labels are fine as the shared tag (B3).
3. Confirm Lawguistics owns `firm.json`, the drift values, and `VoiceSignature`; harness owns only the stage-0 stubs in `lawguistics/`.
4. Confirm the Spec 04 worker is fine with `features/harness-tester/` as a throwaway lane (B6).
