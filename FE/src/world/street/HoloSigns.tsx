// โฮโลแกรมลอยหน้าผนังชั้นล่าง: แผ่นโปร่งแสงชิ้นเดียวแบบ instanced (1 draw call)
// ลายในเชดเดอร์ล้วน: ขอบเรือง เส้นสแกนไหลขึ้น และไอคอนนามธรรม/แท่งกราฟจาง ๆ (ไม่มีตัวอักษร ไม่มีหน้าคน)

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { KitItem } from "./kitLayout";
import { NEON } from "./kitMeshes";
import { BRAND } from "../../config/theme";

const holoVertex = /* glsl */ `
attribute float aSeed;
varying vec2 vUv;
varying vec3 vColor;
varying float vSeed;
void main() {
  vUv = uv;
  vColor = instanceColor;
  vSeed = aSeed;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;

const holoFragment = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying vec3 vColor;
varying float vSeed;
void main() {
  vec2 uv = vUv;
  // ขอบเรือง
  float edge = max(smoothstep(0.06, 0.0, min(uv.x, 1.0 - uv.x)), smoothstep(0.08, 0.0, min(uv.y, 1.0 - uv.y)));
  // เส้นสแกนไหลขึ้น
  float scan = 0.5 + 0.5 * sin((uv.y - uTime * 0.35) * 90.0);
  float band = smoothstep(0.9, 1.0, fract(uv.y * 1.5 - uTime * 0.25 + vSeed));
  // ไอคอนนามธรรม: วงแหวนหมุน (ครึ่งซ้าย) + แท่งกราฟขึ้นลง (ครึ่งขวา)
  vec2 c = uv - vec2(0.28, 0.5);
  float ring = smoothstep(0.03, 0.0, abs(length(c) - 0.2)) * step(0.5, fract(atan(c.y, c.x) / 6.2832 + uTime * 0.2 + vSeed));
  float bx = (uv.x - 0.55) / 0.38;
  float bars = 0.0;
  if (bx > 0.0 && bx < 1.0) {
    float i = floor(bx * 6.0);
    float h = 0.25 + 0.5 * (0.5 + 0.5 * sin(uTime * (1.2 + mod(i, 3.0) * 0.5) + i * 1.7 + vSeed * 6.0));
    bars = step(0.2, fract(bx * 6.0)) * step(0.2, uv.y) * step(uv.y, 0.2 + h * 0.6);
  }
  float a = edge * 0.85 + (ring + bars) * 0.45 + scan * 0.08 + band * 0.18;
  gl_FragColor = vec4(vColor * (0.6 + edge + ring + bars), clamp(a, 0.0, 0.9));
}`;

const tmp = new THREE.Object3D();
const TINTS = [BRAND.purple, BRAND.magenta, NEON[1], NEON[3]];

/** โฮโลแกรมทั้งหมดของถนนที่วาดอยู่ — โหมดต่ำไม่วาด (ผู้เรียกตัดเอง) */
export function HoloSigns({ items }: { items: KitItem[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: holoVertex,
        fragmentShader: holoFragment,
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(new Float32Array(items.map((_, i) => ((i * 0.618) % 1))), 1));
    return g;
  }, [items]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const col = new THREE.Color();
    items.forEach((it, i) => {
      tmp.position.set(...it.position);
      tmp.rotation.set(0, it.rotationY, 0);
      tmp.scale.set(it.size[0], it.size[1], 1);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      // ความสว่างต่ำกว่าป้ายนีออน (นีออน > จอ > หน้าต่าง)
      m.setColorAt(i, col.set(TINTS[it.variant % TINTS.length]).multiplyScalar(0.9));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [items]);
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });
  if (items.length === 0) return null;
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, items.length]} frustumCulled={false}>
      <primitive object={material} attach="material" />
    </instancedMesh>
  );
}
