import { describe, expect, it } from "vitest";
import { screenInterval } from "./screenPolicy";

describe("screenInterval", () => {
  it("redraws near screens fast on high", () => {
    for (const d of [0, 5, 11.9]) expect(screenInterval(d, "high")!).toBeLessThanOrEqual(100);
  });
  it("redraws mid screens slowly on high", () => {
    for (const d of [12, 20, 35]) {
      const v = screenInterval(d, "high")!;
      expect(v).toBeGreaterThanOrEqual(250);
      expect(v).toBeLessThanOrEqual(600);
    }
  });
  it("freezes far screens", () => expect(screenInterval(35.1, "high")).toBeNull());
  it("freezes everything on low", () => {
    for (const d of [0, 20, 80]) expect(screenInterval(d, "low")).toBeNull();
  });
});
