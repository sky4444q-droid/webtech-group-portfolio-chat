import { describe, expect, it } from "vitest";
import { steamSources } from "../fx/steamLayout";
import { DECAL_Y, floorDecals } from "./floorDecals";
import { NEXUS_HALF, STREETS, distanceToPolyline } from "./streets";

const streets = Object.values(STREETS);
const decals = floorDecals();
const inNexus = (x: number, z: number) => Math.abs(x) <= NEXUS_HALF && Math.abs(z) <= NEXUS_HALF;
const nearest = (x: number, z: number) => streets.reduce((a, b) => (distanceToPolyline([x, z], b.points) < distanceToPolyline([x, z], a.points) ? b : a));

describe("floorDecals", () => {
  it("gives every street 2-4 manholes, 6+ lane marks and 10+ tile tints", () => {
    for (const st of streets) {
      const mine = decals.filter((d) => nearest(d.position[0], d.position[2]).id === st.id);
      const n = (k: string) => mine.filter((d) => d.kind === k).length;
      expect(n("manhole")).toBeGreaterThanOrEqual(2);
      expect(n("manhole")).toBeLessThanOrEqual(4);
      expect(n("laneMark")).toBeGreaterThanOrEqual(6);
      expect(n("tileTint")).toBeGreaterThanOrEqual(10);
    }
  });

  it("keeps every decal on the road or in the Nexus square", () => {
    for (const d of decals) {
      const [x, , z] = d.position;
      const st = nearest(x, z);
      expect(inNexus(x, z) || distanceToPolyline([x, z], st.points) <= st.halfWidth - 0.2).toBe(true);
    }
  });

  it("sits on DECAL_Y, distinct from the spill layer", () => {
    expect(DECAL_Y).not.toBe(0.02);
    for (const d of decals) expect(d.position[1]).toBe(DECAL_Y);
  });

  it("is deterministic", () => {
    expect(floorDecals()).toEqual(floorDecals());
  });

  it("keeps 1.5 m clear of steam vents", () => {
    const vents = steamSources().filter((s) => s.kind === "vent");
    for (const d of decals) for (const v of vents) expect(Math.hypot(d.position[0] - v.position[0], d.position[2] - v.position[2])).toBeGreaterThanOrEqual(1.5);
  });
});
