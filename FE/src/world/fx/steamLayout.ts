// ผังแหล่งไอน้ำของเมือง (logic ล้วน): ช่องระบายบนถนน ไอจากร้านอาหาร และปล่องบนหลังคา
// ใช้ seed คงที่ ไม่แตะผัง cityLayout เดิม — SteamPlumes วาดรายการนี้เป็น instanced mesh

import type { Vec3 } from "../../config/districts";
import { DISTRICTS } from "../../config/districts";
import { VIEWPOINTS } from "../../config/viewpoints";
import { mulberry32 } from "../../lib/rng";
import type { DistrictId } from "../../types";
import { CITY_SEED, cityLayout, type KitItem } from "../street/kitLayout";
import { NEON } from "../street/kitMeshes";
import { STREETS, distanceToPolyline, polylineLength, type Street } from "../street/streets";

export type SteamKind = "vent" | "kitchen" | "stack";
export interface SteamSource { kind: SteamKind; position: Vec3; radius: number; height: number; tint: string /* hex */; phase: number }
export const STEAM_SEED = 0x57ea;

/** สีหมอกเมือง ใช้เมื่อไม่มีไฟป้ายใกล้ ๆ */
const FOG_TINT = "#3a2a6a";
const LIGHT_TYPES = new Set(["signH", "signV", "lightbox", "screen", "bigScreen"]);
const TINT_RANGE = 8;
const VIEW_CLEAR = 3;
const MAX_TRIES = 20;

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

/** จุดกล้องและวงแหวนทั้งหมดในพิกัดโลก (xz) */
function viewSpots(): [number, number][] {
  const out: [number, number][] = [];
  for (const d of Object.keys(VIEWPOINTS) as DistrictId[]) {
    const b = DISTRICTS[d].position;
    for (const vp of VIEWPOINTS[d]) for (const p of [vp.position, vp.marker]) out.push([b[0] + p[0], b[2] + p[2]]);
  }
  return out;
}

function nearestStreet(p: [number, number]): Street {
  return Object.values(STREETS).reduce((a, b) => (distanceToPolyline(p, b.points) < distanceToPolyline(p, a.points) ? b : a));
}

/** สีจากไฟป้าย/จอที่ใกล้ที่สุดในระยะ 8 ม. ไม่มีก็ใช้สีหมอกเมือง */
function tintAt(p: Vec3, lights: KitItem[]): string {
  let best: KitItem | null = null;
  let bd = TINT_RANGE;
  for (const l of lights) {
    const d = Math.hypot(l.position[0] - p[0], l.position[1] - p[1], l.position[2] - p[2]);
    if (d <= bd) { bd = d; best = l; }
  }
  return best ? NEON[best.variant % NEON.length] : FOG_TINT;
}

const range = (r: () => number, a: number, b: number) => a + (b - a) * r();

let cache: SteamSource[] | null = null;

export function steamSources(): SteamSource[] {
  if (cache) return cache.map((s) => ({ ...s, position: [...s.position] as Vec3 }));
  const r = mulberry32(CITY_SEED ^ STEAM_SEED);
  const layout = cityLayout();
  const items = Object.values(layout).flat();
  const lights = items.filter((i) => LIGHT_TYPES.has(i.type));
  const spots = viewSpots();
  const out: SteamSource[] = [];

  // ช่องระบายบนถนน: 3–4 จุดต่อสาย สลับฝั่ง เลี่ยงเส้นกลางที่ไกด์เดิน และเลี่ยงจุดชม 3 ม.
  for (const st of Object.values(STREETS)) {
    const len = polylineLength(st.points);
    const n = r() < 0.5 ? 3 : 4;
    for (let k = 0; k < n; k++) {
      const side = k % 2 ? 1 : -1;
      for (let t = 0; t < MAX_TRIES; t++) {
        const f = 0.15 + (0.75 * (k + r())) / n;
        const off = range(r, 1.0, st.halfWidth - 0.4);
        const p = sample(st.points, f * len);
        const x = p.x - p.uz * off * side;
        const z = p.z + p.ux * off * side;
        const dist = distanceToPolyline([x, z], st.points);
        const ok =
          dist >= 1.0 && dist <= st.halfWidth - 0.4 &&
          nearestStreet([x, z]).id === st.id &&
          spots.every(([sx, sz]) => Math.hypot(sx - x, sz - z) >= VIEW_CLEAR);
        if (!ok) continue;
        const position: Vec3 = [x, 0.02, z];
        out.push({ kind: "vent", position, radius: range(r, 0.5, 0.8), height: range(r, 2.5, 4), tint: tintAt(position, lights), phase: r() });
        break;
      }
    }
  }

  // ไอจากร้านอาหาร: ทุกชิ้น steam ของผังเดิม
  for (const it of items.filter((i) => i.type === "steam")) {
    const position: Vec3 = [...it.position] as Vec3;
    out.push({ kind: "kitchen", position, radius: 0.4, height: 2.6, tint: tintAt(position, lights), phase: r() });
  }

  // ปล่องบนหลังคา: สุ่ม 6–10 หลังคา
  const roofs = items.filter((i) => i.type === "roof");
  const order = roofs.map((it) => ({ it, k: r() })).sort((a, b) => a.k - b.k).map((o) => o.it);
  const nStacks = Math.min(order.length, 6 + Math.floor(r() * 5));
  for (const it of order.slice(0, nStacks)) {
    const position: Vec3 = [it.position[0], it.position[1] + it.size[1] / 2, it.position[2]];
    out.push({ kind: "stack", position, radius: range(r, 1.2, 2), height: range(r, 8, 14), tint: FOG_TINT, phase: r() });
  }

  cache = out;
  return steamSources();
}
