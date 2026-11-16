// ตำแหน่งที่ใช้ร่วมกันระหว่างฉากกับกล้อง

import type { Vec3 } from "../config/districts";
import { DISTRICTS } from "../config/districts";

/** ตำแหน่งแท่นจัดแสดงผลงาน (พิกัดภายในพื้นที่ Project Dimension) เรียงแนวนอนตามจำนวน 1–3 */
export function pedestalPositions(count: number): Vec3[] {
  const gap = 6.5;
  return Array.from({ length: count }, (_, i) => [(i - (count - 1) / 2) * gap, 0, 0]);
}

/** ท่ากล้องตอนซูมดูผลงาน (Fixed Showcase) — เยื้องขวาเล็กน้อยให้ panel ด้านขวาไม่บัง */
export function showcaseCamera(index: number, count: number): { position: Vec3; target: Vec3 } {
  const base = DISTRICTS.projects.position;
  const p = pedestalPositions(count)[index] ?? [0, 0, 0];
  const x = base[0] + p[0];
  const z = base[2] + p[2];
  return {
    position: [x + 2.6, 3.4, z + 7.5],
    target: [x + 2.6, 2.4, z],
  };
}
