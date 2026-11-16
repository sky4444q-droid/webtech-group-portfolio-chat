// ระยะเวลารวมของการเดินทางแต่ละแบบ — ใช้ร่วมกันระหว่างกล้องกับ overlay

import { ELEVATOR_MS, FADE_MS, PORTAL_MS, TRAVEL_MS, WALK_MS, WALK_PRE_MS } from "../../config/timing";
import type { TravelKind } from "./kind";

export function tripDuration(kind: TravelKind, hasPreFlight: boolean): number {
  switch (kind) {
    case "walk":
      return WALK_MS + (hasPreFlight ? WALK_PRE_MS : 0);
    case "elevator":
      return ELEVATOR_MS;
    case "portal":
      return PORTAL_MS;
    case "fade":
      return FADE_MS;
    default:
      return TRAVEL_MS;
  }
}
