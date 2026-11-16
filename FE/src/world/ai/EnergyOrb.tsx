// ร่าง A — Energy Orb: แกนพลังงานเรืองแสง เปลือกโปร่ง และอนุภาคหมุนวน

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fresnelMaterialProps } from "./fresnel";

export function EnergyOrb({ color, thinking }: { color: string; thinking: boolean }) {
  const core = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  const orbit = useRef<THREE.Points>(null);
  const shellMat = useMemo(() => new THREE.ShaderMaterial(fresnelMaterialProps(color)), [color]);

  const positions = useMemo(() => {
    const n = 220;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 1.4 + Math.random() * 0.9;
      const a = Math.random() * Math.PI * 2;
      const tilt = (Math.random() - 0.5) * 0.9;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = Math.sin(a) * r * tilt;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const speed = thinking ? 7 : 2;
    const pulse = 1 + Math.sin(t * speed) * (thinking ? 0.12 : 0.05);
    core.current?.scale.setScalar(pulse * 0.55);
    if (shell.current) shell.current.scale.setScalar(1 + Math.sin(t * speed * 0.5) * 0.03);
    shellMat.uniforms.uIntensity.value = THREE.MathUtils.damp(shellMat.uniforms.uIntensity.value, thinking ? 2.2 : 1.2, 4, dt);
    shellMat.uniforms.uTime.value = t;
    if (orbit.current) orbit.current.rotation.y += dt * (thinking ? 2.2 : 0.6);
  });

  return (
    <group>
      <mesh ref={core}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.6)} toneMapped={false} />
      </mesh>
      <mesh ref={shell} material={shellMat}>
        <sphereGeometry args={[1.05, 48, 48]} />
      </mesh>
      <points ref={orbit}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={color} size={0.06} transparent opacity={0.9} toneMapped={false} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <pointLight color={color} intensity={thinking ? 40 : 18} distance={14} />
    </group>
  );
}
