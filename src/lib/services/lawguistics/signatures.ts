// lawguistics/signatures.ts — runtime loaders over the frozen, committed data.
// Reads firm.json (roster — corpus stripped when exposing Lawyer) and
// signatures.json (per-lawyer signature + frozen ranges + roster-median).
// The MATCHING DECISION (which lawyer) is Lawson's job; this only resolves a
// chosen id → its signature. RANGES/ROSTER_MEDIAN are consumed by the Stage-3
// wire-up of condition()/stats over the frozen normalisation.

import type { Lawyer, MetricVector, MetricRanges, VoiceSignature } from "./types";
import firmData from "./data/firm.json" with { type: "json" };
import sigData from "./data/signatures.json" with { type: "json" };

type SignatureFile = {
  ranges: MetricRanges;
  rosterMedian: MetricVector;
  signatures: VoiceSignature[];
};
const sig = sigData as unknown as SignatureFile;

// Frozen so normalisation (→ convergence + LSM) is reproducible across runs.
export const RANGES: MetricRanges = sig.ranges;
export const ROSTER_MEDIAN: MetricVector = sig.rosterMedian;

const sigById = new Map(sig.signatures.map((s) => [s.lawyerId, s]));

// corpus is feedstock only — the app-facing Lawyer type has no corpus.
function stripCorpus(l: (typeof firmData)["lawyers"][number]): Lawyer {
  const { corpus: _corpus, ...rest } = l;
  return rest as Lawyer;
}

export function getLawyer(id: string): Lawyer {
  const l = firmData.lawyers.find((x) => x.id === id);
  if (!l) throw new Error(`Lawguistics.getLawyer: unknown lawyer "${id}"`);
  return stripCorpus(l);
}

/** Roster sans corpus — what Lawson's matching reads (D6 swaps the stub roster). */
export function listLawyers(): Lawyer[] {
  return firmData.lawyers.map(stripCorpus);
}

export function getSignature(lawyerId: string): VoiceSignature {
  const s = sigById.get(lawyerId);
  if (!s) throw new Error(`Lawguistics.getSignature: no signature for "${lawyerId}"`);
  return s;
}

/** The chosen lawyer's signature (the matching itself is Lawson's). */
export function matchTarget(lawyerId: string): VoiceSignature {
  return getSignature(lawyerId);
}
