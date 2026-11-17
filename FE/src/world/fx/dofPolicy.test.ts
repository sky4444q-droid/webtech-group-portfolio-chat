import { describe, expect, it } from "vitest";
import { dofBokeh, FOG_NEAR } from "./dofPolicy";

describe("dofBokeh", () => {
  it("returns 1.6 for eye mode when idle", () => {
    expect(dofBokeh({ enabled: true, mode: "eye", traveling: false })).toBe(1.6);
  });
  it("returns 0 for wide, travelling and disabled", () => {
    expect(dofBokeh({ enabled: true, mode: "wide", traveling: false })).toBe(0);
    expect(dofBokeh({ enabled: true, mode: "eye", traveling: true })).toBe(0);
    expect(dofBokeh({ enabled: false, mode: "eye", traveling: false })).toBe(0);
  });
  it("returns 0 on the bridge viewpoint so distant towers stay sharp", () => {
    expect(dofBokeh({ enabled: true, mode: "eye", traveling: false, viewpointId: "bridge" })).toBe(0);
    expect(dofBokeh({ enabled: true, mode: "eye", traveling: false, viewpointId: "center" })).toBe(1.6);
  });
  it("pushes fog start out", () => {
    expect(FOG_NEAR).toBe(70);
  });
});
