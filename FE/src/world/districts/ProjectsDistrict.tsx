// Project Dimension — หอจัดแสดงผลงานแบบ Virtual Museum + Hologram

import { useAi } from "../../store/useAi";
import * as sfx from "../../audio/sfx";
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import { DISTRICTS } from "../../config/districts";
import { COLORS } from "../../config/theme";
import { usePortfolio } from "../../store/usePortfolio";
import { useWorld } from "../../store/useWorld";
import { NeonSign } from "../NeonSign";
import { Portal } from "../Portal";
import { AiPresence } from "../ai/AiPresence";
import { pedestalPositions } from "../layout";
import { NeonPillar } from "./common";

const HOLO_COLORS = [COLORS.cyan, COLORS.pink, COLORS.green];

export function ProjectsDistrict() {
  const cfg = DISTRICTS.projects;
  const projects = usePortfolio((s) => s.data.projects).slice(0, 3);
  const spots = pedestalPositions(projects.length);
  return (
    <group position={cfg.position}>
      {/* พื้นห้องจัดแสดงและผนังตาราง */}
      <mesh position={[0, 0.1, -1]}>
        <boxGeometry args={[30, 0.2, 16]} />
        <meshStandardMaterial color="#0c0920" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, 7, -9]}>
        <planeGeometry args={[30, 14, 30, 14]} />
        <meshBasicMaterial color={cfg.color} wireframe transparent opacity={0.12} toneMapped={false} />
      </mesh>
      {[-14, -7, 7, 14].map((x) => (
        <NeonPillar key={x} height={12} color={cfg.color} position={[x, 0, -8]} />
      ))}
      <NeonSign text={cfg.sign} color={cfg.color} height={0.9} position={[0, 11.5, -8.8]} />
      <NeonSign text="展示" color={COLORS.pink} height={3} vertical position={[-15.5, 7, -7]} flicker />

      {projects.map((p, i) => (
        <Pedestal key={p.id} id={p.id} index={i} position={spots[i]} color={HOLO_COLORS[i % HOLO_COLORS.length]} />
      ))}

      <AiPresence district="projects" position={[0, 8, -5]} size={0.9} />
      <Portal target="nexus" radius={1.6} position={[10.5, 0.2, 3]} rotation={[0, -0.6, 0]} />
      <pointLight color={cfg.color} intensity={60} distance={30} position={[0, 9, 3]} />
    </group>
  );
}

function Pedestal({ id, index, position, color }: { id: string; index: number; position: [number, number, number]; color: string }) {
  const openPanel = useWorld((s) => s.openPanel);
  const selected = useWorld((s) => s.panel?.kind === "project" && s.panel.id === id);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const holo = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (holo.current) {
      holo.current.rotation.y += dt * (hovered || selected ? 1.4 : 0.5);
      holo.current.position.y = 3.2 + Math.sin(t * 1.5 + index) * 0.15;
    }
    if (beam.current) {
      const target = hovered || selected ? 0.32 : 0.14;
      beam.current.opacity = THREE.MathUtils.damp(beam.current.opacity, target, 6, dt);
    }
  });

  const open = () => {
    const s = useWorld.getState();
    if (!s.introDone || s.travel) return;
    sfx.play("panelOpen");
    openPanel({ kind: "project", id });
  };

  return (
    <group position={position}>
      <group
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          useAi.getState().noticeHover();
          sfx.play("hover");
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          open();
        }}
      >
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[1.1, 1.4, 1.2, 6]} />
          <meshStandardMaterial color="#120d2a" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0, 1.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1.05, 6]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        {/* ลำแสงโฮโลแกรม */}
        <mesh position={[0, 2.4, 0]}>
          <cylinderGeometry args={[0.15, 1, 2.4, 24, 1, true]} />
          <meshBasicMaterial ref={beam} color={color} transparent opacity={0.14} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh ref={holo} position={[0, 3.2, 0]}>
          {index === 0 && <torusKnotGeometry args={[0.55, 0.16, 96, 12]} />}
          {index === 1 && <icosahedronGeometry args={[0.8, 1]} />}
          {index >= 2 && <octahedronGeometry args={[0.85, 0]} />}
          <meshBasicMaterial color={color} wireframe toneMapped={false} />
        </mesh>
        {/* พื้นที่คลิกครอบทั้งแท่น */}
        <mesh position={[0, 2, 0]} visible={false}>
          <boxGeometry args={[2.8, 4.4, 2.8]} />
        </mesh>
      </group>
      <NeonSign text={`PROJECT ${String(index + 1).padStart(2, "0")}`} color={color} height={0.42} position={[0, 4.6, 0]} />
    </group>
  );
}
