// สะพานลอยกลางแยก Nexus: พื้นแผ่นกันลื่น ราวกระจก + เสาทุก 2 ม. + แถบไฟสีแบรนด์ หลังคาโครงบางพร้อมจอยาว และบันไดสองฝั่ง
// พิกัดในกลุ่ม: ผิวพื้นสะพาน y = 0 · แนวกลางสะพาน z = 0

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BRIDGE, STAIR_RUN, STAIR_WIDTH, STAIR_X } from "../../config/bridge";
import { DISTRICTS } from "../../config/districts";
import { BRAND } from "../../config/theme";
import { ScreenGroup } from "../street/kitMeshes";
import type { KitItem } from "../street/kitLayout";

const L = BRIDGE.length;
const W = BRIDGE.width;
const DECK_T = 0.35;
const RAIL_Z = W / 2 - 0.05;
const ROOF_Z = W / 2 + 0.05; // เสาหลังคาอยู่นอกแนวกระจก ไม่ทับกัน
const ROOF_Y = 2.62;
const STEPS = 16;
const RISE = BRIDGE.y / STEPS;
const TREAD = STAIR_RUN / STEPS;

/** ลายแผ่นเหล็กกันลื่น (วาดบน canvas) */
function useAntiSlipTexture() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#15151d";
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = "#2b2b38";
    g.lineWidth = 5;
    g.lineCap = "round";
    // ปุ่มนูนรูปเมล็ดข้าวสลับทิศ
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const cx = x * 32 + 16;
        const cy = y * 32 + 16;
        const d = (x + y) % 2 === 0 ? 1 : -1;
        g.beginPath();
        g.moveTo(cx - 8, cy - 8 * d);
        g.lineTo(cx + 8, cy + 8 * d);
        g.stroke();
      }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(L / 1.2, W / 1.2);
    t.anisotropy = 4;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** กล่องยาวตามแกน x ที่ไล่สีแบรนด์ม่วง → ชมพูม่วงตามความยาว */
function useGradientBar(length: number, h: number, d: number) {
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(length, h, d);
    const a = new THREE.Color(BRAND.purple);
    const b = new THREE.Color(BRAND.magenta);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      c.lerpColors(a, b, pos.getX(i) / length + 0.5);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [length, h, d]);
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

const tmp = new THREE.Object3D();

/** ขั้นบันไดทั้งสองฝั่ง (instanced) — ขั้นล่างสุดคือพื้นลาน จึงไม่มีแผ่นทับพื้น */
function StairTreads() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = (STEPS - 1) * 2;
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    let n = 0;
    for (const s of [-1, 1])
      for (let i = 0; i < STEPS - 1; i++) {
        tmp.position.set(s * STAIR_X, -(i + 1) * RISE - 0.06, -W / 2 - (i + 0.5) * TREAD);
        tmp.updateMatrix();
        m.setMatrixAt(n++, tmp.matrix);
      }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <boxGeometry args={[STAIR_WIDTH, 0.12, TREAD + 0.04]} />
      <meshStandardMaterial color="#1a1a24" metalness={0.6} roughness={0.55} />
    </instancedMesh>
  );
}

const glass = <meshStandardMaterial color="#1a2030" metalness={0.9} roughness={0.1} transparent opacity={0.28} depthWrite={false} />;
const frame = <meshStandardMaterial color="#202030" metalness={0.8} roughness={0.35} />;

