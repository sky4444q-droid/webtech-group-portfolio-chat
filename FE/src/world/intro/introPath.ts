// เส้นทาง Intro ในซอย Arrival Alley: ตัวจิ๋วเดินจากปลายซอยไปหน้าประตู Arrival Gate กล้องตามหลัง
// ซอยวางตามแกน +z ของประตู (ด้านหลังจุดชมแรกของ Gate)

import { DISTRICTS, type Vec3 } from "../../config/districts";

const g = DISTRICTS.gate.position;

/** ประตูทางเข้า (Portal ของ Gate) */
export const GATE_DOOR: Vec3 = [g[0], 0, g[2] - 3];
/** ซอยเริ่มที่ z นี้ (ไกลจากประตู) */
export const ALLEY_START_Z = g[2] + 56;
/** ตัวจิ๋วหยุดที่ z นี้ */
export const MASCOT_END_Z = g[2] - 0.5;
/** ระยะกล้องหลังตัวจิ๋ว */
const BEHIND = 4.4;
const CAM_Y = 1.6;
/** จำนวนก้าวตลอด Intro */
const STEPS = 14;

const ease = (t: number) => 1 - Math.pow(1 - t, 2.2);

export function mascotAt(t: number): { position: Vec3; step: number } {
  const k = ease(Math.min(1, Math.max(0, t)));
  const z = ALLEY_START_Z + (MASCOT_END_Z - ALLEY_START_Z) * k;
  const sway = Math.sin(t * Math.PI * 3) * 0.35 * (1 - k);
  const phase = (t * STEPS) % 1;
  return { position: [g[0] + sway, 0, z], step: phase };
}

export function introCamera(t: number): { position: Vec3; target: Vec3 } {
  const m = mascotAt(t).position;
  return {
    position: [m[0] * 0.6 + g[0] * 0.4, CAM_Y, m[2] + BEHIND],
    target: [g[0], 1.2, m[2] - 10],
  };
}
