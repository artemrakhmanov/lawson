# Lawson Harness — Contracts (the frozen surface)

> **Scope:** the type/interface surface the agent harness *emits* and *consumes*. This is the single source of truth all three teams build to. It exists so the harness, the Lawguistics workers, and the Spec 04 UX worker can build in parallel against fixed shapes.
>
> **Per Spec 00 §5, field names stay provisional until consumed** — but the *intent and the seam boundaries* below are the contract. Where a shape is still genuinely open, it is marked. Two tiers:
> - **Harness-owned, frozen** — I author and own these; other teams treat them as fixed.
> - **Cross-team** (§2) — shared files owned by the voice lane. Originally PROPOSED pending the Lawguistics ack (B2); **now acked and frozen** by the master order (R1) — see the resolution note below.
>
> **Resolution status:** the cross-team seam (§2) is now **acked and frozen** by [`../00-master-order.md`](../00-master-order.md) (R1–R7), which is authoritative where this doc differs. The R4-shared types (`Stage`, `Lawyer`, `PracticeArea`, `MetricVector`, `VoiceSignature`, `ConditionResult`, `MetricRanges`) are **canonical in `lawguistics/types.ts`**; the harness imports/re-exports them rather than redeclaring. Shapes below marked "(re-export)" are owned by the voice lane.

All paths assume the `@/*` → `src/` alias. Harness home: `src/lib/services/harness/`.

---

## 1. Harness-owned, frozen

### 1.1 Stage

The lifecycle marker every emitted unit carries. `emit` reads it to ask Lawguistics for the right drift; agents/triage tag the turns they compose. Default turn budget N ≈ 3 (tunable in `config.ts`), so the default ladder is:

```ts
export type Stage = 'opening' | 'q1' | 'q2' | 'q3' | 'summary';
```

> **Shared signal, harness-frozen labels.** The *labels* are harness-decided (agents tag, `emit` reads) and identical to `lawguistics/types.ts`. Per **R4** the TS type physically lives in `lawguistics/types.ts` (one definition both lanes import); the harness re-exports it. The *drift value per stage* is **not** defined here — that is a Lawguistics voice-tuning decision (see §2.2 and B3). If the turn budget changes, the `q*` ladder extends; keep `opening` first and `summary` last.

### 1.2 Slot encoding (`harness/slots/encode.ts`)

One regex-delimited inline token syntax, used identically in scaffolds and the summary. Two types in v1:

```
free-text:  [[key:free:placeholder text]]
select:     [[key:select:option a|option b|option c]]
```

- `key` is `[a-z0-9_-]+`, stable within a single turn so a filled value can be read back.
- No nesting, no other types in v1. Any future type is a separate spec extension.
- **Conditioning must return these tokens byte-identical** (B2/B3 invariant). `emit` validates and falls back to baseline on violation.

Parsed form — an ordered run list:

```ts
export type Run =
  | { kind: 'text'; text: string }
  | { kind: 'slot'; key: string; type: 'free'; placeholder: string }
  | { kind: 'slot'; key: string; type: 'select'; options: string[] };

export function parse(text: string): Run[];
export function serialize(runs: Run[]): string;   // runs → token text (round-trips parse)
```

Filling slots with user values and folding them into a final answer string is a **caller** concern (the interactor / tester), not `encode.ts`. `encode.ts` is pure, zero-dep, UI-free.

### 1.3 Lawyer & roster (re-export — canonical in `lawguistics/types.ts`, R4)

The shape Triage matches against. Real data (`firm.json`) is Lawguistics-owned (B1); the harness ships a stub roster behind this exact shape. Per **R4** the `Lawyer`/`PracticeArea` types are **canonical in `lawguistics/types.ts`** (A2) — the harness re-exports them; it does not redeclare. Note **PascalCase** `PracticeArea` (was lowercase `'criminal'` in an earlier draft — now aligned to the voice lane).

```ts
// from lawguistics/types.ts (R4):
export type PracticeArea = "Criminal" | "RealEstate" | "Commercial";
export type Lawyer = {
  id: string;
  meta: { name: string; title: string };
  practiceArea: PracticeArea;
  summary: string;            // prose Triage matches the evolving matter against
  hero?: boolean;             // exactly one true — the demo's bold-voice target
};
// harness-local convenience alias:
export type Roster = Lawyer[];
```

### 1.4 Agents

