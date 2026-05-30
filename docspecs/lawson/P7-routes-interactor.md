# P7 — Route Handlers + Interactor

> Session brief. Depends on P6. First phase with server/HTTP code — **read the Next docs first (B7)**.

## Goal
Expose `Lawson` over server-only Route Handlers (all model work server-side), and provide the interactor surface the UI talks to. The browser never holds a key or calls a model.

## Files touched
- `src/app/api/lawson/start/route.ts`
- `src/app/api/lawson/answer/route.ts`
- `src/app/api/lawson/refresh-summary/route.ts`
- `src/lib/services/harness/interactor.ts` (or `features/harness-tester/tester.interactor.ts` in P8) — the client-facing surface.

## Route handlers (contracts §1.14)
```
POST /api/lawson/start            { seed }                       → ConditionedView
POST /api/lawson/answer           { sessionId, turnId, payload } → ConditionedView | ConditionedSummary  (+ done)
POST /api/lawson/refresh-summary  { sessionId, fills }           → ConditionedSummary
```
- 1:1 with `Lawson` methods; thin — parse body, call `Lawson`, return JSON.
- Return the **conditioned view only**. Baseline stays in the store until the cleave (Spec 04) reads it server-side. **No baseline crosses the wire during intake.**
- **Out of scope here (R6):** the cleave read route `GET /api/session/[id]` (returns stored both-register turns + `stats` + `getSignature().brief`, no model call) is built by the **UX lane (U5)**, not this phase. Listed in `01-contracts.md §1.14` for completeness.
- **Read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` before writing these** — Next 16.2.6 has breaking changes vs. training data (B7). Honor its current Route Handler signature/exports and any deprecation notices.
- `sessionId` issued by `start` (in body of the first response or a cookie — pick the doc-blessed pattern).

## Interactor (contracts §1.13)
```ts
start(seed): void;
answer(payload: AnswerPayload): void;
fillSlot(key, value): void;   // LOCAL only — no network
refreshSummary(): void;       // explicit model beat
```
- The **only** caller of the routes. Holds stage + current turn/summary + local fills map.
- `fillSlot` mutates local state only (instant); `refreshSummary` posts the accumulated fills.
- **No `cleave`/`uncleave`** — that is Spec 04, out of lane.

## Entry criteria
- P6 complete.
- Next Route Handler doc read (B7).

## Exit criteria
- `npm run dev`; hitting the three routes with curl/fetch drives a full intake and returns conditioned-only JSON; no baseline field present in any intake response.
- The AI client is never bundled to the browser (server-only boundary holds).
- Interactor drives start → answer × N → summary → refresh against the live routes.

## Invariants to preserve
- (5) Provider server-only behind `services/ai`. (2) Baseline never sent during intake.
- Dumb/interactor split: interactor owns all networking; no UI in `services/`.

## Contract / blocker references
- Contracts: §1.10, §1.13, §1.14.
- Blockers: **B7** (modified Next — read docs first).
