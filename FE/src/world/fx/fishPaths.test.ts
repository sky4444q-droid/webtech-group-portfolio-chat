import { describe, expect, it } from "vitest";
import { DISTRICTS } from "../../config/districts";
import { NEXUS_HALF, STREETS, distanceToPolyline } from "../street/streets";
import { fishAt, fishPaths, fishPeriod } from "./fishPaths";

const paths = fishPaths(1);
const samples = (p: ReturnType<typeof fishPaths>[number]) =>
  Array.from({ length: 64 }, (_, i) => fishAt(p, (i / 64) * fishPeriod(p)).position);

describe("fishPaths", () => {
  it("มีปลา 8 ตัว ยาว 4-8", () => {
    expect(paths.length).toBe(8);
    for (const p of paths) expect(p.length).toBeGreaterThanOrEqual(4), expect(p.length).toBeLessThanOrEqual(8);
  });
  it("ความสูงอยู่ใน 10-25 ทั้งค่า y และทุกจุดที่ว่าย", () => {
    for (const p of paths) {
      expect(p.y).toBeGreaterThanOrEqual(10);
      expect(p.y).toBeLessThanOrEqual(25);
      for (const q of samples(p)) expect(q[1]).toBeGreaterThanOrEqual(10), expect(q[1]).toBeLessThanOrEqual(25);
    }
  });
  it("จุดที่ต่ำกว่า 9 ห่างแนวกลางถนนทุกสายอย่างน้อย 4", () => {
    for (const p of paths)
      for (const q of samples(p)) {
        if (q[1] >= 9) continue;
        for (const s of Object.values(STREETS)) expect(distanceToPolyline([q[0], q[2]], s.points)).toBeGreaterThanOrEqual(4);
      }
  });
  it("ห่างกล้องของทุกที่อย่างน้อย 3", () => {
    for (const p of paths)
      for (const q of samples(p))
        for (const d of Object.values(DISTRICTS)) {
          const c = d.camera.position;
          expect(Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2])).toBeGreaterThanOrEqual(3);
        }
  });
  it("ทุกจุดอยู่ในที่โล่ง (เหนือถนนไม่ชนผนัง หรือในลาน Nexus)", () => {
    for (const p of paths)
      for (const q of samples(p)) {
        const inPlaza = Math.abs(q[0]) <= NEXUS_HALF - 1 && Math.abs(q[2]) <= NEXUS_HALF - 1;
        const overStreet = Object.values(STREETS).some((s) => distanceToPolyline([q[0], q[2]], s.points) <= s.halfWidth - 0.5);
        expect(inPlaza || overStreet).toBe(true);
      }
  });
  it("fishAt วนซ้ำตามคาบ และไม่มี NaN", () => {
    for (const p of paths) {
      const T = fishPeriod(p);
      for (const t of [0, 1.3, 7.7]) {
        const a = fishAt(p, t);
        const b = fishAt(p, t + T);
        for (let k = 0; k < 3; k++) expect(b.position[k]).toBeCloseTo(a.position[k], 5);
        expect(Math.cos(b.heading)).toBeCloseTo(Math.cos(a.heading), 5);
        expect(Number.isFinite(a.heading)).toBe(true);
      }
    }
  });
  it("หันหัวไปทางที่ว่าย (แกน +x ท้องถิ่นหมุนด้วย heading)", () => {
    const p = paths[0];
    const a = fishAt(p, 0).position;
    const { heading } = fishAt(p, 0.01);
    const b = fishAt(p, 0.02).position;
    const dir = [b[0] - a[0], b[2] - a[2]];
    const n = Math.hypot(dir[0], dir[1]);
    expect(Math.cos(heading)).toBeCloseTo(dir[0] / n, 2);
    expect(-Math.sin(heading)).toBeCloseTo(dir[1] / n, 2);
  });
  it("seed เดิมได้ผลเดิม", () => {
    expect(fishPaths(1)).toEqual(fishPaths(1));
  });
});
