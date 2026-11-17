// ผังถนนของโลก: สี่แยก Nexus ตรงกลาง แต่ละที่อยู่ปลายถนนหนึ่งสาย
// จุดของถนนเป็นพิกัด xz เริ่มที่ขอบสี่แยก จบที่จุดยึดของที่นั้น

import type { DistrictId } from "../../types";
import { DISTRICTS, type Vec3 } from "../../config/districts";

export type StreetId = "gateLane" | "galleryAvenue" | "officeRow" | "sanctuaryAlley";
export type StreetMood = "food" | "gallery" | "office" | "shrine";

export interface Street {
  id: StreetId;
  district: Exclude<DistrictId, "nexus">;
  /** ครึ่งความกว้างถนน (หน่วยโลก) */
  halfWidth: number;
  points: [number, number][];
  mood: StreetMood;
}

/** ครึ่งขนาดของลานสี่แยก */
export const NEXUS_HALF = 9;

const xz = (d: DistrictId): [number, number] => [DISTRICTS[d].position[0], DISTRICTS[d].position[2]];

/** ถนนตรงจากขอบสี่แยกไปที่ปลาย โค้งเล็กน้อยกลางทาง (bend = ระยะเบี่ยงด้านข้าง) */
function straight(end: [number, number], bend = 0): [number, number][] {
  const len = Math.hypot(end[0], end[1]);
  const ux = end[0] / len;
  const uz = end[1] / len;
  const start: [number, number] = [ux * NEXUS_HALF, uz * NEXUS_HALF];
  const mid: [number, number] = [(start[0] + end[0]) / 2 - uz * bend, (start[1] + end[1]) / 2 + ux * bend];
  return [start, mid, end];
}

export const STREETS: Record<StreetId, Street> = {
  gateLane: { id: "gateLane", district: "gate", halfWidth: 3, points: straight(xz("gate"), 0.8), mood: "food" },
  galleryAvenue: { id: "galleryAvenue", district: "projects", halfWidth: 6, points: straight(xz("projects")), mood: "gallery" },
  officeRow: { id: "officeRow", district: "team", halfWidth: 4.5, points: straight(xz("team")), mood: "office" },
  sanctuaryAlley: { id: "sanctuaryAlley", district: "sanctuary", halfWidth: 2, points: straight(xz("sanctuary"), -0.6), mood: "shrine" },
};

export function streetOf(d: DistrictId): Street | null {
  return Object.values(STREETS).find((s) => s.district === d) ?? null;
}

export function polylineLength(p: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < p.length; i++) len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return len;
}

/** เส้นทางเดินจากที่หนึ่งไปอีกที่ (ผ่านกลางสี่แยกเสมอเมื่อไม่ใช่ Nexus ทั้งสองฝั่ง) */
export function routeBetween(from: DistrictId, to: DistrictId): [number, number][] {
  const out: [number, number][] = [];
  const a = streetOf(from);
  const b = streetOf(to);
  if (a) out.push(...[...a.points].reverse());
  out.push([0, 0]);
  if (b) out.push(...b.points);
  return out;
}

/** ระยะจากจุดถึงเส้น polyline (ใช้ตรวจว่าของอยู่บนถนนหรือไม่) */
export function distanceToPolyline(p: [number, number], line: [number, number][]): number {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1];
    const [bx, bz] = line[i];
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - az) * dz) / l2));
    best = Math.min(best, Math.hypot(p[0] - (ax + dx * t), p[1] - (az + dz * t)));
  }
  return best;
}

/** ซุ้มประตูเมือง ปลายนอกของซอยทางเข้า (Intro เริ่มที่นี่) */
export const GATE_ARCH: Vec3 = [DISTRICTS.gate.position[0] - 12, 0, DISTRICTS.gate.position[2]];

/** ล็อบบี้ Team HQ อยู่ในตึกปลายถนน เลยประตูเข้าไป */
export const TEAM_LOBBY_OFFSET: Vec3 = [8, 0, 0];

/** ตึกสำนักงาน Team HQ (พิกัดสัมพัทธ์กับที่ Team) — หน้าตึกอยู่ที่ x = center − size/2 หันไปทางถนน */
// ฐานตึกจมลงใต้พื้น 1 ม.: ก้นตึกที่ y=0 พอดีจะโผล่-หายในเงาพื้นสะท้อน (พื้นล็อบบี้กะพริบ) · ยอดยังอยู่ที่ 42
export const TEAM_TOWER: { center: Vec3; size: Vec3 } = { center: [8.5, 20.5, 2.5], size: [20, 43, 22] };
