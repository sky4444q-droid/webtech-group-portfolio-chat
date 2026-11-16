import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiDeps, initialAiState, SUBTITLE_HOLD_MS, useAi } from "./useAi";
import { initialAudioState, useAudio } from "./useAudio";
import { initialWorldState, useWorld } from "./useWorld";
import { t } from "../i18n";

describe("useAi", () => {
  let onEnd: (() => void) | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    useWorld.setState(initialWorldState());
    useAudio.setState({ ...initialAudioState(), unlocked: true });
    useAi.setState(initialAiState());
    onEnd = null;
    vi.spyOn(aiDeps, "speak").mockImplementation((_text, _lang, end) => {
      onEnd = end;
      return true;
    });
    vi.spyOn(aiDeps, "duck").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("say shows the subtitle, speaks, and returns to idle when speech ends", () => {
    useAi.getState().say("voiceGreeting");
    expect(useAi.getState().mood).toBe("speaking");
    expect(useAi.getState().subtitle).toBe(t("th", "voiceGreeting"));
    expect(aiDeps.speak).toHaveBeenCalledOnce();
    onEnd!();
    expect(useAi.getState().mood).toBe("idle");
    vi.advanceTimersByTime(SUBTITLE_HOLD_MS);
    expect(useAi.getState().subtitle).toBeNull();
  });

  it("with voice off it shows the subtitle without speaking", () => {
    useAudio.getState().setVoice(false);
    useAi.getState().say("voiceGreeting");
    expect(aiDeps.speak).not.toHaveBeenCalled();
    expect(useAi.getState().subtitle).toBe(t("th", "voiceGreeting"));
    vi.advanceTimersByTime(20_000);
    expect(useAi.getState().mood).toBe("idle");
    expect(useAi.getState().subtitle).toBeNull();
  });

  it("does not speak before the visitor unlocks audio", () => {
    useAudio.setState({ unlocked: false });
    useAi.getState().say("voiceGreeting");
    expect(aiDeps.speak).not.toHaveBeenCalled();
    expect(useAi.getState().subtitle).not.toBeNull();
  });

  it("setMood with a hold returns to idle afterwards", () => {
    useAi.getState().setMood("happy", 1200);
    expect(useAi.getState().mood).toBe("happy");
    vi.advanceTimersByTime(1200);
    expect(useAi.getState().mood).toBe("idle");
  });

  it("arrive introduces a district only on the first visit", () => {
    useAi.getState().arrive("team");
    useAi.getState().arrive("team");
    expect(aiDeps.speak).toHaveBeenCalledOnce();
  });

  it("uses the selected language for the subtitle", () => {
    useWorld.getState().setLang("en");
    useAi.getState().say("voiceGreeting");
    expect(useAi.getState().subtitle).toBe(t("en", "voiceGreeting"));
  });

  it("noticeHover makes an idle AI curious for a moment", () => {
    useAi.getState().noticeHover();
    expect(useAi.getState().mood).toBe("curious");
    vi.advanceTimersByTime(1200);
    expect(useAi.getState().mood).toBe("idle");
  });

  it("noticeHover does not interrupt thinking or speaking", () => {
    useAi.getState().setMood("thinking");
    useAi.getState().noticeHover();
    expect(useAi.getState().mood).toBe("thinking");
  });

  it("noticeTyping shows listening unless the AI is thinking", () => {
    useAi.getState().noticeTyping();
    expect(useAi.getState().mood).toBe("listening");
    useAi.getState().setMood("thinking");
    useAi.getState().noticeTyping();
    expect(useAi.getState().mood).toBe("thinking");
  });

  it("keeps the subtitle long enough to read when the machine has no voice", () => {
    vi.mocked(aiDeps.speak).mockImplementation((_t, _l, end) => {
      end();
      return false;
    });
    useAi.getState().say("voiceGreeting");
    vi.advanceTimersByTime(SUBTITLE_HOLD_MS + 10);
    expect(useAi.getState().subtitle).not.toBeNull();
    vi.advanceTimersByTime(20_000);
    expect(useAi.getState().subtitle).toBeNull();
  });
});
