// สถานะของ AI ตัวเดียวที่อยู่ทุกพื้นที่: อารมณ์ (ใช้กับทุกร่าง), ซับไตเติลของคำพูด และการพูดแบบ Contextual Voice

import { create } from "zustand";
import type { DistrictId } from "../types";
import { t, type DictKey } from "../i18n";
import { useWorld } from "./useWorld";
import { useAudio } from "./useAudio";
import * as voice from "../audio/voice";
import * as sfx from "../audio/sfx";

/** walk = เดินใน Intro · turn = หันมาทักทายตอนจบ Intro · guide = หลังเข้าโลก (นำทางทุกการเดินทาง) */
export type MascotPhase = "walk" | "turn" | "guide";

export type AiMood = "idle" | "curious" | "listening" | "thinking" | "speaking" | "happy" | "error";

/** ซับไตเติลค้างอยู่หลังพูดจบ */
export const SUBTITLE_HOLD_MS = 1800;

/** แยกไว้เพื่อให้ test แทนที่เสียงจริงได้ */
export const aiDeps = {
  /** คืน false ถ้าไม่ได้พูดจริง (ไม่มีเสียงภาษานั้น / เบราว์เซอร์ไม่รองรับ) */
  speak: voice.speak as (text: string, lang: "th" | "en", onEnd: () => void) => boolean,
  cancel: () => voice.cancel(),
  duck: (on: boolean) => sfx.duck(on),
};

export interface AiState {
  mood: AiMood;
  subtitle: string | null;
  arrived: DistrictId[];
  /** ตัวจิ๋วใน Intro */
  mascotPhase: MascotPhase;
  setMascotPhase: (p: MascotPhase) => void;
  setMood: (mood: AiMood, holdMs?: number) => void;
  say: (key: DictKey) => void;
  /** ไปถึงพื้นที่ — แนะนำพื้นที่เฉพาะครั้งแรกของการเข้าชม */
  arrive: (district: DistrictId) => void;
  /** ผู้ชมชี้วัตถุที่คลิกได้ → AI สนใจชั่วครู่ */
  noticeHover: () => void;
  /** ผู้ชมกำลังพิมพ์ในแชท → AI ฟัง */
  noticeTyping: () => void;
}

type AiData = Pick<AiState, "mood" | "subtitle" | "arrived" | "mascotPhase">;

export function initialAiState(): AiData {
  return { mood: "idle", subtitle: null, arrived: [], mascotPhase: "walk" };
}

const ARRIVE_KEYS: Record<DistrictId, DictKey> = {
  gate: "voiceArriveGate",
  nexus: "voiceArriveNexus",
  projects: "voiceArriveProjects",
  team: "voiceArriveTeam",
  sanctuary: "voiceArriveSanctuary",
};

let moodTimer: ReturnType<typeof setTimeout> | undefined;
let subtitleTimer: ReturnType<typeof setTimeout> | undefined;
let speechId = 0;

export const useAi = create<AiState>((set, get) => ({
  ...initialAiState(),

  setMood: (mood, holdMs) => {
    clearTimeout(moodTimer);
    set({ mood });
    if (holdMs) moodTimer = setTimeout(() => set({ mood: "idle" }), holdMs);
  },

  say: (key) => {
    const lang = useWorld.getState().lang;
    const text = t(lang, key);
    const id = ++speechId;
    clearTimeout(subtitleTimer);
    get().setMood("speaking");
    set({ subtitle: text });

    // ไม่มีเสียง: ให้ซับไตเติลอยู่นานพอให้อ่านทัน
    const readMs = Math.max(2200, text.length * 70);
    let spoken = false;
    const end = () => {
      if (id !== speechId) return; // มีคำพูดใหม่มาแทนแล้ว
      aiDeps.duck(false);
      if (get().mood === "speaking") get().setMood("idle");
      clearTimeout(subtitleTimer);
      subtitleTimer = setTimeout(() => {
        if (id === speechId) set({ subtitle: null });
      }, SUBTITLE_HOLD_MS);
    };
    const endSilently = () => {
      clearTimeout(subtitleTimer);
      subtitleTimer = setTimeout(end, readMs);
    };

    if (useAudio.getState().voiceOn()) {
      aiDeps.duck(true);
      spoken = aiDeps.speak(text, lang, () => {
        if (spoken) end();
      });
      if (!spoken) {
        aiDeps.duck(false);
        endSilently();
      }
    } else {
      endSilently();
    }
  },

  setMascotPhase: (mascotPhase) => set({ mascotPhase }),

  noticeHover: () => {
    const m = get().mood;
    if (m === "idle" || m === "curious") get().setMood("curious", 1200);
  },

  noticeTyping: () => {
    const m = get().mood;
    if (m !== "thinking" && m !== "speaking") get().setMood("listening", 1500);
  },

  arrive: (district) => {
    if (get().arrived.includes(district)) return;
    set((s) => ({ arrived: [...s.arrived, district] }));
    get().say(ARRIVE_KEYS[district]);
  },
}));
