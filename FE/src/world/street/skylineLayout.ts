// เส้นขอบฟ้าไกล: วงแหวนตึกสูงรอบเมือง (รัศมี 95–150) และตำแหน่งหอ Energy Core

import type { Vec3 } from "../../config/districts";
import { mulberry32 } from "../../lib/rng";

export interface SkyTower {
  position: Vec3;
  size: Vec3;
  variant: number;
}

export const SKYLINE_COUNT = 108;

/**
 * หอ Energy Core: แนวทแยงระหว่างซอยทางเข้า (ตะวันตก) กับ Gallery Avenue (เหนือ)
 * ห่างถนนทุกสาย ~62 ม. นอกวงแหวนตึกไกล (รัศมี ~88) — เห็นจากสี่แยก ปลายซอยทางเข้า ปลาย Gallery และปลาย Office Row
 * อยู่นอกแกนสายตาของถนน จึงไม่ถูกจอ WaterScreen ประจำถนนบัง
 */
export const ENERGY_CORE_POS: Vec3 = [-62, 0, -62];

/** วางตึกเป็นช่องมุมเท่า ๆ กัน (ช่องละ 3.33°) แล้วสุ่มเลื่อนในช่อง → ทุกเซกเตอร์ 15° มีตึกเสมอ */
export function layoutSkyline(seed: number): SkyTower[] {
  const rnd = mulberry32(seed);
  const out: SkyTower[] = [];
  for (let i = 0; i < SKYLINE_COUNT; i++) {
    const a = ((i + 0.15 + rnd() * 0.7) / SKYLINE_COUNT) * Math.PI * 2;
    let r = 98 + rnd() * 44;
    const x0 = Math.cos(a);
    const z0 = Math.sin(a);
    // ใกล้หอ Energy Core → ถอยออกไปแถวหลัง ไม่ให้บังฐานหอ
    if (Math.hypot(x0 * r - ENERGY_CORE_POS[0], z0 * r - ENERGY_CORE_POS[2]) < 30) r = 136 + rnd() * 8;
    const w = 8 + rnd() * 8;
    const d = 8 + rnd() * 8;
    const h = 60 + rnd() * 100;
    out.push({ position: [x0 * r, h / 2, z0 * r], size: [w, h, d], variant: Math.floor(rnd() * 4) });
  }
  return out;
}
