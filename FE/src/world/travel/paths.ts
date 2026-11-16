// เส้นทางเดินบน Gallery Avenue — ถนนจริงระหว่าง Central Nexus กับ Project Dimension

import * as THREE from "three";
import type { DistrictId } from "../../types";
import { DISTRICTS } from "../../config/districts";

export const EYE_HEIGHT = 1.7;

const nexus = DISTRICTS.nexus.position;
const projects = DISTRICTS.projects.position;

/** จุดบนถนน จาก Nexus (หน้าประตูหอผลงาน) ไปถึงหน้าห้องผลงาน */
export const AVENUE_POINTS: [number, number][] = [
  [nexus[0] - 5, nexus[2] - 1.5],
  [nexus[0] - 1.5, nexus[2] - 12],
  [nexus[0], nexus[2] - 22],
  [projects[0], projects[2] + 30],
  [projects[0], projects[2] + 16],
];

/** ความยาวถนนช่วงที่สร้างฉาก (แกน z) */
export const AVENUE = { x: 0, zStart: nexus[2] - 16, zEnd: projects[2] + 22, halfWidth: 6 };

const forward = new THREE.CatmullRomCurve3(AVENUE_POINTS.map(([x, z]) => new THREE.Vector3(x, EYE_HEIGHT, z)));
const backward = new THREE.CatmullRomCurve3([...AVENUE_POINTS].reverse().map(([x, z]) => new THREE.Vector3(x, EYE_HEIGHT, z)));

export interface WalkPlan {
  /** บินไปต้นถนนก่อน (เมื่อไม่ได้เริ่มจาก Nexus/Projects) — ใช้แค่จุดปลาย กล้องบินเองจากที่อยู่ */
  pre: THREE.Vector3 | null;
  walk: THREE.CatmullRomCurve3;
  reverse: boolean;
}

export function walkPath(from: DistrictId, to: DistrictId): WalkPlan {
  const reverse = from === "projects" && to !== "projects";
  const walk = reverse ? backward : forward;
  const start = walk.getPointAt(0);
  const pre = from === "nexus" || from === "projects" ? null : new THREE.Vector3(start.x, EYE_HEIGHT + 0.3, start.z + 4);
  return { pre, walk, reverse };
}
