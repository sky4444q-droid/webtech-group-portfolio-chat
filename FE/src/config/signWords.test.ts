import { describe, expect, it } from "vitest";
import { BANNED_WORDS, SIGN_WORDS } from "./signWords";

const CJK = /[\u3040-\u30ff\u3400-\u9fff]/;

describe("SIGN_WORDS", () => {
  const moods = Object.entries(SIGN_WORDS);
  it("has ≥ 20 words in all four languages per mood", () => {
    expect(moods.length).toBe(5);
    for (const [, words] of moods) {
      expect(words.length).toBeGreaterThanOrEqual(20);
      for (const l of ["ja", "zh", "th", "en"]) expect(words.some((w) => w.lang === l)).toBe(true);
    }
  });
  it("has no duplicates within a mood", () => {
    for (const [, words] of moods) expect(new Set(words.map((w) => w.text)).size).toBe(words.length);
  });
  it("contains no banned brand names", () => {
    expect(BANNED_WORDS.length).toBeGreaterThan(0);
    for (const [, words] of moods)
      for (const w of words) for (const b of BANNED_WORDS) expect(w.text.toLowerCase()).not.toContain(b.toLowerCase());
  });
  it("only makes CJK words vertical", () => {
    for (const [, words] of moods) for (const w of words) if (w.vertical) expect(CJK.test(w.text)).toBe(true);
  });
});
