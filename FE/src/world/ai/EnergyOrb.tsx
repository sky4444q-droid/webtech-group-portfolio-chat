// ร่าง A — Energy Orb: แกนพลังงานเรืองแสง เปลือกโปร่ง และอนุภาคหมุนวน

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fresnelMaterialProps } from "./fresnel";
import type { AiMood } from "../../store/useAi";
import { MOOD_STYLE, talkPulse } from "./moodStyle";

export function EnergyOrb({ color, mood }: { color: string; mood: AiMood }) {
  const st = MOOD_STYLE[mood];
  const light = useRef<THREE.PointLight>(null);
  const coreMat = useRef<THREE.MeshBasicMaterial>(null);
  const base = useMemo(() => new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.6), [color]);
  const tmp = useMemo(() => new THREE.Color(), []);
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
    const speed = 2 * st.speed;
    const pulse = 1 + Math.sin(t * speed) * 0.05 * st.amp + talkPulse(t) * 0.12 * st.talk;
    core.current?.scale.setScalar(pulse * 0.55);
    if (shell.current) shell.current.scale.setScalar(1 + Math.sin(t * speed * 0.5) * 0.03 * st.amp);
    shellMat.uniforms.uIntensity.value = THREE.MathUtils.damp(shellMat.uniforms.uIntensity.value, 1.2 * st.glow, 4, dt);
    shellMat.uniforms.uTime.value = t;
    if (coreMat.current) {
      tmp.copy(base);
      if (st.tint) tmp.lerp(new THREE.Color(st.tint), 0.7);
      coreMat.current.color.lerp(tmp, Math.min(1, dt * 5));
    }
    if (light.current) light.current.intensity = THREE.MathUtils.damp(light.current.intensity, 18 * st.glow, 4, dt);
    if (orbit.current) {
      orbit.current.rotation.y += dt * 0.6 * st.speed;
      // ฟัง: อนุภาคหดเข้าหาตัว
      orbit.current.scale.setScalar(THREE.MathUtils.damp(orbit.current.scale.x, 1 - st.inflow * 0.35, 3, dt));
    }
  });

  return (
    <group>
      <mesh ref={core}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial ref={coreMat} color={base} toneMapped={false} />
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
      <pointLight ref={light} color={color} intensity={18} distance={14} />
    </group>
  );
}
