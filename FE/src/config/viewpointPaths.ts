// เส้นทางพิเศษระหว่างจุดชม (พิกัดโลก ไม่รวมจุดต้นและปลาย) — ตอนนี้มีแค่เดินขึ้น/ลงบันไดสะพานลอย Nexus

import type { DistrictId } from "../types";
import { DISTRICTS, type Vec3 } from "./districts";
import { BRIDGE, STAIR_RUN, STAIR_TOP_Z, STAIR_X } from "./bridge";

const EYE = 1.75; // ความสูงสายตาเหนือขั้นบันได

// เดินจากกลางลานไปตีนบันไดฝั่ง +x แล้วไต่ขึ้นตามขั้น จนถึงบนสะพาน
const bottomZ = STAIR_TOP_Z - STAIR_RUN;
const stairY = (z: number) => BRIDGE.y * ((z - bottomZ) / STAIR_RUN);
const UP_LOCAL: Vec3[] = [
  // เข้าหาตีนบันไดตามแนวแกนบันได (จาก −z) ไม่ตัดผ่านตัวบันได
  [STAIR_X, 2.1, bottomZ - 1.5],
  [STAIR_X, 2.1, bottomZ],
  [STAIR_X, stairY(bottomZ + STAIR_RUN * 0.35) + EYE, bottomZ + STAIR_RUN * 0.35],
  [STAIR_X, stairY(bottomZ + STAIR_RUN * 0.7) + EYE, bottomZ + STAIR_RUN * 0.7],
  [STAIR_X, BRIDGE.y + EYE, BRIDGE.z],
];

export function viewpointPath(district: DistrictId, from: number, to: number): Vec3[] {
  if (district !== "nexus") return [];
  const base = DISTRICTS.nexus.position;
  const up = UP_LOCAL.map((p): Vec3 => [p[0] + base[0], p[1] + base[1], p[2] + base[2]]);
  if (from === 0 && to === 1) return up;
  if (from === 1 && to === 0) return up.reverse();
  return [];
}
