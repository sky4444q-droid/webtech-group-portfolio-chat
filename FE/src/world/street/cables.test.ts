import { describe, expect, it } from "vitest";
import { catenary, cableSpans } from "./cables";
import { CITY_SEED, layoutStreet } from "./kitLayout";
import { STREETS } from "./streets";

const streets = Object.values(STREETS);

describe("catenary", () => {
  it("keeps both endpoints exact", () => {
    const a: [number, number, number] = [1, 8, -3];
    const b: [number, number, number] = [7, 11, 5];
    const pts = catenary(a, b, 1, 12);
    expect(pts[0]).toEqual(a);
    expect(pts[pts.length - 1]).toEqual(b);
    expect(pts.length).toBe(13);
  });

  it("sags exactly `sag` below the chord midpoint", () => {
    const pts = catenary([0, 8, 0], [10, 12, 0], 1.5, 10);
    expect(pts[5][1]).toBeCloseTo(10 - 1.5, 6);
  });
});

describe("cableSpans", () => {
  it("converts only horizontal cables, never vertical lamp cords", () => {
    for (const s of streets) {
      const items = layoutStreet(s, CITY_SEED);
      const horizontal = items.filter((i) => i.type === "cable" && i.size[0] > i.size[1]);
      expect(cableSpans(items).length).toBe(horizontal.length);
    }
  });

  it("keeps the lowest point of every cable clear of the corridor (y >= 3.2)", () => {
    for (const s of streets) {
      for (const sp of cableSpans(layoutStreet(s, CITY_SEED))) {
        const low = Math.min(...catenary(sp.a, sp.b, sp.sag, 10).map((p) => p[1]));
        expect(low).toBeGreaterThanOrEqual(3.2);
        expect(low).toBeCloseTo(sp.a[1] - sp.sag, 6); // จุดต่ำสุดจริง = ความสูงปลาย - sag
      }
    }
  });

  it("spans several heights", () => {
    for (const s of streets) {
      const spans = cableSpans(layoutStreet(s, CITY_SEED));
      expect(spans.length).toBeGreaterThanOrEqual(8);
      const ys = spans.map((sp) => sp.a[1]);
      expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThanOrEqual(6);
    }
  });
});
