import { describe, expect, it } from "vitest";
import { introCamera, mascotAt } from "./introPath";
import { GATE_ARCH } from "../street/streets";
import { DISTRICTS } from "../../config/districts";
import { initialAiState, useAi } from "../../store/useAi";

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe("intro path", () => {
  it("keeps the camera 3–5 units behind the mascot along the walk", () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const cam = introCamera(t).position;
      const m = mascotAt(t).position;
      const flat = Math.hypot(cam[0] - m[0], cam[2] - m[2]);
      expect(flat).toBeGreaterThanOrEqual(3);
      expect(flat).toBeLessThanOrEqual(5);
      expect(cam[0]).toBeLessThan(m[0]); // อยู่ด้านหลัง (ฝั่งซุ้มประตู)
    }
  });

  it("starts at the city arch", () => {
    expect(dist(mascotAt(0).position, GATE_ARCH)).toBeLessThanOrEqual(2);
  });

  it("ends with the mascot at the gate anchor", () => {
    expect(dist(mascotAt(1).position, DISTRICTS.gate.position)).toBeLessThanOrEqual(2);
  });

  it("never puts the mascot below the ground", () => {
    for (let i = 0; i <= 20; i++) expect(mascotAt(i / 20).position[1]).toBeGreaterThanOrEqual(0);
  });

  it("takes at least six steps during the intro", () => {
    let cycles = 0;
    let prev = mascotAt(0).step;
    for (let i = 1; i <= 400; i++) {
      const s = mascotAt(i / 400).step;
      if (s < prev) cycles++;
      prev = s;
    }
    expect(cycles).toBeGreaterThanOrEqual(6);
  });

  it("the camera looks into the city (toward nexus, +x)", () => {
    const { position, target } = introCamera(0.5);
    expect(target[0]).toBeGreaterThan(position[0]);
  });
});

describe("mascot phase", () => {
  it("starts walking and can move to turn and guide", () => {
    useAi.setState(initialAiState());
    expect(useAi.getState().mascotPhase).toBe("walk");
    useAi.getState().setMascotPhase("guide");
    expect(useAi.getState().mascotPhase).toBe("guide");
  });
});
