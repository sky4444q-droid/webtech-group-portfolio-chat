// จุดชมของแต่ละพื้นที่ — คลิกวงแหวนเรืองแสงแล้วกล้องเลื่อนไปจุดนั้น (ใช้เมาส์อย่างเดียว)
// พิกัดเป็นแบบสัมพัทธ์กับตำแหน่งพื้นที่ · จุดแรก = จุดที่มาถึง
// wide = มุมกว้าง (หันตามเมาส์เล็กน้อย) · eye = ระดับสายตาแบบบุคคลที่หนึ่ง (หันได้กว้างขึ้น)

import type { DistrictId } from "../types";
import type { DictKey } from "../i18n";
import { DISTRICTS, type Vec3 } from "./districts";

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

export const VIEWPOINTS: Record<DistrictId, Viewpoint[]> = {
  gate: [
    { id: "entry", label: "vpGateEntry", mode: "wide", position: [0, 5, 17], target: [0, 3, 0], lookRange: WIDE, marker: [0, 0.05, 10] },
    { id: "alley", label: "vpGateAlley", mode: "wide", position: [0, 3, -2], target: [0, 2.5, 30], lookRange: WIDE, marker: [5, 0.05, 2] },
  ],
  nexus: [
    { id: "center", label: "vpNexusCenter", mode: "wide", position: [0, 5, 17], target: [0, 3, 0], lookRange: WIDE, marker: [0, 0.05, 9] },
    { id: "toProjects", label: "vpNexusProjects", mode: "wide", position: [-5, 2.6, 2], target: [-5, 2, -5], lookRange: WIDE, marker: [-5, 0.05, -1.5] },
    { id: "toTeam", label: "vpNexusTeam", mode: "wide", position: [5, 2.6, 2], target: [5, 2, -5], lookRange: WIDE, marker: [5, 0.05, -1.5] },
    { id: "toSanctuary", label: "vpNexusSanctuary", mode: "wide", position: [10, 2.6, 6], target: [11, 2, -1], lookRange: WIDE, marker: [10.5, 0.05, 2.5] },
  ],
  projects: [
    { id: "hall", label: "vpProjectsHall", mode: "wide", position: [0, 5, 17], target: [0, 3, 0], lookRange: WIDE, marker: [0, 0.25, 10] },
    { id: "pedestal", label: "vpProjectsPedestal", mode: "wide", position: [0, 3.2, 7], target: [0, 2.6, 0], lookRange: WIDE, marker: [0, 0.25, 3.6] },
  ],
  team: [
    { id: "lobby", label: "vpTeamLobby", mode: "eye", position: [0, EYE_Y, 9], target: [0, 1.9, -2], lookRange: EYE, marker: [0, 0.05, 6] },
    { id: "teamScreen", label: "vpTeamScreen", mode: "eye", position: [-3.6, EYE_Y, 3], target: [-3.6, 1.9, -2], lookRange: EYE, marker: [-3.6, 0.05, 0.6] },
    { id: "contactScreen", label: "vpTeamContact", mode: "eye", position: [3.6, EYE_Y, 3], target: [3.6, 1.9, -2], lookRange: EYE, marker: [3.6, 0.05, 0.6] },
  ],
  sanctuary: [
    { id: "edge", label: "vpSanctuaryEdge", mode: "eye", position: [0, 1.9, 15], target: [0, 4.5, -2], lookRange: EYE, marker: [0, 0.05, 12] },
    { id: "presence", label: "vpSanctuaryFace", mode: "eye", position: [0, 2.4, 5.5], target: [0, 5.2, -2], lookRange: EYE, marker: [0, 0.05, 3] },
  ],
};

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** จุดชมในพิกัดโลก */
export function viewpointWorld(district: DistrictId, index: number): { position: Vec3; target: Vec3; lookRange: number; mode: Viewpoint["mode"] } {
  const vp = VIEWPOINTS[district][index] ?? VIEWPOINTS[district][0];
  const base = DISTRICTS[district].position;
  return { position: add(base, vp.position), target: add(base, vp.target), lookRange: vp.lookRange, mode: vp.mode };
}
