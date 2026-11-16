// Arrival Alley — ซอยนีออนแคบหน้าประตูทางเข้า (ส่วนถาวรของ Arrival Gate) ป้ายซ้อนหลายชั้น จอโฮโลแกรม ท่อ สายไฟ
// พิกัดสัมพัทธ์กับ Arrival Gate · ซอยวิ่งตามแกน +z

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "../config/theme";
import { NeonSign } from "./NeonSign";
import { buildingWindowsTexture } from "./textures";

const HALF_W = 3.6;
const Z0 = 6;
const Z1 = 62;
const WORDS = ["電脳", "NEXORA", "夜市", "OPEN", "ラーメン", "未来", "HOTEL", "接続", "24H", "CYBER", "回路", "BAR"];
const SIGN_COLORS = [COLORS.pink, COLORS.cyan, COLORS.purple, COLORS.green, COLORS.blue];

export function ArrivalAlley() {
  const windows = useMemo(() => {
    const t = buildingWindowsTexture().clone();
    t.repeat.set(1, 3);
    t.needsUpdate = true;
    return t;
  }, []);

  const blocks = useMemo(() => {
    let seed = 11;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const out: { x: number; z: number; d: number; h: number }[] = [];
    for (const side of [-1, 1]) {
      let z = Z0;
      while (z < Z1) {
        const d = 4 + rand() * 5;
        out.push({ x: side * (HALF_W + 2.5), z: z + d / 2, d: d - 0.3, h: 9 + rand() * 16 });
        z += d;
      }
    }
    return out;
  }, []);

  const signs = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const side = i % 2 ? 1 : -1;
        const vertical = i % 3 !== 2;
        return {
          side,
          vertical,
          text: WORDS[i % WORDS.length],
          color: SIGN_COLORS[(i * 3) % SIGN_COLORS.length],
          z: Z0 + 3 + i * ((Z1 - Z0 - 6) / 22),
          y: vertical ? 3.2 + (i % 4) * 1.1 : 4.5 + (i % 3) * 1.6,
          flicker: i % 5 === 0,
        };
      }),
    [],
  );

  const length = Z1 - Z0;
  const mid = (Z0 + Z1) / 2;

  return (
    <group>
      {/* พื้นซอยเปียก */}
      <mesh position={[0, 0.015, mid]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HALF_W * 2, length]} />
        <meshStandardMaterial color="#0b0817" metalness={0.9} roughness={0.18} />
      </mesh>
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[5, b.h, b.d]} />
          <meshStandardMaterial color="#0a0816" metalness={0.5} roughness={0.55} emissive="#ffffff" emissiveMap={windows} emissiveIntensity={0.7} />
        </mesh>
      ))}
      {signs.map((s, i) => (
        <NeonSign
          key={i}
          text={s.text}
          color={s.color}
          height={s.vertical ? 2.2 : 0.7}
          vertical={s.vertical}
          flicker={s.flicker}
          position={[s.side * (HALF_W + (s.vertical ? 0.9 : 0.05)), s.y, s.z]}
          rotation={[0, s.vertical ? 0 : (-s.side * Math.PI) / 2, 0]}
        />
      ))}
      {/* สายไฟพาดข้ามซอย */}
      {[14, 27, 41, 53].map((z, i) => (
        <mesh key={z} position={[0, 7.5 + (i % 2) * 1.2, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, HALF_W * 2 + 1, 6]} />
          <meshBasicMaterial color="#1a1530" />
        </mesh>
      ))}
      {/* ท่อตามผนัง */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (HALF_W + 0.05), 2.2, mid]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, length, 8]} />
          <meshStandardMaterial color="#231d3a" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      <HoloScreen position={[-HALF_W - 0.1, 3.4, 22]} color={COLORS.cyan} />
      <HoloScreen position={[HALF_W + 0.1, 4.2, 38]} color={COLORS.pink} />
      {/* ไฟซอย */}
      {[12, 30, 48].map((z, i) => (
        <pointLight key={z} color={SIGN_COLORS[i]} intensity={14} distance={16} position={[0, 4, z]} />
      ))}
    </group>
  );
}

function HoloScreen({ position, color }: { position: [number, number, number]; color: string }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.opacity = 0.35 + Math.sin(clock.elapsedTime * 7 + position[2]) * 0.05 + (Math.random() < 0.02 ? 0.3 : 0);
  });
  const side = position[0] < 0 ? 1 : -1;
  return (
    <mesh position={position} rotation={[0, (side * Math.PI) / 2, 0]}>
      <planeGeometry args={[3.2, 1.8, 12, 6]} />
      <meshBasicMaterial ref={mat} color={color} wireframe transparent opacity={0.35} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}
