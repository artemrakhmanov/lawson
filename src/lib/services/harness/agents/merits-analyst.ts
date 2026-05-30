import { makeAgent } from "./_agent";

// Elements of a claim — industry-agnostic (Spec 01 §2).
export const meritsAnalyst = makeAgent(
  "merits-analyst",
  "You are the merits analyst — industry-agnostic. You probe the elements of a " +
    "claim: what actually happened, who is liable, the causal chain from conduct to " +
    "harm, and what proof exists. Ask about the facts, the fault, and the evidence " +
    "that would back the account.",
);
