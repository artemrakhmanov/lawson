# Lawson — Spec 04: UX Finalisation & On-Demand Side-by-Side Rendering

> **Read 00–03 first.** This is the last spec. It brings everything together into the surface the audience sees: the calm monochrome intake (Halo), the slot renderer that turns encoded text into interactive prose, the live one-pager, and — the payload — the **cleave**: an on-demand split that renders the conditioned text the user was reading next to the flat baseline that was stored alongside it. Everything before this produced and stored both registers; this spec only ever **reveals** them.

> **The one rule that governs this whole spec:** the cleave **unhides**, it never generates. Both registers for every turn are already in the canonical session store (Spec 02 §5, Spec 03). The hotkey is a display toggle, not a model call. If any design here would require generating at reveal time, it's wrong.

---

## 1. What this spec delivers

1. **The Halo intake surface** — opening prompt → adaptive turns (one at a time) → live one-pager. Calm, monochrome, deliberately un-clever (Spec 00 §4).
2. **The slot renderer** — parses the regex-delimited typed slots (Spec 02 §6) into interleaved text + inline inputs (free-text and select), used identically in scaffolds and the summary.
3. **The live one-pager** — the summary as an interactive document: instant local slot fills, explicit refresh re-runs `Lawson.refreshSummary` (Spec 01 §5, Spec 02 §3.1).
4. **The cleave** — on-demand side-by-side rendering of conditioned (right) vs. baseline (left), synced row-for-row, with the signature brief + the two reveal numbers (convergence bar, LSM%) from Spec 03 §7.

All of it under the dumb-component / `*.interactor.ts` split (Spec 00 §3.1): components render, interactors fetch and orchestrate.

---

## 2. The surface (component map)

Feature folder, colocating presentation + interactor. Components are dumb; the interactor is the only thing that talks to the routes (which talk to `Lawson`).

```
features/halo/
  halo.tsx                 # top-level surface; renders the current stage
  halo.interactor.ts       # the ONLY caller of the route layer; owns stage + turn state
  opening-prompt.tsx       # seed input
  turn-view.tsx            # one turn: preamble / question / framing / scaffolds / freeform
  scaffold.tsx             # one suggested answer (renders via slot-renderer, captures fills)
  slot-renderer.tsx        # encoded text -> interleaved text-runs + inline input-runs
  one-pager.tsx            # the live editable summary (also uses slot-renderer)
  cleave/
    cleave-stage.tsx       # the split container: single panel -> two synced panels
    panel.tsx              # renders a register ("conditioned" | "baseline") of all turns
    signature-card.tsx     # the matched lawyer's brief + exemplar (reveal only)
    convergence-bar.tsx    # Euclidean convergence-to-0 bar per turn (reveal only)
    lsm-badge.tsx          # "Linguistic Style Match: NN%" + citation (reveal only)
```

