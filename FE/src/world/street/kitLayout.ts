// ตัวสร้างผังชุดตัวต่อเมือง (logic ล้วน): สุ่มประกอบตึก ป้าย จอ และของประกอบสองข้างถนนด้วย seed คงที่
// ส่วนแสดงผล (StreetKit) วาดรายการนี้เป็น instanced mesh ต่อชนิด

import type { Vec3 } from "../../config/districts";
import { mulberry32 } from "../../lib/rng";
import { NEXUS_HALF, STREETS, TEAM_TOWER, polylineLength, type Street, type StreetId } from "./streets";

export type KitType =
  | "facade"
  | "shopfront"
  | "balcony"
  | "signH"
  | "signV"
  | "lightbox"
  | "screen"
  | "bigScreen"
  | "panel"
  | "ac"
  | "pipe"
  | "cable"
  | "vent"
  | "crate"
  | "vending"
  | "lamp"
  | "steam"
  | "endCap";

export interface KitItem {
  type: KitType;
  street: StreetId | "nexus";
  position: Vec3;
  /** หมุนรอบแกน y ให้ด้าน +z ของชิ้นหันเข้าหาถนน */
  rotationY: number;
  /** กว้าง (ตามแนวถนน), สูง, ลึก */
  size: Vec3;
  /** ใช้เลือกสี/ข้อความ/ลาย */
  variant: number;
  side: -1 | 1;
}

export const CITY_SEED = 2026;
/** จำนวนแบบของป้าย/จอ (variant 0..VARIANTS-1) */
export const VARIANTS = 16;

const FACADE_DEPTH = 6;

/** จุดและทิศบนเส้นถนนที่ระยะ d จากต้นถนน */
function sample(points: [number, number][], d: number) {
  let left = d;
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1];
    const [bx, bz] = points[i];
    const seg = Math.hypot(bx - ax, bz - az);
    if (left <= seg || i === points.length - 1) {
      const t = Math.min(1, left / seg);
      const ux = (bx - ax) / seg;
      const uz = (bz - az) / seg;
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, ux, uz };
    }
    left -= seg;
  }
  const [x, z] = points[points.length - 1];
  return { x, z, ux: 1, uz: 0 };
}

interface Ctx {
  rand: () => number;
  out: KitItem[];
  street: StreetId | "nexus";
  last: Map<string, number>;
}

const pick = (r: () => number, a: number, b: number) => a + r() * (b - a);

function variantFor(c: Ctx, type: KitType, side: number): number {
  const key = `${type}${side}`;
  let v = Math.floor(c.rand() * VARIANTS);
  if (c.last.get(key) === v) v = (v + 1 + Math.floor(c.rand() * (VARIANTS - 1))) % VARIANTS;
  c.last.set(key, v);
  return v;
}

/** วางชิ้นบนหน้าตึกฝั่ง side ที่ระยะ d ตามถนน, off = ระยะจากเส้นกลางถนน */
function put(c: Ctx, s: Street | null, base: { x: number; z: number; ux: number; uz: number }, side: -1 | 1, type: KitType, along: number, off: number, y: number, size: Vec3) {
  const nx = -base.uz * side;
  const nz = base.ux * side;
  c.out.push({
    type,
    street: s ? s.id : "nexus",
    position: [base.x + base.ux * along + nx * off, y, base.z + base.uz * along + nz * off],
    rotationY: Math.atan2(-nx, -nz),
    size,
    variant: variantFor(c, type, side),
    side,
  });
}

