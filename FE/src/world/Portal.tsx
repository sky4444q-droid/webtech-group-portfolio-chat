// ประตูนีออนสำหรับเดินทางไปพื้นที่อื่น — คลิกแล้วกล้องจะบินไป

import { useMemo, useRef, useState } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import type { DistrictId } from "../types";
import { DISTRICTS } from "../config/districts";
import { useWorld } from "../store/useWorld";
import { NeonSign } from "./NeonSign";

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// วังวนพลังงานด้านในประตู
const fragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uHover;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float a = atan(p.y, p.x);
    float swirl = sin(a * 5.0 + r * 12.0 - uTime * 3.0) * 0.5 + 0.5;
    float rings = sin(r * 28.0 - uTime * 4.0) * 0.5 + 0.5;
    float edge = smoothstep(1.0, 0.75, r);
    float glow = (swirl * 0.55 + rings * 0.25 + 0.2) * edge * (1.0 - r * 0.45);
    vec3 col = mix(uColor * 0.6, vec3(1.0), pow(1.0 - r, 3.0) * 0.6);
    gl_FragColor = vec4(col * (1.2 + uHover * 0.8), glow * (0.75 + uHover * 0.25));
  }
`;

type Props = ThreeElements["group"] & {
  target: DistrictId;
  radius?: number;
};

export function Portal({ target, radius = 2, ...group }: Props) {
  const cfg = DISTRICTS[target];
  const travelTo = useWorld((s) => s.travelTo);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const ring = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uColor: { value: new THREE.Color(cfg.color) }, uHover: { value: 0 } }),
    [cfg.color],
  );

  useFrame(({ clock }, dt) => {
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uHover.value = THREE.MathUtils.damp(uniforms.uHover.value, hovered ? 1 : 0, 8, dt);
    if (ring.current) {
      ring.current.rotation.z += dt * 0.4;
      const s = 1 + uniforms.uHover.value * 0.08;
      ring.current.scale.setScalar(s);
    }
  });

  return (
    <group {...group}>
      <group position={[0, radius + 0.4, 0]}>
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            travelTo(target);
          }}
        >
          <circleGeometry args={[radius * 0.95, 48]} />
          <shaderMaterial
            vertexShader={vertex}
            fragmentShader={fragment}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh ref={ring}>
          <torusGeometry args={[radius, 0.08, 12, 64]} />
          <meshBasicMaterial color={cfg.color} toneMapped={false} />
        </mesh>
        <mesh>
          <torusGeometry args={[radius + 0.25, 0.025, 8, 64]} />
          <meshBasicMaterial color={cfg.color} toneMapped={false} transparent opacity={0.5} />
        </mesh>
      </group>
      <NeonSign text={cfg.sign} color={cfg.color} height={0.55} position={[0, radius * 2 + 1.2, 0]} />
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.6, radius * 0.9, 48]} />
        <meshBasicMaterial color={cfg.color} toneMapped={false} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}
