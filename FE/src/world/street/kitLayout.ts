// ตัวสร้างผังชุดตัวต่อเมือง (logic ล้วน): สุ่มประกอบตึก ป้าย จอ และของประกอบสองข้างถนนด้วย seed คงที่
// ส่วนแสดงผล (StreetKit) วาดรายการนี้เป็น instanced mesh ต่อชนิด

import type { Vec3 } from "../../config/districts";
import { mulberry32 } from "../../lib/rng";
import { cableSag } from "./cables";
import { NEXUS_HALF, STREETS, TEAM_TOWER, distanceToPolyline, polylineLength, type Street, type StreetId } from "./streets";

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
  | "endCap"
  | "tier"
  | "roof"
  | "antenna"
  | "edgeStrip"
  | "beacon"
  | "giantScreen"
  | "ticker"
  | "monitor"
  | "videoWall"
  | "holo";

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
  /** จอยักษ์โค้ง: มุมตึกอยู่ทางแกน x ท้องถิ่นด้านไหน (+1/-1) */
  corner?: -1 | 1;
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
  /** ตัวสุ่มแยกสำหรับยอดตึก */
  crown: () => number;
  /** ตัวสุ่มแยกสำหรับแถบไฟวิ่ง (ไม่แตะ rand/crown เดิม ตำแหน่งชิ้นอื่นจึงไม่เลื่อน) */
  tick: () => number;
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
  // หน้าร้านยื่นจากผนัง 3 ซม. (ระนาบเดียวกับหน้าตึกพอดีจะ z-fight)
  put(c, s, base, side, "shopfront", 0, hw + 0.12, 1.6, [w * 0.88, 3.2, 0.3]);
  {
    const along = pick(r, -0.2, 0.2) * w;
    const sw = w * pick(r, 0.5, 0.8);
    put(c, s, base, side, "signH", fitAlong(along, sw, w), hw - 0.05, pick(r, 3.4, 3.9), [sw, pick(r, 0.7, 1.1), 0.12]);
  }
  // ป้ายแนวตั้งยื่นออกจากตึก (แบบป้ายญี่ปุ่น)
  if (w > 4.5 || r() < 0.6) {
    const ph = pick(r, 3, 5.5);
    put(c, s, base, side, "signV", (r() < 0.5 ? -1 : 1) * w * 0.35, hw - 0.6, pick(r, 4.5, 8) + ph / 2, [0.8, ph, 0.14]);
  }
  // กล่องไฟเล็กกระจาย
  const boxes = mood === "office" ? 3 : 2;
  for (let i = 0; i < boxes; i++) {
    const along = pick(r, -0.45, 0.45) * w;
    const bw = pick(r, 0.6, 1.4);
    put(c, s, base, side, "lightbox", fitAlong(along, bw, w), hw - 0.2, pick(r, 2.9, 7), [bw, pick(r, 0.4, 0.9), 0.25]);
  }
  if (r() < 0.55) {
    const along = pick(r, -0.25, 0.25) * w;
    const sw = Math.min(pick(r, 2, 3.6), w * 0.95);
    put(c, s, base, side, "screen", fitAlong(along, sw, w), hw + 0.05, pick(r, 6, 12), [sw, pick(r, 1.4, 2.6), 0.15]);
  }
  if (r() < 0.4) {
    const along = pick(r, -0.2, 0.2) * w;
    const pw = Math.min(pick(r, 3, 5.5), w * 0.95);
    put(c, s, base, side, "panel", fitAlong(along, pw, w), hw + 0.08, pick(r, 9, Math.min(h - 3, 17)), [pw, pick(r, 2.8, 5), 0.1]);
  }
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

/** ยอดตึก: ชั้นร่นถอย ของบนหลังคา เสาอากาศ+ไฟเตือน และเส้นนีออนที่มุมตึก (ตึกหนึ่งหลัง) */
function crownFacade(c: Ctx, s: Street, base: ReturnType<typeof sample>, side: -1 | 1, w: number, h: number) {
  // ใช้ตัวสุ่มแยก (c.crown) ไม่แตะสายสุ่มหลัก ป้าย/ของประกอบอื่นจึงไม่เลื่อน
  const main = c.rand;
  c.rand = c.crown;
  try {
    crownBody(c, s, base, side, w, h);
  } finally {
    c.rand = main;
  }
}

