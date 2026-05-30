# UX Polish — 00 · Readiness Gates

> **Status: staged, not started.** This directory plans the UX/UI polish phase — the *final* touch on Lawson. Polish is entirely downstream of the harness (01/02), Lawguistics (03), and the cleave plumbing (04). **Do not start any row below until its gate clears.** These notes are a *delta* over Spec 04 + `demo.md` (which already pin the hard UX); they cover the craft layer those specs leave open.

## How to read this file

Each polish work-item below has a **gate**: the specific upstream thing that must already exist. A future session that just finished a chunk of the harness can scan the "May begin once…" column and convert any row into a yes/no decision — *"I may start X now, because Y is true."* If the gate isn't met, the item is blocked; build the upstream thing first.

Dependency spine (everything polish sits on top of):

```
03 metrics+firm → 02 harness + stage-0 mock → 02 MVP UI → 03 stage-1 mock → 03 reveal stats → 04 cleave → [UX POLISH]
```

## Gate table

| # | Polish work-item | May begin once… | Spec refs | Note |
|---|---|---|---|---|
| G1 | **Foundations** — type scale, spacing/measure, monochrome hue-strip | shadcn theme present (done) **+** the residual hues stripped from `globals.css` (see below) | 00 §4; `globals.css` | `01` |
| G2 | **Intake surface** — opening / turn-view / scaffold layout | Stage-0 system runs end-to-end: harness loop emits turns (01; 02 §3–4) **+** `emit` returns the conditioned register (02 §5) **+** MVP dumb-components + interactor exist (02 §7) | 01; 02 §3–7 | `02` |
| G3 | **Slot-renderer micro-interactions** — inline free-text + select, fill = local/instant | `slots/encode.ts` typed tokens `parse()/serialize()` (`[[key:free:ph]]`, `[[key:select:a\|b\|c]]`) **+** interactor `fillSlot()` is local-only (no network) | 02 §6; 04 §3 | `02` |
| G4 | **Wait / "thinking" state** | interactor stage machine exposes a pending phase **+** routing actually costs wall-clock (`Triage.bootstrap` / `selectAgent`) | 01; 04 §2.1 | `02` |
| G5 | **Cleave choreography + synced panels** | `panel.tsx` is parameterized by register ("split-ready from day one") **+** both registers persisted per turn (02 §5) **+** `cleave()` reads baselines+stats with **no** generation | 04 §2.1, §5.1–5.2 | `03` |
| G6 | **Panel *contrast* tuning** (real divergence to show off) | Lawguistics **stage-1** (model-backed) is live — at stage-0 the two panels are *identical by design*, so there is nothing to tune | 02 §8; 03 §5–6 | `03` |
| G7 | **Reveal furniture** — signature-card, convergence-bar, lsm-badge | `convergence()` + `lsm()` computed and stored **+** signature `brief{label,moves,exemplarLine}` available, all exposed via the `cleave()` payload | 03 §4.4, §7 | `03` |
| G8 | **Slide overlay** | App shell renders (near-zero gate — overlay is paint-only, imports nothing from the harness); content comes from `demo.md`'s slide set (already written) | demo.md §3 | `04` |
| G9 | **Per-turn drift cue** (greyscale, optional) | drift-per-turn is exposed (`drift.forStage`, 03 §5.3) **+** the synced-rows layout from G5 exists | 03 §5.3; 04 §5.5 | `04` |

**Earliest-startable:** G1 (theme) and G8 (slide overlay) have the shallowest gates and can run almost immediately. Everything else waits on the harness/Lawguistics/cleave chain. The deepest gate is G6/G7 — they need Lawguistics stage-1 + reveal stats, the last things to land.

## The hue-strip (precondition for G1)

`globals.css` is ~95% monochrome (zinc neutral base, near-zero chroma). Three tokens carry a real hue and violate the monochrome law (00 §4). Strip them when G1 starts:

- `--destructive` (light, line ~66): `oklch(0.577 0.245 27.325)` — **red** → remap onto greyscale.
- `--destructive` (dark, line ~101): `oklch(0.704 0.191 22.216)` — **red**.
- `--sidebar-primary` (dark, line ~112): `oklch(0.488 0.243 264.376)` — **blue**.

Since dark mode is **out of scope** (see decisions), the `.dark` block can be deleted or left inert, but the light `--destructive` red must go regardless. After the strip, a reviewer scanning the theme should see no hue.

## Locked decisions (carried by all notes)

- **Typography:** geometric sans (Geist/Inter) throughout. No serif. → `01`
- **Cleave model:** **symmetric split** — one centered panel mitoses at its vertical centerline; both halves translate apart equally (left → baseline, right → conditioned). → `03`
- **Wait state:** greyscale shimmer **+** crossfading erudite status phrases (a well-read lawyer's vocabulary); no spinner, no generic app copy. → `02`
- **Scope IN:** core intake + cleave (always), slide overlay (`04`), per-turn drift cue (`04`).
- **Scope OUT:** dark mode (commit to light only), responsive/mobile (desktop-demo only).

## Phase exit criteria (maps to Spec 04 §8 Definition of Done)

The polish phase is *done* when, on the real (stage-1) conditioner:

- [ ] Seed → adaptive turns render one at a time, conditioned, with working inline free-text + select slots and a free-form option.
- [ ] One-pager fills instantly (local) and recalibrates only on explicit Refresh.
- [ ] The routing wait reads as a calm, deliberate "thinking" beat — not a spinner.
- [ ] `Ctrl/⌘ + .` cleaves into two synced panels (symmetric split): left flat, right voiced, same facts — diffable by eye in **<5s**.
- [ ] Furniture sequencing holds: panels animate first → ~3s silent hold → signature card + convergence bar + LSM% fade in a beat later.
- [ ] Signature card names the voice; convergence bar visibly shrinks toward 0; LSM% shows with citation.
- [ ] **Nothing generates at cleave time** — both panels come from stored registers.
- [ ] No hue anywhere; no decorative motion outside the cleave; localStorage rehearsal mirror intact.
