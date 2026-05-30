# P4 — Triage Core (with mock agents)

> Session brief. Depends on P1 (client/prompts) and P3 (store). Build against **mock agents** first — real bench is P5.

## Goal
The conductor: the only holder of global state, the router that decides who speaks next, and the live matter/lawyer matcher. Four model-backed methods, each its own prompt template.

## Files touched
- `src/lib/services/harness/triage.ts` — `Triage` (contracts §1.9).
- `src/lib/services/harness/match.ts` — matter↔lawyer matching helper (optional split).
- Extend `harness/prompts.ts` with `bootstrap`, `selectAgent`, `recalibrate`, `composeSummary` templates.

## The four methods
```ts
bootstrap(seed): Promise<CaseState>
  // best-shot classification: matter hypothesis + confidence, initial lawyerMatch, opening agent.
  // Allowed to be wrong; recalibration fixes it.
selectAgent(caseState, turnsRemaining): Promise<AgentId>
  // early turns lean agnostic (claim-quant / merits-analyst); later lean the matched specialist.
recalibrate(caseState, answer): Promise<CaseState>
  // fold the answer in; may sharpen matter, switch activeSpecialist, move lawyerMatch.
composeSummary(caseState): Promise<RawSummary>
  // the one-pager substance (slot-bearing fields).
```

## Matching (Spec 01 §6)
- A single low-temperature model selection: evolving matter vs. each lawyer's `summary` → best-fit `lawyerId` + one-line rationale. **No embeddings/scoring engine in v1.**
- Reads the **stub roster** (B1) until `firm.json` lands.
- Honor `config.fixedFallback`: if enabled, pin `lawyerMatch` to the configured `lawyerId` (steering safety, Spec 00).
- Use `config.temps.triage` (low) for `selectAgent`/`recalibrate`/matching; `composeSummary` may use `config.temps.compose`.

## Mock agents (temporary)
A trivial `composeTurn` returning a canned `RawTurn` per `AgentId`, so Triage routing/recalibration is testable before P5. Delete when P5 lands.

## Entry criteria
- P1 and P3 complete.

## Exit criteria
- `bootstrap(seed)` returns a well-formed `CaseState` with a non-empty `lawyerMatch` resolved against the stub roster.
- Given distinguishable stub summaries, two clearly-different seeds (e.g. a DUI seed vs. a contract-breach seed) match **different** lawyers — matching is genuinely exercised, not constant (B1).
- `recalibrate` demonstrably moves `matter`/`lawyerMatch` on a re-routing answer.
- `selectAgent` front-loads agnostic agents early, specialist later, respecting `turnsRemaining`.
- All four methods low/moderate-temp per `config`.

## Invariants to preserve
- Triage is the only global-state holder; agents stay stateless.
- (4) Substance only — Triage emits no conditioned text; it returns raw substance to be `emit`-ed by `Lawson` (P6).

## Contract / blocker references
- Contracts: §1.7 (`CaseState`), §1.9 (`Triage`), §1.3 (roster), §1.6 (`RawSummary`).
- Blockers: **B1** (stub roster — distinguishable summaries are load-bearing here).
