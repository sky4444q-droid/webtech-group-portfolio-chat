// Discovery (ไม่บังคับ): เศษข้อมูล 5 ชิ้น ซ่อนตามที่ต่าง ๆ เห็นได้เมื่อไปยืนที่จุดชมบางจุด

import { create } from "zustand";
import type { DistrictId } from "../types";
import type { Vec3 } from "../config/districts";
import { load, save } from "../lib/storage";

export interface Fragment {
  id: string;
  district: DistrictId;
  /** เห็นเมื่ออยู่ที่จุดชม index นี้ */
  viewpoint: number;
  /** ตำแหน่งสัมพัทธ์กับพื้นที่ */
  position: Vec3;
}

export const FRAGMENTS: Fragment[] = [
  // ชิ้นนี้เคยอยู่ที่ Gate (ตอนนี้เป็นฉาก Intro อย่างเดียว) ย้ายมาปากซอยทางเข้าที่สี่แยก — คง id เดิมไว้เพื่อไม่ให้ของที่ผู้ชมเก็บไว้หาย
  { id: "frag-gate", district: "nexus", viewpoint: 0, position: [-4.5, 1.2, -2.5] },
  { id: "frag-nexus", district: "nexus", viewpoint: 1, position: [7.5, 1.5, -7.5] },
  { id: "frag-projects", district: "projects", viewpoint: 1, position: [-4.5, 1.1, -2] },
  // ข้างแท่นโฮโลแกรมของแสตมป์ (พิกัดล็อบบี้ +8) — มองเห็นจากจุดชม "สมาชิก"
  { id: "frag-team", district: "team", viewpoint: 1, position: [3.7 + 8, 1.3, -0.4] },
  { id: "frag-sanctuary", district: "sanctuary", viewpoint: 1, position: [-1.6, 1.1, 6] },
];

const IDS = new Set(FRAGMENTS.map((f) => f.id));

export interface DiscoveryState {
  found: string[];
  complete: boolean;
  /** คืน true ถ้าเป็นชิ้นใหม่ */
  find: (id: string) => boolean;
}

export function initialDiscoveryState(): Pick<DiscoveryState, "found" | "complete"> {
  const found = load<string[]>("discovery", []).filter((id) => IDS.has(id));
  return { found, complete: found.length === FRAGMENTS.length };
}

export const useDiscovery = create<DiscoveryState>((set, get) => ({
  ...initialDiscoveryState(),
  find: (id) => {
    const { found } = get();
    if (!IDS.has(id) || found.includes(id)) return false;
    const next = [...found, id];
    set({ found: next, complete: next.length === FRAGMENTS.length });
    save("discovery", next);
    return true;
  },
}));
