# UX Polish — 04 · Slide Overlay & Drift Cue

> Gates **G8** (slide overlay) and **G9** (per-turn drift cue). Both are *in scope* but secondary to the intake+cleave core. Delta over `demo.md` §3 (slide overlay) and Spec 04 §5.5 (drift cue).

## Slide overlay (G8)

In-app presentation slides so the presenter never alt-tabs. Lowest gate in the whole phase — paint-only, imports nothing from the harness, so it can be built almost as soon as the app shell renders.

**Interaction:**

- `Option/Alt + Ctrl + <number>` toggles a full-screen overlay showing the indexed slide.
- Same chord again, or `Esc`, dismisses.
- **Distinct from the cleave hotkey** (`Ctrl/⌘ + .`) so the two can never collide.

**Inertness (hard requirement):** the app underneath is untouched — the overlay **never blocks, mutates, or advances** the harness or cleave state. It is pure presentation: reads/writes no app state, paint-only. If it ever advances or resets intake, that's a bug (demo.md §3).

**Structure:** a top-level `<SlideOverlay/>` mounted above the whole app, holding `activeSlide: number | null` and listening for the chord. Slides are a static indexed array, each `{ kind: "text" | "image" | "text+image", body, src? }`. The keyboard handler must **guard against firing while typing** — require the modifier chord, never bare number keys (a user filling a slot must not summon a slide).

**Visual style:** monochrome — a black *or* white field, large type, optional centered image. No transitions beyond a fast fade. Deliberately plain — "the slide is a held thought, not a moment" (demo.md §3). Same type family as the rest of the app (`01`).

**Content:** wire `demo.md`'s starter slide set (open / Lawguistics / science / close / spare). Copy lives in `demo.md`; the overlay just renders it.

## Per-turn drift cue (G9 — optional)

A small per-turn drift indicator (0→1) along the synced rows of the cleave, showing the bend ramping mirror→lawyer across the intake (04 §5.5). It complements the convergence bar by locating the bend *per row*.

- **Greyscale only.** This is the single element that might tempt a functional colour — it does **not** get one. Per 00 §4 a hue must be explicitly named/unlocked, and none is. Render the 0→1 ramp as greyscale intensity / length / weight.
- Requires the synced-rows layout (G5) and drift-per-turn exposed (`drift.forStage`, 03 §5.3).
- **First cut-line if time is short.** The convergence bar already tells most of this story (04 §5.5); drop this before dropping anything core. Build it last.
