# P8 — MVP Harness-Tester UI + End-to-End Verification

> Session brief. Depends on P7. The deliverable that proves the harness runs. **Throwaway** — not the Spec 04 Halo surface.

## Goal
A minimal monochrome UI that exercises the full harness through the interactor, and an end-to-end verification on the stage-0 identity mock. Proves: turns are adaptive, scaffolds render with working typed inputs, the summary is a live one-pager with explicit refresh, and every rendered string came through `emit`.

## Files touched
- `features/harness-tester/tester.tsx` — dumb component (presentation only).
- `features/harness-tester/tester.interactor.ts` — the interactor (or reuse P7's).
- `features/harness-tester/slot-fill.tsx` — **throwaway** inline-fill rendering (NOT Spec 04's canonical `slot-renderer.tsx`).
- A `/dev` route or page mounting the tester (kept out of the main app surface).

> **B6:** namespaced under `features/harness-tester/` so the Spec 04 UX worker's `features/halo/` is untouched. Deletable without affecting Halo.

## What the tester does (Spec 02 MVP seam)
- Seed box → `start(seed)`.
- One turn at a time: render `preamble` / `question` / `framing` / `reassurance` as prose; render each scaffold via the throwaway inline-fill (parse with P2 `parse()`, free-text → inline input, select → inline dropdown); always-present free-form box.
- Select + fill a scaffold (or type freeform) → `answer(payload)` → next turn or summary.
- Summary: render the one-pager; inline fills are instant/local (`fillSlot`); an explicit **Refresh** button calls `refreshSummary()`.
- Strictly monochrome; no cleave, no final styling.

## End-to-end verification (the real exit bar)
Run `npm run dev`, open `/dev`, and confirm on the **stage-0 identity mock**:
1. Seed → adaptive turns render one at a time, conditioned, with working inline free-text + select slots + free-form.
2. Routing lands a lawyer; a re-routing answer visibly moves the match (check server/state).
3. One-pager fills instantly; Refresh recalibrates.
4. Inspect the session store: **both registers present** for every field of every turn + summary; at stage-0, baseline == conditioned (correct — plumbing proven).
5. Grep proof: `emit` is the only `Lawguistics.condition` caller; `Lawson` is the only `emit` caller.

This is the green light that the harness is ready for the Lawguistics team to swap real conditioning behind the seam (stage 1 → real) with **zero harness/UI changes**.

## Entry criteria
- P7 complete.

## Exit criteria
- All five verification points pass.
- Tester is fully namespaced; no import touches `features/halo/` or the canonical renderer.

## Invariants to preserve
- (1) choke point intact. (2) both registers persisted during intake. (3) slots survive (stage-0 trivially). (6) monochrome.
- Tester is throwaway and does not pre-empt Spec 04.

## Contract / blocker references
- Contracts: §1.8, §1.11, §1.12, §1.13.
- Blockers: **B6** (namespacing), **B2** (after this, Lawguistics swaps in behind the acked seam).
