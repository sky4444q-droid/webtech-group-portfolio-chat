import { describe, expect, it } from "vitest";
import { viewpointPath } from "./viewpointPaths";
import { BRIDGE } from "./bridge";

describe("viewpointPath", () => {
  it("climbs a stair at a deck end from the plaza to the bridge", () => {
    const path = viewpointPath("nexus", 0, 1);
    expect(path.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < path.length; i++) expect(path[i][1]).toBeGreaterThanOrEqual(path[i - 1][1]);
    expect(path[path.length - 1][1]).toBeGreaterThan(path[0][1]);
    // ขั้นบันไดอยู่ปลายสะพาน (ใกล้ปลายด้านใดด้านหนึ่งตามแกน x)
    const top = path[path.length - 1];
    expect(Math.abs(Math.abs(top[0]) - BRIDGE.length / 2)).toBeLessThanOrEqual(2);
  });

  it("walks back down along the same path reversed", () => {
    expect(viewpointPath("nexus", 1, 0)).toEqual([...viewpointPath("nexus", 0, 1)].reverse());
  });

  it("returns no path for other pairs", () => {
    expect(viewpointPath("nexus", 0, 0)).toEqual([]);
    expect(viewpointPath("gate", 0, 1)).toEqual([]);
    expect(viewpointPath("team", 1, 2)).toEqual([]);
  });
});
