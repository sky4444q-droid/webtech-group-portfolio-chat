// Arrival Gate — ประตูทางเข้าจักรวาล

import { DISTRICTS } from "../../config/districts";
import { COLORS } from "../../config/theme";
import { NeonSign } from "../NeonSign";
import { Portal } from "../Portal";
import { AiPresence } from "../ai/AiPresence";
import { NeonPillar, Platform } from "./common";
import { ArrivalAlley } from "../ArrivalAlley";

export function GateDistrict() {
  const cfg = DISTRICTS.gate;
  return (
    <group position={cfg.position}>
      <Platform radius={13} color={cfg.color} />
      <ArrivalAlley />
      {/* ซุ้มประตูใหญ่ */}
      <NeonPillar height={14} color={cfg.color} position={[-6.5, 0, -3]} />
      <NeonPillar height={14} color={cfg.color} position={[6.5, 0, -3]} />
      <mesh position={[0, 14.2, -3]}>
        <boxGeometry args={[14.6, 1, 1]} />
        <meshStandardMaterial color="#0e0a20" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 13.6, -2.45]}>
        <boxGeometry args={[13.4, 0.08, 0.04]} />
        <meshBasicMaterial color={cfg.color} toneMapped={false} />
      </mesh>
      <NeonSign text={cfg.sign} color={cfg.color} height={1.1} position={[0, 15.6, -3]} flicker />
      <NeonSign text="入口" color={COLORS.cyan} height={3.6} vertical position={[-7.6, 8, -2.5]} />
      <NeonSign text="未来" color={COLORS.purple} height={3.6} vertical position={[7.6, 8, -2.5]} flicker />

      <Portal target="nexus" radius={4} position={[0, 0.3, -3]} />
      <AiPresence district="gate" size={0.6} position={[8.5, 3, 3]} />
      <pointLight color={cfg.color} intensity={60} distance={30} position={[0, 8, 2]} />
    </group>
  );
}
