// ไอน้ำลอยจากช่องระบายบนถนน ร้านอาหาร และปล่องบนหลังคา
// ก้อนไอทั้งหมดเป็น InstancedMesh เดียว (shader หันหน้าเข้ากล้อง ลอยขึ้น ขยาย จาง) + แผ่นเรืองแสงบนพื้นใต้ช่องระบายอีกหนึ่ง mesh = 2 draw call

import { useLayoutEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { steamSources } from "./steamLayout";

/** จำนวนก้อนไอต่อแหล่ง */
const PUFFS = { vent: 6, kitchen: 6, stack: 5 } as const;
const MAX_INSTANCES = 240;

const puffVertex = /* glsl */ `
  attribute vec3 aSource;
  attribute float aRadius;
  attribute float aHeight;
  attribute vec3 aTint;
  attribute float aPhase;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vTint;
  varying float vAge;
  varying float vSeed;
  #include <fog_pars_vertex>
  void main() {
    // ความเร็วลอย: ปล่องสูงลอยช้ากว่า (รอบละ ~ height/1.1 วินาที)
    float speed = 1.1 / aHeight;
    float age = fract(uTime * speed + aPhase);
    float sway = sin(uTime * 0.7 + aPhase * 6.283) * 0.25 * age * aRadius;
    vec3 center = aSource + vec3(sway, age * aHeight, cos(uTime * 0.5 + aPhase * 9.0) * 0.2 * age * aRadius);
    float size = aRadius * (0.7 + age * 2.0);
    vec4 mvPosition = viewMatrix * vec4(center, 1.0);
    mvPosition.xy += position.xy * size;
    gl_Position = projectionMatrix * mvPosition;
    vUv = uv;
    vTint = aTint;
    vAge = age;
    vSeed = aPhase * 37.0;
    #include <fog_vertex>
  }
`;

const puffFragment = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vTint;
  varying float vAge;
  varying float vSeed;
  #include <fog_pars_fragment>
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;
    float fall = 1.0 - smoothstep(0.35, 1.0, r);
    float n = fbm(c * 3.0 + vec2(vSeed, vSeed * 0.7 - uTime * 0.15));
    // ค่อย ๆ ปรากฏตอนเริ่ม จางหายตอนท้าย
    float life = smoothstep(0.0, 0.15, vAge) * (1.0 - smoothstep(0.55, 1.0, vAge));
    float alpha = fall * smoothstep(0.25, 0.75, n) * life * 0.38;
    if (alpha < 0.003) discard;
    vec3 col = mix(vec3(0.62, 0.66, 0.76), vTint, 0.55);
    gl_FragColor = vec4(col, alpha);
    #include <fog_fragment>
  }
`;

const glowVertex = /* glsl */ `
  attribute vec3 aTint;
  varying vec2 vUv;
  varying vec3 vTint;
  #include <fog_pars_vertex>
  void main() {
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vUv = uv;
    vTint = aTint;
    #include <fog_vertex>
  }
`;

const glowFragment = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vTint;
  #include <fog_pars_fragment>
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float g = pow(max(0.0, 1.0 - r), 2.0) * 0.45;
    vec3 col = vTint * g;
    // บวกแสงแบบ additive: ไกลออกไปให้จางลงตามหมอก (ไม่บวกสีหมอกเข้าไปเอง)
    #ifdef USE_FOG
      col *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function SteamPlumes() {
  const { puffs, glow } = useMemo(() => {
    const src = steamSources();
    const rows: { s: (typeof src)[number]; i: number; n: number }[] = [];
    for (const s of src) {
      const n = PUFFS[s.kind];
      for (let i = 0; i < n; i++) rows.push({ s, i, n });
    }
    const list = rows.slice(0, MAX_INSTANCES);
    const count = list.length;

    // ก้อนไอ: quad 1×1 + attribute ต่อ instance
    const geo = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    geo.index = quad.index;
    geo.setAttribute("position", quad.getAttribute("position"));
    geo.setAttribute("uv", quad.getAttribute("uv"));
    const aSource = new Float32Array(count * 3);
    const aTint = new Float32Array(count * 3);
    const aRadius = new Float32Array(count);
    const aHeight = new Float32Array(count);
    const aPhase = new Float32Array(count);
    const col = new THREE.Color();
    list.forEach(({ s, i, n }, k) => {
      aSource.set(s.position, k * 3);
      col.set(s.tint);
      aTint.set([col.r, col.g, col.b], k * 3);
      aRadius[k] = s.radius;
      aHeight[k] = s.height;
      aPhase[k] = (s.phase + i / n) % 1;
    });
    geo.setAttribute("aSource", new THREE.InstancedBufferAttribute(aSource, 3));
    geo.setAttribute("aTint", new THREE.InstancedBufferAttribute(aTint, 3));
    geo.setAttribute("aRadius", new THREE.InstancedBufferAttribute(aRadius, 1));
    geo.setAttribute("aHeight", new THREE.InstancedBufferAttribute(aHeight, 1));
    geo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(aPhase, 1));
    geo.instanceCount = count;

    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]),
      vertexShader: puffVertex,
      fragmentShader: puffFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      fog: true,
    });
    const puffs = new THREE.Mesh(geo, mat);
    puffs.frustumCulled = false;
    puffs.renderOrder = 2;

    // แผ่นเรืองแสงบนพื้นใต้ช่องระบาย (เล็ก จึงใช้ additive ได้)
    const vents = src.filter((s) => s.kind === "vent");
    const gGeo = new THREE.PlaneGeometry(1, 1);
    gGeo.rotateX(-Math.PI / 2);
    const gTint = new Float32Array(vents.length * 3);
    vents.forEach((v, k) => {
      col.set(v.tint);
      gTint.set([col.r, col.g, col.b], k * 3);
    });
    gGeo.setAttribute("aTint", new THREE.InstancedBufferAttribute(gTint, 3));
    const gMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      vertexShader: glowVertex,
      fragmentShader: glowFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: true,
    });
    const glow = new THREE.InstancedMesh(gGeo, gMat, vents.length);
    const m = new THREE.Matrix4();
    vents.forEach((v, k) => {
      const d = v.radius * 3.2;
      m.makeScale(d, 1, d).setPosition(v.position[0], 0.03, v.position[2]);
      glow.setMatrixAt(k, m);
    });
    glow.instanceMatrix.needsUpdate = true;
    glow.computeBoundingSphere();
    return { puffs, glow };
  }, []);

  useLayoutEffect(
    () => () => {
      puffs.geometry.dispose();
      (puffs.material as THREE.Material).dispose();
      glow.geometry.dispose();
      (glow.material as THREE.Material).dispose();
    },
    [puffs, glow],
  );

  useFrame(({ clock }) => {
    (puffs.material as THREE.ShaderMaterial).uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <>
      <primitive object={puffs} />
      <primitive object={glow} />
    </>
  );
}
