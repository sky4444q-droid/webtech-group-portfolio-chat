// โหมดต่ำ: แสงสะท้อนปลอมบนพื้น — แผ่นไล่สีแบบ additive ยืดจากโคนตึกออกมาที่ถนน ใต้ป้ายและจอสำคัญ
// (แทน MeshReflectorMaterial ที่หนักเกินไปสำหรับเครื่องช้า)

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { KitItem } from "./kitLayout";
import { neonColor } from "./kitMeshes";

let gradient: THREE.Texture | null = null;
/** สว่างที่โคนตึก จางหายไปทางกลางถนน */
function getGradient(): THREE.Texture {
  if (gradient) return gradient;
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.3)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 128);
  gradient = new THREE.CanvasTexture(c);
  return gradient;
}

const tmp = new THREE.Object3D();
const REACH = 5.5;

/** ความยาวริ้วและความสว่างต่อชนิด: จอใหญ่/จอยักษ์ยาวกว่า, ป้ายตั้งที่สูง (ป้ายซ้อน y > 9) ยืดตามความสูงเป็นริ้วยาวเหมือนพื้นเปียกโหมดสูง */
function reachOf(it: KitItem): { reach: number; glow: number } {
  if (it.type === "giantScreen") return { reach: REACH * 1.9, glow: 0.7 };
  if (it.type === "bigScreen") return { reach: REACH * 1.6, glow: 0.9 };
  if (it.type === "signV" && it.position[1] > 9) return { reach: Math.min(REACH * 1.5, REACH + (it.position[1] - 9) * 0.2), glow: 0.45 };
  return { reach: REACH, glow: 0.55 };
}


export function FakeReflections({ items }: { items: KitItem[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const map = useMemo(() => getGradient(), []);
  const geometry = useMemo(() => {
    // แผ่นราบบนพื้น: ขอบสว่างอยู่ที่ตำแหน่งชิ้น (หน้าตึก) แล้วยื่นออกไปทาง +z (หาถนน)
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0.015, 0.5);
    return g;
  }, []);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    items.forEach((it, i) => {
      tmp.position.set(it.position[0], 0, it.position[2]);
      tmp.rotation.set(0, it.rotationY, 0);
      const r = reachOf(it);
      tmp.scale.set(it.size[0] * 0.9, 1, r.reach);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      m.setColorAt(i, neonColor(it.variant, r.glow));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [items]);
  if (items.length === 0) return null;
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, items.length]} frustumCulled={false}>
      <meshBasicMaterial map={map} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </instancedMesh>
  );
}
