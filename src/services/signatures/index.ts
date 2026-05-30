// services/signatures/index.ts
// Firm roster loader (Spec 00 §6). One firm, a handful of lawyers across the
// practice areas. This is the concrete data Spec 01 matching reads; the full
// VoiceSignature (metric vector + distilled brief) is layered on in Spec 03.

import type { Lawyer } from "@/lib/types";
import firm from "./data/firm.json";

export interface Firm {
  name: string;
  lawyers: Lawyer[];
}

// JSON widens string literals (e.g. practiceArea), so cast through the shape.
export const firmData = firm as unknown as Firm;

export function getRoster(): Lawyer[] {
  return firmData.lawyers;
}

export function getLawyer(id: string): Lawyer | undefined {
  return firmData.lawyers.find((l) => l.id === id);
}
