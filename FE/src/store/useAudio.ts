// ค่าเสียงของเว็บ: เปิด/ปิดทั้งหมด, เสียงพูด AI, เสียงบรรยากาศ/ประกอบ — จำค่าในเบราว์เซอร์
// unlocked = ผู้ชมคลิกแล้ว (เบราว์เซอร์ไม่ยอมให้เล่นเสียงก่อนผู้ใช้โต้ตอบ)

import { create } from "zustand";
import { load, save } from "../lib/storage";

interface Saved {
  master: boolean;
  voice: boolean;
  ambience: boolean;
}

export interface AudioState extends Saved {
  unlocked: boolean;
  toggleMaster: () => void;
  setVoice: (on: boolean) => void;
  setAmbience: (on: boolean) => void;
  unlock: () => void;
  /** เปิดเสียงพูดได้จริงตอนนี้ไหม */
  voiceOn: () => boolean;
  /** เปิดเสียงบรรยากาศ/ประกอบได้จริงตอนนี้ไหม */
  ambienceOn: () => boolean;
}

const DEFAULTS: Saved = { master: true, voice: true, ambience: true };

export function initialAudioState(): Saved & { unlocked: boolean } {
  return { ...DEFAULTS, ...load<Partial<Saved>>("audio", {}), unlocked: false };
}

export const useAudio = create<AudioState>((set, get) => {
  const persist = () => {
    const { master, voice, ambience } = get();
    save("audio", { master, voice, ambience });
  };
  return {
    ...initialAudioState(),
    toggleMaster: () => {
      set((s) => ({ master: !s.master }));
      persist();
    },
    setVoice: (voice) => {
      set({ voice });
      persist();
    },
    setAmbience: (ambience) => {
      set({ ambience });
      persist();
    },
    unlock: () => set({ unlocked: true }),
    voiceOn: () => {
      const s = get();
      return s.unlocked && s.master && s.voice;
    },
    ambienceOn: () => {
      const s = get();
      return s.unlocked && s.master && s.ambience;
    },
  };
});