/** โปรแกรมจอที่ 2 (ticker) เลือกด้วย variant % 5 === 2 → 2, 7, 12 */
const TICKER_VARIANTS = [2, 7, 12];

/** แถบไฟ LED วิ่งเหนือหน้าร้าน ~40% (เลือกแบบเว้นระยะคงที่ ไม่สุ่ม จึงได้สัดส่วนแน่นอนทุกถนน) */
function tickerFor(c: Ctx, s: Street, base: ReturnType<typeof sample>, side: -1 | 1, w: number, index: number) {
  if (Math.floor((index + 1) * 0.4 + 0.6) === Math.floor(index * 0.4 + 0.6)) return;
  const nx = -base.uz * side;
  const nz = base.ux * side;
  const off = s.halfWidth - 0.02;
  c.out.push({
    type: "ticker",
    street: s.id,
    position: [base.x + nx * off, 3.3 + c.tick() * 0.02, base.z + nz * off],
    rotationY: Math.atan2(-nx, -nz),
    size: [w * 0.8, 0.16, 0.08],
    variant: TICKER_VARIANTS[Math.floor(c.tick() * TICKER_VARIANTS.length)],
    side,
  });
}

/** ไม่ให้ชิ้นล้ำออกนอกความกว้างตึก (ตึกท้ายถนน Team ติดตัวตึกสำนักงาน) */
const fitAlong = (x: number, width: number, w: number) => Math.max(-(w / 2 - width / 2), Math.min(w / 2 - width / 2, x));

/** ป้ายไต่สูง: ป้ายตั้งซ้อนเป็นแท่งตามขอบตึก + ป้ายนอน/กล่องไฟระดับกลาง (ใช้ตัวสุ่ม crown ผ่าน crownFacade) */
function highSigns(c: Ctx, s: Street, base: ReturnType<typeof sample>, side: -1 | 1, w: number, h: number) {
  const r = c.rand;
  const hw = s.halfWidth;
  // แท่งป้ายตั้ง: เริ่มที่ y 8 ซ้อนขึ้นไปจนใกล้ยอดตึก (ต้องได้อย่างน้อย 3 ป้าย)
  if (h >= 26 && r() < 0.45) {
    const along = (r() < 0.5 ? -1 : 1) * w * 0.4;
    let y = 8;
    const stack: number[] = [];
    for (let k = 0; k < 6; k++) {
      const ph = pick(r, 4, 5.5);
      if (y + ph > h - 1) break;
      stack.push(y + ph / 2, ph);
      y += ph + 0.3;
    }
    if (stack.length >= 6) for (let k = 0; k < stack.length; k += 2) put(c, s, base, side, "signV", along, hw - 0.6, stack[k], [0.8, stack[k + 1], 0.14]);
  }
  // ป้ายนอนและกล่องไฟกลางตึก
  const fit = (x: number, width: number) => fitAlong(x, width, w);
  if (r() < 0.8) {
    const sw = w * pick(r, 0.4, 0.6);
    put(c, s, base, side, "signH", fit(pick(r, -0.25, 0.25) * w, sw), hw - 0.05, pick(r, 10, Math.min(h - 3, 22)), [sw, pick(r, 0.8, 1.2), 0.12]);
  }
  if (r() < 0.8) {
    const bw = pick(r, 0.6, 1.4);
    put(c, s, base, side, "lightbox", fit(pick(r, -0.4, 0.4) * w, bw), hw - 0.2, pick(r, 9.5, Math.min(h - 2, 20)), [bw, pick(r, 0.5, 1), 0.25]);
  }
}

