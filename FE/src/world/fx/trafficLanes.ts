// เลนรถลอยที่วิ่งตามแนวถนน: เยื้องจากเส้นกลาง ±1.5 และลอยสูง 12-25
// (อยู่กลางถนนเสมอ จะได้ไม่ชนผนังตึกหรือจอยักษ์)

import type { Vec3 } from "../../config/districts";
import { NEXUS_HALF, STREETS, type StreetId } from "../street/streets";

export interface Lane {
  from: Vec3;
  to: Vec3;
  /** สัดส่วนของเลนต่อวินาที */
  speed: number;
  phase: number;
  /** เลนที่ผูกกับถนน (วงเหนือ Nexus ไม่มี) */
  street?: StreetId;
}

const OFFSET = 1.5;

function rng(seed: number) {
  let s = (seed * 2654435761) % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** จุดบนเส้น polyline เยื้องออกด้านข้างตามตัวตั้งฉากของช่วงนั้น */
function offsetPoint(p: [number, number], a: [number, number], b: [number, number], side: number, y: number): Vec3 {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = -(b[1] - a[1]) / len;
  const nz = (b[0] - a[0]) / len;
  return [p[0] + nx * OFFSET * side, y, p[1] + nz * OFFSET * side];
}

export function trafficLanes(seed: number): Lane[] {
  const rand = rng(seed);
  const lanes: Lane[] = [];
  for (const street of Object.values(STREETS)) {
    const pts = street.points;
    const count = 2 + Math.floor(rand() * 2); // 2 หรือ 3 เลน
    for (let k = 0; k < count; k++) {
      const seg = k % (pts.length - 1);
      const a = pts[seg];
      const b = pts[seg + 1];
      const side = k % 2 === 0 ? 1 : -1; // ขาไป/ขากลับคนละฝั่ง
      const y = 12 + rand() * 13;
      const p0 = offsetPoint(a, a, b, side, y);
      const p1 = offsetPoint(b, a, b, side, y);
      const forward = side > 0;
      lanes.push({
        from: forward ? p0 : p1,
        to: forward ? p1 : p0,
        speed: 0.05 + rand() * 0.05,
        phase: rand(),
        street: street.id,
      });
    }
  }
  // วงเหนือ Nexus: สี่เหลี่ยมรอบลาน
  const r = NEXUS_HALF - 2;
  const corners: [number, number][] = [[-r, -r], [r, -r], [r, r], [-r, r]];
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    lanes.push({
      from: [a[0], 20, a[1]],
      to: [b[0], 20, b[1]],
      speed: 0.08 + rand() * 0.04,
      phase: rand(),
    });
  }
  return lanes;
}
