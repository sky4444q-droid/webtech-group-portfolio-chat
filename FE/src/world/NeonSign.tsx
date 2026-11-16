import { useMemo, useRef } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { signTexture } from "./textures";

type Props = ThreeElements["group"] & {
  text: string;
  color: string;
  /** ความสูงของป้ายในฉาก (หน่วยโลก) */
  height?: number;
  vertical?: boolean;
  /** กะพริบเบา ๆ แบบไฟนีออน */
  flicker?: boolean;
};

export function NeonSign({ text, color, height = 1, vertical = false, flicker = false, ...group }: Props) {
  const { texture, aspect } = useMemo(() => signTexture(text, color, { vertical }), [text, color, vertical]);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const seed = useMemo(() => Math.random() * 100, []);

  useFrame(({ clock }) => {
    if (!flicker || !mat.current) return;
    const t = clock.elapsedTime + seed;
    const off = Math.sin(t * 13) > 0.97 || Math.sin(t * 2.1) > 0.995;
    mat.current.opacity = off ? 0.25 : 1;
  });

  return (
    <group {...group}>
      <mesh>
        <planeGeometry args={[height * aspect, height]} />
        <meshBasicMaterial
          ref={mat}
          map={texture}
          transparent
          depthWrite={false}
          toneMapped={false}
          color={[1.6, 1.6, 1.6]}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
