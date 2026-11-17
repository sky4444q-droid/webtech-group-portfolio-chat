import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { ENERGY_CORE_POS, ENERGY_CORE_Y, layoutSkyline } from "./skylineLayout";
import { STREETS, distanceToPolyline } from "./streets";
import { DISTRICTS } from "../../config/districts";

const streets = Object.values(STREETS);
const districts = Object.values(DISTRICTS);

describe("layoutSkyline", () => {
  const towers = layoutSkyline(7);

  it("rings the city with 90–120 towers", () => {
    expect(towers.length).toBeGreaterThanOrEqual(90);
    expect(towers.length).toBeLessThanOrEqual(120);
    for (const t of towers) {
      const r = Math.hypot(t.position[0], t.position[2]);
      expect(r).toBeGreaterThanOrEqual(95);
      expect(r).toBeLessThanOrEqual(150);
      expect(t.size[1]).toBeGreaterThanOrEqual(60);
      expect(t.size[1]).toBeLessThanOrEqual(160);
    }
  });

  it("never enters a street or district plot", () => {
    for (const t of towers) {
      // รัศมีฐานตึก (ครึ่งเส้นทแยงของกล่อง)
      const foot = Math.hypot(t.size[0], t.size[2]) / 2;
      const p: [number, number] = [t.position[0], t.position[2]];
      for (const s of streets) expect(distanceToPolyline(p, s.points) - foot).toBeGreaterThanOrEqual(6);
      for (const d of districts) expect(Math.hypot(p[0] - d.position[0], p[1] - d.position[2]) - foot).toBeGreaterThan(30);
    }
  });

  it("covers every 15° sector", () => {
    const sectors = new Set(towers.map((t) => Math.floor((((Math.atan2(t.position[2], t.position[0]) * 180) / Math.PI + 360) % 360) / 15)));
    for (let i = 0; i < 24; i++) expect(sectors.has(i)).toBe(true);
  });

  it("is deterministic", () => {
    expect(layoutSkyline(7)).toEqual(towers);
  });
});

describe("ENERGY_CORE_POS", () => {
  it("keeps ENERGY_CORE_POS clear of streets", () => {
    const p: [number, number] = [ENERGY_CORE_POS[0], ENERGY_CORE_POS[2]];
    for (const s of streets) expect(distanceToPolyline(p, s.points)).toBeGreaterThan(20);
    for (const d of districts) expect(Math.hypot(p[0] - d.position[0], p[1] - d.position[2])).toBeGreaterThan(30);
  });

  it("does not collide with skyline towers", () => {
    for (const t of layoutSkyline(7)) {
      expect(Math.hypot(t.position[0] - ENERGY_CORE_POS[0], t.position[2] - ENERGY_CORE_POS[2])).toBeGreaterThan(14);
    }
  });

  it("lands the core inside the frame of at least 3 first viewpoints", () => {
    const views: [number, number, number][] = [[-46, 0, 0], [0, 0, 0], [46, 0, 0], [0, 0, 44]];
    const core = new THREE.Vector3(ENERGY_CORE_POS[0], ENERGY_CORE_Y, ENERGY_CORE_POS[2]);
    let inFrame = 0;
    for (const d of views) {
      const cam = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 500);
      cam.position.set(d[0], d[1] + 5, d[2] + 17);
      cam.lookAt(d[0], d[1] + 3, d[2]);
      cam.updateMatrixWorld();
      const n = core.clone().project(cam);
      if (Math.abs(n.x) <= 0.9 && Math.abs(n.y) <= 0.9 && n.z >= -1 && n.z <= 1) inFrame++;
    }
    expect(inFrame).toBeGreaterThanOrEqual(3);
  });
});
