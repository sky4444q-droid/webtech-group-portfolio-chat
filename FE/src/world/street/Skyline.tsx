// วงแหวนตึกไกลรอบเมือง: กล่อง instanced ชุดเดียว ใช้ผนังหน้าต่างแบบเดียวกับตึกในถนน (โหมดต่ำ: สีเข้มเรียบ ไม่ยืด texture)

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useWorld } from "../../store/useWorld";
import { fxEnabled } from "../fx/fxEnabled";
import { curtainWallTexture, patchWindowUv } from "./windowMaterial";
import { layoutSkyline } from "./skylineLayout";

const SKYLINE_SEED = 2026;
const tmp = new THREE.Object3D();

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
    <instancedMesh key={detail ? "hi" : "lo"} ref={mesh} args={[undefined, undefined, towers.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <primitive object={mat} attach="material" />
    </instancedMesh>
  );
}
