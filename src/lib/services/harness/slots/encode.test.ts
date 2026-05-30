import { describe, it, expect } from "vitest";
import { parse, serialize, slotTokens, type Run } from "./encode";

const roundTrips = (s: string) => expect(serialize(parse(s))).toBe(s);

describe("encode — round-trip property", () => {
  it("round-trips representative scaffolds (incl. the police-stop example)", () => {
    const examples = [
      "I was pulled over for [[reason:select:speeding|a broken tail light|no reason given]] at about [[time:free:e.g. 11pm]].",
      "The officer [[searched:select:did|did not]] search the car, and I [[said:free:what you told them, if anything]].",
      "Plain prose with no slots at all.",
      "[[only:free:a lone slot]]",
      "[[a:select:one|two]][[b:free:adjacent]]",
      "",
    ];
    for (const ex of examples) roundTrips(ex);
  });

  it("round-trips mixed prose with multiple slots adjacent to punctuation", () => {
    roundTrips("Date: [[d:free:MM/DD]], amount $[[amt:free:0.00]] — was it [[paid:select:yes|no]]?");
  });

  it("round-trips select with 2 and 3+ options, incl. empty options", () => {
    roundTrips("[[x:select:a|b]]");
    roundTrips("[[x:select:a|b|c|d]]");
    roundTrips("[[x:select:a||c]]"); // empty middle option preserved
  });
});

describe("encode — parse structure", () => {
  it("parses both slot types with correct fields", () => {
    const runs = parse("hi [[k:free:ph]] and [[s:select:x|y|z]] end");
    expect(runs).toEqual<Run[]>([
      { kind: "text", text: "hi " },
      { kind: "slot", key: "k", type: "free", placeholder: "ph" },
      { kind: "text", text: " and " },
      { kind: "slot", key: "s", type: "select", options: ["x", "y", "z"] },
      { kind: "text", text: " end" },
    ]);
  });

  it("keeps a colon inside a free placeholder", () => {
    const runs = parse("[[note:free:time: 3pm]]");
    expect(runs).toEqual<Run[]>([{ kind: "slot", key: "note", type: "free", placeholder: "time: 3pm" }]);
  });

  it("emits no empty text run between adjacent slots", () => {
    expect(parse("[[a:free:x]][[b:free:y]]")).toHaveLength(2);
  });
});

describe("encode — malformed tokens are literal text (no throw)", () => {
  for (const bad of [
    "[[no colons at all]]",
    "[[KEY:free:uppercase key]]", // key must be lowercase
    "[[key:other:unknown type]]",
    "[[key:free:missing close]",
    "[key:free:single bracket]",
    "plain [[ unterminated",
  ]) {
    it(`treats ${JSON.stringify(bad)} as text`, () => {
      const runs = parse(bad);
      expect(runs).toEqual<Run[]>([{ kind: "text", text: bad }]);
      roundTrips(bad);
    });
  }
});

describe("encode — conditioning-survival probe (the property emit enforces)", () => {
  it("slot tokens are recoverable after arbitrary surrounding-prose edits", () => {
    const original =
      "Roughly when did this happen — [[when:free:e.g. last Tuesday]] — and were you [[arrested:select:arrested|released|unsure]]?";
    // Simulate conditioning: reword ONLY the prose, keep slot tokens byte-identical.
    const conditioned =
      "Give me the rough timing: [[when:free:e.g. last Tuesday]]. And the outcome — [[arrested:select:arrested|released|unsure]].";

    // The substance that must survive: the exact slot tokens, unchanged.
    expect(slotTokens(conditioned)).toEqual(slotTokens(original));
    expect(slotTokens(original)).toEqual([
      "[[when:free:e.g. last Tuesday]]",
      "[[arrested:select:arrested|released|unsure]]",
    ]);
  });

  it("a dropped or mutated token is detectable (the fallback trigger)", () => {
    const original = "[[k:free:keep me]] in place";
    const dropped = "the slot got eaten by the model";
    const mutated = "[[k:free:keep ME]] in place"; // payload changed
    expect(slotTokens(dropped)).not.toEqual(slotTokens(original));
    expect(slotTokens(mutated)).not.toEqual(slotTokens(original));
  });
});
