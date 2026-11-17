// ผังรอยบนพื้นถนน (logic ล้วน): ฝาท่อ เส้นแบ่งเลนจาง และหย่อมกระเบื้องเข้มอ่อนต่างกัน
// ใช้ seed คงที่ ไม่แตะผัง cityLayout — DecalMeshes วาดรายการนี้เป็น instanced mesh ชุดเดียว

import type { Vec3 } from "../../config/districts";
import { mulberry32 } from "../../lib/rng";
import { steamSources } from "../fx/steamLayout";
import { CITY_SEED } from "./kitLayout";
import { NEXUS_HALF, STREETS, distanceToPolyline, polylineLength, type Street } from "./streets";

export type DecalKind = "manhole" | "laneMark" | "tileTint";
export interface Decal { kind: DecalKind; position: Vec3; rotationY: number; size: [number, number]; variant: number }

/** ความสูงชั้นรอยบนพื้น (ต่ำกว่าแสงย้อย 0.02 เพื่อไม่ให้ทับระนาบเดียวกัน) */
export const DECAL_Y = 0.01;
const VENT_CLEAR = 1.5;
const EDGE_MARGIN = 0.2;

/** จุดและทิศบนเส้นถนนที่ระยะ d จากต้นถนน */
function sample(points: [number, number][], d: number) {
  let left = d;
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1];
    const [bx, bz] = points[i];
    const seg = Math.hypot(bx - ax, bz - az);
    if (left <= seg || i === points.length - 1) {
      const t = Math.min(1, left / seg);
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, ux: (bx - ax) / seg, uz: (bz - az) / seg };
    }
    left -= seg;
  }
  const [x, z] = points[points.length - 1];
  return { x, z, ux: 1, uz: 0 };
}

const range = (r: () => number, a: number, b: number) => a + (b - a) * r();
const streets = Object.values(STREETS);

function nearestStreet(p: [number, number]): Street {
  return streets.reduce((a, b) => (distanceToPolyline(p, b.points) < distanceToPolyline(p, a.points) ? b : a));
}

let cache: Decal[] | null = null;

export function floorDecals(): Decal[] {
  if (cache) return cache.map((d) => ({ ...d, position: [...d.position] as Vec3, size: [...d.size] as [number, number] }));
  const r = mulberry32(CITY_SEED ^ 0xdeca1);
  const vents = steamSources().filter((s) => s.kind === "vent");
  const clearOfVents = (x: number, z: number) => vents.every((v) => Math.hypot(v.position[0] - x, v.position[2] - z) >= VENT_CLEAR);
  const out: Decal[] = [];
  const push = (kind: DecalKind, x: number, z: number, rotationY: number, size: [number, number]) =>
    out.push({ kind, position: [x, DECAL_Y, z], rotationY, size, variant: Math.floor(r() * 4) });

  for (const st of streets) {
    const len = polylineLength(st.points);
    const maxOff = st.halfWidth - EDGE_MARGIN - 0.5; // เผื่อครึ่งขนาดรอย

    // ฝาท่อ 3 ฝา สลับฝั่ง ห่างเส้นกลางที่ไกด์เดิน
    for (let k = 0; k < 3; k++) {
      const side = k % 2 ? 1 : -1;
      for (let t = 0; t < 30; t++) {
        const p = sample(st.points, len * (0.2 + (0.7 * (k + r())) / 3));
        const off = range(r, Math.min(1, maxOff), maxOff);
        const x = p.x - p.uz * off * side;
        const z = p.z + p.ux * off * side;
        if (nearestStreet([x, z]).id !== st.id || distanceToPolyline([x, z], st.points) > st.halfWidth - EDGE_MARGIN - 0.45 || !clearOfVents(x, z)) continue;
        push("manhole", x, z, r() * Math.PI * 2, [0.9, 0.9]);
        break;
      }
    }

    // เส้นแบ่งเลนประตามแนวกลางถนน ทุก 3 ม.
    for (let d = 2; d < len - 1; d += 3) {
      const p = sample(st.points, d);
      if (nearestStreet([p.x, p.z]).id !== st.id || !clearOfVents(p.x, p.z)) continue;
      push("laneMark", p.x, p.z, Math.atan2(-p.ux, -p.uz), [0.18, 1.4]);
    }

    // หย่อมกระเบื้องเข้มอ่อนต่างกัน กระจายทั้งผืน
    const nTint = Math.max(12, Math.round(len / 1.5));
    let made = 0;
    for (let t = 0; t < nTint * 8 && made < nTint; t++) {
      const p = sample(st.points, r() * len);
      const off = (r() * 2 - 1) * (st.halfWidth - EDGE_MARGIN - 1.1);
      const x = p.x - p.uz * off;
      const z = p.z + p.ux * off;
      if (nearestStreet([x, z]).id !== st.id || distanceToPolyline([x, z], st.points) > st.halfWidth - EDGE_MARGIN - 1 || !clearOfVents(x, z)) continue;
      push("tileTint", x, z, Math.round(r() * 3) * (Math.PI / 2), [range(r, 1.2, 2.4), range(r, 1.2, 2.4)]);
      made++;
    }
  }

  // ลานสี่แยก Nexus: หย่อมกระเบื้องอย่างเดียว
  for (let i = 0, made = 0; i < 200 && made < 14; i++) {
    const x = (r() * 2 - 1) * (NEXUS_HALF - 1.5);
    const z = (r() * 2 - 1) * (NEXUS_HALF - 1.5);
    if (!clearOfVents(x, z)) continue;
    push("tileTint", x, z, Math.round(r() * 3) * (Math.PI / 2), [range(r, 1.2, 2.4), range(r, 1.2, 2.4)]);
    made++;
  }

  cache = out;
  return floorDecals();
}
