// Arrival Gate — ปลายซอยทางเข้า มีซุ้มประตูเมืองเรืองแสงที่น้องจิ๋วเดินผ่านเข้ามา

import { DISTRICTS } from "../../config/districts";
import { GATE_ARCH } from "../street/streets";
import { AiPresence } from "../ai/AiPresence";
import { NeonPillar } from "./common";

export function GateDistrict() {
  const cfg = DISTRICTS.gate;
  // ซุ้มอยู่ที่ GATE_ARCH (พิกัดโลก) แปลงเป็นพิกัดภายในพื้นที่
  const ax = GATE_ARCH[0] - cfg.position[0];
  const az = GATE_ARCH[2] - cfg.position[2];
  return (
    <group position={cfg.position}>
      <group position={[ax, 0, az]} rotation={[0, Math.PI / 2, 0]}>
        <NeonPillar height={7} color={cfg.color} position={[-3.6, 0, 0]} />
        <NeonPillar height={7} color={cfg.color} position={[3.6, 0, 0]} />
        <mesh position={[0, 7.2, 0]}>
          <boxGeometry args={[8.2, 0.7, 0.9]} />
          <meshStandardMaterial color="#0b0b10" metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh position={[0, 6.75, 0.46]}>
          <boxGeometry args={[7.4, 0.07, 0.04]} />
          <meshBasicMaterial color={cfg.color} toneMapped={false} />
        </mesh>
        <mesh position={[0, 6.75, -0.46]}>
          <boxGeometry args={[7.4, 0.07, 0.04]} />
          <meshBasicMaterial color={cfg.color} toneMapped={false} />
        </mesh>
        <pointLight color={cfg.color} intensity={25} distance={14} position={[0, 5.5, 0]} />
      </group>
      <AiPresence district="gate" size={0.6} position={[-1, 2.6, 1.8]} />
    </group>
  );
}
