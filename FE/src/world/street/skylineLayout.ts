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
 * หอ Energy Core: ทางทิศ −z ด้านในวงแหวนตึกไกล (รัศมี ~89 < 95) ตึกไกลทุกหลังจึงอยู่หลังหอ ไม่บัง
 * มุมแรกของทุกที่มองไปทาง −z (กล้อง = ที่ + [0,5,17]) → แกน (สูง ENERGY_CORE_Y) อยู่ในกรอบจาก Gate / Nexus / Team / Sanctuary
 * เยื้องซ้ายจากแกน Gallery Avenue 26 ม. ไม่ตรงหลังจอ WaterScreen ของถนน · ห่างลาน Projects 45 ม.
 */
export const ENERGY_CORE_POS: Vec3 = [-26, 0, -85];
/** ความสูงของแกนพลังงาน (ต่ำพอให้อยู่ในกรอบจาก Nexus) */
export const ENERGY_CORE_Y = 32;

/** วางตึกเป็นช่องมุมเท่า ๆ กัน (ช่องละ 3.33°) แล้วสุ่มเลื่อนในช่อง → ทุกเซกเตอร์ 15° มีตึกเสมอ */
export function layoutSkyline(seed: number): SkyTower[] {
  const rnd = mulberry32(seed);
  const out: SkyTower[] = [];
  for (let i = 0; i < SKYLINE_COUNT; i++) {
    const a = ((i + 0.15 + rnd() * 0.7) / SKYLINE_COUNT) * Math.PI * 2;
    const r = 98 + rnd() * 44;
    const w = 8 + rnd() * 8;
    const d = 8 + rnd() * 8;
    const h = 60 + rnd() * 100;
    out.push({ position: [Math.cos(a) * r, h / 2, Math.sin(a) * r], size: [w, h, d], variant: Math.floor(rnd() * 4) });
  }
  return out;
}
