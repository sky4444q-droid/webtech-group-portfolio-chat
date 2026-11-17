// แสงที่ย้อยจากป้าย/จอลงพื้นและผนัง (logic ล้วน): แสงต้องมาจากแหล่งที่มองเห็น ไม่ใช่ลอยกลางอากาศ

import type { Vec3 } from "../../config/districts";
import type { KitItem, KitType } from "./kitLayout";
import { STREETS } from "./streets";

export interface Spill {
  kind: "floor" | "wall";
  position: Vec3;
  rotationY: number;
  /** กว้าง, ยาว (ยาว = ระยะที่ยื่นเข้าหากลางถนนเมื่อเป็นพื้น) */
  size: [number, number];
  variant: number;
  strength: number;
}

/** ความแรงแสงต่อชนิดแหล่งกำเนิด (จอใหญ่ไม่แรงเกินจอสำคัญ WaterScreen) */
const STRENGTH: Partial<Record<KitType, number>> = { signH: 0.6, signV: 0.55, lightbox: 0.45, screen: 0.55, bigScreen: 0.5 };

/** แสงลงพื้นเฉพาะแหล่งที่ระดับถนน (y <= นี้) ป้ายสูงไม่ทำให้พื้นท่วม; จอใหญ่ได้เสมอ */
export const FLOOR_SPILL_MAX_Y = 9;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function spillsFor(items: KitItem[]): Spill[] {
  const out: Spill[] = [];
  for (const it of items) {
    const strength = STRENGTH[it.type];
    if (strength === undefined) continue;
    // ด้าน +z ของชิ้นหันเข้าหาถนน
    const fx = Math.sin(it.rotationY);
    const fz = Math.cos(it.rotationY);
    const [x, y, z] = it.position;
    // ถนนแคบ: จำกัดความยาวไม่ให้แสงข้ามเส้นกลางถนนไปอีกฝั่ง (สี่แยกไม่จำกัด)
    const reach = it.street === "nexus" ? 10 : Math.max(1.5, STREETS[it.street].halfWidth * 0.9);
    const length = Math.min(clamp(y * 0.9, 2, 10), reach);
    // พื้น: เริ่มที่ฐานตึกใต้ป้าย ยื่นเข้าหากลางถนน
    if (y <= FLOOR_SPILL_MAX_Y || it.type === "bigScreen") out.push({
      kind: "floor",
      position: [x + fx * (length / 2), 0.02, z + fz * (length / 2)],
      rotationY: it.rotationY,
      size: [it.size[0] * 1.2, length],
      variant: it.variant,
      strength,
    });
    // ผนัง: แสงฟุ้งหลังป้าย ใหญ่กว่าป้าย 1.8 เท่า
    out.push({
      kind: "wall",
      position: [x - fx * 0.05, y, z - fz * 0.05],
      rotationY: it.rotationY,
      size: [it.size[0] * 1.8, it.size[1] * 1.8],
      variant: it.variant,
      strength,
    });
  }
  return out;
}
