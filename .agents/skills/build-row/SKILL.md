---
name: build-row
description: Advance the Lawson waterfall by one row of docspecs/00-master-order.md. Use when the user says "build the next row/phase", "continue the build", "keep going", names a row ID (A1, B2, C3, D2, U4…), or otherwise asks to make progress on the master build order. Enforces the pick → build → verify → commit → mark loop, one row at a time.
---

# build-row — advance the Lawson build by one row

`docspecs/00-master-order.md` is THE authoritative build plan: a single ordered,
tickable sequence across three lanes (harness → voice → UX) with every cross-lane
conflict resolved (R1–R7). This skill executes **one row** of it correctly. Repeat
to make progress; never batch rows silently.

## The loop (do these in order, every time)

1. **PICK** — Read `docspecs/00-master-order.md`. Find the first row whose checkbox
   is `☐` (or the specific row the user named). Confirm every row above it is `☑`
   and its gate is satisfied — do **not** start a row whose gates are unticked
   (the few rows marked "may float early" — e.g. U0, U6 — are the only exceptions).
   State which row you're doing and why it's unblocked.

2. **READ THE SPEC** — Open the row's **lane doc** (the "Lane doc" column:
   `docspecs/lawson/…`, `docspecs/lawguistics/…`, `docspecs/ux/…`) AND re-check the
   relevant R1–R7 resolutions — the master order overrides the lane doc wherever
   they differ. Honour the binding rules in `AGENTS.md` (monochrome, the emit
   chokepoint, the `{baseline,conditioned}` seam, lane geography, the modified
   Next.js — read `node_modules/next/dist/docs/` before any Route Handler).

3. **BUILD** — Implement exactly that row's deliverable. Stay inside the row's
   lane geography (harness rows never edit `lawguistics/**`; voice rows touch only
   `lawguistics/**`; etc.). Don't pull work forward from later rows.

4. **VERIFY** — Run the row's "Done when" check and make it pass before committing:
   - typecheck: `npx tsc --noEmit`
   - harness pure-TS tests (once B2 adds it): `npm test` (vitest)
   - lawguistics: `node --test --env-file=.env src/lib/services/lawguistics/<x>.test.ts` (Node ≥22.6)
   - boot/route smoke where relevant: `npm run dev` + curl
   Report the actual result. If it fails, fix or stop — never mark a row green on a
   failing check.

5. **COMMIT** — If the row carries a `✦ commit` (or `+ tag`) marker, commit at that
   point. One row = one focused commit; subject names the row ID (e.g.
   `C1: Harness P3 — store + emit gateway`). Tag when the row says so
   (`stage-0-e2e`, `voice-live`). Only commit/push beyond this when the user asks.
   End commit messages with the Co-Authored-By trailer from the harness rules.

6. **MARK** — Flip that row's `☐` → `☑` in `docspecs/00-master-order.md` (include
   the doc edit in the row's commit, or commit it alongside). The ticked plan is
   the shared source of truth for progress — keep it honest: a row is `☑` only when
   its done-check actually passed.

## Rules

- **One row at a time.** Finish the full loop (verify + commit + mark) before
  picking the next. Don't silently chain rows; surface progress between them.
- **The plan wins.** Where a lane doc, Spec 02/03, or training-data Next.js differs
  from `00-master-order.md` / `AGENTS.md`, the master order + AGENTS.md win.
- **Never fake green.** Marking `☑` asserts the done-check passed. If it didn't,
  leave it `☐` and say what's blocking.
- **Respect "pipes before water."** Phase C runs end-to-end on the stage-0 identity
  (baseline == conditioned) with zero synthetic data — that's correct, not a gap.
  Divergence and real numbers only arrive in Phase D.
