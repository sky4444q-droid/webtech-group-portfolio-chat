// ระยะเวลารวมของการเดินทาง — ใช้ร่วมกันระหว่างกล้องกับ overlay

import { FADE_MS } from "../../config/timing";
import type { DistrictId } from "../../types";
import type { TravelKind } from "./kind";
import { planGuideTrip } from "./guideTrip";

export function tripDuration(kind: TravelKind, from: DistrictId, to: DistrictId): number {
  return kind === "guide" ? planGuideTrip(from, to).totalMs : FADE_MS;
}
