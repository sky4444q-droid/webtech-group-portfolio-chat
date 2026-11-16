// วาดชิ้นส่วนเมืองชนิดเดียวกันทั้งหมดเป็น InstancedMesh เดียว (ประหยัด draw call)

import { useLayoutEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { KitItem } from "./kitLayout";

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
