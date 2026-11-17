// ชิ้นส่วนฉากที่ใช้ซ้ำหลายพื้นที่

import { useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";

/** วงแหวนลอยที่หมุนช้า ๆ */
export function SpinningRing({
  radius,
  color,
  speed = 0.2,
  tube = 0.03,
  opacity = 0.8,
  ...group
}: ThreeElements["group"] & { radius: number; color: string; speed?: number; tube?: number; opacity?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * speed;
  });
  return (
    <group {...group}>
      <mesh ref={ref}>
        <torusGeometry args={[radius, tube, 8, 128]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

/** เสาโลหะพร้อมแถบไฟ */
export function NeonPillar({ height, color, ...group }: ThreeElements["group"] & { height: number; color: string }) {
  return (
    <group {...group}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[0.8, height, 0.8]} />
        <meshStandardMaterial color="#0e0a20" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, height / 2, 0.42]}>
        <boxGeometry args={[0.08, height * 0.92, 0.04]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}
