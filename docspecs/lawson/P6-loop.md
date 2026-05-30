# P6 — Orchestration Loop (`Lawson`)

> Session brief. Depends on P3 (emit/store), P4 (triage), P5 (bench). This ties the spine together.

## Goal
`Lawson` — the orchestrator that holds `caseState`, runs the turn loop, and is the **only** caller of `emit`. After this phase the harness runs end-to-end in-process (no HTTP yet).

## Files touched
- `src/lib/services/harness/loop.ts` — `Lawson` (contracts §1.10).

## The spine (Spec 01 §3, Spec 02 flow)
```ts
Lawson.start(seed):
  caseState = Triage.bootstrap(seed)
  store.create + putCaseState
  agent = Triage.selectAgent(caseState, turnsRemaining)
  rawTurn = agents[agent].composeTurn({ caseState, transcript })   // stage='opening'
  return emit(sessionId, rawTurn)                                  // ← conditioned here

Lawson.answer(sessionId, turnId, payload):
  answerText = foldPayload(payload)        // scaffold+fills serialized, or freeform text
  caseState = Triage.recalibrate(caseState, answerText); putCaseState
  if (turnsTaken < turnBudget):
    agent = Triage.selectAgent(...); rawTurn = composeTurn(...)    // stage='q{n}'
    return emit(sessionId, rawTurn)
  else:
    rawSummary = Triage.composeSummary(caseState)                  // stage='summary'
    return emit(sessionId, rawSummary)                            // + done flag

Lawson.refreshSummary(sessionId, fills):
  caseState' = fold fills into caseState
  rawSummary = Triage.composeSummary(caseState')
  return emit(sessionId, rawSummary)                              // ← conditioned here
```

Key responsibilities:
- Assign `stage` to each emitted unit (`opening` → `q1..qN` → `summary`) from `turnsTaken`/budget.
- Update the transcript and `turnsTaken`; persist `caseState` each turn.
- `foldPayload` turns an `AnswerPayload` (contracts §1.10) into a single answer string: for `scaffold`, take scaffold `index`, fill its slot `key`s with `fills`, serialize via P2; for `freeform`, take `text`.
- **`Lawson` is the only module that imports/calls `emit`** (grep-provable, invariant 1).

## Entry criteria
- P3, P4, P5 complete.

## Exit criteria
- An in-process driver (test or script) runs `start → answer × N → summary` on the stage-0 mock and: every returned unit is conditioned-only and shape-valid; the store holds both registers for each; `done` flips on the summary.
- Re-routing answer demonstrably moves `lawyerMatch` mid-loop (live match).
- `refreshSummary(fills)` regenerates the summary with fills folded in.
- Grep confirms `loop.ts` is the only `emit` caller.

## Invariants to preserve
- (1) Sole `emit` caller. (2) Both registers per unit persisted during intake. (4) Substance register-invariant.
- Never generate at cleave time — everything is produced here, during intake.

## Contract / blocker references
- Contracts: §1.10 (`Lawson`/`AnswerPayload`), §1.5/§1.6 (raw units), §1.11 (`emit`), §1.1 (`Stage`).
