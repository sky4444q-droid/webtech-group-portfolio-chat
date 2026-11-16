import { beforeEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { travelKind } from "./kind";
import { walkPath, EYE_HEIGHT } from "./paths";
import { DISTRICTS } from "../../config/districts";
import { initialWorldState, useWorld } from "../../store/useWorld";
import type { DistrictId } from "../../types";

const normal = { reducedMotion: false, quality: "high" as const };

describe("travelKind", () => {
  it.each([
    ["nexus", "projects", "walk"],
    ["projects", "nexus", "walk"],
    ["gate", "projects", "walk"],
    ["nexus", "team", "elevator"],
    ["projects", "team", "elevator"],
    ["nexus", "sanctuary", "portal"],
    ["gate", "nexus", "fly"],
    ["team", "nexus", "fly"],
    ["sanctuary", "gate", "fly"],
  ] as [DistrictId, DistrictId, string][])("%s → %s is %s", (from, to, kind) => {
    expect(travelKind(from, to, normal)).toBe(kind);
  });

  it("fades for reduced motion or low quality", () => {
    expect(travelKind("nexus", "projects", { reducedMotion: true, quality: "high" })).toBe("fade");
    expect(travelKind("nexus", "team", { reducedMotion: false, quality: "low" })).toBe("fade");
  });
});

describe("walkPath", () => {
  const near = (p: THREE.Vector3, d: DistrictId, max: number) =>
    Math.hypot(p.x - DISTRICTS[d].position[0], p.z - DISTRICTS[d].position[2]) <= max;

  it("walks from the nexus edge to the gallery without a pre-flight", () => {
    const w = walkPath("nexus", "projects");
    expect(w.pre).toBeNull();
    expect(w.reverse).toBe(false);
    expect(near(w.walk.getPointAt(0), "nexus", 20)).toBe(true);
    expect(near(w.walk.getPointAt(1), "projects", 20)).toBe(true);
  });

  it("flies to the avenue first when starting elsewhere", () => {
    expect(walkPath("team", "projects").pre).not.toBeNull();
  });

  it("walks back in reverse to the nexus", () => {
    expect(walkPath("projects", "nexus").reverse).toBe(true);
  });

  it("keeps the walk at eye height", () => {
    const { walk } = walkPath("nexus", "projects");
    for (let i = 0; i <= 10; i++) expect(walk.getPointAt(i / 10).y).toBeCloseTo(EYE_HEIGHT, 1);
  });
});

describe("travel in the store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useWorld.setState({ ...initialWorldState(), introDone: true, district: "nexus" });
  });

  it("does not start another trip mid-way", () => {
    useWorld.getState().travelTo("projects");
    useWorld.getState().travelTo("team");
    expect(useWorld.getState().travel?.to).toBe("projects");
  });

  it("skipWalk asks to jump to the end only during a walk", () => {
    useWorld.getState().skipWalk();
    expect(useWorld.getState().skipRequested).toBe(false);
    useWorld.getState().travelTo("projects");
    useWorld.setState({ travelKind: "walk" });
    useWorld.getState().skipWalk();
    expect(useWorld.getState().skipRequested).toBe(true);
    useWorld.getState().finishTravel();
    expect(useWorld.getState().skipRequested).toBe(false);
  });
});
