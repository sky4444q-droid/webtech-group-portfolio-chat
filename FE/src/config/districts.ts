// ตั้งค่าพื้นที่ทั้ง 5 ของจักรวาล (โครงชั่วคราว เปลี่ยนชื่อ/ลด/เพิ่มได้ที่นี่)
// aiForm = ร่างของ AI ในพื้นที่นั้น (Mapping ชั่วคราว รอผู้ใช้ยืนยัน)

import type { AiForm, DistrictId, Localized } from "../types";
import { COLORS } from "./theme";

export type Vec3 = [number, number, number];

export interface DistrictConfig {
  id: DistrictId;
  name: Localized;
  /** ป้ายนีออนในฉาก (ภาษาอังกฤษ) */
  sign: string;
  position: Vec3;
  /** ตำแหน่งกล้องและจุดที่กล้องมอง (พิกัดโลก) */
  camera: { position: Vec3; target: Vec3 };
  aiForm: AiForm;
  color: string;
  /** ชื่อสั้นบน Mini Map */
  short: string;
  /** ตำแหน่งบน Mini Map (0–100) */
  map: [number, number];
}

function at(p: Vec3, offset: Vec3): Vec3 {
  return [p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]];
}

function district(
  id: DistrictId,
  name: Localized,
  sign: string,
  position: Vec3,
  aiForm: AiForm,
  color: string,
  map: [number, number],
): DistrictConfig {
  return {
    id,
    name,
    sign,
    short: sign.replace("CENTRAL ", "").replace("ARRIVAL ", "").replace("PROJECT DIMENSION", "PROJECTS").replace("AI ", ""),
    position,
    camera: { position: at(position, [0, 5, 17]), target: at(position, [0, 3, 0]) },
    aiForm,
    color,
    map,
  };
}

export const DISTRICTS: Record<DistrictId, DistrictConfig> = {
  gate: district("gate", { th: "Arrival Gate", en: "Arrival Gate" }, "ARRIVAL GATE", [-46, 0, 0], "orb", COLORS.pink, [14, 50]),
  nexus: district("nexus", { th: "Central Nexus", en: "Central Nexus" }, "CENTRAL NEXUS", [0, 0, 0], "orb", COLORS.cyan, [50, 50]),
  projects: district("projects", { th: "Project Dimension", en: "Project Dimension" }, "PROJECT DIMENSION", [0, 0, -48], "geometric", COLORS.purple, [50, 14]),
  team: district("team", { th: "Team Headquarters", en: "Team Headquarters" }, "TEAM HQ", [46, 0, 0], "orb", COLORS.green, [86, 50]),
  sanctuary: district("sanctuary", { th: "AI Sanctuary", en: "AI Sanctuary" }, "AI SANCTUARY", [0, 0, 44], "fluid", COLORS.blue, [50, 86]),
};

export const DISTRICT_ORDER: DistrictId[] = ["gate", "nexus", "projects", "team", "sanctuary"];

/** โครงแบบ Hub: Nexus เชื่อมกับทุกพื้นที่ */
export function isLinked(a: DistrictId, b: DistrictId): boolean {
  return a !== b && (a === "nexus" || b === "nexus");
}
