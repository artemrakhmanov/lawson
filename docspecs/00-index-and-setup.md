# Lawson — Spec 00: Index & Setup

> **Spec set.** The build is described across five documents. This is the index and the setup/foundations brief. Read this first; it defines conventions every other spec assumes.

| # | Spec | Owns |
|---|------|------|
| **00** | **Index & Setup** (this doc) | Stack, styling law, architecture conventions, folder strategy, where contracts will live |
| 01 | Agent Harness | Lawson orchestration + the discovery Q&A generation engine (the swarm + triage) |
| 02 | Harness Architecture & Lawguistics Mock | AI SDK decisions, the `emit` conditioning gateway, supporting-text, typed slots, the swappable mock (stage-0 identity first), MVP UI seam |
| 03 | Lawguistics Module | Synthetic firm gen, the signature pair (metric vector + style brief), pure-TS metric core, drift interpolation, the conditioning mechanism (vector→directives + LLMaaJ fidelity gate), reveal stats |
| 04 | UX & Side-by-Side Rendering | The Halo surface, slot renderer, live one-pager, and the cleave (on-demand conditioned/baseline split + reveal stats) |

**Reading order for building:** 00 → 01 → 02 → 03 → 04. Note the *wall-clock* build leads with Spec 03's synthetic data + signatures (Lawson needs lawyers to match and voices to bend toward), but Spec 02's stage-0 identity mock lets the harness + UI run end-to-end before the real conditioner exists. The harness (01) and the conditioning seam (02) define the data that 03/04 depend on, so they're specified first.

---

## 1. What we're building (one paragraph)

Lawson runs a short, warm legal intake (Halo). Under the hood it calls a linguistic tool (Lawguistics) that bends the *sound* of every output from mirroring the user toward the voice of the matched lawyer. The audience experiences a nice intake; a hotkey at ~1:00 cleaves the screen into two panels — flat baseline vs. what they were actually reading — and the bend becomes undeniable. The reveal is the demo.

---

## 2. Stack (fixed)

