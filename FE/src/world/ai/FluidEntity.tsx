// ร่าง D — Fluid Entity: ก้อนของเหลวดิจิทัลที่ไหลและเปลี่ยนรูปตลอดเวลา

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vWave;
  // ผลรวมคลื่น sin หลายทิศ ให้ผิวไหลแบบไม่ซ้ำ
  float wave(vec3 p, float t) {
    return sin(p.x * 2.1 + t * 1.3) * sin(p.y * 2.7 + t * 0.9) * sin(p.z * 1.9 + t * 1.1)
         + 0.5 * sin(p.x * 4.3 - t * 1.7 + p.z * 3.1)
         + 0.25 * sin(p.y * 6.2 + t * 2.3);
  }
  void main() {
    float w = wave(position, uTime);
    vWave = w;
    vec3 displaced = position + normal * w * uAmp;
    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uGlow;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vWave;
  void main() {
    float f = pow(1.0 - abs(dot(vNormal, vView)), 2.0);
    vec3 col = mix(uColorA, uColorB, clamp(vWave * 0.5 + 0.5, 0.0, 1.0));
    col += f * vec3(0.9, 0.95, 1.0) * 0.8;
    gl_FragColor = vec4(col * uGlow, 0.55 + f * 0.45);
  }
`;

export function FluidEntity({ color, accent, thinking }: { color: string; accent: string; thinking: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uAmp: { value: 0.18 },
          uGlow: { value: 1.1 },
          uColorA: { value: new THREE.Color(color) },
          uColorB: { value: new THREE.Color(accent) },
        },
        transparent: true,
        depthWrite: false,
      }),
    [color, accent],
  );

  useFrame(({ clock }, dt) => {
    const u = material.uniforms;
    u.uTime.value = clock.elapsedTime * (thinking ? 2 : 1);
    u.uAmp.value = THREE.MathUtils.damp(u.uAmp.value, thinking ? 0.32 : 0.18, 3, dt);
    u.uGlow.value = THREE.MathUtils.damp(u.uGlow.value, thinking ? 1.8 : 1.1, 3, dt);
    if (mesh.current) mesh.current.rotation.y += dt * 0.2;
  });

  return (
    <group>
      <mesh ref={mesh} material={material}>
        <icosahedronGeometry args={[1, 24]} />
      </mesh>
      <pointLight color={color} intensity={thinking ? 50 : 25} distance={18} />
    </group>
  );
}
