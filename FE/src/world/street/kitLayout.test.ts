import { describe, expect, it } from "vitest";
import { CITY_SEED, layoutNexus, layoutStreet, type KitItem } from "./kitLayout";
import { STREETS, distanceToPolyline, polylineLength } from "./streets";
import { DISTRICTS } from "../../config/districts";

const SIGNS = new Set(["signH", "signV", "lightbox", "screen", "panel"]);
const streets = Object.values(STREETS);

describe("layoutStreet", () => {
  it("is deterministic for a seed", () => {
    for (const s of streets) expect(layoutStreet(s, CITY_SEED)).toEqual(layoutStreet(s, CITY_SEED));
  });

  it("keeps a clear walking corridor", () => {
    for (const s of streets)
      for (const it of layoutStreet(s, CITY_SEED)) {
        if (it.position[1] >= 2.6) continue;
        expect(distanceToPolyline([it.position[0], it.position[2]], s.points)).toBeGreaterThan(1.2);
      }
  });

  it("lines both sides with facades from start to end", () => {
    for (const s of streets) {
      const len = polylineLength(s.points);
      const items = layoutStreet(s, CITY_SEED);
      for (const side of [-1, 1] as const) {
        const cover = items.filter((i) => i.type === "facade" && i.side === side).reduce((n, i) => n + i.size[0], 0);
        expect(cover / len).toBeGreaterThanOrEqual(0.9);
      }
    }
  });

  it("is dense like the reference", () => {
    for (const s of streets) {
      const n = layoutStreet(s, CITY_SEED).filter((i) => SIGNS.has(i.type)).length;
      expect(n / polylineLength(s.points)).toBeGreaterThanOrEqual(1.2);
    }
  });

  it("puts at least one bigScreen on every street and at nexus", () => {
    for (const s of streets) expect(layoutStreet(s, CITY_SEED).some((i) => i.type === "bigScreen")).toBe(true);
    expect(layoutNexus(CITY_SEED).some((i) => i.type === "bigScreen")).toBe(true);
  });

  it("closes the far end of every street, leaving the team HQ plot empty", () => {
    for (const s of streets) {
      const items = layoutStreet(s, CITY_SEED);
      const end = s.points[s.points.length - 1];
      const caps = items.filter((i) => i.type === "endCap");
      if (s.id === "officeRow") {
        expect(caps.length).toBe(0);
        const [ax, , az] = DISTRICTS.team.position;
        const inPlot = (i: KitItem) => i.position[0] > ax && i.position[0] < ax + 12 && Math.abs(i.position[2] - az) < 6;
        expect(items.filter(inPlot)).toEqual([]);
      } else {
        expect(caps.length).toBe(1);
        // อยู่เลยปลายถนนออกไป
        const start = s.points[0];
        const len = Math.hypot(end[0] - start[0], end[1] - start[1]);
        const capLen = Math.hypot(caps[0].position[0] - start[0], caps[0].position[2] - start[1]);
        expect(capLen).toBeGreaterThan(len);
      }
    }
  });

  it("varies sign variants so neighbours differ", () => {
    for (const s of streets) {
      for (const side of [-1, 1] as const) {
        const signs = layoutStreet(s, CITY_SEED).filter((i) => SIGNS.has(i.type) && i.side === side);
        for (let i = 1; i < signs.length; i++) {
          if (signs[i].type === signs[i - 1].type) expect(signs[i].variant).not.toBe(signs[i - 1].variant);
        }
      }
    }
  });
});
