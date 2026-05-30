# Lawson — Spec 01: Agent Harness (Discovery Q&A Engine)

> **Read 00 first.** This spec assumes the stack, the monochrome law, the `*.tsx` / `*.interactor.ts` split, the `services/` convention, and the deliberately-loose data contracts established there. This is the core of the build — the largest, most important spec.

> **What this owns:** everything that turns a free-text seed into a progressive, adaptive discovery Q&A and a live one-pager summary. It produces *substance only*. Lawguistics is a **final transformation step** applied to whatever this emits (Spec 02 owns that seam). The harness never thinks about voice.

> **What this does NOT own:** the conditioning/voice (Spec 02), the rendering of slots/inputs (Spec 03), the cleave (Spec 04). This spec defines the *shape* of what it emits so those specs can consume it, but field-level contracts stay provisional per Spec 00 §5.

---

## 1. The mental model

The harness is a **swarm of specialist agents** coordinated by a **triage agent**. The client never prompts the agent — *the agent prompts the client*. Each turn, the UI presents one question plus three enriched, fill-in-the-blank suggested answers (and always a free-form option). The user answers; the swarm recalibrates; the next-best agent takes the next turn. After the question budget, the active understanding is rendered as a live, editable one-pager.

Three ideas do the heavy lifting:

1. **Triage-as-orchestrator.** A single triage agent owns *who speaks next*. Each turn it reads the whole transcript + current case state and dispatches to the agent best able to bring the intake to its strongest state in the remaining turns.
2. **A bench of selectable agents.** Two kinds: **practice-agnostic analyst roles** (assess the claim regardless of area) and **practice specialists** (area-specific intake prep). Triage selects from the *whole bench* — agnostic and specialist sit in one pool.
3. **Progressive matching.** The first question is a best-shot from a possibly-wild seed. Every answer recalibrates both the *case understanding* and the *lawyer match*. The match (and therefore the conditioning target handed to Lawguistics) can move mid-intake. That's expected and honest.

---

## 2. The bench

One firm. A small roster of lawyers (Spec 00 §6: meta + practice area + summary). The *agents* below are intake personas; the *lawyers* are who we match to. Agents generate questions; the matched lawyer is who Lawguistics later conditions toward.

### 2.1 Triage Agent (always the conductor, never a turn-taker)
- Does **not** ask the client questions directly. It **routes**: picks which bench agent runs each turn, and maintains the running case state + current best lawyer match.
- First action on a new session: best-shot classification of the seed → initial practice-area guess + initial lawyer match + which agent opens. Allowed to be wrong; it recalibrates every turn.
- Each subsequent turn: given transcript + state + turns remaining, choose the agent that maximises case-building value for what's still missing. Early turns lean agnostic (narrow the matter, test viability); later turns lean the matched specialist (area-specific detail).
- Owns the **re-route decision**: if answers reveal the matter is really something else, triage switches the active specialist and updates the lawyer match.

### 2.2 Practice-agnostic analyst roles (available to triage for any matter)
These assess *the claim itself*, not an area. Grounded in standard litigation case-assessment doctrine — the three inputs of dispute valuation (merits, monetary outcome, cost) and the elements-of-proof frame (liability/causation/damages generalised to any claim).

- **Claim Quant** — quantifies. Probes the *value and viability* of the matter: what's at stake (amounts, exposure, what "winning" is worth), rough timeline/cost sensibility, and whether the numbers justify action. Industry-agnostic.
- **Merits Analyst** — tests *whether there's a claim*. Probes the elements: what happened, who's liable, causation, what proof/evidence exists. Industry-agnostic. (Pairs naturally with Claim Quant: one asks "is there a case," the other "is it worth it.")

> These two are the early workhorses for a vague seed: they narrow and stress-test before a specialist is committed.

### 2.3 Practice specialists (one active at a time, triage-selected)
Each maps to a practice area in the roster and asks the area's highest-value intake questions. Derived from how lawyers actually prep intake per area:

- **Criminal Defense Counsel** — timeline of stop/arrest, **police conduct** (the suppression angle: searches, statements, rights), the charges, prior record, witnesses, custody/bail status, upcoming dates.
- **Real Estate Counsel** — transaction stage (pre-contract / under contract / closing / post-closing), the parties, the property, the **disputed term** (title defect, disclosure/misrepresentation, contingency, boundary, earnest money), deadlines and closing date, documents.
- **Commercial / Contract Counsel** — the agreement and parties, the obligation at issue, the breach and when, loss flowing from it, remedy sought, governing terms/clauses. (Natural catch-basin for business disputes; the third route.)

