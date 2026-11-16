// เอฟเฟกต์ไหนเปิดตามคุณภาพกราฟิก — โหมดต่ำปิดของหนักทั้งหมด

import type { Quality } from "../../store/useWorld";

export interface FxFlags {
  cones: boolean;
  flare: boolean;
  traffic: boolean;
  rain: boolean;
  reflector: boolean;
  bloom: boolean;
  fogLayers: number;
}

export function fxEnabled(quality: Quality): FxFlags {
  const high = quality === "high";
  return { cones: high, flare: high, traffic: high, rain: high, reflector: high, bloom: high, fogLayers: high ? 3 : 1 };
}