```ts
export type AgentId =
  | 'claim-quant' | 'merits-analyst'      // practice-agnostic analysts
  | 'criminal' | 'real-estate' | 'commercial';  // practice specialists

export interface Agent {
  id: AgentId;
  composeTurn(input: { caseState: CaseState; transcript: Turn[] }): Promise<RawTurn>;
}
```

Agents are **stateless** — they receive state, return substance, persist nothing.

### 1.5 RawTurn (substance, pre-conditioning)

What an agent emits. Surface fields carry *voice* (register-rich); functional fields carry *facts*. The substance invariant holds across both: surface is tone, never new information.

```ts
export type RawTurn = {
  agentId: AgentId;
  stage: Stage;
  preamble?: string;            // surface — warm lead-in (register-rich)
  question: string;             // functional — the single ask
  framing?: string;             // surface — optional context/motivation
  scaffolds: string[];          // exactly 3, each plain prose with [[slot]] tokens
  reassurance?: string;         // surface — optional closing line
  freeform: { placeholder: string };  // always present — "say it your own way"
};
```

### 1.6 RawSummary (the one-pager substance)

Each field is register-bearing and slot-bearing, so `emit` walks and conditions each independently.

```ts
export type RawSummary = {
  stage: 'summary';
  matterType: string;
  keyFacts: string;   // slot-bearing prose
  parties: string;    // slot-bearing prose
  theAsk: string;     // slot-bearing prose
};
```

### 1.7 CaseState (the only global state; Triage owns it)

```ts
export type Turn = { turnId: string; agentId: AgentId; stage: Stage; question: string; answer?: string };

export type CaseState = {
  sessionId: string;
  seed: string;
  transcript: Turn[];
  matter: { hypothesis: string; confidence: number };   // 0..1
  activeSpecialist: AgentId | null;
  lawyerMatch: { lawyerId: string; rationale: string };  // live — may move on recalibrate
  turnsTaken: number;
  turnBudget: number;
};
```

### 1.8 ConditionedView / ConditionedSummary (what the UI receives)

After `emit`, every surface/functional field is replaced by its **conditioned** register; the baseline pair is persisted server-side and never sent during intake.

```ts
export type ConditionedView = {
  kind: 'turn';
  turnId: string;
  agentId: AgentId;
  stage: Stage;
  preamble?: string;
  question: string;
  framing?: string;
  scaffolds: string[];          // conditioned, slot tokens intact
  reassurance?: string;
  freeform: { placeholder: string };
};

export type ConditionedSummary = {
  kind: 'summary';
  turnId: string;
  matterType: string;
  keyFacts: string;
  parties: string;
  theAsk: string;
};
```

### 1.9 Triage (`harness/triage.ts`)

```ts
export const Triage: {
  bootstrap(seed: string): Promise<CaseState>;
  selectAgent(s: CaseState, turnsRemaining: number): Promise<AgentId>;
  recalibrate(s: CaseState, answer: string): Promise<CaseState>;   // may move matter + lawyerMatch
  composeSummary(s: CaseState): Promise<RawSummary>;
};
```

### 1.10 Lawson (`harness/loop.ts`) — the orchestrator, the only `emit` caller

```ts
export const Lawson: {
  start(seed: string): Promise<ConditionedView>;
  answer(sessionId: string, turnId: string, payload: AnswerPayload): Promise<ConditionedView | ConditionedSummary>;
  refreshSummary(sessionId: string, fills: Record<string, string>): Promise<ConditionedSummary>;
};

export type AnswerPayload =
  | { kind: 'scaffold'; index: number; fills: Record<string, string> }
  | { kind: 'freeform'; text: string };
```

### 1.11 emit (`harness/emit.ts`) — the gateway, the only `Lawguistics.condition` caller

```ts
export function emit(sessionId: string, raw: RawTurn | RawSummary): Promise<ConditionedView | ConditionedSummary>;
```

Walks each register-bearing field → `Lawguistics.condition(field, target, drift)` → validates slot preservation → persists `{conditioned, baseline}` to the store → returns the conditioned view. `target` and `drift` are resolved here from `caseState.lawyerMatch` and `raw.stage`.

### 1.12 Session store (`session/store.ts`) — canonical server-side state

```ts
type StoredField = { conditioned: string; baseline: string };
// R5: stats are populated by emit only once Lawguistics is real (Phase D); absent at stage-0.
type StoredTurn = { turnId: string; stage: Stage; fields: Record<string, StoredField>; stats?: { convergence: number; lsm: number } };
type SessionRecord = { caseState: CaseState; turns: StoredTurn[] };

export const store: {
  create(seed: string): SessionRecord;
  get(sessionId: string): SessionRecord | undefined;
  putCaseState(sessionId: string, s: CaseState): void;
  putTurn(sessionId: string, t: StoredTurn): void;
};
```

