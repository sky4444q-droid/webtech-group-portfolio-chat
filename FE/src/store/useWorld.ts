// สถานะกลางของโลก: อยู่พื้นที่ไหน กำลังเดินทางไหม เปิด panel อะไร ภาษา คุณภาพกราฟิก

import { VIEWPOINTS } from "../config/viewpoints";
import { create } from "zustand";
import type { DistrictId, Lang } from "../types";
import { load, save } from "../lib/storage";

export type Panel = { kind: "project"; id: string } | { kind: "team" } | { kind: "contact" } | null;
export type Quality = "high" | "low";

export interface WorldState {
  lang: Lang;
  district: DistrictId;
  travel: { from: DistrictId; to: DistrictId } | null;
  introDone: boolean;
  /** ที่ที่จะไปหลังจบ Intro */
  pendingTarget: DistrictId;
  chatOpen: boolean;
  panel: Panel;
  quality: Quality;
  guideSeen: boolean;
  /** จุดชมปัจจุบันในพื้นที่ (index ใน VIEWPOINTS) */
  viewpoint: number;
  /** จุดชมก่อนหน้า สำหรับปุ่มย้อนกลับ */
  viewpointStack: number[];

  setLang: (lang: Lang) => void;
  travelTo: (id: DistrictId) => void;
  finishTravel: () => void;
  finishIntro: () => void;
  setChatOpen: (open: boolean) => void;
  toggleChat: () => void;
  openPanel: (panel: Exclude<Panel, null>) => void;
  closePanel: () => void;
  setQuality: (q: Quality) => void;
  dismissGuide: () => void;
  /** ปุ่ม Esc: ปิด panel ก่อน ถ้าไม่มีค่อยปิดแชท แล้วค่อยย้อนจุดชม */
  closeTopmost: () => void;
  goToViewpoint: (index: number) => void;
  /** ย้อนกลับจุดชมก่อนหน้า — คืน false ถ้าอยู่จุดแรกแล้ว */
  backViewpoint: () => boolean;
}

type WorldData = Pick<
  WorldState,
  "lang" | "district" | "travel" | "introDone" | "pendingTarget" | "chatOpen" | "panel" | "quality" | "guideSeen" | "viewpoint" | "viewpointStack"
>;

export function initialWorldState(): WorldData {
  return {
    lang: load<Lang>("lang", "th"),
    district: "gate",
    travel: null,
    introDone: false,
    pendingTarget: "nexus",
    chatOpen: false,
    panel: null,
    quality: load<Quality>("quality", "high"),
    guideSeen: load<boolean>("guideSeen", false),
    viewpoint: 0,
    viewpointStack: [],
  };
}

export const useWorld = create<WorldState>((set, get) => ({
  ...initialWorldState(),

  setLang: (lang) => {
    set({ lang });
    save("lang", lang);
  },

  travelTo: (id) => {
    const s = get();
    if (!s.introDone) {
      set({ pendingTarget: id });
      return;
    }
    if (s.travel || id === s.district) return;
    set({ travel: { from: s.district, to: id }, panel: null });
  },

  finishTravel: () => {
    const { travel } = get();
    if (!travel) return;
    set({ district: travel.to, travel: null, panel: null, viewpoint: 0, viewpointStack: [] });
  },

  finishIntro: () => {
    if (get().introDone) return;
    set({ introDone: true });
    get().travelTo(get().pendingTarget);
  },

  setChatOpen: (chatOpen) => set({ chatOpen }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),

  setQuality: (quality) => {
    set({ quality });
    save("quality", quality);
  },

  dismissGuide: () => {
    set({ guideSeen: true });
    save("guideSeen", true);
  },

  closeTopmost: () => {
    const s = get();
    if (s.panel) set({ panel: null });
    else if (s.chatOpen) set({ chatOpen: false });
    else get().backViewpoint();
  },

  goToViewpoint: (index) => {
    const s = get();
    if (!s.introDone || s.travel || index === s.viewpoint) return;
    if (index < 0 || index >= VIEWPOINTS[s.district].length) return;
    set({ viewpoint: index, viewpointStack: [...s.viewpointStack, s.viewpoint], panel: null });
  },

  backViewpoint: () => {
    const s = get();
    if (s.travel || s.viewpointStack.length === 0) return false;
    const stack = s.viewpointStack.slice(0, -1);
    set({ viewpoint: s.viewpointStack[s.viewpointStack.length - 1], viewpointStack: stack, panel: null });
    return true;
  },
}));
