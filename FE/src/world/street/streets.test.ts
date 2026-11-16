import { describe, expect, it } from "vitest";
import { NEXUS_HALF, STREETS, polylineLength, routeBetween, streetOf } from "./streets";
import { DISTRICTS } from "../../config/districts";
import type { DistrictId } from "../../types";

const OUTER: DistrictId[] = ["gate", "team", "projects", "sanctuary"];
const d2 = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const anchor = (d: DistrictId): [number, number] => [DISTRICTS[d].position[0], DISTRICTS[d].position[2]];

describe("streets", () => {
  it("connects every district except nexus with one street", () => {
    for (const d of OUTER) expect(streetOf(d)).not.toBeNull();
    expect(streetOf("nexus")).toBeNull();
  });

  it("starts each street at the crossroads and ends at its district", () => {
    for (const d of OUTER) {
      const s = streetOf(d)!;
      expect(d2(s.points[0], [0, 0])).toBeLessThanOrEqual(NEXUS_HALF + 1);
      expect(d2(s.points[s.points.length - 1], anchor(d))).toBeLessThanOrEqual(2);
    }
  });

  it("routes through the crossroads between two outer districts", () => {
    for (const a of OUTER)
      for (const b of OUTER) {
        if (a === b) continue;
        const r = routeBetween(a, b);
        expect(r.some((p) => d2(p, [0, 0]) <= 3)).toBe(true);
        expect(d2(r[0], anchor(a))).toBeLessThanOrEqual(2);
        expect(d2(r[r.length - 1], anchor(b))).toBeLessThanOrEqual(2);
      }
  });

  it("routes to and from nexus along one street", () => {
    const r = routeBetween("nexus", "projects");
    expect(d2(r[0], [0, 0])).toBeLessThanOrEqual(3);
    expect(d2(r[r.length - 1], anchor("projects"))).toBeLessThanOrEqual(2);
  });

  it("keeps each street 35–55 units long", () => {
    for (const s of Object.values(STREETS)) {
      const len = polylineLength(s.points);
      expect(len).toBeGreaterThanOrEqual(35);
      expect(len).toBeLessThanOrEqual(55);
    }
  });

  it("makes the sanctuary alley the narrowest and gallery avenue the widest", () => {
    const widths = Object.values(STREETS).map((s) => s.halfWidth);
    expect(STREETS.sanctuaryAlley.halfWidth).toBe(Math.min(...widths));
    expect(STREETS.galleryAvenue.halfWidth).toBe(Math.max(...widths));
  });
});