/** ป้าย จอ และของประกอบบนหน้าตึกหนึ่งหลัง */
function dressFacade(c: Ctx, s: Street, base: ReturnType<typeof sample>, side: -1 | 1, w: number, h: number) {
  const r = c.rand;
  const hw = s.halfWidth;
  const mood = s.mood;
  // ชั้นล่าง: หน้าร้าน + ป้ายเหนือร้าน
  put(c, s, base, side, "shopfront", 0, hw + 0.15, 1.6, [w * 0.88, 3.2, 0.3]);
  put(c, s, base, side, "signH", pick(r, -0.2, 0.2) * w, hw - 0.05, pick(r, 3.4, 3.9), [w * pick(r, 0.5, 0.8), pick(r, 0.7, 1.1), 0.12]);
  // ป้ายแนวตั้งยื่นออกจากตึก (แบบป้ายญี่ปุ่น)
  if (w > 4.5 || r() < 0.6) {
    const ph = pick(r, 3, 5.5);
    put(c, s, base, side, "signV", (r() < 0.5 ? -1 : 1) * w * 0.35, hw - 0.6, pick(r, 4.5, 8) + ph / 2, [0.8, ph, 0.14]);
  }
  // กล่องไฟเล็กกระจาย
  const boxes = mood === "office" ? 3 : 2;
  for (let i = 0; i < boxes; i++) {
    put(c, s, base, side, "lightbox", pick(r, -0.45, 0.45) * w, hw - 0.2, pick(r, 2.9, 7), [pick(r, 0.6, 1.4), pick(r, 0.4, 0.9), 0.25]);
  }
  if (r() < 0.55) put(c, s, base, side, "screen", pick(r, -0.25, 0.25) * w, hw + 0.05, pick(r, 6, 12), [pick(r, 2, 3.6), pick(r, 1.4, 2.6), 0.15]);
  if (r() < 0.4) put(c, s, base, side, "panel", pick(r, -0.2, 0.2) * w, hw + 0.08, pick(r, 9, Math.min(h - 3, 17)), [pick(r, 3, 5.5), pick(r, 2.8, 5), 0.1]);
  // ของประกอบบนผนัง
  const acs = mood === "office" ? 1 : 3;
  for (let i = 0; i < acs; i++) put(c, s, base, side, "ac", pick(r, -0.42, 0.42) * w, hw + 0.35, pick(r, 4.2, Math.min(h - 2, 16)), [0.9, 0.6, 0.6]);
  if (r() < 0.6) put(c, s, base, side, "pipe", (r() < 0.5 ? -0.48 : 0.48) * w, hw + 0.1, h / 2, [0.18, h, 0.18]);
  if (r() < 0.45) put(c, s, base, side, "balcony", pick(r, -0.2, 0.2) * w, hw + 0.3, pick(r, 7, Math.min(h - 2, 18)), [w * 0.6, 0.15, 1]);
  // ของบนพื้น (ห่างทางเดินพอ)
  if (mood === "food" && r() < 0.6) put(c, s, base, side, "steam", pick(r, -0.3, 0.3) * w, hw - 0.3, 0.4, [0.8, 3, 0.8]);
  if (mood !== "office" && r() < 0.5) put(c, s, base, side, "crate", pick(r, -0.4, 0.4) * w, hw - 0.45, 0.3, [0.7, 0.6, 0.5]);
  if (r() < 0.2) put(c, s, base, side, "vending", pick(r, -0.4, 0.4) * w, hw - 0.4, 1, [0.9, 2, 0.7]);
  if (mood === "food" && r() < 0.5) put(c, s, base, side, "vent", pick(r, -0.3, 0.3) * w, hw + 0.2, pick(r, 3, 5), [0.7, 0.7, 0.4]);
}

