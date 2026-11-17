// Central Nexus — สี่แยกกลางเมือง: ลายทางม้าลาย, AI ลอยเหนือกลางแยก, สะพานลอยที่จุดชมมุมสูงยืนอยู่

import { DISTRICTS } from "../../config/districts";
import { Bridge } from "./NexusBridge";
import { COLORS } from "../../config/theme";
import { NEXUS_HALF } from "../street/streets";
import { AiPresence } from "../ai/AiPresence";
import { SpinningRing } from "./common";


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

      <Bridge />

      <pointLight color={cfg.color} intensity={50} distance={30} position={[0, 9, 2]} />
    </group>
  );
}
