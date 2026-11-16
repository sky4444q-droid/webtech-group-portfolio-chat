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
      <NeonSign text={cfg.sign} color={cfg.color} height={1.3} position={[0, 12, -7.9]} />
      <NeonSign text="研究所" color={COLORS.cyan} height={4} vertical position={[-10, 9, -7.9]} flicker />

      <Lobby color={cfg.color} />

      <Screen title={tr("teamScreen")} color={cfg.color} panel={{ kind: "team" }} position={[-3.6, 1.95, -2]} rotation={[0, 0.12, 0]} scale={0.75} />
      <Screen title={tr("contactScreen")} color={COLORS.pink} panel={{ kind: "contact" }} position={[3.6, 1.95, -2]} rotation={[0, -0.12, 0]} scale={0.75} />

      <AiPresence district="team" size={0.45} position={[-6.6, 2.3, -0.5]} />
      <Portal target="nexus" radius={1.3} position={[7, 0.3, 5]} rotation={[0, -0.9, 0]} />
      <pointLight color={cfg.color} intensity={30} distance={22} position={[0, 3.8, 3]} />
      <pointLight color={COLORS.cyan} intensity={14} distance={14} position={[0, 3.6, -4]} />
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

/** ล็อบบี้ชั้นล่างของสำนักงานใหญ่ — ผนังกระจก เพดานไฟ จอข้อมูลอยู่ระดับสายตา */
const LOBBY = { halfW: 9, back: -6, front: 11, height: 4.4 };

function Lobby({ color }: { color: string }) {
  const { halfW, back, front, height } = LOBBY;
  const depth = front - back;
  const midZ = (front + back) / 2;
  return (
    <group>
      {/* ผนังหลัง */}
      <mesh position={[0, height / 2, back]}>
        <planeGeometry args={[halfW * 2, height, 18, 4]} />
        <meshStandardMaterial color="#0a0818" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, height / 2, back + 0.02]}>
        <planeGeometry args={[halfW * 2, height, 18, 4]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.08} toneMapped={false} />
      </mesh>
      <NeonSign text="TEAM HEADQUARTERS" color={color} height={0.42} position={[0, 3.55, back + 0.05]} />
      {/* ผนังข้างเป็นกระจก */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * halfW, height / 2, midZ]} rotation={[0, (-side * Math.PI) / 2, 0]}>
          <mesh>
            <planeGeometry args={[depth, height]} />
            <meshStandardMaterial color="#1a2a4a" metalness={0.9} roughness={0.08} transparent opacity={0.22} side={THREE.DoubleSide} />
          </mesh>
          {[-0.5, 0.5].map((k) => (
            <mesh key={k} position={[0, k * height * 0.92, 0.01]}>
              <boxGeometry args={[depth, 0.05, 0.05]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
      {/* ผนังหน้ากระจก เว้นประตูกลาง */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (halfW + 2.2) / 2, height / 2, front]}>
          <planeGeometry args={[halfW - 2.2, height]} />
          <meshStandardMaterial color="#1a2a4a" metalness={0.9} roughness={0.08} transparent opacity={0.18} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* เพดาน + แถบไฟ */}
      <mesh position={[0, height, midZ]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[halfW * 2, depth]} />
        <meshStandardMaterial color="#07060f" metalness={0.5} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {[-5, 0, 5].map((x) => (
        <mesh key={x} position={[x, height - 0.04, midZ]}>
          <boxGeometry args={[0.18, 0.04, depth - 1]} />
          <meshBasicMaterial color={x === 0 ? color : COLORS.cyan} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
