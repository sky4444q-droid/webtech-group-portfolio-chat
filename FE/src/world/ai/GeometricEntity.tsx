// ร่าง C — Geometric Entity: รูปทรงเรขาคณิตซ้อนกัน วงแหวนหมุน และชิ้นส่วนที่ประกอบตัวเอง

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AiMood } from "../../store/useAi";
import { MOOD_STYLE, talkPulse } from "./moodStyle";

const SHARDS = 18;

export function GeometricEntity({ color, mood }: { color: string; mood: AiMood }) {
  const st = MOOD_STYLE[mood];
  const innerMat = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const base = useMemo(() => new THREE.Color(color), [color]);
  const tmp = useMemo(() => new THREE.Color(), []);
  const outer = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const rings = useRef<THREE.Group>(null);
  const shards = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // ตำแหน่ง "ประกอบแล้ว" (บนผิวทรงกลม) และ "กระจาย"
  const layout = useMemo(
    () =>
      Array.from({ length: SHARDS }, (_, i) => {
        const phi = Math.acos(1 - (2 * (i + 0.5)) / SHARDS);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const home = new THREE.Vector3().setFromSphericalCoords(1.25, phi, theta);
        const away = home.clone().multiplyScalar(2.2 + Math.random());
        return { home, away, spin: Math.random() * Math.PI };
      }),
    [],
  );

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const speed = st.speed;
    if (outer.current) {
      outer.current.rotation.x += dt * 0.3 * speed;
      outer.current.rotation.y += dt * 0.45 * speed;
    }
    if (inner.current) {
      inner.current.rotation.y -= dt * 0.8 * speed;
      inner.current.scale.setScalar(0.55 + Math.sin(t * 3 * speed) * 0.05 + talkPulse(t) * 0.1 * st.talk);
    }
    if (rings.current) {
      rings.current.children.forEach((r, i) => {
        r.rotation.x += dt * (0.4 + i * 0.25) * speed;
        r.rotation.y += dt * (0.2 + i * 0.15) * speed;
      });
    }
    if (shards.current) {
      // วงจรประกอบตัว: กระจาย → ประกอบ ทุก ~6 วินาที (เร็วขึ้นตอนคิด)
      const k = (Math.sin(t * 0.9 * speed) + 1) / 2;
      // คิด = แตกตัวกระจายมากขึ้น, ฟัง = ประกอบแน่น
      const assemble = st.inflow ? 1 : THREE.MathUtils.smoothstep(k, 0.15, 0.85) / Math.max(1, st.amp * 0.8);
      layout.forEach((s, i) => {
        dummy.position.lerpVectors(s.away, s.home, assemble);
        dummy.rotation.set(s.spin + t, s.spin * 2 + t * 0.7, 0);
        dummy.scale.setScalar(0.16);
        dummy.updateMatrix();
        shards.current!.setMatrixAt(i, dummy.matrix);
      });
      shards.current.instanceMatrix.needsUpdate = true;
    }
    if (innerMat.current) {
      tmp.copy(base);
      if (st.tint) tmp.lerp(new THREE.Color(st.tint), 0.7);
      innerMat.current.emissive.lerp(tmp, Math.min(1, dt * 5));
      innerMat.current.emissiveIntensity = THREE.MathUtils.damp(innerMat.current.emissiveIntensity, 1.6 * st.glow, 4, dt);
    }
    if (light.current) light.current.intensity = THREE.MathUtils.damp(light.current.intensity, 18 * st.glow, 4, dt);
  });

  return (
    <group>
      <mesh ref={outer}>
        <icosahedronGeometry args={[1.1, 0]} />
        <meshBasicMaterial color={color} wireframe toneMapped={false} />
      </mesh>
      <mesh ref={inner}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial ref={innerMat} color={color} emissive={color} emissiveIntensity={1.6} toneMapped={false} flatShading />
      </mesh>
      <group ref={rings}>
        {[1.7, 2.05, 2.4].map((r) => (
          <mesh key={r}>
            <torusGeometry args={[r, 0.02, 8, 96]} />
            <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.7} />
          </mesh>
        ))}
      </group>
      <instancedMesh ref={shards} args={[undefined, undefined, SHARDS]}>
        <tetrahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <pointLight ref={light} color={color} intensity={18} distance={14} />
    </group>
  );
}
