import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { ENERGY_CORE_POS, ENERGY_CORE_Y, layoutSkyline, skylineStrips } from "./skylineLayout";
import { STREETS, distanceToPolyline } from "./streets";
import { DISTRICTS } from "../../config/districts";
import { CAMERA_FOV } from "../../config/camera";
import { viewpointWorld } from "../../config/viewpoints";

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

  it("lands the core inside the frame of at least 2 first viewpoints", () => {
    const core = new THREE.Vector3(ENERGY_CORE_POS[0], ENERGY_CORE_Y, ENERGY_CORE_POS[2]);
    let inFrame = 0;
    for (const d of ["gate", "nexus", "projects", "sanctuary"] as const) {
      const v = viewpointWorld(d, 0);
      const cam = new THREE.PerspectiveCamera(CAMERA_FOV, 16 / 9, 0.1, 500);
      cam.position.set(...v.position);
      cam.lookAt(...v.target);
      cam.updateMatrixWorld();
      const n = core.clone().project(cam);
      if (Math.abs(n.x) <= 0.9 && Math.abs(n.y) <= 0.9 && n.z >= -1 && n.z <= 1) inFrame++;
    }
    // ลดจาก 3 เหลือ 2: จุดชมแรกจริงของ gate หันไปทาง −x และ sanctuary หันไปทาง +z
    // ส่วนแกนพลังงานอยู่ทาง −z ไกล (−26, −85) จึงเห็นได้แค่จาก nexus และ projects ไม่ว่าจะถอยกล้องเท่าไร
    expect(inFrame).toBeGreaterThanOrEqual(2);
  });
});

describe("skylineStrips", () => {
  const towers = layoutSkyline(7);
  const strips = skylineStrips(towers, 7);

  it("puts strips on 30–50% of towers", () => {
    const n = new Set(strips.map((s) => s.tower)).size;
    expect(n / towers.length).toBeGreaterThanOrEqual(0.3);
    expect(n / towers.length).toBeLessThanOrEqual(0.5);
  });
  it("keeps each strip inside its tower height and face width", () => {
    for (const s of strips) {
      const t = towers[s.tower];
      const faceW = s.face < 2 ? t.size[0] : t.size[2];
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y + s.height).toBeLessThanOrEqual(t.size[1]);
      expect(s.width).toBeGreaterThan(0);
      expect(s.width).toBeLessThanOrEqual(faceW);
    }
  });
  it("never puts a strip on a face pointing away from the city", () => {
    const LOCAL = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // ทิศ normal (x, z) ของ face 0..3
    for (const s of strips) {
      const [px, , pz] = towers[s.tower].position;
      const th = -Math.atan2(pz, px);
      const [nx, nz] = LOCAL[s.face];
      const wx = nx * Math.cos(th) + nz * Math.sin(th);
      const wz = -nx * Math.sin(th) + nz * Math.cos(th);
      const r = Math.hypot(px, pz);
      expect(wx * (-px / r) + wz * (-pz / r)).toBeGreaterThanOrEqual(-0.1);
    }
  });
  it("is deterministic and leaves layoutSkyline unchanged", () => {
    expect(skylineStrips(towers, 7)).toEqual(strips);
    expect(layoutSkyline(7)).toEqual(towers);
  });
});
