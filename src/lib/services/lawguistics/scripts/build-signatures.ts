// lawguistics/scripts/build-signatures.ts — Stage 2. Turns firm.json into
// frozen VoiceSignatures: deterministic metric vector (from corpus) + an
// LLM-distilled brief, plus the roster-wide normalisation ranges and the
// roster-median origin. The committed signatures.json is frozen — convergence
// and LSM are reproducible because the ranges are baked in.
//
// Run: node --env-file=.env src/lib/services/lawguistics/scripts/build-signatures.ts
// (reads firm.json, writes signatures.json; .ts relative imports allowed here.)

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { z } from "zod";
import { generateJSON, MODEL } from "../ai.ts";
import { measure, computeRanges } from "../metrics.ts";
import { METRIC_KEYS } from "../types.ts";
import type { MetricVector, MetricRanges, VoiceBrief } from "../types.ts";

type FirmLawyer = {
  id: string;
  meta: { name: string; title: string };
  practiceArea: string;
  summary: string;
  hero?: boolean;
  corpus: string[];
};

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "data");
const firm = JSON.parse(readFileSync(join(dataDir, "firm.json"), "utf8")) as {
  firm: { name: string };
  lawyers: FirmLawyer[];
};

// Zod = the VoiceBrief shape (Stage 0). Minimums keep distilled briefs non-empty.
const BriefSchema = z.object({
  label: z.string().describe("3–6 word voice label, e.g. 'risk-first, clipped, directive'"),
  cadence: z.string().describe("one sentence describing the rhythm/sentence shape"),
  moves: z.array(z.string()).min(2).describe("characteristic rhetorical moves"),
  lexicalFingerprint: z
    .array(z.string())
    .min(2)
    .describe("characteristic words/connectives this voice reaches for"),
  hedgingPosture: z.string().describe("'directive' | 'balanced' | 'hedged' + a short gloss"),
  exemplarLine: z.string().describe("one short, unmistakable line in this voice"),
});

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const n = s.length;
  const mid = n >> 1;
  return n % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

async function main() {
  console.log(`[build-signatures] model=${MODEL} — ${firm.lawyers.length} lawyers`);

  const vectors: MetricVector[] = [];
  const signatures: { lawyerId: string; metrics: MetricVector; brief: VoiceBrief }[] = [];

  for (const l of firm.lawyers) {
    // ── metrics — deterministic. Concatenate the corpus into one string
    // (simplest; documented choice — variance across these short emails is low). ──
    const corpusText = l.corpus.join("\n\n");
    const metrics = measure(corpusText);
    vectors.push(metrics);

    // ── brief — LLM-distilled, frozen. One call per lawyer. ──
    console.log(`[build-signatures]   distilling brief for ${l.id} (${l.meta.name})…`);
    const brief = await generateJSON({
      schema: BriefSchema,
      temperature: 0.4,
      system:
        "You are a forensic linguist. Given a lawyer's client correspondence, distill the VOICE " +
        "(not the legal content) into a compact, reusable signature. Be specific and faithful to " +
        "what is actually on the page — this brief will steer a text conditioner later.",
      prompt: [
        `These are emails from ${l.meta.name}, ${l.meta.title} (${l.practiceArea}).`,
        "Distill the voice into: label, cadence, moves, lexicalFingerprint, hedgingPosture, exemplarLine.",
        "",
        l.corpus.map((c, i) => `--- email ${i + 1} ---\n${c}`).join("\n\n"),
      ].join("\n"),
    });

    signatures.push({ lawyerId: l.id, metrics, brief });
  }

  // ── roster-wide ranges — FREEZE them (mandatory for reproducible reveal numbers). ──
  const ranges: MetricRanges = computeRanges(vectors);

  // ── roster-median origin — default `origin` for condition when none is passed. ──
  const rosterMedian = {} as MetricVector;
  for (const k of METRIC_KEYS) rosterMedian[k] = median(vectors.map((v) => v[k]));

  const out = { ranges, rosterMedian, signatures };
  const outPath = join(dataDir, "signatures.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");

  const hero = firm.lawyers.find((l) => l.hero);
  const heroSig = signatures.find((s) => s.lawyerId === hero?.id);
  console.log(
    `[build-signatures] wrote ${outPath} — ${signatures.length} signatures.\n` +
      `  hero ${hero?.id}: meanSentenceLen=${heroSig?.metrics.meanSentenceLen.toFixed(1)}, ` +
      `hedgeRatio=${heroSig?.metrics.hedgeRatio.toFixed(4)}, ` +
      `directness=${heroSig?.metrics.directness.toFixed(3)}`,
  );
}

main().catch((err) => {
  console.error("[build-signatures] FAILED:", err);
  process.exit(1);
});
