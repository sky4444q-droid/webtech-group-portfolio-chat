// เลือกชนิดการเดินทาง: ตัวจิ๋วเดินนำ (ปกติ) หรือจางภาพ (โหมดต่ำ / ลดการเคลื่อนไหว / ลิงก์ตรงหลัง Intro)

import type { DistrictId } from "../../types";
import type { Quality } from "../../store/useWorld";

export type TravelKind = "guide" | "fade";

export function travelKind(
  _from: DistrictId,
  _to: DistrictId,
  opts: { reducedMotion: boolean; quality: Quality; deepLink?: boolean },
): TravelKind {
  if (opts.reducedMotion || opts.quality === "low" || opts.deepLink) return "fade";
  return "guide";
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
