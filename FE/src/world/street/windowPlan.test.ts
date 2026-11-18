import { describe, expect, it } from "vitest";
import { planWindows, windowToggle, WINDOW_COLS, WINDOW_ROWS } from "./windowPlan";

const SEEDS = [11, 12, 13];

describe("planWindows", () => {
  it("lights 12–18% of bays", () => {
    for (const s of SEEDS) {
      const lit = planWindows(s).flat().filter((b) => b.lit).length;
      const f = lit / (WINDOW_COLS * WINDOW_ROWS);
      expect(f).toBeGreaterThanOrEqual(0.12);
      expect(f).toBeLessThanOrEqual(0.18);
    }
  });
  it("groups lit bays into small runs and never fills a row", () => {
    for (const s of SEEDS) {
      const plan = planWindows(s);
      let runs = 0, litCount = 0;
      for (const row of plan) {
        const n = row.filter((b) => b.lit).length;
        expect(n).toBeLessThan(7);
        litCount += n;
        row.forEach((b, i) => { if (b.lit && !(i > 0 && row[i - 1].lit)) runs++; });
      }
      expect(litCount / runs).toBeGreaterThanOrEqual(1.5);
    }
  });
  it("uses mostly warm tones, rare brand, and low levels", () => {
    for (const s of SEEDS) {
      const lit = planWindows(s).flat().filter((b) => b.lit);
      expect(lit.filter((b) => b.tone === "brand").length / lit.length).toBeLessThanOrEqual(0.03);
      expect(lit.filter((b) => b.tone === "warm").length / lit.length).toBeGreaterThanOrEqual(0.55);
      const lv = lit.map((b) => b.level).sort((x, y) => x - y);
      expect(lv[Math.floor(lv.length / 2)]).toBeLessThanOrEqual(0.55);
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
