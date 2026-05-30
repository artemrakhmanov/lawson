# P5 — The Bench (five agents)

> Session brief. Depends on P1 and P3. Replaces P4's mock agents with real `composeTurn` modules.

## Goal
The five intake personas, each emitting the per-turn substance: a single highest-value question, three enriched fill-in-the-blank scaffolds, optional surface text, and an always-present free-form option. Area-true prompts per Spec 01 §2.

## Files touched
- `src/lib/services/harness/agents/claim-quant.ts`
- `src/lib/services/harness/agents/merits-analyst.ts`
- `src/lib/services/harness/agents/criminal.ts`
- `src/lib/services/harness/agents/real-estate.ts`
- `src/lib/services/harness/agents/commercial.ts`
- `src/lib/services/harness/agents/index.ts` — registry `Record<AgentId, Agent>`.
- Extend `harness/prompts.ts` with one `composeTurn` template per agent.

## What each agent emits (contracts §1.5 `RawTurn`)
- `question` — the single highest-value ask now (functional, fact-carrying).
- `scaffolds` — exactly 3, each plain prose with `[[slot]]` tokens (P2 syntax), anticipating a good answer and leaving blanks for specifics.
- `preamble` / `framing` / `reassurance` — optional **surface** fields (register-rich, fact-light) — the surface Lawguistics will bend. Substance invariant: tone, never new facts.
- `freeform` — always present.
- `stage` set by the loop/triage context; `agentId` self.

## Area-true content (Spec 01 §2)
- **claim-quant** — value/viability: amounts at stake, exposure, rough cost/timeline sensibility. Industry-agnostic.
- **merits-analyst** — elements of a claim: what happened, who's liable, causation, what proof exists. Industry-agnostic.
- **criminal** — stop/arrest timeline, police conduct (search/statements/rights), charges, prior record, custody/bail, dates.
- **real-estate** — transaction stage, parties, property, the disputed term, deadlines/closing, documents.
- **commercial** — the agreement & parties, obligation at issue, breach + when, loss, remedy sought, governing clauses.

Agents are **stateless**: `(caseState, transcript) → RawTurn`, one `generateObject` call (moderate temp `config.temps.compose`), no persistence, no UI imports.

## Entry criteria
- P1 and P3 complete (P4 helpful but agents only need client + contracts).

## Exit criteria
- Each agent returns a schema-valid `RawTurn` with exactly 3 scaffolds containing well-formed slot tokens that `parse()` (P2) accepts and round-trips.
- Specialist questions are recognizably area-true (spot-check against §2).
- The agent registry resolves every `AgentId`; P4's mock agents removed.

## Invariants to preserve
- (4) Substance only / register-invariant — surface fields are tone, not new facts.
- Stateless workers; UI-free.

## Contract / blocker references
- Contracts: §1.4 (`Agent`/`AgentId`), §1.5 (`RawTurn`), §1.2 (slots).
