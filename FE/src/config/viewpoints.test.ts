import { describe, expect, it } from "vitest";
import { VIEWPOINTS, viewpointWorld } from "./viewpoints";
import { DISTRICT_ORDER, DISTRICTS } from "./districts";
import { th } from "../i18n/th";

describe("VIEWPOINTS", () => {
  it("gives every district 2–4 viewpoints with unique ids", () => {
    for (const d of DISTRICT_ORDER) {
      const list = VIEWPOINTS[d];
      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list.length).toBeLessThanOrEqual(4);
      expect(new Set(list.map((v) => v.id)).size).toBe(list.length);
    }
  });

  it("uses eye-level views in Team HQ and the AI Sanctuary", () => {
    for (const d of ["team", "sanctuary"] as const) {
      for (const v of VIEWPOINTS[d]) {
        expect(v.mode).toBe("eye");
        expect(v.position[1]).toBeGreaterThan(1.2);
        expect(v.position[1]).toBeLessThan(2.6);
      }
    }
  });

  it("has a Thai label for every viewpoint", () => {
    for (const d of DISTRICT_ORDER) for (const v of VIEWPOINTS[d]) expect(th[v.label]).toBeTruthy();
  });

  it("starts each district at its existing default camera (except eye-level districts)", () => {
    for (const d of ["gate", "nexus", "projects"] as const) {
      const w = viewpointWorld(d, 0);
      expect(w.position).toEqual(DISTRICTS[d].camera.position);
      expect(w.target).toEqual(DISTRICTS[d].camera.target);
    }
  });

  it("viewpointWorld offsets by the district position", () => {
    const w = viewpointWorld("team", 0);
    const local = VIEWPOINTS.team[0].position;
    expect(w.position).toEqual([local[0] + 90, local[1], local[2]]);
  });
});
