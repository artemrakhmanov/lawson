// harness/roster.stub.ts — the B1 stub roster. Three hand-written lawyers, one
// per practice area, with distinguishable `summary` prose so Triage's matching
// genuinely discriminates (C2/P4) on zero generated data. Exactly one
// `hero: true` (the Criminal). Swapped for Lawguistics.listLawyers() (firm.json)
// at D6 — Triage and matchTarget flip to real ids together. Until then the
// harness runs end-to-end against these (emit's matchTarget ignores the id and
// returns the neutral signature, R3).

import type { Roster } from "./contracts";

export const stubRoster: Roster = [
  {
    id: "stub-criminal",
    meta: { name: "Dana Pell", title: "Partner, Criminal Defense" },
    practiceArea: "Criminal",
    summary:
      "Defends people facing charges — arrests, investigations, DUIs, assault, " +
      "anything where the state is on the other side. Moves fast on bail, the " +
      "first interview, and what not to say. For someone scared, possibly in " +
      "custody, who needs to know their exposure right now.",
    hero: true,
  },
  {
    id: "stub-realestate",
    meta: { name: "Owen Marsh", title: "Partner, Real Estate" },
    practiceArea: "RealEstate",
    summary:
      "Handles property — purchases and sales, leases, boundary and title " +
      "disputes, landlord–tenant trouble, closings that go sideways. Careful " +
      "with contracts and deadlines. For someone buying, selling, or fighting " +
      "over a piece of property.",
  },
  {
    id: "stub-commercial",
    meta: { name: "Priya Vance", title: "Partner, Commercial" },
    practiceArea: "Commercial",
    summary:
      "Advises businesses — formation, contracts, partnership and shareholder " +
      "disputes, vendor and supply agreements, the deal and its fallout. Reads " +
      "the commercial risk before the legal one. For a founder or owner trying " +
      "to structure, enforce, or unwind a business arrangement.",
  },
];
