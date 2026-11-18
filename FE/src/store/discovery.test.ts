import { beforeEach, describe, expect, it, vi } from "vitest";
import { FRAGMENTS, initialDiscoveryState, useDiscovery } from "./useDiscovery";
import { NAV_ORDER } from "../config/districts";

describe("useDiscovery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    useDiscovery.setState(initialDiscoveryState());
  });

  it("keeps five fragments, all in places a visitor can go to (the Gate is intro-only)", () => {
    expect(FRAGMENTS).toHaveLength(5);
    expect(FRAGMENTS.some((f) => f.district === "gate")).toBe(false);
    expect(new Set(FRAGMENTS.map((f) => f.district))).toEqual(new Set(NAV_ORDER));
    expect(new Set(FRAGMENTS.map((f) => f.id)).size).toBe(5);
    expect(new Set(FRAGMENTS.map((f) => `${f.district}:${f.viewpoint}`)).size).toBe(5);
  });

  it("counts a new fragment once", () => {
    const id = FRAGMENTS[0].id;
    expect(useDiscovery.getState().find(id)).toBe(true);
    expect(useDiscovery.getState().find(id)).toBe(false);
    expect(useDiscovery.getState().found).toEqual([id]);
  });

  it("ignores unknown ids", () => {
    expect(useDiscovery.getState().find("nope")).toBe(false);
    expect(useDiscovery.getState().found).toEqual([]);
  });

  it("is complete after all five, and remembers across reloads", () => {
    for (const f of FRAGMENTS) useDiscovery.getState().find(f.id);
    expect(useDiscovery.getState().complete).toBe(true);
    expect(initialDiscoveryState().found).toHaveLength(5);
    expect(initialDiscoveryState().complete).toBe(true);
  });

  it("keeps working in memory when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(useDiscovery.getState().find(FRAGMENTS[1].id)).toBe(true);
    expect(useDiscovery.getState().found).toHaveLength(1);
  });
});
