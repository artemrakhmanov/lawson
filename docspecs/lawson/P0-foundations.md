# P0 — Foundations & Contract Freeze

> Session brief. Read `00-build-plan.md` and `01-contracts.md` first. No model calls in this phase.

## Goal
Make the repo ready to build the harness: install the missing dependencies, fix the directory layout, land a single config module, and materialize the frozen contracts (`01-contracts.md`) as TypeScript type stubs other phases import.

## Files touched
- `package.json` — add deps (below).
- **Drop** `src/lib/services/lawson/` (empty placeholder). **Create** `src/lib/services/harness/` and the sibling dirs the harness owns: `src/lib/services/ai/`, `src/lib/services/session/`.
- `src/lib/services/config.ts` — central config.
- `src/lib/services/harness/contracts.ts` — the **harness-owned** frozen types from `01-contracts.md §1`: `Run`, `AgentId`, `Agent`, `RawTurn`, `RawSummary`, `Turn`, `CaseState`, `ConditionedView`, `ConditionedSummary`, `AnswerPayload`. The **R4-shared** types (`Stage`, `Lawyer`, `PracticeArea`, `MetricVector`, `VoiceSignature`, `ConditionResult`, `MetricRanges`) are **canonical in `lawguistics/types.ts`** (build row A2) — `contracts.ts` **re-exports** them from there, never redeclares. `Roster` is a harness-local alias `Lawyer[]`.
- `src/lib/services/harness/roster.stub.ts` — hardcoded stub roster (B1), distinguishable `summary` prose per lawyer, exactly one `hero: true` (Criminal). Uses the **PascalCase** `PracticeArea` from `lawguistics/types.ts` (R4).

## Steps
1. Install: `ai`, `@ai-sdk/anthropic`, `zod`. (`zod` per Spec 02 §2.2; AI SDK per CLAUDE.md.) Verify versions resolve against Next 16.2.6 / React 19.2.4.
2. Remove the empty `lawson/` dir; create the harness-owned dirs above.
3. Write `contracts.ts` with the **harness-owned** types from `01-contracts.md §1`, and **re-export** the R4-shared types from `lawguistics/types.ts`. Do **not** author the `Lawguistics` interface or any voice-lane shape — the voice lane owns all of `lawguistics/**` (R2) and ships it as **A2** (immediately after this row). Since A2 follows P0, the re-export resolves then; if building P0 strictly standalone first, declare the shared types locally as a temporary stub and delete them when A2 lands. (The old `Target` type is gone — R1 uses `VoiceSignature`.)
4. Write `config.ts`:
   ```ts
   export const config = {
     modelId: 'claude-...',          // pin per CLAUDE.md model guidance
     turnBudget: 3,                  // N — small, demo-sized
     temps: { triage: 0.1, compose: 0.6 },  // low for selection/match, moderate for composition
     fixedFallback: { enabled: false, lawyerId: '' }, // steering pin (Spec 00) — off by default
   };
   ```
5. Write `roster.stub.ts` (B1) — 3 lawyers, distinguishable summaries, Criminal `hero: true`.

## Entry criteria
- None. First phase (build row **A1**).

## Exit criteria
- `npm run build` (or `tsc --noEmit`) passes with the new types present and unused (the R4-shared re-exports resolve once **A2** lands, immediately after).
- `ai`, `@ai-sdk/anthropic`, `zod` in `package.json`; lockfile updated.
- `src/lib/services/lawson/` gone; `harness/`, `ai/`, `session/` exist.
- `contracts.ts` exports every harness-owned type in `01-contracts.md §1` and re-exports the R4-shared types; the stub roster type-checks against `Roster`.

## Invariants to preserve
- (5) `services/` stays UI-free. (6) No colour anywhere.
- Do not author Lawguistics-owned shapes (drift values, `VoiceSignature`) — B3/B4.

## Contract / blocker references
- Contracts: §1 (all harness-owned types), §1.3 (roster), §1.1 (`Stage`).
- Blockers: **B1** (stub roster), **B5** (test runner — defer to P2), **B7** (modified Next — no server code yet).
