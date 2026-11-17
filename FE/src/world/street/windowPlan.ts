// แผนไฟหน้าต่างแบบออฟฟิศ: สุ่มสถานะทีละชั้น (เปิดทั้งชั้น / ครึ่งชั้น / เกือบมืด) แล้วสุ่มทีละช่อง
// พร้อมสูตรเปิด-ปิดไฟช้า ๆ (JS กับ GLSL ใช้สูตรเดียวกัน)

import { mulberry32 } from "../../lib/rng";

export type BayLight = { lit: boolean; tone: "warm" | "cool" | "brand"; level: number /* 0..1 */; blinds: boolean };
export const WINDOW_COLS = 8, WINDOW_ROWS = 16;

/** จำนวนชั้นแต่ละสถานะ (รวม 16) และช่วงจำนวนช่องที่เปิดไฟในชั้นนั้น [min, max] */
const FLOOR_KINDS: { count: number; lit: [number, number] }[] = [
  { count: 4, lit: [6, 8] }, // เปิดทั้งชั้น
  { count: 5, lit: [2, 4] }, // ครึ่งชั้น
  { count: 7, lit: [0, 1] }, // เกือบมืด
];

function shuffle<T>(a: T[], rand: () => number): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** [row][col] · row 0 = บนสุดของแผ่น texture */
export function planWindows(seed: number): BayLight[][] {
  const rand = mulberry32(seed ^ 0x5eed);
  // จำนวนชั้นแต่ละแบบคงที่ แต่ลำดับชั้นสุ่ม
  let brandLeft = 2; // สีแบรนด์ไม่เกิน 2 ช่องต่อแผ่น (หายาก)
  const kinds = shuffle(FLOOR_KINDS.flatMap((k) => Array.from({ length: k.count }, () => k.lit)), rand);
  return kinds.slice(0, WINDOW_ROWS).map(([lo, hi]) => {
    const n = lo + Math.floor(rand() * (hi - lo + 1));
    const on = shuffle(Array.from({ length: WINDOW_COLS }, (_, i) => i < n), rand);
    const floorTone = rand() < 0.6 ? "warm" : "cool"; // ชั้นเดียวกันมักใช้หลอดแบบเดียวกัน
    return on.map((lit): BayLight => {
      const k = rand();
      const brand = lit && k < 0.03 && brandLeft > 0;
      if (brand) brandLeft--;
      const tone = brand ? "brand" : k < 0.85 ? floorTone : floorTone === "warm" ? "cool" : "warm";
      return { lit, tone, level: 0.55 + rand() * 0.45, blinds: rand() < 0.3 };
    });
  });
}

/** สัดส่วนช่องที่สถานะต่างกันระหว่างสองช่วงเวลาห่างกัน (ประมาณ) */
export const WINDOW_TOGGLE_FRACTION = 0.025;
const SLOT_P = WINDOW_TOGGLE_FRACTION / 2; // โอกาสสลับต่อรอบ → ต่างกัน ≈ 2p(1-p)

const fract = (x: number) => x - Math.floor(x);
const winHash = (x: number) => fract(Math.sin(x * 127.1 + 311.7) * 43758.5453);

/** JS twin of the GLSL toggle: does the bay with this hash (0..1) flip at time t (s)? */
export function windowToggle(cellHash: number, t: number): boolean {
  const period = 20 + 40 * fract(cellHash * 7.13); // 20–60 วินาที
  const k = Math.floor(t / period + fract(cellHash * 3.71));
  return winHash(cellHash * 91.7 + k * 1.618) < SLOT_P;
}

export const WINDOW_TOGGLE_GLSL = /* glsl */ `
float winHash(float x) { return fract(sin(x * 127.1 + 311.7) * 43758.5453); }
float winToggle(float h, float t) {
  float period = 20.0 + 40.0 * fract(h * 7.13);
  float k = floor(t / period + fract(h * 3.71));
  return winHash(h * 91.7 + k * 1.618) < ${SLOT_P.toFixed(5)} ? 1.0 : 0.0;
}
`;
