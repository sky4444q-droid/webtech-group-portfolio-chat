// จอใหญ่จุดเด่น: แสงใต้น้ำ (caustic) สีฟ้า-เขียวน้ำทะเล สว่างที่สุดในเฟรม
// จอสำคัญ (key) มีโลโก้ NEXORA และป้ายบอกทางตามภาษาที่เลือก

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { DistrictId } from "../../types";
import { useWorld } from "../../store/useWorld";
import { fxEnabled } from "../fx/fxEnabled";
import { signTexture } from "../textures";
import { wayfindingLabel } from "./wayfinding";
import type { KitItem } from "./kitLayout";

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragment = /* glsl */ `
uniform float uTime;
uniform float uSeed;
varying vec2 vUv;
// ลายแสงใต้น้ำ: บิดพิกัดด้วยคลื่น sin ซ้อนกันแล้วดึงเส้นสว่างบาง ๆ ออกมา
float water(vec2 q, float t) {
  for (int n = 1; n < 6; n++) {
    float fn = float(n);
    q += vec2(0.7 / fn * sin(fn * q.y + t * 0.6 + 0.3 * fn) + 0.8, 0.5 / fn * sin(fn * q.x + t * 0.5 + 0.3 * fn) - 0.8);
  }
  return pow(0.5 + 0.5 * sin(q.x + q.y), 9.0);
}
void main() {
  vec2 q = vUv * vec2(9.0, 5.6) + uSeed;
  float c = water(q, uTime) * 0.75 + water(q * 1.7 + 3.0, uTime * 1.3) * 0.35;
  vec3 deep = vec3(0.0, 0.07, 0.13) + vec3(0.0, 0.1, 0.12) * (1.0 - vUv.y);
  vec3 col = deep + vec3(0.4, 1.0, 1.0) * c;
  // ขอบจอเรืองแสง
  float edge = smoothstep(0.0, 0.02, vUv.x) * smoothstep(0.0, 0.02, 1.0 - vUv.x) * smoothstep(0.0, 0.03, vUv.y) * smoothstep(0.0, 0.03, 1.0 - vUv.y);
  gl_FragColor = vec4(col * 1.25 * edge + vec3(0.2, 0.9, 1.0) * (1.0 - edge) * 1.5, 1.0);
}`;

export function WaterScreen({ item, keyTarget }: { item: KitItem; keyTarget?: DistrictId }) {
  const uniforms = useMemo(() => ({ uTime: { value: 7 + item.variant * 3.1 }, uSeed: { value: item.variant * 1.37 } }), [item.variant]);
  const frozen = useWorld((s) => !fxEnabled(s.quality).screensAnimated);
  useFrame((_, dt) => {
    if (!frozen) uniforms.uTime.value += Math.min(dt, 0.1);
  });
  const [w, h] = item.size;
  return (
    <group position={item.position} rotation={[0, item.rotationY, 0]}>
      <mesh position={[0, 0, item.size[2] / 2 + 0.02]}>
        <planeGeometry args={[w, h]} />
        <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} toneMapped={false} />
      </mesh>
      <mesh>
        <boxGeometry args={[w + 0.3, h + 0.3, item.size[2]]} />
        <meshStandardMaterial color="#05060a" metalness={0.6} roughness={0.4} />
      </mesh>
      {keyTarget && <KeyOverlay target={keyTarget} w={w} h={h} z={item.size[2] / 2 + 0.05} />}
    </group>
  );
}

function KeyOverlay({ target, w, h, z }: { target: DistrictId; w: number; h: number; z: number }) {
  const emblem = useTexture("/images/nexora-emblem.png");
  const lang = useWorld((s) => s.lang);
  const label = useMemo(() => signTexture(wayfindingLabel(target, lang), "#ffffff", { size: 80 }), [target, lang]);
  const blink = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (blink.current) blink.current.opacity = 0.8 + Math.sin(clock.elapsedTime * 3) * 0.2;
  });
  const lh = h * 0.24;
  const lw = Math.min(w * 0.9, lh * label.aspect);
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, h * 0.12, 0]}>
        <planeGeometry args={[h * 0.55, h * 0.55]} />
        <meshBasicMaterial map={emblem} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh position={[0, -h * 0.32, 0.01]}>
        <planeGeometry args={[lw, lw / label.aspect]} />
        <meshBasicMaterial ref={blink} map={label.texture} transparent toneMapped={false} depthWrite={false} color={[1.6, 1.6, 1.6]} />
      </mesh>
    </group>
  );
}