- **Next.js** — App Router, TypeScript.
- **shadcn/ui** + Tailwind — all components. Neutral base, overridden to strict monochrome (§4).
- **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`) — the agentic harness. Server-side only (Route Handlers).
- **Storage = localhost only.** In-memory server-side session store (module singleton `Map`) as canonical; `localStorage` as a client mirror for rehearsal refresh-safety. No DB, no auth, no accounts.
- **Model id** centralised in one config constant — one-line swap.

---

## 3. Architecture conventions (the important part)

Three hard rules. Every other spec assumes these.

### 3.1 UI is dumb. Logic + networking lives in an interactor.
For any non-trivial component `Foo`, split:
- `foo.tsx` — **presentation only.** Renders props, fires callbacks. No `fetch`, no model calls, no orchestration, no business rules. Ideally no `useEffect` doing data work.
- `foo.interactor.ts` — **all the logic and networking** for `Foo`. Owns API calls, state shaping, derived values, side effects. Exposes a small hook or plain functions the component consumes (e.g. `useFooInteractor()` returning `{ state, actions }`).

The component should be readable as "what it looks like." The interactor is "what it does." A reviewer should be able to delete the interactor and see an inert but valid UI.

### 3.2 Reusable, cross-feature logic lives in `services/`.
If logic is needed by more than one feature, or is infrastructural (the AI SDK client wrapper, the session store accessor, the signature loader, the drift schedule), it is a **service** — a plain, framework-agnostic module with a clear interface. Interactors *consume* services; services never import UI. Keep them pure and individually testable.

### 3.3 The raw/conditioned seam is sacred and lives behind a service.
Whatever produces text for the screen returns **both** registers (the flat `raw`/baseline and the `conditioned`). UI never calls a model directly and never sees only one register for a live turn. This seam is owned by a service so the UI, the interactors, and the eventual real Lawguistics all talk to the same interface. (Detailed in Spec 02.)

### Folder strategy (not a fixed tree — a convention)
- Group by **feature**, colocating `*.tsx` + `*.interactor.ts`.
- A top-level `services/` for the reusable/infra modules (AI client, session store, signatures, config).
- shadcn primitives in their generated location, untouched except for theme tokens.
- No file does two of {present, orchestrate, be-reusable-infra}. If it does, split it.

---

## 4. Styling law — monochrome, minimalist

**Hard rule: no colour anywhere unless a spec explicitly calls for it.** This is enforced, not aspirational.

- **Palette:** black, white, and a greyscale ramp only. Define a small set of grey tokens (e.g. background, surface, border, muted-text, text) and use *only* those. No blues, no accent, no semantic colours (no green success / red error) unless a later spec names one.
- **Override shadcn's defaults:** strip any default accent/primary hue; map primary/secondary/accent all onto the greyscale ramp. A reviewer scanning the theme file should see no hex with a hue.
- **Minimalist surface:** generous whitespace, one thing on screen at a time, calm typography, restrained weights. Deliberately un-flashy — Halo should feel pleasant and obvious so the cleave is the only clever moment.
- **Contrast comes from greyscale + weight + space**, never colour. (This matters for the cleave: the two panels differ by *language*, and any visual differentiation between them is greyscale/typographic, not coloured.)
- **Motion is minimal and intentional** — used essentially only for the cleave gesture (Spec 04). No decorative animation.
- **One escape hatch:** if a future spec needs a single functional colour (e.g. a faint drift cue), it must *name it explicitly*. Absent that, assume monochrome.

A quick self-check for Claude Code: if you typed a colour name or a hued hex and no spec told you to, delete it.

---

## 5. Data contracts — deliberately undefined for now

We are **not** specifying field-level data contracts yet. They crystallise once Lawguistics exists (its real output shape drives them). For setup, only the *placement and seam* are fixed:

- There will be a shared types module that other specs fill in.
- The unit the UI renders is some "turn"-like object that carries **both** a flat register and a conditioned register, plus enough to drive drift across the intake. **Field names and structure are TBD** — do not lock them.
- Treat the conditioning function's return as an opaque `{ raw-ish, conditioned-ish }` pair behind the seam service (Spec 02) until the real tool defines it.

When a spec says "the turn object" or "the conditioned pair," it means *this still-loose shape*. Don't pre-commit to a schema; build the seam, keep the types thin and provisional, and let Lawguistics finalise them.

---

## 6. The lawyer model (simplified)

- **One firm.** All lawyers belong to the same firm. No multi-firm logic, no referral/commercial-interest modelling in v1.
- Each lawyer is just: **meta** (name, and whatever light display fields) + **practice area** + a **summary** (a short prose description of what they do / who they're for).
- **Matching = LLM picks the closest lawyer** by comparing the intake matter against each lawyer's `summary` (plus practice area as a coarse filter). No scoring engine, no embeddings in v1 — a single model selection call returns the best-fit lawyer id with a one-line rationale.
- The matched lawyer is what Lawguistics conditions *toward* (its voice is the drift target — wiring detailed in Spec 01/02).

Keep the roster small (a handful across the practice areas) and the summaries distinct enough that selection is unambiguous for a chosen seed prompt.

---

## 7. Demo-safety principles (carried into every spec)

- **Never generate on the cleave.** Both registers for every turn are produced *during* intake and stored canonically server-side; the hotkey only unhides. (Spec 04 owns this; setup just forbids any design that would require live generation at the reveal.)
- **Seed-prompt steering.** Routing/matching are real and live, but the demo seed prompt deterministically lands the hero lawyer. A fixed-fallback flag exists for the worst case.
- **Substance is invariant across registers** — the two panels differ only in *sound*, never in *facts*. This is both the demo's integrity and the compliance posture (adapt tone, never withhold/distort).

---

## 8. Setup checklist (Session 0)

- [ ] Next.js (TS, App Router) + Tailwind + shadcn init.
- [ ] Theme: rip out default hues, install the greyscale token set; verify no hued hex remains.
- [ ] `services/` scaffold: AI SDK client wrapper, in-memory session store, config (model id + drift schedule placeholder + feature flags).
- [ ] Establish the `*.tsx` / `*.interactor.ts` convention with one trivial example feature.
- [ ] Thin, provisional shared-types module (no real fields — placeholders only).
- [ ] One hardcoded firm roster (lawyers = meta + practice area + summary) so later specs have data.
- [ ] README: run instructions + a note that contracts and styling-colour are locked until explicitly unlocked.

---

*Next: Spec 01 — Agent Harness. The Q&A generation engine is the largest and most important part of the build; we define it in detail next.*
