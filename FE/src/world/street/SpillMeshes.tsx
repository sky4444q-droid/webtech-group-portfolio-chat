// วาดแสงย้อยจากป้าย: plane additive แบบ instanced หนึ่งชุดต่อชนิด (พื้น/ผนัง) ใช้ texture ไล่ระดับวงรี

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { neonColor } from "./kitMeshes";
import type { Spill } from "./lightSpill";

/** alpha ไล่ระดับ: พื้นเข้มที่ขอบตึก (ขอบบนของ canvas) จางลงไปทางถนน · ผนังเข้มตรงกลาง */
function gradientTexture(kind: Spill["kind"]): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const floor = kind === "floor";
  g.save();
  // พื้น: จุดศูนย์กลางอยู่ขอบบน (ฝั่งตึก) ยืดตามยาวเป็นวงรี · ผนัง: วงกลมกลาง canvas
  g.translate(64, floor ? 0 : 64);
  if (floor) g.scale(1, 2);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(-64, floor ? 0 : -64, 128, 128);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const tmp = new THREE.Object3D();

function SpillSet({ spills, kind }: { spills: Spill[]; kind: Spill["kind"] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const map = useMemo(() => gradientTexture(kind), [kind]);
  useLayoutEffect(() => () => map.dispose(), [map]);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    spills.forEach((s, i) => {
      tmp.position.set(...s.position);
      // พื้น: นอนราบ (หมุน X ก่อนแล้วค่อยหมุนรอบ y) · ผนัง: ตั้งหันออกหาถนน
      tmp.rotation.set(kind === "floor" ? -Math.PI / 2 : 0, s.rotationY, 0, "YXZ");
      tmp.scale.set(s.size[0], s.size[1], 1);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      m.setColorAt(i, neonColor(s.variant, s.strength * (kind === "floor" ? 0.9 : 0.6)));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [spills, kind]);
  if (spills.length === 0) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, spills.length]} frustumCulled={false} renderOrder={1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={map} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

export function LightSpill({ spills }: { spills: Spill[] }) {
  const floor = useMemo(() => spills.filter((s) => s.kind === "floor"), [spills]);
  const wall = useMemo(() => spills.filter((s) => s.kind === "wall"), [spills]);
  return (
    <group>
      <SpillSet spills={floor} kind="floor" />
      <SpillSet spills={wall} kind="wall" />
    </group>
  );
}
