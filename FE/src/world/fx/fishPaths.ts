// เส้นทางว่ายของปลาโฮโลแกรม: วงรีช้า ๆ อยู่ในที่โล่งเท่านั้น (เหนือแนวกลางถนน หรือกลางลาน Nexus)
// ไม่ข้ามผนังตึกริมถนน — รัศมีด้านขวางถนน ≤ halfWidth − 0.5

import type { Vec3 } from "../../config/districts";

export interface FishPath {
  center: Vec3;
  radiusX: number;
  radiusZ: number;
  /** ความสูงฐาน (ปลาโยกขึ้นลง ±BOB) */
  y: number;
  /** ความเร็วโดยประมาณ (เมตร/วินาที) */
  speed: number;
  phase: number;
  length: number;
}

const BOB = 0.6;

function rng(seed: number) {
  let s = (seed * 2654435761) % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// ช่องวงโคจร: ถนน Gallery (x=0, z −9..−48, กว้างครึ่ง 6), Office Row (z=0, x 9..46, กว้างครึ่ง 4.5), ลาน Nexus
const SLOTS: { center: [number, number]; rx: number; rz: number; y: number }[] = [
  { center: [0, -22], rx: 4.5, rz: 10, y: 13 },
  { center: [0, -30], rx: 5, rz: 12, y: 18 },
  { center: [0, -36], rx: 3.5, rz: 8, y: 22.5 },
  { center: [26, 0], rx: 10, rz: 3.5, y: 14 },
  { center: [30, 0], rx: 12, rz: 3.8, y: 19 },
  { center: [24, 0], rx: 8, rz: 2.5, y: 23 },
  { center: [0, 0], rx: 6.5, rz: 5.5, y: 16 },
  { center: [0, 0], rx: 4.5, rz: 6.5, y: 21 },
];

export function fishPaths(seed: number): FishPath[] {
  const rand = rng(seed);
  return SLOTS.map((s) => ({
    center: [s.center[0], 0, s.center[1]],
    radiusX: s.rx,
    radiusZ: s.rz,
    y: s.y + (rand() - 0.5),
    speed: 1.6 + rand() * 1.4,
    phase: rand() * Math.PI * 2,
    length: 4 + rand() * 4,
  }));
}

/** ความเร็วเชิงมุม (rad/s) จากความเร็วเส้นตรงเฉลี่ย */
function omega(p: FishPath): number {
  return p.speed / ((p.radiusX + p.radiusZ) / 2);
}

export function fishPeriod(p: FishPath): number {
  return (Math.PI * 2) / omega(p);
}

/**
 * ตำแหน่งและทิศของปลาเวลา t
 * heading = มุมหมุนรอบแกน y ที่ทำให้แกน +x ท้องถิ่น (หัวปลา) ชี้ไปทางที่ว่าย
 * เขียนผลลงใน out ได้เพื่อไม่สร้างออบเจกต์ใหม่ทุกเฟรม
 */
export function fishAt(
  p: FishPath,
  t: number,
  out: { position: Vec3; heading: number } = { position: [0, 0, 0], heading: 0 },
): { position: Vec3; heading: number } {
  const a = p.phase + t * omega(p);
  const s = Math.sin(a);
  const c = Math.cos(a);
  out.position[0] = p.center[0] + p.radiusX * c;
  out.position[1] = p.y + BOB * Math.sin(2 * a);
  out.position[2] = p.center[2] + p.radiusZ * s;
  // อนุพันธ์ตามมุม: (−rx sin, rz cos) — rx, rz > 0 จึงไม่เป็นศูนย์คู่กัน
  out.heading = Math.atan2(-(p.radiusZ * c), -p.radiusX * s);
  return out;
}
