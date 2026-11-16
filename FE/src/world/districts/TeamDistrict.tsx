// Team Headquarters — อาคารวิจัย/สำนักงานใหญ่ มีจอข้อมูลทีมและจอติดต่อ

import { useAi } from "../../store/useAi";
import * as sfx from "../../audio/sfx";
import { useMemo, useRef, useState } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import { DISTRICTS } from "../../config/districts";
import { COLORS } from "../../config/theme";
import { useWorld, type Panel } from "../../store/useWorld";
import { useT } from "../../i18n";
import { NeonSign } from "../NeonSign";
import { Portal } from "../Portal";
import { AiPresence } from "../ai/AiPresence";
import { buildingWindowsTexture, screenTexture } from "../textures";
import { Platform } from "./common";

export function TeamDistrict() {
  const cfg = DISTRICTS.team;
  const tr = useT();
  const windows = useMemo(() => {
    const tex = buildingWindowsTexture().clone();
    tex.repeat.set(3, 6);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <group position={cfg.position}>
      <Platform radius={13} color={cfg.color} />
      {/* ตึกสำนักงานใหญ่ */}
      <mesh position={[0, 20, -11]}>
        <boxGeometry args={[18, 40, 6]} />
        <meshStandardMaterial color="#0b0a18" metalness={0.6} roughness={0.4} emissive="#ffffff" emissiveMap={windows} emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0, 40.3, -11]}>
        <boxGeometry args={[18.4, 0.3, 6.4]} />
        <meshBasicMaterial color={cfg.color} toneMapped={false} />
      </mesh>
      <NeonSign text={cfg.sign} color={cfg.color} height={1.3} position={[0, 12, -7.4]} />
      <NeonSign text="研究所" color={COLORS.cyan} height={4} vertical position={[-10, 9, -7.5]} flicker />

      <Screen title={tr("teamScreen")} color={cfg.color} panel={{ kind: "team" }} position={[-3.6, 3.2, -2]} rotation={[0, 0.18, 0]} />
      <Screen title={tr("contactScreen")} color={COLORS.pink} panel={{ kind: "contact" }} position={[3.6, 3.2, -2]} rotation={[0, -0.18, 0]} />

      <AiPresence district="team" size={0.6} position={[-9, 3.5, 2]} />
      <Portal target="nexus" radius={1.6} position={[10, 0.3, 2]} rotation={[0, -0.6, 0]} />
      <pointLight color={cfg.color} intensity={55} distance={30} position={[0, 8, 4]} />
    </group>
  );
}

function Screen({
  title,
  color,
  panel,
  ...group
}: { title: string; color: string; panel: Exclude<Panel, null> } & ThreeElements["group"]) {
  const openPanel = useWorld((s) => s.openPanel);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const texture = useMemo(() => screenTexture(title, color), [title, color]);
  const frame = useRef<THREE.Group>(null);

  useFrame(({ clock }, dt) => {
    if (!frame.current) return;
    frame.current.position.y = Math.sin(clock.elapsedTime * 1.3 + (panel.kind === "team" ? 0 : 1.5)) * 0.08;
    const s = THREE.MathUtils.damp(frame.current.scale.x, hovered ? 1.06 : 1, 8, dt);
    frame.current.scale.setScalar(s);
  });

  return (
    <group {...group}>
      <group
        ref={frame}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          useAi.getState().noticeHover();
          sfx.play("hover");
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          const s = useWorld.getState();
          if (s.introDone && !s.travel) {
            sfx.play("panelOpen");
            openPanel(panel);
          }
        }}
      >
        <mesh>
          <planeGeometry args={[5, 3.125]} />
          <meshBasicMaterial map={texture} transparent toneMapped={false} color={[1.4, 1.4, 1.4]} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      <mesh position={[0, -2.6, 0]}>
        <cylinderGeometry args={[0.08, 0.2, 2, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}
