// AI Sanctuary — ปลายซอยแคบ ลอดซุ้มเรืองแสงเข้าลานเล็ก ที่สถิตของ AI ร่าง Fluid

import { DISTRICTS } from "../../config/districts";
import { COLORS } from "../../config/theme";
import { AiPresence } from "../ai/AiPresence";
import { NeonPillar, SpinningRing } from "./common";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useDiscovery } from "../../store/useDiscovery";

/** กลางลาน (พิกัดภายใน) — จุดชมหันเข้าหาที่นี่ */
const CORE: [number, number, number] = [0, 5.5, 10];

export function SanctuaryDistrict() {
  const cfg = DISTRICTS.sanctuary;
  return (
    <group position={cfg.position}>
      {/* ซุ้มปากซอย */}
      <group position={[0, 0, 0.5]}>
        <NeonPillar height={4.6} color={cfg.color} position={[-2.4, 0, 0]} />
        <NeonPillar height={4.6} color={cfg.color} position={[2.4, 0, 0]} />
        <mesh position={[0, 4.8, 0]}>
          <boxGeometry args={[6, 0.5, 0.8]} />
          <meshStandardMaterial color="#0b0b10" metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh position={[0, 4.5, -0.42]}>
          <boxGeometry args={[5.4, 0.06, 0.04]} />
          <meshBasicMaterial color={cfg.color} toneMapped={false} />
        </mesh>
      </group>
      {/* ลานเล็ก: วงไฟบนพื้น */}
      <mesh position={[CORE[0], 0.03, CORE[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[7.6, 7.75, 96]} />
        <meshBasicMaterial color={cfg.color} toneMapped={false} transparent opacity={0.6} />
      </mesh>

      <AiPresence district="sanctuary" size={2.4} position={CORE} />
      {[
        { r: 5, c: COLORS.blue, s: 0.25, rot: [Math.PI / 2, 0, 0] as [number, number, number] },
        { r: 6.4, c: COLORS.pink, s: -0.18, rot: [Math.PI / 2.4, 0.4, 0] as [number, number, number] },
        { r: 7.8, c: COLORS.purple, s: 0.12, rot: [Math.PI / 1.7, -0.3, 0] as [number, number, number] },
      ].map((ring) => (
        <SpinningRing key={ring.r} radius={ring.r} color={ring.c} speed={ring.s} position={CORE} rotation={ring.rot} opacity={0.55} />
      ))}
      <DiscoveryReward />
      <pointLight color={COLORS.pink} intensity={30} distance={30} position={[-6, 4, 8]} />
    </group>
  );
}

/** เก็บเศษข้อมูลครบ 5 ชิ้น: โลโก้ NEXORA ปรากฏกลางร่าง AI พร้อมวงแหวนทอง */
function DiscoveryReward() {
  const complete = useDiscovery((s) => s.complete);
  const logo = useTexture("/images/nexora-emblem.png");
  if (!complete) return null;
  return (
    <group position={CORE}>
      <sprite scale={[3.4, 2.9, 1]}>
        <spriteMaterial map={logo} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <SpinningRing radius={4.2} color="#ffd36b" speed={0.5} rotation={[Math.PI / 2.1, 0, 0]} opacity={0.9} />
      <SpinningRing radius={5.6} color="#ffd36b" speed={-0.3} rotation={[Math.PI / 1.6, 0.5, 0]} opacity={0.6} />
    </group>
  );
}
