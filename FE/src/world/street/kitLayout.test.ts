import { describe, expect, it } from "vitest";
import { CITY_SEED, layoutNexus, layoutStreet, type KitItem } from "./kitLayout";
import { STREETS, TEAM_TOWER, distanceToPolyline, polylineLength } from "./streets";
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

  it("keeps every street piece out of the Team HQ tower (no buildings poking into the lobby)", () => {
    const [tx, , tz] = DISTRICTS.team.position;
    const t = TEAM_TOWER;
    const box = { x0: tx + t.center[0] - t.size[0] / 2, x1: tx + t.center[0] + t.size[0] / 2, z0: tz + t.center[2] - t.size[2] / 2, z1: tz + t.center[2] + t.size[2] / 2 };
    for (const s of streets)
      for (const it of layoutStreet(s, CITY_SEED)) {
        if (it.type === "cable") continue; // สายไฟลอยสูงข้ามถนน ไม่ชนตึก
        // ตึกชั้นบน/ของบนหลังคา/เสาอากาศ/ไฟเตือน/เส้นขอบ ต้องอยู่นอกตึก Team เช่นกัน (ไม่ข้ามด้วย continue)
        const c = Math.abs(Math.cos(it.rotationY));
        const sn = Math.abs(Math.sin(it.rotationY));
        const hx = (c * it.size[0] + sn * it.size[2]) / 2;
        const hz = (sn * it.size[0] + c * it.size[2]) / 2;
        const overlaps = it.position[0] + hx > box.x0 + 1e-6 && it.position[0] - hx < box.x1 && it.position[2] + hz > box.z0 && it.position[2] - hz < box.z1;
        expect(overlaps, `${s.id} ${it.type} at ${it.position.map((v) => v.toFixed(2))}`).toBe(false);
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

describe("lamp cords", () => {
  it("hangs every lamp from a vertical cord that reaches the cable above it", () => {
    for (const s of streets) {
      const items = layoutStreet(s, CITY_SEED);
      const lamps = items.filter((i) => i.type === "lamp");
      const cords = items.filter((i) => i.type === "cable" && i.size[0] < i.size[1]);
      expect(lamps.length).toBeGreaterThan(0);
      expect(cords.length).toBe(lamps.length);
      for (const l of lamps) {
        const cord = cords.find((c) => c.position[0] === l.position[0] && c.position[2] === l.position[2])!;
        expect(cord.size).toEqual([0.03, expect.any(Number), 0.03]);
        expect(cord.position[1] - cord.size[1] / 2).toBeCloseTo(l.position[1] + l.size[1] / 2, 5);
      }
    }
  });
});

describe("canyon buildings", () => {
  it("builds streets as canyons", () => {
    const hs = streets.flatMap((s) => layoutStreet(s, CITY_SEED).filter((i) => i.type === "facade").map((i) => i.size[1]));
    expect(Math.min(...hs)).toBeGreaterThanOrEqual(18);
    expect(Math.max(...hs)).toBeLessThanOrEqual(60);
    expect(hs.reduce((a, b) => a + b, 0) / hs.length).toBeGreaterThanOrEqual(32);
  });

  it("stacks a setback tier on at least 40% of facades, never overhanging the street face", () => {
    for (const s of streets) {
      const items = layoutStreet(s, CITY_SEED);
      const facades = items.filter((i) => i.type === "facade");
      const tiers = items.filter((i) => i.type === "tier");
      expect(tiers.length / facades.length).toBeGreaterThanOrEqual(0.4);
      // ระยะหน้าที่ใกล้ถนนที่สุดของชิ้น (กึ่งกลางถึงเส้นกลางถนน ลบครึ่งความลึก)
      const near = (i: KitItem) => distanceToPolyline([i.position[0], i.position[2]], s.points) - i.size[2] / 2;
      for (const t of tiers) {
        const f = facades.find((f) => f.side === t.side && Math.abs(f.position[0] - t.position[0]) < f.size[0] && Math.abs(f.position[2] - t.position[2]) < f.size[0] && Math.abs(f.position[1] * 2 - (t.position[1] - t.size[1] / 2)) < 1e-6)!;
        expect(f, `${s.id} tier has a facade`).toBeDefined();
        expect(near(t)).toBeGreaterThanOrEqual(near(f) + 0.5 - 1e-6);
        expect(t.size[1] / (f.size[1])).toBeGreaterThanOrEqual(0.25 - 1e-6);
        expect(t.size[1] / (f.size[1])).toBeLessThanOrEqual(0.45 + 1e-6);
      }
    }
  });

  it("tops every antenna with a beacon", () => {
    for (const s of [...streets, null]) {
      const items = s ? layoutStreet(s, CITY_SEED) : layoutNexus(CITY_SEED);
      const antennas = items.filter((i) => i.type === "antenna");
      const beacons = items.filter((i) => i.type === "beacon");
      expect(antennas.length).toBeGreaterThan(0);
      expect(beacons.length).toBe(antennas.length);
      for (const a of antennas) {
        const tip = a.position[1] + a.size[1] / 2;
        expect(beacons.some((b) => b.position[0] === a.position[0] && b.position[2] === a.position[2] && Math.abs(b.position[1] - tip) < 0.5)).toBe(true);
      }
    }
  });

  it("puts roof clutter and edge strips on the buildings", () => {
    for (const s of streets) {
      const items = layoutStreet(s, CITY_SEED);
      expect(items.some((i) => i.type === "roof")).toBe(true);
      expect(items.some((i) => i.type === "edgeStrip")).toBe(true);
    }
  });
});

describe("high signs", () => {
  it("stacks vertical signs up building edges", () => {
    for (const s of streets) {
      const vs = layoutStreet(s, CITY_SEED).filter((i) => i.type === "signV");
      const groups = new Map<string, KitItem[]>();
      for (const v of vs) {
        const key = `${Math.round(v.position[0] / 0.1)},${Math.round(v.position[2] / 0.1)}`;
        groups.set(key, [...(groups.get(key) ?? []), v]);
      }
      const stacks = [...groups.values()].filter((g) => {
        if (g.length < 3) return false;
        const ys = g.map((i) => i.position[1]);
        const top = g.reduce((a, b) => (a.position[1] > b.position[1] ? a : b));
        return ys.every((y, i) => i === 0 || y > ys[i - 1]) && top.position[1] > 20;
      });
      expect(stacks.length, s.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("places mid-height signs", () => {
    for (const s of streets) {
      const hs = layoutStreet(s, CITY_SEED).filter((i) => i.type === "signH" || i.type === "lightbox");
      expect(hs.filter((i) => i.position[1] > 9).length / hs.length, s.id).toBeGreaterThanOrEqual(0.25);
    }
  });
});
