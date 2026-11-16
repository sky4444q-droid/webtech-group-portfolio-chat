// จุดชมของแต่ละพื้นที่ — คลิกวงแหวนเรืองแสงแล้วกล้องเลื่อนไปจุดนั้น (ใช้เมาส์อย่างเดียว)
// พิกัดเป็นแบบสัมพัทธ์กับตำแหน่งพื้นที่ · จุดแรก = จุดที่มาถึง
// wide = มุมกว้าง (หันตามเมาส์เล็กน้อย) · eye = ระดับสายตาแบบบุคคลที่หนึ่ง (หันได้กว้างขึ้น)

import type { DistrictId } from "../types";
import type { DictKey } from "../i18n";
import { DISTRICTS, type Vec3 } from "./districts";
import { TEAM_LOBBY_OFFSET } from "../world/street/streets";

export interface Viewpoint {
  id: string;
  label: DictKey;
  mode: "wide" | "eye";
  position: Vec3;
  target: Vec3;
  /** หันตามเมาส์ได้กี่เรเดียน */
  lookRange: number;
  /** ตำแหน่งวงแหวนที่คลิก */
  marker: Vec3;
}

const WIDE = 0.08;
const EYE = 0.43; // ประมาณ ±25°
const EYE_Y = 1.7;

// ทิศของแต่ละที่: Gate ถนนไปทาง +x (เข้าเมือง) · Projects ปลายถนนทาง −z · Team ล็อบบี้ในตึก · Sanctuary ลานลึกทาง +z
const L = TEAM_LOBBY_OFFSET;
const lobby = (p: Vec3): Vec3 => [p[0] + L[0], p[1] + L[1], p[2] + L[2]];

export const VIEWPOINTS: Record<DistrictId, Viewpoint[]> = {
  gate: [
    { id: "lane", label: "vpGateEntry", mode: "eye", position: [4, EYE_Y, 0], target: [-8, 1.6, 0], lookRange: EYE, marker: [1.5, 0.05, 0] },
    { id: "toArch", label: "vpGateAlley", mode: "eye", position: [-3.5, EYE_Y, 0], target: [-14, 2.6, 0], lookRange: EYE, marker: [-2.5, 0.05, 0] },
  ],
  nexus: [
    { id: "center", label: "vpNexusCenter", mode: "eye", position: [0, EYE_Y, 6], target: [0, 2.2, -8], lookRange: EYE, marker: [0, 0.05, 3] },
    { id: "bridge", label: "vpNexusBridge", mode: "wide", position: [0, 6.4, 8], target: [0, 2.6, -14], lookRange: WIDE, marker: [3, 0.05, 7] },
  ],
  projects: [
    { id: "hall", label: "vpProjectsHall", mode: "eye", position: [0, EYE_Y, 12], target: [0, 2.6, 0], lookRange: EYE, marker: [0, 0.05, 9] },
    { id: "pedestal", label: "vpProjectsPedestal", mode: "wide", position: [0, 3.2, 7], target: [0, 2.6, 0], lookRange: WIDE, marker: [0, 0.25, 3.6] },
  ],
  team: [
    { id: "lobby", label: "vpTeamLobby", mode: "eye", position: lobby([0, EYE_Y, 9]), target: lobby([0, 1.9, -2]), lookRange: EYE, marker: lobby([0, 0.05, 6]) },
    { id: "teamScreen", label: "vpTeamScreen", mode: "eye", position: lobby([-3.6, EYE_Y, 3]), target: lobby([-3.6, 1.9, -2]), lookRange: EYE, marker: lobby([-3.6, 0.05, 0.6]) },
    { id: "contactScreen", label: "vpTeamContact", mode: "eye", position: lobby([3.6, EYE_Y, 3]), target: lobby([3.6, 1.9, -2]), lookRange: EYE, marker: lobby([3.6, 0.05, 0.6]) },
  ],
  sanctuary: [
    { id: "edge", label: "vpSanctuaryEdge", mode: "eye", position: [0, 1.9, -2], target: [0, 4.5, 10], lookRange: EYE, marker: [0, 0.05, 0.5] },
    { id: "presence", label: "vpSanctuaryFace", mode: "eye", position: [0, 2.4, 1.5], target: [0, 5.2, 10], lookRange: EYE, marker: [0, 0.05, 3] },
  ],
};

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** จุดชมในพิกัดโลก */
export function viewpointWorld(district: DistrictId, index: number): { position: Vec3; target: Vec3; lookRange: number; mode: Viewpoint["mode"] } {
  const vp = VIEWPOINTS[district][index] ?? VIEWPOINTS[district][0];
  const base = DISTRICTS[district].position;
  return { position: add(base, vp.position), target: add(base, vp.target), lookRange: vp.lookRange, mode: vp.mode };
}
