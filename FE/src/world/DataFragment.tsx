// เศษข้อมูลเรืองแสงที่ซ่อนอยู่ — เห็นเมื่ออยู่จุดชมที่กำหนด คลิกแล้ว AI ดีใจ พูด และนับบน HUD

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import { DISTRICTS } from "../config/districts";
import { COLORS } from "../config/theme";
import { useWorld } from "../store/useWorld";
import { FRAGMENTS, useDiscovery, type Fragment } from "../store/useDiscovery";
import { useAi } from "../store/useAi";
import * as sfx from "../audio/sfx";

export function DataFragments() {
  const district = useWorld((s) => s.district);
  const viewpoint = useWorld((s) => s.viewpoint);
  const travel = useWorld((s) => s.travel);
  const found = useDiscovery((s) => s.found);
  if (travel) return null;
  const visible = FRAGMENTS.filter((f) => f.district === district && f.viewpoint === viewpoint && !found.includes(f.id));
  return (
    <>
      {visible.map((f) => (
        <FragmentMesh key={f.id} fragment={f} />
      ))}
    </>
  );
}

function FragmentMesh({ fragment }: { fragment: Fragment }) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const mesh = useRef<THREE.Mesh>(null);
  const base = DISTRICTS[fragment.district].position;
  const position: [number, number, number] = [base[0] + fragment.position[0], fragment.position[1], base[2] + fragment.position[2]];

  useFrame(({ clock }, dt) => {
    if (!mesh.current) return;
    const t = clock.elapsedTime;
    mesh.current.rotation.x += dt * 1.1;
    mesh.current.rotation.y += dt * 1.7;
    mesh.current.position.y = Math.sin(t * 2) * 0.12;
    mesh.current.scale.setScalar(THREE.MathUtils.damp(mesh.current.scale.x, hovered ? 1.5 : 1, 8, dt));
  });

  return (
    <group position={position}>
      <mesh
        ref={mesh}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          useAi.getState().noticeHover();
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (!useDiscovery.getState().find(fragment.id)) return;
          sfx.play("discover");
          const ai = useAi.getState();
          ai.setMood("happy", 1800);
          ai.say(useDiscovery.getState().complete ? "voiceDiscoverAll" : "voiceDiscover");
        }}
      >
        <octahedronGeometry args={[0.22, 0]} />
        <meshBasicMaterial color={COLORS.green} toneMapped={false} wireframe={!hovered} />
      </mesh>
      <pointLight color={COLORS.green} intensity={4} distance={4} />
    </group>
  );
}
