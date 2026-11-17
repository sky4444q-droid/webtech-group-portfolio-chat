import { describe, expect, it } from "vitest";
import { CITY_SEED, layoutNexus, layoutStreet, type KitItem } from "./kitLayout";
import { STREETS, distanceToPolyline } from "./streets";
import { spillsFor } from "./lightSpill";

const SOURCES = new Set(["signH", "signV", "lightbox", "screen", "bigScreen"]);
const streets = Object.values(STREETS);

const item = (y: number, variant = 3): KitItem => ({ type: "signH", street: "nexus", position: [10, y, 0], rotationY: Math.PI / 2, size: [2, 1, 0.12], variant, side: 1 });

describe("spillsFor", () => {
  it("gives every source a wall spill; only sources at y<=9 (and bigScreens) get a floor spill", () => {
    const items = [...streets.flatMap((s) => layoutStreet(s, CITY_SEED)), ...layoutNexus(CITY_SEED)];
    const src = items.filter((i) => SOURCES.has(i.type));
    const lowN = src.filter((i) => i.position[1] <= 9 || i.type === "bigScreen").length;
    const spills = spillsFor(items);
    expect(src.length).toBeGreaterThan(0);
    expect(lowN).toBeLessThan(src.length);
    expect(spills.filter((s) => s.kind === "wall").length).toBe(src.length);
    expect(spills.filter((s) => s.kind === "floor").length).toBe(lowN);
  });

  it("emits no floor spill from a non-bigScreen source above y 9", () => {
    expect(spillsFor([item(9.5), item(20)]).filter((s) => s.kind === "floor")).toEqual([]);
    expect(spillsFor([item(9)]).filter((s) => s.kind === "floor").length).toBe(1);
    const big = { ...item(12), type: "bigScreen" as const };
    expect(spillsFor([big]).filter((s) => s.kind === "floor").length).toBe(1);
  });

  it("puts the floor spill on the street side of its source, on the ground", () => {
    for (const s of streets) {
      const items = layoutStreet(s, CITY_SEED).filter((i) => SOURCES.has(i.type) && (i.position[1] <= 9 || i.type === "bigScreen"));
      const floors = spillsFor(items).filter((f) => f.kind === "floor");
      floors.forEach((f, i) => {
        const src = items[i];
        expect(f.position[1]).toBe(0.02);
        const dSrc = distanceToPolyline([src.position[0], src.position[2]], s.points);
        const dSpill = distanceToPolyline([f.position[0], f.position[2]], s.points);
        expect(dSpill).toBeLessThan(dSrc);
      });
    }
  });

  it("scales floor spill length with source height", () => {
    const [low] = spillsFor([item(4)]).filter((s) => s.kind === "floor");
    const [high] = spillsFor([item(9)]).filter((s) => s.kind === "floor");
    expect(high.size[1]).toBeGreaterThan(low.size[1]);
  });

  it("keeps spill strength in (0, 1]", () => {
    const items = layoutStreet(streets[0], CITY_SEED);
    for (const s of spillsFor(items)) {
      expect(s.strength).toBeGreaterThan(0);
      expect(s.strength).toBeLessThanOrEqual(1);
    }
  });

  it("sets the floor spill variant to the source variant", () => {
    const [f] = spillsFor([item(5, 11)]).filter((s) => s.kind === "floor");
    expect(f.variant).toBe(11);
  });
});
