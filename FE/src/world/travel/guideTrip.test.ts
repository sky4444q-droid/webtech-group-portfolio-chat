import { describe, expect, it } from "vitest";
import { GUIDE_MAX_MS, guideAt, planGuideTrip } from "./guideTrip";
import { ELEVATOR_MS } from "../../config/timing";
import { DISTRICT_ORDER } from "../../config/districts";

const kinds = (from: Parameters<typeof planGuideTrip>[0], to: Parameters<typeof planGuideTrip>[1]) =>
  planGuideTrip(from, to).segments.map((s) => s.kind);

/** เวลาเริ่ม/จบของช่วงแรกที่ชนิดตรงกัน */
function window(plan: ReturnType<typeof planGuideTrip>, kind: string): [number, number] {
  let t = 0;
  for (const s of plan.segments) {
    if (s.kind === kind) return [t, t + s.ms];
    t += s.ms;
  }
  throw new Error(`no ${kind}`);
}

describe("planGuideTrip", () => {
  it("walks nexus → projects as shrink, walk, morph", () => {
    expect(kinds("nexus", "projects")).toEqual(["shrink", "walk", "morph"]);
  });

  it("starts from the gate without shrinking (the mascot is already there)", () => {
    expect(kinds("gate", "nexus")).toEqual(["walk", "morph"]);
  });

  it("turns to greet instead of morphing when arriving at the gate", () => {
    const k = kinds("nexus", "gate");
    expect(k[k.length - 1]).toBe("turn");
  });

  it("goes up the elevator after walking to team HQ", () => {
    expect(kinds("nexus", "team")).toEqual(["shrink", "walk", "elevatorUp", "morph"]);
  });

  it("leaves team HQ by elevator first", () => {
    expect(kinds("team", "projects")).toEqual(["shrink", "elevatorDown", "walk", "morph"]);
  });

  it("keeps every trip within 9 s excluding the elevator", () => {
    for (const a of DISTRICT_ORDER)
      for (const b of DISTRICT_ORDER) {
        if (a === b) continue;
        const plan = planGuideTrip(a, b);
        const elevator = plan.segments.filter((s) => s.kind.startsWith("elevator")).length * ELEVATOR_MS;
        expect(plan.totalMs - elevator).toBeLessThanOrEqual(GUIDE_MAX_MS);
        expect(plan.totalMs).toBe(plan.segments.reduce((n, s) => n + s.ms, 0));
      }
  });
});

describe("guideAt", () => {
  it("keeps the camera 3–5 units behind the mascot while walking", () => {
    const plan = planGuideTrip("gate", "team");
    const [a, b] = window(plan, "walk");
    for (let i = 0; i <= 10; i++) {
      const g = guideAt(plan, a + ((b - a) * i) / 10);
      expect(g.segment).toBe("walk");
      const cam = g.camera!.position;
      const dx = cam[0] - g.mascot[0];
      const dz = cam[2] - g.mascot[2];
      const flat = Math.hypot(dx, dz);
      expect(flat).toBeGreaterThanOrEqual(3);
      expect(flat).toBeLessThanOrEqual(5);
      // อยู่ฝั่งตรงข้ามกับทิศที่ตัวจิ๋วหัน
      expect(dx * Math.sin(g.heading) + dz * Math.cos(g.heading)).toBeLessThan(0);
    }
  });

  it("hides the origin AI during shrink and reveals the destination AI during morph", () => {
    const plan = planGuideTrip("nexus", "sanctuary");
    const [s0, s1] = window(plan, "shrink");
    expect(guideAt(plan, s0).aiFrom).toBeCloseTo(1);
    expect(guideAt(plan, s1).aiFrom).toBeCloseTo(0);
    const [m0, m1] = window(plan, "morph");
    expect(guideAt(plan, m0).aiTo).toBeCloseTo(0);
    expect(guideAt(plan, m1).aiTo).toBeCloseTo(1);
    expect(guideAt(plan, plan.totalMs).mascotVisible).toBe(false);
  });

  it("keeps the mascot visible at the end when arriving at the gate", () => {
    const plan = planGuideTrip("projects", "gate");
    const g = guideAt(plan, plan.totalMs);
    expect(g.mascotVisible).toBe(true);
    expect(g.aiTo).toBe(0);
  });

  it("returns no camera during elevator segments", () => {
    const plan = planGuideTrip("projects", "team");
    const [a, b] = window(plan, "elevatorUp");
    expect(guideAt(plan, (a + b) / 2).camera).toBeNull();
  });
});
