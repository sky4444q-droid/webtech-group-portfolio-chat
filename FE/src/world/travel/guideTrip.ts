// ลำดับการเดินทางที่ตัวจิ๋วเดินนำ (logic ล้วน ทดสอบได้)
// AI ที่ต้นทางหดเป็นตัวจิ๋ว → (ลิฟต์ลงถ้าออกจาก Team HQ) → เดินตามถนน → (ลิฟต์ขึ้นถ้าไป Team HQ) → แปลงร่าง / หันทักทาย

import * as THREE from "three";
import type { DistrictId } from "../../types";
import type { Vec3 } from "../../config/districts";
import { ELEVATOR_MS, MORPH_MS, SHRINK_MS, TURN_MS } from "../../config/timing";
import { routeBetween } from "../street/streets";

export type SegmentKind = "shrink" | "elevatorDown" | "walk" | "elevatorUp" | "morph" | "turn";

export interface GuidePlan {
  segments: { kind: SegmentKind; ms: number }[];
  route: THREE.CatmullRomCurve3;
  totalMs: number;
}

/** ทั้งการเดินทางไม่นับลิฟต์ ต้องไม่เกินนี้ */
export const GUIDE_MAX_MS = 9000;
/** ความเร็วเดินปกติ (หน่วย/วินาที) — เดินเร็วขึ้นถ้าทางยาวเกินงบเวลา */
export const WALK_SPEED = 6.5;
/** ระยะกล้องหลังตัวจิ๋ว ความสูง และจุดมองข้างหน้า */
const BEHIND = 4;
const CAM_Y = 1.4;
const AHEAD = 8;

export function planGuideTrip(from: DistrictId, to: DistrictId): GuidePlan {
  const pts = routeBetween(from, to).map(([x, z]) => new THREE.Vector3(x, 0, z));
  const route = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const segments: GuidePlan["segments"] = [];
  if (from !== "gate") segments.push({ kind: "shrink", ms: SHRINK_MS });
  if (from === "team") segments.push({ kind: "elevatorDown", ms: ELEVATOR_MS });
  const end = to === "gate" ? { kind: "turn" as const, ms: TURN_MS } : { kind: "morph" as const, ms: MORPH_MS };
  const fixed = (from !== "gate" ? SHRINK_MS : 0) + end.ms;
  const walkMs = Math.round(Math.min((route.getLength() / WALK_SPEED) * 1000, GUIDE_MAX_MS - fixed));
  segments.push({ kind: "walk", ms: walkMs });
  if (to === "team") segments.push({ kind: "elevatorUp", ms: ELEVATOR_MS });
  segments.push(end);
  return { segments, route, totalMs: segments.reduce((n, s) => n + s.ms, 0) };
}

export interface GuidePose {
  segment: SegmentKind;
  /** ความคืบหน้าในช่วงนี้ 0..1 */
  k: number;
  mascot: Vec3;
  /** มุมที่ตัวจิ๋วหัน (rotation.y: 0 = ไปทาง +z) */
  heading: number;
  mascotVisible: boolean;
  aiFrom: number;
  aiTo: number;
  /** null = ช่วงลิฟต์ (กล้องใช้ฉากลิฟต์) */
  camera: { position: Vec3; target: Vec3 } | null;
}

const p = new THREE.Vector3();
const tan = new THREE.Vector3();

function along(route: THREE.CatmullRomCurve3, u: number) {
  const c = Math.min(1, Math.max(0, u));
  route.getPointAt(c, p);
  route.getTangentAt(c, tan);
  tan.y = 0;
  tan.normalize();
  return {
    mascot: [p.x, 0, p.z] as Vec3,
    heading: Math.atan2(tan.x, tan.z),
    camera: {
      position: [p.x - tan.x * BEHIND, CAM_Y, p.z - tan.z * BEHIND] as Vec3,
      target: [p.x + tan.x * AHEAD, 1.1, p.z + tan.z * AHEAD] as Vec3,
    },
  };
}

const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

export function guideAt(plan: GuidePlan, ms: number): GuidePose {
  const t = Math.min(Math.max(ms, 0), plan.totalMs);
  let start = 0;
  let idx = plan.segments.length - 1;
  for (let i = 0; i < plan.segments.length; i++) {
    if (t <= start + plan.segments[i].ms) {
      idx = i;
      break;
    }
    start += plan.segments[i].ms;
  }
  const seg = plan.segments[idx];
  const k = seg.ms > 0 ? Math.min(1, (t - start) / seg.ms) : 1;
  const walkIdx = plan.segments.findIndex((s) => s.kind === "walk");
  const u = seg.kind === "walk" ? ease(k) : idx < walkIdx ? 0 : 1;
  const pose = along(plan.route, u);
  const fromHasAi = plan.segments[0].kind === "shrink";
  const aiFrom = fromHasAi && seg.kind === "shrink" ? 1 - k : 0;
  const aiTo = seg.kind === "morph" ? k : 0;
  const heading = seg.kind === "turn" ? pose.heading + Math.PI * ease(k) : pose.heading;
  const elevator = seg.kind === "elevatorUp" || seg.kind === "elevatorDown";
  const mascotVisible = !elevator && !(seg.kind === "morph" && k >= 1);
  return { segment: seg.kind, k, mascot: pose.mascot, heading, mascotVisible, aiFrom, aiTo, camera: elevator ? null : pose.camera };
}