### 2.1 Interactor surface (what the dumb components consume)
From Spec 02 §7, exposed as a hook:
```ts
useHaloInteractor(): {
  stage: "opening" | "turn" | "summary" | "cleaved";
  currentTurn?: ConditionedView;     // conditioned fields only, during intake
  summary?: ConditionedView;
  start(seed): void;
  answer(payload): void;             // chosen scaffold + fills, or freeform
  fillSlot(key, value): void;        // LOCAL only — no network
  refreshSummary(): void;            // explicit model recalibration
  cleave(): void;                    // pull baselines + stats from store, flip to "cleaved"
  uncleave(): void;
}
```
- During intake the components **only ever receive the conditioned register**. `baseline` stays server-side until `cleave()` (so it can't leak into the live view, and the reveal is canonical).

---

## 3. The slot renderer (shared, the interactive-text engine)

The mechanism that makes both scaffolds and the one-pager feel alive. Consumes `slots/encode.ts` `parse()` (Spec 02 §6).

### 3.1 Parse → runs → render
- `parse(text)` returns an ordered list of runs: **text-runs** (plain prose) and **input-runs** (typed slots with `key`, `type`, payload).
- The renderer maps runs to inline elements:
  - **text-run** → a `<span>` of prose.
  - **free-text input-run** → an inline, auto-sizing editable field seeded with the placeholder hint.
  - **select input-run** → an inline dropdown of the option list (the magical mid-sentence beat).
- Inline, not stacked: inputs sit *within* the sentence, so a scaffold reads as a fill-in-the-blank sentence, not a form. This is the whole point — the client picks an answer *and* personalises it in one gesture (Spec 01 §4).

### 3.2 Fill behaviour
- Editing a slot calls `fillSlot(key, value)` — **local state only, instant, no network** (Spec 01 §5 cost model).
- The renderer keeps a `fills` map keyed by slot `key`; the displayed text reflects fills live.
- On answer submit (scaffold) the interactor serialises runs+fills back to a single answer string via `serialize()` and sends it to `Lawson.answer`.

### 3.3 Conditioned text is what gets parsed
- The renderer always parses the **conditioned** text (the live register). Because conditioning preserves slot tokens (Spec 02 §6 / Spec 03 §6 contract), `parse()` works unchanged on conditioned prose. (If a token were ever mangled, the gateway already fell back to baseline for that field — the renderer never sees broken markup.)

---

## 4. The intake flow (stage machine)

`halo.tsx` renders by `stage`; `halo.interactor.ts` owns transitions.

```
opening → turn (×N, adaptive) → summary → [cleaved]
```

- **opening** — `opening-prompt.tsx`: a single calm free-text box. Submit → `start(seed)`.
- **turn** — `turn-view.tsx` renders the current conditioned turn, one at a time:
  - `preamble` / `framing` / `reassurance` as prose (the register-rich surface — Spec 02 §4),
  - `question` as the ask,
  - three `scaffold.tsx` (each via slot-renderer) + the always-present **free-form** answer field.
  - Selecting/filling a scaffold then submitting → `answer(payload)` → next conditioned turn (or summary). The swarm may re-route between turns; the UI just renders whatever turn comes back.
- **summary** — `one-pager.tsx`: the conditioned summary rendered via slot-renderer. Inline fills are instant/local; an explicit **Refresh** control calls `refreshSummary()`. This is the last, highest-drift screen before the trap line.
- **cleaved** — entered by the hotkey (§5). Not a normal flow step; a reveal overlay/transition on top of the summary state.

Monochrome throughout (Spec 00 §4): greyscale, whitespace, restrained type. The only motion in the whole app is the cleave.

---

## 5. The cleave — on-demand side-by-side rendering

The payload. A hotkey splits the single panel into two synced panels and unhides the stored baseline beside the conditioned text.

### 5.1 Trigger
- A deliberate hotkey (e.g. `Ctrl/⌘ + .` — chosen to not misfire). `cleave()` on the interactor:
  1. pulls from the canonical store (via a `GET /api/session`): the **baseline** register for every turn + summary, the matched lawyer's **signature brief**, and the precomputed **convergence series** + **LSM%** (Spec 03 §7),
  2. flips `stage → "cleaved"`.
- **No generation.** Everything `cleave()` needs was produced and stored during intake (Spec 02 §5). The call is a read + a state flip.

### 5.2 The split
`cleave-stage.tsx` animates one centered `panel.tsx` into two:
- **Left = baseline** (flat/administrative). **Right = conditioned** (what they were actually reading).
- Built **split-ready from day one** (Spec 00 / `halo.md` cut-line: never cut this): the intake panel is *already* a `panel.tsx` parameterised by register; the cleave duplicates it with the other register and turns on sync. It is not bolted on — the single-panel intake is the two-panel component with one side hidden.
- **Synced row-for-row.** Each turn occupies the same vertical slot on both sides, so the eye diffs turn-by-turn. Synced scroll. Identical layout/typography on both sides — **the only difference between the panels is the language** (monochrome law: contrast is greyscale/typographic/linguistic, never colour).

### 5.3 The reveal choreography (timing matters)
- The cleave should feel **instant and intentional** — a magic-trick gesture, not a UI state change. One clean, fast mitosis animation.
- **Let the diff sit ~3 seconds in silence** before any narration or stat appears (per `demo.md`): the contrast should hit the eye before it's explained. So the panels animate in first; the signature card and numbers fade in a beat later, not simultaneously.

### 5.4 The reveal furniture (Spec 03 §7 rendered)
After the panels settle:
- **`signature-card.tsx`** — the matched lawyer's `brief.label`, `brief.moves`, and `exemplarLine`: "this is the voice the right side was bending toward." Names the tells the audience just felt.
- **`convergence-bar.tsx`** — the normalised-Euclidean **convergence-to-0** series, one bar per turn, visibly **shrinking across turns**: proof the conditioned output measurably approached this lawyer's style. The intuitive "watch the gap close" number.
- **`lsm-badge.tsx`** — "Linguistic Style Match: NN%" with a short citation (Niederhoffer & Pennebaker; Ireland & Pennebaker): the named, defensible stat. One number people *feel* (the bar), one *from the papers* (the badge).
- Monochrome: the bar is greyscale fill; emphasis via weight/length, not hue.

### 5.5 Drift made legible (optional, stretch)
- A small per-turn drift cue (0→1) along the synced rows, showing the bend ramping mirror→lawyer across the intake. First cut-line if time is short (`lawguistics.md`); the convergence bar already tells most of this story.

---

## 6. Failure-mode safeties (UX-side)

- **Pre-render guarantee honoured:** the UI never asks for conditioning at cleave time; it only reads stored registers. (Spec 02 §5 / Spec 03.)
- **Broken-token safety:** the renderer only parses conditioned text the gateway already validated; a mangled field was replaced with baseline upstream, so the renderer never crashes on bad markup (§3.3).
- **Subtlety risk:** if the two panels look too alike, the fix is upstream — bolder hero signature / flatter baseline / wider drift spread (Spec 03 §5.3) — **not** UI trickery. The contrast must be real (it's measured), the UI just shows it honestly.
- **Refresh latency on the one-pager:** fills are instant/local; only the explicit Refresh hits the model, and it's off the critical reveal path. Never auto-refresh on keystroke.
- **Rehearsal safety:** `localStorage` mirrors `sessionId` + rendered conditioned turns so a refresh mid-rehearsal doesn't lose the demo (Spec 00 §2). Canonical state is still server-side; the mirror is convenience only.

---

## 7. Build order (a Claude Code session)

1. `slot-renderer.tsx` — parse → interleaved text/free-text/select runs; local `fills`; `serialize` on submit. Test against encoded sample strings.
2. `panel.tsx` — register-parameterised renderer of a turn list (so it serves both sides from the start).
3. `turn-view.tsx` + `scaffold.tsx` + `opening-prompt.tsx` + `halo.interactor.ts` — the single-panel intake, conditioned-only, wired to the routes. (Runs on the Spec 02 stage-0 identity mock end-to-end.)
4. `one-pager.tsx` — live summary with local fills + explicit Refresh.
5. `cleave-stage.tsx` — duplicate the panel with the baseline register, sync scroll, the mitosis animation + 3-second silent beat.
6. `signature-card.tsx` + `convergence-bar.tsx` + `lsm-badge.tsx` — the reveal furniture (fed by Spec 03 §7), fading in after the panels settle.
7. Monochrome pass: verify no hued hex anywhere; contrast is greyscale/type/space only.
8. Hotkey + rehearsal `localStorage` mirror + the fixed-route fallback path (Spec 00 §7).

---

## 8. Definition of done (the demo works when…)

- Seed → adaptive turns render one at a time, conditioned, with working inline free-text + select slots and a free-form option.
- The one-pager fills instantly and recalibrates on explicit Refresh.
- The hotkey cleaves instantly into two synced panels: **left flat, right voiced, same facts** — diffable by eye in <5s.
- The signature card names the voice; the convergence bar visibly shrinks across turns; the LSM% shows with citation.
- Nothing generates at cleave time; both panels came from stored registers.
- On the stage-0 identity mock the panels are identical (plumbing proven); on the Spec 03 conditioner they diverge (voice proven). The UI code is the same in both cases.

---

*End of spec set: 00 Setup · 01 Harness · 02 Architecture & Mock · 03 Lawguistics · 04 UX & Side-by-Side Rendering.*
