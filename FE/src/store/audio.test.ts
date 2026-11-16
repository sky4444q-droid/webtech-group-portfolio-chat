import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialAudioState, useAudio } from "./useAudio";

describe("useAudio", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    useAudio.setState(initialAudioState());
  });

  it("starts with every sound on and locked until the visitor clicks", () => {
    const s = useAudio.getState();
    expect([s.master, s.voice, s.ambience]).toEqual([true, true, true]);
    expect(s.unlocked).toBe(false);
  });

  it("remembers the sound settings across reloads", () => {
    useAudio.getState().toggleMaster();
    useAudio.getState().setVoice(false);
    const reloaded = initialAudioState();
    expect(reloaded.master).toBe(false);
    expect(reloaded.voice).toBe(false);
    expect(reloaded.ambience).toBe(true);
    expect(reloaded.unlocked).toBe(false);
  });

  it("still toggles when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => useAudio.getState().setAmbience(false)).not.toThrow();
    expect(useAudio.getState().ambience).toBe(false);
  });

  it("voiceOn / ambienceOn respect the master switch", () => {
    useAudio.getState().unlock();
    expect(useAudio.getState().voiceOn()).toBe(true);
    useAudio.getState().toggleMaster();
    expect(useAudio.getState().voiceOn()).toBe(false);
    expect(useAudio.getState().ambienceOn()).toBe(false);
  });
});
