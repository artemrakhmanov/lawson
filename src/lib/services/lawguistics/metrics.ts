// lawguistics/metrics.ts — Stage 1a. The deterministic measurement spine.
// Pure TS: no AI, no network, no fs. Imports only ./types.
//
// THE INVARIANT: the naive splitter below is used for BOTH client text and the
// lawyer corpus. That single shared path is what makes the convergence/LSM
// distances meaningful — they compare like with like (Spec 03 §3.1, §3.4).

import { METRIC_KEYS } from "./types.ts";
import type { MetricVector, MetricRanges, MetricKey } from "./types.ts";

// ── Closed-set word lists (hardcoded constants — §3.3) ──────────────────────
const HEDGES = [
  "may", "might", "could", "perhaps", "possibly", "generally", "typically",
  "arguably", "relatively", "somewhat", "likely",
] as const;
// multi-word hedges matched against the raw lowercased text
const HEDGE_PHRASES = ["tend to", "it seems"] as const;

const IMPERATIVE_STARTERS = [
  "call", "send", "file", "do", "get", "bring", "stop", "sign", "review",
  "check", "tell", "give", "keep", "make", "take", "avoid", "ensure", "note",
] as const;

// five closed-set function-word categories — each ratio = matches / words
const FN_PRONOUN = [
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "its", "our", "their", "mine", "yours", "theirs",
  "this", "that", "these", "those",
] as const;
const FN_ARTICLE = ["a", "an", "the"] as const;
const FN_PREP = [
  "of", "in", "to", "for", "with", "on", "at", "from", "by", "about", "into",
  "over", "after", "under", "between", "through", "during", "before", "against",
  "without", "within", "upon",
] as const;
const FN_CONJ = [
  "and", "but", "or", "so", "because", "although", "though", "while", "if",
  "unless", "whereas", "yet", "nor", "since", "as",
] as const;
const FN_AUX = [
  "is", "am", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "shall", "should", "can", "could",
  "may", "might", "must",
] as const;

// ── Tokenization — naive, deterministic (§3.1) ──────────────────────────────
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}
function splitWords(text: string): string[] {
  return text.toLowerCase().match(/\b[\w']+\b/g) ?? [];
}

const ZERO_VECTOR: MetricVector = Object.fromEntries(
  METRIC_KEYS.map((k) => [k, 0]),
) as MetricVector;

function ratioIn(words: string[], set: readonly string[]): number {
  if (words.length === 0) return 0;
  const lookup = new Set<string>(set);
  let n = 0;
  for (const w of words) if (lookup.has(w)) n++;
  return n / words.length;
}

// ── measure(text) -> MetricVector (§3.3) — counts and divisions only ────────
export function measure(text: string): MetricVector {
  const sentences = splitSentences(text);
  const words = splitWords(text);
  const wc = words.length;
  const sc = sentences.length;

  // empty / wordless text → all zeros (divide-by-zero guard)
  if (wc === 0 || sc === 0) return { ...ZERO_VECTOR };

  // cadence: per-sentence word counts, mean + population variance
  const lens = sentences.map((s) => splitWords(s).length);
  const meanSentenceLen = lens.reduce((a, b) => a + b, 0) / sc;
  const sentenceLenVariance =
    lens.reduce((a, b) => a + (b - meanSentenceLen) ** 2, 0) / sc;

  // lexical diversity
  const ttr = new Set(words).size / wc;

  // stance: hedging — single-word matches + multi-word phrase occurrences
  let hedgeHits = 0;
  const hedgeSet = new Set<string>(HEDGES);
  for (const w of words) if (hedgeSet.has(w)) hedgeHits++;
  const lowerText = text.toLowerCase();
  for (const phrase of HEDGE_PHRASES) {
    hedgeHits += lowerText.split(phrase).length - 1;
  }
  const hedgeRatio = hedgeHits / wc;

  // directness: sentences whose first word is an imperative starter
  const impSet = new Set<string>(IMPERATIVE_STARTERS);
  let directHits = 0;
  for (const s of sentences) {
    const first = splitWords(s)[0];
    if (first && impSet.has(first)) directHits++;
  }
  const directness = directHits / sc;

  const youDensity = ratioIn(words, ["you"]);

  // function-word categories (closed sets, per word)
  const fnPronoun = ratioIn(words, FN_PRONOUN);
  const fnArticle = ratioIn(words, FN_ARTICLE);
  const fnPrep = ratioIn(words, FN_PREP);
  const fnConj = ratioIn(words, FN_CONJ);
  const fnAux = ratioIn(words, FN_AUX);

  // punctuation rhythm, normalised per sentence
  const commaRate = (text.match(/,/g)?.length ?? 0) / sc;
  // em-dash (—) or double-hyphen as a dash
  const dashRate = (text.match(/—|--/g)?.length ?? 0) / sc;
  const questionRate = sentences.filter((s) => /\?\s*$/.test(s.trim())).length / sc;

  return {
    meanSentenceLen,
    sentenceLenVariance,
    ttr,
    hedgeRatio,
    directness,
    youDensity,
    fnPronoun,
    fnArticle,
    fnPrep,
    fnConj,
    fnAux,
    commaRate,
    questionRate,
    dashRate,
  };
}

// ── Normalisation (§3.5) — mandatory before any Euclidean distance / lerp ───
export function computeRanges(vectors: MetricVector[]): MetricRanges {
  const min = { ...ZERO_VECTOR };
  const max = { ...ZERO_VECTOR };
  if (vectors.length === 0) return { min, max };
  for (const k of METRIC_KEYS) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of vectors) {
      if (v[k] < lo) lo = v[k];
      if (v[k] > hi) hi = v[k];
    }
    min[k] = lo;
    max[k] = hi;
  }
  return { min, max };
}

export function normalise(v: MetricVector, ranges: MetricRanges): MetricVector {
  const out = {} as MetricVector;
  for (const k of METRIC_KEYS) {
    const lo = ranges.min[k];
    const hi = ranges.max[k];
    if (hi === lo) {
      out[k] = 0.5; // degenerate dimension → midpoint
    } else {
      const x = (v[k] - lo) / (hi - lo);
      out[k] = x < 0 ? 0 : x > 1 ? 1 : x; // clamp to [0,1]
    }
  }
  return out;
}

export function denormalise(v: MetricVector, ranges: MetricRanges): MetricVector {
  const out = {} as MetricVector;
  for (const k of METRIC_KEYS) {
    const lo = ranges.min[k];
    const hi = ranges.max[k];
    out[k] = hi === lo ? lo : lo + v[k] * (hi - lo);
  }
  return out;
}

export type { MetricKey };
