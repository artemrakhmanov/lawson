# UX Polish — 01 · Foundations

> Gate **G1** (see `00`). Type, monochrome reaffirm + hue-strip, spacing/measure, motion policy. This is the substrate every other note assumes. Delta over Spec 00 §4 — don't re-derive the monochrome law, apply it.

## Typography — geometric sans, no serif

**Locked:** keep the boilerplate Geist/Inter geometric sans throughout. No serif anywhere. Distinctiveness comes from restraint, spacing, and the cleave — not the typeface.

A calm, restrained scale (one thing on screen at a time, 00 §4):

- **Question (hero):** the largest type on the turn. One display weight (medium/semibold). This is the only thing competing for the eye.
- **Preamble / framing / reassurance:** smaller, lighter weight, muted-foreground. These are the "pure register" fields (02 §4) that carry the voice — they should read as quiet human speech around the question, never shouting.
- **Scaffolds / slots:** body weight; the inline inputs (see `02`) are the same size as the prose so a scaffold reads as a sentence, not a form.
- **Reveal data (LSM%, convergence labels):** small, possibly tabular/lining figures, sans. The numbers are precise instruments against the warm prose.

Generous leading on all prose (the intake should feel unhurried). Use the type scale consistently across intake **and** both cleave panels — identical typography on both sides is a cleave invariant (04 §5.2).

## Monochrome — absolute

Reaffirm Spec 00 §4: **no colour anywhere unless a spec explicitly names and unlocks one.** None has. Contrast is greyscale + weight + space only.

**Hue-strip task** (precondition, detail in `00`): remap the red `--destructive` (light + dark) and the blue dark `--sidebar-primary` onto the greyscale ramp. Dark mode is out of scope, so the `.dark` block may be removed, but the light `--destructive` red must go regardless. After: no hued oklch remains.

The per-turn drift cue (`04`, G9) is the one element that *might* want a functional colour. It does **not** get one — it stays greyscale unless the user explicitly unlocks a hue per 00 §4's escape hatch.

## Spacing & measure

- **One centered column** for the whole intake. Cap prose at a comfortable measure (~60–68ch) so questions and scaffolds read like a calm letter, not a wide app.
- **Generous vertical whitespace** between turn elements (preamble → question → framing → scaffolds → freeform). The screen should feel near-empty — one thought at a time.
- Establish a single spacing scale (Tailwind defaults are fine) and use it everywhere; the cleave panels reuse the exact same rhythm so rows align across the split.

## Motion policy

**Only the cleave animates.** That is the whole motion budget (00 §4, 04 §4). Everything else is still.

- **Turn-to-turn transitions:** default to near-instant (a cut). At most a very subtle, fast functional crossfade — never a decorative slide/bounce. When in doubt, cut. The cleave must remain the *only* moment that feels animated.
- **Wait/"thinking" state** (`02`): the shimmer is functional cover for real latency, not decoration — permitted, but kept quiet and greyscale.
- **Slide overlay** (`04`): fast fade only.

### Build-time decision to flag (for the implementer, not now)

No motion library is installed — only `tw-animate-css` is present. The cleave is the single non-trivial animation (a synced symmetric split, see `03`). **Recommendation:** implement with CSS keyframes/transitions (+ `tw-animate-css`) to keep the bundle light and the gesture controllable. Escalate to `framer-motion` *only* if the symmetric-split sync (two halves + a beat-delayed furniture fade) proves hard to choreograph in raw CSS. Decide at G5 build time, not before.
