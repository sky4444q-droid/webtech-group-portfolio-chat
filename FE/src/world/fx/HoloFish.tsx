// ปลาโฮโลแกรม 8 ตัว ว่ายวนช้า ๆ ระหว่างตึก — instanced mesh เดียว แผ่นริบบอน 16 ช่อง
// vertex shader ดัดตัวปลาเป็นคลื่น (แรงขึ้นทางหาง) / fragment shader แบบบวกแสง มีเส้นสแกนและขอบเรือง

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BRAND } from "../../config/brand";
import { fishAt, fishPaths } from "./fishPaths";

const SEGMENTS = 16;

const vertex = /* glsl */ `
  uniform float uTime;
  attribute float aSeed;
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    vUv = uv;
    vSeed = aSeed;
    vec3 p = position;
    // x ท้องถิ่น: -0.5 = หาง, 0.5 = หัว
    float tail = 0.5 - p.x;
    // ตัวเรียวรูปปลา: กว้างสุดช่วงอก หัวมน หางแคบแล้วบานเป็นครีบ
    float body = sin(clamp(uv.x * 1.15, 0.0, 1.0) * 3.14159) * 0.85 + smoothstep(0.12, 0.0, uv.x) * 0.9;
    p.y *= body;
    float t = uTime + aSeed * 6.2831;
    p.z += sin(p.x * 3.0 * 3.14159 - t * 4.0) * 0.12 * tail * tail;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uMagenta;
  uniform vec3 uPurple;
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    // ขอบเรือง: สว่างที่ขอบบน/ล่างของริบบอน
    float edge = pow(abs(vUv.y - 0.5) * 2.0, 3.0) * 2.2; // เกิน 1 ให้ bloom จับได้
    float scan = 0.55 + 0.45 * sin(vUv.y * 60.0 - uTime * 6.0);
    float flicker = 0.85 + 0.15 * sin(uTime * 13.0 + vSeed * 40.0);
    vec3 col = mix(uMagenta, uPurple, vUv.x);
    float a = (0.4 * scan + edge * 0.9) * flicker * smoothstep(0.0, 0.08, vUv.x);
    gl_FragColor = vec4(col * a, 1.0);
  }
`;

export function HoloFish() {
  const paths = useMemo(() => fishPaths(1), []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 0.32, SEGMENTS, 1);
    const seeds = new Float32Array(paths.length);
    for (let i = 0; i < seeds.length; i++) seeds[i] = i / seeds.length;
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
    return g;
  }, [paths]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          uTime: { value: 0 },
          uMagenta: { value: new THREE.Color(BRAND.magenta) },
          uPurple: { value: new THREE.Color(BRAND.purple) },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useLayoutEffect(() => () => (geometry.dispose(), material.dispose()), [geometry, material]);

  // ของใช้ซ้ำทุกเฟรม (ไม่สร้างใหม่)
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), at: { position: [0, 0, 0] as [number, number, number], heading: 0 } }),
    [],
  );

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    material.uniforms.uTime.value = t;
    for (let i = 0; i < paths.length; i++) {
      const f = fishAt(paths[i], t, tmp.at);
      tmp.p.set(f.position[0], f.position[1], f.position[2]);
      tmp.q.setFromAxisAngle(tmp.up, f.heading);
      tmp.s.setScalar(paths[i].length);
      m.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s));
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, paths.length]} frustumCulled={false} />;
}
