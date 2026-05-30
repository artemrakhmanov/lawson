# Lawson

A warm legal intake (**Halo**) that, under the hood, runs every generated
output through **Lawguistics** — bending the *sound* of the text from mirroring
the user toward the voice of the matched lawyer. A hotkey (`Ctrl/⌘ + .`)
**cleaves** the screen into two synced panels — flat baseline vs. what the user
was actually reading — proving the bend with measured convergence numbers.

The full product is described in [`docspecs/`](./docspecs) (specs `00`→`04`,
plus `demo.md`). `docspecs/` is the source of truth; build in order 00 → 04.

## Run

```bash
npm run dev      # dev server — http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
```

Requires `ANTHROPIC_API_KEY` in `.env` (present). There is **no test or lint
script** configured. All model work runs server-side in Route Handlers; the
browser never holds a key.

> The Vercel AI SDK (`ai`, `@ai-sdk/anthropic`) is **not installed yet** — it
> lands when the harness starts (Spec 02). `services/ai/client.ts` is a stub
> until then.

## What's scaffolded (Session 0 — Spec 00 §8)

```
src/
  lib/types.ts                  # thin, provisional shared types (Lawyer + ConditionedPair seam)
  services/
    config.ts                   # MODEL_ID, drift-schedule placeholder, feature flags
    ai/client.ts                # the ONLY AI SDK importer (stubbed until Spec 02)
    session/store.ts            # canonical in-memory module-singleton Map
    signatures/
      index.ts                  # firm roster loader
      data/firm.json            # one firm, 5 lawyers across the practice areas
  features/example/             # reference for the dumb-component / interactor split
    example.tsx                 #   presentation only
    example.interactor.ts       #   all logic, exposes { state, actions }
```

## Locked until explicitly unlocked

- **Colour.** Strict monochrome (Spec 00 §4): black, white, greyscale only. No
  hue in any new markup unless a spec names it. (The theme tokens in
  `globals.css` are frozen as-is for now — including shadcn's default
  `--destructive`; do not restyle the theme.)
- **Data contracts.** Field-level shapes are deliberately provisional (Spec 00
  §5) — they crystallise once Lawguistics exists (Spec 03). Keep shared types
  thin; treat the conditioned unit as an opaque `{ baseline, conditioned }` pair.
