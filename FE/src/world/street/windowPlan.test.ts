import { describe, expect, it } from "vitest";
import { planWindows, windowToggle, WINDOW_COLS, WINDOW_ROWS } from "./windowPlan";

const SEEDS = [11, 12, 13];

describe("planWindows", () => {
  it("lights 30–40% of bays", () => {
    for (const s of SEEDS) {
      const lit = planWindows(s).flat().filter((b) => b.lit).length;
      const f = lit / (WINDOW_COLS * WINDOW_ROWS);
      expect(f).toBeGreaterThanOrEqual(0.3);
      expect(f).toBeLessThanOrEqual(0.4);
    }
  });
  it("clusters by floor", () => {
    for (const s of SEEDS) {
      const counts = planWindows(s).map((row) => row.filter((b) => b.lit).length);
      expect(counts.filter((c) => c >= 6).length).toBeGreaterThanOrEqual(3);
      expect(counts.filter((c) => c <= 1).length).toBeGreaterThanOrEqual(3);
    }
  });
  it("keeps coloured bays rare", () => {
    for (const s of SEEDS) {
      const lit = planWindows(s).flat().filter((b) => b.lit);
      expect(lit.filter((b) => b.tone === "brand").length / lit.length).toBeLessThanOrEqual(0.06);
    }
  });
  it("is deterministic", () => {
    expect(planWindows(11)).toEqual(planWindows(11));
  });
  it("toggles about 2–3% of bays, slowly", () => {
    const N = 10000;
    const hs = Array.from({ length: N }, (_, i) => (i + 0.5) / N);
    expect(hs.filter((h) => windowToggle(h, 0) !== windowToggle(h, 0.001)).length).toBe(0);
    const diff = hs.filter((h) => windowToggle(h, 0) !== windowToggle(h, 600)).length / N;
    expect(diff).toBeGreaterThanOrEqual(0.015);
    expect(diff).toBeLessThanOrEqual(0.035);
    // แต่ละช่องเปลี่ยนสถานะได้ไม่เกิน 1 ครั้งต่อ 20 วินาที
    for (let i = 0; i < N; i += 7) {
      const h = hs[i];
      let prev = windowToggle(h, 0), lastChange = -Infinity;
      for (let t = 0.25; t <= 600; t += 0.25) {
        const s = windowToggle(h, t);
        if (s !== prev) {
          expect(t - lastChange).toBeGreaterThanOrEqual(20);
          lastChange = t;
          prev = s;
        }
      }
    }
  });
});
