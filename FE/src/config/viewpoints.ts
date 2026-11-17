// จุดชมของแต่ละพื้นที่ — คลิกวงแหวนเรืองแสงแล้วกล้องเลื่อนไปจุดนั้น (ใช้เมาส์อย่างเดียว)
// พิกัดเป็นแบบสัมพัทธ์กับตำแหน่งพื้นที่ · จุดแรก = จุดที่มาถึง
// wide = มุมกว้าง (หันตามเมาส์เล็กน้อย) · eye = ระดับสายตาแบบบุคคลที่หนึ่ง (หันได้กว้างขึ้น)

import type { DistrictId } from "../types";
import type { DictKey } from "../i18n";
import { DISTRICTS, type Vec3 } from "./districts";
import { TEAM_LOBBY_OFFSET } from "../world/street/streets";
import { BRIDGE } from "./bridge";

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
const EYE_Y = 2.1; // ยกกล้องสูงขึ้นเล็กน้อยให้เห็นพื้นถนนและหน้าตึกมากขึ้น (fov กว้างขึ้น)

// ทิศของแต่ละที่: Gate ถนนไปทาง +x (เข้าเมือง) · Projects ปลายถนนทาง −z · Team ล็อบบี้ในตึก · Sanctuary ลานลึกทาง +z
// ถอยกล้องออกจากเป้า 2–4 ม. · วงแหวนอยู่หน้ากล้อง ~5–8 ม. เพื่อให้ยังอยู่ในจอเมื่อกล้องสูงขึ้น
const L = TEAM_LOBBY_OFFSET;
const lobby = (p: Vec3): Vec3 => [p[0] + L[0], p[1] + L[1], p[2] + L[2]];

export const VIEWPOINTS: Record<DistrictId, Viewpoint[]> = {
  gate: [
    { id: "lane", label: "vpGateEntry", mode: "eye", position: [7, EYE_Y, 0], target: [-8, 1.6, 0], lookRange: EYE, marker: [2, 0.05, 0] },
    { id: "toArch", label: "vpGateAlley", mode: "eye", position: [-0.5, EYE_Y, 0], target: [-14, 2.6, 0], lookRange: EYE, marker: [-6.5, 0.05, 0] },
  ],
  nexus: [
    { id: "center", label: "vpNexusCenter", mode: "eye", position: [0, EYE_Y, 9], target: [0, 2.2, -8], lookRange: EYE, marker: [0, 0.05, 4] },
    // ยืนบนพื้นสะพานลอย (สูงระดับสายตาเหนือพื้นสะพาน) มองข้ามแยก
    { id: "bridge", label: "vpNexusBridge", mode: "eye", position: [0, BRIDGE.y + 1.75, BRIDGE.z + 0.3], target: [0, 8.5, -20], lookRange: EYE, marker: [3, 0.05, -6] },
  ],
  projects: [
    { id: "hall", label: "vpProjectsHall", mode: "eye", position: [0, EYE_Y, 15], target: [0, 2.6, 0], lookRange: EYE, marker: [0, 0.05, 10] },
    { id: "pedestal", label: "vpProjectsPedestal", mode: "wide", position: [0, 3.4, 10], target: [0, 2.6, 0], lookRange: WIDE, marker: [0, 0.25, 3.6] },
  ],
  team: [
    // ล็อบบี้ลึกถึง z = 11 (ผนังหน้า) ถอยได้ไม่เกิน ~1.5 ม.
    { id: "lobby", label: "vpTeamLobby", mode: "eye", position: lobby([0, EYE_Y, 10.5]), target: lobby([0, 1.9, -2]), lookRange: EYE, marker: lobby([0, 0.05, 5.5]) },
    { id: "teamScreen", label: "vpTeamScreen", mode: "eye", position: lobby([-3.6, EYE_Y, 5.5]), target: lobby([-3.6, 1.9, -2]), lookRange: EYE, marker: lobby([-3.6, 0.05, 0.6]) },
    { id: "contactScreen", label: "vpTeamContact", mode: "eye", position: lobby([3.6, EYE_Y, 5.5]), target: lobby([3.6, 1.9, -2]), lookRange: EYE, marker: lobby([3.6, 0.05, 0.6]) },
  ],
  sanctuary: [
    { id: "edge", label: "vpSanctuaryEdge", mode: "eye", position: [0, 1.9, -4.5], target: [0, 4.5, 10], lookRange: EYE, marker: [2, 0.05, 2.5] },
    { id: "presence", label: "vpSanctuaryFace", mode: "eye", position: [0, 2.2, -1], target: [0, 5.2, 10], lookRange: EYE, marker: [0, 0.05, 7] },
  ],
};

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** จุดชมในพิกัดโลก */
export function viewpointWorld(district: DistrictId, index: number): { position: Vec3; target: Vec3; lookRange: number; mode: Viewpoint["mode"] } {
  const vp = VIEWPOINTS[district][index] ?? VIEWPOINTS[district][0];
  const base = DISTRICTS[district].position;
  return { position: add(base, vp.position), target: add(base, vp.target), lookRange: vp.lookRange, mode: vp.mode };
}

/** ตำแหน่งการ์ด Hologram ทีม (สัมพัทธ์กับล็อบบี้) — TeamDistrict วางการ์ดที่นี่ */
export const TEAM_HOLO_CARD: Vec3 = [-3.6, 1.9, -0.8];
const teamBase = DISTRICTS.team.position;
export const TEAM_HOLO_CARD_WORLD: Vec3 = add(teamBase, lobby(TEAM_HOLO_CARD));

/** ระยะกล้องจากการ์ดทีม: ไกลพอให้การ์ด (ขนาด px คงที่) ไม่ล้นจอ */
// fov 65° ทำให้การ์ดดูเล็กลง → ขยับเข้ามาให้สัดส่วนบนจอเท่าเดิม (~0.61 ของจอ 736px)
const TEAM_HOLO_DISTANCE = 5.9;

/** ท่ากล้องตอนเปิดการ์ดทีม — มองตรงที่การ์ด และไม่หันตามเมาส์ (เหมือนท่าดูผลงานใน Projects) */
export function teamHoloCamera(): { position: Vec3; target: Vec3 } {
  const [x, y, z] = TEAM_HOLO_CARD_WORLD;
  return { position: [x, y, z + TEAM_HOLO_DISTANCE], target: [x, y, z] };
}
