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
    useWorld.getState().openPanel({ kind: "team", display: "full" });
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

  describe("viewpoints", () => {
    it("goToViewpoint then backViewpoint returns to the previous one", () => {
      useWorld.getState().goToViewpoint(2);
      expect(useWorld.getState().viewpoint).toBe(2);
      expect(useWorld.getState().backViewpoint()).toBe(true);
      expect(useWorld.getState().viewpoint).toBe(0);
    });

    it("backViewpoint at the first viewpoint returns false", () => {
      expect(useWorld.getState().backViewpoint()).toBe(false);
    });

    it("ignores goToViewpoint while traveling or before the intro ends", () => {
      useWorld.getState().travelTo("projects");
      useWorld.getState().goToViewpoint(1);
      expect(useWorld.getState().viewpoint).toBe(0);
      reset({ introDone: false });
      useWorld.getState().goToViewpoint(1);
      expect(useWorld.getState().viewpoint).toBe(0);
    });

    it("ignores an out-of-range viewpoint", () => {
      useWorld.getState().goToViewpoint(99);
      expect(useWorld.getState().viewpoint).toBe(0);
    });

    it("arriving in a district resets the viewpoint", () => {
      useWorld.getState().goToViewpoint(1);
      useWorld.getState().travelTo("team");
      useWorld.getState().finishTravel();
      expect(useWorld.getState().viewpoint).toBe(0);
      expect(useWorld.getState().viewpointStack).toEqual([]);
    });

    it("closeTopmost steps back a viewpoint when nothing else is open", () => {
      useWorld.getState().goToViewpoint(1);
      useWorld.getState().openPanel({ kind: "team", display: "full" });
      useWorld.getState().closeTopmost();
      expect(useWorld.getState().viewpoint).toBe(1);
      useWorld.getState().closeTopmost();
      expect(useWorld.getState().viewpoint).toBe(0);
    });
  });

  describe("detail display", () => {
    it("expandPanel turns a hologram into fullscreen", () => {
      useWorld.getState().openPanel({ kind: "project", id: "project-1", display: "holo" });
      useWorld.getState().expandPanel();
      expect(useWorld.getState().panel).toEqual({ kind: "project", id: "project-1", display: "full" });
    });

    it("Esc from fullscreen closes everything", () => {
      useWorld.getState().openPanel({ kind: "project", id: "project-1", display: "full" });
      useWorld.getState().closeTopmost();
      expect(useWorld.getState().panel).toBeNull();
    });

    it("expandPanel does nothing without a hologram open", () => {
      useWorld.getState().expandPanel();
      expect(useWorld.getState().panel).toBeNull();
    });
  });

  describe("history during travel", () => {
    it("a Back press during a trip is queued and taken after arriving", () => {
      useWorld.getState().travelTo("projects");
      useWorld.getState().travelTo("nexus", { fromHistory: true });
      useWorld.getState().finishTravel();
      expect(useWorld.getState().district).toBe("projects");
      expect(useWorld.getState().travel?.to).toBe("nexus");
    });

    it("a Mini Map click during a trip is still ignored", () => {
      useWorld.getState().travelTo("projects");
      useWorld.getState().travelTo("team");
      useWorld.getState().finishTravel();
      expect(useWorld.getState().travel).toBeNull();
    });
  });
});
