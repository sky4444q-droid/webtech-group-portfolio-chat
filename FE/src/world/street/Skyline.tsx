// วงแหวนตึกไกลรอบเมือง: กล่อง instanced ชุดเดียว ใช้ผนังหน้าต่างแบบเดียวกับตึกในถนน (โหมดต่ำ: สีเข้มเรียบ ไม่ยืด texture)

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useWorld } from "../../store/useWorld";
import { fxEnabled } from "../fx/fxEnabled";
import { curtainWallTexture, patchWindowUv } from "./windowMaterial";
import { layoutSkyline, skylineStrips } from "./skylineLayout";
import { NEON } from "./kitMeshes";
import { BRAND } from "../../config/theme";

const SKYLINE_SEED = 2026;
const tmp = new THREE.Object3D();
// แถบจอ: ยื่นออกจากผนัง 0.05 ม. (ห้ามชิดระนาบเดียวกับผนัง ≥ 0.02)
const STRIP_OFFSET = 0.05;
const STRIP_COLORS = [...NEON, BRAND.purple, BRAND.magenta];
// มุมหมุนของแต่ละผนังรอบแกน y (ระนาบมองไปทาง +z): +z, −z, +x, −x
const FACE_ROT = [0, Math.PI, Math.PI / 2, -Math.PI / 2];

export function Skyline() {
  const quality = useWorld((s) => s.quality);
  const detail = fxEnabled(quality).skylineDetail;
  const towers = useMemo(() => layoutSkyline(SKYLINE_SEED), []);
  const windows = useMemo(() => curtainWallTexture(), []);
  const mesh = useRef<THREE.InstancedMesh>(null);

  // แพตช์ก่อน compile ครั้งแรก · ไม่มี normal map และไม่รับแสงสะท้อน env · หน้าต่างสว่างพอทะลุหมอก
  const mat = useMemo(() => {
    if (!detail) return new THREE.MeshBasicMaterial({ color: "#1a1626" });
    const m = new THREE.MeshStandardMaterial({ color: "#0c0a16", roughness: 0.9, metalness: 0.2, envMapIntensity: 0, emissive: new THREE.Color("#ffffff"), emissiveMap: windows, emissiveIntensity: 0.5 });
    patchWindowUv(m, { animate: false });
    return m;
  }, [detail, windows]);
  useEffect(() => () => mat.dispose(), [mat]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    towers.forEach((t, i) => {
      tmp.position.set(...t.position);
      tmp.scale.set(...t.size);
      // หันด้านกว้างเข้าหาเมือง
      tmp.rotation.set(0, -Math.atan2(t.position[2], t.position[0]), 0);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [towers, mat]);

  return (
    <>
      <instancedMesh key={detail ? "hi" : "lo"} ref={mesh} args={[undefined, undefined, towers.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <primitive object={mat} attach="material" />
      </instancedMesh>
      {detail && <SkyStrips towers={towers} />}
    </>
  );
}

/** แถบจอไฟแนวตั้ง/แนวนอนบนผนังตึกไกล — instanced ชุดเดียว (1 draw call) เฉพาะโหมดสูง */
function SkyStrips({ towers }: { towers: ReturnType<typeof layoutSkyline> }) {
  const strips = useMemo(() => skylineStrips(towers, SKYLINE_SEED), [towers]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", side: THREE.DoubleSide }), []);
  useEffect(() => () => mat.dispose(), [mat]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const base = new THREE.Matrix4();
    const local = new THREE.Matrix4();
    const col = new THREE.Color();
    strips.forEach((s, i) => {
      const t = towers[s.tower];
      tmp.position.set(...t.position);
      tmp.scale.set(1, 1, 1);
      tmp.rotation.set(0, -Math.atan2(t.position[2], t.position[0]), 0);
      tmp.updateMatrix();
      base.copy(tmp.matrix);
      // ตำแหน่งในพิกัดตึก (ขนาดจริง ไม่ผ่าน scale ของตึก)
      const half = [t.size[0] / 2, t.size[2] / 2];
      const yc = s.y + s.height / 2 - t.size[1] / 2;
      const d = (s.face < 2 ? half[1] : half[0]) + STRIP_OFFSET;
      const sign = s.face % 2 === 0 ? 1 : -1;
      tmp.position.set(s.face < 2 ? 0 : sign * d, yc, s.face < 2 ? sign * d : 0);
      tmp.rotation.set(0, FACE_ROT[s.face], 0);
      tmp.scale.set(s.width, s.height, 1);
      tmp.updateMatrix();
      local.copy(tmp.matrix);
      m.setMatrixAt(i, base.clone().multiply(local));
      m.setColorAt(i, col.set(STRIP_COLORS[s.variant % STRIP_COLORS.length]));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [strips, towers]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, strips.length]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <primitive object={mat} attach="material" />
    </instancedMesh>
  );
}
