// lawguistics/scripts/generate-firm.ts — Stage 1b. ONE offline pass that
// produces the synthetic firm (roster + per-lawyer corpus) and commits it to
// data/firm.json. The committed JSON is the demo's source of truth — offline,
// deterministic at run time. Don't regenerate casually; if you do, re-run
// Stage 2 (build-signatures) so signatures.json stays consistent.
//
// Run: node --env-file=.env src/lib/services/lawguistics/scripts/generate-firm.ts
// (.ts relative imports allowed in scripts; Node 23 native TS stripping.)

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { z } from "zod";
import { generateJSON, MODEL } from "../ai.ts";
import type { PracticeArea } from "../types.ts";

// ── Archetype briefs — pushed HARD (§2.2). Exaggeration at the source is what
// makes the cleave pop later: bold corpus → clean distillation → bold voice. ──
const ARCHETYPES: Record<PracticeArea, { label: string; brief: string }> = {
  Criminal: {
    label: "risk-first, clipped, directive",
    brief: [
      "You write like a criminal-defense lawyer whose voice is RISK-FIRST, CLIPPED, and DIRECTIVE.",
      "Lead with the exposure — the worst-case consequence — in the first sentence. Never open with reassurance or pleasantries.",
      "Use short, clipped sentences (often 5–10 words). Issue imperatives: tell the client exactly what to do and what not to do.",
      "Do not hedge. State things plainly and assertively. Minimal warmth. Every line earns its place.",
    ].join(" "),
  },
  RealEstate: {
    label: "measured, procedural, reassuring",
    brief: [
      "You write like a real-estate lawyer whose voice is MEASURED, PROCEDURAL, and REASSURING.",
      "Open warmly. Walk the client through the process step by step, in order.",
      "Use longer, flowing sentences with subordinate clauses. Moderate hedging ('generally', 'typically', 'we should be able to').",
      "Calm and patient throughout. Reassure that each step is normal and manageable.",
    ].join(" "),
  },
  Commercial: {
    label: "precise, figure-led, formal",
    brief: [
      "You write like a commercial lawyer whose voice is PRECISE, FIGURE-LED, and FORMAL.",
      "Dense, exact vocabulary. Reference clauses, defined terms, dates, and amounts explicitly (e.g. 'Clause 7.2', 'the Consideration of £1.2m').",
      "Balanced, careful hedging tied to contingencies. Low warmth — businesslike, not cold.",
      "Capitalise defined terms. Sentences are complete and formal, never chatty.",
    ].join(" "),
  },
};

// ── The 6 fixed slots: 2 per area, exactly one Criminal hero (the boldest, ──
// diffs hardest against a bland baseline — §2.3). Ids are assigned here
// deterministically so the model can't drift them.
type Slot = { id: string; practiceArea: PracticeArea; hero: boolean };
const SLOTS: Slot[] = [
  { id: "criminal-risk-01", practiceArea: "Criminal", hero: true },
  { id: "criminal-02", practiceArea: "Criminal", hero: false },
  { id: "realestate-01", practiceArea: "RealEstate", hero: false },
  { id: "realestate-02", practiceArea: "RealEstate", hero: false },
  { id: "commercial-01", practiceArea: "Commercial", hero: false },
  { id: "commercial-02", practiceArea: "Commercial", hero: false },
];

// ── Schemas ─────────────────────────────────────────────────────────────────
const RosterSchema = z.object({
  firmName: z.string().describe("the firm's name"),
  lawyers: z
    .array(
      z.object({
        id: z.string().describe("must echo back the slot id given in the prompt"),
        name: z.string(),
        title: z.string().describe("their role, e.g. 'Partner, Criminal Defence'"),
        summary: z
          .string()
          .describe(
            "2–4 sentences of practice prose Lawson matches a client's facts against — distinct enough that the practice areas are unmistakable",
          ),
      }),
    )
    .length(6),
});

const CorpusSchema = z.object({
  emails: z
    .array(z.string().describe("the full body of one client email/letter"))
    .min(3)
    .max(5),
});

async function main() {
  console.log(`[generate-firm] model=${MODEL} — generating roster…`);

  // ── Pass 1: the whole roster in one call so the model differentiates the
  // six summaries against each other. ──
  const slotLines = SLOTS.map(
    (s) =>
      `- id="${s.id}" · practiceArea=${s.practiceArea} · archetype: ${ARCHETYPES[s.practiceArea].label}`,
  ).join("\n");

  const roster = await generateJSON({
    schema: RosterSchema,
    temperature: 0.7,
    system:
      "You assemble the roster for a single fictional law firm used in a product demo. Each lawyer must be clearly distinguishable from the others; the summaries are what an intake system matches client facts against, so make the practice areas and focus unmistakable.",
    prompt: [
      "Create one firm name and exactly these six lawyers. Echo each id back verbatim.",
      "Give each a realistic name, a title that names their practice, and a distinct 2–4 sentence practice summary.",
      "The two lawyers within the same practice area must differ in focus/specialism so a matcher can tell them apart.",
      "",
      slotLines,
    ].join("\n"),
  });

  const byId = new Map(roster.lawyers.map((l) => [l.id, l]));
  for (const slot of SLOTS) {
    if (!byId.has(slot.id)) {
      throw new Error(`Roster missing slot id "${slot.id}" — got: ${[...byId.keys()].join(", ")}`);
    }
  }

  // ── Pass 2: per-lawyer corpus under the archetype brief as the system
  // instruction (the tells must be exaggerated at the source). ──
  const lawyers = [];
  for (const slot of SLOTS) {
    const meta = byId.get(slot.id)!;
    const arch = ARCHETYPES[slot.practiceArea];
    console.log(`[generate-firm]   corpus for ${slot.id} (${meta.name})…`);
    const { emails } = await generateJSON({
      schema: CorpusSchema,
      temperature: 0.85, // moderate-high → stylistic variety
      system: arch.brief,
      prompt: [
        `Write 3 to 5 short emails from ${meta.name}, ${meta.title}, to a hypothetical client.`,
        "Each is about a DIFFERENT matter within their practice area, so vocabulary varies but the VOICE stays constant.",
        "Output only the email bodies (no subject lines, no signatures). Stay fully in character — the stylistic tells should be obvious.",
      ].join(" "),
    });

    lawyers.push({
      id: slot.id,
      meta: { name: meta.name, title: meta.title },
      practiceArea: slot.practiceArea,
      summary: meta.summary,
      ...(slot.hero ? { hero: true } : {}),
      corpus: emails,
    });
  }

  // ── Invariant: exactly one hero. Set deterministically if the model lost it. ──
  const heroes = lawyers.filter((l) => "hero" in l && l.hero);
  if (heroes.length !== 1) {
    throw new Error(`Expected exactly one hero, found ${heroes.length}`);
  }

  const firm = { firm: { name: roster.firmName }, lawyers };

  const here = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(here, "..", "data");
  mkdirSync(dataDir, { recursive: true });
  const out = join(dataDir, "firm.json");
  writeFileSync(out, JSON.stringify(firm, null, 2) + "\n", "utf8");

  console.log(
    `[generate-firm] wrote ${out} — ${lawyers.length} lawyers, ` +
      `${lawyers.reduce((n, l) => n + l.corpus.length, 0)} corpus entries, ` +
      `hero=${heroes[0].id}`,
  );
}

main().catch((err) => {
  console.error("[generate-firm] FAILED:", err);
  process.exit(1);
});
