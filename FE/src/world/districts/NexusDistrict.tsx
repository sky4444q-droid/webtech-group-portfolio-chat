// Central Nexus — สี่แยกกลางเมือง: ลายทางม้าลาย, AI ลอยเหนือกลางแยก, สะพานลอยที่จุดชมมุมสูงยืนอยู่

import { DISTRICTS } from "../../config/districts";
import { COLORS } from "../../config/theme";
import { NEXUS_HALF } from "../street/streets";
import { AiPresence } from "../ai/AiPresence";
import { SpinningRing } from "./common";

const BRIDGE_Z = 8;
const BRIDGE_Y = 4.7;

export function NexusDistrict() {
  const cfg = DISTRICTS.nexus;
  return (
    <group position={cfg.position}>
      {/* ทางม้าลายรอบแยก */}
      {[0, 1, 2, 3].map((q) => (
        <group key={q} rotation={[0, (q * Math.PI) / 2, 0]}>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} position={[(i - 3) * 1.3, 0.02, NEXUS_HALF - 1.4]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.7, 2]} />
              <meshStandardMaterial color="#d8d8e0" roughness={0.6} transparent opacity={0.35} />
            </mesh>
          ))}
        </group>
      ))}

      <AiPresence district="nexus" position={[0, 8.2, -3]} />
      <SpinningRing radius={2.4} color={COLORS.cyan} position={[0, 8.2, -3]} rotation={[Math.PI / 2.3, 0, 0]} speed={0.4} />
      <SpinningRing radius={2.9} color={COLORS.purple} position={[0, 8.2, -3]} rotation={[Math.PI / 1.8, 0.3, 0]} speed={-0.25} opacity={0.5} />

      {/* สะพานลอยข้ามแยก (จุดชม bridge ยืนบนนี้) */}
      <group position={[0, BRIDGE_Y, BRIDGE_Z]}>
        <mesh>
          <boxGeometry args={[NEXUS_HALF * 2 + 6, 0.35, 3]} />
          <meshStandardMaterial color="#101016" metalness={0.75} roughness={0.4} />
        </mesh>
        {[-1.45, 1.45].map((z) => (
          <group key={z}>
            <mesh position={[0, 0.65, z]}>
              <boxGeometry args={[NEXUS_HALF * 2 + 6, 0.06, 0.06]} />
              <meshBasicMaterial color={COLORS.red} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.35, z]}>
              <boxGeometry args={[NEXUS_HALF * 2 + 6, 0.6, 0.03]} />
              <meshStandardMaterial color="#1a2030" metalness={0.9} roughness={0.1} transparent opacity={0.3} />
            </mesh>
          </group>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (NEXUS_HALF + 2), -BRIDGE_Y / 2, 0]}>
            <boxGeometry args={[0.6, BRIDGE_Y, 0.6]} />
            <meshStandardMaterial color="#0c0c12" metalness={0.7} roughness={0.4} />
          </mesh>
        ))}
      </group>

      <pointLight color={cfg.color} intensity={50} distance={30} position={[0, 9, 2]} />
    </group>
  );
}
