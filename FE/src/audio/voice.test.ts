import { describe, expect, it, vi } from "vitest";
import { speak, type SynthLike } from "./voice";

function fakeSynth(voiceLangs: string[]) {
  const spoken: { text: string; lang: string; onend: (() => void) | null }[] = [];
  const synth: SynthLike = {
    getVoices: () => voiceLangs.map((lang) => ({ lang }) as SpeechSynthesisVoice),
    speak: vi.fn((u: SpeechSynthesisUtterance) => {
      spoken.push(u as unknown as { text: string; lang: string; onend: (() => void) | null });
    }),
    cancel: vi.fn(),
  };
  return { synth, spoken };
}

class FakeUtterance {
  text: string;
  lang = "";
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

describe("voice.speak", () => {
  it("ends immediately when the browser has no speech synthesis", () => {
    const onEnd = vi.fn();
    speak("สวัสดี", "th", onEnd, null);
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it("ends immediately when no voice exists for the language", () => {
    const { synth } = fakeSynth(["en-US"]);
    const onEnd = vi.fn();
    speak("สวัสดี", "th", onEnd, synth, FakeUtterance as unknown as typeof SpeechSynthesisUtterance);
    expect(onEnd).toHaveBeenCalledOnce();
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("cancels what is playing before speaking, and calls onEnd when done", () => {
    const { synth, spoken } = fakeSynth(["th-TH", "en-US"]);
    const onEnd = vi.fn();
    speak("hello", "en", onEnd, synth, FakeUtterance as unknown as typeof SpeechSynthesisUtterance);
    expect(synth.cancel).toHaveBeenCalled();
    expect(spoken[0].text).toBe("hello");
    expect(onEnd).not.toHaveBeenCalled();
    spoken[0].onend?.();
    expect(onEnd).toHaveBeenCalledOnce();
  });
});