export function layoutStreet(s: Street, seed: number): KitItem[] {
  const c: Ctx = { rand: mulberry32(seed ^ hash(s.id)), out: [], street: s.id, last: new Map() };
  const r = c.rand;
  const len = polylineLength(s.points);
  // ถนน Team จบที่ตัวตึกสำนักงาน: ตึกริมถนนต้องหยุดก่อนหน้าตึก ไม่งั้นทะลุเข้าไปในล็อบบี้
  const rowLen = s.id === "officeRow" ? len - (TEAM_TOWER.size[0] / 2 - TEAM_TOWER.center[0]) - 0.2 : len;

  for (const side of [-1, 1] as const) {
    let d = 0;
    while (d < rowLen - 0.01) {
      const w = Math.min(pick(r, 4, 9), rowLen - d);
      const h = pick(r, 12, 40);
      const base = sample(s.points, d + w / 2);
      put(c, s, base, side, "facade", 0, s.halfWidth + FACADE_DEPTH / 2, h / 2, [w, h, FACADE_DEPTH]);
      dressFacade(c, s, base, side, w, h);
      d += w;
    }
  }

  // จอใหญ่จุดเด่นกลางถนน (ฝั่งสลับตาม seed)
  const mid = sample(s.points, len * pick(r, 0.4, 0.6));
  put(c, s, mid, r() < 0.5 ? -1 : 1, "bigScreen", 0, s.halfWidth + 0.2, pick(r, 9, 13), [Math.min(9, len * 0.2), 5, 0.3]);

  // สายไฟข้ามถนน / โคมแขวน
  const cables = s.mood === "shrine" ? 9 : 4;
  for (let i = 0; i < cables; i++) {
    const at = sample(s.points, ((i + 0.5) / cables) * len);
    put(c, s, at, 1, "cable", 0, 0, pick(r, 4.5, 8), [s.halfWidth * 2 + 2, 0.05, 0.05]);
    if (s.mood === "shrine" || r() < 0.3) put(c, s, at, 1, "lamp", pick(r, -1, 1), pick(r, -0.6, 0.6), pick(r, 3.2, 4.2), [0.4, 0.6, 0.4]);
  }

  // ปิดปลายถนน (Team HQ ใช้ตึกสำนักงานของตัวเองแทน)
  if (s.id !== "officeRow") {
    const end = sample(s.points, len);
    c.out.push({
      type: "endCap",
      street: s.id,
      position: [end.x + end.ux * 16, 15, end.z + end.uz * 16],
      rotationY: Math.atan2(-end.ux, -end.uz),
      size: [s.halfWidth * 2 + 14, 30, 4],
      variant: Math.floor(r() * VARIANTS),
      side: 1,
    });
  }
  return c.out;
}

/** สี่แยก: ตึกสูงสี่มุม แต่ละมุมมีจอใหญ่และป้าย */
export function layoutNexus(seed: number): KitItem[] {
  const c: Ctx = { rand: mulberry32(seed ^ 0x5eed), out: [], street: "nexus", last: new Map() };
  const r = c.rand;
  const corner = NEXUS_HALF + 7;
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) {
    const h = pick(r, 34, 48);
    const x = sx * corner;
    const z = sz * corner;
    c.out.push({ type: "facade", street: "nexus", position: [x, h / 2, z], rotationY: 0, size: [14, h, 14], variant: Math.floor(r() * VARIANTS), side: 1 });
    // จอใหญ่บนมุมตึก หันเข้าหากลางแยก
    const face = Math.atan2(-sx, -sz);
    const ox = x - sx * 7.2;
    const oz = z - sz * 7.2;
    c.out.push({ type: "bigScreen", street: "nexus", position: [ox, pick(r, 12, 18), oz], rotationY: face, size: [8, 5, 0.3], variant: Math.floor(r() * VARIANTS), side: 1 });
    for (let i = 0; i < 6; i++) {
      c.out.push({
        type: i % 3 === 0 ? "signV" : i % 3 === 1 ? "lightbox" : "panel",
        street: "nexus",
        position: [ox + pick(r, -3, 3) * Math.abs(sz), pick(r, 3.5, 24), oz + pick(r, -3, 3) * Math.abs(sx)],
        rotationY: face,
        size: i % 3 === 0 ? [0.9, pick(r, 3, 6), 0.14] : i % 3 === 1 ? [1.2, 0.7, 0.25] : [4, 3.5, 0.1],
        variant: variantFor(c, i % 3 === 0 ? "signV" : i % 3 === 1 ? "lightbox" : "panel", sx * 2 + sz),
        side: 1,
      });
    }
  }
  return c.out;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** ชิ้นทั้งหมดของเมือง (แคชไว้ เพราะ seed คงที่) */
let cache: Record<StreetId | "nexus", KitItem[]> | null = null;
export function cityLayout(): Record<StreetId | "nexus", KitItem[]> {
  if (!cache) {
    cache = { nexus: layoutNexus(CITY_SEED) } as Record<StreetId | "nexus", KitItem[]>;
    for (const s of Object.values(STREETS)) cache[s.id] = layoutStreet(s, CITY_SEED);
  }
  return cache;
}