> Roster note: keep one lawyer per specialist area at first (extendable). Specialist agents are fixed and route-activated, not generated per matter — steerable for the demo.

---

## 3. Orchestration loop (the spine)

Conceptually, per session:

```
seed →
  triage.bootstrap(seed):
      → initial caseState (matter guess, confidence)
      → initial lawyerMatch
      → opening agent
  loop for N turns (default N = budget, e.g. 3–5):
      agent = triage.selectAgent(caseState, transcript, turnsRemaining)
      turnRequest = agent.composeTurn(caseState, transcript)   // question + 3 scaffolds + freeform
      → emit turnRequest to UI (after Lawguistics transform — Spec 02)
      userAnswer = await client answer (chosen scaffold w/ filled slots, or freeform)
      caseState = triage.recalibrate(caseState, userAnswer)    // updates matter + lawyerMatch
  end loop
  summary = triage.composeSummary(caseState, transcript)        // the live one-pager
```

Key properties:
- **Triage runs every turn** — `selectAgent` before, `recalibrate` after. It's the only thing that holds global state.
- **Agents are stateless workers.** An agent receives the case state + transcript and returns a turn. It does not persist anything; triage owns memory. This keeps agents swappable and testable.
- **The match is live.** `lawyerMatch` is part of `caseState` and may change on any `recalibrate`. Whatever Spec 02 conditions toward reads from here.
- **Substance only.** Everything emitted here is pre-conditioning. The transform to `{conditioned, baseline}` happens at the seam (Spec 02) before the UI sees it.

### 3.1 Implementation shape (per Spec 00 conventions)
- Agents, triage, and the loop live in **`services/`** (framework-agnostic, no UI imports). E.g. `services/harness/` with `triage.ts`, a small `agents/` set, and a `loop.ts` orchestrator. Each agent is a module exposing `composeTurn(input) → TurnRequest`.
- The model client is a shared service (Spec 00). Agents call it via that wrapper, never directly.
- The feature's React side consumes the loop through an **interactor** (`*.interactor.ts`), which is the only thing the UI talks to. The UI itself stays dumb (Spec 03).
- Each model-backed step (`selectAgent`, `composeTurn`, `recalibrate`, `composeSummary`) is its own prompt template in one place, so tuning is centralised.

---

## 4. The per-turn output (question + 3 enriched scaffolds + free-form)

This is the unit the UI renders. **The agent prompts the client.** Each turn the agent emits:

- **one question** (the single highest-value thing to ask now), and
- **three suggested answers**, each a *scaffold* — pre-written answer text with **embedded input slots** the client fills to enrich it with specifics, and
- **always a free-form answer option** (an empty slot for "say it your own way").

The point of scaffolds: the client picks an answer *and* personalises it in one gesture, which both lowers friction and steers them toward comprehensive, structured answers — far richer than a blank box. The agent is doing the work of *anticipating* what a good answer looks like and leaving blanks only where specifics are needed.

> **Provisional shape, not a locked contract** (Spec 00 §5): a turn carries an agent id, a question string, an ordered list of scaffold strings (each containing zero or more encoded slots), and a free-form affordance. Field names finalise once Lawguistics defines its transform output. Treat the below as the *intent*.

### 4.1 The slot encoding (regex-delimited)
Slots are **regex-delimited inline tokens** inside otherwise-plain answer text. A single delimiter syntax is used **everywhere** (scaffolds *and* the summary) so one parser serves both.

- Syntax: a delimited token carrying a short slot key and an optional placeholder hint, e.g. a `[[key:placeholder]]` style token embedded mid-sentence.
- The renderer (Spec 03) parses each scaffold into an ordered sequence of **text runs** and **input runs** by splitting on the slot delimiter. Text runs render as prose; input runs render as inline editable fields seeded with the placeholder hint.
- A slot key is stable within a turn so the filled value can be read back and folded into the user's answer.
- Keep it regex-simple on purpose: a single well-formed delimiter pattern, no nested slots, no typed/optioned slots in v1. (If a future spec needs typed inputs, it must define the extension — default is plain inline text fill.)

Example scaffold (illustrative, syntax provisional):
> "I was pulled over on `[[date:when]]` near `[[place:where]]`, and the officer searched my `[[area:car/home/person]]` without `[[basis:asking/a warrant]]`."

Rendered: prose interleaved with four inline inputs the client fills. Chosen + filled = a comprehensive, specific answer the swarm can recalibrate on.

### 4.2 What gets sent onward
The agent emits these scaffolds as **substance**. They pass through Lawguistics (Spec 02) — which conditions the *prose runs'* register while **leaving slot tokens intact** — before the UI renders them. (Spec 02 must preserve the delimiters so the parser still works on the conditioned text. Flag for that spec.)