function crownBody(c: Ctx, s: Street, base: ReturnType<typeof sample>, side: -1 | 1, w: number, h: number) {
  const r = c.rand;
  const hw = s.halfWidth;
  let top = h;
  // ชั้นร่นถอยบนตัวตึก ~60%: ร่นเข้าจากหน้าตึกด้านถนน 0.6–1.5 ม. สูง 25–45% ของฐาน
  if (r() < 0.6) {
    const inset = pick(r, 0.6, 1.5);
    const th = h * pick(r, 0.25, 0.45);
    const depth = FACADE_DEPTH - inset - 0.3;
    put(c, s, base, side, "tier", 0, hw + inset + depth / 2, h + th / 2, [w * pick(r, 0.7, 0.9), th, depth]);
    top = h + th;
  }
  highSigns(c, s, base, side, w, h);
  const depthMid = hw + FACADE_DEPTH * 0.6;
  // ของบนหลังคา: ถังน้ำ / ห้องเครื่อง / กรอบป้ายหลังคา (variant % 3 ใช้เลือกแบบ)
  if (r() < 0.7) {
    const rh = pick(r, 1.2, 3);
    put(c, s, base, side, "roof", pick(r, -0.25, 0.25) * w, depthMid, top + rh / 2, [Math.min(pick(r, 1.5, 3), w * 0.5), rh, pick(r, 1.5, 3)]);
  }
  // เสาอากาศ + ไฟเตือนที่ปลายเสา
  if (r() < 0.5) {
    const ah = pick(r, 4, 10);
    const along = pick(r, -0.3, 0.3) * w;
    put(c, s, base, side, "antenna", along, depthMid, top + ah / 2, [0.12, ah, 0.12]);
    put(c, s, base, side, "beacon", along, depthMid, top + ah, [0.45, 0.45, 0.45]);
  }
  // เส้นนีออนตั้งที่มุมตึก ~30%
  if (r() < 0.3) put(c, s, base, side, "edgeStrip", (r() < 0.5 ? -1 : 1) * (w / 2 - 0.08), hw + 0.04, h / 2, [0.12, h, 0.12]);
}

