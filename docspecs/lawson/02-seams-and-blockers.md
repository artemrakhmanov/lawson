# Lawson Harness — Seams & Blockers (cross-team register)

> **Purpose:** every place the harness touches another team's lane, or depends on something not yet built. Each entry has an **owner**, a **status**, and the **unblock stub** the harness ships so it can proceed without waiting. Hand this doc to the Lawguistics workers; B2 is the gate.
>
> **Resolution:** B2 and B4 are now **resolved** — see [`../00-master-order.md`](../00-master-order.md) (R1–R7), authoritative where this doc differs.
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
| `src/lib/services/lawguistics/**` | **Lawguistics** (R2) | voice lane ships the whole dir incl. stage-0 identity as build row A2; harness only *imports* `{ Lawguistics }`, never edits |
| `firm.json` / signatures (inside `lawguistics/`) | **Lawguistics** | metrics, VoiceSignature, roster generation (consolidated under `lawguistics/`, not a separate `signatures/` dir) |
| `features/halo/**`, slot-renderer, cleave | **Spec 04 UX** | harness must not pre-empt |

---

## Blockers

### B1 — Roster / `firm.json`
- **Owner of the real artifact:** Lawguistics (`scripts/generate-firm.ts` → `lawguistics/data/firm.json`; consolidated under `lawguistics/`, not a separate `signatures/` dir — R4).
- **Why it blocks the harness:** Triage matching and `emit` target resolution both read the roster (`Lawyer`/`Roster`, contracts §1.3).
- **Status:** unblocked by stub.
- **Unblock stub:** harness ships a tiny hardcoded roster behind the frozen `Lawyer` shape — one lawyer per specialist area (criminal / real-estate / commercial), each with **distinguishable `summary` prose** so matching is genuinely exercised (not just structurally present) in P8. Exactly one marked `hero: true` (Criminal — the boldest voice per demo.md). **Swap point: build row D6** — replace `roster.stub.ts` with `Lawguistics.listLawyers()` (reads `firm.json`); the `Lawyer` shape does not change.

### B2 — `Lawguistics` interface ownership — **RESOLVED (R1/R2)**
- **Owner of the seam files:** **Lawguistics** owns all of `lawguistics/**` (R2); there is no `mock.ts` (identity lives in `index.ts.condition`).
- **Why it blocked:** `emit` (P3) calls `Lawguistics.condition(...)` and `drift.forStage(stage)`.
- **Status:** **RESOLVED.** The interface is **acked and frozen** by building Lawguistics Stage 0 (**A2**) *before* harness P3 (C1). A2 ships the runnable stage-0 identity (R3), so the harness runs e2e immediately.
- **The resolved signature (R1):** `condition(text, target: VoiceSignature, drift, origin?)`. The earlier disagreement — `target` as `{ lawyerId }` vs. a pre-resolved `VoiceSignature` — is settled in favour of `VoiceSignature`; `emit` resolves it via `Lawguistics.matchTarget(lawyerId)`.

### B3 — `Stage` enum vs. drift values
- **Owner:** split. `Stage` labels (`opening|q1|q2|q3|summary`) = **harness-frozen** (contracts §1.1) since agents tag and `emit` reads them. The per-stage **drift values** (`{opening:0.15,…,summary:1.0}`) = **Lawguistics-owned** voice tuning.
- **Status:** labels frozen; values owned downstream.
- **Unblock stub:** `drift.forStage = () => 0` for stage-0 (identity ignores drift). No real schedule authored by the harness.

### B4 — `VoiceSignature` / `target` shape — **RESOLVED (R1/R4)**
- **Owner:** Lawguistics — `VoiceSignature`/`MetricVector` are canonical in `lawguistics/types.ts` (R4); the harness imports them.
- **Resolution:** `emit` resolves `caseState.lawyerMatch.lawyerId → VoiceSignature` via `Lawguistics.matchTarget()` and passes the signature to `condition` (R1). Stage-0 returns a neutral stub signature (R3). Harness does not author the shape.

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

## Handshake checklist — **all settled by the master order (R1–R7)**

1. ~~Lawguistics workers ack contracts §2.1~~ → **R1**: signature frozen as `condition(text, VoiceSignature, drift, origin?)`; ack = building **A2** before C1.
2. `Stage` labels are the shared tag (B3) — physically in `lawguistics/types.ts` (R4), labels harness-decided.
3. Lawguistics owns all of `lawguistics/**` incl. `firm.json`, drift values, `VoiceSignature`, **and** the stage-0 identity (R2) — harness only imports.
4. Spec 04 / UX worker uses `features/harness-tester/` as a throwaway lane (B6); the canonical Halo replaces it at UX row U1.