---

## 5. The summary as a live one-pager

After the question budget, triage composes the summary — the matter rendered as a **formatted one-pager that itself contains the same encoded slots**. It is the best-shot structured artifact: matter type, key facts, parties, the ask — with encoded blanks where enriching specifics belong.

- The one-pager uses the **same slot encoding** as the scaffolds, so the same renderer drives it.
- It is **interactive**: as the client fills/edits inline inputs, the displayed text updates with their values locally (instant).
- **Recalibration is explicit.** Local slot fills are instant and need no model call. A deliberate **"refresh"** action re-runs `composeSummary` with the filled values folded in, regenerating the one-pager (and is itself passed through Lawguistics). No live regeneration on every keystroke — fills are local; refresh is the model beat. (Matches the agreed cost model: once added, there's an explicit refresh.)
- The summary is the **highest-drift** output before the cleave (Spec 02 sets the schedule; this spec just notes the summary is the last and most-conditioned renderable). It's the natural thing left on screen at the trap line.

---

## 6. Progressive matching detail

- `caseState` carries: current matter hypothesis + confidence, the active specialist, and the current `lawyerMatch` (selected by comparing the evolving matter against each lawyer's `summary` per Spec 00 §6).
- `triage.recalibrate` after each answer may: sharpen the matter, switch the active specialist, and/or change `lawyerMatch`. First-question wildness is acceptable precisely because recalibration is built in.
- Matching is a single model selection (matter vs. lawyer summaries → best-fit id + one-line rationale). No embeddings/scoring engine in v1.
- **Steering:** real and live, but the demo seed deterministically lands the hero lawyer by the time the summary renders. A fixed-fallback flag (Spec 00) pins the match if live routing ever wobbles on stage.

---

## 7. Budgets, latency, safety

- **Turn budget** is configurable (default small — enough to feel adaptive, short enough for the demo window). Triage knows `turnsRemaining` and front-loads the most valuable agents.
- **Pre-render obligation (inherited):** both registers for every emitted turn and the summary are produced and stored canonically before the reveal could happen. The harness must not introduce any design that requires generating at cleave time. (Spec 04 enforces; Spec 01 must not violate.)
- **Substance invariant (compliance posture):** the harness changes *what is asked*, never hides or distorts facts; Lawguistics changes *how it sounds*, never the facts. Same substance across both registers. This is the integrity line that keeps the mechanism defensible.
- **Determinism knobs:** low temperature for triage selection/matching (steerable), moderate for question/scaffold composition (natural-feeling). Centralised in config.

---

## 8. Build order for this spec (a Claude Code session)

1. **Model client service** + **prompt registry** scaffold (one place for all templates).
2. **Triage core:** `bootstrap`, `selectAgent`, `recalibrate`, `composeSummary` — wired to the model client, returning provisional shapes. Mock agents first.
3. **The bench:** implement the agnostic roles (Claim Quant, Merits Analyst) and the three specialists as `composeTurn` modules. Keep prompts area-true (use the intake-prep notes in §2).
4. **The orchestration loop** (`loop.ts`) tying triage + agents, holding `caseState`, exposing a clean interface for the interactor.
5. **Slot encoding:** the delimiter + a tiny parse/serialize helper in `services/` (shared by scaffolds and summary; consumed by Spec 03's renderer).
6. **Interactor** exposing the loop to the UI: `start(seed)`, `answer(turnId, payload)`, `refreshSummary(fills)` — returning provisional turn/summary objects. (UI binding is Spec 03.)
7. Leave a clean `transform()` seam where Spec 02 plugs in — until then, an identity transform that returns `{conditioned: substance, baseline: substance}` so the loop runs end-to-end before Lawguistics exists.

---

## 9. Open seams handed to other specs

- **Spec 02 (Lawguistics mock):** owns `transform(substance, matchTarget, drift) → {conditioned, baseline}`, the drift schedule, and **must preserve slot delimiters** through conditioning. The harness calls it as the final step on every emitted turn + summary.
- **Spec 03 (UX):** owns the slot **renderer** (parse encoded text → text/input runs), the one-at-a-time question flow, the editable one-pager, and the dumb-component / interactor split for all of the above.
- **Spec 04 (Side rendering):** owns the cleave; relies on both registers being present per turn (which this harness guarantees via the Spec 02 seam) and on the canonical server-side store.

---

*Next candidates: Spec 02 (Lawguistics mock — the transform seam + drift + slot-preservation), then Spec 03 (UX), then Spec 04 (side rendering).*
