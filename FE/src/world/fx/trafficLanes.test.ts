import { describe, expect, it } from "vitest";
import { STREETS, distanceToPolyline } from "../street/streets";
import { trafficLanes } from "./trafficLanes";

describe("trafficLanes", () => {
  const lanes = trafficLanes(1);
  it("ทุกถนนมีอย่างน้อย 2 เลน", () => {
    for (const s of Object.values(STREETS)) {
      expect(lanes.filter((l) => l.street === s.id).length).toBeGreaterThanOrEqual(2);
    }
  });
  it("ทุกเลนอยู่สูง 12-25", () => {
    for (const l of lanes) for (const p of [l.from, l.to]) expect(p[1]).toBeGreaterThanOrEqual(12), expect(p[1]).toBeLessThanOrEqual(25);
  });
  it("ปลายเลนอยู่ในความกว้างถนน", () => {
    for (const l of lanes) {
      if (!l.street) continue;
      const s = STREETS[l.street];
      for (const p of [l.from, l.to]) expect(distanceToPolyline([p[0], p[2]], s.points)).toBeLessThanOrEqual(s.halfWidth);
    }
  });
  it("seed เดิมได้ผลเดิม", () => {
    expect(trafficLanes(1)).toEqual(trafficLanes(1));
  });
});
