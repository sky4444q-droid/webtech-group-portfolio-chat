// วาดชิ้นส่วนเมืองชนิดเดียวกันทั้งหมดเป็น InstancedMesh เดียว (ประหยัด draw call)

import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { KitItem } from "./kitLayout";
import { useWorld } from "../../store/useWorld";
import { screenInterval } from "./screenPolicy";
import { SCREEN_H, SCREEN_PROGRAMS, SCREEN_W } from "./screenPrograms";

/** สีนีออนของป้าย/จอ ตาม variant */
export const NEON = ["#ff2a6d", "#05d9e8", "#b967ff", "#ff1f3d", "#e9e6ff", "#2d6bff", "#ffb347", "#ff5ec8"];

export function neonColor(variant: number, intensity = 1): THREE.Color {
  return new THREE.Color(NEON[variant % NEON.length]).multiplyScalar(intensity);
}

const tmp = new THREE.Object3D();

interface Props {
  items: KitItem[];
  /** สีต่อชิ้น (ไม่ใส่ = ใช้สีของ material) */
  color?: (item: KitItem) => THREE.Color;
  children: ReactNode;
  geometry?: ReactNode;
}

export function KitInstances({ items, color, children, geometry }: Props) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    items.forEach((it, i) => {
      tmp.position.set(...it.position);
      tmp.rotation.set(0, it.rotationY, 0);
      tmp.scale.set(...it.size);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      if (color) m.setColorAt(i, color(it));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items, color]);
  if (items.length === 0) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, items.length]} frustumCulled={false}>
      {geometry ?? <boxGeometry />}
      {children}
    </instancedMesh>
  );
}

// ---------- ป้ายตัวอักษร (texture atlas) ----------

const signVertex = /* glsl */ `
attribute vec4 aRect;
attribute float aFlick;
uniform float uTime;
uniform float uFlicker;
varying vec2 vUv;
varying vec3 vColor;
varying float vOn;
void main() {
  vUv = aRect.xy + uv * aRect.zw;
  vColor = instanceColor;
  // ป้ายที่กะพริบ: ดับสั้น ๆ แบบสุ่มตามจังหวะ
  float on = 1.0;
  if (aFlick > 0.0 && uFlicker > 0.5) {
    float tick = floor(uTime * 9.0 + aFlick * 31.0);
    on = step(0.14, fract(sin(tick * 12.9898 + aFlick * 78.233) * 43758.5453));
    on = mix(0.18, 1.0, on);
  }
  vOn = on;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;

const signFragment = /* glsl */ `
uniform sampler2D uMap;
varying vec2 vUv;
varying vec3 vColor;
varying float vOn;
void main() {
  vec4 t = texture2D(uMap, vUv);
  // แกนตัวอักษรขาวเกือบสุด ขอบเรืองเป็นสีป้าย
  vec3 col = mix(vColor, vec3(1.0) + vColor * 0.4, smoothstep(0.75, 1.0, t.a));
  gl_FragColor = vec4(col * vOn, t.a);
}`;

export interface SignFace {
  item: KitItem;
  uv: [number, number, number, number];
  flicker: boolean;
}

/** หน้าป้ายตัวอักษรของหน้า atlas หนึ่งหน้า วางหน้ากล่องป้าย (ด้าน +z) */
export function SignFaces({ faces, map, color, flicker }: { faces: SignFace[]; map: THREE.Texture; color: (item: KitItem) => THREE.Color; flicker: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: signVertex,
        fragmentShader: signFragment,
        uniforms: { uMap: { value: map }, uTime: { value: 0 }, uFlicker: { value: 1 } },
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [map],
  );
  useEffect(() => () => material.dispose(), [material]);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.translate(0, 0, 0.52); // หน้ากล่องขนาด 1 (กล่องถูกยืดตามขนาดป้าย)
    g.setAttribute("aRect", new THREE.InstancedBufferAttribute(new Float32Array(faces.flatMap((f) => f.uv)), 4));
    g.setAttribute("aFlick", new THREE.InstancedBufferAttribute(new Float32Array(faces.map((f, i) => (f.flicker ? 1 + (i % 7) : 0))), 1));
    return g;
  }, [faces]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    faces.forEach((f, i) => {
      tmp.position.set(...f.item.position);
      tmp.rotation.set(0, f.item.rotationY, 0);
      tmp.scale.set(f.item.size[0] * 0.9, f.item.size[1] * 0.86, f.item.size[2]);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      m.setColorAt(i, color(f.item));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [faces, color]);
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uFlicker.value = flicker ? 1 : 0;
  });
  if (faces.length === 0) return null;
  return <instancedMesh ref={mesh} args={[geometry, material, faces.length]} frustumCulled={false} />;
}

// ---------- จอโฆษณา (canvas วาดตามจังหวะ) ----------

/** จอโฆษณาโปรแกรมเดียวกันใช้ texture ร่วมกัน วาดใหม่ตาม screenInterval ของจอที่ใกล้กล้องที่สุด */
export function ScreenGroup({ items, program, seed }: { items: KitItem[]; program: number; seed: number }) {
  const quality = useWorld((s) => s.quality);
  const { canvas, texture } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = SCREEN_W;
    c.height = SCREEN_H;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, texture: tex };
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const last = useRef(-Infinity);
  const p = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, clock }) => {
    const now = clock.elapsedTime * 1000;
    let near = Infinity;
    for (const it of items) near = Math.min(near, camera.position.distanceTo(p.set(...it.position)));
    const interval = screenInterval(near, quality);
    const first = last.current === -Infinity;
    if (!first && (interval === null || now - last.current < interval)) return;
    last.current = now;
    SCREEN_PROGRAMS[program](canvas.getContext("2d")!, clock.elapsedTime, seed);
    texture.needsUpdate = true;
  });
  return (
    <KitInstances items={items}>
      <meshBasicMaterial map={texture} toneMapped={false} color={[1.5, 1.5, 1.5]} />
    </KitInstances>
  );
}
