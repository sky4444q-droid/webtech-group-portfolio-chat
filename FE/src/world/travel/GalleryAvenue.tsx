// Gallery Avenue — ถนนนีออนจริงระหว่าง Central Nexus กับ Project Dimension (เดินไปหอผลงาน)

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "../../config/theme";
import { NeonSign } from "../NeonSign";
import { AVENUE } from "./paths";
import { buildingWindowsTexture } from "../textures";

const SIGNS = ["展示", "GALLERY", "未来", "HOLO", "作品", "EXHIBIT", "電脳", "NEXORA", "芸術", "→ PROJECTS"];
const SIGN_COLORS = [COLORS.pink, COLORS.cyan, COLORS.purple, COLORS.blue, COLORS.green];

export function GalleryAvenue() {
  const { x, zStart, zEnd, halfWidth } = AVENUE;
  const length = zStart - zEnd;
  const midZ = (zStart + zEnd) / 2;

  // อาคารริมถนนสองข้าง (กล่องเรียงต่อกัน)
  const facades = useMemo(() => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const out: { x: number; z: number; w: number; d: number; h: number }[] = [];
    for (const side of [-1, 1]) {
      let z = zStart - 2;
      while (z > zEnd + 4) {
        const d = 5 + rand() * 6;
        out.push({ x: x + side * (halfWidth + 3), z: z - d / 2, w: 5, d: d - 0.4, h: 8 + rand() * 18 });
        z -= d;
      }
    }
    return out;
  }, [x, zStart, zEnd, halfWidth]);

  const windows = useMemo(() => {
    const tex = buildingWindowsTexture().clone();
    tex.repeat.set(1, 2);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <group>
      {/* ทางเดิน + เส้นไฟขอบทาง */}
      <mesh position={[x, 0.02, midZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[halfWidth * 2, length]} />
        <meshStandardMaterial color="#0d0a1e" metalness={0.8} roughness={0.25} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[x + side * halfWidth, 0.05, midZ]}>
          <boxGeometry args={[0.08, 0.06, length]} />
          <meshBasicMaterial color={side < 0 ? COLORS.pink : COLORS.cyan} toneMapped={false} />
        </mesh>
      ))}
      {facades.map((f, i) => (
        <mesh key={i} position={[f.x, f.h / 2, f.z]}>
          <boxGeometry args={[f.w, f.h, f.d]} />
          <meshStandardMaterial color="#0b0918" metalness={0.5} roughness={0.5} emissive="#ffffff" emissiveMap={windows} emissiveIntensity={0.9} />
        </mesh>
      ))}
      {/* ป้ายนีออนยื่นออกจากตึก ซ้อนหลายชั้น */}
      {Array.from({ length: 16 }, (_, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const z = zStart - 6 - i * ((length - 12) / 16);
        const vertical = i % 3 !== 0;
        return (
          <NeonSign
            key={i}
            text={SIGNS[i % SIGNS.length]}
            color={SIGN_COLORS[i % SIGN_COLORS.length]}
            height={vertical ? 2.6 : 0.8}
            vertical={vertical}
            flicker={i % 4 === 1}
            position={[x + side * (halfWidth + 0.4), vertical ? 4.2 + (i % 3) : 5.5 + (i % 2) * 2, z]}
            rotation={[0, (side * -Math.PI) / 2, 0]}
          />
        );
      })}
      {/* จอโฮโลแกรมลอยเหนือถนน */}
      {[0.3, 0.62].map((k, i) => (
        <HoloBanner key={k} position={[x, 6.5, zStart - length * k]} color={i ? COLORS.purple : COLORS.cyan} />
      ))}
      <GalleryDoor position={[x, 0, zEnd + 1]} />
    </group>
  );
}

function HoloBanner({ position, color }: { position: [number, number, number]; color: string }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.opacity = 0.22 + Math.sin(clock.elapsedTime * 2 + position[2]) * 0.06;
  });
  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[8, 2, 16, 4]} />
        <meshBasicMaterial ref={mat} color={color} wireframe transparent opacity={0.25} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <NeonSign text="PROJECT DIMENSION" color={color} height={0.55} position={[0, 0, 0.05]} />
    </group>
  );
}

/** ประตูใหญ่ของหอจัดแสดง — เลื่อนเปิดเมื่อกล้องเข้าใกล้ */
function GalleryDoor({ position }: { position: [number, number, number] }) {
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  useFrame(({ camera }, dt) => {
    const dist = Math.abs(camera.position.z - position[2]);
    const open = dist < 14 || camera.position.z < position[2] ? 1 : 0;
    for (const [ref, side] of [[left, -1], [right, 1]] as const) {
      if (!ref.current) continue;
      const target = side * (2.6 + open * 4.6);
      ref.current.position.x = THREE.MathUtils.damp(ref.current.position.x, target, 3, dt);
    }
  });
  return (
    <group position={position}>
      {/* กรอบประตู */}
      <mesh position={[0, 7.2, 0]}>
        <boxGeometry args={[12.4, 0.5, 0.6]} />
        <meshBasicMaterial color={COLORS.purple} toneMapped={false} />
      </mesh>
      {[-6, 6].map((xx) => (
        <mesh key={xx} position={[xx, 3.6, 0]}>
          <boxGeometry args={[0.5, 7.2, 0.6]} />
          <meshBasicMaterial color={COLORS.purple} toneMapped={false} />
        </mesh>
      ))}
      {[left, right].map((ref, i) => (
        <mesh key={i} ref={ref} position={[(i ? 1 : -1) * 2.6, 3.5, 0]}>
          <boxGeometry args={[5.2, 7, 0.2]} />
          <meshStandardMaterial color="#140f2e" metalness={0.9} roughness={0.2} emissive={COLORS.purple} emissiveIntensity={0.25} />
        </mesh>
      ))}
      <NeonSign text="GALLERY" color={COLORS.pink} height={0.6} position={[0, 8.1, 0.35]} />
    </group>
  );
}
