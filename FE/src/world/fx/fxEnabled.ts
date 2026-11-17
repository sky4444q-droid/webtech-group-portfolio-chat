// เอฟเฟกต์ไหนเปิดตามคุณภาพกราฟิก — โหมดต่ำปิดของหนักทั้งหมด

import type { Quality } from "../../store/useWorld";

export interface FxFlags {
  cones: boolean;
  flare: boolean;
  traffic: boolean;
  rain: boolean;
  reflector: boolean;
  bloom: boolean;
  /** ปรับสี (คอนทราสต์/ความอิ่มสี) */
  grading: boolean;
  /** ระยะชัดตื้น */
  dof: boolean;
  steam: boolean;
  signFlicker: boolean;
  screensAnimated: boolean;
  fogLayers: number;
}

export function fxEnabled(quality: Quality): FxFlags {
  const high = quality === "high";
  return {
    cones: high,
    flare: high,
    traffic: high,
    rain: high,
    reflector: high,
    bloom: high,
    grading: high,
    dof: high,
    steam: high,
    signFlicker: high,
    screensAnimated: high,
    // หมอกเหลือชั้นบาง ๆ ใต้เข่าชั้นเดียวทุกโหมด (ไม่ให้ภาพหม่น)
    fogLayers: 1,
  };
}
