// เลือกชนิดการเดินทางจากพื้นที่ปลายทาง (spec ข้อ 10)

import type { DistrictId } from "../../types";
import type { Quality } from "../../store/useWorld";

export type TravelKind = "fly" | "walk" | "elevator" | "portal" | "fade";

export function travelKind(from: DistrictId, to: DistrictId, opts: { reducedMotion: boolean; quality: Quality }): TravelKind {
  if (opts.reducedMotion || opts.quality === "low") return "fade";
  if (to === "projects" || (from === "projects" && to === "nexus")) return "walk";
  if (to === "team") return "elevator";
  if (to === "sanctuary") return "portal";
  return "fly";
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
