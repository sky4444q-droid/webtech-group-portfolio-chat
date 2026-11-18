// เส้นทาง Intro: ตัวจิ๋วเดินจากซุ้มประตูเมือง (ปลายนอกของซอยทางเข้า) เข้าซอยไปทาง Nexus (+x)
// กล้องตามอยู่ด้านหลัง (ฝั่งซุ้มประตู) · จบที่จุดยึดของ Gate แล้วกด Enter เดินต่อทิศเดิม

import { DISTRICTS, type Vec3 } from "../../config/districts";
import { GATE_ARCH } from "../street/streets";

const g = DISTRICTS.gate.position;

const START_X = GATE_ARCH[0] + 0.5;
const END_X = g[0];
/** ระยะกล้องหลังตัวจิ๋ว */
const BEHIND = 4.2;
const CAM_Y = 1.5;
/** จำนวนก้าวตลอด Intro */
const STEPS = 14;

const ease = (t: number) => 1 - Math.pow(1 - t, 2.2);

export function mascotAt(t: number): { position: Vec3; step: number } {
  const k = ease(Math.min(1, Math.max(0, t)));
  const x = START_X + (END_X - START_X) * k;
  const sway = Math.sin(t * Math.PI * 3) * 0.3 * (1 - k);
  const phase = (t * STEPS) % 1;
  return { position: [x, 0, g[2] + sway], step: phase };
}

export function introCamera(t: number): { position: Vec3; target: Vec3 } {
  const m = mascotAt(t).position;
  return {
    position: [m[0] - BEHIND, CAM_Y, m[2] * 0.6 + g[2] * 0.4],
    target: [m[0] + 10, 1.2, g[2]],
  };
}
