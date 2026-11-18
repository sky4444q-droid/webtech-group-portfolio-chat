import { describe, expect, it } from "vitest";
import { steamSources, type SteamSource } from "./steamLayout";
import { cityLayout, type KitItem } from "../street/kitLayout";
import { STREETS, distanceToPolyline, type Street } from "../street/streets";
import { VIEWPOINTS } from "../../config/viewpoints";
import { DISTRICTS } from "../../config/districts";
import { NEON } from "../street/kitMeshes";
import type { DistrictId } from "../../types";

const xz = (s: SteamSource): [number, number] => [s.position[0], s.position[2]];
const nearestStreet = (p: [number, number]): Street =>
  Object.values(STREETS).reduce((a, b) => (distanceToPolyline(p, b.points) < distanceToPolyline(p, a.points) ? b : a));
const allItems = (): KitItem[] => Object.values(cityLayout()).flat();
const LIGHTS = new Set(["signH", "signV", "lightbox", "screen", "bigScreen"]);

describe("steamSources", () => {
  const src = steamSources();
  const vents = src.filter((s) => s.kind === "vent");

  it("puts 3–4 vents on every street", () => {
    for (const st of Object.values(STREETS)) {
      const n = vents.filter((v) => nearestStreet(xz(v)).id === st.id).length;
      expect(n, st.id).toBeGreaterThanOrEqual(3);
      expect(n, st.id).toBeLessThanOrEqual(4);
    }
  });

  it("keeps vents on the road and off the guide's centreline", () => {
    for (const v of vents) {
      const st = nearestStreet(xz(v));
      const d = distanceToPolyline(xz(v), st.points);
      expect(d).toBeGreaterThanOrEqual(1.0);
      expect(d).toBeLessThanOrEqual(st.halfWidth - 0.4);
    }
  });

  it("keeps vents 3 m away from every viewpoint camera and marker", () => {
    for (const d of Object.keys(VIEWPOINTS) as DistrictId[]) {
      const b = DISTRICTS[d].position;
      for (const vp of VIEWPOINTS[d]) {
        for (const p of [vp.position, vp.marker]) {
          for (const v of vents) {
            expect(Math.hypot(v.position[0] - (b[0] + p[0]), v.position[2] - (b[2] + p[2]))).toBeGreaterThanOrEqual(3);
          }
        }
      }
    }
  });

  it("turns every existing kit 'steam' item into a kitchen source", () => {
    const steam = allItems().filter((i) => i.type === "steam");
    const kitchens = src.filter((s) => s.kind === "kitchen");
    expect(steam.length).toBeGreaterThan(0);
    expect(kitchens.length).toBe(steam.length);
    for (const k of kitchens) expect(steam.some((s) => s.position.every((c, i) => c === k.position[i]))).toBe(true);
  });

  it("puts 6–10 stacks on roof tops", () => {
    const stacks = src.filter((s) => s.kind === "stack");
    expect(stacks.length).toBeGreaterThanOrEqual(6);
    expect(stacks.length).toBeLessThanOrEqual(10);
    const roofs = allItems().filter((i) => i.type === "roof");
    for (const s of stacks) {
      expect(roofs.some((r) => Math.abs(r.position[1] + r.size[1] / 2 - s.position[1]) < 0.05 &&
        Math.hypot(r.position[0] - s.position[0], r.position[2] - s.position[2]) < 0.01)).toBe(true);
    }
  });

  it("tints from the nearest light source within 8 m, else city fog", () => {
    const lights = allItems().filter((i) => LIGHTS.has(i.type));
    for (const v of vents) {
      let best: KitItem | null = null;
      let bd = 8;
      for (const l of lights) {
        const d = Math.hypot(l.position[0] - v.position[0], l.position[1] - v.position[1], l.position[2] - v.position[2]);
        if (d <= bd) { bd = d; best = l; }
      }
      expect(v.tint).toBe(best ? NEON[best.variant % NEON.length] : "#3a2a6a");
    }
  });

  it("is deterministic and leaves cityLayout untouched", () => {
    const before = JSON.stringify(cityLayout());
    expect(steamSources()).toEqual(steamSources());
    expect(JSON.stringify(cityLayout())).toBe(before);
  });

  it("sizes each kind per spec", () => {
    for (const s of src) {
      if (s.kind === "vent") { expect(s.radius).toBeGreaterThanOrEqual(0.5); expect(s.radius).toBeLessThanOrEqual(0.8); expect(s.height).toBeGreaterThanOrEqual(2.5); expect(s.height).toBeLessThanOrEqual(4); }
      if (s.kind === "kitchen") { expect(s.radius).toBe(0.4); expect(s.height).toBe(2.6); }
      if (s.kind === "stack") { expect(s.radius).toBeGreaterThanOrEqual(1.2); expect(s.radius).toBeLessThanOrEqual(2); expect(s.height).toBeGreaterThanOrEqual(8); expect(s.height).toBeLessThanOrEqual(14); }
    }
  });
});
