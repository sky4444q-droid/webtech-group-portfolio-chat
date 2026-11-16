// AI ตัวเดียวกันที่ปรากฏในทุกพื้นที่ — ร่างเปลี่ยนตาม DISTRICTS[id].aiForm คลิกเพื่อเปิดแชท

import { useRef, useState } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import type { DistrictId } from "../../types";
import { DISTRICTS } from "../../config/districts";
import { COLORS } from "../../config/theme";
import { useWorld } from "../../store/useWorld";
import { useAi } from "../../store/useAi";
import { MOOD_STYLE } from "./moodStyle";
import * as sfx from "../../audio/sfx";
import { EnergyOrb } from "./EnergyOrb";
import { GeometricEntity } from "./GeometricEntity";
import { FluidEntity } from "./FluidEntity";

type Props = ThreeElements["group"] & { district: DistrictId; size?: number };

export function AiPresence({ district, size = 1, ...group }: Props) {
  const cfg = DISTRICTS[district];
  const mood = useAi((s) => s.mood);
  const setChatOpen = useWorld((s) => s.setChatOpen);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const float = useRef<THREE.Group>(null);

  useFrame(({ clock, pointer }, dt) => {
    if (!float.current) return;
    const t = clock.elapsedTime;
    const st = MOOD_STYLE[useAi.getState().mood];
    // หายใจ + เด้ง (ดีใจ) + สั่น (ผิดพลาด)
    const bounce = st.bounce * Math.abs(Math.sin(t * 9)) * 0.45;
    float.current.position.y = Math.sin(t * 1.2) * 0.25 + bounce;
    float.current.position.x = st.shake * Math.sin(t * 60) * 0.06;
    const breathe = 1 + Math.sin(t * 1.6) * 0.03;
    const target = size * (hovered ? 1.08 : 1) * breathe;
    float.current.scale.setScalar(THREE.MathUtils.damp(float.current.scale.x, target, 6, dt));
    // หันหาเมาส์ (มากขึ้นตอนสนใจ)
    const lean = mood === "curious" || hovered ? 0.45 : 0.12;
    float.current.rotation.y = THREE.MathUtils.damp(float.current.rotation.y, pointer.x * lean, 4, dt);
    float.current.rotation.x = THREE.MathUtils.damp(float.current.rotation.x, -pointer.y * lean * 0.6, 4, dt);
  });

  return (
    <group {...group}>
      <group
        ref={float}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          useAi.getState().noticeHover();
          sfx.play("hover");
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (useWorld.getState().introDone) {
            sfx.play("click");
            setChatOpen(true);
          }
        }}
      >
        {cfg.aiForm === "orb" && <EnergyOrb color={COLORS.cyan} mood={mood} />}
        {cfg.aiForm === "geometric" && <GeometricEntity color={COLORS.purple} mood={mood} />}
        {cfg.aiForm === "fluid" && <FluidEntity color={COLORS.blue} accent={COLORS.pink} mood={mood} />}
        {/* พื้นที่คลิกที่ใหญ่กว่าตัว เพื่อให้คลิกง่าย */}
        <mesh visible={false}>
          <sphereGeometry args={[1.8, 12, 12]} />
        </mesh>
      </group>
    </group>
  );
}
