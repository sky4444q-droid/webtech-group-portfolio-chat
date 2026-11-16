// AI Sanctuary — พื้นที่นามธรรมและดิจิทัล ที่สถิตของ AI ร่าง Fluid

import { DISTRICTS } from "../../config/districts";
import { COLORS } from "../../config/theme";
import { NeonSign } from "../NeonSign";
import { Portal } from "../Portal";
import { AiPresence } from "../ai/AiPresence";
import { Platform, SpinningRing } from "./common";

export function SanctuaryDistrict() {
  const cfg = DISTRICTS.sanctuary;
  return (
    <group position={cfg.position}>
      <Platform radius={18} color={cfg.color} />
      <AiPresence district="sanctuary" size={2.4} position={[0, 5.5, -2]} />
      {[
        { r: 5, c: COLORS.blue, s: 0.25, rot: [Math.PI / 2, 0, 0] as [number, number, number] },
        { r: 6.4, c: COLORS.pink, s: -0.18, rot: [Math.PI / 2.4, 0.4, 0] as [number, number, number] },
        { r: 7.8, c: COLORS.purple, s: 0.12, rot: [Math.PI / 1.7, -0.3, 0] as [number, number, number] },
        { r: 10, c: COLORS.cyan, s: -0.08, rot: [Math.PI / 2, 0, 0] as [number, number, number] },
      ].map((ring) => (
        <SpinningRing key={ring.r} radius={ring.r} color={ring.c} speed={ring.s} position={[0, 5.5, -2]} rotation={ring.rot} opacity={0.55} />
      ))}
      <NeonSign text={cfg.sign} color={cfg.color} height={0.9} position={[0, 12, -10]} />
      <NeonSign text="静寂" color={COLORS.purple} height={3} vertical position={[-13, 8, -6]} />
      <Portal target="nexus" radius={1.6} position={[10.5, 0.3, 3]} rotation={[0, -0.6, 0]} />
      <pointLight color={COLORS.pink} intensity={30} distance={30} position={[-8, 4, 4]} />
    </group>
  );
}