In-memory module-singleton `Map`. Holds **both** registers per field — produced during intake, never at cleave time.

### 1.13 Interactor surface (consumed by the UI; harness-tester in P8, Halo in Spec 04)

```ts
start(seed: string): void;
answer(payload: AnswerPayload): void;
fillSlot(key: string, value: string): void;   // LOCAL only — no network
refreshSummary(): void;                        // explicit model beat
```

No `cleave`/`uncleave` here — that is Spec 04, out of the harness lane.

### 1.14 Route handlers (`src/app/api/**`, server-only)

Map 1:1 to `Lawson` methods; own all model work; return the **conditioned** view only during intake. Baseline stays in the store until the cleave (Spec 04) reads it.

```
POST /api/lawson/start            { seed }                     → ConditionedView
POST /api/lawson/answer           { sessionId, turnId, payload }→ ConditionedView | ConditionedSummary (+ done)
POST /api/lawson/refresh-summary  { sessionId, fills }         → ConditionedSummary
GET  /api/session/[id]            —                            → { turns: StoredTurn[]; signature: VoiceBrief }  // R6
```

> **R6 — the cleave read route.** `GET /api/session/[id]` is a **pure read** (store + `getSignature().brief`); **no model call**. It returns both registers per field + persisted `stats` so the cleave (Spec 04) can unhide baselines and draw reveal furniture without generating. Built by the **UX lane (U5)**, not the harness phases — listed here because it completes the contract surface.

---

## 2. Cross-team seam — ACKED & FROZEN (was PROPOSED; resolved by R1)

> These are the seam. **Owned by the voice lane** (`lawguistics/index.ts` + `types.ts`), shipped first as build row **A2**; the harness consumes them and never edits `lawguistics/**` (R2). The signature below is the **resolved** form — it supersedes the earlier `Target = { lawyerId }` proposal.

### 2.1 The `Lawguistics` interface (`services/lawguistics/index.ts`) — R1

```ts
export const Lawguistics: {
  condition(text: string, target: VoiceSignature, drift: number, origin?: MetricVector): Promise<{ conditioned: string; baseline: string }>;
  drift: { forStage(stage: Stage): number };
  matchTarget(lawyerId: string): VoiceSignature;   // emit resolves the target through this
  // …measure / convergence / lsm / getSignature / getLawyer / judgeFidelity — see lawguistics/stage-0-contract.md
};
```

Contract the harness depends on:
- `condition` takes a **resolved `VoiceSignature`** (not `{ lawyerId }`). `emit` calls `Lawguistics.matchTarget(caseState.lawyerMatch.lawyerId)` to get it, then passes it — omitting `origin` (defaults to `ROSTER_MEDIAN` inside Lawguistics).
- Returns **both registers of the same substance** — facts identical, only *sound* differs.
- **Slot tokens returned byte-identical.** `emit` validates; violation → fall back to baseline.
- `text` may be any single register-bearing field (may contain slot tokens).

### 2.2 Resolution & drift values — Lawguistics-owned

- **R1 resolved:** `target` is the resolved `VoiceSignature`; the harness no longer passes a bare `{ lawyerId }`. `VoiceSignature`/`MetricVector` shapes are canonical in `lawguistics/types.ts` (R4); the harness imports them.
- **Stage-0 ignores `target`, `drift`, and `origin`** (identity passthrough), so the harness is unblocked regardless; `matchTarget`/`getSignature` return a frozen **neutral signature** at stage-0 (R3) so emit's resolve call works.
- The per-stage **drift values** (e.g. `{opening:0.15, q1:0.4, …, summary:1.0}`) are **authored by the Lawguistics team** in `drift.ts`. Stage-0 `drift.forStage` returns `0`.

---

## 3. Field-name provisionality (Spec 00 §5)

The exact field *names* in `RawTurn`/`RawSummary`/`ConditionedView` may shift once Lawguistics finalizes which fields it conditions. What is **frozen**: the seam boundaries (who calls whom), the slot syntax, the `Stage` labels, the `Lawguistics.condition` signature shape, and the invariant that every renderable field carries both registers. Build to the boundaries; treat the leaf names as ~90% stable.
