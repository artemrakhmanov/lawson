# UX Polish — 02 · Intake Surface

> Gates **G2** (surface), **G3** (slot micro-interactions), **G4** (wait state). The pleasant Halo intake the audience experiences before the cleave. Delta over Spec 04 §3–4 (component structure) and Spec 02 §4/§7 — those define *what* renders; this defines how it *feels*.

The intake is deliberately un-flashy (00 §4): "Halo should feel pleasant and obvious so the cleave is the only clever moment." Polish here is about calm, not delight.

## Opening (G2)

`opening-prompt.tsx` — a single calm, centered free-text box on a near-empty field. One line of warm prompting above it. Submit → `start(seed)`. Nothing else on screen. (04 §4)

## Turn view (G2)

`turn-view.tsx` renders one conditioned turn at a time. Vertical rhythm, top to bottom, with generous whitespace (`01`):

1. **preamble** — quiet lead-in prose (muted, light weight)
2. **question** — the hero (largest type, the only emphasis)
3. **framing** — optional supporting prose under the question
4. **three scaffolds** — suggested fill-in-the-blank answers (see slot-renderer)
5. **free-form field** — always present; the escape hatch from the scaffolds
6. **reassurance** — optional closing prose

preamble / framing / reassurance are the "pure register" fields (02 §4) — they carry the voice and are where the baseline↔conditioned gap will be felt at cleave time. Treat them as real human speech, not UI chrome.

Selecting/filling a scaffold (or typing freeform) then submitting → `answer(payload)` → next conditioned turn (or summary). The swarm may re-route between turns; the UI just renders whatever comes back (04 §4). Turn-to-turn transition: cut or a very subtle crossfade only (`01` motion policy).

## Slot-renderer micro-interactions (G3)

The core interactivity engine (04 §3). It parses the **conditioned** text (slots survive conditioning) into three run types and renders them **inline within the sentence** — a scaffold must read as a fill-in-the-blank sentence, *not* a form:

- **text-run** → `<span>` of prose.
- **free-text input-run** (`[[key:free:placeholder]]`) → inline, auto-sizing editable field; placeholder shows the hint; grows with content so the sentence reflows naturally.
- **select input-run** (`[[key:select:a|b|c]]`) → inline dropdown of the option list, sitting in the sentence.

Greyscale interaction states (no colour):

- **empty:** placeholder reads as a faint blank to fill (e.g. a subtle underline / lighter weight).
- **hover/focus:** quiet greyscale emphasis (underline thickening or a faint surface tint from the ramp) — enough to invite, never loud.
- **filled:** the user's text reads at full foreground weight, indistinguishable from prose, so the finished scaffold is a clean sentence.

**Fill behaviour (invariant):** editing a slot calls `fillSlot(key, value)` — **local state only, instant, no network** (04 §3.2). The renderer keeps a `fills` map keyed by slot `key`; displayed text reflects fills live. On submit, the interactor `serialize()`s runs+fills into the full answer string for `Lawson.answer`. **Never** fire the model on keystroke.

## One-pager / summary (G2 + G3)

`one-pager.tsx` — the conditioned summary rendered through the *same* slot-renderer. The last, highest-drift screen before the cleave (04 §4).

- Inline fills are instant/local, identical to scaffolds.
- An explicit **Refresh** control is the *only* thing that hits the model (`refreshSummary()`) — the single "model beat" on this screen. Style it as a quiet, deliberate action, not a primary CTA. **Never auto-refresh on keystroke** (04 §6).

## Wait / "thinking" state (G4)

No spec defines this, but the routing/agent-resolve step costs ~10s of real wall-clock (demo 0:15–0:25, "route resolves, agent resolves"). The monochrome law forbids a decorative spinner. **Locked treatment:**

- **Greyscale shimmer** where the next turn will land — a restrained skeleton/pulse, pure greyscale, reading as "composing." This is *functional* cover for real latency, so it's permitted under the motion policy (`01`).
- **Crossfading erudite status phrases** layered with it — short lines in the vocabulary of a well-read lawyer, not generic app copy. They narrate the warm-intake fiction and make the wait feel deliberate rather than slow. Crossfade every ~2s; centered; muted.

Example phrase vocabulary (tune for tone, keep it dignified, never cute):

> "Apprehending the particulars…" · "Conferring with the appropriate desk…" · "Marshalling the relevant questions…" · "Construing the matter…" · "Consulting the bench…" · "Weighing the most apposite line of inquiry…"

Risk to avoid: it must not read as a gimmick. The shimmer stays quiet; the phrases stay sparse and grammatical. The goal is "a thoughtful person is considering this," not "loading screen with jokes."

## Failure-mode safeties (carry from 04 §6)

- Renderer only ever parses **conditioned** text the `emit` gateway already validated for slot integrity — never raw/baseline during intake.
- Baseline stays server-side until `cleave()`; the intake surface never receives it.
- `localStorage` mirrors `sessionId` + rendered conditioned turns so a refresh mid-rehearsal doesn't lose the demo.
