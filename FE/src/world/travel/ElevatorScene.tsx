// ฉากลิฟต์กระจก (วางแยกไว้นอกเมือง) — เล่นตอนเดินทางไป Team HQ: ประตูปิด → ลิฟต์ขึ้น เห็นแสงเมืองวิ่งผ่าน → ประตูเปิด

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "../../config/theme";
import type { Vec3 } from "../../config/districts";

/** ที่ตั้งฉากลิฟต์ — ไกลจากทุกพื้นที่ */
export const ELEVATOR_ORIGIN: Vec3 = [260, 0, 260];
/** ความสูงที่ลิฟต์ขึ้นไป */
export const ELEVATOR_RISE = 60;

/** ตำแหน่งกล้องในตู้ลิฟต์ (ตาม progress 0..1 ของช่วงลิฟต์วิ่ง) */
export function elevatorCamera(k: number, out: THREE.Vector3, look: THREE.Vector3): void {
  const y = 1.7 + ELEVATOR_RISE * k;
  out.set(ELEVATOR_ORIGIN[0], y, ELEVATOR_ORIGIN[2] + 1.2);
  look.set(ELEVATOR_ORIGIN[0], y + 0.1, ELEVATOR_ORIGIN[2] + 10);
}

const STRIPS = 46;

/** ประตูลิฟต์: 0 = ปิด, 1 = เปิด (กล้องเป็นผู้ตั้งค่า) */
export const elevatorDoors = { current: 1 };

export function ElevatorScene() {
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const cabin = useRef<THREE.Group>(null);

  // แถบไฟของเมืองข้างนอกตามความสูงของปล่องลิฟต์
  const strips = useMemo(
    () =>
      Array.from({ length: STRIPS }, (_, i) => ({
        y: (i / STRIPS) * (ELEVATOR_RISE + 10),
        x: (Math.random() - 0.5) * 30,
        z: 9 + Math.random() * 14,
        w: 2 + Math.random() * 7,
        color: [COLORS.pink, COLORS.cyan, COLORS.purple, COLORS.green][i % 4],
      })),
    [],
  );

  useFrame(({ camera }, dt) => {
    // ตู้ลิฟต์ตามกล้อง
    if (cabin.current) cabin.current.position.y = camera.position.y - 1.7;
    const open = elevatorDoors.current; // 0 = ปิด, 1 = เปิด
    for (const [ref, side] of [[left, -1], [right, 1]] as const) {
      if (!ref.current) continue;
      ref.current.position.x = THREE.MathUtils.damp(ref.current.position.x, side * (0.8 + open * 1.5), 6, dt);
    }
  });

  return (
    <group position={ELEVATOR_ORIGIN}>
      {strips.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <boxGeometry args={[s.w, 0.12, 0.12]} />
          <meshBasicMaterial color={s.color} toneMapped={false} />
        </mesh>
      ))}
      <group ref={cabin}>
        {/* พื้น เพดาน ผนังหลัง */}
        <mesh position={[0, 0, 1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.4, 3.4]} />
          <meshStandardMaterial color="#120e26" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 3, 1]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.4, 3.4]} />
          <meshBasicMaterial color={COLORS.green} toneMapped={false} transparent opacity={0.35} />
        </mesh>
        <mesh position={[0, 1.5, -0.7]}>
          <planeGeometry args={[3.4, 3]} />
          <meshStandardMaterial color="#0a0818" />
        </mesh>
        {/* ประตูกระจกด้านหน้า */}
        {[left, right].map((ref, i) => (
          <mesh key={i} ref={ref} position={[(i ? 1 : -1) * 0.8, 1.5, 2.7]}>
            <boxGeometry args={[1.6, 3, 0.05]} />
            <meshStandardMaterial color="#2a4a7a" metalness={0.9} roughness={0.05} transparent opacity={0.3} />
          </mesh>
        ))}
        {[-1.7, 1.7].map((xx) => (
          <mesh key={xx} position={[xx, 1.5, 1]}>
            <boxGeometry args={[0.06, 3, 3.4]} />
            <meshBasicMaterial color={COLORS.green} toneMapped={false} transparent opacity={0.6} />
          </mesh>
        ))}
        <pointLight color={COLORS.green} intensity={8} distance={6} position={[0, 2.6, 1]} />
      </group>
    </group>
  );
}