export function layoutStreet(s: Street, seed: number): KitItem[] {
  const c: Ctx = { rand: mulberry32(seed ^ hash(s.id)), crown: mulberry32(seed ^ hash(s.id) ^ 0xc0ffee), tick: mulberry32(seed ^ hash(s.id) ^ 0x71c4e7), out: [], street: s.id, last: new Map() };
  const r = c.rand;
  const len = polylineLength(s.points);
  // ถนน Team จบที่ตัวตึกสำนักงาน: ตึกริมถนนต้องหยุดก่อนหน้าตึก ไม่งั้นทะลุเข้าไปในล็อบบี้
  const rowLen = s.id === "officeRow" ? len - (TEAM_TOWER.size[0] / 2 - TEAM_TOWER.center[0]) - 0.2 : len;

  const lots: { base: ReturnType<typeof sample>; side: -1 | 1; w: number; h: number; d: number }[] = [];
  for (const side of [-1, 1] as const) {
    let d = 0;
    let shopIndex = 0;
    while (d < rowLen - 0.01) {
      const w = Math.min(pick(r, 4, 9), rowLen - d);
      const h = pick(r, 18, 60);
      const base = sample(s.points, d + w / 2);
      put(c, s, base, side, "facade", 0, s.halfWidth + FACADE_DEPTH / 2, h / 2, [w, h, FACADE_DEPTH]);
      dressFacade(c, s, base, side, w, h);
      crownFacade(c, s, base, side, w, h);
      tickerFor(c, s, base, side, w, shopIndex++);
      lots.push({ base, side, w, h, d });
      d += w;
    }
  }

  // จอใหญ่จุดเด่นกลางถนน (ฝั่งสลับตาม seed)
  const bigAt = c.out.length;
  const mid = sample(s.points, len * pick(r, 0.4, 0.6));
  put(c, s, mid, r() < 0.5 ? -1 : 1, "bigScreen", 0, s.halfWidth + 0.2, pick(r, 9, 13), [Math.min(9, len * 0.2), 5, 0.3]);

  // แผงข้อความใหญ่ลอยหน้าตึกระดับสายตา (แบบแผงลอยในรูปตัวอย่าง) — สลับฝั่ง ไม่ขวางทางเดิน
  for (let k = 0; k < 3; k++) {
    const at = sample(s.points, len * (0.2 + k * 0.28));
    put(c, s, at, k % 2 ? 1 : -1, "panel", 0, s.halfWidth - 0.3, pick(r, 3.4, 3.9), [pick(r, 3.6, 5), pick(r, 2.6, 3.2), 0.1]);
  }

  // สายไฟข้ามถนน / โคมแขวน
  const cables = s.mood === "shrine" ? 10 : 8;
  for (let i = 0; i < cables; i++) {
    const at = sample(s.points, ((i + 0.5) / cables) * len);
    // กระจายความสูงเป็นช่วง ๆ (ขั้นบันไดสลับลำดับ) ให้สายซ้อนหลายระดับ ต่ำสุดยังพ้นทางเดิน
    const band = (i * 3) % 4;
    const cableY = 6 + (band + r()) * 2.4;
    const width = s.halfWidth * 2 + 2;
    put(c, s, at, 1, "cable", 0, 0, cableY, [width, 0.05, 0.05]);
    if (s.mood === "shrine" || r() < 0.3) {
      put(c, s, at, 1, "lamp", pick(r, -1, 1), pick(r, -0.6, 0.6), pick(r, 3.2, 4.2), [0.4, 0.6, 0.4]);
      // สายแขวนโคม: เส้นตั้งจากยอดโคมขึ้นไปถึงจุดต่ำสุดของสายหย่อนข้ามถนน (ไม่ใช้ rand เพิ่ม)
      const lamp = c.out[c.out.length - 1];
      const top = lamp.position[1] + lamp.size[1] / 2;
      const h = cableY - cableSag(width) - top;
      c.out.push({ type: "cable", street: s.id, position: [lamp.position[0], top + h / 2, lamp.position[2]], rotationY: 0, size: [0.03, h, 0.03], variant: 0, side: 1 });
    }
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
  // จอยักษ์โค้งรอบมุมตึก (ใช้ตัวสุ่ม crown ต่อท้าย ตำแหน่งชิ้นอื่นไม่เลื่อน)
  giantForStreet(c, s, lots, c.out[bigAt], rowLen);
  dressScreens(c, s, mulberry32(seed ^ hash(s.id) ^ 0x5c4ee7));
  return c.out;
}

/** ฐานจอยักษ์บนถนน: สูงกว่าขอบบนจอใหญ่สำคัญเสมอ */
const GIANT_STREET_BOTTOM = 17;

function giantForStreet(c: Ctx, s: Street, lots: { base: ReturnType<typeof sample>; side: -1 | 1; w: number; h: number; d: number }[], key: KitItem, rowLen: number) {
  const r = c.crown;
  const height = pick(r, 12, 16);
  const radius = pick(r, 3, 4);
  // ตึกสูงพอ, ไม่ติดท้ายถนน (Team HQ), ชอบฝั่งตรงข้ามจอสำคัญ
  const safe = lots.filter((l) => l.d + l.w < rowLen - 12 && l.d > 4);
  const ok = safe.filter((l) => l.h >= GIANT_STREET_BOTTOM + height + 1);
  const opp = ok.filter((l) => l.side !== key.side);
  const pool = opp.length ? opp : ok;
  // ไม่มีตึกสูงพอ: ใช้ตึกที่สูงที่สุด แล้วลดฐานจอลงได้ไม่ต่ำกว่า 14 (ไม่ให้จอโผล่พ้นหลังคา)
  const l = pool.length ? pool[Math.floor(r() * pool.length)] : (safe.length ? safe : lots).reduce((a, b) => (b.h > a.h ? b : a));
  const bottom = Math.max(14, Math.min(GIANT_STREET_BOTTOM, l.h - height));
  if (bottom + height > l.h) return;
  const a = r() < 0.5 ? -1 : 1;
  const along = (a * l.w) / 2;
  const nx = -l.base.uz * l.side;
  const nz = l.base.ux * l.side;
  const off = s.halfWidth;
  c.out.push({
    type: "giantScreen",
    street: s.id,
    position: [l.base.x + l.base.ux * along + nx * off, bottom + height / 2, l.base.z + l.base.uz * along + nz * off],
    rotationY: Math.atan2(-nx, -nz),
    size: [(radius * Math.PI) / 2, height, radius],
    variant: Math.floor(r() * VARIANTS),
    side: l.side,
    // แกน x ท้องถิ่น = -side * ทิศถนน
    corner: (-l.side * a) as -1 | 1,
  });
}

/** ชิ้นที่จอ/โฮโลใหม่ห้ามทับ (มองในกรอบหน้าตึก) */
const SCREEN_BLOCKERS = new Set<KitType>(["signH", "signV", "lightbox", "screen", "panel", "bigScreen", "giantScreen", "balcony"]);
/** สัดส่วนพื้นที่หน้าตึกช่วง y 4–25 ที่อยากให้จอ/โฮโลปกคลุม */
const SCREEN_COVER = 0.43;
/** โปรแกรมจอที่ไม่มีตัวหนังสือ (variant % 5 ∈ {1,3,4}: อีควอไลเซอร์ ลายสแกน จอเสีย) */
const TEXTLESS_VARIANTS = [1, 3, 4, 6, 8, 9, 11, 13, 14];
/** ระยะชิดผนัง: หน้าจอยื่นพ้นหน้าตึก 3 ซม. (กันระนาบซ้อน z-fight) */
const SCREEN_DEPTH = 0.1;

type Rect = { x0: number; x1: number; y0: number; y1: number };

/** จอแบน/วิดีโอวอลล์/โฮโลแกรม บนผนังชั้นล่าง (ตัวสุ่มแยกของตัวเอง ชิ้นเดิมไม่เลื่อน) */
function dressScreens(c: Ctx, s: Street, r: () => number) {
  const facades = c.out.filter((i) => i.type === "facade");
  const blockers = c.out.filter((i) => SCREEN_BLOCKERS.has(i.type));
  for (const f of facades) {
    const ux = Math.cos(f.rotationY);
    const uz = -Math.sin(f.rotationY);
    // ทิศจากผนังเข้าหาถนน = ด้าน +z ท้องถิ่นของตึก
    const fx = Math.sin(f.rotationY);
    const fz = Math.cos(f.rotationY);
    // จุดบนระนาบหน้าตึก (กึ่งกลางตามแนวถนน)
    const wx = f.position[0] + fx * (FACADE_DEPTH / 2);
    const wz = f.position[2] + fz * (FACADE_DEPTH / 2);
    const rectOf = (i: KitItem): Rect => {
      const a = (i.position[0] - f.position[0]) * ux + (i.position[2] - f.position[2]) * uz;
      return { x0: a - i.size[0] / 2, x1: a + i.size[0] / 2, y0: i.position[1] - i.size[1] / 2, y1: i.position[1] + i.size[1] / 2 };
    };
    const w = f.size[0];
    const top = Math.min(25, f.size[1] - 1);
    if (top - 4 < 1.5) continue;
    const taken: Rect[] = blockers
      .filter((b) => b.side === f.side && Math.hypot(b.position[0] - f.position[0], b.position[2] - f.position[2]) < 20)
      .map(rectOf);
    const free = (q: Rect) => !taken.some((t) => q.x0 < t.x1 + 0.05 && q.x1 > t.x0 - 0.05 && q.y0 < t.y1 + 0.05 && q.y1 > t.y0 - 0.05);
    const goal = SCREEN_COVER * w * (Math.min(25, f.size[1]) - 4);
    let cover = 0;
    // วางชิ้นที่ระยะ a ตามแนวตึก: หน้าจอต้องพ้นทั้งกล่องตึกจริงและระนาบหน้าตึกตามเส้นถนน (ถนนโค้งสองระนาบนี้ไม่ตรงกัน)
    const push = (type: KitType, a: number, y: number, size: Vec3, front: number, variant: number) => {
      const px = wx + ux * a;
      const pz = wz + uz * a;
      const dPoly = distanceToPolyline([px, pz], s.points);
      // front = ระยะหน้าชิ้นที่ยื่นพ้นผนัง (จอ 3 ซม., โฮโล 0.75–1.05 ม.)
      const centre = Math.min(dPoly, s.halfWidth) - front + (type === "holo" ? 0 : size[2] / 2);
      const gap = dPoly - centre;
      c.out.push({ type, street: s.id, position: [px + fx * gap, y, pz + fz * gap], rotationY: f.rotationY, size, variant, side: f.side });
    };
    // ไล่จุดเริ่มเป็นตาราง 0.25 ม. จากล่างซ้ายขึ้นบน แล้วลองขนาดจากใหญ่ไปเล็ก (อัดแน่นกว่าสุ่มตำแหน่ง)
    const spots: [number, number][] = [];
    for (let y = 4; y < top - 0.9; y += 0.25) for (let x = -w / 2 + 0.1; x < w / 2 - 1; x += 0.25) spots.push([x, y]);
    for (const [x0, y0] of spots) {
      if (cover >= goal) break;
      const roll = r();
      const kind: KitType = roll < 0.55 ? "monitor" : roll < 0.8 ? "videoWall" : "holo";
      const cols = r() < 0.5 ? 2 : 3;
      const mw = pick(r, 2, 5);
      const mh = pick(r, 1.2, 2.8);
      const hwid = pick(r, 1.5, 3.5);
      const hh = pick(r, 1, 2.2);
      // ลดขนาดทีละขั้นจนถึงขั้นต่ำของชนิดนั้น
      const steps = [1, 0.8, 0.6, 0.4, 0];
      const sizes: [number, number][] =
        kind === "monitor"
          ? steps.map((k) => [2 + (mw - 2) * k, 1.2 + (mh - 1.2) * k])
          : kind === "videoWall"
            ? [[cols * 1.4, 1.8], [2.8, 1.8]]
            : steps.map((k) => [1.5 + (hwid - 1.5) * k, 1 + (hh - 1) * k]);
      const variant = kind === "holo" ? Math.floor(r() * VARIANTS) : TEXTLESS_VARIANTS[Math.floor(r() * TEXTLESS_VARIANTS.length)];
      const holoOff = pick(r, 0.75, 1.05);
      for (const [bw, bh] of sizes) {
        const q = { x0, x1: x0 + bw, y0, y1: y0 + bh };
        if (q.x1 > w / 2 - 0.1 || q.y1 > top || !free(q)) continue;
        taken.push(q);
        cover += bw * bh;
        const a = x0 + bw / 2;
        const y = y0 + bh / 2;
        if (kind === "monitor") push("monitor", a, y, [bw, bh, SCREEN_DEPTH], 0.03, variant);
        else if (kind === "holo") push("holo", a, y, [bw, bh, 0.02], holoOff, variant);
        else {
          const n = Math.round(bw / 1.4);
          for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) push("videoWall", x0 + 0.7 + i * 1.4, y0 + 0.45 + j * 0.9, [1.38, 0.88, SCREEN_DEPTH], 0.03, variant);
        }
        break;
      }
    }
  }
}

