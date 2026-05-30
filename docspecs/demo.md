# Lawson — Demo (3 minutes)

> **What it is:** The 3-minute showcase. Lawson runs one continuous legal intake that quietly primes the audience, then a hotkey reveal exposes **Lawguistics** — the tool that was bending the *language* under the hood the whole time, measurably, toward the voice of the lawyer being matched. The reveal is the whole demo — protect it.

> **Single most important principle:** The audience experiences a pleasant intake, feels nothing unusual, and then discovers the *language itself* was working on them. The pivot isn't "surprise, a second product" — it's "you didn't notice the tool under the hood doing this to you, and here are the numbers proving it did."

> **The honest lead (say this out loud):** *"I've built — and badly over-engineered — a thing that 99% of people will never notice."* That's the hook. The over-engineering is the point.

---

## The personal thesis (this is the talk; the mechanism is just proof)

Rehearse these three beats. **Structure: lead with the joke, run a plain intake, pivot at the cleave, land the thesis at the close.** The thesis is *withheld* until they've seen the trick — you're a person demoing a tidy form right up until the screen splits.

**On the intake (open here — lead with the joke, withhold the thesis):**
> *"I've built — and badly over-engineered — a thing that 99% of people will never notice."* Beat. *"Let me show you. It's a legal intake."* Then just… run it. Type the seed, answer a question or two, sound a little unimpressed on purpose. Let the room think *that's it — a clean little intake.* Do **not** explain the idea yet. The whole open is a setup; the pivot is the cleave. (My cofounder's a lawyer; English isn't my first language — but save *why that matters* for the reveal. Right now you're just a person demoing a tidy form.)

**On Lawguistics (the turn — *now* the pivot, drop the thesis here):**
> Here's the thing under the hood. While you answered a few questions, the interface was quietly doing one extra thing: it started by sounding like *you*, and over the conversation it bent — gradually, below the threshold you'd notice — toward the voice of the specific lawyer you're being matched with. It's not faking warmth. It's a real, measured convergence. *(Now the personal turn:)* My cofounder's a lawyer, and English isn't my first language — so I'm a little obsessed with how other people command theirs. Lawyers have a *particular* signature: a way of sounding precise, or reassuring, or unafraid. By the time you'd meet that lawyer, they already feel familiar. We pre-installed it.

**The closing statement:**
> My worry is that as generative interfaces flatten everything to the same voice, we lose that magic — the actual craft in how a good lawyer speaks. And I think that craft is part of *access* to justice: a lawyer who sounds less scary, less intimidating, is a lawyer more people can actually approach. So this is a small argument for keeping the human signal. We're in an industrial revolution — fine. Let's not use it to make everything average. Let's explore weird ideas, solve problems nobody's solved, and build cool shit that keeps the magic in.

> **One-breath version (if you only get one line):** *"It's a legal intake that secretly learns to speak like your future lawyer — so meeting them feels familiar before you've met. I over-engineered the invisible part on purpose."*

---

## The spine (3 minutes)

| Time | Beat | On screen | What you say / do |
|------|------|-----------|-------------------|
| **0:00–0:15** | Honest lead + open | Halo intake, clean, monochrome | Lead with the **joke** ("over-engineered a thing 99% won't notice"), then "let me show you — it's a legal intake." Don't pitch the idea. Fire **Slide 1** only if you want a held beat; otherwise keep it bare. |
| **0:15–0:25** | Seed + routing | Type the seed; route + agent resolve | "It already figured out what kind of matter this is — and *who* on the team fits." Don't dwell (~10s). |
| **0:25–0:55** | The adaptive intake | Questions → fill-in-the-blank answers → live one-pager | Move briskly. Note the *suggested answers you fill in-line* ("this isn't a chatbot wall of text"). A specialist hand-off if it happens reads as polish. Outputs feel warm, natural. *Lawson is silently calling Lawguistics.* |
| **0:55–1:00** | Set the trap | The one-pager on screen | "Feels like a pleasant little intake, right? Watch the language." Hand on the cleave hotkey. |
| **1:00** | **THE CLEAVE** | UI splits into two synced panels | Press `Ctrl/⌘ + .`. **Left = flat baseline. Right = what you were actually reading.** Then *say nothing for ~3 seconds.* |
| **1:00–1:35** | The reveal lands | Side-by-side diff + numbers fade in | Fire **Slide 2** (Lawguistics intro) and deliver the **Lawguistics paragraph**. "Same facts. Same answers. The *sound* was bending — toward this lawyer." Point at the **convergence bar** shrinking and the **LSM %**. |
| **1:35–2:30** | The mechanism | Signature card + drift across turns | Walk the tells from the signature card: cadence, length, directness, the lawyer's characteristic moves. Show drift turn-by-turn: mirrored *you* first, ended in the *lawyer's* voice. This is Lawguistics — the tool Lawson used the whole time. Fire **Slide 3** (the science) if a judge wants grounding. |
| **2:30–3:00** | The thesis | Close | The **closing statement**. Fire **Slide 4** (the closing line) and land it. |

