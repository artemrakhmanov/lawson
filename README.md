<!-- Prolonged wordmark logo, tucked into the top-right corner -->
<a href="https://rakhmanov.xyz">
  <img align="right" width="110" alt="xyz" src="https://cp0uhtgvekcrgsj5.public.blob.vercel-storage.com/brand/rakhmanov.webp" />
</a>



<!-- Full-width 16:9 hero -->
<img width="100%" alt="LAWSON — the legal intake that learns to speak like your future lawyer" src="https://cp0uhtgvekcrgsj5.public.blob.vercel-storage.com/hacks/lawson%25401x.webp" />

---
<p/>

<p align="center">
  A warm legal intake that <strong>secretly learns to speak like your future lawyer</strong>
</p>

---

### Core spec

| | |
|---|---|
| **What** | A legal intake (**Halo**) that mirrors *you* first, then bends — below the threshold you'd notice — toward the measured voice of the lawyer you're matched with. By the time you'd meet them, they already sound familiar. |
| **Why** | As generative interfaces flatten every voice to the same average one, we lose the craft in how a good lawyer speaks. Beyond simply overengineering for imperceptible things, there are arguments that linguistic style matching that humans do unconciously is coreleated with rapport building. |
| **The cleave** | One hotkey (`Ctrl/⌘ + .`) splits the screen into two synced panels — flat **baseline** (left) vs. **what you were actually reading** (right). Same facts in both; only the *sound* differs. |
| **Honest take** | I've built and badly over-engineered a thing that 99% of people will never notice |
| **Harness** | **Lawson** runs the turn loop; **Triage** classifies the matter and routes to a bench agent; **Lawguistics** bends the sound. Every screen string passes through one `emit` gateway that conditions it and stores *both* registers — provable from a single file. |
| **Numbers** | Convergence (normalised Euclidean → 0) and LSM% (Pennebaker function-word formula) are **computed, not estimated** — the same naive splitter measures client text and lawyer corpus. Honestly: the implementation is a proof of concept, as the actual performance has a lot of errors. |
| **Stack** | Next.js 16 · React 19 · Vercel AI SDK · Anthropic Claude · zod · Tailwind v4 · strict monochrome (hit me up to rant about abuse of colour in UI) |
| **Constraints** | Solo build · idea researched the night before (**23:00 → 03:00**), walked in spec-first · **~5 h** to build & ship (git: 11:26 → 16:33). |

### Lawguistics

Lawguistics is the part that changes how the text sounds. It rests on Linguistic Style Matching (LSM) — the finding (Pennebaker, Ireland) that people unconsciously fall into each other's use of function words (pronouns, articles, prepositions, conjunctions), and that how much they do tracks rapport.

The method, plainly:

1. **Measure.** A naive splitter counts function-word usage and a little cadence (sentence length, directness) in two places — the client's own words and each lawyer's writing sample — and turns each into a style vector.
2. **Pick a target.** The matched lawyer's vector is the destination; the client's vector is the start.
3. **Move.** Each generated reply is rewritten so its style sits part-way between the two — near the client early in the conversation, near the lawyer by the end (the drift schedule). Only the sound moves; the facts stay fixed.
4. **Measure again.** Convergence is the distance from the reply's style to the lawyer's, normalised so 0 means matched; LSM% is the standard function-word formula. Both are read off the actual text, so the reveal shows real numbers, not estimates.

That's the whole idea: measure two styles, rewrite the output to travel from one toward the other, and check the distance.

### How it works

Anything that produces screen text returns **both** registers and goes through one choke point ([`src/lib/services/harness/emit.ts`](src/lib/services/harness/emit.ts)) — `Lawson` is its only caller, `emit` is the only caller of `Lawguistics.condition`. Four guarantees hold there, in code, before the UI ever sees a word:

| Guarantee | Enforced by |
|---|---|
| Substance is register-invariant — panels differ only in *sound*, never facts | LLM-as-judge fidelity gate; falls back to baseline on any semantic drift |
| Slot tokens survive conditioning byte-for-byte | `emit` validates `[[key:…]]` tokens; falls back to baseline on mismatch |
| Voice bends gradually, not abruptly | a per-stage **drift** schedule — mirrors you early, lands the lawyer late |

### Run it

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
npm run dev      # http://localhost:3000
npm test         # slots, emit, triage, loop, agents
```

Lawguistics runs under Node's native TS (≥ 22.6): `node --test --env-file=.env src/lib/services/lawguistics/metrics.test.ts`.

Design docs: [`docspecs/00-master-order.md`](docspecs/00-master-order.md) (the build plan) · [`docspecs/demo.md`](docspecs/demo.md) (3-min showcase) · [`docspecs/lawguistics`](docspecs/lawguistics) · [`docspecs/ux`](docspecs/ux)

---

<a href="https://rakhmanov.xyz">
  <img align="left" width="110" alt="xyz" src="https://cp0uhtgvekcrgsj5.public.blob.vercel-storage.com/brand/rakhmanov.webp" />
</a>