/** สี่แยก: ตึกสูงสี่มุม แต่ละมุมมีจอใหญ่และป้าย */
export function layoutNexus(seed: number): KitItem[] {
  const c: Ctx = { rand: mulberry32(seed ^ 0x5eed), crown: mulberry32(seed ^ 0x5eed ^ 0xc0ffee), tick: mulberry32(seed ^ 0x5eed ^ 0x71c4e7), out: [], street: "nexus", last: new Map() };
  const r = c.rand;
  const corner = NEXUS_HALF + 7;
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) {
    const h = pick(r, 34, 48);
    const x = sx * corner;
    const z = sz * corner;
    c.out.push({ type: "facade", street: "nexus", position: [x, h / 2, z], rotationY: 0, size: [14, h, 14], variant: Math.floor(r() * VARIANTS), side: 1 });
    // ชั้นร่นถอย + เสาอากาศ + ไฟเตือน บนยอดตึกมุม
    const th = h * pick(r, 0.25, 0.45);
    c.out.push({ type: "tier", street: "nexus", position: [x, h + th / 2, z], rotationY: 0, size: [10.5, th, 10.5], variant: Math.floor(r() * VARIANTS), side: 1 });
    const ah = pick(r, 6, 12);
    const topY = h + th;
    c.out.push({ type: "antenna", street: "nexus", position: [x, topY + ah / 2, z], rotationY: 0, size: [0.2, ah, 0.2], variant: 0, side: 1 });
    c.out.push({ type: "beacon", street: "nexus", position: [x, topY + ah, z], rotationY: 0, size: [0.6, 0.6, 0.6], variant: 0, side: 1 });
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
  // จอยักษ์โค้งรอบมุมด้านนอกของตึกมุมสองหลัง (เหนือจอใหญ่ y สูงสุด 20.5)
  const facades = c.out.filter((i) => i.type === "facade");
  for (const k of [0, 3]) {
    const f = facades[k];
    const [x, , z] = f.position;
    const sx = Math.sign(x);
    const sz = Math.sign(z);
    const bottom = 22;
    const height = Math.min(20, Math.max(12, f.size[1] - bottom - 1));
    const radius = pick(c.crown, 3.5, 4.5);
    // มุมตึกที่หันออกด้านข้าง (มุม x ใน, z นอก) ให้จอหันเข้ากลางแยก
    c.out.push({
      type: "giantScreen",
      street: "nexus",
      position: [x - sx * 7, bottom + height / 2, z + sz * 7],
      rotationY: Math.atan2(-sx, 0),
      size: [(radius * Math.PI) / 2, height, radius],
      // k=0 → core, k=3 → type (variant % 4)
      variant: k === 0 ? 0 : 2,
      side: 1,
      // แกน x ท้องถิ่น = sx * แกน z โลก, มุมอยู่ทาง +sz
      corner: (sx * sz) as -1 | 1,
    });
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