---

## In-app slide overlay (build this — it's the presentation chrome)

Slides live *inside* the app so you never alt-tab. A separate hotkey namespace from the cleave.

### Interaction
- **`Option/Alt + Ctrl + <number>`** toggles a full-screen overlay rendering the indexed slide (large text and/or image) on top of the live app.
- Same combo again, or **`Esc`**, dismisses it. The app underneath is untouched — the overlay **never blocks, mutates, or advances** the harness/cleave state. You can dismiss a slide and the intake is exactly where you left it.
- Distinct from the cleave hotkey (`Ctrl/⌘ + .`) so they can't collide.
- Monochrome: black or white field, large type, optional centered image. No transitions beyond a fast fade. Deliberately plain — the slide is a held thought, not a moment.

### Build notes (for Spec 04 / Claude Code)
- A top-level `<SlideOverlay/>` layer above the whole app, listening for the chord, holding `activeSlide: number | null`.
- Slides are a static indexed array (`slides[1..n]`), each `{ kind: "text" | "image" | "text+image", body, src? }`. Pre-authored, no generation.
- Pure presentation; imports nothing from the harness. It reads no app state and writes no app state — it only paints over.
- Keyboard handler guards against firing while typing in an input (require the modifier chord, not bare numbers).

### Starter slide set (edit the copy freely)
1. **Open (optional held beat).** Just the joke, big: "I over-engineered a thing 99% of people will never notice." *(No thesis here — that's withheld for the close.)*
2. **Lawguistics.** "It starts sounding like *you*. It ends sounding like *your lawyer*. You never feel the bend."
3. **The science.** "Linguistic Style Matching is real, measurable, and undetectable. Convergence builds rapport. We just pointed it at someone you haven't met yet." *(Citations: Pennebaker / Ireland — see `references.md`.)*
4. **Close.** "Not a renaissance — an industrial revolution. Don't use it to make everything average. Keep the magic in." *(or your preferred sign-off)*
5. **(Spare)** Access to justice: "A lawyer who sounds less scary is a lawyer more people can reach."

> Suggested fire points are marked in the spine (Slides 1/2/3/4). They're suggestions — fire ad-lib if the room pulls you somewhere.

---

## Staging notes

- **Pick your seed prompt deliberately.** It steers the route (real classification, controlled outcome) and seeds the client voice Lawguistics mirrors first. Rehearse one prompt that reliably lands the **hero lawyer** (the boldest signature — see Spec 03).
- **The cleave is a magic-trick gesture.** Practice it. Instant, intentional — a reveal, not a UI state change.
- **Three seconds of silence after the cleave.** The diff must hit before you explain it. Don't step on your own reveal. The panels animate first; the signature card and numbers fade in a beat later.
- **Narrate the voice, not the code.** Point at the *signature* ("this lawyer leads with risk, short sentences, no hedging") and the *numbers* ("watch the gap close"). Avoid model/architecture talk on stage.
- **Let the numbers do the credibility work.** The convergence bar is the felt number; the LSM % is the one from the papers. You don't need to explain the math — just that it's measured, not vibes.

---

## Failure-mode safeties

- **Never generate on the cleave.** Both registers for every turn are pre-rendered and stored during intake (Spec 02 §5 / Spec 03); the hotkey only unhides. No live-generation gamble at the climax.
- **Subtlety risk:** if the contrast reads as "nothing changed," the fix is upstream — bolder hero signature, flatter baseline, wider drift spread (Spec 03 §5.3) — not on-stage. **The contrast is the product**, and it's measured, so tune it before the room sees it.
- **Routing wobble:** routing is real and live, but the seed prompt controls it; worst case, fall back to one fixed route (Spec 00 §7).
- **Time overrun:** the 0:25–0:55 intake is the compressible part — drop to two turns and a fixed route if slow. **Never compress 1:00–2:30** — that's the payload.
- **Slide overlay must be inert toward app state.** If a slide ever advances or resets the intake, that's a bug — it's paint-only.

---

## What's real vs staged (honest with yourself, not the audience)

- **Real & live:** routing/matching, the swarm + triage hand-offs, Lawguistics conditioning, the computed convergence + LSM numbers, the cleave.
- **Pre-computed (not faked — pre-rendered for safety):** the flat baseline panel, produced alongside the live conditioned output and stored canonically.
- **Staged for control:** the seed prompt (chosen to land the hero lawyer reliably); the slide copy.

A legitimate live demo of a real, *measured* mechanism — engineered so the reveal doesn't depend on on-stage generation luck.

---

## The one-sentence pitch (for the room)

**Lawson** runs a legal intake that quietly learns to speak like your future lawyer — mirroring you first, then bending, measurably, toward their voice — so that meeting them feels like meeting someone you already know. Over-engineered on purpose, because the invisible part is the point.
