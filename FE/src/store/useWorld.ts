// สถานะกลางของโลก: อยู่พื้นที่ไหน กำลังเดินทางไหม เปิด panel อะไร ภาษา คุณภาพกราฟิก

import { prefersReducedMotion, travelKind, type TravelKind } from "../world/travel/kind";
import { VIEWPOINTS } from "../config/viewpoints";
import { create } from "zustand";
import type { DistrictId, Lang } from "../types";
import { load, save } from "../lib/storage";

/** holo = Hologram ลอยในฉาก · full = เต็มจอ */
export type Display = "holo" | "full";
export type Panel =
  | { kind: "project"; id: string; display: Display }
  | { kind: "team"; display: Display }
  | { kind: "member"; id: string }
  | { kind: "contact" }
  | { kind: "architecture"; projectId: string }
  | null;
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
  /** ผู้ชมเลือกคุณภาพเองแล้ว → ระบบจะไม่ลดให้อัตโนมัติ */
  qualityChosen: boolean;
  guideSeen: boolean;
  /** จุดชมปัจจุบันในพื้นที่ (index ใน VIEWPOINTS) */
  viewpoint: number;
  /** จุดชมก่อนหน้า สำหรับปุ่มย้อนกลับ */
  viewpointStack: number[];
  /** ชนิดการเดินทางที่กำลังเล่น */
  travelKind: TravelKind | null;
  /** ผู้ชมคลิกเพื่อข้ามการเดิน — กล้องจะพาไปถึงทันที */
  skipRequested: boolean;

  setLang: (lang: Lang) => void;
  /** fromHistory = มาจากปุ่ม Back/Forward — ถ้ากำลังเดินทางอยู่จะจำไว้แล้วไปต่อเมื่อถึง */
  travelTo: (id: DistrictId, opts?: { fromHistory?: boolean; deepLink?: boolean }) => void;
  /** ปลายทางจากปุ่ม Back ที่กดระหว่างเดินทาง */
  queuedTarget: DistrictId | null;
  finishTravel: () => void;
  finishIntro: () => void;
  setChatOpen: (open: boolean) => void;
  toggleChat: () => void;
  openPanel: (panel: Exclude<Panel, null>) => void;
  closePanel: () => void;
  setQuality: (q: Quality) => void;
  /** เครื่องช้า: ลดเป็น low เฉพาะเมื่อผู้ชมยังไม่ได้เลือกเอง */
  autoLowerQuality: () => void;
  dismissGuide: () => void;
  /** ปุ่ม Esc: ปิด panel ก่อน ถ้าไม่มีค่อยปิดแชท แล้วค่อยย้อนจุดชม */
  closeTopmost: () => void;
  goToViewpoint: (index: number) => void;
  /** ย้อนกลับจุดชมก่อนหน้า — คืน false ถ้าอยู่จุดแรกแล้ว */
  backViewpoint: () => boolean;
  skipWalk: () => void;
  /** Hologram → เต็มจอ */
  expandPanel: () => void;
}

type WorldData = Pick<
  WorldState,
  "lang" | "district" | "travel" | "introDone" | "pendingTarget" | "chatOpen" | "panel" | "quality" | "qualityChosen" | "guideSeen" | "viewpoint" | "viewpointStack" | "travelKind" | "skipRequested" | "queuedTarget"
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
    qualityChosen: load<boolean>("qualityChosen", false),
    guideSeen: load<boolean>("guideSeen", false),
    viewpoint: 0,
    viewpointStack: [],
    travelKind: null,
    skipRequested: false,
    queuedTarget: null,
  };
}

export const useWorld = create<WorldState>((set, get) => ({
  ...initialWorldState(),

  setLang: (lang) => {
    set({ lang });
    save("lang", lang);
  },

  travelTo: (id, opts) => {
    const s = get();
    if (!s.introDone) {
      set({ pendingTarget: id });
      return;
    }
    if (s.travel) {
      if (opts?.fromHistory) set({ queuedTarget: id });
      return;
    }
    if (id === s.district) return;
    const kind = travelKind(s.district, id, { reducedMotion: prefersReducedMotion(), quality: s.quality, deepLink: opts?.deepLink });
    set({ travel: { from: s.district, to: id }, panel: null, travelKind: kind, skipRequested: false });
  },

  finishTravel: () => {
    const { travel } = get();
    if (!travel) return;
    const queued = get().queuedTarget;
    set({ district: travel.to, travel: null, panel: null, viewpoint: 0, viewpointStack: [], travelKind: null, skipRequested: false, queuedTarget: null });
    if (queued && queued !== travel.to) get().travelTo(queued);
  },

  finishIntro: () => {
    if (get().introDone) return;
    set({ introDone: true });
    const target = get().pendingTarget;
    // ลิงก์ตรงไปที่อื่น: จางภาพครั้งเดียว ไม่เดินต่อกันหลายถนน
    get().travelTo(target, { deepLink: target !== "nexus" });
  },

  setChatOpen: (chatOpen) => set({ chatOpen }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),

  setQuality: (quality) => {
    set({ quality, qualityChosen: true });
    save("quality", quality);
    save("qualityChosen", true);
  },

  autoLowerQuality: () => {
    if (get().qualityChosen || get().quality === "low") return;
    set({ quality: "low" });
    save("quality", "low");
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

  expandPanel: () => {
    const p = get().panel;
    if ((p?.kind === "project" || p?.kind === "team") && p.display === "holo") set({ panel: { ...p, display: "full" } });
  },

  skipWalk: () => {
    const s = get();
    if (s.travel && s.travelKind === "guide") set({ skipRequested: true });
  },

  backViewpoint: () => {
    const s = get();
    if (s.travel || s.viewpointStack.length === 0) return false;
    const stack = s.viewpointStack.slice(0, -1);
    set({ viewpoint: s.viewpointStack[s.viewpointStack.length - 1], viewpointStack: stack, panel: null });
    return true;
  },
}));