export function Bridge() {
  const base = DISTRICTS.nexus.position;
  const deckMap = useAntiSlipTexture();
  const ledFront = useGradientBar(L, 0.04, 0.08);
  // ราวฝั่ง −z เว้นช่องปลายสะพานไว้ให้บันได
  const backLen = L - STAIR_WIDTH * 2;
  const ledBack = useGradientBar(backLen, 0.04, 0.08);
  const posts = useMemo(() => {
    const xs: number[] = [];
    for (let x = -L / 2 + 0.4; x <= L / 2 - 0.4 + 1e-6; x += 2) xs.push(x);
    return xs;
  }, []);
  const roofXs = [-L / 2 + 0.4, -4, 0, 4, L / 2 - 0.4];
  const stairLen = Math.hypot(STAIR_RUN, BRIDGE.y);
  const stairAngle = Math.atan2(BRIDGE.y, STAIR_RUN);
  // จอยาวใต้หลังคา หันลงหาคนเดิน (ใช้โปรแกรมเดียวกับจอโฆษณาในถนน)
  const screenItems = useMemo<KitItem[]>(
    () => [
      {
        type: "screen",
        street: "nexus",
        position: [base[0], base[1] + BRIDGE.y + 2.5, base[2] + BRIDGE.z],
        rotationY: 0,
        size: [L * 0.7, 0.04, 0.9],
        variant: 2,
        side: 1,
      },
    ],
    [base],
  );

  return (
    <>
      <group position={[0, BRIDGE.y, BRIDGE.z]}>
        {/* พื้นสะพาน ผิวบนอยู่ที่ y = 0 */}
        <mesh position={[0, -DECK_T / 2, 0]}>
          <boxGeometry args={[L, DECK_T, W]} />
          <meshStandardMaterial map={deckMap} color="#9a9ab0" metalness={0.7} roughness={0.5} />
        </mesh>

        {/* ราวกระจก (ยกเหนือพื้น 0.05 ม.) */}
        <mesh position={[0, 0.5, RAIL_Z]}>
          <boxGeometry args={[L, 0.9, 0.03]} />
          {glass}
        </mesh>
        <mesh position={[0, 0.5, -RAIL_Z]}>
          <boxGeometry args={[backLen, 0.9, 0.03]} />
          {glass}
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (L / 2 - 0.06), 0.5, 0]}>
            <boxGeometry args={[0.03, 0.9, W - 0.2]} />
            {glass}
          </mesh>
        ))}

        {/* เสาราวทุก 2 ม. */}
        {posts.map((x) => (
          <group key={x}>
            <mesh position={[x, 0.53, RAIL_Z]}>
              <boxGeometry args={[0.06, 1.1, 0.06]} />
              {frame}
            </mesh>
            {Math.abs(x) <= backLen / 2 && (
              <mesh position={[x, 0.53, -RAIL_Z]}>
                <boxGeometry args={[0.06, 1.1, 0.06]} />
                {frame}
              </mesh>
            )}
          </group>
        ))}

        {/* แถบไฟ LED ไล่สีแบรนด์บนราว (ลอยเหนือหัวเสา 0.03 ม.) */}
        <mesh geometry={ledFront} position={[0, 1.13, RAIL_Z]}>
          <meshBasicMaterial vertexColors toneMapped={false} />
        </mesh>
        <mesh geometry={ledBack} position={[0, 1.13, -RAIL_Z]}>
          <meshBasicMaterial vertexColors toneMapped={false} />
        </mesh>

        {/* โครงหลังคาบาง */}
        {roofXs.map((x) =>
          [-1, 1].map((s) => (
            <mesh key={`${x}:${s}`} position={[x, (ROOF_Y - 0.2) / 2, s * ROOF_Z]}>
              {/* ยึดข้างแผ่นพื้น: เริ่มต่ำกว่าผิวพื้น 0.2 ม. */}
              <boxGeometry args={[0.07, ROOF_Y + 0.2, 0.07]} />
              {frame}
            </mesh>
          )),
        )}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, ROOF_Y + 0.03, s * ROOF_Z]}>
            <boxGeometry args={[L - 0.6, 0.08, 0.08]} />
            {frame}
          </mesh>
        ))}
        {roofXs.map((x) => (
          <mesh key={x} position={[x, ROOF_Y + 0.08, 0]}>
            <boxGeometry args={[0.08, 0.06, ROOF_Z * 2 + 0.1]} />
            {frame}
          </mesh>
        ))}

        {/* บันไดสองปลายสะพาน ลงไปทาง −z */}
        <StairTreads />
        {[-1, 1].map((s) =>
          [-1, 1].map((side) => (
            <mesh
              key={`${s}:${side}`}
              position={[s * STAIR_X + side * (STAIR_WIDTH / 2 + 0.05), -BRIDGE.y / 2 - 0.1, -W / 2 - STAIR_RUN / 2]}
              rotation={[-stairAngle, 0, 0]}
            >
              <boxGeometry args={[0.08, 0.3, stairLen + 0.2]} />
              <meshStandardMaterial color="#0f0f16" metalness={0.75} roughness={0.4} />
            </mesh>
          )),
        )}

        {/* เสาค้ำใต้สะพาน: จมดิน 0.05 ม. และฝังเข้าใต้พื้นสะพาน 0.02 ม. (ไม่ให้หน้าซ้อนกัน) */}
        {[-4, 4].map((x) => (
          <mesh key={x} position={[x, -(BRIDGE.y + DECK_T) / 2 - 0.015, 0]}>
            <boxGeometry args={[0.5, BRIDGE.y - DECK_T + 0.07, 0.5]} />
            <meshStandardMaterial color="#0c0c12" metalness={0.7} roughness={0.4} />
          </mesh>
        ))}
      </group>
      <ScreenGroup items={screenItems} program={2} seed={11} />
    </>
  );
}
