// Discovery (ไม่บังคับ): เศษข้อมูล 5 ชิ้น ซ่อนพื้นที่ละชิ้น เห็นได้เมื่อไปยืนที่จุดชมบางจุด

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
  { id: "frag-gate", district: "gate", viewpoint: 1, position: [2.6, 1.2, 24] },
  { id: "frag-nexus", district: "nexus", viewpoint: 3, position: [13.5, 1.5, -3] },
  { id: "frag-projects", district: "projects", viewpoint: 1, position: [-4.5, 1.1, -2] },
  { id: "frag-team", district: "team", viewpoint: 2, position: [6.6, 1.2, -3.6] },
  { id: "frag-sanctuary", district: "sanctuary", viewpoint: 1, position: [-4, 1.1, 1] },
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
