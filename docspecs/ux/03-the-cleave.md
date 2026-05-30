# UX Polish — 03 · The Cleave

> Gates **G5** (choreography + synced panels), **G6** (contrast tuning), **G7** (reveal furniture). The payload — the magic-trick moment. Delta over Spec 04 §5 + `demo.md` (the cleave's spine); this note pins the *choreography* those leave open. The hard invariants below are restated because they are load-bearing, not optional.

## The cardinal invariant (restate, never relax)

**Nothing generates at cleave time.** Both registers for every turn + the summary, plus the convergence series and LSM%, were produced and persisted during intake (02 §5). `cleave()` is a **read + a state flip** — pull baselines/stats from the store (`GET /api/session`), flip `stage → "cleaved"`, animate. Any design that needs model output at reveal time is wrong (04 §1, §5.1; demo.md). Baseline never reaches the client until this moment.

## Trigger

Hotkey `Ctrl/⌘ + .` — chosen to not misfire. Distinct from the slide-overlay chord (`04`). `cleave()` calls the interactor's read-and-flip; `uncleave()` reverses.

## The symmetric split (locked model)

The single centered `panel.tsx` the user was reading **mitoses at its vertical centerline**; both halves translate apart equally — the left half slides left and becomes the **baseline** panel, the right half slides right and becomes the **conditioned** panel.

```
before:              [   reading   ]

during:          [ baseline ] | [ conditioned ]      ← splitting from center

after:       [ baseline ]   ←|→   [ conditioned ]
              (flat)                (what they read)
```

- **Left = baseline** (flat/administrative). **Right = conditioned** (what they were actually reading). (04 §5.2)
- Built **split-ready from day one** (G5 gate): the intake panel is *already* a `panel.tsx` parameterized by register; the cleave duplicates it with the other register and turns on sync. The reveal is not a new screen — it's the same panel, doubled.
- **Synced row-for-row:** each turn occupies the same vertical slot on both sides so the eye diffs turn-by-turn. **Synced scroll.** Identical layout/typography on both sides — **the only difference between the panels is the language** (monochrome law: contrast is greyscale/typographic/linguistic, never colour).

## Choreography & timing (load-bearing)

The sequence is the trick. Get it wrong and the reveal lands flat.

1. **Mitosis first, fast and clean.** One gesture, ~400–600ms, ease-out. It should feel "instant and intentional — a magic-trick gesture, not a UI state change" (04 §5.3). No bounce, no stagger, no decoration. The two panels arrive settled.
2. **~3 seconds of silence.** Let the diff sit before *anything* else appears — no narration, no numbers, no furniture. The contrast must hit the eye before it's explained (04 §5.3; demo.md §4). This pause is deliberate and must be honoured in the build (don't fade furniture in early).
3. **Furniture a beat later.** *Then* the signature card + convergence bar + LSM badge fade in — softly, not simultaneously with the panels. Panels animate first; furniture arrives after the hold.

This ordering is the exact thing `demo.md` says never to compress (1:00–2:30 is the payload).

## Reveal furniture (G7)

All fed by stored stats (03 §7). Greyscale only.

- **`signature-card.tsx`** — the matched lawyer's `brief.label`, `brief.moves`, and `exemplarLine`. Names the tells the audience just *felt*: "this is the voice the right side was bending toward." Quiet, authoritative layout — it's the answer to "bending toward *what*?"
- **`convergence-bar.tsx`** — the normalised-Euclidean convergence-to-0 series, **one bar per turn**, visibly **shrinking across turns** (proof the conditioned output measurably approached this lawyer's style). Greyscale fill; emphasis via **length and weight, not hue**. The intuitive "watch the gap close" number.
- **`lsm-badge.tsx`** — "Linguistic Style Match: NN%" with citation (Niederhoffer & Pennebaker; Ireland & Pennebaker). One number people *feel* (the bar), one *from the papers* (the badge).

## Contrast tuning (G6)

The two panels must look meaningfully different in *language* — and the difference must be **real** (it's measured), never faked in the UI.

- At Lawguistics **stage-0** the panels are *identical by design* (identity mock) — correct; it proves the plumbing. There is nothing to tune yet.
- At **stage-1** they diverge. If the contrast doesn't pop, the fix is **upstream** — bolder hero signature / flatter baseline / wider drift spread (03 §5.3) — **not** UI trickery (04 §6). The UI shows the contrast honestly; it does not manufacture it.

## Failure-mode safeties (04 §6)

- Pre-render guarantee: the UI never asks for conditioning at cleave time; it only reads stored registers.
- Broken-token safety: panels render conditioned text the gateway already validated; baseline likewise comes pre-validated from the store.
- Subtlety risk → fix upstream (see G6), never with colour or motion gimmicks.
