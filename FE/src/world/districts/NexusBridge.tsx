// สะพานลอยกลางแยก Nexus: สะพานเชื่อมตึกแบบบาง — พื้นแผ่นกันลื่น ราวกระจก และแถบไฟสีแบรนด์ ไม่มีหลังคาบังวิว
// พิกัดในกลุ่ม: ผิวพื้นสะพาน y = 0 · แนวกลางสะพาน z = 0

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BRIDGE } from "../../config/bridge";
import { BRAND } from "../../config/theme";

const L = BRIDGE.length;
const W = BRIDGE.width;
const DECK_T = 0.18;
const RAIL_Z = W / 2 - 0.04;
const RAIL_H = 0.95;

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

const glass = <meshStandardMaterial color="#1a2030" metalness={0.9} roughness={0.1} transparent opacity={0.22} depthWrite={false} />;

export function Bridge() {
  const deckMap = useAntiSlipTexture();
  const led = useGradientBar(L, 0.03, 0.05);
  return (
    <group position={[0, BRIDGE.y, BRIDGE.z]}>
      {/* พื้นสะพานบาง ผิวบนอยู่ที่ y = 0 */}
      <mesh position={[0, -DECK_T / 2, 0]}>
        <boxGeometry args={[L, DECK_T, W]} />
        <meshStandardMaterial map={deckMap} color="#9a9ab0" metalness={0.7} roughness={0.5} />
      </mesh>
      {/* แถบไฟใต้ขอบพื้น (ต่ำกว่าผิวบน 0.06 ม. ยื่นออกนอกขอบ 0.02 ม.) */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={led} position={[0, -DECK_T + 0.02, s * (W / 2 + 0.02)]}>
          <meshBasicMaterial vertexColors toneMapped={false} />
        </mesh>
      ))}
      {/* ราวกระจกใสสองฝั่ง ยกเหนือพื้น 0.03 ม. + แถบไฟบนราว */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[0, 0.03 + RAIL_H / 2, s * RAIL_Z]}>
            <boxGeometry args={[L, RAIL_H, 0.02]} />
            {glass}
          </mesh>
          <mesh geometry={led} position={[0, 0.03 + RAIL_H + 0.02, s * RAIL_Z]}>
            <meshBasicMaterial vertexColors toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
