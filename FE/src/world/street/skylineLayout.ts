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

/** แถบจอไฟบนผนังตึกไกล: face 0..3 = +z, −z, +x, −x ในพิกัดตึก · y = ระยะจากฐานตึกถึงขอบล่างแถบ · แถบอยู่กึ่งกลางผนัง */
export interface SkyStrip {
  tower: number;
  face: 0 | 1 | 2 | 3;
  y: number;
  height: number;
  width: number;
  variant: number;
}

/** สัดส่วนตึกที่มีแถบจอ (ตรึงจำนวนตายตัวเพื่อไม่ให้หลุดช่วง 30–50% ตามโชค) */
const STRIP_FRACTION = 0.4;

/** สุ่มแถบจอบนตึก ใช้สตรีม RNG ของตัวเอง (ไม่แตะ layoutSkyline) → ผังตึกเดิมไม่เปลี่ยน */
export function skylineStrips(towers: SkyTower[], seed: number): SkyStrip[] {
  const rnd = mulberry32((seed ^ 0x5eed5) >>> 0);
  const scored = towers.map((_, i) => ({ i, k: rnd() }));
  scored.sort((a, b) => a.k - b.k || a.i - b.i);
  const chosen = scored.slice(0, Math.round(towers.length * STRIP_FRACTION)).map((c) => c.i).sort((a, b) => a - b);
  const out: SkyStrip[] = [];
  for (const i of chosen) {
    const t = towers[i];
    // เลือกเฉพาะผนังที่หันเข้าเมือง (3 = −x ในพิกัดตึก ถ่วงน้ำหนักสองเท่า) หรือผนังข้างสองด้าน (0/1) — ไม่วางบนผนังหันออกนอกเมือง
    const face = ([3, 3, 0, 1] as const)[Math.floor(rnd() * 4)];
    const variant = Math.floor(rnd() * 4);
    const faceW = face < 2 ? t.size[0] : t.size[2];
    const vertical = variant % 2 === 0;
    const width = vertical ? faceW * (0.12 + rnd() * 0.1) : faceW * (0.6 + rnd() * 0.3);
    const height = vertical ? t.size[1] * (0.35 + rnd() * 0.3) : 1.2 + rnd() * 1.2;
    const y = rnd() * (t.size[1] - height);
    out.push({ tower: i, face, y, height, width, variant });
  }
  return out;
}
