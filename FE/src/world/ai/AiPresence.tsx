// AI ตัวเดียวกันที่ปรากฏในทุกพื้นที่ — ร่างเปลี่ยนตาม DISTRICTS[id].aiForm คลิกเพื่อเปิดแชท

import { useRef, useState } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import type { DistrictId } from "../../types";
import { DISTRICTS } from "../../config/districts";
import { COLORS } from "../../config/theme";
import { useWorld } from "../../store/useWorld";
import { useChat } from "../../store/useChat";
import { EnergyOrb } from "./EnergyOrb";
import { GeometricEntity } from "./GeometricEntity";
import { FluidEntity } from "./FluidEntity";

type Props = ThreeElements["group"] & { district: DistrictId; size?: number };

export function AiPresence({ district, size = 1, ...group }: Props) {
  const cfg = DISTRICTS[district];
  const thinking = useChat((s) => s.pending);
  const setChatOpen = useWorld((s) => s.setChatOpen);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const float = useRef<THREE.Group>(null);

  useFrame(({ clock }, dt) => {
    if (!float.current) return;
    float.current.position.y = Math.sin(clock.elapsedTime * 1.2) * 0.25;
    const target = size * (hovered ? 1.08 : 1);
    float.current.scale.setScalar(THREE.MathUtils.damp(float.current.scale.x, target, 6, dt));
  });

  return (
    <group {...group}>
      <group
        ref={float}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (useWorld.getState().introDone) setChatOpen(true);
        }}
      >
        {cfg.aiForm === "orb" && <EnergyOrb color={COLORS.cyan} thinking={thinking} />}
        {cfg.aiForm === "geometric" && <GeometricEntity color={COLORS.purple} thinking={thinking} />}
        {cfg.aiForm === "fluid" && <FluidEntity color={COLORS.blue} accent={COLORS.pink} thinking={thinking} />}
        {/* พื้นที่คลิกที่ใหญ่กว่าตัว เพื่อให้คลิกง่าย */}
        <mesh visible={false}>
          <sphereGeometry args={[1.8, 12, 12]} />
        </mesh>
      </group>
    </group>
  );
}
