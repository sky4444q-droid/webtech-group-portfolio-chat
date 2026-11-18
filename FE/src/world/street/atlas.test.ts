import { describe, expect, it } from "vitest";
import { packAtlas } from "./atlas";

const sizes = Array.from({ length: 60 }, (_, i) => ({ w: 40 + ((i * 37) % 200), h: 20 + ((i * 53) % 120) }));

describe("packAtlas", () => {
  const rects = packAtlas(sizes, 512);
  it("keeps every rect inside the atlas with its size", () => {
    rects.forEach((r, i) => {
      expect(r.w).toBe(sizes[i].w);
      expect(r.h).toBe(sizes[i].h);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(512);
      expect(r.y + r.h).toBeLessThanOrEqual(512);
    });
  });
  it("never overlaps two rects on the same page", () => {
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        if (a.page !== b.page) continue;
        const hit = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(hit).toBe(false);
      }
  });
  it("uses more than one page when needed", () => {
    expect(Math.max(...rects.map((r) => r.page))).toBeGreaterThan(0);
  });
  it("throws on an oversized item", () => {
    expect(() => packAtlas([{ w: 600, h: 10 }], 512)).toThrow();
  });
  it("is deterministic", () => {
    expect(packAtlas(sizes, 512)).toEqual(rects);
  });
});
