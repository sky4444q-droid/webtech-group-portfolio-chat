import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialWorldState, useWorld } from "./useWorld";

function reset(overrides: Partial<ReturnType<typeof useWorld.getState>> = {}) {
  useWorld.setState({ ...initialWorldState(), ...overrides });
}

describe("useWorld", () => {
  beforeEach(() => {
    window.localStorage.clear();
    reset({ introDone: true, district: "nexus" });
  });

  it("starts traveling to another district", () => {
    useWorld.getState().travelTo("projects");
    expect(useWorld.getState().travel).toEqual({ from: "nexus", to: "projects" });
  });

  it("ignores travel requests while already traveling", () => {
    useWorld.getState().travelTo("projects");
    useWorld.getState().travelTo("team");
    expect(useWorld.getState().travel).toEqual({ from: "nexus", to: "projects" });
  });

  it("ignores travel to the current district", () => {
    useWorld.getState().travelTo("nexus");
    expect(useWorld.getState().travel).toBeNull();
  });

  it("finishTravel arrives and closes any open panel", () => {
    useWorld.getState().openPanel({ kind: "team" });
    useWorld.getState().travelTo("team");
    useWorld.getState().finishTravel();
    const s = useWorld.getState();
    expect(s.district).toBe("team");
    expect(s.travel).toBeNull();
    expect(s.panel).toBeNull();
  });

  it("before the intro ends, remembers the target instead of traveling", () => {
    reset({ introDone: false, district: "gate" });
    useWorld.getState().travelTo("projects");
    expect(useWorld.getState().travel).toBeNull();
    expect(useWorld.getState().pendingTarget).toBe("projects");
  });

  it("finishIntro travels to the remembered target", () => {
    reset({ introDone: false, district: "gate", pendingTarget: "team" });
    useWorld.getState().finishIntro();
    expect(useWorld.getState().introDone).toBe(true);
    expect(useWorld.getState().travel).toEqual({ from: "gate", to: "team" });
  });

  it("closeTopmost closes the panel first, then the chat", () => {
    useWorld.getState().setChatOpen(true);
    useWorld.getState().openPanel({ kind: "contact" });
    useWorld.getState().closeTopmost();
    expect(useWorld.getState().panel).toBeNull();
    expect(useWorld.getState().chatOpen).toBe(true);
    useWorld.getState().closeTopmost();
    expect(useWorld.getState().chatOpen).toBe(false);
  });

  it("still changes language when localStorage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    useWorld.getState().setLang("en");
    expect(useWorld.getState().lang).toBe("en");
    spy.mockRestore();
  });
});
