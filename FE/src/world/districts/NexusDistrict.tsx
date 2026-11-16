// Central Nexus — Hub กลางที่มีประตูไปทุกพื้นที่

import type { DistrictId } from "../../types";
import { DISTRICTS } from "../../config/districts";
import { COLORS } from "../../config/theme";
import { NeonSign } from "../NeonSign";
import { Portal } from "../Portal";
import { AiPresence } from "../ai/AiPresence";
import { Platform, SpinningRing } from "./common";

// ประตูเรียงเป็นโค้งหันหน้าเข้าหากล้อง
const GATES: { target: DistrictId; x: number; z: number; rot: number }[] = [
  { target: "gate", x: -11, z: -1, rot: 0.5 },
  { target: "projects", x: -5, z: -5, rot: 0.15 },
  { target: "team", x: 5, z: -5, rot: -0.15 },
  { target: "sanctuary", x: 11, z: -1, rot: -0.5 },
];

export function NexusDistrict() {
  const cfg = DISTRICTS.nexus;
  return (
    <group position={cfg.position}>
      <Platform radius={16} color={cfg.color} />
      {GATES.map((g) => (
        <Portal key={g.target} target={g.target} radius={2.1} position={[g.x, 0.3, g.z]} rotation={[0, g.rot, 0]} />
      ))}

      <AiPresence district="nexus" position={[0, 8.2, -3]} />
      <SpinningRing radius={2.4} color={COLORS.cyan} position={[0, 8.2, -3]} rotation={[Math.PI / 2.3, 0, 0]} speed={0.4} />
      <SpinningRing radius={2.9} color={COLORS.purple} position={[0, 8.2, -3]} rotation={[Math.PI / 1.8, 0.3, 0]} speed={-0.25} opacity={0.5} />

      <NeonSign text={cfg.sign} color={cfg.color} height={0.9} position={[0, 12.5, -8]} />
      <NeonSign text="電脳都市" color={COLORS.pink} height={4.2} vertical position={[-15, 9, -8]} flicker />
      <NeonSign text="中央" color={COLORS.cyan} height={2.6} vertical position={[15, 8, -8]} />
      <pointLight color={cfg.color} intensity={70} distance={35} position={[0, 9, 4]} />
      <pointLight color={COLORS.pink} intensity={30} distance={25} position={[-12, 5, -4]} />
    </group>
  );
}
