import { beforeEach, describe, expect, it } from "vitest";
import { travelKind } from "./kind";
import { initialWorldState, useWorld } from "../../store/useWorld";
import type { DistrictId } from "../../types";

const normal = { reducedMotion: false, quality: "high" as const };

describe("travelKind", () => {
  it("guides every trip normally", () => {
    for (const [a, b] of [["nexus", "projects"], ["gate", "team"], ["team", "sanctuary"], ["sanctuary", "gate"]] as [DistrictId, DistrictId][])
      expect(travelKind(a, b, normal)).toBe("guide");
  });

  it("fades for reduced motion, low quality or a deep link", () => {
    expect(travelKind("nexus", "projects", { reducedMotion: true, quality: "high" })).toBe("fade");
    expect(travelKind("nexus", "team", { reducedMotion: false, quality: "low" })).toBe("fade");
    expect(travelKind("gate", "team", { ...normal, deepLink: true })).toBe("fade");
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

  it("skipWalk asks to jump to the end only during a guide trip", () => {
    useWorld.getState().skipWalk();
    expect(useWorld.getState().skipRequested).toBe(false);
    useWorld.getState().travelTo("projects");
    useWorld.setState({ travelKind: "guide" });
    useWorld.getState().skipWalk();
    expect(useWorld.getState().skipRequested).toBe(true);
    useWorld.getState().finishTravel();
    expect(useWorld.getState().skipRequested).toBe(false);
  });

  it("fades a deep link after the intro", () => {
    useWorld.setState({ introDone: false, district: "gate", pendingTarget: "team" });
    useWorld.getState().finishIntro();
    expect(useWorld.getState().travelKind).toBe("fade");
  });

  it("guides the default first trip to nexus", () => {
    useWorld.setState({ introDone: false, district: "gate", pendingTarget: "nexus" });
    useWorld.getState().finishIntro();
    expect(useWorld.getState().travelKind).toBe("guide");
  });

  it("queues a history destination pressed during a guide trip and runs it on arrival", () => {
    useWorld.getState().travelTo("team");
    useWorld.getState().travelTo("sanctuary", { fromHistory: true });
    expect(useWorld.getState().travel?.to).toBe("team");
    useWorld.getState().finishTravel();
    expect(useWorld.getState().travel).toEqual({ from: "team", to: "sanctuary" });
  });

  it("treats the Gate as intro-only: a trip to it goes to Nexus instead", () => {
    useWorld.getState().travelTo("team");
    useWorld.getState().finishTravel();
    useWorld.getState().travelTo("gate");
    expect(useWorld.getState().travel).toEqual({ from: "team", to: "nexus" });
  });

  it("lands a #/gate deep link at Nexus after the intro", () => {
    useWorld.setState({ introDone: false, district: "gate", pendingTarget: "nexus" });
    useWorld.getState().travelTo("gate");
    useWorld.getState().finishIntro();
    expect(useWorld.getState().travel).toEqual({ from: "gate", to: "nexus" });
    expect(useWorld.getState().travelKind).toBe("guide");
  });

  it("ignores a non-history travel request during a trip", () => {
    useWorld.getState().travelTo("team");
    useWorld.getState().travelTo("gate");
    useWorld.getState().finishTravel();
    expect(useWorld.getState().travel).toBeNull();
    expect(useWorld.getState().district).toBe("team");
  });
});
