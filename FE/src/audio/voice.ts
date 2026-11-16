// เสียงพูดของ AI ด้วยเสียงอ่านที่มีในเบราว์เซอร์ (Web Speech API) — ไม่มีค่าใช้จ่าย ไม่ต้องใช้คีย์
// ถ้าเครื่องไม่มีเสียงภาษานั้น จะไม่พูด (หน้าเว็บยังแสดงซับไตเติล)

import type { Lang } from "../types";

export type SynthLike = Pick<SpeechSynthesis, "getVoices" | "speak" | "cancel">;

const LANG_TAG: Record<Lang, string> = { th: "th-TH", en: "en-US" };

function defaultSynth(): SynthLike | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

function defaultUtterance(): typeof SpeechSynthesisUtterance | null {
  return typeof SpeechSynthesisUtterance !== "undefined" ? SpeechSynthesisUtterance : null;
}

export function speak(
  text: string,
  lang: Lang,
  onEnd: () => void,
  synth: SynthLike | null = defaultSynth(),
  Utterance: typeof SpeechSynthesisUtterance | null = defaultUtterance(),
): void {
  if (!synth || !Utterance) return onEnd();
  const prefix = lang === "th" ? "th" : "en";
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(prefix));
  if (!voice) return onEnd();

  synth.cancel();
  const u = new Utterance(text);
  u.lang = LANG_TAG[lang];
  u.voice = voice;
  u.rate = 1;
  u.pitch = lang === "th" ? 1.05 : 1.1;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    onEnd();
  };
  u.onend = finish;
  u.onerror = finish;
  synth.speak(u);
}

export function cancel(synth: SynthLike | null = defaultSynth()): void {
  synth?.cancel();
}
