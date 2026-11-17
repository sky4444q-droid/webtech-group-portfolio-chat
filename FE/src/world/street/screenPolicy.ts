// จอโฆษณาวาดใหม่ห่างกันกี่ ms ตามระยะกล้อง — null = หยุดนิ่ง (จอไกล หรือโหมดต่ำ)

import type { Quality } from "../../store/useWorld";

export function screenInterval(distance: number, quality: Quality): number | null {
  if (quality === "low") return null;
  if (distance < 12) return 80;
  if (distance <= 35) return 250 + Math.round(((distance - 12) / 23) * 350);
  return null;
}
