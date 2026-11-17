// วาดรอยบนพื้นถนน: plane instanced ชุดเดียว (1 draw call) ใช้ atlas 3 ช่อง ฝาท่อ / เส้นเลนจาง / หย่อมกระเบื้อง

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { floorDecals, type DecalKind } from "./floorDecals";

const CELL = 128;
const CELL_OF: Record<DecalKind, number> = { manhole: 0, laneMark: 1, tileTint: 2 };

function decalAtlas(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = CELL * 3;
  c.height = CELL;
  const g = c.getContext("2d")!;
  // ช่อง 0: ฝาท่อกลม มีขอบเหล็กและซี่ตะแกรง
  g.save();
  g.translate(CELL / 2, CELL / 2);
  g.fillStyle = "rgba(8,8,10,0.92)";
  g.beginPath(); g.arc(0, 0, 58, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(120,125,140,0.55)"; g.lineWidth = 4;
  g.beginPath(); g.arc(0, 0, 54, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 3; g.strokeStyle = "rgba(90,95,110,0.6)";
  for (let i = -36; i <= 36; i += 12) {
    const h = Math.sqrt(46 * 46 - i * i);
    g.beginPath(); g.moveTo(i, -h); g.lineTo(i, h); g.stroke();
  }
  g.beginPath(); g.arc(0, 0, 14, 0, Math.PI * 2); g.stroke();
  g.restore();
  // ช่อง 1: เส้นประจางตามแนวตั้ง (แกน y ของ plane = แนวยาว)
  g.fillStyle = "rgba(200,205,215,0.4)";
  for (let y = 6; y < CELL; y += 44) g.fillRect(CELL + 14, y, CELL - 28, 26); // เต็มความกว้างช่อง ≈ 0.14 ม. บน plane กว้าง 0.18 ม.
  // ช่อง 2: หย่อมเฉดกระเบื้อง ขอบนุ่ม
  const gr = g.createRadialGradient(CELL * 2.5, CELL / 2, 4, CELL * 2.5, CELL / 2, 62);
  gr.addColorStop(0, "rgba(0,0,0,0.4)");
  gr.addColorStop(0.7, "rgba(0,0,0,0.22)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.fillRect(CELL * 2, 0, CELL, CELL);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const tmp = new THREE.Object3D();

export function FloorDecals() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const decals = useMemo(() => floorDecals(), []);
  const map = useMemo(() => decalAtlas(), []);
  const geo = useMemo(() => {
    const gm = new THREE.PlaneGeometry(1, 1);
    gm.setAttribute("aCell", new THREE.InstancedBufferAttribute(new Float32Array(decals.map((d) => CELL_OF[d.kind])), 1));
    return gm;
  }, [decals]);
  useLayoutEffect(() => () => { map.dispose(); geo.dispose(); }, [map, geo]);
  // วัสดุสร้างครั้งเดียวใน useMemo และแพตช์ก่อนคอมไพล์ครั้งแรก: เลือกช่อง atlas ต่อ instance ผ่าน attribute aCell
  const material = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    mat.onBeforeCompile = (shader) => {
      const patch = (src: string, anchor: string, to: string) => {
        if (!src.includes(anchor)) {
          const msg = `FloorDecals: ไม่พบ anchor ใน shader: ${anchor}`;
          if (import.meta.env.DEV) throw new Error(msg);
          console.warn(msg);
          return src;
        }
        return src.replace(anchor, to);
      };
      let v = shader.vertexShader;
      v = patch(v, "void main() {", "attribute float aCell;
void main() {");
      v = patch(v, "#include <uv_vertex>", "#include <uv_vertex>
#ifdef USE_MAP
vMapUv.x = (vMapUv.x + aCell) / 3.0;
#endif");
      shader.vertexShader = v;
    };
    mat.customProgramCacheKey = () => "floorDecals";
    return mat;
  }, [map]);
  useLayoutEffect(() => () => material.dispose(), [material]);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    decals.forEach((d, i) => {
      tmp.position.set(...d.position);
      tmp.rotation.set(-Math.PI / 2, d.rotationY, 0, "YXZ");
      tmp.scale.set(d.size[0], d.size[1], 1);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [decals]);
  return (
    // renderOrder 0 ต่ำกว่าแสงย้อยพื้น (SpillMeshes ใช้ 1) จึงวาดรอยก่อน แสงเรืองซ้อนทับทีหลัง
    <instancedMesh ref={mesh} args={[geo, undefined, decals.length]} frustumCulled={false} renderOrder={0}>
      <primitive object={material} attach="material" />
    </instancedMesh>
  );
}
